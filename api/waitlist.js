const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(res, status, payload, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers,
  });
  res.end(JSON.stringify(payload));
}

function getOriginPolicy(req) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  const configured = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!origin) return { origin: "", allowed: true };
  try {
    const originHost = new URL(origin).host;
    if (host && originHost === host) {
      return { origin, allowed: true };
    }
  } catch {
    return { origin: "", allowed: false };
  }

  if (configured.length === 0) return { origin, allowed: true };
  return { origin: configured.includes(origin) ? origin : "", allowed: configured.includes(origin) };
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function decodeHeader(value) {
  if (!value) return "";
  try {
    return decodeURIComponent(String(value));
  } catch {
    return String(value);
  }
}

function normalizePayload(body, req) {
  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim();
  const source = String(body.source || "landing").trim();
  const project = String(body.project || process.env.WAITLIST_PROJECT || "nightclose").trim();
  const website = String(body.website || "").trim();
  const userAgent = req.headers["user-agent"] || "";
  const referrer = req.headers.referer || "";
  const ip = String(
    req.headers["x-forwarded-for"] ||
      req.headers["x-real-ip"] ||
      req.headers["x-vercel-forwarded-for"] ||
      ""
  )
    .split(",")[0]
    .trim();
  const country = decodeHeader(req.headers["x-vercel-ip-country"]);
  const region = decodeHeader(req.headers["x-vercel-ip-country-region"]);
  const city = decodeHeader(req.headers["x-vercel-ip-city"]);
  const latitude = decodeHeader(req.headers["x-vercel-ip-latitude"]);
  const longitude = decodeHeader(req.headers["x-vercel-ip-longitude"]);

  return {
    email,
    name,
    source,
    project,
    website,
    ip,
    country,
    region,
    city,
    latitude,
    longitude,
    user_agent: userAgent,
    referrer,
    metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
    created_at: new Date().toISOString(),
  };
}

async function saveToSupabase(entry) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const table = process.env.SUPABASE_WAITLIST_TABLE || "nightclose_waitlist";

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      email: entry.email,
      name: entry.name || null,
      source: entry.source,
      project: entry.project,
      ip: entry.ip || null,
      country: entry.country || null,
      region: entry.region || null,
      city: entry.city || null,
      latitude: entry.latitude || null,
      longitude: entry.longitude || null,
      user_agent: entry.user_agent,
      referrer: entry.referrer,
      metadata: entry.metadata,
      created_at: entry.created_at,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 409) return;
    throw new Error(`Supabase insert failed: ${response.status} ${text}`);
  }
}

async function saveToWebhook(entry) {
  const url = process.env.WAITLIST_WEBHOOK_URL;
  if (!url) throw new Error("Missing WAITLIST_WEBHOOK_URL");

  const headers = { "Content-Type": "application/json" };
  if (process.env.WAITLIST_WEBHOOK_SECRET) {
    headers["X-Waitlist-Secret"] = process.env.WAITLIST_WEBHOOK_SECRET;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(entry),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Webhook failed: ${response.status} ${text}`);
  }
}

async function saveEntry(entry) {
  const provider = process.env.STORAGE_PROVIDER || "webhook";
  if (provider === "supabase") return saveToSupabase(entry);
  if (provider === "webhook") return saveToWebhook(entry);
  throw new Error(`Unsupported STORAGE_PROVIDER: ${provider}`);
}

export default async function handler(req, res) {
  const originPolicy = getOriginPolicy(req);
  const corsHeaders = originPolicy.origin
    ? {
        "Access-Control-Allow-Origin": originPolicy.origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      }
    : {};

  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    json(res, 405, { ok: false, error: "Method not allowed" }, corsHeaders);
    return;
  }

  if (!originPolicy.allowed) {
    json(res, 403, { ok: false, error: "Origin not allowed" }, corsHeaders);
    return;
  }

  try {
    const body = await readJson(req);
    const entry = normalizePayload(body, req);

    if (entry.website) {
      json(res, 200, { ok: true }, corsHeaders);
      return;
    }

    if (!EMAIL_RE.test(entry.email)) {
      json(res, 400, { ok: false, error: "Enter a valid email address." }, corsHeaders);
      return;
    }

    await saveEntry(entry);
    json(res, 200, { ok: true }, corsHeaders);
  } catch (error) {
    console.error(error);
    json(res, 500, { ok: false, error: "Could not join the waitlist." }, corsHeaders);
  }
}
