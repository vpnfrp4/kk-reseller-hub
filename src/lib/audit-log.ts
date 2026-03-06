import { supabase } from "@/integrations/supabase/client";

/**
 * Log an admin action to the audit trail.
 */
export async function logAdminAction(params: {
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, any>;
  status?: "success" | "failure";
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("admin_audit_logs" as any).insert({
      admin_user_id: user.id,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId || null,
      details: params.details || {},
      status: params.status || "success",
    } as any);
  } catch (e) {
    console.error("Failed to log audit action:", e);
  }
}
