// @deno-types="npm:@types/deno"
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "npm:@google/generative-ai";

// --- SECTION 1: ENHANCED TYPES ---
interface BasicAnalysisResult { 
  averageWordsPerUserSentence: number; 
  userVocabularySizeEstimate: number; 
  totalConversations: number;
  totalUserMessages: number;
  conversationTimespan: number;
  topicDiversity: number;
}

interface RawConversation { 
  id?: string; 
  title?: string; 
  create_time?: number; 
  mapping?: { [id: string]: RawMessageContainer }; 
}

interface RawMessageContainer { message?: RawMessage; }

interface RawMessage { 
  author: { role: 'user' | 'assistant' }; 
  content: { parts: string[] }; 
  create_time?: number; 
}

interface ExtractedPii {
  pii: string;
  context: string;
  category: string;
  riskLevel: 'low' | 'medium' | 'high';
  conversationContext: string;
}

interface EnhancedConversationInsights {
  conversationId: string;
  title?: string;
  primaryTopics: string[];
  communicationPatterns: string[];
  extractedPii: ExtractedPii[];
  standoutVocabulary: string[];
  uniquenessScore: number;
  intriguingObservation: string;
  emotionalTone: string;
  complexityLevel: number;
  userEngagementLevel: number;
  conversationLength: number;
  timeOfDay?: string;
  topicEvolution: string[];
}

// Enhanced report types with richer data
interface EnhancedFBIReportData { 
  reportTitle: string; 
  subjectCodename: { name: string; justification: string; operationalSignificance: string; }; 
  subjectProfileSummary: string; 
  psychologicalProfile: string;
  dominantInterests: string[]; 
  communicationModalities: string[]; 
  emotionalToneAndEngagement: string; 
  informationSharingTendencies: string; 
  piiExamples: ExtractedPii[]; 
  overallInteractionStyle: string;
  behavioralPatterns: string[];
  potentialVulnerabilities: string[];
  operationalAssessment: string;
  disclaimer: string; 
}

interface EnhancedLinguisticFingerprintData { 
  reportTitle: string; 
  overallStyleDescription: string; 
  vocabularyProfile: { 
    qualitativeAssessment: string; 
    notableWords: string[]; 
    sophisticationLevel: string;
    domainSpecificTerms: string[];
    linguisticMarkers: string[];
  }; 
  sentenceStructure: string; 
  expressiveness: string; 
  potentialInterestsIndicatedByLanguage: string[];
  communicationEffectiveness: string;
  rhetoricalDevices: string[];
  cognitiveComplexity: string;
  disclaimer: string; 
}

interface TopConversation { 
  conversationId: string; 
  title?: string; 
  justification: string;
  significance: string;
  insights: string[];
}

interface EnhancedRealityTVPersonaData { 
  reportTitle: string; 
  personaArchetype: string; 
  description: string; 
  popCultureComparisons: string[]; 
  characterTraits: string[];
  likelyStoryArcs: string[];
  viewerAppeal: string;
  conflictStyle: string;
  disclaimer: string; 
}

interface EnhancedUnfilteredMirrorData { 
  reportTitle: string; 
  observation: string;
  deeperInsight: string;
  psychologicalImplications: string;
  disclaimer: string; 
}

interface EnhancedPIISafetyCompassData { 
  reportTitle: string; 
  awarenessScore: "Low Risk" | "Medium Risk" | "High Risk"; 
  summary: string; 
  detailedBreakdown: { category: string; advice: string; riskLevel: string; examples: string[]; }[]; 
  overallSecurityPosture: string;
  recommendedActions: string[];
  disclaimer: string; 
}

interface EnhancedDigitalDoppelgangerData { 
  reportTitle: string; 
  handle: string; 
  bio: string; 
  topHashtags: string[]; 
  personalityTraits: string[];
  likelyFollowers: string[];
  contentStyle: string;
  onlineBehavior: string;
  disclaimer: string; 
}

// New enhanced reports
interface CognitiveFingerprintData {
  reportTitle: string;
  thinkingStyle: string;
  problemSolvingApproach: string;
  learningPreferences: string;
  decisionMakingPattern: string;
  creativityIndicators: string[];
  analyticalDepth: string;
  cognitiveFlexibility: string;
  disclaimer: string;
}

interface PersonalityArchetypeData {
  reportTitle: string;
  primaryArchetype: string;
  secondaryTraits: string[];
  motivationalDrivers: string[];
  communicationStyle: string;
  relationshipPatterns: string;
  stressResponses: string[];
  growthAreas: string[];
  disclaimer: string;
}

interface AdvancedAnalysisResult {
    fbiReport?: EnhancedFBIReportData;
    linguisticFingerprint?: EnhancedLinguisticFingerprintData;
    topInterestingConversations?: TopConversation[];
    realityTVPersona?: EnhancedRealityTVPersonaData;
    unfilteredMirror?: EnhancedUnfilteredMirrorData;
    piiSafetyCompass?: EnhancedPIISafetyCompassData;
    digitalDoppelganger?: EnhancedDigitalDoppelgangerData;
    cognitiveFingerprint?: CognitiveFingerprintData;
    personalityArchetype?: PersonalityArchetypeData;
    processingErrors?: string[];
}

