/* ============================================================
   gcc-report-api — Cloudflare Worker
   The ONLY job of this worker is to hold the Gemini API key
   somewhere the browser can never see it. It takes a prompt from
   diagnostic.html, calls Gemini server-side, and returns the raw
   response. All the scoring/calculation logic stays exactly where
   it already is, in diagnostic.html — this worker doesn't know or
   care about GTM diagnostics, it's a dumb, generic proxy on purpose,
   so it's easy to reason about and easy to reuse elsewhere later.

   Deploy:
     1. npm install -g wrangler
     2. wrangler login
     3. wrangler secret put GEMINI_API_KEY   (paste your key when prompted —
        this stores it encrypted in Cloudflare, never in this file, never in git)
     4. wrangler deploy
   ============================================================ */

// Allow requests from your live site and localhost while you're testing.
// Add any other origins you actually use (staging domain, etc.).
const ALLOWED_ORIGINS = [
  'https://growthclarityco.com',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405, headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // Basic sanity limits — this is a public endpoint, so don't trust size/shape blindly.
    const prompt = body && body.prompt;
    if (!prompt || typeof prompt !== 'string' || prompt.length > 8000) {
      return new Response(JSON.stringify({ error: 'Missing or oversized prompt' }), {
        status: 400, headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 1800, responseMimeType: 'application/json' },
          }),
        }
      );
      const data = await geminiRes.json();
      return new Response(JSON.stringify(data), {
        status: geminiRes.status,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Upstream Gemini request failed' }), {
        status: 502, headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  },
};
