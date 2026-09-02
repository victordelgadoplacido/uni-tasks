"use client";

import { useMemo, useState } from "react";
import { CalendarFilter, IcalEvent, Module, Task } from "@/lib/types";
import { COLORS } from "@/lib/colors";
import { buildMonthGrid, MONTH_NAMES, WEEKDAY_LABELS } from "@/lib/date";
import TaskModal from "./TaskModal";
import IcalEventModal from "./IcalEventModal";

export default function CalendarGrid({
  modules,
  tasks,
  icalEvents,
  filter,
}: {
  modules: Module[];
  tasks: Task[];
  icalEvents: IcalEvent[];
  filter: CalendarFilter;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingIcalEvent, setViewingIcalEvent] = useState<IcalEvent | null>(null);
  const [newTaskDate, setNewTaskDate] = useState<string | null>(null);

  const showTasks = filter !== "ical";
  const showIcal = filter !== "manual";

  const moduleById = useMemo(() => {
    const map = new Map<string, Module>();
    modules.forEach((m) => map.set(m.id, m));
    return map;
  }, [modules]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    if (!showTasks) return map;
    tasks.forEach((t) => {
      if (!t.dueDate) return;
      const list = map.get(t.dueDate) ?? [];
      list.push(t);
      map.set(t.dueDate, list);
    });
    return map;
  }, [tasks, showTasks]);

  const icalByDate = useMemo(() => {
    const map = new Map<string, IcalEvent[]>();
    if (!showIcal) return map;
    icalEvents.forEach((ev) => {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    });
    return map;
  }, [icalEvents, showIcal]);

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  function goToMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  function goToday() {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          {MONTH_NAMES[month]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => goToMonth(-1)}
            className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
            aria-label="Previous month"
          >
            &larr;
          </button>
          <button
            onClick={goToday}
            className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
          >
            Today
          </button>
          <button
            onClick={() => goToMonth(1)}
            className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
            aria-label="Next month"
          >
            &rarr;
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-slate-200 text-xs">
        {WEEKDAY_LABELS.map((d) => (
          <div
            key={d}
            className="bg-slate-50 px-2 py-1.5 text-center font-medium text-slate-500"
          >
            {d}
          </div>
        ))}
        {grid.map((day) => {
          const dayTasks = tasksByDate.get(day.iso) ?? [];
          const dayIcalEvents = icalByDate.get(day.iso) ?? [];
          const total = dayTasks.length + dayIcalEvents.length;
          const canAddTask = showTasks && total === 0;
          const visibleTasks = dayTasks.slice(0, 3);
          const visibleIcalEvents = dayIcalEvents.slice(0, Math.max(0, 3 - visibleTasks.length));
          const hiddenCount = total - visibleTasks.length - visibleIcalEvents.length;
          return (
            <div
              key={day.iso}
              onClick={() => canAddTask && setNewTaskDate(day.iso)}
              className={`min-h-[88px] p-1.5 align-top ${canAddTask ? "cursor-pointer" : ""} bg-white ${
                day.inCurrentMonth ? "" : "bg-slate-50 text-slate-300"
              }`}
            >
              <div
                className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                  day.isToday ? "bg-slate-900 font-semibold text-white" : "text-slate-500"
                }`}
              >
                {day.date.getDate()}
              </div>
              <div className="space-y-0.5">
                {visibleTasks.map((task) => {
                  const module = moduleById.get(task.moduleId);
                  const colorClasses = module ? COLORS[module.color] : COLORS.blue;
                  return (
                    <button
                      key={task.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTask(task);
                      }}
                      className={`block w-full truncate rounded border px-1 py-0.5 text-left text-[11px] ${
                        task.done ? colorClasses.chipDone : colorClasses.chip
                      } ${task.done ? "line-through" : ""}`}
                      title={task.title}
                    >
                      {task.title}
                    </button>
                  );
                })}
                {visibleIcalEvents.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingIcalEvent(ev);
                    }}
                    className="flex w-full items-center gap-1 truncate rounded border border-slate-300 bg-slate-100 px-1 py-0.5 text-left text-[11px] text-slate-600"
                    title={`${ev.title}${ev.time ? ` (${ev.time}${ev.endTime ? `–${ev.endTime}` : ""})` : ""}`}
                  >
                    <span className="shrink-0">&#128197;</span>
                    <span className="truncate">
                      {ev.time ? `${ev.time} ` : ""}
                      {ev.title}
                    </span>
                  </button>
                ))}
                {hiddenCount > 0 && (
                  <p className="px-1 text-[10px] text-slate-400">+{hiddenCount} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editingTask && (
        <TaskModal
          modules={modules}
          task={editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}
      {newTaskDate && modules.length > 0 && (
        <TaskModal
          modules={modules}
          defaultDueDate={newTaskDate}
          onClose={() => setNewTaskDate(null)}
        />
      )}
      {viewingIcalEvent && (
        <IcalEventModal
          event={viewingIcalEvent}
          onClose={() => setViewingIcalEvent(null)}
        />
      )}
    </div>
  );
}