// --- SECTION 2: ENHANCED UTILITIES ---
function extractUserConversationText(conversation: RawConversation, includeTimestamps: boolean = false): string {
  if (!conversation.mapping) return "";
  const messages = Object.values(conversation.mapping)
    .filter(m => m.message?.author?.role === 'user' && m.message?.content?.parts);
  
  messages.sort((a, b) => (a.message?.create_time || 0) - (b.message?.create_time || 0));
  
  return messages
    .map(m => {
      const text = m.message?.content?.parts?.join(" ") || "";
      if (includeTimestamps && m.message?.create_time) {
        const timestamp = new Date(m.message.create_time * 1000).toISOString();
        return `[${timestamp}] ${text}`;
      }
      return text;
    })
    .filter(Boolean)
    .join("\n\n---\n\n");
}

function analyzeConversationMetrics(conversations: RawConversation[]): BasicAnalysisResult {
  let totalUserMessages = 0;
  let totalUserSentences = 0;
  let totalUserWordsInSentences = 0;
  const userWordFrequency: { [key: string]: number } = {};
  const topics = new Set<string>();
  const timestamps: number[] = [];
  
  const commonStopWords = new Set(['i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who', 'this', 'that', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'of', 'at', 'by', 'for', 'with', 'about', 'to', 'from', 'in', 'out', 'on', 'so', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'chatgpt']);
  
  const getWords = (text: string) => text ? text.toLowerCase().replace(/[^\w\s'-]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !commonStopWords.has(w) && !/^\d+$/.test(w)) : [];
  const getSentences = (text: string) => text ? text.split(/(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|!)\s+/).filter(s => s.trim().length > 0) : [];
  
  conversations.forEach(conv => {
    if (conv.title) {
      topics.add(conv.title.toLowerCase());
    }
    if (conv.create_time) {
      timestamps.push(conv.create_time * 1000);
    }
    
    if (!conv.mapping) return;
    Object.values(conv.mapping).forEach(mc => {
      const msg = mc.message;
      if (msg?.author.role === 'user' && msg.content.parts) {
        totalUserMessages++;
        const text = msg.content.parts.join(" ");
        getWords(text).forEach(w => userWordFrequency[w] = (userWordFrequency[w] || 0) + 1);
        const sentences = getSentences(text);
        totalUserSentences += sentences.length;
        sentences.forEach(s => totalUserWordsInSentences += getWords(s).length);
        
        if (msg.create_time) {
          timestamps.push(msg.create_time * 1000);
        }
      }
    });
  });
  
  const timespan = timestamps.length > 1 ? 
    (Math.max(...timestamps) - Math.min(...timestamps)) / (1000 * 60 * 60 * 24) : 0;
  
  return {
    averageWordsPerUserSentence: totalUserSentences > 0 ? parseFloat((totalUserWordsInSentences / totalUserSentences).toFixed(1)) : 0,
    userVocabularySizeEstimate: Object.keys(userWordFrequency).length,
    totalConversations: conversations.length,
    totalUserMessages,
    conversationTimespan: timespan,
    topicDiversity: topics.size
  };
}

// --- SECTION 3: ENHANCED LLM SERVICE ---
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const FAST_LLM_PROVIDER = (Deno.env.get("FAST_LLM_PROVIDER") as "gemini" | "mock") || "gemini";
const POWERFUL_LLM_PROVIDER = (Deno.env.get("POWERFUL_LLM_PROVIDER") as "gemini" | "mock") || "gemini";
const GEMINI_FAST_MODEL_NAME = "gemini-1.5-flash-latest";
const GEMINI_POWERFUL_MODEL_NAME = "gemini-1.5-pro-latest";

async function callLlmForJson<T>(prompt: string, modelType: "fast" | "powerful", maxTokens?: number): Promise<T> {
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
        temperature: 0.2, // Lower temperature for more consistent quality
        maxOutputTokens: maxTokens || (modelType === 'fast' ? 2048 : 4096) // Higher token limits for quality
      },
  });
  
  const cleanedJsonText = result.response.text().replace(/^```json\s*|```\s*$/g, "").trim();
  return JSON.parse(cleanedJsonText) as T;
}

