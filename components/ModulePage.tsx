"use client";

import { useState } from "react";
import Link from "next/link";
import { Task, TaskStatus } from "@/lib/types";
import { COLORS } from "@/lib/colors";
import { daysUntil, formatDueDate } from "@/lib/date";
import { STATUSES, STATUS_LABEL, STATUS_PILL } from "@/lib/status";
import { sortByModuleOrder } from "@/lib/tasks";
import { useAppData } from "@/app/providers";
import TaskModal from "./TaskModal";
import ModuleModal from "./ModuleModal";

export interface SubtaskProgress {
  done: number;
  total: number;
}

const PRIORITY_DOT: Record<Task["priority"], string> = {
  low: "bg-slate-300",
  medium: "bg-amber-400",
  high: "bg-rose-500",
};

// Move the item at `from` so it lands in gap `toGap` (0 = before the first
// item, list.length = after the last), as computed from the original list.
function moveToGap<T>(list: T[], from: number, toGap: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(toGap > from ? toGap - 1 : toGap, 0, item);
  return next;
}

export default function ModulePage({
  moduleId,
  subtaskProgress,
}: {
  moduleId: string;
  subtaskProgress: Record<string, SubtaskProgress>;
}) {
  const { modules, tasks, reorderModuleTasks } = useAppData();
  const [addingTask, setAddingTask] = useState(false);
  const [editingModule, setEditingModule] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropGap, setDropGap] = useState<number | null>(null);

  const module = modules.find((m) => m.id === moduleId);

  if (!module) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-600">This module doesn&rsquo;t exist (it may have been deleted).</p>
        <Link href="/" className="mt-3 inline-block text-sm font-medium text-slate-900 underline">
          Back to all modules
        </Link>
      </div>
    );
  }

  const colorClasses = COLORS[module.color];
  const sorted = sortByModuleOrder(tasks.filter((t) => t.moduleId === moduleId));
  const open = sorted.filter((t) => !t.done);
  const completed = sorted.filter((t) => t.done);
  const inProgressCount = open.filter((t) => t.status === "in_progress").length;

  function commitOrder(newOpen: Task[]) {
    reorderModuleTasks([...newOpen, ...completed].map((t) => t.id));
  }

  function handleDrop() {
    const from = open.findIndex((t) => t.id === draggingId);
    if (from !== -1 && dropGap !== null && dropGap !== from && dropGap !== from + 1) {
      commitOrder(moveToGap(open, from, dropGap));
    }
    setDraggingId(null);
    setDropGap(null);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/" className="inline-block text-sm text-slate-500 hover:text-slate-900">
        &larr; All modules
      </Link>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className={`h-1.5 ${colorClasses.bar}`} />
        <div className="flex flex-wrap items-start justify-between gap-3 p-5">
          <div>
            <div className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${colorClasses.dot}`} />
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">{module.name}</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {open.length - inProgressCount} pending &middot; {inProgressCount} in progress
              &middot; {completed.length} completed
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditingModule(true)}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Edit module
            </button>
            <button
              onClick={() => setAddingTask(true)}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              + Task
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        {open.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-slate-400">
            {completed.length > 0 ? "All tasks completed 🎉" : "No tasks yet."}
          </p>
        ) : (
          <>
            <p className="px-2 pb-2 text-xs text-slate-400">
              Drag tasks to reorder them. Click a task to open it.
            </p>
            <ol
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop();
              }}
            >
              {open.map((task, i) => (
                <li
                  key={task.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    setDraggingId(task.id);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDropGap(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDropGap(e.clientY < rect.top + rect.height / 2 ? i : i + 1);
                  }}
                  className="relative"
                >
                  {draggingId && dropGap === i && <DropLine position="top" />}
                  <ModuleTaskRow
                    task={task}
                    index={i}
                    progress={subtaskProgress[task.id]}
                    dragging={draggingId === task.id}
                    canMoveUp={i > 0}
                    canMoveDown={i < open.length - 1}
                    onMove={(delta) => commitOrder(moveToGap(open, i, delta < 0 ? i - 1 : i + 2))}
                  />
                  {draggingId && i === open.length - 1 && dropGap === open.length && (
                    <DropLine position="bottom" />
                  )}
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      {completed.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <button
            onClick={() => setShowCompleted((s) => !s)}
            className="flex w-full items-center gap-2 px-5 py-3 text-left text-sm font-semibold text-slate-700"
          >
            <span className={`inline-block text-slate-400 transition-transform ${showCompleted ? "rotate-90" : ""}`}>
              &#9656;
            </span>
            Completed ({completed.length})
          </button>
          {showCompleted && (
            <div className="border-t border-slate-100 p-3">
              {completed.map((task) => (
                <ModuleTaskRow key={task.id} task={task} progress={subtaskProgress[task.id]} />
              ))}
            </div>
          )}
        </section>
      )}

      {addingTask && (
        <TaskModal
          modules={modules}
          defaultModuleId={module.id}
          onClose={() => setAddingTask(false)}
        />
      )}
      {editingModule && (
        <ModuleModal module={module} onClose={() => setEditingModule(false)} />
      )}
    </div>
  );
}

function DropLine({ position }: { position: "top" | "bottom" }) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-2 z-10 h-0.5 rounded-full bg-slate-900 ${
        position === "top" ? "-top-px" : "-bottom-px"
      }`}
    />
  );
}

