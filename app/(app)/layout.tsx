import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppDataProvider } from "@/app/providers";
import NavTabs from "@/components/NavTabs";
import ProfileButton from "@/components/ProfileButton";
import SignOutButton from "@/components/SignOutButton";
import { fetchSharedData } from "@/lib/supabase/queries";
import {
  RoutineCompletionRow,
  RoutineRow,
  groupCompletions,
  rowToRoutine,
} from "@/lib/supabase/mappers";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profileResult, shared, routineResult, completionResult] = await Promise.all([
    supabase.from("profiles").select("role, display_name").eq("id", user.id).single(),
    fetchSharedData(supabase),
    supabase.from("routines").select("*").order("created_at"),
    supabase.from("routine_completions").select("*"),
  ]);

  const routines = ((routineResult.data as RoutineRow[] | null) ?? []).map(rowToRoutine);
  const routineCompletions = groupCompletions(
    (completionResult.data as RoutineCompletionRow[] | null) ?? []
  );
  const isAdmin = profileResult.data?.role === "admin";
  const currentUser = {
    id: user.id,
    displayName: profileResult.data?.display_name || user.email?.split("@")[0] || "Me",
  };

  return (
    <AppDataProvider
      currentUser={currentUser}
      initialModules={shared.modules}
      initialMembers={shared.members}
      initialTasks={shared.tasks}
      initialRoutines={routines}
      initialRoutineCompletions={routineCompletions}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Uni Tasks
          </h1>
          <div className="flex items-center gap-3">
            <NavTabs isAdmin={isAdmin} />
            <ProfileButton />
            <SignOutButton />
          </div>
        </header>
        <main>{children}</main>
      </div>
    </AppDataProvider>
  );
}
