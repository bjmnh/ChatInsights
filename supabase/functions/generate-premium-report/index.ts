// @deno-types="npm:@types/deno"
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "npm:@google/generative-ai";

// --- SECTION 1: TYPES ---
interface BasicAnalysisResult { averageWordsPerUserSentence: number; userVocabularySizeEstimate: number; }
interface RawConversation { id?: string; title?: string; create_time?: number; mapping?: { [id: string]: RawMessageContainer }; }
interface RawMessageContainer { message?: RawMessage; }
interface RawMessage { author: { role: 'user' | 'assistant' }; content: { parts: string[] }; create_time?: number; }

interface ExtractedPii {
  pii: string;
  context: string;
  category: string;
}

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

// Report types
interface FBIReportData { reportTitle: string; subjectCodename: { name: string; justification: string; }; subjectProfileSummary: string; dominantInterests: string[]; communicationModalities: string[]; emotionalToneAndEngagement: string; informationSharingTendencies: string; piiExamples: ExtractedPii[]; overallInteractionStyle: string; disclaimer: string; }
interface LinguisticFingerprintData { reportTitle: string; overallStyleDescription: string; vocabularyProfile: { qualitativeAssessment: string; notableWords: string[]; }; sentenceStructure: string; expressiveness: string; potentialInterestsIndicatedByLanguage: string[]; disclaimer: string; }
interface TopConversation { conversationId: string; title?: string; justification: string; }
interface RealityTVPersonaData { reportTitle: string; personaArchetype: string; description: string; popCultureComparisons: string[]; disclaimer: string; }
interface UnfilteredMirrorData { reportTitle: string; observation: string; disclaimer: string; }
interface PIISafetyCompassData { reportTitle: string; awarenessScore: "Low Risk" | "Medium Risk" | "High Risk"; summary: string; detailedBreakdown: { category: string; advice: string; }[]; disclaimer: string; }
interface DigitalDoppelgangerData { reportTitle: string; handle: string; bio: string; topHashtags: string[]; disclaimer: string; }

interface AdvancedAnalysisResult {
    fbiReport?: FBIReportData;
    linguisticFingerprint?: LinguisticFingerprintData;
    topInterestingConversations?: TopConversation[];
    realityTVPersona?: RealityTVPersonaData;
    unfilteredMirror?: UnfilteredMirrorData;
    piiSafetyCompass?: PIISafetyCompassData;
    digitalDoppelganger?: DigitalDoppelgangerData;
    processingErrors?: string[];
}

// --- SECTION 2: UTILITIES ---
function extractUserConversationText(conversation: RawConversation): string {
  if (!conversation.mapping) return "";
  const messages = Object.values(conversation.mapping)
    .filter(m => m.message?.author?.role === 'user' && m.message?.content?.parts);
  
  messages.sort((a, b) => (a.message?.create_time || 0) - (b.message?.create_time || 0));
  
  return messages
    .map(m => m.message?.content?.parts?.join(" ") || "")
    .filter(Boolean)
    .join("\n\n---\n\n");
}

// --- SECTION 3: OPTIMIZED LLM SERVICE ---
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const FAST_LLM_PROVIDER = (Deno.env.get("FAST_LLM_PROVIDER") as "gemini" | "mock") || "gemini";
const POWERFUL_LLM_PROVIDER = (Deno.env.get("POWERFUL_LLM_PROVIDER") as "gemini" | "mock") || "gemini";
const GEMINI_FAST_MODEL_NAME = "gemini-1.5-flash-latest";
const GEMINI_POWERFUL_MODEL_NAME = "gemini-1.5-pro-latest";

async function callLlmForJson<T>(prompt: string, modelType: "fast" | "powerful"): Promise<T> {
  const provider = modelType === 'fast' ? FAST_LLM_PROVIDER : POWERFUL_LLM_PROVIDER;
  if (provider === 'mock') { 
    console.warn("Using MOCK LLM provider."); 
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
      generationConfig: { 
        responseMimeType: "application/json", 
        temperature: 0.3,
        maxOutputTokens: modelType === 'fast' ? 1024 : 2048 // Limit output tokens
      },
  });
  
  const cleanedJsonText = result.response.text().replace(/^```json\s*|```\s*$/g, "").trim();
  return JSON.parse(cleanedJsonText) as T;
}

