import {
  Module,
  ModuleMember,
  Task,
  TaskActivity,
  Routine,
  Subtask,
  TaskItem,
} from "@/lib/types";

// Row shapes from supabase/migrations/. Keeping these mappers in
// one place means snake_case DB columns never leak past the data layer
// (app/providers.tsx and app/(app)/layout.tsx) into components.

export interface ModuleRow {
  id: string;
  name: string;
  color: Module["color"];
  user_id: string;
}

// module_members embedded with the member's profile:
// .select("module_id, user_id, role, profiles(display_name)")
export interface ModuleMemberRow {
  module_id: string;
  user_id: string;
  role: ModuleMember["role"];
  profiles: { display_name: string } | null;
}

export interface TaskRow {
  id: string;
  module_id: string;
  title: string;
  notes: string;
  due_date: string | null;
  done: boolean;
  status: Task["status"];
  priority: Task["priority"];
  module_order: number;
}

// The current user's personal week plan for one task (task_plans table).
export interface TaskPlanRow {
  task_id: string;
  planned_date: string;
  plan_order: number;
}

export interface TaskActivityRow {
  id: number;
  actor_id: string | null;
  action: string;
  details: TaskActivity["details"];
  created_at: string;
}

export interface SubtaskRow {
  id: string;
  task_id: string;
  title: string;
  description: string;
  status: Subtask["status"];
  position: number;
}

export interface TaskItemRow {
  id: string;
  task_id: string;
  subtask_id: string | null;
  kind: TaskItem["kind"];
  label: string;
  content: string;
  position: number;
}

export interface RoutineRow {
  id: string;
  title: string;
}

export interface RoutineCompletionRow {
  routine_id: string;
  completed_date: string;
}

export function rowToModule(row: ModuleRow): Module {
  return { id: row.id, name: row.name, color: row.color, ownerId: row.user_id };
}

export function rowToModuleMember(row: ModuleMemberRow): ModuleMember {
  return {
    moduleId: row.module_id,
    userId: row.user_id,
    role: row.role,
    displayName: row.profiles?.display_name || "Unknown",
  };
}

export function rowToTask(row: TaskRow, plan?: TaskPlanRow): Task {
  return {
    id: row.id,
    moduleId: row.module_id,
    title: row.title,
    notes: row.notes,
    dueDate: row.due_date,
    done: row.done,
    status: row.status,
    priority: row.priority,
    plannedDate: plan?.planned_date ?? null,
    planOrder: plan?.plan_order ?? 0,
    moduleOrder: row.module_order,
  };
}

export function rowToTaskActivity(row: TaskActivityRow): TaskActivity {
  return {
    id: row.id,
    actorId: row.actor_id,
    action: row.action,
    details: row.details,
    createdAt: row.created_at,
  };
}

// plannedDate/planOrder live in task_plans, not tasks, so they're not here.
export function taskToRow(t: Omit<Task, "id">, userId: string) {
  return {
    module_id: t.moduleId,
    title: t.title,
    notes: t.notes,
    due_date: t.dueDate,
    done: t.done,
    status: t.status,
    priority: t.priority,
    module_order: t.moduleOrder,
    user_id: userId,
  };
}

export function taskChangesToRow(changes: Partial<Omit<Task, "id">>) {
  const row: Record<string, unknown> = {};
  if ("moduleId" in changes) row.module_id = changes.moduleId;
  if ("title" in changes) row.title = changes.title;
  if ("notes" in changes) row.notes = changes.notes;
  if ("dueDate" in changes) row.due_date = changes.dueDate;
  if ("done" in changes) row.done = changes.done;
  if ("status" in changes) row.status = changes.status;
  if ("priority" in changes) row.priority = changes.priority;
  if ("moduleOrder" in changes) row.module_order = changes.moduleOrder;
  return row;
}

export function rowToSubtask(row: SubtaskRow): Subtask {
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    description: row.description,
    status: row.status,
    position: row.position,
  };
}

export function subtaskChangesToRow(
  changes: Partial<Pick<Subtask, "title" | "description" | "status" | "position">>
) {
  const row: Record<string, unknown> = {};
  if ("title" in changes) row.title = changes.title;
  if ("description" in changes) row.description = changes.description;
  if ("status" in changes) row.status = changes.status;
  if ("position" in changes) row.position = changes.position;
  return row;
}

export function rowToTaskItem(row: TaskItemRow): TaskItem {
  return {
    id: row.id,
    taskId: row.task_id,
    subtaskId: row.subtask_id,
    kind: row.kind,
    label: row.label,
    content: row.content,
    position: row.position,
  };
}

export function rowToRoutine(row: RoutineRow): Routine {
  return { id: row.id, title: row.title };
}

export function groupCompletions(
  rows: RoutineCompletionRow[]
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const row of rows) {
    (out[row.completed_date] ??= []).push(row.routine_id);
  }
  return out;
}
