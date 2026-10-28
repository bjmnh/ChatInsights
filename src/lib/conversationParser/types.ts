export type MessageRole = 'user' | 'assistant' | 'system' | 'tool' | 'unknown';

export type ConversationSourceFormat =
  | 'normalized'
  | 'chatgpt'
  | 'claude'
  | 'gemini'
  | 'grok'
  | 'generic-json'
  | 'jsonl'
  | 'markdown'
  | 'csv';

export interface NormalizedMessage {
  role: MessageRole;
  text: string;
  timestamp: string | null;
}

export interface NormalizedConversation {
  id: string;
  title: string;
  createdAt: string | null;
  messages: NormalizedMessage[];
  sourceFormat: ConversationSourceFormat;
}

export interface ParseResult {
  conversations: NormalizedConversation[];
  format: ConversationSourceFormat | 'mixed';
  formatsFound: ConversationSourceFormat[];
  warnings: string[];
}

export interface DraftMessage {
  role: MessageRole;
  text: string;
  timestamp?: string | null;
}
