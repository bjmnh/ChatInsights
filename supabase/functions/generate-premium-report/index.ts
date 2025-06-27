// @deno-types="npm:@types/deno"
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "npm:@google/generative-ai";

// --- SECTION 1: TYPES ---
// All types for this function are defined here.

// Basic analysis types (for supplemental data)
interface BasicAnalysisResult { averageWordsPerUserSentence: number; userVocabularySizeEstimate: number; }
// Raw data parsing types
interface RawConversation { id?: string; title?: string; create_time?: number; mapping?: { [id: string]: RawMessageContainer }; }
interface RawMessageContainer { message?: RawMessage; }
interface RawMessage { author: { role: 'user' | 'assistant' }; content: { parts: string[] }; create_time?: number; }

// Type for storing extracted PII details
interface ExtractedPii {
  pii: string;       // The actual extracted information (e.g., "john.doe@email.com")
  context: string;   // The context in which it was shared (e.g., "User provided email for a newsletter signup.")
  category: string;  // The category of PII (e.g., "ContactInfo_Email")
}

// Stage 1: Per-conversation insights from fast LLM
interface PerConversationInsights {
  conversationId: string;
  title?: string;
  primaryTopics: string[];
  communicationPatterns: string[];
  extractedPii: ExtractedPii[];
  standoutVocabulary: string[];
  uniquenessScore: number;
  intriguingObservation: string;
}

// --- REPORT TYPES ---
// FBI report now includes a subject codename
interface FBIReportData { reportTitle: string; subjectCodename: { name: string; justification: string; }; subjectProfileSummary: string; dominantInterests: string[]; communicationModalities: string[]; emotionalToneAndEngagement: string; informationSharingTendencies: string; piiExamples: ExtractedPii[]; overallInteractionStyle: string; disclaimer: string; }
interface LinguisticFingerprintData { reportTitle: string; overallStyleDescription: string; vocabularyProfile: { qualitativeAssessment: string; notableWords: string[]; }; sentenceStructure: string; expressiveness: string; potentialInterestsIndicatedByLanguage: string[]; disclaimer: string; }
interface TopConversation { conversationId: string; title?: string; justification: string; }
interface RealityTVPersonaData { reportTitle: string; personaArchetype: string; description: string; popCultureComparisons: string[]; disclaimer: string; }
interface UnfilteredMirrorData { reportTitle: string; observation: string; disclaimer: string; }
interface PIISafetyCompassData { reportTitle: string; awarenessScore: "Low Risk" | "Medium Risk" | "High Risk"; summary: string; detailedBreakdown: { category: string; advice: string; }[]; disclaimer: string; }
// NEW REPORT: The Digital Doppelgänger
interface DigitalDoppelgangerData { reportTitle: string; handle: string; bio: string; topHashtags: string[]; disclaimer: string; }

// Container for all premium reports
interface AdvancedAnalysisResult {
    fbiReport?: FBIReportData;
    linguisticFingerprint?: LinguisticFingerprintData;
    topInterestingConversations?: TopConversation[];
    realityTVPersona?: RealityTVPersonaData;
    unfilteredMirror?: UnfilteredMirrorData;
    piiSafetyCompass?: PIISafetyCompassData;
    digitalDoppelganger?: DigitalDoppelgangerData; // New report
    processingErrors?: string[];
}


// --- SECTION 2: UTILITIES ---
function extractUserConversationText(conversation: RawConversation): string {
  if (!conversation.mapping) return "";
  const messages = Object.values(conversation.mapping).filter(m => m.message?.author.role === 'user');
  messages.sort((a, b) => (a.message?.create_time || 0) - (b.message?.create_time || 0));
  return messages.map(m => m.message!.content.parts.join(" ")).join("\n\n---\n\n");
}


