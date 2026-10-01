import { TaskStatus } from "./types";

export const STATUSES: TaskStatus[] = ["pending", "in_progress", "completed"];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
};

// Pill classes (background + text) for a status badge or select.
export const STATUS_PILL: Record<TaskStatus, string> = {
  pending: "bg-slate-100 text-slate-600",
  in_progress: "bg-sky-100 text-sky-700",
  completed: "bg-emerald-100 text-emerald-700",
};
