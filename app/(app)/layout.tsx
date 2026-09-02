import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppDataProvider } from "@/app/providers";
import NavTabs from "@/components/NavTabs";
import SignOutButton from "@/components/SignOutButton";
import {
  ModuleRow,
  RoutineCompletionRow,
  RoutineRow,
  TaskRow,
  groupCompletions,
  rowToModule,
  rowToRoutine,
  rowToTask,
} from "@/lib/supabase/mappers";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profileResult, moduleResult, taskResult, routineResult, completionResult] =
    await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).single(),
      supabase.from("modules").select("*").order("created_at"),
      supabase.from("tasks").select("*").order("created_at"),
      supabase.from("routines").select("*").order("created_at"),
      supabase.from("routine_completions").select("*"),
    ]);

  const modules = ((moduleResult.data as ModuleRow[] | null) ?? []).map(rowToModule);
  const tasks = ((taskResult.data as TaskRow[] | null) ?? []).map(rowToTask);
  const routines = ((routineResult.data as RoutineRow[] | null) ?? []).map(rowToRoutine);
  const routineCompletions = groupCompletions(
    (completionResult.data as RoutineCompletionRow[] | null) ?? []
  );
  const isAdmin = profileResult.data?.role === "admin";

  return (
    <AppDataProvider
      userId={user.id}
      initialModules={modules}
      initialTasks={tasks}
      initialRoutines={routines}
      initialRoutineCompletions={routineCompletions}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Uni Tasks
          </h1>
          <div className="flex items-center gap-3">
            <NavTabs isAdmin={isAdmin} />
            <SignOutButton />
          </div>
        </header>
        <main>{children}</main>
      </div>
    </AppDataProvider>
  );
}
