import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TaskPage from "@/components/TaskPage";
import {
  SubtaskRow,
  TaskItemRow,
  rowToSubtask,
  rowToTaskItem,
} from "@/lib/supabase/mappers";

// The task itself comes from the shared AppDataProvider (already loaded by
// the layout); only this page's subtasks and items are fetched here.
export default async function TaskRoute({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [subtaskResult, itemResult] = await Promise.all([
    supabase
      .from("subtasks")
      .select("*")
      .eq("task_id", params.id)
      .order("position")
      .order("created_at"),
    supabase
      .from("task_items")
      .select("*")
      .eq("task_id", params.id)
      .order("position")
      .order("created_at"),
  ]);

  return (
    <TaskPage
      key={params.id}
      taskId={params.id}
      userId={user.id}
      initialSubtasks={((subtaskResult.data as SubtaskRow[] | null) ?? []).map(rowToSubtask)}
      initialItems={((itemResult.data as TaskItemRow[] | null) ?? []).map(rowToTaskItem)}
    />
  );
}
