// @deno-types="npm:@types/deno"

export const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('FRONTEND_URL') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const COMMON_STOP_WORDS = new Set([
  // Your existing list...
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
  'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now',
  // Consider adding AI-specific stop words if they pollute results:
  'chatgpt', 'openai', 'llm', 'ai', 'model', 'language model', 'user', 'assistant'
]);

export function getWords(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]|(?<=\w)-(?=\w)|(?<=\s)-(?=\w)|(?<=\w)-(?=\s)/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !COMMON_STOP_WORDS.has(word) && !/^\d+$/.test(word));
}

export function getSentences(text: string): string[] {
    if (!text || typeof text !== 'string') return [];
    return text.split(/(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|!)\s+/).filter(s => s.trim().length > 0);
}

// Helper to extract clean text from a conversation's messages
// This is crucial for consistent input to LLMs
export function extractUserConversationText(conversation: import('./types.ts').RawConversation): string {
  let userTexts: string[] = [];
  let messagesInConversation: import('./types.ts').RawMessageContainer[] = [];

  if (conversation.mapping && typeof conversation.mapping === 'object') {
      messagesInConversation = Object.values(conversation.mapping).filter((m: any) => m?.message);
  } else if (Array.isArray(conversation.messages)) {
      messagesInConversation = conversation.messages;
  }

  // Sort messages by create_time if available
  messagesInConversation.sort((a: any, b: any) => {
      const timeA = a.message?.create_time || a.create_time || 0;
      const timeB = b.message?.create_time || b.create_time || 0;
      return timeA - timeB;
  });

  messagesInConversation.forEach(msgContainer => {
    const msg = msgContainer.message;
    if (msg?.author?.role === 'user' && msg.content?.parts) {
      const textPart = msg.content.parts
        .filter(part => typeof part === 'string' && part.trim().length > 0)
        .join(" ");
      if (textPart) {
        userTexts.push(textPart);
      }
    }
  });
  return userTexts.join("\n\n---\n\n"); // Separate user turns clearly for the LLM
}

export function extractFullConversationText(conversation: import('./types.ts').RawConversation, includeSystem = false): string {
  let fullTexts: string[] = [];
  let messagesInConversation: import('./types.ts').RawMessageContainer[] = [];

  if (conversation.mapping && typeof conversation.mapping === 'object') {
      messagesInConversation = Object.values(conversation.mapping).filter((m: any) => m?.message);
  } else if (Array.isArray(conversation.messages)) {
      messagesInConversation = conversation.messages;
  }

  messagesInConversation.sort((a: any, b: any) => {
      const timeA = a.message?.create_time || a.create_time || 0;
      const timeB = b.message?.create_time || b.create_time || 0;
      return timeA - timeB;
  });

  messagesInConversation.forEach(msgContainer => {
    const msg = msgContainer.message;
    if (msg?.author?.role && msg.content?.parts) {
      const role = msg.author.role;
      if (role === 'user' || role === 'assistant' || (includeSystem && role === 'system')) {
        const textPart = msg.content.parts
          .filter(part => typeof part === 'string' && part.trim().length > 0)
          .join(" ");
        if (textPart) {
          fullTexts.push(`${role.toUpperCase()}: ${textPart}`);
        }
      }
    }
  });
  return fullTexts.join("\n\n");
}