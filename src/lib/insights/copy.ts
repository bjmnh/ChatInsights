export const EXPORT_GUIDES = [
  {
    name: 'ChatGPT',
    steps: 'In ChatGPT: Settings, Data controls, Export data. OpenAI emails a zip when it is ready.',
    href: 'https://help.openai.com/en/articles/7260999-how-do-i-export-my-chatgpt-history-and-data',
    need: 'The conversations export inside the zip.',
  },
  {
    name: 'Claude',
    steps: 'On claude.ai or Claude Desktop: Settings, Privacy, Export data. Anthropic emails a download link. The button has moved before, so use their help page if you do not see it.',
    href: 'https://support.claude.com/en/articles/9450526-export-your-claude-data',
    need: 'The official export archive.',
  },
  {
    name: 'Gemini',
    steps: 'Google Takeout, with Gemini Apps selected.',
    href: 'https://takeout.google.com/',
    need: 'The Gemini export in the Takeout archive. Takeout often has prompts only.',
  },
  {
    name: 'Grok',
    steps: 'On grok.com: Settings, Data Controls, then the export or download control. xAI’s FAQ says you can download your data from there. The account page is accounts.x.ai/data.',
    href: 'https://x.ai/legal/faq',
    need: 'The export file or zip. Chats you had inside X may be in X’s own archive instead.',
  },
] as const;

export const ARCHIVE_NOTICE = 'A copy of the file you upload is stored on Chat Insights’ servers (Supabase) for security review. Parsing still runs in your browser. The sample is not uploaded. Questions: bhanson8@asu.edu.';

export const ARCHIVE_ACK = 'I understand a copy of this file will be stored on Chat Insights’ servers for security review.';

export const ACCOUNT_KEY_HELP = 'If you check this, the key is stored encrypted on the server and tied to your account. The page shows only the last four characters. Unchecking this does not delete a saved key. Remember on this device is separate and stays in this browser.';

export const CONSENT_POINTS = [
  'I am 18 or older.',
  'I am using my own API key. It is sent to Chat Insights for storage only if I am signed in and I check Save key to my account, and then it is encrypted. If I turn on Remember on this device, it is also stored only on this browser, encrypted.',
  'Packed text from my conversations, at the depth I chose, will be sent to the provider I selected. Emails, phone numbers, and card-like numbers are masked first. Names and other personal details are not.',
  'Chat Insights does not see that text on the default path. If the provider blocks browser calls, a short notice will say the batch is passing through Chat Insights’ server in memory only, to an allowlisted host, and is not stored.',
  'The provider’s data-use terms apply to what I send. The note on this screen is a summary, with a link, not a guarantee from Chat Insights.',
  'If I save the case file to an account, it may include health, money, and relationship details. Deleting it is not self-serve yet.',
];
