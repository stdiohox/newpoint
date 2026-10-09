-- newpoint-phi Phase 9: review requests and the metrics push (docs/automation-architecture.md
-- §5.4, §5.9 ops.aggregate-metrics, §7 Phase 9).

-- Why a request did not go out, as a code (an eligibility rule or a send refusal).
alter table phi.review_requests add column skip_reason text check (skip_reason is null or skip_reason ~ '^[a-z][a-z0-9_]*$');
create index review_requests_contact_sent on phi.review_requests (contact_id, sent_at) where sent_at is not null;
create index crisis_events_contact_time on phi.crisis_events (contact_id, detected_at);

-- Review-request consent is captured by staff in the console when a patient says yes
-- (D14/D20: no other capture point exists yet). Staff record it as themselves.
-- Staff can also record a withdrawal. Neither can be backdated: the time must be now.
grant insert (contact_id, kind, granted_at, revoked_at, source, evidence) on phi.consents to staff_console;
create policy staff_review_consent on phi.consents for insert to staff_console
  with check (phi.staff_role() in ('staff_clinician', 'staff_admin') and kind = 'review_requests' and source = 'staff'
              and coalesce(granted_at, revoked_at) between now() - interval '1 minute' and now() + interval '1 minute'
              and evidence ->> 'recorded_by' = phi.staff_user()
              and evidence ->> 'captured' in ('in_person', 'phone', 'patient_withdrew'));
