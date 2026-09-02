"use client";

import { useEffect, useState } from "react";
import { Module, Priority, Task } from "@/lib/types";
import { useAppData } from "@/app/providers";

interface TaskModalProps {
  modules: Module[];
  task?: Task | null;
  defaultModuleId?: string;
  defaultDueDate?: string | null;
  onClose: () => void;
}

export default function TaskModal({
  modules,
  task,
  defaultModuleId,
  defaultDueDate,
  onClose,
}: TaskModalProps) {
  const { addTask, updateTask, deleteTask } = useAppData();
  const isEditing = Boolean(task);

  const [title, setTitle] = useState(task?.title ?? "");
  const [moduleId, setModuleId] = useState(
    task?.moduleId ?? defaultModuleId ?? modules[0]?.id ?? ""
  );
  const [dueDate, setDueDate] = useState(task?.dueDate ?? defaultDueDate ?? "");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [notes, setNotes] = useState(task?.notes ?? "");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !moduleId) return;

    const payload = {
      title: title.trim(),
      moduleId,
      dueDate: dueDate || null,
      priority,
      notes: notes.trim(),
    };

    if (isEditing && task) {
      updateTask(task.id, payload);
    } else {
      addTask({ ...payload, done: false, plannedDate: null, planOrder: 0 });
    }
    onClose();
  }

  function handleDelete() {
    if (task) deleteTask(task.id);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {isEditing ? "Edit task" : "New task"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Title
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              placeholder="e.g. Finish problem set 4"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Module
              </label>
              <select
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Due date
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={dueDate ?? ""}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate("")}
                  className="whitespace-nowrap rounded-md border border-slate-300 px-2 text-xs text-slate-600 hover:bg-slate-50"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              placeholder="Optional details"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="text-sm font-medium text-rose-600 hover:text-rose-700"
                >
                  Delete task
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                {isEditing ? "Save" : "Add task"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