// --- SECTION 4: OPTIMIZED PROMPT DEFINITIONS ---
function getStage1Prompt(text: string): string {
    // Truncate text more aggressively to save tokens
    const truncatedText = text.substring(0, 8000);
    return `Analyze this user conversation excerpt. Focus ONLY on user contributions. Return JSON:
---
${truncatedText}
---
JSON Format:
{
  "primaryTopics": ["string"],
  "communicationPatterns": ["string"],
  "extractedPii": [{"pii": "string", "context": "string", "category": "string"}],
  "standoutVocabulary": ["string"],
  "uniquenessScore": "number (1-10)",
  "intriguingObservation": "string"
}
Instructions:
- primaryTopics: 2-3 main topics
- communicationPatterns: Up to 3 from: SeekingInformation, ExpressingOpinion, Brainstorming, Storytelling, EmotionalVenting, ProblemSolving
- extractedPii: Find PII with categories: PersonalName, Location, Date_Specific, ContactInfo_Email, ContactInfo_Phone, Financial_Account, Health_Condition, Credentials_Login, ID_Number, Other_Sensitive
- standoutVocabulary: Up to 3 unique words
- uniquenessScore: Rate topic uniqueness 1-10
- intriguingObservation: One respectful, anonymized observation about user interests/goals

JSON only:`;
}

function getFbiProfilePrompt(topics: string[] = [], patterns: string[] = [], piiData: ExtractedPii[] = []): string {
  const piiSamplesString = piiData && piiData.length > 0
    ? piiData.slice(0, 5) // Limit to 5 examples to save tokens
        .filter(p => p && p.category && p.pii && p.context)
        .map(p => `- ${p.category}: "${p.pii}", Context: "${p.context}"`)
        .join('\n')
    : "No PII extracted.";

  return `Create FBI behavioral report from data:
Topics: ${(topics || []).slice(0, 10).join(', ')}
Patterns: ${(patterns || []).slice(0, 5).join(', ')}
PII Samples:
${piiSamplesString}

JSON Format:
{
  "reportTitle": "Digital Behavioral Analysis Dossier",
  "subjectProfileSummary": "string (2-3 sentences)",
  "dominantInterests": ["string", "string"],
  "communicationModalities": ["string", "string"],
  "emotionalToneAndEngagement": "string",
  "informationSharingTendencies": "string",
  "piiExamples": [{"pii": "string", "context": "string", "category": "string"}],
  "overallInteractionStyle": "string",
  "disclaimer": "This report is an AI-generated interpretation of aggregated digital interaction patterns and does not represent a comprehensive psychological assessment. It is for informational purposes only."
}
JSON only:`;
}

function getLinguisticFingerprintPrompt(vocab: string[] = [], avgSentenceLength: number = 0, vocabSize: number = 0): string {
    return `Create linguistic fingerprint:
Vocab: ${(vocab || []).slice(0, 20).join(', ')}
Avg Sentence: ${avgSentenceLength.toFixed(1)} words
Vocab Size: ${vocabSize}

JSON Format:
{
  "reportTitle": "User Linguistic Fingerprint",
  "overallStyleDescription": "string",
  "vocabularyProfile": {"qualitativeAssessment": "string", "notableWords": ["string"]},
  "sentenceStructure": "string",
  "expressiveness": "string",
  "potentialInterestsIndicatedByLanguage": ["string"],
  "disclaimer": "This linguistic analysis is an AI-generated interpretation and not a formal psychometric assessment of verbal intelligence."
}
JSON only:`;
}

function getTop5JustificationPrompt(conversations: PerConversationInsights[]): string {
    const convoStrings = (conversations || []).slice(0, 5).map((c, i) => 
        `${i+1}. "${c.title || 'Untitled'}": ${(c.primaryTopics || []).slice(0, 3).join(', ')}`
    ).join('\n');
    return `Justify why these 5 conversations are interesting:
${convoStrings}

JSON Format:
{"justifications": ["string", "string", "string", "string", "string"]}
JSON only:`;
}

function getRealityTvPersonaPrompt(topics: string[], patterns: string[]): string {
    return `Create reality TV persona from:
Topics: ${topics.slice(0, 8).join(', ')}
Patterns: ${patterns.slice(0, 4).join(', ')}

JSON Format:
{"reportTitle": "Your Reality TV Persona", "personaArchetype": "string", "description": "string", "popCultureComparisons": ["string"], "disclaimer": "This is for entertainment purposes only."}
JSON only:`;
}

