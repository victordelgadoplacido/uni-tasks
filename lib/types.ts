export type Priority = "low" | "medium" | "high";

export type TaskStatus = "pending" | "in_progress" | "completed";

export type ColorKey =
  | "blue"
  | "purple"
  | "emerald"
  | "amber"
  | "rose"
  | "teal"
  | "indigo"
  | "orange";

export interface Module {
  id: string;
  name: string;
  color: ColorKey;
}

export interface Task {
  id: string;
  moduleId: string;
  title: string;
  notes: string;
  dueDate: string | null; // "YYYY-MM-DD"
  // Always equal to status === "completed"; kept as its own field because
  // most views only care about done/not done.
  done: boolean;
  status: TaskStatus;
  priority: Priority;
  // "YYYY-MM-DD" the task is planned for in the Week view. Independent of
  // dueDate - purely a personal work plan, never shown on the Calendar.
  plannedDate: string | null;
  // Sort position among tasks sharing the same plannedDate (lower = earlier).
  planOrder: number;
  // User-chosen position within its module (module page drag and drop).
  moduleOrder: number;
}

// An optional container inside a task page, holding its own items.
export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  description: string;
  status: TaskStatus;
  position: number;
}

export type TaskItemKind = "note" | "link" | "file";

// A note, website link or local file path on a task page. Belongs to the
// task directly when subtaskId is null, otherwise to that subtask.
export interface TaskItem {
  id: string;
  taskId: string;
  subtaskId: string | null;
  kind: TaskItemKind;
  label: string;
  content: string; // note text, URL, or file path depending on kind
  position: number;
}

// A recurring personal item (gym, run, ...) that should show up on every day
// in the Week view, with its own done/undone state per day.
export interface Routine {
  id: string;
  title: string;
}

// A single event imported from an uploaded .ics file (read-only, replaced on re-import).
export interface IcalEvent {
  id: string; // ics UID, or a generated fallback
  title: string;
  date: string; // "YYYY-MM-DD", the event's start date (viewer's local time)
  time: string | null; // "HH:MM" local time, null if all-day
  endTime: string | null; // "HH:MM" local time, only set when the event ends the same day
  location: string;
  description: string;
}

export interface IcalSource {
  fileName: string;
  importedAt: string; // ISO timestamp
  count: number;
}

export type CalendarFilter = "all" | "manual" | "ical";
