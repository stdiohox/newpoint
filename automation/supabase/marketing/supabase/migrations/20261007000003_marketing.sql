-- newpoint-marketing: marketing schema (public zone, no patient identifiers).
-- docs/automation-architecture.md §4 "marketing schema in newpoint-marketing".
-- gbp_reviews is public review data and is NEVER joined to anything in the PHI
-- project (§5.2).

create type marketing.keyword_intent as enum
  ('informational', 'navigational', 'commercial', 'transactional', 'local');
create type marketing.keyword_source as enum
  ('search_console', 'keyword_planner', 'dataforseo', 'manual');
create type marketing.backlog_kind as enum
  ('page', 'faq', 'schema', 'gbp_post', 'social');
create type marketing.backlog_status as enum
  ('proposed', 'accepted', 'rejected', 'done');
create type marketing.review_reply_status as enum
  ('none', 'drafted', 'awaiting_approval', 'approved', 'rejected', 'posted');
create type marketing.post_status as enum
  ('draft', 'awaiting_approval', 'approved', 'rejected', 'expired', 'published');
create type marketing.social_channel as enum
  ('facebook', 'instagram', 'linkedin', 'gbp');
create type marketing.social_status as enum
  ('planned', 'drafted', 'in_compliance', 'awaiting_approval', 'approved', 'rejected', 'expired', 'published');

create table marketing.keywords (
  id            uuid primary key default gen_random_uuid(),
  term          text not null check (length(term) between 1 and 200),
  cluster       text,
  intent        marketing.keyword_intent,
  state         text check (state in ('NJ', 'PA')),
  town          text,
  service_slug  text,
  volume        integer check (volume >= 0),
  difficulty    numeric(5, 2) check (difficulty between 0 and 100),
  source        marketing.keyword_source not null,
  first_seen    timestamptz not null default now()
);

create unique index keywords_term_place_key
  on marketing.keywords (lower(term), coalesce(state, ''), coalesce(lower(town), ''));

create table marketing.keyword_snapshots (
  keyword_id   uuid not null references marketing.keywords (id) on delete cascade,
  date         date not null,
  gsc_position numeric(6, 2) check (gsc_position >= 1),
  impressions  integer not null default 0 check (impressions >= 0),
  clicks       integer not null default 0 check (clicks >= 0),
  primary key (keyword_id, date)
);

create table marketing.content_backlog (
  id            uuid primary key default gen_random_uuid(),
  kind          marketing.backlog_kind not null,
  target        text not null,
  rationale     text not null,
  source_agent  text not null,
  status        marketing.backlog_status not null default 'proposed',
  created_at    timestamptz not null default now()
);

create table marketing.gbp_reviews (
  google_review_id text primary key,
  rating           smallint not null check (rating between 1 and 5),
  text             text,
  author_display   text,
  created_at       timestamptz not null,
  reply_draft      text,
  reply_status     marketing.review_reply_status not null default 'none',
  replied_at       timestamptz
);

create table marketing.gbp_posts (
  id            uuid primary key default gen_random_uuid(),
  body          text not null,
  cta_url       text check (cta_url ~ '^https://'),
  media         jsonb not null default '[]'::jsonb,
  status        marketing.post_status not null default 'draft',
  scheduled_for timestamptz,
  published_ref text,
  created_at    timestamptz not null default now()
);

create table marketing.social_posts (
  id                    uuid primary key default gen_random_uuid(),
  channel               marketing.social_channel not null,
  body                  text,
  media                 jsonb not null default '[]'::jsonb,
  topic                 text not null,
  keyword_ids           uuid[] not null default '{}',
  compliance_report     jsonb,
  -- §5.7: at most 3 drafter/compliance rounds before a human takes over.
  rounds                smallint not null default 0 check (rounds between 0 and 3),
  approval_status       marketing.social_status not null default 'planned',
  approval_token_id     text,
  -- §5.7: the publisher refuses unless the content hash equals the approved one.
  approved_content_hash text check (approved_content_hash ~ '^[0-9a-f]{64}$'),
  scheduled_for         timestamptz,
  published_ref         text,
  published_at          timestamptz,
  created_at            timestamptz not null default now()
);

create table marketing.geo_prompts (
  id      uuid primary key default gen_random_uuid(),
  prompt  text not null unique,
  intent  text,
  state   text check (state in ('NJ', 'PA')),
  active  boolean not null default true
);

create table marketing.geo_runs (
  id                     uuid primary key default gen_random_uuid(),
  prompt_id              uuid not null references marketing.geo_prompts (id) on delete cascade,
  engine                 text not null,
  run_at                 timestamptz not null default now(),
  answer_excerpt         text,
  newpoint_mentioned     boolean not null,
  newpoint_cited         boolean not null,
  cited_urls             text[] not null default '{}',
  competitors_mentioned  text[] not null default '{}'
);

create index geo_runs_prompt_run_at on marketing.geo_runs (prompt_id, run_at desc);
