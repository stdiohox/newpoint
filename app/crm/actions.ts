'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { crmAuthEnv, crmSupabase, requireStaff } from '@/lib/crm/supabase';
import { isLeadStatus, NOTE_MAX, UUID } from '@/lib/crm/model';

export interface FormState {
  error?: string;
  ok?: boolean;
  /** What was submitted, returned on failure so the form can restore it (see components/crm/forms.tsx). */
  values?: Record<string, string>;
}

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  if (!crmAuthEnv()) return { error: 'The CRM is not configured yet.' };
  const email = field(form, 'email').toLowerCase();
  const password = form.get('password');
  if (!email || typeof password !== 'string' || !password) {
    return { error: 'Enter your email and password.', values: { email } };
  }
  const supabase = await crmSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // One message for every failure: never say whether the email has an account.
  if (error) return { error: 'That email and password don’t match an account.', values: { email } };
  redirect('/crm');
}

export async function signOut(): Promise<void> {
  if (crmAuthEnv()) {
    const supabase = await crmSupabase();
    await supabase.auth.signOut();
  }
  redirect('/crm/login');
}

export async function updateLead(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireStaff();
  const id = field(form, 'id');
  const status = field(form, 'status');
  const owner = field(form, 'owner');
  const values = { status, owner };
  if (!UUID.test(id) || !isLeadStatus(status) || (owner !== '' && !UUID.test(owner))) {
    return { error: 'Something in that change wasn’t valid. Reload the page and try again.', values };
  }
  // .select() so a write that RLS or a deleted row turned into a no-op is caught,
  // rather than reported as saved.
  const { data, error } = await supabase
    .from('leads')
    .update({ status, owner_id: owner === '' ? null : owner })
    .eq('id', id)
    .select('id');
  if (error || !data || data.length !== 1) {
    return { error: 'The change wasn’t saved. Reload the page and try again.', values };
  }
  revalidatePath(`/crm/leads/${id}`);
  revalidatePath('/crm');
  return { ok: true, values };
}

export async function addNote(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireStaff();
  const id = field(form, 'id');
  const body = field(form, 'body');
  if (!UUID.test(id)) return { error: 'Reload the page and try again.', values: { body } };
  if (body.length < 1) return { error: 'Write a note first.' };
  if (body.length > NOTE_MAX) {
    return { error: `Notes can be up to ${NOTE_MAX.toLocaleString('en-US')} characters.`, values: { body } };
  }
  const { error } = await supabase.from('lead_activity').insert({ lead_id: id, kind: 'note', body });
  if (error) return { error: 'The note wasn’t saved. Try again.', values: { body } };
  revalidatePath(`/crm/leads/${id}`);
  return { ok: true };
}

export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireStaff({ allowPasswordChange: true });
  const password = form.get('password');
  const confirm = form.get('confirm');
  if (typeof password !== 'string' || password.length < 12) {
    return { error: 'Use at least 12 characters.' };
  }
  if (password !== confirm) return { error: 'The two passwords don’t match.' };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: 'The password wasn’t changed. Try a different one.' };
  const { error: flagError } = await supabase.rpc('password_changed');
  if (flagError) {
    return { error: 'Your password was changed, but setup didn’t finish. Sign in with the new password and try again.' };
  }
  redirect('/crm');
}
