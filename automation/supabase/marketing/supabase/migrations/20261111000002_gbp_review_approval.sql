-- newpoint-marketing: Google review replies are approved in the CRM (docs/lead-crm.md,
-- "Google reviews"), not through n8n.
--
-- gbp.reply-drafter drafts a reply and emails staff once (alerted_at). Staff open
-- /crm/reviews, read the review beside the draft, edit it if they like, and
-- approve or skip it (crm.decide_review). gbp.reply-poster posts 'approved' rows,
-- re-checking Google and the reply rules first. Nothing is ever posted without
-- a staff decision, recorded with who and when.
--
-- The two crm.* functions are the only way the website reaches this table:
-- SECURITY DEFINER, gated by crm.is_staff(), callable by `authenticated`.

alter table marketing.gbp_reviews
  add column approved_reply text
    check (approved_reply is null or char_length(approved_reply) between 1 and 1000),
  -- md5 of the review text staff saw when approving; the poster refuses if it changed.
  add column approved_review_hash text,
  -- Who approved a public reply is never erased: deactivate staff, do not delete them.
  add column decided_by    uuid references crm.staff (user_id) on delete restrict,
  add column decided_at    timestamptz,
  add column alerted_at    timestamptz,
  add column post_attempts smallint not null default 0;

create index gbp_reviews_decided_by on marketing.gbp_reviews (decided_by);

-- Rows from the n8n era (none in production, but a migration must not assume):
-- an approval with no approved text goes back to waiting; nothing already drafted
-- triggers a fresh staff email.
update marketing.gbp_reviews set reply_status = 'awaiting_approval'
 where reply_status = 'approved' and approved_reply is null;
update marketing.gbp_reviews set alerted_at = now()
 where alerted_at is null and reply_status in ('drafted', 'awaiting_approval');

-- What staff see: every review the pipeline touched, those waiting first.
create function crm.review_queue()
returns table (
  id text, rating smallint, body text, reviewer text, created_at timestamptz,
  reply_status text, status_reason text, reply_draft text, approved_reply text,
  decided_by_name text, decided_at timestamptz, replied_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select r.google_review_id, r.rating, r.text, r.author_display, r.created_at,
         r.reply_status::text, r.status_reason, r.reply_draft, r.approved_reply,
         s.display_name, r.decided_at, r.replied_at
    from marketing.gbp_reviews r
    left join crm.staff s on s.user_id = r.decided_by
   where crm.is_staff()
     and r.reply_status <> 'none'
   order by (r.reply_status in ('drafted', 'awaiting_approval')) desc, r.created_at desc
   limit 200;
$$;

-- 'approve' with the (possibly edited) reply, or 'skip'. True when the review
-- moved; false when it was no longer waiting or the caller is not staff.
-- Approve is allowed while waiting, and again after a refusal staff can act on
-- (no draft passed, an edit broke a rule, a post failed, or they skipped it):
-- the reply still goes through the poster's checks. Never after a crisis flag or
-- when a reply already sits on Google. Skip is also allowed while 'approved', so
-- a mistaken approval can be cancelled before the poster's next run.
create function crm.decide_review(p_id text, p_decision text, p_reply text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reply text := nullif(btrim(regexp_replace(coalesce(p_reply, ''), '\s+', ' ', 'g')), '');
  v_rows  integer;
begin
  if not crm.is_staff() then
    return false;
  end if;
  if p_decision = 'approve' then
    if v_reply is null or char_length(v_reply) > 1000 then
      raise exception 'invalid_reply' using errcode = '22023';
    end if;
    update marketing.gbp_reviews
       set reply_status = 'approved', approved_reply = v_reply, reply_draft = v_reply,
           approved_review_hash = md5(coalesce(text, '')), post_attempts = 0,
           decided_by = (select auth.uid()), decided_at = now(), status_reason = null
     where google_review_id = p_id
       and not existing_reply
       and (reply_status in ('drafted', 'awaiting_approval')
            or (reply_status = 'rejected'
                and (status_reason in ('reply_failed_validator', 'staff_skipped', 'post_failed')
                     or status_reason like 'rule\_at\_post%')));
  elsif p_decision = 'skip' then
    update marketing.gbp_reviews
       set reply_status = 'rejected', decided_by = (select auth.uid()), decided_at = now(),
           status_reason = 'staff_skipped'
     where google_review_id = p_id
       and reply_status in ('drafted', 'awaiting_approval', 'approved');
  else
    raise exception 'invalid_decision' using errcode = '22023';
  end if;
  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

revoke all on function crm.review_queue() from public, anon, service_role;
revoke all on function crm.decide_review(text, text, text) from public, anon, service_role;
grant execute on function crm.review_queue() to authenticated;
grant execute on function crm.decide_review(text, text, text) to authenticated;
