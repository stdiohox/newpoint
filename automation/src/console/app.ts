/**
 * The minimal staff console (docs/automation-architecture.md §7 Phase 5): callback
 * queue, crisis acknowledgment and resume, review exclusions and the pending-review
 * window, and setting a contact's age status (D18).
 *
 * D7 is open, so this is host-agnostic: a fetch-style handler,
 * `(Request) => Promise<Response>`, that any BAA-covered host can mount. It is not
 * deployed. Every response is no-store with a strict CSP; every POST must come from
 * the console's own origin; every write is a single conditional UPDATE that RLS can
 * veto (a role that may not act matches no rows and gets 403).
 */
import { authenticate, IDLE_COOKIE, TOKEN_COOKIE, type AuthConfig, type StaffSession } from "./auth.js";
import { auditReads, type ConsoleDb } from "./db.js";
import { html, type Html } from "./html.js";
import { PROVIDERS, provider } from "../domain/scheduling/providers.js";
import { fromLocal } from "../domain/scheduling/time.js";

export interface ConsoleDeps {
  readonly auth: AuthConfig;
  readonly db: ConsoleDb;
  readonly origin: string;
  readonly now: () => number;
}

const SECURITY_HEADERS = {
  "content-security-policy":
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  "cache-control": "no-store",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
} as const;

function page(status: number, body: Html, cookies: string | readonly string[] = []): Response {
  const headers = new Headers({ ...SECURITY_HEADERS, "content-type": "text/html; charset=utf-8" });
  for (const cookie of typeof cookies === "string" ? [cookies] : cookies) headers.append("set-cookie", cookie);
  const doc = html`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Newpoint staff console</title>
<style>body{font:15px/1.5 system-ui,sans-serif;margin:16px;max-width:960px}table{border-collapse:collapse;width:100%;margin-bottom:24px}td,th{border-bottom:1px solid #ccc;padding:6px;text-align:left}form{display:inline}</style></head><body>${body}</body></html>`;
  return new Response(doc.value, { status, headers });
}

function redirect(cookie: string): Response {
  const headers = new Headers({ ...SECURITY_HEADERS, location: "/" });
  headers.append("set-cookie", cookie);
  return new Response(null, { status: 303, headers });
}

const SIGN_IN_MESSAGES: Readonly<Record<string, string>> = {
  no_token: "Sign in through the practice's single sign-on.",
  invalid_token: "Your sign-in is not valid. Sign in again.",
  mfa_required: "Multi-factor sign-in is required.",
  no_role: "Your account has no staff console role.",
  idle_timeout: "Your session ended after 15 minutes without activity. Sign in again.",
};

const UUID = "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})";
const ROUTES: readonly { pattern: RegExp; action: Action }[] = [
  { pattern: new RegExp(`^/crisis/${UUID}/ack$`), action: "crisis_ack" },
  { pattern: new RegExp(`^/crisis/${UUID}/resume$`), action: "crisis_resume" },
  { pattern: new RegExp(`^/reviews/${UUID}/exclude$`), action: "review_exclude" },
  { pattern: new RegExp(`^/tickets/${UUID}/close$`), action: "ticket_close" },
  { pattern: new RegExp(`^/contacts/${UUID}/age$`), action: "contact_age" },
  { pattern: new RegExp(`^/tickets/${UUID}/appointment$`), action: "record_appointment" },
  { pattern: new RegExp(`^/appointments/${UUID}/outcome$`), action: "appointment_outcome" },
  { pattern: new RegExp(`^/appointments/${UUID}/logistics$`), action: "appointment_logistics" },
];
type Action =
  | "crisis_ack"
  | "crisis_resume"
  | "review_exclude"
  | "ticket_close"
  | "contact_age"
  | "record_appointment"
  | "appointment_outcome"
  | "appointment_logistics";

/** Forms here are one field at most. */
const MAX_BODY_BYTES = 2_048;

export function createConsole(deps: ConsoleDeps): (request: Request) => Promise<Response> {
  const handle = route(deps);
  return async (request) => {
    try {
      return await handle(request);
    } catch {
      // Database error text can quote row values: the host's default error page must never see it.
      return page(500, html`<p>Something went wrong. Nothing was changed. Try again, or call Koret if it keeps happening.</p>`);
    }
  };
}