// --- SECTION 4: ENHANCED PROMPT DEFINITIONS ---
function getEnhancedStage1Prompt(text: string, conversationTitle?: string): string {
    return `You are an expert behavioral analyst. Perform a comprehensive analysis of this user conversation excerpt. Focus ONLY on the user's contributions and provide deep insights.

Conversation Title: "${conversationTitle || 'Untitled'}"
Conversation Excerpt:
---
${text.substring(0, 20000)} // Increased text limit for better analysis
---

Provide a detailed JSON analysis:

{
  "primaryTopics": ["string (3-5 main topics discussed)"],
  "communicationPatterns": ["string (Choose 3-5 from: SeekingInformation, ExpressingOpinion, Brainstorming, Storytelling, EmotionalVenting, ProblemSolving, Teaching, Debating, Reflecting, Planning)"],
  "extractedPii": [
    {
      "pii": "string (exact personal data found)",
      "context": "string (detailed context of sharing)",
      "category": "string (PersonalName, Location, Date_Specific, ContactInfo_Email, ContactInfo_Phone, Financial_Account, Health_Condition, Credentials_Login, ID_Number, Other_Sensitive)",
      "riskLevel": "string (low/medium/high based on sensitivity)",
      "conversationContext": "string (why this was shared in conversation)"
    }
  ],
  "standoutVocabulary": ["string (5-8 sophisticated or domain-specific words)"],
  "uniquenessScore": "number (1-10, rate how unique/niche this conversation topic is)",
  "intriguingObservation": "string (deep, respectful insight about user's goals, challenges, or interests)",
  "emotionalTone": "string (overall emotional tone: analytical, enthusiastic, frustrated, curious, etc.)",
  "complexityLevel": "number (1-10, intellectual complexity of discussion)",
  "userEngagementLevel": "number (1-10, how engaged/invested the user seems)",
  "conversationLength": "number (estimated number of user messages)",
  "topicEvolution": ["string (how topics evolved during conversation)"]
}

Instructions:
- Be thorough and insightful in your analysis
- Look for subtle patterns and deeper meanings
- Rate uniqueness based on how specialized or uncommon the topic is
- For intriguingObservation, provide a meaningful insight that shows understanding of the user's deeper motivations
- Assess emotional tone from language patterns, word choice, and engagement style
- Consider complexity based on vocabulary, concepts discussed, and depth of reasoning

Output JSON only:`;
}

function getEnhancedFbiProfilePrompt(topics: string[], patterns: string[], piiData: ExtractedPii[], basicMetrics: BasicAnalysisResult): string {
  const piiSamplesString = piiData && piiData.length > 0
    ? piiData.slice(0, 10)
        .filter(p => p && p.category && p.pii && p.context)
        .map(p => `- Category: ${p.category} (Risk: ${p.riskLevel})\n  Data: "${p.pii}"\n  Context: "${p.context}"\n  Conversation Context: "${p.conversationContext}"`)
        .join('\n\n')
    : "No specific PII was extracted.";

  return `You are a senior FBI behavioral analyst compiling a comprehensive digital behavioral assessment. Create a detailed, professional psychological and operational profile.

SUBJECT DATA SUMMARY:
- Total Conversations Analyzed: ${basicMetrics.totalConversations}
- Total User Messages: ${basicMetrics.totalUserMessages}
- Conversation Timespan: ${basicMetrics.conversationTimespan.toFixed(1)} days
- Vocabulary Sophistication: ${basicMetrics.userVocabularySizeEstimate} unique words
- Topic Diversity: ${basicMetrics.topicDiversity} distinct conversation themes

PRIMARY INTERESTS & TOPICS:
${topics.slice(0, 15).join(', ')}

COMMUNICATION BEHAVIORAL PATTERNS:
${patterns.slice(0, 8).join(', ')}

PERSONALLY IDENTIFIABLE INFORMATION ANALYSIS:
${piiSamplesString}

Generate a comprehensive behavioral dossier in JSON format:

{
  "reportTitle": "Digital Behavioral Analysis Dossier - Classification: CONFIDENTIAL",
  "subjectProfileSummary": "string (3-4 sentence comprehensive overview of subject's digital persona and behavioral patterns)",
  "psychologicalProfile": "string (detailed psychological assessment based on communication patterns, interests, and behavior)",
  "dominantInterests": ["string (5-7 primary areas of interest)"],
  "communicationModalities": ["string (3-4 distinct communication styles observed)"],
  "emotionalToneAndEngagement": "string (detailed analysis of emotional patterns and engagement levels)",
  "informationSharingTendencies": "string (comprehensive analysis of PII sharing behavior, risk assessment, and patterns)",
  "piiExamples": [{"pii": "string", "context": "string", "category": "string", "riskLevel": "string"}],
  "overallInteractionStyle": "string (detailed description of how subject interacts with AI systems)",
  "behavioralPatterns": ["string (3-5 key behavioral patterns identified)"],
  "potentialVulnerabilities": ["string (2-3 potential security or social engineering vulnerabilities based on behavior)"],
  "operationalAssessment": "string (assessment of subject's operational security awareness and digital footprint management)",
  "disclaimer": "This report represents an AI-generated behavioral analysis based on digital interaction patterns. It is intended for informational and self-reflection purposes only and does not constitute a professional psychological assessment or security clearance evaluation."
}

Instructions:
- Maintain professional FBI analytical tone throughout
- Base all assessments on provided data
- Be thorough but objective in psychological profiling
- Assess operational security implications of observed behaviors
- Provide actionable insights while maintaining analytical objectivity

Output JSON only:`;
}

