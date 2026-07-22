-- ============================================================
-- GROWTH CLARITY CO. — SUPABASE SCHEMA
-- Project ref: vtxqgmioqwftrszgfohy
--
-- HOW TO RUN THIS:
--   1. Open your Supabase project -> SQL Editor -> New query.
--   2. Paste this entire file in, exactly as-is.
--   3. Click Run once. That's it — one paste, one click.
--
-- It is written to be idempotent: every CREATE uses IF NOT EXISTS and
-- every POLICY is dropped and recreated, so re-running this same file
-- a second time (or a tenth time) is safe and will not error or duplicate
-- anything. Your existing `leads` table and its rows are left untouched;
-- new columns are only added if they're missing.
--
-- The last statement in this file (SECTION 9) is a single summary query.
-- Its output is your confirmation that everything landed correctly —
-- see the expected values noted there.
-- ============================================================


-- ============================================================
-- SECTION 0 — OPTIONAL: INSPECT YOUR DATABASE FIRST
-- Not required to proceed. If you're ever curious what tables, columns,
-- or policies already exist before making a change, these three queries
-- (run individually, not as part of this script) will show you:
--
--   select table_name from information_schema.tables
--     where table_schema = 'public' order by table_name;
--
--   select table_name, column_name, data_type, is_nullable, column_default
--     from information_schema.columns
--     where table_schema = 'public' order by table_name, ordinal_position;
--
--   select tablename, policyname, cmd, roles from pg_policies
--     where schemaname = 'public' order by tablename;
-- ============================================================


-- ============================================================
-- SECTION 1 — LEADS
-- This table already exists in your project (contact.html and
-- start-diagnostic.html both POST to /rest/v1/leads). The columns below
-- are the ones your live site actually writes. If your table is missing
-- any of them, the ALTERs will add them.
-- ============================================================

create table if not exists public.leads (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  source       text,                      -- 'contact' | 'start-diagnostic' | 'diagnostic'
  name         text,
  email        text,
  company      text,
  website      text,
  role         text,
  arr          text,                      -- ARR band, e.g. '$5M–$10M'
  vertical     text,                      -- one of the 6 config packs
  motion       text,
  message      text,
  page_url     text,
  user_agent   text
);

-- Add any columns your existing table is missing (safe, no-ops if present)
alter table public.leads add column if not exists website  text;
alter table public.leads add column if not exists vertical text;
alter table public.leads add column if not exists role     text;
alter table public.leads add column if not exists motion   text;
alter table public.leads add column if not exists message  text;

create index if not exists leads_email_idx      on public.leads (email);
create index if not exists leads_company_idx    on public.leads (company);
create index if not exists leads_created_at_idx on public.leads (created_at desc);


-- ============================================================
-- SECTION 2 — REPORTS
-- One row per completed diagnostic. Stores all 66 answers, the 11 engine
-- scores, and the full report object as JSONB. One lead -> many reports.
--
-- NOTE: diagnostic.html does NOT currently write here. It scores entirely
-- client-side and stores nothing. The updated diagnostic.html in this build
-- wires this up for the first time.
-- ============================================================

create table if not exists public.reports (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  lead_id        uuid references public.leads(id) on delete cascade,

  -- profile snapshot (denormalised on purpose: the report must stay
  -- readable years later even if the lead row is edited)
  company        text,
  email          text,
  website        text,
  vertical       text,
  arr_band       text,
  role           text,

  -- deterministic scoring output
  answers        jsonb not null,          -- {"0":3,"1":1,...,"65":4}  (0-4 scale)
  engine_scores  jsonb not null,          -- {"pos":72,"dem":45,...}   (0-100)
  growth_score   int  not null check (growth_score between 0 and 100),
  constraint_key text,                    -- engine key of binding constraint
  constraint_label text,
  cohort_median  int,

  -- full assembled report (incl. any LLM narrative)
  report_object  jsonb,

  -- provenance
  config_pack    text default 'default',
  prompt_version text,
  has_analytics  boolean not null default false   -- true once GA/Clarity attached
);

