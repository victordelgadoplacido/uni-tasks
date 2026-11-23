import type { SupabaseClient } from "@supabase/supabase-js";
import { Module, ModuleMember, Subtask, Task, TaskActivity, TaskItem } from "@/lib/types";
import {
  ModuleMemberRow,
  ModuleRow,
  SubtaskRow,
  TaskActivityRow,
  TaskItemRow,
  TaskPlanRow,
  TaskRow,
  rowToModule,
  rowToModuleMember,
  rowToSubtask,
  rowToTask,
  rowToTaskActivity,
  rowToTaskItem,
} from "./mappers";

export interface TaskPageData {
  subtasks: Subtask[];
  items: TaskItem[];
  activity: TaskActivity[]; // newest first
  assigneeIds: string[];
}

// Everything on a task page besides the task row itself (which lives in
// AppDataProvider). Used by the route on first load and by TaskPage when a
// collaborator changes something.
export async function fetchTaskPageData(
  supabase: SupabaseClient,
  taskId: string
): Promise<TaskPageData> {
  const [subtaskResult, itemResult, activityResult, assigneeResult] = await Promise.all([
    supabase
      .from("subtasks")
      .select("*")
      .eq("task_id", taskId)
      .order("position")
      .order("created_at"),
    supabase
      .from("task_items")
      .select("*")
      .eq("task_id", taskId)
      .order("position")
      .order("created_at"),
    supabase
      .from("task_activity")
      .select("id, actor_id, action, details, created_at")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase.from("task_assignees").select("user_id").eq("task_id", taskId).order("added_at"),
  ]);

  return {
    subtasks: ((subtaskResult.data as SubtaskRow[] | null) ?? []).map(rowToSubtask),
    items: ((itemResult.data as TaskItemRow[] | null) ?? []).map(rowToTaskItem),
    activity: ((activityResult.data as TaskActivityRow[] | null) ?? []).map(rowToTaskActivity),
    assigneeIds: ((assigneeResult.data as { user_id: string }[] | null) ?? []).map(
      (r) => r.user_id
    ),
  };
}

export interface SharedData {
  modules: Module[];
  members: ModuleMember[];
  tasks: Task[];
}

// Everything that other module members can change: modules (own + shared),
// their members, and their tasks merged with this user's personal week
// plans. RLS limits each query to modules the user belongs to. Used by the
// layout on first load and by AppDataProvider when a live change arrives.
export async function fetchSharedData(supabase: SupabaseClient): Promise<SharedData> {
  const [moduleResult, memberResult, taskResult, planResult] = await Promise.all([
    supabase.from("modules").select("*").order("created_at"),
    supabase
      .from("module_members")
      .select("module_id, user_id, role, profiles(display_name)")
      .order("added_at"),
    supabase.from("tasks").select("*").order("created_at"),
    supabase.from("task_plans").select("task_id, planned_date, plan_order"),
  ]);

  const plans = new Map(
    ((planResult.data as TaskPlanRow[] | null) ?? []).map((p) => [p.task_id, p])
  );

  return {
    modules: ((moduleResult.data as ModuleRow[] | null) ?? []).map(rowToModule),
    members: ((memberResult.data as unknown as ModuleMemberRow[] | null) ?? []).map(
      rowToModuleMember
    ),
    tasks: ((taskResult.data as TaskRow[] | null) ?? []).map((row) =>
      rowToTask(row, plans.get(row.id))
    ),
  };
}
