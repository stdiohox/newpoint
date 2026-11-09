'use client';

import { useActionState, useEffect, useId, useRef } from 'react';
import { addNote, changePassword, signIn, updateLead, type FormState } from '@/app/crm/actions';
import { LEAD_STATUSES, STATUS_LABEL, type LeadStatus } from '@/lib/crm/model';
import { CRM_BUTTON, CRM_FIELD, CRM_LABEL } from './CrmChrome';

const INITIAL: FormState = {};

function FormMessage({ state, okText }: { state: FormState; okText?: string }) {
  if (state.error) {
    return (
      <p role="alert" className="text-np-error text-sm">
        {state.error}
      </p>
    );
  }
  if (state.ok && okText) {
    return (
      <p role="status" className="text-np-neutral-600 text-sm">
        {okText}
      </p>
    );
  }
  return null;
}

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, INITIAL);
  return (
    <form action={action} aria-busy={pending} className="space-y-5">
      <div>
        <label htmlFor="email" className={CRM_LABEL}>
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className={`${CRM_FIELD} mt-2`} />
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
        <select id="status" name="status" defaultValue={status} className={`${CRM_FIELD} mt-2`}>
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
        <select id="owner" name="owner" defaultValue={ownerId ?? ''} className={`${CRM_FIELD} mt-2`}>
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
  const formRef = useRef<HTMLFormElement>(null);
  const hintId = useId();
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} aria-busy={pending} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <label htmlFor="note" className={CRM_LABEL}>
        Add a note
      </label>
      <textarea
        id="note"
        name="body"
        rows={3}
        maxLength={2000}
        required
        aria-describedby={hintId}
        className={CRM_FIELD}
      />
      <p id={hintId} className="text-np-neutral-600 text-xs">
        Contact outcomes and next steps, for example “Left a voicemail, try again Thursday.”
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