create index if not exists reports_lead_id_idx    on public.reports (lead_id);
create index if not exists reports_company_idx    on public.reports (company);
create index if not exists reports_created_at_idx on public.reports (created_at desc);


-- ============================================================
-- SECTION 3 — ANALYTICS UPLOADS  (NEW)
-- The "separate database" you asked for. One row per uploaded PDF file.
-- This is the raw audit trail: the file, who uploaded it, what Gemini
-- returned verbatim, and whether a human has reviewed it.
--
-- Deliberately kept apart from `reports` so that a bad extraction can be
-- deleted or re-run without touching a diagnostic that's already scored.
-- ============================================================

create table if not exists public.analytics_uploads (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),

  lead_id           uuid references public.leads(id)   on delete cascade,
  report_id         uuid references public.reports(id) on delete set null,

  -- who / what company this belongs to (matched on company + email)
  company           text not null,
  email             text,
  website           text,

  -- the source document
  provider          text not null check (provider in ('google_analytics','clarity','other')),
  file_name         text,
  file_size_bytes   int,
  storage_path      text,                 -- path in Supabase Storage bucket
  period_start      date,
  period_end        date,

  -- what Gemini returned, verbatim and unmodified (audit trail)
  raw_extraction    jsonb,
  model_used        text default 'gemini-2.5-flash',
  extraction_status text not null default 'pending'
                    check (extraction_status in
                      ('pending','extracted','needs_review','approved','failed')),
  extraction_error  text,

  -- human review gate: low-confidence values never auto-flow into scoring
  reviewed_by       text,
  reviewed_at       timestamptz,
  review_notes      text
);

create index if not exists au_company_idx   on public.analytics_uploads (company);
create index if not exists au_lead_idx      on public.analytics_uploads (lead_id);
create index if not exists au_report_idx    on public.analytics_uploads (report_id);
create index if not exists au_status_idx    on public.analytics_uploads (extraction_status);


-- ============================================================
-- SECTION 4 — ANALYTICS METRICS  (NEW)
-- The unified metrics table. Every extracted KPI lands here as ONE ROW,
-- whatever its source. This is the single-table principle: self-report,
-- PDF extract, crawl and connected API all share one schema and one
-- scoring function. Only `source` and `trust_multiplier` differ.
--
-- Trust tiers:
--   self_report   0.70  — the 66 questions
--   pdf_extract   0.80  — Gemini read it off an official platform export
--   crawl         0.85  — machine-read from live HTML
--   connected_api 1.00  — pulled directly from GA4 / Clarity API
-- ============================================================

create table if not exists public.analytics_metrics (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),

  upload_id        uuid references public.analytics_uploads(id) on delete cascade,
  lead_id          uuid references public.leads(id)             on delete cascade,
  report_id        uuid references public.reports(id)           on delete set null,
  company          text not null,

  -- the KPI itself
  metric_key       text    not null,      -- see KPI dictionary, SECTION 5
  metric_value     numeric,
  metric_unit      text,                  -- 'count' | 'percent' | 'seconds' | 'currency'
  dimension        text,                  -- e.g. channel name, device, country
  period_start     date,
  period_end       date,

  -- provenance and trust
  source           text not null default 'pdf_extract'
                   check (source in ('self_report','pdf_extract','crawl','connected_api')),
  trust_multiplier numeric not null default 0.80
                   check (trust_multiplier in (0.70, 0.80, 0.85, 1.00)),

  -- extraction audit: exactly where this number came from
  confidence       text check (confidence in ('high','medium','low')),
  page_found       int,                   -- PDF page number
  source_ref       jsonb,                 -- {file_name, extracted_at, model, raw_label}

  -- engine mapping (which of the 11 engines this KPI informs)
  engine_key       text check (engine_key in
                     ('pos','dem','con','ret','icp','sal','act','eco','rev','cnt','pty')),

  approved         boolean not null default false
);

