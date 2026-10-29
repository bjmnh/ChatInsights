# Chat Insights

Upload your LLM conversations — from Gemini, Claude, Grok, ChatGPT, or another assistant — and get a visual read: conversation counts, plus seven report cards (FBI Report, Reality TV Persona, Digital Doppelganger, Linguistic Fingerprint, PII Safety Compass, Unfiltered Mirror, Top 5 Conversations).

Both reports are free for now. Any signed-in user can generate them. Checkout code is not in this branch.

Stack: Vite, React, TypeScript, Tailwind, shadcn/ui, Supabase (auth, Postgres, storage, edge functions), Google Gemini for the premium cards.

## Setup

1. Install and configure the frontend:

```bash
npm install
cp .env.example .env
```

Fill in `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_APP_URL`. Leave `VITE_ENABLE_GOOGLE_AUTH` and `VITE_ENABLE_APPLE_AUTH` as `false` unless those providers are enabled in Supabase Auth.

2. Apply every file in `supabase/migrations` in timestamp order. `20261020040306_premium_unlock.sql` adds billing columns and the payments table. `20261029160000_free_report_access.sql` lets a signed-in user read their own reports of any type. It does not drop those columns, the payments table, or stored reports.

3. Create a private Storage bucket named `conversation-files` and these policies:

```sql
CREATE POLICY "Users can upload own files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'conversation-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read own files" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'conversation-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'conversation-files' AND auth.uid()::text = (storage.foldername(name))[1]);
```

4. In Authentication → URL configuration, set the site URL and add redirect URLs for `/auth/confirm`, `/auth/callback`, and `/dashboard`. Email confirmation uses `/auth/confirm`. OAuth, if you turn it on, returns to `/auth/callback`.

5. Start the app:

```bash
npm run dev
```

## Reports

Set `GEMINI_API_KEY` as a Supabase edge secret. It is used only when someone generates a premium report. The basic report does not call a model.

```bash
supabase secrets set GEMINI_API_KEY=...
supabase functions deploy generate-basic-report
supabase functions deploy generate-premium-report
```

`generate-premium-report` does not check a payment flag. A signed-in user can generate premium cards. Parsing runs in the browser when a file is dropped, and again inside the report function. Uploads and reports stay until the user deletes them.

## Uploads

Exports are normalized into conversations of messages with a role, text, and a timestamp when the file has one. Both report functions read that shape. An older ChatGPT `conversations.json` still works.

| Export | Recognition |
| --- | --- |
| ChatGPT `conversations.json` | Message tree in `mapping` |
| Claude `conversations.json` | `chat_messages` |
| Gemini / Google Takeout | My Activity JSON or HTML. Takeout often has prompts only, so those reports use what you wrote. |
| Grok | `grok_conversations`, `conversation_items`, turn pairs, or a Grok sender |
| Generic JSON | `{role, content}` messages, `{messages:[...]}`, or a list of those conversations |
| JSONL | One message or conversation per line |
| Markdown or plain text | `User:` / `Assistant:` transcripts, plus Human, AI, You, Model, and similar labels |
| CSV | `role` and `content` columns, with optional timestamp, conversation id, and title |
| ZIP | An archive containing any of the above |

Copilot, Perplexity, Mistral, DeepSeek, Cursor, and similar tools work when the file is one of those shapes. After parsing, you pick which threads to store. Files must be under 200MB.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm test
```
