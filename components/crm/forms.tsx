'use client';

import { useActionState, useId, useState } from 'react';
import { addNote, changePassword, decideReview, signIn, updateLead, type FormState } from '@/app/crm/actions';
import { CRM_BUTTON, CRM_FIELD, CRM_LABEL } from '@/lib/crm/classes';
import { LEAD_STATUSES, NOTE_MAX, REPLY_MAX, REPLY_RULES, STATUS_LABEL, type LeadStatus } from '@/lib/crm/model';

/*
 * React 19 resets a form after its action finishes, success or not. So a
 * failed action returns what was submitted in `state.values`, and the fields
 * use it as their defaultValue: the reset restores the user's input instead of
 * wiping it. A successful note returns no values, so that form comes back empty.
 */

const INITIAL: FormState = {};

/**
 * Errors are role="alert" and mount with the text. Confirmations go into a
 * status region that is ALWAYS in the tree: a live region inserted at the
 * moment of the update is not reliably announced.
 */
function FormMessage({ state, okText }: { state: FormState; okText?: string }) {
  return (
    <>
      {state.error && (
        <p role="alert" className="text-np-error text-sm">
          {state.error}
        </p>
      )}
      <p role="status" className="text-np-neutral-600 text-sm empty:hidden">
        {state.ok && okText ? okText : ''}
      </p>
    </>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, INITIAL);
  return (
    <form action={action} aria-busy={pending} className="space-y-5">
      <div>
        <label htmlFor="email" className={CRM_LABEL}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.values?.email ?? ''}
          className={`${CRM_FIELD} mt-2`}
        />
      </div>
      <div>
        <label htmlFor="password" className={CRM_LABEL}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={`${CRM_FIELD} mt-2`}
        />
      </div>
      <FormMessage state={state} />
      <button type="submit" className={`${CRM_BUTTON} w-full`}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

export function LeadUpdateForm({
  id,
  status,
  ownerId,
  staff,
}: {
  id: string;
  status: LeadStatus;
  ownerId: string | null;
  staff: readonly { user_id: string; display_name: string }[];
}) {
  const [state, action, pending] = useActionState(updateLead, INITIAL);
  return (
    <form action={action} aria-busy={pending} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <div>
        <label htmlFor="status" className={CRM_LABEL}>
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={state.values?.status ?? status}
          className={`${CRM_FIELD} mt-2`}
        >
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="owner" className={CRM_LABEL}>
          Owner
        </label>
        <select
          id="owner"
          name="owner"
          defaultValue={state.values?.owner ?? ownerId ?? ''}
          className={`${CRM_FIELD} mt-2`}
        >
          <option value="">Unassigned</option>
          {staff.map((s) => (
            <option key={s.user_id} value={s.user_id}>
              {s.display_name}
            </option>
          ))}
        </select>
      </div>
      <FormMessage state={state} okText="Saved." />
      <button type="submit" className={CRM_BUTTON}>
        {pending ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}

export function NoteForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(addNote, INITIAL);
  const hintId = useId();
  return (
    <form action={action} aria-busy={pending} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <label htmlFor="note" className={CRM_LABEL}>
        Add a note
      </label>
      <textarea
        id="note"
        name="body"
        rows={3}
        maxLength={NOTE_MAX}
        required
        defaultValue={state.values?.body ?? ''}
        aria-describedby={hintId}
        className={CRM_FIELD}
      />
      <p id={hintId} className="text-np-neutral-600 text-xs">
        Contact outcomes only, for example “Left a voicemail, try again Thursday.” No symptoms,
        diagnoses, medications or insurance numbers: clinical detail belongs in the patient record.
      </p>
      <FormMessage state={state} okText="Note added." />
      <button type="submit" className={CRM_BUTTON}>
        {pending ? 'Adding…' : 'Add note'}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, INITIAL);
  return (
    <form action={action} aria-busy={pending} className="space-y-5">
      {/* Lets password managers attach the new password to the right account. */}
      <input type="text" name="username" autoComplete="username" hidden readOnly />
      <div>
        <label htmlFor="password" className={CRM_LABEL}>
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          aria-describedby="password-hint"
          className={`${CRM_FIELD} mt-2`}
        />
        <p id="password-hint" className="text-np-neutral-600 mt-1.5 text-xs">
          At least 12 characters.
        </p>
      </div>
      <div>
        <label htmlFor="confirm" className={CRM_LABEL}>
          Confirm new password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          className={`${CRM_FIELD} mt-2`}
        />
      </div>
      <FormMessage state={state} />
      <button type="submit" className={CRM_BUTTON}>
        {pending ? 'Saving…' : 'Save password'}
      </button>
    </form>
  );
}

/**
 * Approve (with the reply as edited) or skip a drafted Google review reply, or
 * cancel one that is approved but not yet posted. The two decisions are equal
 * choices: same styling, and the page says skipping is always fine. The person
 * approving is the last check before the reply is public, so the enforced rules
 * sit beside the text. Success is a redirect, so no "saved" message lives here.
 */
export function ReviewDecisionForm({
  id,
  draft,
  mode,
  describedBy,
}: {
  id: string;
  draft: string;
  mode: 'decide' | 'cancel';
  /** The id of the review's heading, so each button says which review it acts on. */
  describedBy: string;
}) {
  const [state, action, pending] = useActionState(decideReview, INITIAL);
  const [clicked, setClicked] = useState<'approve' | 'skip' | null>(null);
  const replyId = useId();
  const rulesId = useId();
  const busy = pending ? clicked : null;
  const button = (decision: 'approve' | 'skip', label: string, busyLabel: string) => (
    <button
      type="submit"
      name="decision"
      value={decision}
      formNoValidate={decision === 'skip'}
      aria-disabled={pending}
      aria-describedby={describedBy}
      onClick={(event) => {
        if (pending) event.preventDefault();
        else setClicked(decision);
      }}
      className={CRM_BUTTON}
    >
      {busy === decision ? busyLabel : label}
    </button>
  );
  if (mode === 'cancel') {
    return (
      <form action={action} aria-busy={pending} className="space-y-3">
        <input type="hidden" name="id" value={id} />
        <FormMessage state={state} />
        {button('skip', 'Cancel, don’t post', 'Cancelling…')}
      </form>
    );
  }
  return (
    <form action={action} aria-busy={pending} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <div>
        <label htmlFor={replyId} className={CRM_LABEL}>
          Reply (edit if you like)
        </label>
        <textarea
          id={replyId}
          name="reply"
          rows={4}
          maxLength={REPLY_MAX}
          defaultValue={state.values?.reply ?? draft}
          aria-describedby={rulesId}
          className={`${CRM_FIELD} mt-2`}
        />
      </div>
      <div id={rulesId} className="text-np-neutral-700 text-sm">
        <p className="text-np-ink font-medium">Before approving, check the reply against every rule. Skipping is always fine.</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {REPLY_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-3">
        {button('approve', 'Approve and post', 'Saving…')}
        {button('skip', 'Skip, don’t reply', 'Saving…')}
      </div>
    </form>
  );
}
