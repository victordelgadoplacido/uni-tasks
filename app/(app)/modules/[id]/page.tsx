import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ModulePage, { SubtaskProgress } from "@/components/ModulePage";

// The module and its tasks come from the shared AppDataProvider; only each
// task's subtask progress (for the "2/5" badges) is fetched here.
export default async function ModuleRoute({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("subtasks")
    .select("task_id, status, tasks!inner(module_id)")
    .eq("tasks.module_id", params.id);

  const progress: Record<string, SubtaskProgress> = {};
  for (const row of (data as { task_id: string; status: string }[] | null) ?? []) {
    const p = (progress[row.task_id] ??= { done: 0, total: 0 });
    p.total += 1;
    if (row.status === "completed") p.done += 1;
  }

  return <ModulePage key={params.id} moduleId={params.id} subtaskProgress={progress} />;
}
