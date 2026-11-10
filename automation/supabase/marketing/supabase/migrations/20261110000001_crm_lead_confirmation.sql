-- newpoint-marketing: confirmation email to the lead (docs/lead-crm.md).
--
-- When a lead is stored, the person who filled in the form gets an email saying
-- their details were received. A "New patient inquiry" also gets the link to the
-- new-patient intake form (a PDF to complete and bring to the first
-- appointment); the other reasons get the receipt only.
--
-- Same at-least-once shape as the staff alert: claim, send, mark; a claim that
-- was not sent is released without spending an attempt; 5 attempts at most.
-- Only leads from the last 2 days are claimable, so a confirmation never
-- arrives days late, and every lead stored before this migration counts as
-- done (none of them was promised an email).
--
-- The claim returns the lead's id, name (the task greets by first name), email
-- address and reason: the confirmation has to be addressed to someone. Still
-- crm_alerts only. No partial index: the table is small, and an index on
-- "unconfirmed" would keep every lead that aged out of the window.

alter table crm.leads
  add column confirm_claimed_at timestamptz,
  add column confirmed_at       timestamptz,
  add column confirm_attempts   smallint not null default 0;

update crm.leads set confirmed_at = created_at where confirmed_at is null;

create function crm.claim_lead_confirmations(p_limit integer default 20)
returns table (id uuid, name text, email text, reason text)
language sql
security definer
set search_path = ''
as $$
  update crm.leads l
     set confirm_claimed_at = now(),
         confirm_attempts = l.confirm_attempts + 1
   where l.id in (
           select c.id from crm.leads c
            where c.confirmed_at is null
              and c.confirm_attempts < 5
              and c.created_at > now() - interval '2 days'
              and (c.confirm_claimed_at is null or c.confirm_claimed_at < now() - interval '5 minutes')
            order by c.created_at
            limit greatest(1, least(p_limit, 100))
            for update skip locked)
  returning l.id, l.name, l.email, l.reason;
$$;

create function crm.mark_leads_confirmed(p_ids uuid[])
returns integer
language sql
security definer
set search_path = ''
as $$
  with marked as (
    update crm.leads l set confirmed_at = now()
     where l.id = any (p_ids) and l.confirmed_at is null
    returning 1)
  select count(*)::int from marked;
$$;

create function crm.release_lead_confirmations(p_ids uuid[])
returns integer
language sql
security definer
set search_path = ''
as $$
  with released as (
    update crm.leads l
       set confirm_claimed_at = null,
           confirm_attempts = greatest(l.confirm_attempts - 1, 0)
     where l.id = any (p_ids) and l.confirmed_at is null and l.confirm_claimed_at is not null
    returning 1)
  select count(*)::int from released;
$$;

-- Recent leads whose confirmation gave up after 5 attempts. The task logs an error while > 0.
create function crm.stuck_lead_confirmations()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from crm.leads l
   where l.confirmed_at is null and l.confirm_attempts >= 5
     and l.created_at > now() - interval '2 days';
$$;

revoke all on function crm.stuck_lead_confirmations() from public, anon, authenticated, service_role;
grant execute on function crm.stuck_lead_confirmations() to crm_alerts;
revoke all on function crm.claim_lead_confirmations(integer) from public, anon, authenticated, service_role;
revoke all on function crm.mark_leads_confirmed(uuid[]) from public, anon, authenticated, service_role;
revoke all on function crm.release_lead_confirmations(uuid[]) from public, anon, authenticated, service_role;
grant execute on function crm.claim_lead_confirmations(integer) to crm_alerts;
grant execute on function crm.mark_leads_confirmed(uuid[]) to crm_alerts;
grant execute on function crm.release_lead_confirmations(uuid[]) to crm_alerts;
