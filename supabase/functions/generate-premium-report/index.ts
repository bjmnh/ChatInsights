// @deno-types="npm:@types/deno"
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "npm:@google/generative-ai";

// --- SECTION 1: TYPES ---
// All types needed for this complex function are defined here.

// Basic analysis types (needed for supplemental data)
interface WordFrequency { word: string; count: number; }
interface BasicAnalysisResult {
  averageWordsPerUserSentence: number;
  userVocabularySizeEstimate: number;
}
// Raw data parsing types
interface RawConversation { id?: string; title?: string; create_time?: number; mapping?: { [id: string]: RawMessageContainer }; }
interface RawMessageContainer { message?: RawMessage; }
interface RawMessage { author: { role: 'user' | 'assistant' }; content: { parts: string[] }; create_time?: number; }
// Stage 1: Per-conversation insights from fast LLM
interface PerConversationInsights {
  primaryTopics: string[];
  communicationPatterns: string[];
  piiCategoriesMentioned: string[];
  standoutVocabulary: string[];
}
// Stage 2: Final premium report structures
interface FBIReportData { reportTitle: string; subjectProfileSummary: string; dominantInterests: string[]; communicationModalities: string[]; emotionalToneAndEngagement: string; informationSharingTendencies: string; overallInteractionStyle: string; disclaimer: string; }
interface LinguisticFingerprintData { reportTitle: string; overallStyleDescription: string; vocabularyProfile: { qualitativeAssessment: string; notableWords: string[]; }; sentenceStructure: string; expressiveness: string; potentialInterestsIndicatedByLanguage: string[]; disclaimer: string; }
// Container for all premium reports
interface AdvancedAnalysisResult { fbiReport?: FBIReportData; linguisticFingerprint?: LinguisticFingerprintData; processingErrors?: string[]; }


// --- SECTION 2: UTILITIES ---
// Text processing and data extraction helpers.

