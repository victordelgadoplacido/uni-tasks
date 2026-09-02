import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listUsersWithRoles } from "@/lib/admin/users";
import AdminUserTable from "@/components/admin/AdminUserTable";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Defense in depth on top of middleware + listUsersWithRoles' own check:
  // a signed-in non-admin who hits this URL directly gets redirected here too.
  if (profile?.role !== "admin") redirect("/");

  const users = await listUsersWithRoles();

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Users</h2>
      <p className="mb-4 text-sm text-slate-500">
        Admins can see who has an account and send them a password reset link.
        Real passwords are never visible here.
      </p>
      <AdminUserTable users={users} />
    </div>
  );
}