function getEnhancedLinguisticFingerprintPrompt(vocab: string[], avgSentenceLength: number, vocabSize: number, conversations: EnhancedConversationInsights[]): string {
    const complexityLevels = conversations.map(c => c.complexityLevel);
    const avgComplexity = complexityLevels.length > 0 ? complexityLevels.reduce((a, b) => a + b, 0) / complexityLevels.length : 0;
    
    return `You are a computational linguist creating a comprehensive linguistic fingerprint analysis. Analyze the subject's language patterns with academic rigor.

LINGUISTIC DATA:
- Vocabulary Sample: ${vocab.slice(0, 50).join(', ')}
- Average Sentence Length: ${avgSentenceLength.toFixed(1)} words
- Total Vocabulary Size: ${vocabSize} unique words
- Average Conversation Complexity: ${avgComplexity.toFixed(1)}/10
- Total Conversations Analyzed: ${conversations.length}

CONVERSATION COMPLEXITY DISTRIBUTION:
${conversations.map(c => `"${c.title || 'Untitled'}": Complexity ${c.complexityLevel}/10, Tone: ${c.emotionalTone}`).slice(0, 10).join('\n')}

Generate a comprehensive linguistic analysis in JSON format:

{
  "reportTitle": "Comprehensive Linguistic Fingerprint Analysis",
  "overallStyleDescription": "string (detailed 3-4 sentence description of the subject's linguistic style and communication approach)",
  "vocabularyProfile": {
    "qualitativeAssessment": "string (detailed assessment of vocabulary sophistication and range)",
    "notableWords": ["string (10-15 most distinctive vocabulary choices)"],
    "sophisticationLevel": "string (assessment of overall linguistic sophistication: Basic, Intermediate, Advanced, Expert)",
    "domainSpecificTerms": ["string (5-8 terms indicating specific domain expertise)"],
    "linguisticMarkers": ["string (3-5 distinctive linguistic patterns or markers)"]
  },
  "sentenceStructure": "string (detailed analysis of sentence construction patterns, complexity, and style)",
  "expressiveness": "string (analysis of emotional expressiveness, rhetorical devices, and communication effectiveness)",
  "potentialInterestsIndicatedByLanguage": ["string (5-8 interests/fields suggested by language patterns)"],
  "communicationEffectiveness": "string (assessment of how effectively the subject communicates ideas)",
  "rhetoricalDevices": ["string (3-5 rhetorical devices or communication strategies observed)"],
  "cognitiveComplexity": "string (analysis of cognitive complexity demonstrated through language use)",
  "disclaimer": "This linguistic analysis represents a computational assessment of language patterns and does not constitute a formal evaluation of intelligence, education level, or professional competency."
}

Instructions:
- Provide academic-level linguistic analysis
- Focus on distinctive patterns that create a unique linguistic fingerprint
- Assess both technical and creative language use
- Consider cognitive implications of language patterns
- Maintain scholarly objectivity while being thorough

Output JSON only:`;
}

function getEnhancedTop5JustificationPrompt(conversations: EnhancedConversationInsights[]): string {
    const convoDetails = conversations.slice(0, 5).map((c, i) => 
        `Conversation ${i+1}:
Title: "${c.title || 'Untitled'}"
Topics: ${c.primaryTopics.join(', ')}
Uniqueness Score: ${c.uniquenessScore}/10
Complexity Level: ${c.complexityLevel}/10
Emotional Tone: ${c.emotionalTone}
Key Observation: ${c.intriguingObservation}
Topic Evolution: ${c.topicEvolution.join(' → ')}`
    ).join('\n\n');
    
    return `You are analyzing the 5 most intellectually unique conversations from a user's chat history. For each conversation, provide a detailed justification explaining its significance and what it reveals about the user.

CONVERSATION DETAILS:
${convoDetails}

Generate detailed justifications in JSON format:

{
  "justifications": [
    "string (detailed 2-3 sentence explanation of why conversation 1 is significant and what it reveals about the user's interests, thinking style, or expertise)",
    "string (detailed justification for conversation 2)",
    "string (detailed justification for conversation 3)",
    "string (detailed justification for conversation 4)",
    "string (detailed justification for conversation 5)"
  ]
}

Instructions:
- Focus on what makes each conversation intellectually or personally significant
- Explain what the conversation reveals about the user's expertise, interests, or thinking patterns
- Consider the complexity, uniqueness, and depth of engagement
- Highlight any specialized knowledge or unique perspectives demonstrated

Output JSON only:`;
}

function getCognitiveFingerprintPrompt(conversations: EnhancedConversationInsights[], basicMetrics: BasicAnalysisResult): string {
    const problemSolvingConvos = conversations.filter(c => c.communicationPatterns.includes('ProblemSolving'));
    const analyticalConvos = conversations.filter(c => c.complexityLevel >= 7);
    
    return `You are a cognitive scientist analyzing thinking patterns and cognitive style. Create a comprehensive cognitive fingerprint based on conversation analysis.

COGNITIVE DATA ANALYSIS:
- Total Conversations: ${conversations.length}
- Problem-Solving Conversations: ${problemSolvingConvos.length}
- High-Complexity Conversations: ${analyticalConvos.length}
- Average Complexity Level: ${conversations.reduce((sum, c) => sum + c.complexityLevel, 0) / conversations.length}
- Vocabulary Sophistication: ${basicMetrics.userVocabularySizeEstimate} unique words

THINKING PATTERN INDICATORS:
${conversations.slice(0, 8).map(c => 
  `"${c.title}": ${c.communicationPatterns.join(', ')} | Complexity: ${c.complexityLevel}/10`
).join('\n')}

Generate a cognitive analysis in JSON format:

{
  "reportTitle": "Cognitive Fingerprint Analysis",
  "thinkingStyle": "string (detailed analysis of primary thinking style: analytical, creative, systematic, intuitive, etc.)",
  "problemSolvingApproach": "string (how the subject approaches and works through problems)",
  "learningPreferences": "string (preferred learning and information processing styles)",
  "decisionMakingPattern": "string (how the subject appears to make decisions and evaluate options)",
  "creativityIndicators": ["string (3-5 indicators of creative thinking patterns)"],
  "analyticalDepth": "string (assessment of analytical thinking depth and systematic reasoning)",
  "cognitiveFlexibility": "string (ability to adapt thinking across different domains and contexts)",
  "disclaimer": "This cognitive analysis is based on communication patterns and does not represent a formal cognitive assessment or IQ evaluation."
}

Output JSON only:`;
}

