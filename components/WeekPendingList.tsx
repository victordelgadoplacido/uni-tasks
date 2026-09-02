"use client";

import { useState } from "react";
import { Module, Task } from "@/lib/types";
import { formatDueDate } from "@/lib/date";
import { COLORS } from "@/lib/colors";
import { useAppData } from "@/app/providers";

export default function WeekPendingList({
  tasks,
  modules,
}: {
  tasks: Task[];
  modules: Module[];
}) {
  const { moveTaskToDay } = useAppData();
  const moduleById = new Map(modules.map((m) => [m.id, m]));
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData("text/plain");
        if (taskId) moveTaskToDay(taskId, null);
        setIsDragOver(false);
      }}
      className={`rounded-xl border bg-white p-4 shadow-sm transition-colors ${
        isDragOver ? "border-slate-400 bg-slate-50" : "border-slate-200"
      }`}
    >
      <h2 className="mb-1 font-semibold text-slate-900">Pending tasks</h2>
      <p className="mb-3 text-xs text-slate-400">
        Drag a task onto a day to plan it. Drop it back here to unplan it.
      </p>

      {tasks.length === 0 ? (
        <p className="text-sm text-slate-400">Nothing pending - nice work.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => {
            const module = moduleById.get(task.moduleId);
            const colorClasses = module ? COLORS[module.color] : COLORS.blue;
            return (
              <li
                key={task.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", task.id);
                  e.dataTransfer.effectAllowed = "move";
                  setDraggingTaskId(task.id);
                }}
                onDragEnd={() => setDraggingTaskId(null)}
                className={`cursor-grab rounded-lg border border-slate-100 px-3 py-2 active:cursor-grabbing ${
                  draggingTaskId === task.id ? "opacity-40" : "hover:bg-slate-50"
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${colorClasses.dot}`} />
                  <span className="truncate text-sm text-slate-800">{task.title}</span>
                </div>
                <p className="text-xs text-slate-400">
                  {module?.name ?? "Unknown module"}
                  {task.dueDate ? ` · due ${formatDueDate(task.dueDate)}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
