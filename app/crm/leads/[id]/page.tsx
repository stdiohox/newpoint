import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { CRM_CARD, CrmHeader, StatusChip } from '@/components/crm/CrmChrome';
import { LeadUpdateForm, NoteForm } from '@/components/crm/forms';
import { formatWhen, STATUS_LABEL, UUID, type Lead, type LeadActivity } from '@/lib/crm/model';
import { requireStaff } from '@/lib/crm/supabase';

export default async function CrmLead({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase, staff } = await requireStaff();

  const [leadResult, activityResult, staffResult] = await Promise.all([
    supabase
      .from('leads')
      .select('id, created_at, updated_at, name, email, phone, reason, status, owner_id')
      .eq('id', id)
      .maybeSingle<Lead>(),
    supabase
      .from('lead_activity')
      .select('id, at, actor_id, kind, from_status, to_status, owner_to, body')
      .eq('lead_id', id)
      .order('at', { ascending: false })
      .returns<LeadActivity[]>(),
    supabase
      .from('staff')
      .select('user_id, display_name, active')
      .order('display_name')
      .returns<{ user_id: string; display_name: string; active: boolean }[]>(),
  ]);

  const lead = leadResult.data;
  if (!lead) notFound();
  const people = staffResult.data ?? [];
  const name = (userId: string | null) =>
    userId ? (people.find((p) => p.user_id === userId)?.display_name ?? 'Former staff') : 'Website';

  function describe(entry: LeadActivity): string {
    switch (entry.kind) {
      case 'created':
        return 'Submitted the contact form';
      case 'status':
        return `Status: ${entry.from_status ? STATUS_LABEL[entry.from_status] : '—'} → ${entry.to_status ? STATUS_LABEL[entry.to_status] : '—'}`;
      case 'owner':
        return entry.owner_to ? `Assigned to ${name(entry.owner_to)}` : 'Unassigned';
      case 'note':
        return 'Note';
    }
  }

  return (
    <>
      <CrmHeader staffName={staff.display_name} />
      <Container className="py-10 md:py-14">
        <Link href="/crm" className="text-np-neutral-700 hover:text-np-ink text-sm underline underline-offset-4">
          All leads
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <h1 className="text-np-ink text-3xl font-semibold tracking-tight break-words">{lead.name}</h1>
          <StatusChip status={lead.status} />
        </div>
        <p className="text-np-neutral-600 mt-1 text-sm">
          Received <time dateTime={lead.created_at}>{formatWhen(lead.created_at)}</time> ET
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <section aria-labelledby="contact-heading" className={`${CRM_CARD} p-6`}>
              <h2 id="contact-heading" className="text-np-ink text-base font-semibold">
                Contact
              </h2>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-np-neutral-600">Email</dt>
                  <dd className="mt-1 break-all">
                    <a href={`mailto:${lead.email}`} className="text-np-ink underline underline-offset-4 hover:no-underline">
                      {lead.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-np-neutral-600">Phone</dt>
                  <dd className="mt-1">
                    {lead.phone ? (
                      <a
                        href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`}
                        className="text-np-ink underline underline-offset-4 hover:no-underline"
                      >
                        {lead.phone}
                      </a>
                    ) : (
                      <span className="text-np-neutral-600">Not given</span>
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-np-neutral-600">Reason</dt>
                  <dd className="text-np-ink mt-1">{lead.reason}</dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="history-heading" className={`${CRM_CARD} p-6`}>
              <h2 id="history-heading" className="text-np-ink text-base font-semibold">
                Notes and history
              </h2>
              <div className="mt-4">
                <NoteForm id={lead.id} />
              </div>
              <ol className="border-np-neutral-200 mt-6 space-y-5 border-t pt-6">
                {(activityResult.data ?? []).map((entry) => (
                  <li key={entry.id} className="text-sm">
                    <p className="text-np-neutral-600">
                      <span className="text-np-ink font-medium">{name(entry.actor_id)}</span>
                      {' · '}
                      <time dateTime={entry.at}>{formatWhen(entry.at)}</time>
                    </p>
                    <p className="text-np-neutral-700 mt-1">{describe(entry)}</p>
                    {entry.body && <p className="text-np-ink mt-1 whitespace-pre-wrap break-words">{entry.body}</p>}
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <aside aria-labelledby="pipeline-heading" className={`${CRM_CARD} h-fit p-6`}>
            <h2 id="pipeline-heading" className="text-np-ink text-base font-semibold">
              Pipeline
            </h2>
            <div className="mt-4">
              <LeadUpdateForm
                id={lead.id}
                status={lead.status}
                ownerId={lead.owner_id}
                staff={people.filter((p) => p.active || p.user_id === lead.owner_id)}
              />
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}
