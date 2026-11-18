# Chat Insights

Read an export of your AI chats (ChatGPT, Claude, Gemini, Grok, and the other shapes the parser accepts) and turn it into a case file. You bring your own API key and pick how deep the read goes. Calls go from the browser to the provider. The site does not pay the API bill.

Stack: Vite, React, TypeScript, Tailwind, shadcn/ui, Supabase (optional account save), Netlify (hosting and a CORS pass-through).

## Environment

Copy `.env.example` to `.env`.

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Vite | Supabase project URL. Auth and saved case files. |
| `VITE_SUPABASE_ANON_KEY` | Vite | Supabase anon key. |
| `VITE_APP_URL` | Vite | Site URL used by auth redirects. |
| `VITE_DONATION_URL` | Vite | Optional tip-jar URL. Hidden when unset. |
| `VITE_PROXY_ALLOWLIST` | Vite | Extra pass-through hosts, comma-separated. Must match the Netlify variable. |
| `PROVIDER_PROXY_ALLOWLIST` | Netlify | Same extra hosts, read by the edge function. Built-in hosts are already allowed. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge Functions | Injected on the hosted project. Used only by `archive-upload` and `provider-keys`. Never a `VITE_` variable. |
| `PROVIDER_KEY_ENCRYPTION_SECRET` | Server shell, then Vault | Long random passphrase. Create the Vault secret `provider_key_encryption` from it after the migration. Never commit the value and never send it to the browser. |

Do not put a shared model API key in the environment. Visitors paste their own. A signed-in visitor can opt in to storing their own key, encrypted, on the account.

The pass-through is `netlify/edge-functions/provider-proxy.ts`, mounted at `/api/provider-proxy`. It streams one batch to an allowlisted provider host, persists nothing, and refuses localhost and private addresses.

## Case files

`supabase/migrations/20261111234000_case_files.sql` adds `case_files` with a unique `(user_id, export_fingerprint)` so a rerun updates the same row. Apply it yourself when you are ready. This branch does not apply it to the live project. There is no self-serve delete yet.

A partial read is stored with `partial = true`. The client refuses to mark an unfinished read as complete.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Fill in the Supabase URL and anon key so sign-in works. A read does not require an account. In Authentication → URL configuration, set the site URL and add redirect URLs for `/auth/confirm`, `/auth/callback`, and `/dashboard`.

Open `/read?sample=1` to walk the sample export with the demo extractor. No key and no network call.

## Exports

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

Copilot, Perplexity, Mistral, DeepSeek, Cursor, and similar tools work when the file is one of those shapes. Files must be under 200MB. A real upload stores a copy of the original file in the private `upload-archive` bucket for security review. `/read?sample=1` does not upload.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm test
```