create index if not exists am_company_idx  on public.analytics_metrics (company);
create index if not exists am_upload_idx   on public.analytics_metrics (upload_id);
create index if not exists am_report_idx   on public.analytics_metrics (report_id);
create index if not exists am_key_idx      on public.analytics_metrics (metric_key);
create index if not exists am_engine_idx   on public.analytics_metrics (engine_key);

-- Prevent duplicate metric rows for the same upload + key + dimension
create unique index if not exists am_unique_metric
  on public.analytics_metrics (upload_id, metric_key, coalesce(dimension, ''));


-- ============================================================
-- SECTION 5 — KPI DICTIONARY  (NEW)
-- The canonical list of every KPI the extractor is allowed to produce.
-- This IS the enum the Gemini responseSchema uses — keeping it in the
-- database means you can add a KPI without redeploying the worker.
--
-- Engine mapping rationale is in the `rationale` column so the report
-- can explain WHY a given GA number moved a given engine score.
-- ============================================================

create table if not exists public.kpi_dictionary (
  metric_key    text primary key,
  label         text not null,
  provider      text not null check (provider in ('google_analytics','clarity','both')),
  unit          text not null,
  engine_key    text not null,
  direction     text not null check (direction in ('higher_better','lower_better')),
  -- benchmark thresholds for B2B SaaS $1M-$20M ARR
  poor_below    numeric,
  good_above    numeric,
  rationale     text
);

insert into public.kpi_dictionary
  (metric_key, label, provider, unit, engine_key, direction, poor_below, good_above, rationale)