function getUnfilteredMirrorPrompt(observation: string): string {
    return `Rephrase this observation into one intriguing sentence:
"${observation.substring(0, 500)}"

JSON Format:
{"reportTitle": "The Unfiltered Mirror", "observation": "string", "disclaimer": "This is an AI-generated inference based on patterns in your conversations, intended for self-reflection."}
JSON only:`;
}

function getPiiSafetyCompassPrompt(piiFrequencies: { category: string, count: number }[]): string {
    const summary = piiFrequencies.slice(0, 5).map(p => `${p.category}: ${p.count}`).join(', ');
    return `Analyze PII sharing habits:
${summary || 'No significant PII categories.'}

JSON Format:
{
  "reportTitle": "Your PII Safety Compass",
  "awarenessScore": "Low Risk|Medium Risk|High Risk",
  "summary": "string",
  "detailedBreakdown": [{"category": "string", "advice": "string"}],
  "disclaimer": "This report analyzes PII categories, not actual data. This advice is general and not a substitute for professional security guidance."
}
JSON only:`;
}

function getCodenamePrompt(topics: string[], patterns: string[]): string {
    return `Create spy codename from:
Interests: ${topics.slice(0, 5).join(', ')}
Style: ${patterns.slice(0, 3).join(', ')}

JSON Format:
{"name": "string", "justification": "string"}
JSON only:`;
}

function getDoppelgangerPrompt(topics: string[] = [], vocab: string[] = []): string {
    return `Create social media profile from:
Topics: ${(topics || []).slice(0, 6).join(', ')}
Vocab: ${(vocab || []).slice(0, 10).join(', ')}

JSON Format:
{
  "reportTitle": "Your Digital Doppelgänger",
  "handle": "string (@username)",
  "bio": "string (1-2 sentences)",
  "topHashtags": ["string", "string", "string"],
  "disclaimer": "This is an AI-generated fictional profile for entertainment."
}
JSON only:`;
}

// --- SECTION 5: OPTIMIZED ANALYSIS PIPELINE ---
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
        
        if (!result || typeof result !== 'object') {
            console.error(`Invalid result from LLM for conversation ${conv.id || 'N/A'}`);
            return null;
        }
        
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
        console.error(`Error processing conversation ${conv.id || 'N/A'}:`, error.message);
        return null;
    }
}

