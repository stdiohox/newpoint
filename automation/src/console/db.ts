/**
 * Console queries run as staff_console with the signed-in user's verified claims, so
 * RLS (keyed on phi.staff_role()) decides what each person sees and may change, and
 * the audit triggers record phi.staff_user(). Every record shown is audited as a read.
 */
import type { Queryable } from "../lib/db-phi.js";
import type { StaffSession } from "./auth.js";

export interface ConsoleDb {
  asStaff<T>(session: StaffSession, fn: (q: Queryable) => Promise<T>): Promise<T>;
}

/** `connect` hands out a connection whose login role is a member of staff_console. */
export function consoleDb(connect: () => Promise<Queryable & { release?: (destroy?: boolean) => void }>): ConsoleDb {
  return {
    async asStaff(session, fn) {
      const client = await connect();
      let broken = false;
      try {
        await client.query("begin");
        try {
          await client.query("set local role staff_console");
          await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(session.claims)]);
          const result = await fn(client);
          await client.query("commit");
          return result;
        } catch (error) {
          try {
            await client.query("rollback");
          } catch {
            broken = true;
          }
          throw error;
        }
      } finally {
        client.release?.(broken);
      }
    },
  };
}

export async function auditReads(q: Queryable, entity: string, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  await q.query(
    `insert into phi.audit_log (actor, action, entity, entity_id) select phi.actor(), 'read', $1, unnest($2::text[])`,
    [entity, ids],
  );
}
