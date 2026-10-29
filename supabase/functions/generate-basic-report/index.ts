// @deno-types="npm:@types/deno"
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { parseConversationExport, type NormalizedConversation } from '../../../src/lib/conversationParser/index.ts';

// --- Shared Types (for clarity within this function) ---
interface WordFrequency {
  word: string;
  count: number;
}

// The structure of the final report data
interface BasicAnalysisResult {
  totalConversations: number;
  totalMessages: number;
  userMessagesCount: number;
  aiMessagesCount: number;
  totalUserCharacters: number;
  averageUserMessageLength: number;
  firstMessageDate: string | null;
  lastMessageDate: string | null;
  conversationDaysSpan: number | null;
  mostUsedUserWords: WordFrequency[];
  userVocabularySizeEstimate: number;
  averageWordsPerUserSentence: number;
  userToAiMessageRatio: number;
  averageMessagesPerConversation: number;
  longestConversationByMessages: { title?: string; count: number } | null;
  activityByHourOfDay: Array<{ hour: string; messageCount: number }>;
  activityByDayOfWeek: Array<{ day: string; messageCount: number }>;
  mostActiveHour: string | null;
  mostActiveDay: string | null;
  questionMarksUsedByUser: number;
  exclamationMarksUsedByUser: number;
  generatedAt: string;
}

// --- Text Processing Utilities ---
const COMMON_STOP_WORDS = new Set([
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her',
  'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who', 'this', 'that',
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do',
  'does', 'did', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as',
  'of', 'at', 'by', 'for', 'with', 'about', 'to', 'from', 'in', 'out', 'on',
  'so', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'chatgpt'
]);

function getWords(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !COMMON_STOP_WORDS.has(word) && !/^\d+$/.test(word));
}

function getSentences(text: string): string[] {
    if (!text || typeof text !== 'string') return [];
    return text.split(/(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|!)\s+/).filter(s => s.trim().length > 0);
}

// --- Core Analysis Function ---
function messageTime(conversation: NormalizedConversation, timestamp: string | null): number {
  const parsed = timestamp ? Date.parse(timestamp) : NaN;
  if (!Number.isNaN(parsed)) return parsed;
  const created = conversation.createdAt ? Date.parse(conversation.createdAt) : NaN;
  return Number.isNaN(created) ? Date.now() : created;
}

