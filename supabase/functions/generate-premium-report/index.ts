// @deno-types="npm:@types/deno"
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "npm:@google/generative-ai";

// --- SECTION 2: UTILITIES ---
function extractUserConversationText(conversation) {
    if (!conversation.mapping) return "";
    const messages = Object.values(conversation.mapping).filter((m) => m.message?.author?.role === 'user' && m.message?.content?.parts);
    messages.sort((a, b) => (a.message?.create_time || 0) - (b.message?.create_time || 0));
    return messages.map((m) => m.message?.content?.parts?.join(" ") || "").filter(Boolean).join("\n\n---\n\n");
}

// --- SECTION 3: OPTIMIZED LLM SERVICE ---
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const FAST_LLM_PROVIDER = Deno.env.get("FAST_LLM_PROVIDER") || "gemini";
const POWERFUL_LLM_PROVIDER = Deno.env.get("POWERFUL_LLM_PROVIDER") || "gemini";
const GEMINI_FAST_MODEL_NAME = "gemini-2.0-flash";
const GEMINI_POWERFUL_MODEL_NAME = "gemini-2.5-flash"; // Powerful model set as requested.

async function callLlmForJson(prompt, modelType) {
    const provider = modelType === 'fast' ? FAST_LLM_PROVIDER : POWERFUL_LLM_PROVIDER;
    if (provider === 'mock') {
        console.warn("Using MOCK LLM provider.");
        return {};
    }
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set for Gemini provider.");

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const modelName = modelType === 'fast' ? GEMINI_FAST_MODEL_NAME : GEMINI_POWERFUL_MODEL_NAME;

    const modelConfig = {
        model: modelName,
        safetySettings: [{
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE
        }]
    };
    
    const generationConfig = {
        responseMimeType: "application/json",
        temperature: 0.3,
        // --- REMOVED LIMIT: maxOutputTokens is now undefined ---
        // This allows the model to generate a response up to its maximum capacity.
    };

    if (modelType === 'powerful') {
        generationConfig.thinkingConfig = {
            thinkingBudget: 0, // Disables thinking for gemini-2.5-flash
        };
    }
    
    const model = genAI.getGenerativeModel(modelConfig);

    try {
        const result = await model.generateContent({
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }],
            generationConfig: generationConfig
        });

        const responseText = result.response.text();
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```|({[\s\S]*})/);
        if (!jsonMatch) {
            throw new Error(`Failed to find JSON in LLM response. Response: ${responseText}`);
        }
        const cleanedJsonText = jsonMatch[1] || jsonMatch[2];
        return JSON.parse(cleanedJsonText);
    } catch (error) {
        console.error(`Error calling LLM model ${modelName}.`, error);
        throw new Error(`LLM call failed: ${error.message}`);
    }
}

// --- SECTION 4: OPTIMIZED PROMPT DEFINITIONS ---

// --- ENHANCED PROMPT ---
function getStage1Prompt(text) {
    return `You are a data extraction and summarization AI.
    Your task is to perform a deep analysis of the following user conversation text and extract key information. Be thorough and capture as much detail as possible.

    CONVERSATION TEXT:
    ---
    ${text}
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
    - primaryTopics: Extract up to 10 detailed topics discussed. Be specific. Instead of "Tech," use "Debugging Python web scrapers."
    - communicationPatterns: Identify all applicable patterns from: SeekingInformation, ExpressingOpinion, Brainstorming, Storytelling, EmotionalVenting, ProblemSolving.
    - extractedPii: Find ALL instances of PII with categories: PersonalName, Location, Date_Specific, ContactInfo_Email, ContactInfo_Phone, Financial_Account, Health_Condition, Credentials_Login, ID_Number, Other_Sensitive.
    - standoutVocabulary: List up to 10 unique or sophisticated words used.
    - intriguingObservation: This is the most important field. Write a detailed, 2-3 sentence observation about the user's goals, methods, or underlying motivations evident in this text.
    
    JSON only:`;
}

// --- ENHANCED PROMPT ---
function getFbiProfilePrompt(topics = [], patterns = [], piiData = []) {
    const piiSamplesString = piiData.map(p => `- ${p.category}: "${p.pii}", Context: "${p.context}"`).join('\n');
    return `
    You are an expert behavioral analyst. Your task is to create a professional, insightful, and objective digital behavioral analysis dossier based on the provided aggregated conversation data.

    DATA:
    - Dominant Topics of Interest: ${(topics || []).join(', ')}
    - Observed Communication Patterns: ${(patterns || []).join(', ')}
    - Examples of Information Shared:
    ${piiSamplesString || "No significant PII was shared."}

    Synthesize this data into the following JSON structure. Your analysis should be neutral and based only on the data provided.

    JSON FORMAT:
    {
      "reportTitle": "Digital Behavioral Analysis Dossier",
      "subjectProfileSummary": "string (A 2-3 sentence executive summary of the subject's digital personality and interaction style.)",
      "dominantInterests": ["string", "string"],
      "communicationModalities": ["string", "string"],
      "emotionalToneAndEngagement": "string (Describe the typical emotional tone, e.g., 'Generally positive and inquisitive,' 'Prone to emotional venting,' etc.)",
      "informationSharingTendencies": "string (Assess the subject's propensity to share personal information based on the PII samples.)",
      "piiExamples": [{"pii": "string", "context": "string", "category": "string"}],
      "overallInteractionStyle": "string",
      "disclaimer": "This report is an AI-generated interpretation of aggregated digital interaction patterns and does not represent a comprehensive psychological assessment. It is for informational purposes only."
    }

    OUTPUT JSON ONLY.`;
}

// --- ENHANCED PROMPT ---
function getLinguisticFingerprintPrompt(vocab = [], avgSentenceLength = 0, vocabSize = 0) {
    return `You are a computational linguist. Create a detailed linguistic fingerprint based on the provided user data.

    DATA:
    - Sample Vocabulary: ${(vocab || []).join(', ')}
    - Average Sentence Length: ${avgSentenceLength.toFixed(1)} words
    - Estimated Vocabulary Size: ${vocabSize}

    Analyze the data and generate the report in the following JSON format.

    JSON FORMAT:
    {
      "reportTitle": "User Linguistic Fingerprint",
      "overallStyleDescription": "string (Describe the user's overall writing style, e.g., 'Concise and direct,' 'Descriptive and narrative,' 'Formal and academic').",
      "vocabularyProfile": {"qualitativeAssessment": "string (Assess the vocabulary - is it simple, technical, sophisticated, creative?)", "notableWords": ["string"]},
      "sentenceStructure": "string (Analyze sentence complexity and structure based on the average length.)",
      "expressiveness": "string (Comment on the potential expressiveness or creativity of the language used.)",
      "potentialInterestsIndicatedByLanguage": ["string"],
      "disclaimer": "This linguistic analysis is an AI-generated interpretation and not a formal psychometric assessment of verbal intelligence."
    }
    JSON ONLY.`;
}

function getTop5JustificationPrompt(conversations) {
    const convoStrings = (conversations || []).map((c, i) => `${i + 1}. "${c.title || 'Untitled'}": ${(c.primaryTopics || []).join(', ')}`).join('\n');
    return `You are a content curator. Your task is to justify why these 5 conversations are the most interesting from a larger collection.

    CONVERSATIONS:
    ${convoStrings}

    Provide a concise, compelling justification for each in the specified JSON format.

    JSON FORMAT:
    {"justifications": ["string", "string", "string", "string", "string"]}
    JSON ONLY.`;
}

// --- ENHANCED PROMPT ---
function getRealityTvPersonaPrompt(topics, patterns) {
    return `You are a creative casting director for a reality TV show. Based on the user's interests and communication style, create a fitting reality TV persona for them.

    USER DATA:
    - Topics of Interest: ${topics.join(', ')}
    - Communication Style: ${patterns.join(', ')}

    Generate the persona profile in the following JSON format. Be creative and entertaining.

    JSON FORMAT:
    {
      "reportTitle": "Your Reality TV Persona",
      "personaArchetype": "string (e.g., 'The Mastermind,' 'The Free Spirit,' 'The Strategist,' 'The Heart-on-their-Sleeve').",
      "description": "string (A colorful description of this character and their role on the show.)",
      "popCultureComparisons": ["string (Compare them to 1-2 characters from other shows/movies.)"],
      "disclaimer": "This is for entertainment purposes only."
    }
    JSON ONLY.`;
}

// --- REMOVED LIMIT ---
function getUnfilteredMirrorPrompt(observation) {
    return `Rephrase this observation into a single, profound, and intriguing sentence for self-reflection.

    ORIGINAL OBSERVATION:
    "${observation}"

    JSON FORMAT:
    {
      "reportTitle": "The Unfiltered Mirror",
      "observation": "string",
      "disclaimer": "This is an AI-generated inference based on patterns in your conversations, intended for self-reflection."
    }
    JSON ONLY.`;
}

// --- REMOVED LIMIT ---
function getPiiSafetyCompassPrompt(piiFrequencies) {
    const summary = piiFrequencies.map((p) => `${p.category}: ${p.count}`).join(', ');
    return `You are a digital security advisor. Analyze the following summary of a user's PII sharing habits and provide a risk assessment and advice.

    DATA:
    ${summary || 'No significant PII categories.'}

    Generate a report in the following JSON format. The advice should be practical and specific to the categories of PII shared.

    JSON FORMAT:
    {
      "reportTitle": "Your PII Safety Compass",
      "awarenessScore": "Low Risk|Medium Risk|High Risk",
      "summary": "string (A brief summary of their sharing habits and overall risk level.)",
      "detailedBreakdown": [{"category": "string", "advice": "string"}],
      "disclaimer": "This report analyzes PII categories, not actual data. This advice is general and not a substitute for professional security guidance."
    }
    JSON ONLY.`;
}

// --- ENHANCED PROMPT ---
function getCodenamePrompt(topics, patterns) {
    return `You are a spymaster in an intelligence agency. Your task is to assign a suitable codename to a new field agent based on their profile.

    AGENT PROFILE:
    - Interests: ${topics.join(', ')}
    - Communication Style: ${patterns.join(', ')}

    The codename should be clever and reflect their profile. Provide a brief justification.

    JSON FORMAT:
    {"name": "string", "justification": "string"}
    JSON ONLY.`;
}

// --- ENHANCED PROMPT ---
function getDoppelgangerPrompt(topics = [], vocab = [], insights = []) {
    const communicationStyle = insights.map(i => i.communicationPatterns).flat().filter((v, i, a) => a.indexOf(v) === i).join(', ');
    return `
    You are a creative social media content creator. Your task is to invent a fictional social media persona—a "Digital Doppelgänger"—that believably matches the user's personality based on their data.

    USER PROFILE DATA:
    - Key Interests: ${topics.join(', ')}
    - Typical Vocabulary: ${vocab.join(', ')}
    - Communication Style: ${communicationStyle || "General"}

    INSTRUCTIONS:
    1. Create a creative but relevant handle (@username).
    2. Write a short, punchy bio.
    3. Generate 3 realistic posts that capture the user's voice. The posts should sound like something a real person would write.
    4. DO NOT use generic or corporate-sounding language. The posts should feel personal.
    5. Ensure posts are under 280 characters.
    6. Output a single JSON object adhering to the specified format.

    JSON FORMAT:
    {
      "reportTitle": "Your Digital Doppelgänger",
      "handle": "string (@username based on interests/style)",
      "bio": "string (1-2 sentences reflecting personality)",
      "topHashtags": ["string", "string", "string"],
      "posts": [
        { "id": "1", "content": "string (tweet-like post)", "timestamp": "2h", "likes": "number (10-100)", "retweets": "number (1-20)", "replies": "number (1-30)" },
        { "id": "2", "content": "string (another post)", "timestamp": "6h", "likes": "number (10-100)", "retweets": "number (1-20)", "replies": "number (1-30)" },
        { "id": "3", "content": "string (third post)", "timestamp": "1d", "likes": "number (10-100)", "retweets": "number (1-20)", "replies": "number (1-30)" }
      ],
      "disclaimer": "This is an AI-generated fictional profile for entertainment."
    }
    JSON ONLY.`;
}

// --- SECTION 5: OPTIMIZED ANALYSIS PIPELINE ---
function performSupplementalBasicAnalysis(conversations) { let totalUserSentences = 0, totalUserWordsInSentences = 0; const userWordFrequency = {}; const commonStopWords = new Set([ 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who', 'this', 'that', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'of', 'at', 'by', 'for', 'with', 'about', 'to', 'from', 'in', 'out', 'on', 'so', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'chatgpt' ]); const getWords = (text)=>text ? text.toLowerCase().replace(/[^\w\s'-]/g, ' ').split(/\s+/).filter((w)=>w.length > 2 && !commonStopWords.has(w) && !/^\d+$/.test(w)) : []; const getSentences = (text)=>text ? text.split(/(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|!)\s+/).filter((s)=>s.trim().length > 0) : []; conversations.forEach((conv)=>{ if (!conv.mapping) return; Object.values(conv.mapping).forEach((mc)=>{ const msg = mc.message; if (msg?.author.role === 'user' && msg.content.parts) { const text = msg.content.parts.join(" "); getWords(text).forEach((w)=>userWordFrequency[w] = 1); const sentences = getSentences(text); totalUserSentences += sentences.length; sentences.forEach((s)=>totalUserWordsInSentences += getWords(s).length); } }); }); return { averageWordsPerUserSentence: totalUserSentences > 0 ? parseFloat((totalUserWordsInSentences / totalUserSentences).toFixed(1)) : 0, userVocabularySizeEstimate: Object.keys(userWordFrequency).length }; }

async function processConversationWithFastLlm(conv) {
    const userText = extractUserConversationText(conv);
    if (!userText.trim()) return null;

    try {
        const prompt = getStage1Prompt(userText);
        const result = await callLlmForJson(prompt, "fast");

        if (!result || typeof result !== 'object') {
            console.error(`Invalid result from LLM for conversation ${conv.id}`);
            return null;
        }
        
        return {
            conversationId: conv.id,
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

async function generateAllPremiumInsights(conversations) {
    const basicInsights = performSupplementalBasicAnalysis(conversations);
    
    const stage1Results = (await Promise.all(
        conversations.map((conv) => processConversationWithFastLlm(conv))
    )).filter((r) => r !== null);

    if (stage1Results.length === 0) {
        return { processingErrors: ["Failed to gather any insights from conversations."] };
    }

    const allTopics = stage1Results.flatMap((r) => r.primaryTopics);
    const allPatterns = stage1Results.flatMap((r) => r.communicationPatterns);
    const allExtractedPii = stage1Results.flatMap((r) => r.extractedPii);
    const allVocab = Array.from(new Set(stage1Results.flatMap((r) => r.standoutVocabulary)));
    const allObservations = stage1Results.map((r) => r.intriguingObservation).filter(Boolean);

    const countFrequency = (arr) => arr.reduce((acc, item) => (acc[item] = (acc[item] || 0) + 1, acc), {});
    const getTopItems = (map) => Object.entries(map).sort((a, b) => b[1] - a[1]).map((e) => e[0]);

    const topTopics = getTopItems(countFrequency(allTopics));
    const topPatterns = getTopItems(countFrequency(allPatterns));
    const piiCategoryList = allExtractedPii.map((p) => p.category);
    const piiFrequencies = Object.entries(countFrequency(piiCategoryList)).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);

    const reportPromises = [];
    
    reportPromises.push((async () => {
        try {
            const fbiDataPromise = callLlmForJson(getFbiProfilePrompt(topTopics, topPatterns, allExtractedPii), 'powerful');
            const codenamePromise = callLlmForJson(getCodenamePrompt(topTopics, topPatterns), 'powerful');
            const [fbiData, codename] = await Promise.all([fbiDataPromise, codenamePromise]);
            if (!fbiData) return null;
            return { type: 'fbiReport', data: { ...fbiData, subjectCodename: codename } };
        } catch (e) { console.error("FBI Report failed:", e.message); return null; }
    })());

    reportPromises.push(callLlmForJson(getLinguisticFingerprintPrompt(allVocab, basicInsights.averageWordsPerUserSentence, basicInsights.userVocabularySizeEstimate), 'powerful').then((data) => ({ type: 'linguisticFingerprint', data })).catch((e) => { console.error("Linguistic Report failed:", e.message); return null; }));

    const top5Convos = [...stage1Results].sort((a, b) => b.uniquenessScore - a.uniquenessScore).slice(0, 5);
    if (top5Convos.length > 0) {
        reportPromises.push((async () => {
            try {
                const prompt = getTop5JustificationPrompt(top5Convos);
                const result = await callLlmForJson(prompt, 'powerful');
                if (!result) return null;
                return top5Convos.map((convo, i) => ({
                    conversationId: convo.conversationId,
                    title: convo.title,
                    justification: result.justifications[i] || "This conversation explored highly niche topics."
                }));
            } catch (e) { console.error("Top 5 conversations failed:", e.message); return null; }
        })().then((data) => ({ type: 'topInterestingConversations', data })));
    }

    reportPromises.push(callLlmForJson(getRealityTvPersonaPrompt(topTopics, topPatterns), 'powerful').then((data) => ({ type: 'realityTVPersona', data })).catch((e) => { console.error("Reality TV Persona failed:", e.message); return null; }));

    if (allObservations.length > 0) {
        const mostInterestingObservation = allObservations.sort((a, b) => b.length - a.length)[0];
        reportPromises.push(callLlmForJson(getUnfilteredMirrorPrompt(mostInterestingObservation), 'powerful').then((data) => ({ type: 'unfilteredMirror', data })).catch((e) => { console.error("Unfiltered Mirror failed:", e.message); return null; }));
    }

    reportPromises.push(callLlmForJson(getPiiSafetyCompassPrompt(piiFrequencies), 'powerful').then((data) => ({ type: 'piiSafetyCompass', data })).catch((e) => { console.error("PII Safety Compass failed:", e.message); return null; }));

    reportPromises.push(callLlmForJson(getDoppelgangerPrompt(topTopics, allVocab, stage1Results), 'powerful').then((data) => ({ type: 'digitalDoppelganger', data })).catch((e) => { console.error("Digital Doppelganger failed:", e.message); return null; }));

    const generatedReports = (await Promise.all(reportPromises)).filter(Boolean);
    const advancedResults = {};
    generatedReports.forEach((report) => {
        if (report && report.data) {
            advancedResults[report.type] = report.data;
        }
    });

    return advancedResults;
}

// --- SECTION 6: MAIN SERVER LOGIC ---
serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

    try {
        const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Authorization required');
        const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (userError || !user) throw new Error('Invalid token');
        const { fileId } = await req.json();
        if (!fileId) throw new Error('File ID required');
        const { data: fileData, error: fileError } = await supabase.from('uploaded_files').select('file_path').eq('id', fileId).eq('user_id', user.id).single();
        if (fileError || !fileData) throw new Error('File not found or access denied');
        const { data: fileBlob, error: downloadError } = await supabase.storage.from('conversation-files').download(fileData.file_path);
        if (downloadError) throw new Error(`Failed to download file: ${downloadError.message}`);
        
        let conversations;
        try {
            let rawParsed = JSON.parse(await fileBlob.text());
            if (!Array.isArray(rawParsed)) {
                const potentialArray = Object.values(rawParsed).find(Array.isArray);
                if (potentialArray && potentialArray.length > 0) {
                    rawParsed = potentialArray;
                } else {
                    throw new Error("Parsed JSON is not an array and no conversation array found within.");
                }
            }
            conversations = rawParsed;
        } catch (e) {
            throw new Error(`JSON Parsing Error: ${e.message}`);
        }

        const premiumReportData = await generateAllPremiumInsights(conversations);

        const { error: reportError } = await supabase.from('reports').insert({
            user_id: user.id,
            file_id: fileId,
            report_type: 'premium',
            report_data: premiumReportData
        });
        if (reportError) {
            console.error(`Failed to save report: ${reportError.message}`);
        }
        await supabase.from('uploaded_files').update({ has_premium_report: true }).eq('id', fileId);

        return new Response(JSON.stringify({ success: true, report: premiumReportData }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error in generate-premium-report:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});