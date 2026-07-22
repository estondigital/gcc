/* ============================================================
   gcc-report-api — Cloudflare Worker

   Two jobs, both of which exist purely so the Gemini API key never
   reaches the browser:

     POST /                    → generic text prompt proxy  (unchanged,
                                 diagnostic.html narrative still works)
     POST /extract-analytics   → NEW. Takes a base64 PDF (GA4 or Clarity
                                 export), returns strictly-schema'd KPI JSON.

   Scoring logic stays in diagnostic.html. This worker never computes a
   score and never invents a number — on the extraction route the model is
   instructed to transcribe values exactly as printed and to flag anything
   ambiguous as low confidence so it can be held back for human review.

   Deploy:
     1. npm install -g wrangler
     2. wrangler login
     3. wrangler secret put GEMINI_API_KEY
     4. wrangler deploy
   ============================================================ */

const ALLOWED_ORIGINS = [
  'https://growthclarityco.com',
  'https://www.growthclarityco.com',
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

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

/* ------------------------------------------------------------
   KPI vocabulary. Must stay in sync with kpi_dictionary in
   supabase-schema.sql. The enum is doing real work here: without it
   the model invents label variants ("Sessions (Total)", "Total Sessions")
   and fragments the metrics table.
------------------------------------------------------------ */
const METRIC_KEYS = [
  'conversion_rate', 'bounce_rate', 'engagement_rate', 'conversions_total',
  'rage_clicks', 'dead_clicks',
  'sessions_total', 'sessions_organic', 'sessions_paid', 'sessions_direct',
  'sessions_referral', 'sessions_social', 'sessions_email', 'channel_count',
  'avg_engagement_time', 'pages_per_session', 'scroll_depth_avg', 'new_users',
  'returning_user_rate', 'sessions_desktop', 'sessions_mobile', 'top_country_share',
  'avg_session_duration', 'quick_backs',
  'conversion_events_count', 'data_period_days', 'js_errors',
];

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    provider: {
      type: 'string',
      enum: ['google_analytics', 'clarity', 'other'],
      description: 'Which platform produced this report.',
    },
    company_name_in_file: {
      type: 'string',
      description: 'Any company, property or website name printed in the document. Empty string if none.',
    },
    property_or_site: {
      type: 'string',
      description: 'The GA4 property name or website domain shown in the report. Empty string if none.',
    },
    period_start: { type: 'string', description: 'ISO date (YYYY-MM-DD) of the reporting range start. Empty string if not shown.' },
    period_end:   { type: 'string', description: 'ISO date (YYYY-MM-DD) of the reporting range end. Empty string if not shown.' },
    metrics: {
      type: 'array',
      description: 'Every metric you can find. Omit anything you cannot read with confidence.',
      items: {
        type: 'object',
        properties: {
          metric_key:   { type: 'string', enum: METRIC_KEYS },
          metric_value: { type: 'number', description: 'The value exactly as printed. Never rounded, never calculated.' },
          unit:         { type: 'string', enum: ['count', 'percent', 'seconds', 'currency'] },
          dimension:    { type: 'string', description: 'Channel, device or country name if the value is a breakdown. Empty string otherwise.' },
          page_found:   { type: 'integer', description: 'Page number of the PDF this value appears on.' },
          raw_label:    { type: 'string', description: 'The label printed next to the value in the document.' },
          confidence:   { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['metric_key', 'metric_value', 'unit', 'page_found', 'raw_label', 'confidence'],
      },
    },
    notes: {
      type: 'string',
      description: 'Anything that limits confidence: chart-only values, cropped tables, unclear date ranges. Empty string if none.',
    },
  },
  required: ['provider', 'period_start', 'period_end', 'metrics', 'notes'],
};

const EXTRACTION_INSTRUCTION = `You are extracting analytics KPIs from an uploaded report.

RULES — these are absolute:
1. Transcribe every value EXACTLY as printed. Never round, never convert, never calculate a value that is not written in the document.
2. If a number is not printed, do not supply it. Omit the metric entirely. A missing metric is always better than a guessed one.
3. If a value can only be read off a chart rather than a table, set confidence to "low" and say so in notes.
4. If a value is cropped, blurred, overlapping or ambiguous in any way, set confidence to "low".
5. Percentages: record the number as printed. If the document shows 2.4%, record 2.4 with unit "percent" — do not convert to 0.024.
6. Durations: convert only clock notation to seconds (1m 30s becomes 90). Any other conversion is forbidden.
7. Record the page number where each value appears. This is an audit trail and must be accurate.
8. Only use metric_key values from the provided enum. If a metric in the document has no matching key, skip it.

Return valid JSON matching the schema. Nothing else.`;

/* ------------------------------------------------------------ */

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { headers });
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, headers);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400, headers);
    }

    /* ============ ROUTE 2 — PDF ANALYTICS EXTRACTION ============ */
    if (url.pathname === '/extract-analytics') {
      const pdfBase64 = body && body.pdf_base64;
      const providerHint = (body && body.provider_hint) || 'unknown';

      if (!pdfBase64 || typeof pdfBase64 !== 'string') {
        return json({ error: 'Missing pdf_base64' }, 400, headers);
      }
      // Gemini accepts inline documents under 20MB. base64 inflates by ~4/3,
      // so cap the encoded string a little under that to stay safe.
      if (pdfBase64.length > 26000000) {
        return json({
          error: 'PDF too large. Please upload a file under 18MB, or export a shorter date range.',
        }, 413, headers);
      }

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                role: 'user',
                parts: [
                  { inline_data: { mime_type: 'application/pdf', data: pdfBase64 } },
                  { text: `${EXTRACTION_INSTRUCTION}\n\nThe uploader indicated this is a "${providerHint}" report, but verify from the document itself and set provider accordingly.` },
                ],
              }],
              generationConfig: {
                temperature: 0,
                maxOutputTokens: 8192,
                responseMimeType: 'application/json',
                responseSchema: EXTRACTION_SCHEMA,
              },
            }),
          }
        );

        const data = await res.json();

        if (!res.ok) {
          return json({
            error: 'Gemini rejected the document',
            detail: data && data.error ? data.error.message : null,
          }, res.status, headers);
        }

        const text = data && data.candidates && data.candidates[0]
          && data.candidates[0].content && data.candidates[0].content.parts
          && data.candidates[0].content.parts[0]
          && data.candidates[0].content.parts[0].text;

        if (!text) {
          return json({ error: 'Empty extraction result' }, 502, headers);
        }

        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          return json({ error: 'Extraction returned unparseable JSON' }, 502, headers);
        }

        /* ---- Server-side validation. Constrained decoding guarantees the
           SHAPE of the JSON, not that the values make sense. Range-check
           everything before it is allowed anywhere near the database. ---- */
        const clean = [];
        const rejected = [];

        for (const m of (parsed.metrics || [])) {
          const v = m.metric_value;
          let ok = typeof v === 'number' && isFinite(v) && v >= 0;

          if (ok && m.unit === 'percent' && v > 100) ok = false;
          if (ok && m.metric_key === 'pages_per_session' && v > 100) ok = false;
          if (ok && m.metric_key === 'avg_session_duration' && v > 86400) ok = false;
          if (ok && m.metric_key === 'avg_engagement_time' && v > 86400) ok = false;
          if (ok && METRIC_KEYS.indexOf(m.metric_key) === -1) ok = false;

          if (ok) clean.push(m); else rejected.push(m);
        }

        const lowConfidence = clean.filter(function (m) { return m.confidence === 'low'; }).length;

        return json({
          ok: true,
          provider: parsed.provider,
          company_name_in_file: parsed.company_name_in_file || '',
          property_or_site: parsed.property_or_site || '',
          period_start: parsed.period_start || '',
          period_end: parsed.period_end || '',
          notes: parsed.notes || '',
          metrics: clean,
          rejected_count: rejected.length,
          low_confidence_count: lowConfidence,
          // needs_review if anything was rejected, anything is low confidence,
          // or we got suspiciously little back from the document
          needs_review: rejected.length > 0 || lowConfidence > 0 || clean.length < 3,
          model_used: 'gemini-2.5-flash',
        }, 200, headers);

      } catch {
        return json({ error: 'Upstream Gemini request failed' }, 502, headers);
      }
    }

    /* ============ ROUTE 1 — GENERIC TEXT PROMPT (unchanged) ============ */
    const prompt = body && body.prompt;
    if (!prompt || typeof prompt !== 'string' || prompt.length > 12000) {
      return json({ error: 'Missing or oversized prompt' }, 400, headers);
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
    } catch {
      return json({ error: 'Upstream Gemini request failed' }, 502, headers);
    }
  },
};
