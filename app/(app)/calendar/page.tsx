"use client";

import { useState } from "react";
import { useAppData } from "@/app/providers";
import CalendarGrid from "@/components/CalendarGrid";
import IcalUpload from "@/components/IcalUpload";
import { COLORS } from "@/lib/colors";
import { CalendarFilter } from "@/lib/types";

const FILTERS: { value: CalendarFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "manual", label: "My tasks" },
  { value: "ical", label: "University calendar" },
];

export default function CalendarPage() {
  const { modules, tasks, icalEvents, loaded } = useAppData();
  const [filter, setFilter] = useState<CalendarFilter>("all");

  if (!loaded) {
    return <p className="text-sm text-slate-400">Loading...</p>;
  }

  if (modules.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-slate-500">
        Add a module from the List view first.
      </div>
    );
  }

  return (
    <div>
      <IcalUpload />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          {modules.map((m) => (
            <span key={m.id} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className={`h-2 w-2 rounded-full ${COLORS[m.color].dot}`} />
              {m.name}
            </span>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-200/60 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filter === f.value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <CalendarGrid modules={modules} tasks={tasks} icalEvents={icalEvents} filter={filter} />
    </div>
  );
}