// --- SECTION 3: LLM SERVICE ABSTRACTION ---
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const FAST_LLM_PROVIDER = (Deno.env.get("FAST_LLM_PROVIDER") as "gemini" | "mock") || "gemini";
const POWERFUL_LLM_PROVIDER = (Deno.env.get("POWERFUL_LLM_PROVIDER") as "gemini" | "mock") || "gemini";
const GEMINI_FAST_MODEL_NAME = "gemini-1.5-flash-latest";
const GEMINI_POWERFUL_MODEL_NAME = "gemini-1.5-pro-latest";

async function callLlmForJson<T>(prompt: string, modelType: "fast" | "powerful"): Promise<T> {
  const provider = modelType === 'fast' ? FAST_LLM_PROVIDER : POWERFUL_LLM_PROVIDER;
  if (provider === 'mock') { console.warn("Using MOCK LLM provider."); return {} as T; }
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set for Gemini provider.");
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const modelName = modelType === 'fast' ? GEMINI_FAST_MODEL_NAME : GEMINI_POWERFUL_MODEL_NAME;
  const model = genAI.getGenerativeModel({
      model: modelName,
      safetySettings: [{ category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }],
  });
  const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
  });
  const cleanedJsonText = result.response.text().replace(/^```json\s*|```\s*$/g, "").trim();
  return JSON.parse(cleanedJsonText) as T;
}