values
  -- ---------- Conversion engine (con) ----------
  ('conversion_rate',        'Site conversion rate',        'google_analytics','percent', 'con','higher_better', 1.0,  2.5,
   'Visitor-to-lead conversion is the single clearest read on funnel health. B2B SaaS blended median sits near 1.4%.'),
  ('bounce_rate',            'Bounce rate',                 'google_analytics','percent', 'con','lower_better',  null, null,
   'High bounce on money pages signals a message-match or speed problem at the top of the funnel.'),
  ('engagement_rate',        'Engagement rate',             'google_analytics','percent', 'con','higher_better', 40.0, 60.0,
   'GA4 replaced bounce rate with engagement rate; below 40% usually means traffic is mistargeted.'),
  ('conversions_total',      'Total conversions',           'google_analytics','count',   'con','higher_better', null, null,
   'Absolute conversion volume, used with sessions to derive rate independently of the reported figure.'),
  ('rage_clicks',            'Rage clicks',                 'clarity',         'count',   'con','lower_better',  null, null,
   'Repeated frustrated clicking is the strongest single UX signal of a broken conversion path.'),
  ('dead_clicks',            'Dead clicks',                 'clarity',         'count',   'con','lower_better',  null, null,
   'Clicks on non-interactive elements mean users expect an action the page does not offer.'),

  -- ---------- Demand generation engine (dem) ----------
  ('sessions_total',         'Total sessions',              'google_analytics','count',   'dem','higher_better', null, null,
   'Baseline traffic volume; on its own it says little, but it anchors every rate metric.'),
  ('sessions_organic',       'Organic search sessions',     'google_analytics','count',   'dem','higher_better', null, null,
   'Organic share indicates whether demand compounds or is rented.'),
  ('sessions_paid',          'Paid search sessions',        'google_analytics','count',   'dem','higher_better', null, null,
   'Paid dependency above ~60% of sessions is a structural risk to CAC.'),
  ('sessions_direct',        'Direct sessions',             'google_analytics','count',   'dem','higher_better', null, null,
   'Direct traffic proxies brand strength, though it absorbs untracked sources.'),
  ('sessions_referral',      'Referral sessions',           'google_analytics','count',   'dem','higher_better', null, null,
   'Referral volume is the measurable footprint of the ecosystem and partner engine.'),
  ('sessions_social',        'Social sessions',             'google_analytics','count',   'dem','higher_better', null, null,
   'For B2B SaaS this is largely LinkedIn; it reads founder-led distribution.'),
  ('sessions_email',         'Email sessions',              'google_analytics','count',   'dem','higher_better', null, null,
   'Email traffic shows whether an owned audience exists and is being activated.'),
  ('channel_count',          'Working channels',            'google_analytics','count',   'dem','higher_better', 2,    3,
   'Single-channel dependency is the most common demand-gen constraint at this ARR band.'),

  -- ---------- Content and brand engine (cnt) ----------
  ('avg_engagement_time',    'Avg engagement time',         'google_analytics','seconds', 'cnt','higher_better', 30,   60,
   'Time actually engaged separates content that holds attention from content that ranks.'),
  ('pages_per_session',      'Pages per session',           'both',            'count',   'cnt','higher_better', 1.5,  2.5,
   'Multi-page sessions indicate the content answers a real question rather than a single query.'),
  ('scroll_depth_avg',       'Average scroll depth',        'clarity',         'percent', 'cnt','higher_better', 50,   70,
   'Shallow scroll on long-form pages means the opening does not earn the read.'),
  ('new_users',              'New users',                   'google_analytics','count',   'cnt','higher_better', null, null,
   'New-user growth is the clearest read on whether content is expanding reach.'),

  -- ---------- ICP and targeting engine (icp) ----------
  ('returning_user_rate',    'Returning user rate',         'google_analytics','percent', 'icp','higher_better', 15,   30,
   'A healthy returning share suggests the audience matches the ICP rather than accidental traffic.'),
  ('sessions_desktop',       'Desktop sessions',            'google_analytics','count',   'icp','higher_better', null, null,
   'B2B buyers research on desktop; a mobile-dominant mix often means the traffic is not the buyer.'),
  ('sessions_mobile',        'Mobile sessions',             'google_analytics','count',   'icp','higher_better', null, null,
   'Used with desktop to compute buyer-fit of the traffic mix.'),
  ('top_country_share',      'Top country share',           'google_analytics','percent', 'icp','higher_better', null, null,
   'Geographic concentration reveals whether targeting is focused or diffuse.'),

  -- ---------- Activation and onboarding engine (act) ----------
  ('avg_session_duration',   'Avg session duration',        'both',            'seconds', 'act','higher_better', 60,   120,
   'Short sessions on product or pricing pages point to a time-to-value problem before signup.'),
  ('quick_backs',            'Quick backs',                 'clarity',         'count',   'act','lower_better',  null, null,
   'Immediate back-navigation is the earliest observable form of activation failure.'),

  -- ---------- RevOps and data engine (rev) ----------
  ('conversion_events_count','Conversion events configured','google_analytics','count',   'rev','higher_better', 1,    3,
   'If no conversion events are defined, the company cannot measure its own funnel — a RevOps failure, not a marketing one.'),
  ('data_period_days',       'Reporting period length',     'both',            'count',   'rev','higher_better', 28,   90,
   'A reporting window under 28 days indicates analytics were set up recently or are not maintained.'),
  ('js_errors',              'JavaScript errors',           'clarity',         'count',   'rev','lower_better',  null, null,
   'Script errors corrupt tracking before they corrupt UX; they undermine every other number.')
on conflict (metric_key) do update set
  label      = excluded.label,
  provider   = excluded.provider,
  unit       = excluded.unit,
  engine_key = excluded.engine_key,
  direction  = excluded.direction,
  poor_below = excluded.poor_below,
  good_above = excluded.good_above,
  rationale  = excluded.rationale;


-- ============================================================
-- SECTION 6 — ROW LEVEL SECURITY
-- The anon key is public (it is embedded in your HTML, which is fine and
-- by design). RLS is what actually protects you: anon can INSERT but
-- never SELECT. Nobody can read other people's diagnostics.
-- ============================================================

alter table public.leads              enable row level security;
alter table public.reports            enable row level security;
alter table public.analytics_uploads  enable row level security;
alter table public.analytics_metrics  enable row level security;
alter table public.kpi_dictionary     enable row level security;

-- Anonymous visitors may INSERT only
drop policy if exists anon_insert_leads   on public.leads;
create policy anon_insert_leads   on public.leads
  for insert to anon with check (true);