function getPersonalityArchetypePrompt(conversations: EnhancedConversationInsights[], topics: string[], patterns: string[]): string {
    const emotionalTones = conversations.map(c => c.emotionalTone);
    const engagementLevels = conversations.map(c => c.userEngagementLevel);
    
    return `You are a personality psychologist creating a comprehensive personality archetype analysis. Synthesize communication patterns, interests, and behavioral indicators into a detailed personality profile.

PERSONALITY INDICATORS:
- Primary Topics of Interest: ${topics.slice(0, 12).join(', ')}
- Communication Patterns: ${patterns.slice(0, 8).join(', ')}
- Emotional Tone Distribution: ${emotionalTones.slice(0, 10).join(', ')}
- Average Engagement Level: ${engagementLevels.reduce((a, b) => a + b, 0) / engagementLevels.length}/10

BEHAVIORAL PATTERN ANALYSIS:
${conversations.slice(0, 6).map(c => 
  `"${c.title}": Tone: ${c.emotionalTone}, Engagement: ${c.userEngagementLevel}/10, Patterns: ${c.communicationPatterns.join(', ')}`
).join('\n')}

Generate a comprehensive personality analysis in JSON format:

{
  "reportTitle": "Personality Archetype Analysis",
  "primaryArchetype": "string (main personality archetype: The Analyst, The Creator, The Explorer, The Builder, etc.)",
  "secondaryTraits": ["string (4-6 secondary personality traits that complement the primary archetype)"],
  "motivationalDrivers": ["string (3-5 key motivational factors that drive behavior and interests)"],
  "communicationStyle": "string (detailed description of communication preferences and style)",
  "relationshipPatterns": "string (how the subject likely approaches relationships and social interactions)",
  "stressResponses": ["string (2-3 likely responses to stress or challenges based on observed patterns)"],
  "growthAreas": ["string (3-4 potential areas for personal development based on personality patterns)"],
  "disclaimer": "This personality analysis is based on communication patterns and interests. It is intended for self-reflection and does not replace professional personality assessment tools."
}

Output JSON only:`;
}

// --- SECTION 5: ENHANCED ANALYSIS PIPELINE ---
async function processConversationWithEnhancedAnalysis(conv: RawConversation): Promise<EnhancedConversationInsights | null> {
    const userText = extractUserConversationText(conv, true);
    if (!userText.trim()) return null;
    
    try {
        const prompt = getEnhancedStage1Prompt(userText, conv.title);
        const result = await callLlmForJson<any>(prompt, "powerful", 3072); // Use powerful model with higher token limit
        
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
            intriguingObservation: result.intriguingObservation || "",
            emotionalTone: result.emotionalTone || "neutral",
            complexityLevel: parseInt(String(result.complexityLevel), 10) || 1,
            userEngagementLevel: parseInt(String(result.userEngagementLevel), 10) || 1,
            conversationLength: parseInt(String(result.conversationLength), 10) || 1,
            topicEvolution: result.topicEvolution || []
        };
    } catch (error) {
        console.error(`Error processing conversation ${conv.id || 'N/A'}:`, error.message);
        return null;
    }
}

