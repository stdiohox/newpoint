'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { crmAuthEnv, crmSupabase, requireStaff } from '@/lib/crm/supabase';
import { isLeadStatus, UUID } from '@/lib/crm/model';

export interface FormState {
  error?: string;
  ok?: boolean;
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
    return { error: 'Enter your email and password.' };
  }
  const supabase = await crmSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // One message for every failure: never say whether the email has an account.
  if (error) return { error: 'That email and password don’t match an account.' };
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
  if (!UUID.test(id) || !isLeadStatus(status) || (owner !== '' && !UUID.test(owner))) {
    return { error: 'Something in that change wasn’t valid. Reload the page and try again.' };
  }
  const { error } = await supabase
    .from('leads')
    .update({ status, owner_id: owner === '' ? null : owner })
    .eq('id', id);
  if (error) return { error: 'The change wasn’t saved. Try again.' };
  revalidatePath(`/crm/leads/${id}`);
  revalidatePath('/crm');
  return { ok: true };
}

export async function addNote(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireStaff();
  const id = field(form, 'id');
  const body = field(form, 'body');
  if (!UUID.test(id)) return { error: 'Reload the page and try again.' };
  if (body.length < 1) return { error: 'Write a note first.' };
  if (body.length > 2000) return { error: 'Notes can be up to 2,000 characters.' };
  const { error } = await supabase.from('lead_activity').insert({ lead_id: id, kind: 'note', body });
  if (error) return { error: 'The note wasn’t saved. Try again.' };
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
  await supabase.rpc('password_changed');
  redirect('/crm');
}