function route(deps: ConsoleDeps): (request: Request) => Promise<Response> {
  return async (request) => {
    const now = deps.now();
    const url = new URL(request.url);
    const auth = await authenticate(deps.auth, request, now);
    if (!auth.ok) {
      return page(401, html`<h1>Staff console</h1><p>${SIGN_IN_MESSAGES[auth.reason] ?? "Sign in again."}</p>`, clearCookies());
    }
    const cookie = `${IDLE_COOKIE}=${auth.idleCookie}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=900`;

    if (request.method === "GET" && url.pathname === "/") return page(200, await queues(deps.db, auth.session), cookie);
    if (request.method !== "POST") return page(405, html`<p>Not allowed.</p>`, cookie);
    if (request.headers.get("origin") !== deps.origin) return page(403, html`<p>Refused: cross-origin request.</p>`, cookie);

    const route = ROUTES.map((r) => ({ action: r.action, id: r.pattern.exec(url.pathname)?.[1] })).find((r) => r.id !== undefined);
    if (route?.id === undefined) return page(404, html`<p>Not found.</p>`, cookie);
    const length = Number(request.headers.get("content-length") ?? "0");
    if (!Number.isFinite(length) || length > MAX_BODY_BYTES) return page(413, html`<p>Request too large.</p>`, cookie);
    const text = await request.text();
    if (Buffer.byteLength(text) > MAX_BODY_BYTES) return page(413, html`<p>Request too large.</p>`, cookie);
    const form = new URLSearchParams(text);
    const changed = await act(deps.db, auth.session, route.action, route.id, form);
    if (changed === "bad_input") return page(400, html`<p>Bad input.</p>`, cookie);
    if (!changed) return page(403, html`<p>That change is not allowed for your role, or it was already made. <a href="/">Back</a></p>`, cookie);
    return redirect(cookie);
  };
}