const COMMON_STOP_WORDS = new Set(['i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who', 'this', 'that', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'of', 'at', 'by', 'for', 'with', 'about', 'to', 'from', 'in', 'out', 'on', 'so', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'chatgpt']);
function getWords(text: string): string[] { if (!text) return []; return text.toLowerCase().replace(/[^\w\s'-]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !COMMON_STOP_WORDS.has(w) && !/^\d+$/.test(w)); }
function getSentences(text: string): string[] { if (!text) return []; return text.split(/(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|!)\s+/).filter(s => s.trim().length > 0); }

function extractUserConversationText(conversation: RawConversation): string {
  if (!conversation.mapping) return "";
  const messages = Object.values(conversation.mapping).filter(m => m.message?.author.role === 'user');
  messages.sort((a, b) => (a.message?.create_time || 0) - (b.message?.create_time || 0));
  return messages.map(m => m.message!.content.parts.join(" ")).join("\n\n---\n\n");
}


// --- SECTION 3: LLM SERVICE ABSTRACTION ---
// This modular service handles all calls to the LLM.

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const FAST_LLM_PROVIDER = Deno.env.get("FAST_LLM_PROVIDER") as "gemini" | "mock" || "gemini";
const POWERFUL_LLM_PROVIDER = Deno.env.get("POWERFUL_LLM_PROVIDER") as "gemini" | "mock" || "gemini";
const GEMINI_FAST_MODEL_NAME = "gemini-1.5-flash-latest";
const GEMINI_POWERFUL_MODEL_NAME = "gemini-1.5-pro-latest";

async function callLlmForJson<T>(prompt: string, modelType: "fast" | "powerful"): Promise<T> {
  const provider = modelType === 'fast' ? FAST_LLM_PROVIDER : POWERFUL_LLM_PROVIDER;
  if (provider === 'mock') {
    console.warn("Using MOCK LLM provider.");
    if (prompt.includes("FBI_PROFILE")) return { reportTitle: "Mock FBI Report" } as unknown as T;
    if (prompt.includes("LINGUISTIC_FINGERPRINT")) return { reportTitle: "Mock Linguistic Report" } as unknown as T;
    return {} as T;
  }
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set for Gemini provider.");
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const modelName = modelType === 'fast' ? GEMINI_FAST_MODEL_NAME : GEMINI_POWERFUL_MODEL_NAME;
  const model = genAI.getGenerativeModel({
      model: modelName,
      safetySettings: [{ category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }],
  });
  const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
  });
  const cleanedJsonText = result.response.text().replace(/^```json\s*|```\s*$/g, "").trim();
  return JSON.parse(cleanedJsonText) as T;
}


// --- SECTION 4: PROMPT DEFINITIONS ---

function getStage1Prompt(text: string): string { return `Analyze the following user conversation excerpt. Focus ONLY on the user's contributions. Provide a structured analysis in JSON format.
Conversation Excerpt:
---
${text.substring(0, 15000)}
---
JSON Output Format:
{"primaryTopics":["string"],"communicationPatterns":["string"],"piiCategoriesMentioned":["string"],"standoutVocabulary":["string"]}
Instructions:
- primaryTopics: 2-3 main topics discussed. Be concise.
- communicationPatterns: Choose up to 3 from: "SeekingInformation", "ExpressingOpinion", "Brainstorming", "Storytelling", "EmotionalVenting", "ProblemSolving".
- piiCategoriesMentioned: List any of these categories found: "PersonalName", "Location", "Date_Specific", "ContactInfo_Email", "ContactInfo_Phone", "Financial_Account", "Health_Condition", "Organization_Name". If none, use an empty array. DO NOT output the PII itself.
- standoutVocabulary: Identify up to 3 unique or sophisticated words.
Output JSON only:`;}

function getFbiProfilePrompt(topics: string[], patterns: string[]): string { return `FBI_PROFILE: You are an AI intelligence analyst compiling a behavioral report. Synthesize the provided data into a concise, objective profile in JSON format.
{ "reportTitle": "Digital Behavioral Analysis Dossier", "subjectProfileSummary": "string", "dominantInterests": ["string"], "communicationModalities": ["string"], "emotionalToneAndEngagement": "string", "informationSharingTendencies": "string", "overallInteractionStyle": "string", "disclaimer": "string" }
Data:
- Top Topics: ${topics.join(', ')}
- Common Patterns: ${patterns.join(', ')}
Instructions:
- Frame it formally.
- Populate all fields.
- The disclaimer should state this is an AI interpretation for informational purposes only.
Output JSON only:`; }

function getLinguisticFingerprintPrompt(vocab: string[], avgSentenceLength: number, vocabSize: number): string { return `LINGUISTIC_FINGERPRINT: You are an AI linguistic analyst. Create a "Linguistic Fingerprint" report in JSON format.
{ "reportTitle": "User Linguistic Fingerprint", "overallStyleDescription": "string", "vocabularyProfile": { "qualitativeAssessment": "string", "notableWords": ["string"] }, "sentenceStructure": "string", "expressiveness": "string", "potentialInterestsIndicatedByLanguage": ["string"], "disclaimer": "string" }
Data:
- Vocab Sample: ${vocab.slice(0, 30).join(', ')}
- Avg Sentence Length: ${avgSentenceLength.toFixed(1)} words
- Vocab Size Estimate: ${vocabSize} unique words
Instructions:
- Populate all fields based on the data.
- The disclaimer should state this is not a formal psychometric assessment.
Output JSON only:`; }


// --- SECTION 5: ANALYSIS PIPELINE FUNCTIONS ---

function performSupplementalBasicAnalysis(conversations: RawConversation[]): BasicAnalysisResult {
    let totalUserSentences = 0, totalUserWordsInSentences = 0;
    const userWordFrequency: { [key: string]: number } = {};
    conversations.forEach(conv => {
        if (!conv.mapping) return;
        Object.values(conv.mapping).forEach(mc => {
            const msg = mc.message;
            if (msg?.author.role === 'user' && msg.content.parts) {
                const text = msg.content.parts.join(" ");
                getWords(text).forEach(w => userWordFrequency[w] = 1);
                const sentences = getSentences(text);
                totalUserSentences += sentences.length;
                sentences.forEach(s => totalUserWordsInSentences += getWords(s).length);
            }
        });
    });
    return {
        averageWordsPerUserSentence: totalUserSentences > 0 ? parseFloat((totalUserWordsInSentences / totalUserSentences).toFixed(1)) : 0,
        userVocabularySizeEstimate: Object.keys(userWordFrequency).length,
    };
}

async function processConversationWithFastLlm(conv: RawConversation): Promise<PerConversationInsights | null> {
    const userText = extractUserConversationText(conv);
    if (!userText.trim()) return null;
    try {
        const prompt = getStage1Prompt(userText);
        return await callLlmForJson<PerConversationInsights>(prompt, "fast");
    } catch (error) {
        console.error(`Error processing conversation with fast LLM:`, error.message);
        return null;
    }
}

async function generateAllPremiumInsights(conversations: RawConversation[]): Promise<AdvancedAnalysisResult> {
    // Stage 0: Run supplemental basic analysis for data needed in Stage 2
    const basicInsights = performSupplementalBasicAnalysis(conversations);

    // Stage 1: Process all conversations in parallel with a fast LLM
    const promises = conversations.map(conv => processConversationWithFastLlm(conv));
    const stage1Results = (await Promise.all(promises)).filter(r => r !== null) as PerConversationInsights[];
    if (stage1Results.length === 0) {
        return { processingErrors: ["Failed to gather any insights from conversations."] };
    }

    // Stage 2: Aggregate data and generate final reports with a powerful LLM
    const allTopics = stage1Results.flatMap(r => r.primaryTopics);
    const allPatterns = stage1Results.flatMap(r => r.communicationPatterns);
    const allVocab = stage1Results.flatMap(r => r.standoutVocabulary);
    const topicFrequency = Object.entries(allTopics.reduce((acc, t) => (acc[t] = (acc[t] || 0) + 1, acc), {} as Record<string,number>)).sort((a,b) => b[1]-a[1]).map(e => e[0]);
    const patternFrequency = Object.entries(allPatterns.reduce((acc, p) => (acc[p] = (acc[p] || 0) + 1, acc), {} as Record<string,number>)).sort((a,b) => b[1]-a[1]).map(e => e[0]);

    const fbiPrompt = getFbiProfilePrompt(topicFrequency.slice(0, 7), patternFrequency.slice(0, 5));
    const linguisticPrompt = getLinguisticFingerprintPrompt(Array.from(new Set(allVocab)), basicInsights.averageWordsPerUserSentence, basicInsights.userVocabularySizeEstimate);

    const [fbiReport, linguisticFingerprint] = await Promise.all([
        callLlmForJson<FBIReportData>(fbiPrompt, 'powerful').catch(e => { console.error("FBI Report failed:", e.message); return null; }),
        callLlmForJson<LinguisticFingerprintData>(linguisticPrompt, 'powerful').catch(e => { console.error("Linguistic Report failed:", e.message); return null; })
    ]);

    const advancedResults: AdvancedAnalysisResult = {};
    if (fbiReport) advancedResults.fbiReport = fbiReport;
    if (linguisticFingerprint) advancedResults.linguisticFingerprint = linguisticFingerprint;
    if (!fbiReport && !linguisticFingerprint) advancedResults.processingErrors = ["All premium report generations failed."];

    return advancedResults;
}


// --- SECTION 6: MAIN SERVER LOGIC ---
serve(async (req) => {
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization required');
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) throw new Error('Invalid token');
    const { fileId } = await req.json();
    if (!fileId) throw new Error('File ID required');
    
    // NOTE: In a real app, you should check if the user has a premium subscription here.
    
    const { data: fileData, error: fileError } = await supabase.from('uploaded_files').select('file_path').eq('id', fileId).eq('user_id', user.id).single();
    if (fileError || !fileData) throw new Error('File not found or access denied');
    
    const { data: fileBlob, error: downloadError } = await supabase.storage.from('conversation-files').download(fileData.file_path);
    if (downloadError) throw new Error(`Failed to download conversation file: ${downloadError.message}`);
    const fileText = await fileBlob.text();
    let conversations: RawConversation[];
    try {
        let rawParsed: any = JSON.parse(fileText);
        if (!Array.isArray(rawParsed)) {
            const potentialArray = Object.values(rawParsed).find(Array.isArray);
            if (potentialArray) { rawParsed = potentialArray; } 
            else { throw new Error("Parsed JSON is not an array and no conversation array found within."); }
        }
        conversations = rawParsed as RawConversation[];
    } catch(e) { throw new Error(`JSON Parsing Error: ${e.message}`); }

    // --- Generate REAL premium report ---
    const premiumReportData = await generateAllPremiumInsights(conversations);

    // Save report to database
    const { error: reportError } = await supabase.from('reports').insert({ user_id: user.id, file_id: fileId, report_type: 'premium', report_data: premiumReportData });
    if (reportError) throw new Error(`Failed to save report: ${reportError.message}`);

    // Update file flag
    const { error: updateError } = await supabase.from('uploaded_files').update({ has_premium_report: true }).eq('id', fileId);
    if (updateError) console.warn(`Failed to update file flag for ${fileId}: ${updateError.message}`);

    return new Response(JSON.stringify({ success: true, report: premiumReportData }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, });
  } catch (error) {
    console.error('Error in generate-premium-report:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, });
  }
});