import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { CRM_BUTTON, CRM_CARD, CRM_FIELD, CrmHeader, StatusChip } from '@/components/crm/CrmChrome';
import { CONTACT } from '@/lib/content';
import { formatWhen, isLeadStatus, LEAD_STATUSES, STATUS_LABEL, type Lead, type LeadStatus } from '@/lib/crm/model';
import { requireStaff } from '@/lib/crm/supabase';

export const metadata: Metadata = { title: 'Leads' };

const PAGE_SIZE = 50;

type Search = { status?: string; reason?: string; q?: string; page?: string };
type RawSearch = Record<keyof Search, string | string[] | undefined>;

/** A repeated query param (?q=a&q=b) arrives as an array: take the first. */
function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Keeps filter links stable: only the params that are set, in one order. */
function href(params: Search): string {
  const qs = new URLSearchParams();
  for (const key of ['status', 'reason', 'q', 'page'] as const) {
    const value = params[key];
    if (value) qs.set(key, value);
  }
  const s = qs.toString();
  return s ? `/crm?${s}` : '/crm';
}

/**
 * PostgREST's `or` filter is a small expression language. Anything that could
 * change its meaning (commas, parentheses, wildcards, quotes) is removed rather
 * than escaped.
 */
function searchTerm(raw: string | undefined): string {
  return (raw ?? '').replace(/[^\p{L}\p{N}@.+\- ]/gu, '').trim().slice(0, 80);
}

export default async function CrmLeads({ searchParams }: { searchParams: Promise<Partial<RawSearch>> }) {
  const { supabase, staff } = await requireStaff();
  const raw = await searchParams;
  const params: Search = { status: one(raw.status), reason: one(raw.reason), q: one(raw.q), page: one(raw.page) };

  const status: LeadStatus | undefined = isLeadStatus(params.status) ? params.status : undefined;
  const reason = (CONTACT.reasons as readonly string[]).includes(params.reason ?? '') ? params.reason : undefined;
  const q = searchTerm(params.q);
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);

  let query = supabase
    .from('leads')
    .select('id, created_at, updated_at, name, email, phone, reason, status, owner_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status) query = query.eq('status', status);
  if (reason) query = query.eq('reason', reason);
  if (q) query = query.or(`name.ilike.*${q}*,email.ilike.*${q}*,phone.ilike.*${q}*`);

  const [leadsResult, staffResult, ...counts] = await Promise.all([
    query.returns<Lead[]>(),
    supabase.from('staff').select('user_id, display_name').returns<{ user_id: string; display_name: string }[]>(),
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    ...LEAD_STATUSES.map((s) => supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', s)),
  ]);

  // A failed read must not look like "no leads": throw, and the error page shows.
  // A page past the end is a PostgREST range error (416), shown as an empty page.
  const failed = [leadsResult, staffResult, ...counts].find((r) => r.error && r.status !== 416);
  if (failed) throw new Error('CRM read failed');

  const leads = leadsResult.data ?? [];
  const total = leadsResult.count ?? 0;
  const owners = new Map((staffResult.data ?? []).map((s) => [s.user_id, s.display_name]));
  const [allCount, ...statusCounts] = counts.map((c) => c.count ?? 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(status || reason || q);

  const tabs: { label: string; value?: LeadStatus; count: number }[] = [
    { label: 'All', count: allCount ?? 0 },
    ...LEAD_STATUSES.map((s, i) => ({ label: STATUS_LABEL[s], value: s, count: statusCounts[i] ?? 0 })),
  ];

  return (
    <>
      <CrmHeader staffName={staff.display_name} />
      <div id="main" tabIndex={-1} className="outline-hidden">
      <Container className="py-10 md:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-np-ink text-3xl font-semibold tracking-tight">Leads</h1>
            <p className="text-np-neutral-600 mt-1 text-sm">
              Enquiries from the website’s contact form, newest first. Times are Eastern.
            </p>
          </div>
        </div>

        <nav aria-label="Filter by status" className="mt-8 -mx-1 overflow-x-auto">
          <ul className="flex min-w-max gap-1 px-1">
            {tabs.map((tab) => {
              const current = tab.value === status;
              return (
                <li key={tab.label}>
                  <Link
                    href={href({ status: tab.value, reason, q: q || undefined })}
                    aria-current={current ? 'true' : undefined}
                    className={
                      'focus-visible:outline-np-ink inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm focus-visible:outline-2 ' +
                      (current
                        ? 'bg-np-ink text-white'
                        : 'text-np-neutral-700 hover:bg-np-neutral-100 hover:text-np-ink')
                    }
                  >
                    {tab.label}
                    <span className={current ? 'text-white/80' : 'text-np-neutral-600'}>{tab.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <form method="get" action="/crm" className="mt-4 flex flex-wrap items-end gap-3" role="search">
          {status && <input type="hidden" name="status" value={status} />}
          <div className="min-w-[14rem] flex-1">
            <label htmlFor="q" className="sr-only">
              Search name, email or phone
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Search name, email or phone"
              className={CRM_FIELD}
            />
          </div>
          <div>
            <label htmlFor="reason" className="sr-only">
              Reason
            </label>
            <select id="reason" name="reason" defaultValue={reason ?? ''} className={CRM_FIELD}>
              <option value="">Any reason</option>
              {CONTACT.reasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={CRM_BUTTON}>
            Filter
          </button>
          {filtered && (
            <Link href="/crm" className="text-np-ink text-sm underline underline-offset-4 hover:no-underline">
              Clear
            </Link>
          )}
        </form>

        <section aria-label="Leads" className={`${CRM_CARD} mt-6 overflow-hidden`}>
          {leads.length === 0 ? (
            <p className="text-np-neutral-600 px-6 py-16 text-center text-sm">
              {filtered ? 'No leads match these filters.' : 'No leads yet. New enquiries from the website appear here.'}
            </p>
          ) : (
            <ul className="divide-np-neutral-200 divide-y">
              {leads.map((lead) => (
                <li key={lead.id}>
                  <Link
                    href={`/crm/leads/${lead.id}`}
                    className="hover:bg-np-neutral-50 focus-visible:outline-np-ink grid gap-x-6 gap-y-1 px-5 py-4 focus-visible:outline-2 focus-visible:-outline-offset-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_auto_minmax(0,1fr)_auto] md:items-center"
                  >
                    <span className="min-w-0">
                      <span className="text-np-ink block truncate font-medium">{lead.name}</span>
                      <span className="text-np-neutral-600 block truncate text-sm">{lead.email}</span>
                    </span>
                    <span className="text-np-neutral-700 text-sm">{lead.reason}</span>
                    <span>
                      <StatusChip status={lead.status} />
                    </span>
                    <span className="text-np-neutral-600 text-sm">
                      {lead.owner_id ? (owners.get(lead.owner_id) ?? 'Former staff') : 'Unassigned'}
                    </span>
                    <time dateTime={lead.created_at} className="text-np-neutral-600 text-sm whitespace-nowrap">
                      {formatWhen(lead.created_at)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {pages > 1 && (
          <nav aria-label="Pages" className="mt-6 flex items-center justify-between text-sm">
            {page > 1 ? (
              <Link href={href({ status, reason, q: q || undefined, page: String(page - 1) })} className="underline underline-offset-4">
                Newer
              </Link>
            ) : (
              <span />
            )}
            <span className="text-np-neutral-600">
              Page {page} of {pages}
            </span>
            {page < pages ? (
              <Link href={href({ status, reason, q: q || undefined, page: String(page + 1) })} className="underline underline-offset-4">
                Older
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </Container>
      </div>
    </>
  );
}