function performBasicAnalysis(conversations: NormalizedConversation[]): BasicAnalysisResult {
  let totalMessages = 0, userMessagesCount = 0, aiMessagesCount = 0, totalUserCharacters = 0;
  const userWordFrequency: { [key: string]: number } = {};
  const allTimestamps: number[] = [];
  let questionMarksUsedByUser = 0, exclamationMarksUsedByUser = 0;
  let totalUserSentences = 0, totalUserWordsInSentences = 0;
  const activityByHour: { [hour: string]: number } = {};
  const activityByDay: { [day: string]: number } = {};
  for (let i = 0; i < 24; i++) activityByHour[i.toString().padStart(2, '0')] = 0;
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  days.forEach(day => activityByDay[day] = 0);
  let longestConversation: { title?: string; count: number } | null = null;

  conversations.forEach((conv) => {
    let currentConversationMessageCount = 0;

    conv.messages.forEach((msg) => {
      const messageText = msg.text;
      if (!messageText) return;

      totalMessages++;
      currentConversationMessageCount++;
      const messageTimestamp = messageTime(conv, msg.timestamp);
      allTimestamps.push(messageTimestamp);
      const dateObj = new Date(messageTimestamp);
      activityByHour[dateObj.getHours().toString().padStart(2, '0')]++;
      activityByDay[days[dateObj.getDay()]]++;

      if (msg.role === 'user') {
        userMessagesCount++;
        totalUserCharacters += messageText.length;
        const words = getWords(messageText);
        words.forEach(word => userWordFrequency[word] = (userWordFrequency[word] || 0) + 1);
        questionMarksUsedByUser += (messageText.match(/\?/g) || []).length;
        exclamationMarksUsedByUser += (messageText.match(/!/g) || []).length;
        const sentences = getSentences(messageText);
        totalUserSentences += sentences.length;
        sentences.forEach(sentence => totalUserWordsInSentences += getWords(sentence).length);
      } else {
        aiMessagesCount++;
      }
    });

    if (!longestConversation || currentConversationMessageCount > longestConversation.count) {
        longestConversation = { title: conv.title, count: currentConversationMessageCount };
    }
  });

  const sortedUserWords = Object.entries(userWordFrequency).sort(([,a], [,b]) => b-a).slice(0, 15).map(([word, count]) => ({word, count}));
  const firstMessageDate = allTimestamps.length > 0 ? new Date(Math.min(...allTimestamps)).toISOString() : null;
  const lastMessageDate = allTimestamps.length > 0 ? new Date(Math.max(...allTimestamps)).toISOString() : null;
  const conversationDaysSpan = firstMessageDate && lastMessageDate ? Math.ceil((new Date(lastMessageDate).getTime() - new Date(firstMessageDate).getTime()) / (1000*60*60*24)) : null;
  const activityByHourFinal = Object.entries(activityByHour).map(([hour, messageCount]) => ({ hour: `${hour}:00`, messageCount }));
  const mostActiveHourEntry = Object.entries(activityByHour).sort(([,a], [,b]) => b - a)[0];
  const mostActiveHour = mostActiveHourEntry && mostActiveHourEntry[1] > 0 ? `${mostActiveHourEntry[0]}:00` : null;
  const activityByDayFinal = Object.entries(activityByDay).map(([day, messageCount]) => ({ day, messageCount }));
  const mostActiveDayEntry = Object.entries(activityByDay).sort(([,a], [,b]) => b-a)[0];
  const mostActiveDay = mostActiveDayEntry && mostActiveDayEntry[1] > 0 ? mostActiveDayEntry[0] : null;

  return {
    totalConversations: conversations.length,
    totalMessages, userMessagesCount, aiMessagesCount, totalUserCharacters,
    averageUserMessageLength: userMessagesCount > 0 ? Math.round(totalUserCharacters / userMessagesCount) : 0,
    firstMessageDate, lastMessageDate, conversationDaysSpan,
    mostUsedUserWords: sortedUserWords,
    userVocabularySizeEstimate: Object.keys(userWordFrequency).length,
    averageWordsPerUserSentence: totalUserSentences > 0 ? parseFloat((totalUserWordsInSentences / totalUserSentences).toFixed(1)) : 0,
    userToAiMessageRatio: aiMessagesCount > 0 ? parseFloat((userMessagesCount / aiMessagesCount).toFixed(2)) : userMessagesCount > 0 ? Infinity : 0,
    averageMessagesPerConversation: conversations.length > 0 ? parseFloat((totalMessages / conversations.length).toFixed(1)) : 0,
    longestConversationByMessages: longestConversation,
    activityByHourOfDay: activityByHourFinal, activityByDayOfWeek: activityByDayFinal,
    mostActiveHour, mostActiveDay,
    questionMarksUsedByUser, exclamationMarksUsedByUser,
    generatedAt: new Date().toISOString()
  };
}


// --- Main Server Logic ---
serve(async (req) => {
  // Use cors.ts if you have it, otherwise this is fine for self-contained function
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization required');
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) throw new Error('Invalid token');

    const { fileId } = await req.json();
    if (!fileId) throw new Error('File ID required');

    const { data: fileData, error: fileError } = await supabase.from('uploaded_files').select('file_path, filename').eq('id', fileId).eq('user_id', user.id).single();
    if (fileError || !fileData) throw new Error('File not found or access denied');

    // Download the export and normalize ChatGPT plus every other supported format.
    const { data: fileBlob, error: downloadError } = await supabase.storage.from('conversation-files').download(fileData.file_path);
    if (downloadError) throw new Error(`Failed to download conversation file: ${downloadError.message}`);
    const filename = fileData.filename || fileData.file_path.split('/').pop() || 'export';
    const parsed = await parseConversationExport(filename, new Uint8Array(await fileBlob.arrayBuffer()));
    const conversations = parsed.conversations;

    // --- Generate REAL basic report ---
    const basicReportData = performBasicAnalysis(conversations);

    // Save report to database
    const { error: reportError } = await supabase.from('reports').insert({
      user_id: user.id,
      file_id: fileId,
      report_type: 'basic',
      report_data: basicReportData
    });
    if (reportError) throw new Error(`Failed to save report: ${reportError.message}`);

    // Update file to mark it has basic report
    const { error: updateError } = await supabase.from('uploaded_files').update({ has_basic_report: true }).eq('id', fileId);
    if (updateError) console.warn(`Failed to update file flag for ${fileId}: ${updateError.message}`);

    return new Response(JSON.stringify({ success: true, report: basicReportData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-basic-report:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});