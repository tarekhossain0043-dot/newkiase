# NEXORA Storefront

NEXORA ecommerce storefront built with Next.js, React, TypeScript, and Supabase.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Customer support AI

The website chat endpoint is:

```
POST /api/customer-support/chat
```

It uses Google Gemini through the Gemini OpenAI-compatible Chat Completions endpoint and loads the current active products, active categories, and selected store policies from Supabase for each request.

Required Vercel environment variables:

- `OPENAI_API_KEY` — Google Gemini API key (server-side only). The legacy variable name is retained for compatibility with the existing deployment.
- Supabase service-client variables required by `lib/supabase/service.ts`.

Optional:

- `GEMINI_MODEL` — Gemini model name; defaults to `gemini-3.8-flash`.

Do not expose secret keys through `NEXT_PUBLIC_*` variables or commit them to Git.

## Facebook Messenger integration

Webhook endpoint:

```
GET/POST /api/webhooks/messenger
```

Required Vercel environment variables:

- `META_VERIFY_TOKEN` — a private verification phrase you choose. Enter the exact same value in Meta's webhook Verify Token field.
- `META_APP_SECRET` — App Secret from the Meta app's basic settings. Keep it private.
- `META_PAGE_ACCESS_TOKEN` — Page Access Token for the Facebook Page connected to the app. It must have the required Messenger messaging permission.
- `OPENAI_API_KEY` — Google Gemini API key used to generate customer replies (legacy variable name retained).
- Supabase service-client variables required by `lib/supabase/service.ts`.

Optional:

- `NEXT_PUBLIC_SITE_URL` — canonical deployed site origin, for example `https://your-store-domain.com`. Set this to the exact production origin if used by the deployment.

### Meta setup checklist

1. Deploy the application to Vercel after adding the environment variables.
2. In Meta App Dashboard, open Messenger settings and configure the callback URL as `https://YOUR-DOMAIN/api/webhooks/messenger`.
3. Enter the same value as Vercel's `META_VERIFY_TOKEN` in Meta's Verify Token field and verify/save.
4. Subscribe the app to the Page webhook fields `messages` and `messaging_postbacks`.
5. In the Page subscription section, select and subscribe the actual Facebook Page that should receive customer messages.
6. Confirm the Page Access Token belongs to that same Page and has the required messaging permission.
7. Send a message to the Page from a separate Facebook account and inspect Vercel Function Logs if no reply arrives.

The webhook verifies Meta's `X-Hub-Signature-256` request signature using `META_APP_SECRET`. Never disable signature verification in production.

### Important testing notes

- A successful webhook callback verification only confirms the GET verification handshake. It does not prove that the Facebook Page is subscribed or that message replies work.
- Test with a separate Facebook account, not only the account administering the app/Page.
- While the Meta app is in Development mode, only permitted app roles/testers may be able to exercise the integration. Public customer access requires the relevant Meta app configuration, permissions, and review/approval where Meta requires it.
- Messenger replies must comply with Meta's messaging policies and allowed response window. Do not use this integration for unsolicited promotional messages.
- Do not paste App Secret, Page Access Token, or Gemini API key into chat, screenshots, or source control.

## Deployment

Import the GitHub repository into Vercel with the standard Next.js settings. Add the required environment variables in Vercel, then redeploy. A successful GitHub commit is not by itself proof that the production deployment or external integrations are working.