// --- SECTION 4: PROMPT DEFINITIONS ---
function getStage1Prompt(text: string): string {
    return `Analyze the following user conversation excerpt. Focus ONLY on the user's contributions. Provide a structured analysis in JSON format.
Conversation Excerpt:
---
${text.substring(0, 15000)}
---
JSON Output Format:
{
  "primaryTopics": ["string"],
  "communicationPatterns": ["string"],
  "extractedPii": [
    {
      "pii": "string (the exact personal data)",
      "context": "string (a brief sentence explaining the context of the share)",
      "category": "string (One of: PersonalName, Location, Date_Specific, ContactInfo_Email, ContactInfo_Phone, Financial_Account, Health_Condition, Credentials_Login, ID_Number, Other_Sensitive)"
    }
  ],
  "standoutVocabulary": ["string"],
  "uniquenessScore": "number (1-10, 1=common, 10=very niche/unique)",
  "intriguingObservation": "string (a single, non-accusatory, anonymized observation about a user-stated goal, challenge, or deep interest)"
}
Instructions:
- primaryTopics: 2-3 main topics.
- communicationPatterns: Choose up to 3 from: "SeekingInformation", "ExpressingOpinion", "Brainstorming", "Storytelling", "EmotionalVenting", "ProblemSolving".
- extractedPii: CRITICAL - Find and extract any Personally Identifiable Information (PII). For each piece found, create an object with the exact text ('pii'), the surrounding context ('context'), and the appropriate 'category'. If no PII is found, return an empty array [].
- standoutVocabulary: Up to 3 unique or sophisticated words.
- uniquenessScore: Rate how unusual the conversation's topic is.
- intriguingObservation: THIS IS CRITICAL. Read between the lines to find a deep interest, personal project, or unique challenge the user has stated. Phrase it as a respectful, anonymized observation. Example: if user asks for recipes for a vegan catering business, output "Appears to be planning or running a plant-based food venture." DO NOT make accusations or state PII. If nothing stands out, return an empty string "".

Output JSON only:`;
}
function getFbiProfilePrompt(topics: string[], patterns: string[], piiData: ExtractedPii[]): string {
  const piiSamplesString = piiData.length > 0
    ? piiData.map(p => `- Category: ${p.category}, PII: "${p.pii}", Context: "${p.context}"`).join('\n')
    : "No specific PII was extracted.";

  return `You are an FBI intelligence analyst compiling a behavioral report. Synthesize the provided data into a concise, objective profile in JSON format.
Data:
- Top Discussed Topics: ${topics.join(', ')}
- Common Communication Patterns: ${patterns.join(', ')}
- Extracted PII Samples:
${piiSamplesString}

JSON Output Format:
{
  "reportTitle": "Digital Behavioral Analysis Dossier",
  "subjectProfileSummary": "string (A 2-3 sentence overarching summary of the user's digital persona)",
  "dominantInterests": ["string", "string"],
  "communicationModalities": ["string", "string"],
  "emotionalToneAndEngagement": "string (Describe the typical emotional tone)",
  "informationSharingTendencies": "string (Comment on the user's tendencies for sharing PII. Are they cautious or open? Do they share specific types of data? Analyze the provided samples.)",
  "piiExamples": [{ "pii": "string", "context": "string", "category": "string" }],
  "overallInteractionStyle": "string (e.g., 'Primarily collaborative and inquisitive')",
  "disclaimer": "This report is an AI-generated interpretation of aggregated digital interaction patterns and does not represent a comprehensive psychological assessment. It is for informational purposes only."
}
Instructions:
- Frame it formally and objectively. Populate all fields based on the data.
- For 'informationSharingTendencies', provide a qualitative analysis based on the samples.
- For 'piiExamples', select the 3 most significant or high-risk examples from the provided samples and list them. If fewer than 3 exist, list what is available. If none, return an empty array [].
Output JSON only:`;
}
function getLinguisticFingerprintPrompt(vocab: string[], avgSentenceLength: number, vocabSize: number): string {
    return `You are an AI linguistic analyst. Create a "Linguistic Fingerprint" report in JSON format.
Data:
- Vocab Sample: ${vocab.slice(0, 30).join(', ')}
- Avg Sentence Length: ${avgSentenceLength.toFixed(1)} words
- Vocab Size Estimate: ${vocabSize} unique words
JSON Output Format:
{
  "reportTitle": "User Linguistic Fingerprint",
  "overallStyleDescription": "string (e.g., 'The user's linguistic style is predominantly analytical...')",
  "vocabularyProfile": {
    "qualitativeAssessment": "string (e.g., 'Exhibits a rich and nuanced vocabulary')",
    "notableWords": ["string"]
  },
  "sentenceStructure": "string (e.g., 'Often uses complex sentence structures')",
  "expressiveness": "string (e.g., 'Language is generally formal')",
  "potentialInterestsIndicatedByLanguage": ["string"],
  "disclaimer": "This linguistic analysis is an AI-generated interpretation and not a formal psychometric assessment of verbal intelligence."
}
Instructions:
- Populate all fields based on the data provided.
Output JSON only:`;
}
function getTop5JustificationPrompt(conversations: {title?: string, topics: string[]}[]): string {
    const convoStrings = conversations.map((c, i) => `Conversation ${i+1} (Title: "${c.title || 'Untitled'}"): Topics - ${c.topics.join(', ')}`).join('\n');
    return `Below are the topics from 5 conversations identified as highly unique. For each, provide a brief, one-sentence justification explaining WHY it's interesting or revealing.
${convoStrings}
JSON Output Format:
{ "justifications": ["string for convo 1", "string for convo 2", "string for convo 3", "string for convo 4", "string for convo 5"] }
Output JSON only:`;
}
function getRealityTvPersonaPrompt(topics: string[], patterns: string[]): string {
    return `Analyze the user's interaction data to determine their reality TV show persona archetype.
Data:
- Top Topics: ${topics.join(', ')}
- Common Patterns: ${patterns.join(', ')}
JSON Output Format:
{ "reportTitle": "Your Reality TV Persona", "personaArchetype": "string (e.g., 'The Strategist', 'The Confidant', 'The Innovator')", "description": "string (Explain the persona)", "popCultureComparisons": ["string (Suggest 1-2 characters or archetypes from pop culture)"], "disclaimer": "string" }
Instructions:
- Be creative and fun, but base the persona on the data provided.
- The disclaimer should state this is for entertainment purposes only.
Output JSON only:`;
}
function getUnfilteredMirrorPrompt(observation: string): string {
    return `Take the following observation about a user and rephrase it into a single, intriguing, and slightly "scary accurate" sentence for a report titled "The Unfiltered Mirror".
Original Observation: "${observation}"
JSON Output Format:
{ "reportTitle": "The Unfiltered Mirror", "observation": "string (Your rephrased, intriguing sentence)", "disclaimer": "This is an AI-generated inference based on patterns in your conversations, intended for self-reflection." }
Output JSON only:`;
}
function getPiiSafetyCompassPrompt(piiFrequencies: { category: string, count: number }[]): string {
    const summary = piiFrequencies.map(p => `${p.category}: ${p.count} mentions`).join(', ');
    return `Analyze the user's PII category disclosure frequency to create a "PII Safety Compass" report.
Data:
- PII Category Frequencies: ${summary || 'No significant PII categories mentioned.'}
JSON Output Format:
{
  "reportTitle": "Your PII Safety Compass",
  "awarenessScore": "'Low Risk' | 'Medium Risk' | 'High Risk'",
  "summary": "string (A brief summary of their sharing habits)",
  "detailedBreakdown": [{ "category": "string", "advice": "string" }],
  "disclaimer": "This report analyzes PII *categories*, not your actual data. This advice is general and not a substitute for professional security guidance."
}
Instructions:
- Based on the counts and types of categories, determine a risk score. High frequency of Financial/Health data is higher risk.
- Write a summary.
- For the top 2-3 most frequent categories, provide a piece of actionable, generic advice in the detailedBreakdown. If no data, provide general advice.
Output JSON only:`;
}
function getCodenamePrompt(topics: string[], patterns: string[]): string {
    return `Based on the user's primary interests and communication style, create a cool, evocative "Subject Codename" for a spy dossier.
- Primary Interests: ${topics.join(', ')}
- Communication Style: ${patterns.join(', ')}
JSON Output Format:
{ "name": "string (e.g., 'The Architect', 'Codex', 'Odyssey', 'Nexus')", "justification": "string (A one-sentence explanation for the choice)" }
Instructions:
- The name should be a single, impactful word or a very short two-word phrase (like 'The Pathfinder').
- Be creative and match the codename to the user's data.
- For example, if topics include 'startups' and 'programming' and pattern is 'ProblemSolving', a good codename could be 'The Architect' because they are building things.
Output JSON only:`;
}
function getDoppelgangerPrompt(topics: string[], vocab: string[]): string {
    return `Analyze the user's interests and vocabulary to create a fictional, concise "Digital Doppelgänger" online profile.
- Dominant Topics: ${topics.join(', ')}
- Vocabulary Sample: ${vocab.join(', ')}
JSON Output Format:
{
  "reportTitle": "Your Digital Doppelgänger",
  "handle": "string (A plausible, creative social media handle starting with '@')",
  "bio": "string (A 1-3 sentence bio that captures the essence of the user's personality and interests)",
  "topHashtags": ["string", "string", "string"],
  "disclaimer": "This is an AI-generated fictional profile based on language and topic patterns for entertainment."
}
Instructions:
- The bio should be pithy and sound like a real person's online profile.
- The hashtags should reflect the core interests in a way people use them online (e.g., #AIart, #HomeChef, #Philosophy).
Output JSON only:`;
}


