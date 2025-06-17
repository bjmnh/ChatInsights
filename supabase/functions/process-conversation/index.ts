// @deno-types="npm:@types/deno"
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"; // Updated std version
import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2';

// --- Shared Types (Consider moving to _shared/types.ts) ---
interface WordFrequency {
  word: string;
  count: number;
}

interface ActivityPattern {
  hour: string; // "00:00", "01:00", etc.
  dayOfWeek: string; // "Sunday", "Monday", etc.
  messageCount: number;
  userMessageCount: number;
  aiMessageCount: number;
}

interface TopicStat {
  name: string;
  messageCount: number; // How many messages fall under this topic (if we can infer)
  conversationCount: number; // How many conversations have this topic
  userInitiated: number; // How often user brought up this topic
  color?: string; // For UI
}

interface CommunicationMetric {
  metric: string;
  value: string | number;
  description: string;
}

// Result of the non-LLM basic analysis
interface BasicAnalysisResult {
  // Overall Stats
  totalConversations: number;
  totalMessages: number; // All messages (user + AI)
  userMessagesCount: number;
  aiMessagesCount: number;
  totalUserCharacters: number;
  totalAiCharacters: number;
  averageUserMessageLength: number;
  averageAiMessageLength: number;
  firstMessageDate: string | null;
  lastMessageDate: string | null;
  conversationDaysSpan: number | null;

  // Word & Language Analysis
  mostUsedUserWords: WordFrequency[]; // Top words from user
  userVocabularySizeEstimate: number; // Simple estimate based on unique words
  averageWordsPerUserSentence: number; // Requires sentence splitting

  // Interaction Patterns
  userToAiMessageRatio: number;
  averageMessagesPerConversation: number;
  longestConversationByMessages: { id?: string, title?: string, count: number } | null;
  shortestConversationByMessages: { id?: string, title?: string, count: number } | null;

  // Time-based Activity
  activityByHourOfDay: Array<{ hour: string; messageCount: number }>; // For charts
  activityByDayOfWeek: Array<{ day: string; messageCount: number }>; // For charts
  mostActiveHour: string | null;
  mostActiveDay: string | null;

  // Topics (derived from titles or simple keyword spotting)
  conversationTitles: string[]; // Raw titles
  // simpleTopicDistribution: TopicStat[]; // (More advanced, might need some LLM-lite or heuristic)

  // Potentially Interesting Simple Metrics
  questionMarksUsedByUser: number;
  exclamationMarksUsedByUser: number;
  averageInterMessageDelaySeconds?: number; // If timestamps are per message
}

// Placeholder for LLM-based advanced insights
interface AdvancedAnalysisResult {
  // These would be populated by LLM calls in a separate function
  digitalPersonaProfile?: Record<string, any>;
  behavioralTendencies?: Record<string, any>;
  linguisticFingerprint?: Record<string, any>;
  piiExposureAdvisory?: Record<string, any>;
  topRevealingConversations?: Array<Record<string, any>>;
  // ... other LLM generated insights
}

interface Job {
  id: string;
  user_id: string;
  status: string;
  progress: number;
  file_path: string; // Added, as it's used
  analysis_type?: string; // Optional if you default
  premium_features_enabled?: boolean; // Optional
  total_conversations?: number; // Added
  processed_conversations?: number; // Added
}

interface UserReport {
  user_id: string;
  job_id: string;
  free_insights: BasicAnalysisResult; // Renamed for clarity
  paid_insights: AdvancedAnalysisResult | null;
  analysis_type: string;
}

// --- CORS Headers (Consider moving to _shared/cors.ts) ---
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('FRONTEND_URL') || '*', // Use env var for prod
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // This function is POST only
};

// --- Helper Functions (Consider moving to a utility file) ---

const COMMON_STOP_WORDS = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
  'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
  'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are',
  'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
  'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until',
  'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
  'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here',
  'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'chatgpt'
  // Add more domain-specific stop words if needed
]);

