"use client";

import { useState } from "react";
import { Module, Routine, Task } from "@/lib/types";
import { WeekDay, formatDueDate } from "@/lib/date";
import { COLORS } from "@/lib/colors";
import { useAppData } from "@/app/providers";

export default function DayCard({
  day,
  tasks,
  modules,
  routines,
  completedRoutineIds,
}: {
  day: WeekDay;
  tasks: Task[];
  modules: Module[];
  routines: Routine[];
  completedRoutineIds: string[];
}) {
  const { toggleTaskDone, moveTaskToDay, toggleRoutineDone } = useAppData();
  const moduleById = new Map(modules.map((m) => [m.id, m]));

  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [isDragOverList, setIsDragOverList] = useState(false);

  function handleDrop(e: React.DragEvent, beforeTaskId?: string) {
    e.preventDefault();
    e.stopPropagation();
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) moveTaskToDay(taskId, day.iso, beforeTaskId);
    setDragOverTaskId(null);
    setIsDragOverList(false);
  }

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm ${
        day.isToday ? "border-slate-400" : "border-slate-200"
      }`}
    >
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className={`text-base font-semibold ${day.isToday ? "text-slate-900" : "text-slate-700"}`}>
          {day.isToday ? "Today" : day.weekdayLabel}
        </h3>
        <span className="text-sm text-slate-400">{day.dayLabel}</span>
      </div>

      {routines.length > 0 && (
        <div className="mb-3 space-y-1 border-b border-slate-100 pb-3">
          {routines.map((routine) => {
            const done = completedRoutineIds.includes(routine.id);
            return (
              <label
                key={routine.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => toggleRoutineDone(routine.id, day.iso)}
                  className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                />
                <span className="shrink-0 text-slate-400">&#8635;</span>
                <span className={`text-sm ${done ? "text-slate-400 line-through" : "text-slate-700"}`}>
                  {routine.title}
                </span>
              </label>
            );
          })}
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setIsDragOverList(true);
        }}
        onDragLeave={() => setIsDragOverList(false)}
        onDrop={(e) => handleDrop(e)}
        className={`min-h-[56px] space-y-1.5 rounded-lg p-1 transition-colors ${
          isDragOverList ? "bg-slate-100 ring-2 ring-slate-300" : ""
        }`}
      >
        {tasks.length === 0 ? (
          <p className="px-1 text-sm text-slate-300">Drag tasks here.</p>
        ) : (
          tasks.map((task) => {
            const module = moduleById.get(task.moduleId);
            const colorClasses = module ? COLORS[module.color] : COLORS.blue;
            return (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", task.id);
                  e.dataTransfer.effectAllowed = "move";
                  setDraggingTaskId(task.id);
                }}
                onDragEnd={() => {
                  setDraggingTaskId(null);
                  setDragOverTaskId(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = "move";
                  setDragOverTaskId(task.id);
                }}
                onDrop={(e) => handleDrop(e, task.id)}
                className={`group flex cursor-grab items-start gap-2 rounded-lg border px-2 py-1.5 active:cursor-grabbing ${
                  draggingTaskId === task.id
                    ? "opacity-40"
                    : dragOverTaskId === task.id
                    ? "border-slate-400 bg-slate-50"
                    : "border-transparent hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleTaskDone(task.id)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                />
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${colorClasses.dot}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm leading-snug ${task.done ? "text-slate-400 line-through" : "text-slate-800"}`}>
                    {task.title}
                  </p>
                  {task.dueDate && (
                    <p className="text-xs text-slate-400">due {formatDueDate(task.dueDate)}</p>
                  )}
                </div>
                <button
                  onClick={() => moveTaskToDay(task.id, null)}
                  title="Remove from this day"
                  className="shrink-0 text-slate-300 opacity-0 hover:text-slate-500 group-hover:opacity-100"
                >
                  &times;
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