async function generateEnhancedPremiumInsights(conversations: RawConversation[]): Promise<AdvancedAnalysisResult> {
    // Process more conversations for higher quality analysis
    const limitedConversations = conversations.slice(0, 100);
    
    const basicInsights = analyzeConversationMetrics(limitedConversations);
    
    // Process conversations in batches to avoid overwhelming the API
    const batchSize = 10;
    const stage1Results: EnhancedConversationInsights[] = [];
    
    for (let i = 0; i < limitedConversations.length; i += batchSize) {
        const batch = limitedConversations.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(conv => processConversationWithEnhancedAnalysis(conv))
        );
        stage1Results.push(...batchResults.filter(r => r !== null) as EnhancedConversationInsights[]);
        
        // Small delay between batches to respect API limits
        if (i + batchSize < limitedConversations.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    if (stage1Results.length === 0) {
        return { processingErrors: ["Failed to gather any insights from conversations."] };
    }

    // Enhanced data aggregation
    const allTopics = stage1Results.flatMap(r => r.primaryTopics);
    const allPatterns = stage1Results.flatMap(r => r.communicationPatterns);
    const allExtractedPii = stage1Results.flatMap(r => r.extractedPii);
    const allVocab = Array.from(new Set(stage1Results.flatMap(r => r.standoutVocabulary)));
    const allObservations = stage1Results.map(r => r.intriguingObservation).filter(Boolean);
    
    const countFrequency = (arr: string[]) => arr.reduce((acc, item) => (acc[item] = (acc[item] || 0) + 1, acc), {} as Record<string, number>);
    const getTopN = (map: Record<string, number>, n: number) => Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n).map(e => e[0]);

    const topTopics = getTopN(countFrequency(allTopics), 15);
    const topPatterns = getTopN(countFrequency(allPatterns), 10);

    const piiCategoryList = allExtractedPii.map(p => p.category);
    const piiFrequencies = Object.entries(countFrequency(piiCategoryList))
        .map(([category, count]) => ({ category, count }))
        .sort((a,b) => b.count-a.count);
    
    const reportPromises = [];
    
    // 1. Enhanced FBI Report with Codename
    reportPromises.push(
      (async () => {
        try {
          const codenamePromise = callLlmForJson<{name: string, justification: string, operationalSignificance: string}>(
            getCodenamePrompt(topTopics, topPatterns), 'powerful', 1024
          ).catch(() => ({ 
            name: "The Analyst", 
            justification: "Systematically processes information with methodical precision.",
            operationalSignificance: "Demonstrates consistent analytical approach across multiple domains."
          }));
          
          const fbiDataPromise = callLlmForJson<Omit<EnhancedFBIReportData, 'subjectCodename'>>(
            getEnhancedFbiProfilePrompt(topTopics, topPatterns, allExtractedPii.slice(0, 15), basicInsights), 
            'powerful', 
            4096
          );
          
          const [codename, fbiData] = await Promise.all([codenamePromise, fbiDataPromise]);
          
          if (!fbiData) return null;
          return { type: 'fbiReport', data: { ...fbiData, subjectCodename: codename } };
        } catch (e) {
          console.error("Enhanced FBI Report failed:", e.message);
          return null;
        }
      })()
    );

    // 2. Enhanced Linguistic Fingerprint
    reportPromises.push(
        callLlmForJson<EnhancedLinguisticFingerprintData>(
            getEnhancedLinguisticFingerprintPrompt(allVocab, basicInsights.averageWordsPerUserSentence, basicInsights.userVocabularySizeEstimate, stage1Results), 
            'powerful', 
            3072
        )
            .then(data => ({ type: 'linguisticFingerprint', data }))
            .catch(e => { console.error("Enhanced Linguistic Report failed:", e.message); return null; })
    );

    // 3. Enhanced Top 5 Interesting Conversations
    const top5Convos = [...stage1Results]
        .sort((a, b) => (b.uniquenessScore * b.complexityLevel) - (a.uniquenessScore * a.complexityLevel))
        .slice(0, 5);
        
    if (top5Convos.length > 0) {
        reportPromises.push(
            (async () => {
                try {
                  const prompt = getEnhancedTop5JustificationPrompt(top5Convos);
                  const result = await callLlmForJson<{justifications: string[]}>(prompt, 'powerful', 2048);
                  if (!result) return null;
                  
                  return top5Convos.map((convo, i) => ({
                      conversationId: convo.conversationId,
                      title: convo.title,
                      justification: result.justifications[i] || "This conversation demonstrated exceptional intellectual depth and unique perspectives.",
                      significance: `Uniqueness: ${convo.uniquenessScore}/10, Complexity: ${convo.complexityLevel}/10`,
                      insights: convo.topicEvolution.length > 0 ? convo.topicEvolution : [convo.intriguingObservation]
                  }));
                } catch (e) {
                  console.error("Enhanced Top 5 conversations failed:", e.message);
                  return null;
                }
            })().then(data => ({ type: 'topInterestingConversations', data }))
        );
    }
    
    // 4. Enhanced Reality TV Persona
    reportPromises.push(
        callLlmForJson<EnhancedRealityTVPersonaData>(
            getEnhancedRealityTvPersonaPrompt(topTopics, topPatterns, stage1Results), 
            'powerful', 
            2048
        )
            .then(data => ({ type: 'realityTVPersona', data }))
            .catch(e => { console.error("Enhanced Reality TV Persona failed:", e.message); return null; })
    );

    // 5. Enhanced Unfiltered Mirror
    if (allObservations.length > 0) {
        const mostInsightfulObservation = allObservations
            .sort((a, b) => b.length - a.length)[0];
        reportPromises.push(
            callLlmForJson<EnhancedUnfilteredMirrorData>(
                getEnhancedUnfilteredMirrorPrompt(mostInsightfulObservation), 
                'powerful', 
                1536
            )
                .then(data => ({ type: 'unfilteredMirror', data }))
                .catch(e => { console.error("Enhanced Unfiltered Mirror failed:", e.message); return null; })
        );
    }
    
    // 6. Enhanced PII Safety Compass
    reportPromises.push(
        callLlmForJson<EnhancedPIISafetyCompassData>(
            getEnhancedPiiSafetyCompassPrompt(piiFrequencies, allExtractedPii), 
            'powerful', 
            2048
        )
            .then(data => ({ type: 'piiSafetyCompass', data }))
            .catch(e => { console.error("Enhanced PII Safety Compass failed:", e.message); return null; })
    );

    // 7. Enhanced Digital Doppelgänger
    reportPromises.push(
        callLlmForJson<EnhancedDigitalDoppelgangerData>(
            getEnhancedDoppelgangerPrompt(topTopics, allVocab.slice(0, 25), stage1Results), 
            'powerful', 
            1536
        )
            .then(data => ({ type: 'digitalDoppelganger', data }))
            .catch(e => { console.error("Enhanced Digital Doppelganger failed:", e.message); return null; })
    );

    // 8. NEW: Cognitive Fingerprint
    reportPromises.push(
        callLlmForJson<CognitiveFingerprintData>(
            getCognitiveFingerprintPrompt(stage1Results, basicInsights), 
            'powerful', 
            2048
        )
            .then(data => ({ type: 'cognitiveFingerprint', data }))
            .catch(e => { console.error("Cognitive Fingerprint failed:", e.message); return null; })
    );

    // 9. NEW: Personality Archetype
    reportPromises.push(
        callLlmForJson<PersonalityArchetypeData>(
            getPersonalityArchetypePrompt(stage1Results, topTopics, topPatterns), 
            'powerful', 
            2048
        )
            .then(data => ({ type: 'personalityArchetype', data }))
            .catch(e => { console.error("Personality Archetype failed:", e.message); return null; })
    );

    // Execute all reports with proper error handling
    const generatedReports = (await Promise.all(reportPromises)).filter(Boolean);
    const advancedResults: AdvancedAnalysisResult = {};
    
    generatedReports.forEach(report => {
        if (report && report.data) {
            advancedResults[report.type as keyof AdvancedAnalysisResult] = report.data as any;
        }
    });

    return advancedResults;
}

