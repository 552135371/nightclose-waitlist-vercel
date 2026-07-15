# NightClose Waitlist on Vercel

Static NightClose waitlist site on Vercel with a server-side waitlist API.

This repo is the NightClose-specific deployed instance. Keep the generic reusable template separate at:

```text
/Users/wanghuilin/Projects/html-waitlist-vercel-template
```

## What This Gives You

- Static `index.html` for the current NightClose landing page.
- `POST /api/waitlist` endpoint for collecting emails.
- Honeypot spam field.
- Email validation.
- Optional origin allowlist.
- Two storage modes:
  - Supabase table insert.
  - Generic webhook forwarding.

## File Structure

```text
.
├── api/
│   └── waitlist.js
├── index.html
├── package.json
├── supabase.sql
└── vercel.json
```

## Quick Start

```bash
cd /Users/wanghuilin/Projects/nightclose-waitlist-vercel
npx vercel dev
```

Open the local URL from Vercel CLI and submit the demo form.

## Deploy To Vercel

1. Push this folder to a GitHub repo.
2. Import the repo in Vercel.
3. Add environment variables in Vercel Project Settings.
4. Deploy.

Vercel reads environment variables during Function execution, and changes apply to new deployments.

## Supabase Storage

Create a Supabase table using `supabase.sql`.

Set these Vercel environment variables:

```text
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://yxbpghtgggsrnnzfkanj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_WAITLIST_TABLE=nightclose_waitlist
WAITLIST_PROJECT=nightclose
```

Use the service role key only on the server side. Never expose it in HTML.

### Current Supabase Project

This instance is configured for:

```text
Project name: 552135371's Project
Project ref: yxbpghtgggsrnnzfkanj
Region: ap-southeast-1
Status: ACTIVE_HEALTHY
```

You still need to add `SUPABASE_SERVICE_ROLE_KEY` in Vercel Project Settings.

The NightClose table has already been created as:

```text
public.nightclose_waitlist
```

## Alternative: Generic Webhook Storage

Use this if you want to send entries to Make, Zapier, Google Apps Script, Notion automation, or another endpoint.

```text
STORAGE_PROVIDER=webhook
WAITLIST_WEBHOOK_URL=https://example.com/your-webhook-url
WAITLIST_WEBHOOK_SECRET=optional-shared-secret
```

If `WAITLIST_WEBHOOK_SECRET` is set, the function sends it as:

```text
X-Waitlist-Secret: YOUR_SECRET
```

## Optional Environment Variables

```text
ALLOWED_ORIGINS=
WAITLIST_PROJECT=nightclose
```

If `ALLOWED_ORIGINS` is empty, same-origin browser requests work normally.
Use this variable only when another domain needs to call the API.

## Frontend Integration

Any HTML form can submit to this endpoint:

```html
<form id="waitlist-form">
  <input type="email" name="email" required />
  <input type="text" name="name" />
  <input type="hidden" name="source" value="landing-v1" />
  <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" />
  <button type="submit">Join waitlist</button>
</form>
```

Then send JSON:

```js
await fetch("/api/waitlist", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: form.email.value,
    name: form.name.value,
    source: "landing-v1",
    website: form.website.value
  })
});
```

## Notes

- Vercel file storage is not durable for submitted data. Use Supabase or a webhook.
- Add a unique index in your storage layer if you want one email per project.
- This instance is intentionally framework-free so the landing page can be replaced quickly during market validation.
- As of 2026-06-01, NightClose marketing is testing `30-day real-state glow-back diary + Tomorrow Crew`; if `index.html` still reflects an older `Tomorrow Glow` or doomscrolling-first narrative, replace the landing copy before running new traffic.
