import { Module, Task, Routine } from "@/lib/types";

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
  priority: Task["priority"];
  planned_date: string | null;
  plan_order: number;
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
    priority: row.priority,
    plannedDate: row.planned_date,
    planOrder: row.plan_order,
  };
}

export function taskToRow(t: Omit<Task, "id">, userId: string) {
  return {
    module_id: t.moduleId,
    title: t.title,
    notes: t.notes,
    due_date: t.dueDate,
    done: t.done,
    priority: t.priority,
    planned_date: t.plannedDate,
    plan_order: t.planOrder,
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
  if ("priority" in changes) row.priority = changes.priority;
  if ("plannedDate" in changes) row.planned_date = changes.plannedDate;
  if ("planOrder" in changes) row.plan_order = changes.planOrder;
  return row;
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
