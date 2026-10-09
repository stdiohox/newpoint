-- newpoint-phi: age captured at first contact (D18 follow-up). "Are you 18 or older?" on the
-- web form, in the first SMS exchange and at the start of a call. yes → 'adult', no → 'minor'
-- (staff callback, as before), no answer → stays 'unknown'.
--
-- Where an age status came from is recorded, and the automated paths can only answer an
-- UNKNOWN: a self-reported answer never overrides staff or an earlier answer.

alter table phi.contacts
  add column minor_status_source text check (minor_status_source is null or minor_status_source in ('web_form', 'sms', 'voice', 'staff')),
  add column minor_status_at timestamptz;

-- The web answer for an EXISTING contact waits on its phone code: applied only once the
-- visitor proves the number is theirs (edge/intake verify), like consent.
alter table phi.phone_verifications add column age_answer text check (age_answer is null or age_answer in ('yes', 'no'));
-- What the visitor answered on the form, kept on the inquiry for staff when it could not be
-- applied (an unproven number already on file).
alter table phi.inquiries add column age_answer text check (age_answer is null or age_answer in ('yes', 'no'));
grant select (age_answer) on phi.phone_verifications to phi_edge;

-- The edge (web intake, voice) may set an age, but only from 'unknown', and must say how.
grant update (minor_status, minor_status_source, minor_status_at) on phi.contacts to phi_edge;

-- Runtimes log in as members of phi_tasks / phi_edge and do NOT `set role`, so a trigger must
-- ask "is this session acting with that role's privileges", not compare current_user to its
-- name. True for the role itself or a login that inherits it (USAGE); never for a superuser,
-- nor for the migration owner (PG16+ gives a role's creator membership without inheritance).
create function phi.acts_as(role_name text) returns boolean language sql stable as $$
  select current_user = role_name
      or (pg_has_role(current_user, role_name, 'USAGE')
          and not coalesce((select rolsuper from pg_roles where rolname = current_user), false))
$$;
grant execute on function phi.acts_as(text) to phi_tasks, phi_edge, staff_console;

-- The Phase 6 guard had the same flaw (it compared current_user to 'phi_edge'): fixed here.
create or replace function phi.phone_verification_guard() returns trigger language plpgsql as $$
begin
  if phi.acts_as('phi_edge') then
    if new.attempts not in (old.attempts, old.attempts + 1) then
      raise exception 'attempts only go up by one' using errcode = '42501';
    end if;
    if new.code is not null and new.code is distinct from old.code then
      raise exception 'the edge cannot set a code' using errcode = '42501';
    end if;
  end if;
  return new;
end
$$;

-- Age rules for automated paths (web intake, SMS, voice):
--   - a "yes" (adult) only fills an UNKNOWN age;
--   - a "no" (minor) may replace an earlier self-reported answer, never a staff decision;
--   - the source must be named, and the audit columns never change on their own.
-- Staff (the console) may set any age; their change is recorded as 'staff'.
create function phi.minor_status_guard() returns trigger language plpgsql as $$
declare
  automated boolean := phi.acts_as('phi_edge') or phi.acts_as('phi_tasks');
begin
  if new.minor_status is not distinct from old.minor_status then
    if (new.minor_status_source is distinct from old.minor_status_source or new.minor_status_at is distinct from old.minor_status_at)
       and (automated or current_user = 'staff_console') then
      raise exception 'an age source changes only with the age' using errcode = '42501';
    end if;
    return new;
  end if;
  if current_user = 'staff_console' then
    new.minor_status_source := 'staff';
  elsif automated then
    if new.minor_status_source is null or new.minor_status_source = 'staff' then
      raise exception 'an automated age answer must say where it came from' using errcode = '23514';
    end if;
    if old.minor_status_source = 'staff' then
      raise exception 'an automated path never overrides a staff decision on age' using errcode = '42501';
    end if;
    if new.minor_status <> 'minor' and old.minor_status <> 'unknown' then
      raise exception 'an automated path can only answer an unknown age' using errcode = '42501';
    end if;
  elsif new.minor_status_source is not distinct from old.minor_status_source then
    -- The owner or an administrator changing it by hand: that is a staff decision.
    new.minor_status_source := 'staff';
  end if;
  new.minor_status_at := now();
  return new;
end
$$;
create trigger contacts_minor_status_guard before update on phi.contacts
  for each row execute function phi.minor_status_guard();
grant execute on function phi.minor_status_guard() to phi_tasks, phi_edge, staff_console;

-- The edge reads the status and its source only to apply the rules above (never names or numbers).
grant select (minor_status, minor_status_source) on phi.contacts to phi_edge;