// --- SECTION 5: ANALYSIS PIPELINE FUNCTIONS ---
function performSupplementalBasicAnalysis(conversations: RawConversation[]): BasicAnalysisResult {
    let totalUserSentences = 0, totalUserWordsInSentences = 0;
    const userWordFrequency: { [key: string]: number } = {};
    const commonStopWords = new Set(['i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who', 'this', 'that', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'of', 'at', 'by', 'for', 'with', 'about', 'to', 'from', 'in', 'out', 'on', 'so', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'chatgpt']);
    const getWords = (text: string) => text ? text.toLowerCase().replace(/[^\w\s'-]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !commonStopWords.has(w) && !/^\d+$/.test(w)) : [];
    const getSentences = (text: string) => text ? text.split(/(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|!)\s+/).filter(s => s.trim().length > 0) : [];
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
        const result = await callLlmForJson<any>(prompt, "fast");
        return {
            conversationId: conv.id || `id-${Math.random()}`,
            title: conv.title,
            primaryTopics: result.primaryTopics || [],
            communicationPatterns: result.communicationPatterns || [],
            extractedPii: result.extractedPii || [],
            standoutVocabulary: result.standoutVocabulary || [],
            uniquenessScore: parseInt(String(result.uniquenessScore), 10) || 1,
            intriguingObservation: result.intriguingObservation || ""
        };
    } catch (error) {
        console.error(`Error processing conversation ${conv.id || 'N/A'} with fast LLM:`, error.message);
        return null;
    }
}
async function generateAllPremiumInsights(conversations: RawConversation[]): Promise<AdvancedAnalysisResult> {
    const basicInsights = performSupplementalBasicAnalysis(conversations);
    const stage1Results = (await Promise.all(conversations.map(conv => processConversationWithFastLlm(conv)))).filter(r => r !== null) as PerConversationInsights[];
    if (stage1Results.length === 0) return { processingErrors: ["Failed to gather any insights from conversations."] };

    const allTopics = stage1Results.flatMap(r => r.primaryTopics);
    const allPatterns = stage1Results.flatMap(r => r.communicationPatterns);
    const allExtractedPii = stage1Results.flatMap(r => r.extractedPii);
    const allVocab = Array.from(new Set(stage1Results.flatMap(r => r.standoutVocabulary)));
    const allObservations = stage1Results.map(r => r.intriguingObservation).filter(Boolean);
    const countFrequency = (arr: string[]) => arr.reduce((acc, item) => (acc[item] = (acc[item] || 0) + 1, acc), {} as Record<string, number>);
    const getTopN = (map: Record<string, number>, n: number) => Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n).map(e => e[0]);

    const topTopics = getTopN(countFrequency(allTopics), 7);
    const topPatterns = getTopN(countFrequency(allPatterns), 5);

    const piiCategoryList = allExtractedPii.map(p => p.category);
    const piiFrequencies = Object.entries(countFrequency(piiCategoryList)).map(([category, count]) => ({ category, count })).sort((a,b) => b.count-a.count);
    
    const reportPromises = [];
    
    // 1. FBI Report & Codename Generation
    reportPromises.push(
      (async () => {
        const codenamePromise = callLlmForJson<{name: string, justification: string}>(getCodenamePrompt(topTopics, topPatterns), 'fast').catch(() => ({ name: "The Analyst", justification: "Systematically processes information."}));
        const fbiDataPromise = callLlmForJson<Omit<FBIReportData, 'subjectCodename'>>(getFbiProfilePrompt(topTopics, topPatterns, allExtractedPii.slice(0, 20)), 'powerful');
        const [codename, fbiData] = await Promise.all([codenamePromise, fbiDataPromise]);
        
        if (!fbiData) return null;
        return { type: 'fbiReport', data: { ...fbiData, subjectCodename: codename } };
      })().catch(e => { console.error("FBI Report failed:", e.message); return null; })
    );

    // 2. Linguistic Fingerprint (Kept on powerful model for high-quality analysis)
    reportPromises.push(
        callLlmForJson<LinguisticFingerprintData>(getLinguisticFingerprintPrompt(allVocab, basicInsights.averageWordsPerUserSentence, basicInsights.userVocabularySizeEstimate), 'powerful')
            .then(data => ({ type: 'linguisticFingerprint', data })).catch(e => { console.error("Linguistic Report failed:", e.message); return null; })
    );

    // 3. Top 5 Interesting Conversations
    const top5Convos = [...stage1Results].sort((a, b) => b.uniquenessScore - a.uniquenessScore).slice(0, 5);
    if (top5Convos.length > 0) {
        reportPromises.push(
            (async () => {
                const prompt = getTop5JustificationPrompt(top5Convos);
                const result = await callLlmForJson<{justifications: string[]}>(prompt, 'fast').catch(() => null);
                if (!result) return null;
                return top5Convos.map((convo, i) => ({
                    conversationId: convo.conversationId,
                    title: convo.title,
                    justification: result.justifications[i] || "This conversation explored highly niche topics."
                }));
            })().then(data => ({ type: 'topInterestingConversations', data }))
        );
    }
    
    // 4. Reality TV Persona (COST OPTIMIZATION: Switched to fast model)
    reportPromises.push(
        callLlmForJson<RealityTVPersonaData>(getRealityTvPersonaPrompt(topTopics, topPatterns), 'fast')
            .then(data => ({ type: 'realityTVPersona', data })).catch(e => { console.error("Reality TV Persona failed:", e.message); return null; })
    );

    // 5. Unfiltered Mirror (COST OPTIMIZATION: Switched to fast model)
    if (allObservations.length > 0) {
        const mostInterestingObservation = allObservations.sort((a,b) => b.length - a.length)[0];
        reportPromises.push(
            callLlmForJson<UnfilteredMirrorData>(getUnfilteredMirrorPrompt(mostInterestingObservation), 'fast')
                .then(data => ({ type: 'unfilteredMirror', data })).catch(e => { console.error("Unfiltered Mirror failed:", e.message); return null; })
        );
    }
    
    // 6. PII Safety Compass (COST OPTIMIZATION: Switched to fast model, as it's rule-based)
    reportPromises.push(
        callLlmForJson<PIISafetyCompassData>(getPiiSafetyCompassPrompt(piiFrequencies), 'fast')
            .then(data => ({ type: 'piiSafetyCompass', data })).catch(e => { console.error("PII Safety Compass failed:", e.message); return null; })
    );

    // 7. NEW FEATURE: Digital Doppelgänger (COST OPTIMIZATION: Using fast model)
    reportPromises.push(
        callLlmForJson<DigitalDoppelgangerData>(getDoppelgangerPrompt(topTopics, allVocab.slice(0, 20)), 'fast')
            .then(data => ({ type: 'digitalDoppelganger', data })).catch(e => { console.error("Digital Doppelganger failed:", e.message); return null; })
    );

    const generatedReports = (await Promise.all(reportPromises)).filter(Boolean);
    const advancedResults: AdvancedAnalysisResult = {};
    generatedReports.forEach(report => {
        if (report && report.data) {
            advancedResults[report.type as keyof AdvancedAnalysisResult] = report.data as any;
        }
    });

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
    
    // NOTE: Caching logic has been removed as per the request.

    const { data: fileData, error: fileError } = await supabase.from('uploaded_files').select('file_path').eq('id', fileId).eq('user_id', user.id).single();
    if (fileError || !fileData) throw new Error('File not found or access denied');
    
    const { data: fileBlob, error: downloadError } = await supabase.storage.from('conversation-files').download(fileData.file_path);
    if (downloadError) throw new Error(`Failed to download file: ${downloadError.message}`);
    
    let conversations: RawConversation[];
    try {
        let rawParsed: any = JSON.parse(await fileBlob.text());
        if (!Array.isArray(rawParsed)) {
            const potentialArray = Object.values(rawParsed).find(Array.isArray);
            if (potentialArray && potentialArray.length > 0) { 
                rawParsed = potentialArray; 
            }
            else { 
                throw new Error("Parsed JSON is not an array and no conversation array found within."); 
            }
        }
        conversations = rawParsed as RawConversation[];
    } catch(e) { 
        throw new Error(`JSON Parsing Error: ${e.message}`); 
    }

    const premiumReportData = await generateAllPremiumInsights(conversations);

    // Save report to database (for historical record, not for caching).
    const { error: reportError } = await supabase.from('reports').insert({ 
        user_id: user.id, 
        file_id: fileId, 
        report_type: 'premium', 
        report_data: premiumReportData 
    });
    if (reportError) {
        console.error(`Failed to save report, but proceeding: ${reportError.message}`);
    }

    await supabase.from('uploaded_files').update({ has_premium_report: true }).eq('id', fileId);

    // Return the newly generated report.
    return new Response(JSON.stringify({ success: true, report: premiumReportData }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
    });
  } catch (error) {
    console.error('Error in generate-premium-report:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
    });
  }
});