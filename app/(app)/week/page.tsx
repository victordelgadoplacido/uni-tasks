"use client";

import { useMemo } from "react";
import { useAppData } from "@/app/providers";
import { restOfWeek } from "@/lib/date";
import WeekPendingList from "@/components/WeekPendingList";
import DayCard from "@/components/DayCard";
import RoutinesPanel from "@/components/RoutinesPanel";

export default function WeekPage() {
  const { modules, tasks, routines, routineCompletions, loaded } = useAppData();
  const days = useMemo(() => restOfWeek(), []);

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

  const visibleIsoSet = new Set(days.map((d) => d.iso));
  const pendingTasks = tasks
    .filter((t) => !t.done && (!t.plannedDate || !visibleIsoSet.has(t.plannedDate)))
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[260px_1fr_260px]">
      <div className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
        <WeekPendingList tasks={pendingTasks} modules={modules} />
      </div>

      <div className="space-y-4">
        {days.map((day) => (
          <DayCard
            key={day.iso}
            day={day}
            modules={modules}
            routines={routines}
            completedRoutineIds={routineCompletions[day.iso] ?? []}
            tasks={tasks
              .filter((t) => t.plannedDate === day.iso)
              .sort((a, b) => a.planOrder - b.planOrder)}
          />
        ))}
      </div>

      <div className="lg:sticky lg:top-6">
        <RoutinesPanel routines={routines} />
      </div>
    </div>
  );
}
