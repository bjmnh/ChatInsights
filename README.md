# Chat Insights

Upload a conversation export from any AI assistant and get a visual read of it: free conversation counts, plus seven premium report cards (FBI Report, Reality TV Persona, Digital Doppelganger, Linguistic Fingerprint, PII Safety Compass, Unfiltered Mirror, Top 5 Conversations).

Stack: Vite, React, TypeScript, Tailwind, shadcn/ui, Supabase (auth, Postgres, storage, edge functions), Stripe Checkout.

## Why premium is a one-time purchase

A premium report is generated once from a finished export. There is no ongoing feed to subscribe to. Paying once unlocks premium generation for that account, including later uploads. Refunds recorded by the Stripe webhook remove the unlock when no other paid checkout remains.

The browser never decides who is paid. `generate-premium-report` reads `users.premium_status`, which only the service role can change.

## Setup

1. Install and configure the frontend:

```bash
npm install
cp .env.example .env
```

Fill in `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`, and `VITE_STRIPE_PUBLISHABLE_KEY`.

2. Apply every file in `supabase/migrations` in timestamp order, including `20261020040306_premium_unlock.sql`. That migration restores premium billing columns, the `payments` table, and row-level rules that hide premium reports from unpaid accounts.

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

4. In Authentication → URL configuration, set the site URL and add redirect URLs for `/auth/confirm` and `/dashboard`.

5. Start the app:

```bash
npm run dev
```

## Stripe test mode

Create the product in the [Stripe Dashboard](https://dashboard.stripe.com/test/products) while **Test mode** is on.

1. Add a product named `Chat Insights Premium`.
2. Add one price. Choose **One time**, not recurring, for **$9.99 USD**. That display amount lives in `src/config/pricing.ts` (`PREMIUM_UNLOCK`). Change the constant and the Stripe Price together. The Price ID is not stored in the repo.
3. Copy the price id (`price_...`).

API keys (Developers → API keys):

| Secret | Where it lives | Example |
| --- | --- | --- |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Frontend `.env` | `pk_test_...` |
| `STRIPE_SECRET_KEY` | Supabase edge secret | `sk_test_...` |
| `STRIPE_PRICE_ID` | Supabase edge secret | `price_...` |
| `STRIPE_WEBHOOK_SECRET` | Supabase edge secret | `whsec_...` |
| `APP_URL` | Supabase edge secret | `http://localhost:5173` or your public site |
| `ALLOWED_ORIGINS` | Supabase edge secret | optional comma-separated return origins |
| `GEMINI_API_KEY` | Supabase edge secret | required by premium generation |

`STRIPE_PRICE_ID` stays on the server so the browser cannot swap in a different price. Set secrets with the Supabase dashboard or:

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  STRIPE_PRICE_ID=price_... \
  APP_URL=http://localhost:5173 \
  GEMINI_API_KEY=...
```

Deploy the functions after the migration is applied. Do not skip `--no-verify-jwt` on the webhook; Stripe does not send a Supabase JWT. `supabase/config.toml` also sets `verify_jwt = false` for that function.

```bash
supabase functions deploy create-checkout-session
supabase functions deploy confirm-checkout
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy generate-basic-report
supabase functions deploy generate-premium-report
```

Webhook endpoint:

```text
https://yaykfgyucipnqufydyjb.supabase.co/functions/v1/stripe-webhook
```

In Stripe → Developers → Webhooks → Add endpoint, subscribe to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `charge.refunded`

Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

For local webhook forwarding:

```bash
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
```

Use the signing secret that command prints. Pay with test card `4242 4242 4242 4242`, any future expiry, and any CVC.

What happens on a successful payment:

1. The studio calls `create-checkout-session`, which opens Stripe Checkout in `payment` mode.
2. Stripe posts the event to `stripe-webhook`. The function checks the `Stripe-Signature` header, then writes a `payments` row and sets `users.premium_status`.
3. The return URL calls `confirm-checkout`, which reads the same session from Stripe and records it again if the webhook has not landed yet. The checkout session id is unique, so this is safe to repeat.
4. `generate-premium-report` returns HTTP 402 until `premium_status` is true. A refund sets the payment to `refunded` and clears the unlock when nothing paid remains.

`ALLOWED_ORIGINS` is optional. Comma-separate extra return URLs (a preview deploy and localhost) if `APP_URL` alone is not enough. Checkout will only redirect to `APP_URL` or a listed origin.

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