function clearCookies(): string[] {
  return [IDLE_COOKIE, TOKEN_COOKIE].map((name) => `${name}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
}

async function act(db: ConsoleDb, session: StaffSession, action: Action, id: string, form: URLSearchParams): Promise<boolean | "bad_input"> {
  return db.asStaff(session, async (q) => {
    switch (action) {
      case "crisis_ack": {
        // Paging stops here for good, so the follow-up is opened in the same step: a callback
        // the clinician owns, with the patient's name and number in the queue below.
        const acked = await q.query<{ contact_id: string }>(
          `update phi.crisis_events set staff_ack_at = now(), staff_ack_by = phi.staff_user() where id = $1 and staff_ack_at is null
           returning contact_id`, [id]);
        const contactId = acked.rows[0]?.contact_id;
        if (contactId === undefined) return false;
        await q.query(
          `insert into phi.tickets (contact_id, kind, source_kind, source_id) values ($1, 'crisis_follow_up', 'crisis_event', $2)
           on conflict (kind, source_kind, source_id) where status in ('open', 'in_progress') do nothing`,
          [contactId, id]);
        return true;
      }
      case "crisis_resume":
        return rows(await q.query(
          `update phi.crisis_events set sequences_resumed_at = now(), resumed_by = phi.staff_user()
            where id = $1 and staff_ack_at is not null and sequences_resumed_at is null`, [id]));
      case "review_exclude": {
        const updated = await q.query<{ contact_id: string }>(
          `update phi.review_requests set status = 'excluded' where id = $1 and status = 'pending_clinician_window' returning contact_id`, [id]);
        const contactId = updated.rows[0]?.contact_id;
        if (contactId === undefined) return false;
        await q.query(
          `insert into phi.review_exclusions (contact_id, set_by, reason_code) values ($1, phi.staff_user(), 'clinician_window') on conflict do nothing`,
          [contactId]);
        return true;
      }
      case "ticket_close":
        return rows(await q.query(
          `update phi.tickets set status = 'done', closed_at = now() where id = $1 and status in ('open', 'in_progress')`, [id]));
      case "contact_age": {
        const value = form.get("minor_status");
        if (value !== "adult" && value !== "minor" && value !== "unknown") return "bad_input";
        return rows(await q.query(`update phi.contacts set minor_status = $2 where id = $1`, [id, value]));
      }
      case "record_appointment": {
        // manual-queue (D1): staff booked it in the real system; this records it so reminders run.
        const who = provider(form.get("provider") ?? "");
        const startsAt = fromLocal(form.get("date") ?? "", form.get("time") ?? "");
        const modality = form.get("modality");
        if (who === undefined || startsAt === null || (modality !== "in_person" && modality !== "telehealth")) return "bad_input";
        if (startsAt.getTime() <= Date.now() || startsAt.getTime() > Date.now() + 366 * 86_400_000) return "bad_input";
        const ticket = await q.query<{ contact_id: string | null; source_kind: string | null; source_id: string | null }>(
          `select contact_id, source_kind, source_id from phi.tickets where id = $1 and kind = 'booking' and status in ('open', 'in_progress') for update`,
          [id],
        );
        const t = ticket.rows[0];
        if (t === undefined || t.contact_id === null) return false;
        const requestId = t.source_kind === "booking_request" ? t.source_id : null;
        await q.query(
          `insert into phi.appointments (contact_id, provider_id, external_ref, adapter, starts_at, modality, source_booking_request_id, recorded_by)
           values ($1, $2, gen_random_uuid()::text, 'manual-queue', $3, $4, $5, phi.staff_user())`,
          [t.contact_id, who.id, startsAt, modality, requestId],
        );
        if (requestId !== null) await q.query(`update phi.booking_requests set status = 'booked' where id = $1`, [requestId]);
        await q.query(`update phi.tickets set status = 'done', closed_at = now() where id = $1`, [id]);
        return true;
      }
      case "appointment_outcome": {
        const status = form.get("status");
        if (status !== "completed" && status !== "no_show" && status !== "cancelled") return "bad_input";
        // A visit not yet started can only be cancelled (the database enforces this too).
        return rows(await q.query(
          `update phi.appointments set status = $2::phi.appointment_status
            where id = $1 and status = 'scheduled' and ($2::text = 'cancelled' or starts_at <= now())`,
          [id, status]));
      }
      case "appointment_logistics": {
        // One non-clinical logistics text (forms, video link); booking.sync sends it through send-sms.
        const appt = await q.query<{ contact_id: string }>(`select contact_id from phi.appointments where id = $1 and status = 'completed'`, [id]);
        const contactId = appt.rows[0]?.contact_id;
        if (contactId === undefined) return false;
        // A repeat click is a harmless no-op, not an error: one text per visit (unique follow-up).
        await q.query(
          `insert into phi.follow_ups (contact_id, kind, step, due_at, source_id) values ($1, 'post_visit_logistics', 0, now(), $2)
           on conflict (kind, source_id, step) where source_id is not null do nothing`,
          [contactId, id]);
        return true;
      }
    }
  });
}

const rows = (result: { rowCount: number | null }): boolean => (result.rowCount ?? 0) > 0;

interface CrisisRow {
  id: string; contact_id: string | null; detected_at: Date; page_count: number; staff_ack_at: Date | null; channel: string;
  first_name: string | null; last_name: string | null; phone_e164: string | null;
}

/** Practice-local time, as staff read it. */
const ET = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" });
const et = (at: Date): string => `${ET.format(at)} ET`;
interface TicketRow { id: string; kind: string; created_at: Date; contact_id: string | null; first_name: string | null; phone_e164: string | null; minor_status: string | null }
interface ReviewRow { id: string; contact_id: string; scheduled_for: Date; first_name: string | null }
interface AppointmentRow { id: string; contact_id: string; provider_id: string; starts_at: Date; modality: string | null; status: string; first_name: string | null }

const today = (): string => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());

async function queues(db: ConsoleDb, session: StaffSession): Promise<Html> {
  const isClinician = session.role === "staff_clinician";
  return db.asStaff(session, async (q) => {
    const crises = (await q.query<CrisisRow>(
      `select e.id, e.contact_id, e.detected_at, e.page_count, e.staff_ack_at, e.channel::text as channel,
              c.first_name, c.last_name, c.phone_e164
         from phi.crisis_events e left join phi.contacts c on c.id = e.contact_id
        where e.staff_ack_at is null or e.sequences_resumed_at is null order by e.detected_at limit 100`)).rows;
    const tickets = (await q.query<TicketRow>(
      `select t.id, t.kind::text as kind, t.created_at, t.contact_id, c.first_name, c.phone_e164, c.minor_status::text as minor_status
         from phi.tickets t left join phi.contacts c on c.id = t.contact_id
        where t.status in ('open', 'in_progress') order by t.created_at limit 200`)).rows;
    const reviews = (await q.query<ReviewRow>(
      `select r.id, r.contact_id, r.scheduled_for, c.first_name from phi.review_requests r join phi.contacts c on c.id = r.contact_id
        where r.status = 'pending_clinician_window' order by r.scheduled_for limit 200`)).rows;

    const appointments = (await q.query<AppointmentRow>(
      `select a.id, a.contact_id, a.provider_id, a.starts_at, a.modality::text as modality, a.status::text as status, c.first_name
         from phi.appointments a join phi.contacts c on c.id = a.contact_id
        where a.starts_at between now() - interval '7 days' and now() + interval '30 days' order by a.starts_at limit 300`)).rows;
    await auditReads(q, "appointments", appointments.map((r) => r.id));
    await auditReads(q, "crisis_events", crises.map((r) => r.id));
    await auditReads(q, "tickets", tickets.map((r) => r.id));
    await auditReads(q, "review_requests", reviews.map((r) => r.id));
    await auditReads(q, "contacts", [
      ...new Set([...(isClinician ? crises.flatMap((r) => (r.contact_id === null ? [] : [r.contact_id])) : []), ...tickets.flatMap((r) => (r.contact_id === null ? [] : [r.contact_id])), ...reviews.map((r) => r.contact_id), ...appointments.map((r) => r.contact_id)]),
    ]);

    const button = (action: string, label: string, extra?: Html) =>
      html`<form method="post" action="${action}">${extra}<button type="submit">${label}</button></form>`;
    // manual-queue: the booking made in the real system, recorded here so reminders and sync run.
    const recordForm = (ticketId: string) =>
      html`<form method="post" action="/tickets/${ticketId}/appointment"><label>Provider <select name="provider" required>${PROVIDERS.map(
        (p) => html`<option value="${p.id}">${p.smsName}</option>`,
      )}</select></label> <label>Date <input type="date" name="date" min="${today()}" required></label> <label>Time (ET) <input type="time" name="time" required></label> <label>How <select name="modality"><option value="telehealth">telehealth</option><option value="in_person">in person</option></select></label> <button type="submit">Record appointment</button></form>`;

    return html`<h1>Staff console</h1><p>Signed in as ${session.sub} (${session.role === "staff_clinician" ? "clinician" : "admin"}).</p>
<h2>Crisis events</h2>
<p>Acknowledging stops the pages and opens a crisis follow-up callback in the queue below.</p>
<table><tr><th>Detected</th><th>Patient</th><th>Phone</th><th>Via</th><th>Pages</th><th>Status</th><th></th></tr>${crises.map((c) => html`<tr><td>${et(c.detected_at)}</td><td>${isClinician ? (c.contact_id === null ? "caller withheld their number" : [c.first_name, c.last_name].filter(Boolean).join(" ") || "(no name)") : "clinician only"}</td><td>${isClinician ? c.phone_e164 : null}</td><td>${c.channel}</td><td>${c.page_count}</td><td>${c.staff_ack_at === null ? "NOT ACKNOWLEDGED" : "acknowledged, sequences paused"}</td><td>${
      !isClinician ? "clinician only" : c.staff_ack_at === null ? button(`/crisis/${c.id}/ack`, "Acknowledge") : button(`/crisis/${c.id}/resume`, "Resume sequences")
    }</td></tr>`)}</table>
<h2>Callbacks and tickets</h2>
<table><tr><th>Kind</th><th>Opened</th><th>Name</th><th>Phone</th><th>Age status</th><th></th></tr>${tickets.map((t) => html`<tr><td>${t.kind}</td><td>${et(t.created_at)}</td><td>${t.first_name}</td><td>${t.phone_e164}</td><td>${t.minor_status}${
      t.contact_id === null ? null : html` ${button(`/contacts/${t.contact_id}/age`, "Set", html`<select name="minor_status"><option value="unknown">unknown</option><option value="adult">adult</option><option value="minor">minor</option></select>`)}`
    }</td><td>${button(`/tickets/${t.id}/close`, "Close")}${t.kind === "booking" ? recordForm(t.id) : null}</td></tr>`)}</table>
<h2>Appointments (last 7 days, next 30)</h2>
<table><tr><th>When</th><th>Name</th><th>Provider</th><th>How</th><th>Status</th><th></th></tr>${appointments.map((a) => html`<tr><td>${et(a.starts_at)}</td><td>${a.first_name}</td><td>${provider(a.provider_id)?.smsName ?? a.provider_id}</td><td>${a.modality}</td><td>${a.status}</td><td>${
      a.status === "scheduled"
        ? html`${button(`/appointments/${a.id}/outcome`, "Completed", html`<input type="hidden" name="status" value="completed">`)}${button(`/appointments/${a.id}/outcome`, "No-show", html`<input type="hidden" name="status" value="no_show">`)}${button(`/appointments/${a.id}/outcome`, "Cancelled", html`<input type="hidden" name="status" value="cancelled">`)}`
        : a.status === "completed"
          ? button(`/appointments/${a.id}/logistics`, "Send forms / video-link help text")
          : null
    }</td></tr>`)}</table>
<h2>Review requests waiting in the clinician window</h2>
<table><tr><th>Name</th><th>Sends after</th><th></th></tr>${reviews.map((r) => html`<tr><td>${r.first_name}</td><td>${et(r.scheduled_for)}</td><td>${
      isClinician ? button(`/reviews/${r.id}/exclude`, "Do not send, exclude") : "clinician only"
    }</td></tr>`)}</table>`;
  });
}
