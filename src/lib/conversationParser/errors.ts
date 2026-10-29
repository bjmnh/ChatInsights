export const SUPPORTED_FORMAT_LINES = [
  'ChatGPT conversations.json (mapping / tree export)',
  'Claude conversations.json (chat_messages)',
  'Gemini or Google Takeout My Activity (JSON or HTML)',
  'Grok conversation exports',
  'Generic JSON: {role, content} messages, {messages:[...]}, or a list of conversations',
  'JSONL (one message or conversation per line)',
  'Markdown or plain text transcripts (User: / Assistant:)',
  'CSV with role and content columns',
  'ZIP archives containing any of the above',
];

export function unsupportedFormatMessage(detail?: string): string {
  const lead = detail
    ? `Couldn't read this file as a conversation export (${detail}).`
    : `Couldn't detect a conversation export in this file.`;
  return `${lead} Supported formats: ${SUPPORTED_FORMAT_LINES.join('; ')}.`;
}

export class ConversationParseError extends Error {
  readonly supportedFormats = SUPPORTED_FORMAT_LINES;

  constructor(message = unsupportedFormatMessage()) {
    super(message);
    this.name = 'ConversationParseError';
  }
}