function ModuleTaskRow({
  task,
  index,
  progress,
  dragging = false,
  canMoveUp = false,
  canMoveDown = false,
  onMove,
}: {
  task: Task;
  index?: number;
  progress?: SubtaskProgress;
  dragging?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMove?: (delta: -1 | 1) => void;
}) {
  const { toggleTaskDone, updateTask } = useAppData();
  const reorderable = onMove !== undefined;

  const days = task.dueDate ? daysUntil(task.dueDate) : null;
  const dueClass =
    task.done || days === null
      ? "bg-slate-100 text-slate-500"
      : days < 0
      ? "bg-rose-100 text-rose-700"
      : days <= 3
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-100 text-slate-600";

  return (
    <div
      className={`group flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50 ${
        dragging ? "opacity-40" : ""
      }`}
    >
      {reorderable && (
        <span
          className="cursor-grab select-none text-slate-300 group-hover:text-slate-500 active:cursor-grabbing"
          aria-hidden
        >
          &#10303;
        </span>
      )}
      {index !== undefined && (
        <span className="w-5 shrink-0 text-right text-xs tabular-nums text-slate-400">
          {index + 1}
        </span>
      )}
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
      <Link
        href={`/tasks/${task.id}`}
        draggable={false}
        className={`min-w-0 flex-1 truncate text-sm hover:underline ${
          task.done ? "text-slate-400 line-through" : "font-medium text-slate-800"
        }`}
      >
        {task.title}
      </Link>

      {reorderable && (
        <div className="flex shrink-0 opacity-0 focus-within:opacity-100 group-hover:opacity-100">
          <button
            onClick={() => onMove(-1)}
            disabled={!canMoveUp}
            title="Move up"
            className="rounded px-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:invisible"
          >
            &uarr;
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={!canMoveDown}
            title="Move down"
            className="rounded px-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:invisible"
          >
            &darr;
          </button>
        </div>
      )}

      {progress && progress.total > 0 && (
        <span
          title="Subtasks completed"
          className="shrink-0 text-xs tabular-nums text-slate-400"
        >
          {progress.done}/{progress.total}
        </span>
      )}
      {task.dueDate && (
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${dueClass}`}>
          {formatDueDate(task.dueDate)}
        </span>
      )}
      <select
        value={task.status}
        onChange={(e) => updateTask(task.id, { status: e.target.value as TaskStatus })}
        className={`shrink-0 cursor-pointer rounded-full border-0 py-0.5 pl-2.5 pr-7 text-xs font-medium focus:ring-2 focus:ring-slate-300 ${
          STATUS_PILL[task.status]
        }`}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
    </div>
  );
}
