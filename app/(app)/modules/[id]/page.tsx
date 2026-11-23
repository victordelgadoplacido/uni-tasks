import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ModulePage, { SubtaskProgress } from "@/components/ModulePage";

// The module and its tasks come from the shared AppDataProvider; only each
// task's subtask progress ("2/5") and assignees (avatars) are fetched here.
export default async function ModuleRoute({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [subtaskResult, assigneeResult] = await Promise.all([
    supabase
      .from("subtasks")
      .select("task_id, status, tasks!inner(module_id)")
      .eq("tasks.module_id", params.id),
    supabase
      .from("task_assignees")
      .select("task_id, user_id, tasks!inner(module_id)")
      .eq("tasks.module_id", params.id)
      .order("added_at"),
  ]);

  const progress: Record<string, SubtaskProgress> = {};
  for (const row of (subtaskResult.data as { task_id: string; status: string }[] | null) ?? []) {
    const p = (progress[row.task_id] ??= { done: 0, total: 0 });
    p.total += 1;
    if (row.status === "completed") p.done += 1;
  }

  const assignees: Record<string, string[]> = {};
  for (const row of (assigneeResult.data as { task_id: string; user_id: string }[] | null) ?? []) {
    (assignees[row.task_id] ??= []).push(row.user_id);
  }

  return (
    <ModulePage
      key={params.id}
      moduleId={params.id}
      subtaskProgress={progress}
      assignees={assignees}
    />
  );
}