async function generateAllPremiumInsights(conversations: RawConversation[]): Promise<AdvancedAnalysisResult> {
    // Limit conversations processed to reduce costs
    const limitedConversations = conversations.slice(0, 50);
    
    const basicInsights = performSupplementalBasicAnalysis(limitedConversations);
    const stage1Results = (await Promise.all(limitedConversations.map(conv => processConversationWithFastLlm(conv)))).filter(r => r !== null) as PerConversationInsights[];
    
    if (stage1Results.length === 0) {
        return { processingErrors: ["Failed to gather any insights from conversations."] };
    }

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
    
    // 1. FBI Report & Codename (Use fast model for codename, powerful for FBI)
    reportPromises.push(
      (async () => {
        try {
          const codenamePromise = callLlmForJson<{name: string, justification: string}>(getCodenamePrompt(topTopics, topPatterns), 'fast').catch(() => ({ name: "The Analyst", justification: "Systematically processes information."}));
          const fbiDataPromise = callLlmForJson<Omit<FBIReportData, 'subjectCodename'>>(getFbiProfilePrompt(topTopics, topPatterns, allExtractedPii.slice(0, 10)), 'powerful');
          const [codename, fbiData] = await Promise.all([codenamePromise, fbiDataPromise]);
          
          if (!fbiData) return null;
          return { type: 'fbiReport', data: { ...fbiData, subjectCodename: codename } };
        } catch (e) {
          console.error("FBI Report failed:", e.message);
          return null;
        }
      })()
    );

    // 2. Linguistic Fingerprint (Fast model)
    reportPromises.push(
        callLlmForJson<LinguisticFingerprintData>(getLinguisticFingerprintPrompt(allVocab, basicInsights.averageWordsPerUserSentence, basicInsights.userVocabularySizeEstimate), 'fast')
            .then(data => ({ type: 'linguisticFingerprint', data }))
            .catch(e => { console.error("Linguistic Report failed:", e.message); return null; })
    );

    // 3. Top 5 Interesting Conversations (Fast model)
    const top5Convos = [...stage1Results].sort((a, b) => b.uniquenessScore - a.uniquenessScore).slice(0, 5);
    if (top5Convos.length > 0) {
        reportPromises.push(
            (async () => {
                try {
                  const prompt = getTop5JustificationPrompt(top5Convos);
                  const result = await callLlmForJson<{justifications: string[]}>(prompt, 'fast');
                  if (!result) return null;
                  return top5Convos.map((convo, i) => ({
                      conversationId: convo.conversationId,
                      title: convo.title,
                      justification: result.justifications[i] || "This conversation explored highly niche topics."
                  }));
                } catch (e) {
                  console.error("Top 5 conversations failed:", e.message);
                  return null;
                }
            })().then(data => ({ type: 'topInterestingConversations', data }))
        );
    }
    
    // 4. Reality TV Persona (Fast model)
    reportPromises.push(
        callLlmForJson<RealityTVPersonaData>(getRealityTvPersonaPrompt(topTopics, topPatterns), 'fast')
            .then(data => ({ type: 'realityTVPersona', data }))
            .catch(e => { console.error("Reality TV Persona failed:", e.message); return null; })
    );

    // 5. Unfiltered Mirror (Fast model)
    if (allObservations.length > 0) {
        const mostInterestingObservation = allObservations.sort((a,b) => b.length - a.length)[0];
        reportPromises.push(
            callLlmForJson<UnfilteredMirrorData>(getUnfilteredMirrorPrompt(mostInterestingObservation), 'fast')
                .then(data => ({ type: 'unfilteredMirror', data }))
                .catch(e => { console.error("Unfiltered Mirror failed:", e.message); return null; })
        );
    }
    
    // 6. PII Safety Compass (Fast model)
    reportPromises.push(
        callLlmForJson<PIISafetyCompassData>(getPiiSafetyCompassPrompt(piiFrequencies), 'fast')
            .then(data => ({ type: 'piiSafetyCompass', data }))
            .catch(e => { console.error("PII Safety Compass failed:", e.message); return null; })
    );

    // 7. Digital Doppelgänger (Fast model)
    reportPromises.push(
        callLlmForJson<DigitalDoppelgangerData>(getDoppelgangerPrompt(topTopics, allVocab.slice(0, 15)), 'fast')
            .then(data => ({ type: 'digitalDoppelganger', data }))
            .catch(e => { console.error("Digital Doppelganger failed:", e.message); return null; })
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
  const corsHeaders = { 
    'Access-Control-Allow-Origin': '*', 
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 
    'Access-Control-Allow-Methods': 'POST, OPTIONS', 
  };
  
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

    const { data: fileData, error: fileError } = await supabase
      .from('uploaded_files')
      .select('file_path')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single();
      
    if (fileError || !fileData) throw new Error('File not found or access denied');
    
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('conversation-files')
      .download(fileData.file_path);
      
    if (downloadError) throw new Error(`Failed to download file: ${downloadError.message}`);
    
    let conversations: RawConversation[];
    try {
        let rawParsed: any = JSON.parse(await fileBlob.text());
        if (!Array.isArray(rawParsed)) {
            const potentialArray = Object.values(rawParsed).find(Array.isArray);
            if (potentialArray && potentialArray.length > 0) { 
                rawParsed = potentialArray; 
            } else { 
                throw new Error("Parsed JSON is not an array and no conversation array found within."); 
            }
        }
        conversations = rawParsed as RawConversation[];
    } catch(e) { 
        throw new Error(`JSON Parsing Error: ${e.message}`); 
    }

    const premiumReportData = await generateAllPremiumInsights(conversations);

    // Save report to database
    const { error: reportError } = await supabase
      .from('reports')
      .insert({ 
        user_id: user.id, 
        file_id: fileId, 
        report_type: 'premium', 
        report_data: premiumReportData 
      });
      
    if (reportError) {
        console.error(`Failed to save report: ${reportError.message}`);
    }

    await supabase
      .from('uploaded_files')
      .update({ has_premium_report: true })
      .eq('id', fileId);

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