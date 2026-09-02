"use client";

import { Task } from "@/lib/types";
import { daysUntil, formatDueDate } from "@/lib/date";
import { useAppData } from "@/app/providers";

const PRIORITY_DOT: Record<Task["priority"], string> = {
  low: "bg-slate-300",
  medium: "bg-amber-400",
  high: "bg-rose-500",
};

export default function TaskRow({
  task,
  onEdit,
}: {
  task: Task;
  onEdit: () => void;
}) {
  const { toggleTaskDone } = useAppData();

  const overdue = task.dueDate && !task.done && daysUntil(task.dueDate) < 0;
  const dueSoon =
    task.dueDate && !task.done && daysUntil(task.dueDate) >= 0 && daysUntil(task.dueDate) <= 3;

  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
      <input
        type="checkbox"
        checked={task.done}
        onChange={() => toggleTaskDone(task.id)}
        className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-slate-900 focus:ring-slate-400"
      />
      <span
        title={`${task.priority} priority`}
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`}
      />
      <button
        onClick={onEdit}
        className={`flex-1 truncate text-left text-sm ${
          task.done ? "text-slate-400 line-through" : "text-slate-800"
        }`}
      >
        {task.title}
      </button>
      {task.dueDate && (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            task.done
              ? "bg-slate-100 text-slate-400"
              : overdue
              ? "bg-rose-100 text-rose-700"
              : dueSoon
              ? "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {formatDueDate(task.dueDate)}
        </span>
      )}
    </div>
  );
}
