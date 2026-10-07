-- newpoint-marketing: public reference data (non-PHI).
-- docs/automation-architecture.md §4 "public schema in newpoint-marketing".
--
-- Agents read confirmed facts from here and never invent them. Values are
-- copied from the site's lib/content.ts by a human; `confirmed = false` facts
-- are not to be published by any agent (CLAUDE.md "Never invent verifiable
-- regulated facts").

create table public.providers (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Legal name: what machine-readable surfaces use.
  name                 text not null check (length(name) between 1 and 200),
  -- Rendered name. Carries "Dr." only under the CLAUDE.md condition.
  display_name         text not null check (length(display_name) between 1 and 200),
  role                 text not null check (length(role) between 1 and 200),
  states_licensed      text[] not null default '{}'
                         check (states_licensed <@ array['NJ', 'PA']::text[]),
  scheduling_ref       text,
  -- null = not confirmed by the practice.
  accepts_new_patients boolean,
  created_at           timestamptz not null default now()
);

comment on table public.providers is
  'Public provider facts. name = legal name; display_name follows the CLAUDE.md "Dr." condition.';

create table public.practice_facts (
  key        text primary key check (key ~ '^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$'),
  value      jsonb not null,
  confirmed  boolean not null default false,
  source     text not null check (length(source) between 1 and 500),
  updated_at timestamptz not null default now()
);

comment on table public.practice_facts is
  'Key/value copy of confirmed practice facts (NAP, delivery line). confirmed = false must never be published.';
