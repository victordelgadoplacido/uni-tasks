import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AdminUser {
  id: string;
  email: string;
  createdAt: string;
  role: "user" | "admin";
}

// Throws unless the currently-signed-in user (from the cookie-scoped
// session, not the service-role client) is an admin. Call this before any
// admin-only operation — never rely solely on page-level route protection,
// since Server Actions can be invoked directly.
export async function assertIsAdmin(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Not authorized");
}

export async function listUsersWithRoles(): Promise<AdminUser[]> {
  await assertIsAdmin();

  const admin = createAdminClient();
  const [{ data: userList }, { data: profiles }] = await Promise.all([
    admin.auth.admin.listUsers(),
    admin.from("profiles").select("id, role"),
  ]);

  const roleById = new Map((profiles ?? []).map((p) => [p.id, p.role as "user" | "admin"]));

  return (userList?.users ?? [])
    .map((u) => ({
      id: u.id,
      email: u.email ?? "(no email)",
      createdAt: u.created_at,
      role: roleById.get(u.id) ?? "user",
    }))
    .sort((a, b) => a.email.localeCompare(b.email));
}