drop policy if exists anon_insert_reports on public.reports;
create policy anon_insert_reports on public.reports
  for insert to anon with check (true);

drop policy if exists anon_insert_uploads on public.analytics_uploads;
create policy anon_insert_uploads on public.analytics_uploads
  for insert to anon with check (true);

drop policy if exists anon_insert_metrics on public.analytics_metrics;
create policy anon_insert_metrics on public.analytics_metrics
  for insert to anon with check (true);

-- The KPI dictionary is the one table anon may READ (the browser needs the
-- list to render feedback labels). It contains no customer data.
drop policy if exists anon_read_kpi on public.kpi_dictionary;
create policy anon_read_kpi on public.kpi_dictionary
  for select to anon using (true);

-- Authenticated (you, in the Supabase dashboard or a future console)
-- may read everything.
drop policy if exists auth_read_leads   on public.leads;
create policy auth_read_leads   on public.leads
  for select to authenticated using (true);

drop policy if exists auth_read_reports on public.reports;
create policy auth_read_reports on public.reports
  for select to authenticated using (true);

drop policy if exists auth_read_uploads on public.analytics_uploads;
create policy auth_read_uploads on public.analytics_uploads
  for select to authenticated using (true);

drop policy if exists auth_read_metrics on public.analytics_metrics;
create policy auth_read_metrics on public.analytics_metrics
  for select to authenticated using (true);


-- ============================================================
-- SECTION 7 — STORAGE BUCKET for uploaded PDFs
-- Run once. Private bucket: files are never publicly readable.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('analytics-uploads', 'analytics-uploads', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists anon_upload_analytics on storage.objects;
create policy anon_upload_analytics on storage.objects
  for insert to anon
  with check (bucket_id = 'analytics-uploads');


-- ============================================================
-- SECTION 8 — COMBINED VIEW
-- Joins questionnaire scoring with extracted analytics KPIs so the final
-- report can be assembled from a single query.
-- ============================================================

create or replace view public.v_combined_report as
select
  r.id                as report_id,
  r.created_at,
  r.company,
  r.email,
  r.vertical,
  r.arr_band,
  r.growth_score,
  r.constraint_key,
  r.constraint_label,
  r.engine_scores,
  r.has_analytics,
  u.provider          as analytics_provider,
  u.period_start,
  u.period_end,
  u.extraction_status,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'metric_key',  m.metric_key,
        'value',       m.metric_value,
        'unit',        m.metric_unit,
        'dimension',   m.dimension,
        'engine_key',  m.engine_key,
        'confidence',  m.confidence,
        'trust',       m.trust_multiplier
      ) order by m.engine_key, m.metric_key
    ) filter (where m.id is not null),
    '[]'::jsonb
  ) as analytics_metrics
from public.reports r
left join public.analytics_uploads u on u.report_id = r.id
left join public.analytics_metrics m on m.report_id = r.id
group by r.id, u.provider, u.period_start, u.period_end, u.extraction_status;


-- ============================================================
-- SECTION 9 — VERIFY (runs automatically — this is the last statement)
--
-- Supabase's SQL Editor shows the result of the final statement in a
-- script, so this summary is what you'll see the moment Run finishes.
-- Expected values, if the whole script ran cleanly:
--
--   tables_ready          -> 5
--   kpi_rows               -> 27
--   public_policies         -> 9
--   storage_bucket_ready     -> 1
--
-- If any of those don't match, scroll up in the editor's output for the
-- first red error — everything above that line succeeded.
-- ============================================================

select
  (select count(*) from information_schema.tables
     where table_schema = 'public'
       and table_name in ('leads','reports','analytics_uploads','analytics_metrics','kpi_dictionary')
  )                                                              as tables_ready,
  (select count(*) from public.kpi_dictionary)                   as kpi_rows,
  (select count(*) from pg_policies where schemaname = 'public') as public_policies,
  (select count(*) from storage.buckets where id = 'analytics-uploads')
                                                                  as storage_bucket_ready;