// Additional enhanced prompt functions
function getCodenamePrompt(topics: string[], patterns: string[]): string {
    return `You are a senior intelligence officer creating an operational codename for a digital subject. Base the codename on their demonstrated expertise and behavioral patterns.

SUBJECT INTELLIGENCE:
- Primary Areas of Expertise: ${topics.slice(0, 8).join(', ')}
- Operational Patterns: ${patterns.slice(0, 5).join(', ')}

Generate a sophisticated codename analysis in JSON format:

{
  "name": "string (A sophisticated, evocative codename that reflects the subject's primary characteristics - examples: 'The Architect', 'Nexus', 'Catalyst', 'The Synthesizer')",
  "justification": "string (2-3 sentence explanation of why this codename fits the subject's profile)",
  "operationalSignificance": "string (What this codename suggests about the subject's operational value or capabilities)"
}

Instructions:
- Create a codename that sounds professional and intriguing
- Base it on the subject's demonstrated expertise and thinking patterns
- Consider their problem-solving approach and areas of knowledge
- Make it memorable and fitting for an intelligence dossier

Output JSON only:`;
}

function getEnhancedRealityTvPersonaPrompt(topics: string[], patterns: string[], conversations: EnhancedConversationInsights[]): string {
    const avgEngagement = conversations.reduce((sum, c) => sum + c.userEngagementLevel, 0) / conversations.length;
    const emotionalRange = Array.from(new Set(conversations.map(c => c.emotionalTone)));
    
    return `You are a reality TV casting director and personality analyst. Create a comprehensive reality TV persona based on the subject's communication patterns and interests.

CASTING ANALYSIS:
- Primary Interests: ${topics.slice(0, 10).join(', ')}
- Communication Patterns: ${patterns.slice(0, 6).join(', ')}
- Average Engagement Level: ${avgEngagement.toFixed(1)}/10
- Emotional Range: ${emotionalRange.join(', ')}

PERSONALITY INDICATORS:
${conversations.slice(0, 5).map(c => 
  `"${c.title}": Engagement ${c.userEngagementLevel}/10, Tone: ${c.emotionalTone}, Complexity: ${c.complexityLevel}/10`
).join('\n')}

Generate a comprehensive reality TV analysis in JSON format:

{
  "reportTitle": "Your Reality TV Persona",
  "personaArchetype": "string (main archetype: The Strategist, The Heart, The Rebel, The Mentor, The Wildcard, etc.)",
  "description": "string (detailed 3-4 sentence description of how this persona would manifest on a reality show)",
  "popCultureComparisons": ["string (2-3 specific reality TV personalities or characters this persona resembles)"],
  "characterTraits": ["string (4-5 key personality traits that would make for compelling television)"],
  "likelyStoryArcs": ["string (2-3 potential storylines or character development arcs)"],
  "viewerAppeal": "string (what type of audience would connect with this persona and why)",
  "conflictStyle": "string (how this persona would handle conflict and drama)",
  "disclaimer": "This analysis is for entertainment purposes only and represents a fictional television persona based on communication patterns."
}

Output JSON only:`;
}

