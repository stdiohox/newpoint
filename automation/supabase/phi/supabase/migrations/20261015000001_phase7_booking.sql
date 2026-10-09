-- newpoint-phi Phase 7: booking (docs/automation-architecture.md §5.1, §5.5 no-show and
-- post-visit logistics, §7 Phase 7). D1 conservative default: manual-queue and
-- headway-handoff only; appointments are recorded by staff in the console.

-- What a request is for, so the slot policy can apply D19 and the new-patient rule.
alter table phi.booking_requests
  add column service text not null default 'unknown'
    check (service in ('assessment', 'medication_management', 'weight_management', 'unknown')),
  add column new_patient boolean,
  -- Why a request became a callback (a policy reason or an adapter error code): codes only.
  add column callback_reason text check (callback_reason is null or callback_reason ~ '^[a-z_]+$');

alter table phi.appointments
  add constraint appointments_provider check (provider_id in ('funmilayo-whitaker', 'anastasia-ofoegbu')),
  add column recorded_by text;

create index appointments_upcoming on phi.appointments (starts_at) where status = 'scheduled';
-- One appointment per booking request: a double-submitted console form cannot book twice.
create unique index appointments_one_per_request on phi.appointments (source_booking_request_id) where source_booking_request_id is not null;
create index appointments_contact on phi.appointments (contact_id, starts_at);
create index booking_requests_contact on phi.booking_requests (contact_id);
create index follow_ups_due on phi.follow_ups (due_at) where status = 'scheduled';

-- Console: staff record the appointment they booked in the real system (manual-queue),
-- mark its outcome, and may ask for one post-visit logistics text. Nothing else.
grant insert (contact_id, provider_id, external_ref, adapter, starts_at, modality, source_booking_request_id, recorded_by)
  on phi.appointments to staff_console;
grant update (status) on phi.appointments to staff_console;
grant insert (contact_id, kind, step, due_at, source_id) on phi.follow_ups to staff_console;
grant select on phi.follow_ups to staff_console;
grant update (status) on phi.booking_requests to staff_console;

create policy staff_record_appointment on phi.appointments for insert to staff_console
  with check (phi.staff_role() in ('staff_clinician', 'staff_admin') and adapter = 'manual-queue' and recorded_by = phi.staff_user()
              and starts_at > now());
create policy staff_appointment_outcome on phi.appointments for update to staff_console
  using (phi.staff_role() in ('staff_clinician', 'staff_admin')) with check (phi.staff_role() in ('staff_clinician', 'staff_admin'));
create policy staff_logistics on phi.follow_ups for insert to staff_console
  with check (phi.staff_role() in ('staff_clinician', 'staff_admin') and kind = 'post_visit_logistics' and step = 0
              and due_at <= now() + interval '1 minute'
              and exists (select 1 from phi.appointments a where a.id = source_id and a.contact_id = follow_ups.contact_id and a.status = 'completed'));
create policy staff_read on phi.follow_ups for select to staff_console using (phi.staff_role() in ('staff_clinician', 'staff_admin'));
-- Staff may only mark a request booked (by recording its appointment).
create policy staff_booking_status on phi.booking_requests for update to staff_console
  using (phi.staff_role() in ('staff_clinician', 'staff_admin') and status in ('pending', 'handed_off', 'callback'))
  with check (phi.staff_role() in ('staff_clinician', 'staff_admin') and status = 'booked');

-- An outcome, once marked, is final for the console (a no-show cannot quietly become completed),
-- and a visit that has not started yet can only be cancelled, never "completed" or "missed".
create function phi.appointment_outcome_guard() returns trigger language plpgsql as $$
begin
  if current_user = 'staff_console' and old.status <> 'scheduled' and new.status is distinct from old.status then
    raise exception 'appointment outcome is final' using errcode = '42501';
  end if;
  if current_user = 'staff_console' and new.status in ('completed', 'no_show') and old.starts_at > now() then
    raise exception 'a future visit can only be cancelled' using errcode = '42501';
  end if;
  return new;
end
$$;
create trigger appointments_outcome_guard before update on phi.appointments
  for each row execute function phi.appointment_outcome_guard();
grant execute on function phi.appointment_outcome_guard() to phi_tasks, phi_edge, staff_console;

-- One booking request per inbound text, so a retried messaging.inbound-sms opens no second one.
alter table phi.booking_requests add column source_message_id uuid unique references phi.messages (id);
