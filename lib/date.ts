export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function formatDueDate(iso: string): string {
  const diff = daysUntil(iso);
  const date = new Date(iso + "T00:00:00");
  const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (diff === 0) return `Today`;
  if (diff === 1) return `Tomorrow`;
  if (diff === -1) return `Yesterday`;
  if (diff < 0) return `${label} (overdue)`;
  return label;
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface WeekDay {
  date: Date;
  iso: string;
  weekdayLabel: string; // "Mon"
  dayLabel: string; // "Sep 3"
  isToday: boolean;
}

// Today through the end of the current week (Saturday) - the forward-looking
// planning window for the Week view. Never includes days already past.
export function restOfWeek(): WeekDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeftInWeek = 6 - today.getDay();

  const days: WeekDay[] = [];
  for (let i = 0; i <= daysLeftInWeek; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    days.push({
      date,
      iso: toISODate(date),
      weekdayLabel: WEEKDAY_LABELS[date.getDay()],
      dayLabel: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      isToday: i === 0,
    });
  }
  return days;
}

export interface CalendarDay {
  date: Date;
  iso: string;
  inCurrentMonth: boolean;
  isToday: boolean;
}

// Builds a 6-week grid (Sun-Sat) covering the given month.
export function buildMonthGrid(year: number, month: number): CalendarDay[] {
  const todayIso = todayISO();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);

  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    const iso = toISODate(date);
    days.push({
      date,
      iso,
      inCurrentMonth: date.getMonth() === month,
      isToday: iso === todayIso,
    });
  }
  return days;
}