function getEnhancedUnfilteredMirrorPrompt(observation: string): string {
    return `You are a perceptive psychologist creating a profound "mirror moment" - a single, deeply insightful observation that reveals something meaningful about the subject's inner world.

ORIGINAL INSIGHT:
"${observation}"

Transform this into a powerful, almost eerily accurate observation for "The Unfiltered Mirror" report:

{
  "reportTitle": "The Unfiltered Mirror",
  "observation": "string (A single, profound sentence that captures a deep truth about the subject - make it insightful, slightly surprising, but respectful)",
  "deeperInsight": "string (A follow-up sentence that adds psychological depth to the observation)",
  "psychologicalImplications": "string (What this observation suggests about the subject's motivations, fears, or aspirations)",
  "disclaimer": "This reflection is an AI-generated interpretation of communication patterns, intended for self-reflection and personal insight."
}

Instructions:
- Create an observation that feels personally meaningful and accurate
- Focus on deeper motivations, hidden patterns, or unconscious drives
- Make it thought-provoking but not judgmental
- Aim for the "how did it know that?" effect while remaining respectful

Output JSON only:`;
}

function getEnhancedPiiSafetyCompassPrompt(piiFrequencies: { category: string, count: number }[], allPii: ExtractedPii[]): string {
    const highRiskPii = allPii.filter(p => p.riskLevel === 'high');
    const mediumRiskPii = allPii.filter(p => p.riskLevel === 'medium');
    const summary = piiFrequencies.slice(0, 8).map(p => `${p.category}: ${p.count} instances`).join(', ');
    
    return `You are a cybersecurity analyst creating a comprehensive PII safety assessment. Analyze the subject's information sharing patterns and provide actionable security guidance.

PII SHARING ANALYSIS:
- Category Frequencies: ${summary || 'No significant PII categories identified.'}
- High-Risk Disclosures: ${highRiskPii.length} instances
- Medium-Risk Disclosures: ${mediumRiskPii.length} instances
- Total PII Instances: ${allPii.length}

HIGH-RISK PII EXAMPLES:
${highRiskPii.slice(0, 3).map(p => `- ${p.category}: Context - "${p.conversationContext}"`).join('\n') || 'None identified'}

Generate a comprehensive security assessment in JSON format:

{
  "reportTitle": "Your PII Safety Compass",
  "awarenessScore": "Low Risk|Medium Risk|High Risk",
  "summary": "string (comprehensive 3-4 sentence assessment of overall PII sharing behavior and security posture)",
  "detailedBreakdown": [
    {
      "category": "string (PII category)",
      "advice": "string (specific, actionable advice for this category)",
      "riskLevel": "string (low/medium/high)",
      "examples": ["string (anonymized examples of what to watch for)"]
    }
  ],
  "overallSecurityPosture": "string (assessment of general security awareness and digital hygiene)",
  "recommendedActions": ["string (3-5 specific actions to improve PII security)"],
  "disclaimer": "This assessment analyzes PII sharing patterns in conversations and provides general security guidance. It does not constitute professional cybersecurity consultation."
}

Instructions:
- Provide specific, actionable security advice
- Focus on the most relevant PII categories for this user
- Include both immediate actions and long-term security practices
- Assess overall digital security awareness

Output JSON only:`;
}

function getEnhancedDoppelgangerPrompt(topics: string[], vocab: string[], conversations: EnhancedConversationInsights[]): string {
    const avgComplexity = conversations.reduce((sum, c) => sum + c.complexityLevel, 0) / conversations.length;
    const dominantTones = Array.from(new Set(conversations.map(c => c.emotionalTone))).slice(0, 3);
    
    return `You are a social media strategist creating an authentic digital persona. Analyze the subject's interests, communication style, and personality to create a realistic social media profile.

PERSONA DEVELOPMENT DATA:
- Core Interests: ${topics.slice(0, 8).join(', ')}
- Distinctive Vocabulary: ${vocab.slice(0, 15).join(', ')}
- Communication Complexity: ${avgComplexity.toFixed(1)}/10
- Emotional Tone Range: ${dominantTones.join(', ')}

PERSONALITY INDICATORS:
${conversations.slice(0, 4).map(c => 
  `"${c.title}": ${c.emotionalTone} tone, ${c.complexityLevel}/10 complexity, patterns: ${c.communicationPatterns.slice(0, 2).join(', ')}`
).join('\n')}

Generate a comprehensive digital persona in JSON format:

{
  "reportTitle": "Your Digital Doppelgänger",
  "handle": "string (creative, authentic-sounding social media handle starting with @)",
  "bio": "string (compelling 2-3 sentence bio that captures personality and interests)",
  "topHashtags": ["string (5-6 hashtags that reflect core interests and personality)"],
  "personalityTraits": ["string (3-4 key personality traits that would show in social media presence)"],
  "likelyFollowers": ["string (2-3 types of people who would follow this account)"],
  "contentStyle": "string (description of typical content style and posting approach)",
  "onlineBehavior": "string (how this persona would interact online - commenting style, sharing habits, etc.)",
  "disclaimer": "This is an AI-generated fictional social media persona based on communication patterns and interests, created for entertainment and self-reflection."
}

Instructions:
- Create a realistic, authentic-feeling social media presence
- Base personality traits on observed communication patterns
- Make the bio engaging and true to the subject's interests
- Consider how the subject's complexity and interests would translate to social media

Output JSON only:`;
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

    console.log(`Processing ${conversations.length} conversations for enhanced analysis...`);
    const premiumReportData = await generateEnhancedPremiumInsights(conversations);

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
    console.error('Error in generate-premium-report (enhanced):', error);
    return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
    });
  }
});