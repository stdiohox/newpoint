-- newpoint-phi Phase 10: referral intake (docs/automation-architecture.md §5.5, §7 Phase 10).
-- D17: the clinician web form is the only intake path. D12: referrer-update is built but off.

alter table phi.referrals
  -- The extraction's urgency, as a code: urgent or high-risk referrals go straight to a clinician.
  add column urgency text check (urgency is null or urgency in ('routine', 'urgent', 'high_risk')),
  -- Why extraction did not produce values (model refusal, invalid output), as a code.
  add column extraction_error text check (extraction_error is null or extraction_error ~ '^[a-z_]+$'),
  -- D16: set once retention periods are decided; ops.retention-sweep removes the document after it.
  add column purge_after timestamptz,
  add column reviewed_by text,
  add column reviewed_at timestamptz;
create index referrals_review on phi.referrals (received_at) where status in ('received', 'extracted', 'needs_review');
create index referrals_purge on phi.referrals (purge_after) where document_path is not null and purge_after is not null;

-- Edge: the form inserts the referral row (already granted) and reads back its id only.
grant select (id) on phi.referrals to phi_edge;

-- Tasks clear the document path when the retention sweep removes the file.
-- (phi_tasks already has select, insert, update on phi.referrals.)

-- Console: staff confirm or reject a referral after reading the document and the extracted
-- values. Confirming creates the patient's contact with NO consent (§5.5: a referral contact's
-- first contact is a staff call, never an automated text) and opens that callback.
grant update (status, contact_id, reviewed_by, reviewed_at) on phi.referrals to staff_console;
-- An urgent, high-risk or unread (null urgency) referral is a clinician's decision: an admin
-- can neither confirm nor reject it.
create policy staff_review_referral on phi.referrals for update to staff_console
  using (status in ('received', 'extracted', 'needs_review')
         and (phi.staff_role() = 'staff_clinician' or (phi.staff_role() = 'staff_admin' and urgency = 'routine')))
  with check (status in ('confirmed', 'rejected') and reviewed_by = phi.staff_user()
              and (phi.staff_role() = 'staff_clinician' or (phi.staff_role() = 'staff_admin' and urgency = 'routine')));

grant insert (first_name, last_name, phone_e164, email, state) on phi.contacts to staff_console;
create policy staff_referral_contact on phi.contacts for insert to staff_console
  with check (phi.staff_role() in ('staff_clinician', 'staff_admin'));

-- Confirming opens the follow-up: a callback for a routine referral, a clinician review for an
-- urgent one (only a clinician can confirm those).
create policy staff_referral_callback on phi.tickets for insert to staff_console
  with check ((phi.staff_role() in ('staff_clinician', 'staff_admin') and kind = 'callback' and source_kind = 'referral')
              or (phi.staff_role() = 'staff_clinician' and kind = 'clinician_review' and source_kind = 'referral_confirmed'));
