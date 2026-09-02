export type Priority = "low" | "medium" | "high";

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
  done: boolean;
  priority: Priority;
  // "YYYY-MM-DD" the task is planned for in the Week view. Independent of
  // dueDate - purely a personal work plan, never shown on the Calendar.
  plannedDate: string | null;
  // Sort position among tasks sharing the same plannedDate (lower = earlier).
  planOrder: number;
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
