import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Append-only audit trail. Never put gift card codes or secrets in `details`. */
export async function writeAudit(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  details?: Record<string, unknown> | null,
) {
  const { error } = await createAdminClient().from("audit_logs").insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: details ?? null,
  });
  if (error) console.error("audit log write failed:", error.message);
}
