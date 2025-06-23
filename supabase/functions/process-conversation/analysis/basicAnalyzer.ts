// @deno-types="npm:@types/deno"
import { BasicAnalysisResult, RawConversation, RawMessageContainer, RawMessage } from '../_shared/types.ts';
import { getWords, getSentences } from '../_shared/utils.ts'; // Assuming utils.ts is in _shared

// Your performBasicAnalysis function, unchanged from your provided code,
// but ensure it uses the imported types and helper functions correctly.
// I've copied it here for completeness and added type annotations from your types.ts

export function performBasicAnalysis(conversations: RawConversation[]): BasicAnalysisResult {
  let totalMessages = 0;
  let userMessagesCount = 0;
  let aiMessagesCount = 0;
  let totalUserCharacters = 0;
  let totalAiCharacters = 0;
  const userWordFrequency: { [key: string]: number } = {};
  const allTimestamps: number[] = [];
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


  conversations.forEach((conv: RawConversation) => {
    if (conv.title) conversationTitles.push(conv.title);

    let currentConversationMessageCount = 0;
    const conversationCreateTime = conv.create_time ? conv.create_time * 1000 : (conv.created_at ? new Date(conv.created_at).getTime() : null);
    if (conversationCreateTime) allTimestamps.push(conversationCreateTime);

    let messagesInConversation: RawMessageContainer[] = [];
    if (conv.mapping && typeof conv.mapping === 'object') {
        messagesInConversation = Object.values(conv.mapping).filter((m: any) => m?.message);
    } else if (Array.isArray(conv.messages)) {
        messagesInConversation = conv.messages;
    }

    messagesInConversation.sort((a: RawMessageContainer, b: RawMessageContainer) => {
        const timeA = a.message?.create_time || (a as any).create_time || 0;
        const timeB = b.message?.create_time || (b as any).create_time || 0;
        return timeA - timeB;
    });


    messagesInConversation.forEach((msgContainer: RawMessageContainer) => {
      const msg = msgContainer.message;
      if (!msg || !msg.author || !msg.content || !msg.content.parts) return;

      const authorRole = msg.author.role;
      const messageTextParts = msg.content.parts
        .filter((part: any) => typeof part === 'string' && part.trim().length > 0)
        .join(" ");

      if (!messageTextParts) return;

      totalMessages++;
      currentConversationMessageCount++;
      // Use message's own timestamp if available, else conversation's, else now (less ideal)
      const messageTimestamp = msg.create_time ? msg.create_time * 1000 :
                                (msgContainer as any).create_time ? (msgContainer as any).create_time * 1000 : // if create_time is on container
                                (conversationCreateTime || Date.now());

      if (allTimestamps.indexOf(messageTimestamp) === -1) allTimestamps.push(messageTimestamp);


      const dateObj = new Date(messageTimestamp);
      activityByHour[dateObj.getHours().toString().padStart(2, '0')]++;
      activityByDay[days[dateObj.getDay()]]++;

      if (authorRole === 'user') {
        userMessagesCount++;
        totalUserCharacters += messageTextParts.length;
        const words = getWords(messageTextParts); // Uses imported helper
        words.forEach(word => userWordFrequency[word] = (userWordFrequency[word] || 0) + 1);

        questionMarksUsedByUser += (messageTextParts.match(/\?/g) || []).length;
        exclamationMarksUsedByUser += (messageTextParts.match(/!/g) || []).length;

        const sentences = getSentences(messageTextParts); // Uses imported helper
        totalUserSentences += sentences.length;
        sentences.forEach(sentence => totalUserWordsInSentences += getWords(sentence).length);

      } else if (authorRole === 'assistant' || authorRole === 'tool' || authorRole === 'system') {
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
  let mostActiveHour: string | null = null;
  if (activityByHourFinal.some(h => h.messageCount > 0)) {
      mostActiveHour = activityByHourFinal.sort((a,b) => b.messageCount - a.messageCount)[0].hour;
  }


  const activityByDayFinal = Object.entries(activityByDay).map(([day, messageCount]) => ({ day, messageCount }));
  let mostActiveDay: string | null = null;
  if (activityByDayFinal.some(d => d.messageCount > 0)) {
      mostActiveDay = activityByDayFinal.sort((a,b) => b.messageCount - a.messageCount)[0].day;
  }

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
    userVocabularySizeEstimate: Object.keys(userWordFrequency).length,
    averageWordsPerUserSentence: totalUserSentences > 0 ? parseFloat((totalUserWordsInSentences / totalUserSentences).toFixed(1)) : 0,
    userToAiMessageRatio: aiMessagesCount > 0 ? parseFloat((userMessagesCount / aiMessagesCount).toFixed(2)) : userMessagesCount > 0 ? Infinity : 0,
    averageMessagesPerConversation: conversations.length > 0 ? parseFloat((totalMessages / conversations.length).toFixed(1)) : 0,
    longestConversationByMessages: longestConversation,
    shortestConversationByMessages: shortestConversationMessageCount === Infinity ? null : shortestConversation,
    activityByHourOfDay: activityByHourFinal,
    activityByDayOfWeek: activityByDayFinal,
    mostActiveHour,
    mostActiveDay,
    conversationTitles: conversationTitles.slice(0, 50),
    questionMarksUsedByUser,
    exclamationMarksUsedByUser,
  };
}