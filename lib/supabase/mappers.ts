import { Module, Task, Routine, Subtask, TaskItem } from "@/lib/types";

// Row shapes from supabase/migrations/0001_init.sql. Keeping these mappers in
// one place means snake_case DB columns never leak past the data layer
// (app/providers.tsx and app/(app)/layout.tsx) into components.

export interface ModuleRow {
  id: string;
  name: string;
  color: Module["color"];
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
  planned_date: string | null;
  plan_order: number;
  module_order: number;
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
  return { id: row.id, name: row.name, color: row.color };
}

export function moduleToRow(m: Omit<Module, "id">, userId: string) {
  return { name: m.name, color: m.color, user_id: userId };
}

export function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    moduleId: row.module_id,
    title: row.title,
    notes: row.notes,
    dueDate: row.due_date,
    done: row.done,
    status: row.status,
    priority: row.priority,
    plannedDate: row.planned_date,
    planOrder: row.plan_order,
    moduleOrder: row.module_order,
  };
}

export function taskToRow(t: Omit<Task, "id">, userId: string) {
  return {
    module_id: t.moduleId,
    title: t.title,
    notes: t.notes,
    due_date: t.dueDate,
    done: t.done,
    status: t.status,
    priority: t.priority,
    planned_date: t.plannedDate,
    plan_order: t.planOrder,
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
  if ("plannedDate" in changes) row.planned_date = changes.plannedDate;
  if ("planOrder" in changes) row.plan_order = changes.planOrder;
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
