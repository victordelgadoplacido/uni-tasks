"use client";

import { useState } from "react";
import { Module, Task } from "@/lib/types";
import { COLORS } from "@/lib/colors";
import TaskRow from "./TaskRow";
import TaskModal from "./TaskModal";
import ModuleModal from "./ModuleModal";

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });
}

export default function ModuleSection({
  module,
  tasks,
  allModules,
}: {
  module: Module;
  tasks: Task[];
  allModules: Module[];
}) {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [addingTask, setAddingTask] = useState(false);
  const [editingModule, setEditingModule] = useState(false);

  const sorted = sortTasks(tasks);
  const remaining = tasks.filter((t) => !t.done).length;
  const colorClasses = COLORS[module.color];

  return (
    <section className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1 ${colorClasses.bar}`} />
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setEditingModule(true)}
          className="flex items-center gap-2 text-left"
        >
          <span className={`h-2.5 w-2.5 rounded-full ${colorClasses.dot}`} />
          <h2 className="font-semibold text-slate-900">{module.name}</h2>
          <span className="text-xs font-medium text-slate-400">
            {remaining} left
          </span>
        </button>
        <button
          onClick={() => setAddingTask(true)}
          className="rounded-md px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          + Task
        </button>
      </div>

      {sorted.length > 0 ? (
        <div className="space-y-0.5 px-2 pb-3">
          {sorted.map((task) => (
            <TaskRow key={task.id} task={task} onEdit={() => setEditingTask(task)} />
          ))}
        </div>
      ) : (
        <p className="px-4 pb-4 text-sm text-slate-400">No tasks yet.</p>
      )}

      {(editingTask || addingTask) && (
        <TaskModal
          modules={allModules}
          task={editingTask}
          defaultModuleId={module.id}
          onClose={() => {
            setEditingTask(null);
            setAddingTask(false);
          }}
        />
      )}
      {editingModule && (
        <ModuleModal module={module} onClose={() => setEditingModule(false)} />
      )}
    </section>
  );
}