function getWords(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]|(?<=\w)-(?=\w)|(?<=\s)-(?=\w)|(?<=\w)-(?=\s)/g, ' ') // Keep apostrophes and hyphens within words
    .split(/\s+/)
    .filter(word => word.length > 2 && !COMMON_STOP_WORDS.has(word) && !/^\d+$/.test(word)); // Min length 3, not a stop word, not purely numeric
}

function getSentences(text: string): string[] {
    if (!text || typeof text !== 'string') return [];
    // Basic sentence splitter, can be improved for edge cases (e.g. Mr. Dr. abbreviations)
    return text.split(/(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|!)\s+/).filter(s => s.trim().length > 0);
}


// --- Main Server Logic ---
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Use service role for backend operations
  );

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token or user not found' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const requestBody = await req.json();
    const jobId = requestBody.jobId;
    // 'basic' or 'premium', defaults to 'basic' if not provided by the worker/coordinator
    const analysisType = requestBody.analysisType || 'basic';


    if (!jobId) {
      return new Response(JSON.stringify({ error: 'Job ID is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: job, error: jobError } = await supabaseClient
      .from<Job>('jobs')
      .select('id, user_id, file_path, status, premium_features_enabled') // Select only needed fields
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError) throw new Error(`Job query error: ${jobError.message}`);
    if (!job) throw new Error('Job not found or access denied');
    if (job.status === 'completed') {
        return new Response(JSON.stringify({ success: true, message: 'Analysis already completed for this job.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!job.file_path) throw new Error('Job record missing file_path');

    // Premium check
    if (analysisType === 'premium') {
      // Assuming you have a way to check premium status, e.g., a 'premium_status' column on your 'users' or 'profiles' table
      const { data: userProfile, error: profileError } = await supabaseClient
        .from('profiles') // Or your user profiles table
        .select('premium_status')
        .eq('id', user.id)
        .single();

      if (profileError || !userProfile || !userProfile.premium_status) {
        // Update job to failed if premium analysis requested without access
        await supabaseClient.from<Job>('jobs').update({ status: 'failed', progress: 0, error_message: 'Premium access required' }).eq('id', jobId);
        return new Response(JSON.stringify({ error: 'Premium access required for advanced analysis' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      // If job object doesn't reflect premium, update it
      if (!job.premium_features_enabled) {
        await supabaseClient.from<Job>('jobs').update({ premium_features_enabled: true }).eq('id', jobId);
      }
    }


    await supabaseClient.from<Job>('jobs').update({ status: 'processing', progress: 10, analysis_type: analysisType }).eq('id', jobId);

    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('conversation-files') // Ensure this is your correct bucket name
      .download(job.file_path);

    if (downloadError) throw new Error(`Failed to download conversation file: ${downloadError.message}`);
    if (!fileData) throw new Error('Conversation file data is null');

    await supabaseClient.from<Job>('jobs').update({ progress: 30 }).eq('id', jobId);

    const fileText = await fileData.text();
    let parsedConversationData: any[]; // Expecting an array of conversations
    try {
        parsedConversationData = JSON.parse(fileText);
        if (!Array.isArray(parsedConversationData)) {
            // Attempt to find the array if nested (common in OpenAI exports)
            let foundArray = false;
            for (const key in parsedConversationData) {
                if (Array.isArray((parsedConversationData as any)[key])) {
                    parsedConversationData = (parsedConversationData as any)[key];
                    foundArray = true;
                    break;
                }
            }
            if (!foundArray && typeof parsedConversationData === 'object' && parsedConversationData !== null) {
                 // If it's a single conversation object, wrap it in an array
                if (parsedConversationData.hasOwnProperty('id') && parsedConversationData.hasOwnProperty('mapping')) {
                     parsedConversationData = [parsedConversationData];
                } else {
                    throw new Error('Parsed data is not an array and no conversation array found within the object.');
                }
            } else if (!foundArray) {
                 throw new Error('Parsed data is not an array and no conversation array found within the object.');
            }
        }
    } catch (parseError) {
        await supabaseClient.from<Job>('jobs').update({ status: 'failed', progress: 0, error_message: `JSON parsing error: ${parseError.message}` }).eq('id', jobId);
        throw new Error(`JSON parsing error: ${parseError.message}`);
    }


    await supabaseClient.from<Job>('jobs').update({ progress: 50 }).eq('id', jobId);

    // --- Perform Analysis ---
    const basicInsights = performBasicAnalysis(parsedConversationData);

    let advancedInsights: AdvancedAnalysisResult | null = null;
    if (analysisType === 'premium' && job.premium_features_enabled) {
      // Placeholder: In a real scenario, this would call an LLM
      // advancedInsights = await performAdvancedAnalysis(parsedConversationData, basicInsights, supabaseClient);
      advancedInsights = generateMockPremiumInsights(basicInsights); // Using your mock for now
    }

    await supabaseClient.from<Job>('jobs').update({
        progress: 80,
        total_conversations: basicInsights.totalConversations,
        // processed_conversations might be updated incrementally by workers in a multi-stage process
    }).eq('id', jobId);


    const { error: reportError } = await supabaseClient
      .from<UserReport>('user_reports')
      .insert({
        user_id: user.id,
        job_id: jobId,
        free_insights: basicInsights,
        paid_insights: advancedInsights,
        analysis_type: analysisType,
      });

    if (reportError) {
        await supabaseClient.from<Job>('jobs').update({ status: 'failed', progress: 80, error_message: `Failed to save report: ${reportError.message}` }).eq('id', jobId);
        throw new Error(`Failed to save analysis report: ${reportError.message}`);
    }

    await supabaseClient.from<Job>('jobs').update({ status: 'completed', progress: 100 }).eq('id', jobId);

    // Delete the original file for privacy
    await supabaseClient.storage.from('conversation-files').remove([job.file_path]);

    return new Response(JSON.stringify({
      success: true,
      message: `${analysisType} analysis completed successfully`,
      report: { free_insights: basicInsights, paid_insights: advancedInsights } // Return the full report structure
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    console.error('Processing error:', error);
    // Attempt to update job status to failed if jobId is available
    // This part needs careful handling to ensure jobId is in scope or passed correctly
    // For simplicity, we'll assume it might not always be available here if error is early
    const jobIdFromBody = (await req.json().catch(() => ({}))).jobId; // Try to get jobId again if error was early
    if (jobIdFromBody) {
        await supabaseClient.from<Job>('jobs').update({ status: 'failed', progress: 0, error_message: error.message }).eq('id', jobIdFromBody).catch(e => console.error("Failed to update job to failed status:", e));
    }

    return new Response(JSON.stringify({ error: error.message || 'Processing failed' }), {
      status: error.message.includes('Premium access required') ? 403 : (error.message.includes('Job not found') ? 404 : 500),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});


// --- Analysis Functions ---

function performBasicAnalysis(conversations: any[]): BasicAnalysisResult {
  let totalMessages = 0;
  let userMessagesCount = 0;
  let aiMessagesCount = 0;
  let totalUserCharacters = 0;
  let totalAiCharacters = 0;
  const userWordFrequency: { [key: string]: number } = {};
  const allTimestamps: number[] = []; // Store as epoch ms for easier min/max
  const conversationTitles: string[] = [];

  let questionMarksUsedByUser = 0;
  let exclamationMarksUsedByUser = 0;
  let totalUserSentences = 0;
  let totalUserWordsInSentences = 0;

  const activityByHour: { [hour: string]: number } = {};
  const activityByDay: { [day: string]: number } = {};
  for (let i = 0; i < 24; i++) activityByHour[i.toString().padStart(2, '0')] = 0;
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  days.forEach(day => activityByDay[day] = 0);

  let longestConversationMessageCount = 0;
  let longestConversation: { id?: string, title?: string, count: number } | null = null;
  let shortestConversationMessageCount = Infinity;
  let shortestConversation: { id?: string, title?: string, count: number } | null = null;


  conversations.forEach((conv: any) => {
    if (conv.title) conversationTitles.push(conv.title);

    let currentConversationMessageCount = 0;
    const conversationCreateTime = conv.create_time ? conv.create_time * 1000 : (conv.created_at ? new Date(conv.created_at).getTime() : null);
    if (conversationCreateTime) allTimestamps.push(conversationCreateTime);

    // Standard OpenAI export structure often has 'mapping'
    // where keys are message IDs and values are message objects.
    // If 'mapping' doesn't exist, try to find messages in 'messages' array or similar.
    let messagesInConversation: any[] = [];
    if (conv.mapping && typeof conv.mapping === 'object') {
        messagesInConversation = Object.values(conv.mapping).filter((m: any) => m?.message);
    } else if (Array.isArray(conv.messages)) {
        messagesInConversation = conv.messages;
    }
    // Sort messages by create_time if available within message object
    messagesInConversation.sort((a: any, b: any) => {
        const timeA = a.message?.create_time || a.create_time || 0;
        const timeB = b.message?.create_time || b.create_time || 0;
        return timeA - timeB;
    });


    messagesInConversation.forEach((msgContainer: any) => {
      const msg = msgContainer.message; // Message data is often nested here
      if (!msg || !msg.author || !msg.content || !msg.content.parts) return;

      const authorRole = msg.author.role;
      const messageTextParts = msg.content.parts
        .filter((part: any) => typeof part === 'string' && part.trim().length > 0)
        .join(" "); // Join parts into a single string for analysis

      if (!messageTextParts) return;

      totalMessages++;
      currentConversationMessageCount++;
      const messageTimestamp = msg.create_time ? msg.create_time * 1000 : (conversationCreateTime || Date.now()); // Fallback if no specific msg timestamp
      if (!allTimestamps.includes(messageTimestamp)) allTimestamps.push(messageTimestamp); // Add individual message timestamps too

      const dateObj = new Date(messageTimestamp);
      activityByHour[dateObj.getHours().toString().padStart(2, '0')]++;
      activityByDay[days[dateObj.getDay()]]++;

      if (authorRole === 'user') {
        userMessagesCount++;
        totalUserCharacters += messageTextParts.length;
        const words = getWords(messageTextParts);
        words.forEach(word => userWordFrequency[word] = (userWordFrequency[word] || 0) + 1);

        questionMarksUsedByUser += (messageTextParts.match(/\?/g) || []).length;
        exclamationMarksUsedByUser += (messageTextParts.match(/!/g) || []).length;

        const sentences = getSentences(messageTextParts);
        totalUserSentences += sentences.length;
        sentences.forEach(sentence => totalUserWordsInSentences += getWords(sentence).length);

      } else if (authorRole === 'assistant' || authorRole === 'tool' || authorRole === 'system') { // Consider tool/system as AI
        aiMessagesCount++;
        totalAiCharacters += messageTextParts.length;
      }
    });

    if (currentConversationMessageCount > longestConversationMessageCount) {
        longestConversationMessageCount = currentConversationMessageCount;
        longestConversation = { id: conv.id, title: conv.title, count: currentConversationMessageCount };
    }
    if (currentConversationMessageCount > 0 && currentConversationMessageCount < shortestConversationMessageCount) {
        shortestConversationMessageCount = currentConversationMessageCount;
        shortestConversation = { id: conv.id, title: conv.title, count: currentConversationMessageCount };
    }
  });


  const sortedUserWords = Object.entries(userWordFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));

  const firstMessageDate = allTimestamps.length > 0 ? new Date(Math.min(...allTimestamps)).toISOString() : null;
  const lastMessageDate = allTimestamps.length > 0 ? new Date(Math.max(...allTimestamps)).toISOString() : null;
  const conversationDaysSpan = firstMessageDate && lastMessageDate ?
    Math.ceil((new Date(lastMessageDate).getTime() - new Date(firstMessageDate).getTime()) / (1000 * 60 * 60 * 24)) : null;

  const activityByHourFinal = Object.entries(activityByHour).map(([hour, messageCount]) => ({ hour: `${hour}:00`, messageCount }));
  const mostActiveHourEntry = Object.entries(activityByHour).sort(([,a], [,b]) => b - a)[0];
  const mostActiveHour = mostActiveHourEntry && mostActiveHourEntry[1] > 0 ? `${mostActiveHourEntry[0]}:00` : null;


  const activityByDayFinal = Object.entries(activityByDay).map(([day, messageCount]) => ({ day, messageCount }));
  const mostActiveDayEntry = Object.entries(activityByDay).sort(([,a], [,b]) => b-a)[0];
  const mostActiveDay = mostActiveDayEntry && mostActiveDayEntry[1] > 0 ? mostActiveDayEntry[0] : null;


  return {
    totalConversations: conversations.length,
    totalMessages,
    userMessagesCount,
    aiMessagesCount,
    totalUserCharacters,
    totalAiCharacters,
    averageUserMessageLength: userMessagesCount > 0 ? Math.round(totalUserCharacters / userMessagesCount) : 0,
    averageAiMessageLength: aiMessagesCount > 0 ? Math.round(totalAiCharacters / aiMessagesCount) : 0,
    firstMessageDate,
    lastMessageDate,
    conversationDaysSpan,
    mostUsedUserWords: sortedUserWords,
    userVocabularySizeEstimate: Object.keys(userWordFrequency).length, // Very rough estimate
    averageWordsPerUserSentence: totalUserSentences > 0 ? parseFloat((totalUserWordsInSentences / totalUserSentences).toFixed(1)) : 0,
    userToAiMessageRatio: aiMessagesCount > 0 ? parseFloat((userMessagesCount / aiMessagesCount).toFixed(2)) : userMessagesCount > 0 ? Infinity : 0,
    averageMessagesPerConversation: conversations.length > 0 ? parseFloat((totalMessages / conversations.length).toFixed(1)) : 0,
    longestConversationByMessages: longestConversation,
    shortestConversationByMessages: shortestConversationMessageCount === Infinity ? null : shortestConversation,
    activityByHourOfDay: activityByHourFinal,
    activityByDayOfWeek: activityByDayFinal,
    mostActiveHour,
    mostActiveDay,
    conversationTitles: conversationTitles.slice(0, 50), // Limit for display
    questionMarksUsedByUser,
    exclamationMarksUsedByUser,
  };
}

// Mock function for premium insights - replace with actual LLM calls
function generateMockPremiumInsights(basicInsights: BasicAnalysisResult): AdvancedAnalysisResult {
  // This is where you'd use a powerful LLM with basicInsights and potentially snippets of raw data
  // For now, it's just a placeholder based on your original mock
  return {
    digitalPersonaProfile: {
      inferredPersonalityTraits: "Appears curious and detail-oriented based on question frequency and message length.",
      communicationStyleSummary: `Tends towards ${basicInsights.averageUserMessageLength > 100 ? 'detailed' : 'concise'} responses. Ratio of user to AI messages is ${basicInsights.userToAiMessageRatio.toFixed(1)}:1.`,
      dominantInterests: basicInsights.mostUsedUserWords.slice(0,3).map(w => w.word).join(', ') || 'General Exploration',
    },
    behavioralTendencies: {
      informationSeekingLevel: basicInsights.questionMarksUsedByUser > basicInsights.userMessagesCount * 0.1 ? "High" : "Moderate",
      expressivenessLevel: basicInsights.exclamationMarksUsedByUser > basicInsights.userMessagesCount * 0.05 ? "Noticeable" : "Subtle",
    },
    // ... more advanced insights generated by an LLM using basicInsights as context
  };
}

// TODO: Create performAdvancedAnalysis function using LLMs
// async function performAdvancedAnalysis(
//   conversations: any[],
//   basicInsights: BasicAnalysisResult,
//   supabaseClient: SupabaseClient // For LLM calls or further data access
// ): Promise<AdvancedAnalysisResult> {
//   // 1. Select key conversations or data points based on basicInsights
//   // 2. Prepare prompts for your powerful LLM using _shared/prompts.ts
//   // 3. Call LLM via _shared/llmService.ts
//   // 4. Structure the LLM response into AdvancedAnalysisResult
//   console.log("Performing advanced analysis with LLM (not implemented yet)...");
//   return generateMockPremiumInsights(basicInsights); // Placeholder
// }