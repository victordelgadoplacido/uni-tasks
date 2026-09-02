"use client";

import { useState } from "react";
import { Routine } from "@/lib/types";
import { useAppData } from "@/app/providers";

export default function RoutinesPanel({ routines }: { routines: Routine[] }) {
  const { addRoutine, deleteRoutine } = useAppData();
  const [title, setTitle] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    addRoutine(trimmed);
    setTitle("");
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-1 font-semibold text-slate-900">Daily routines</h2>
      <p className="mb-3 text-xs text-slate-400">
        Recurring items that show up on every day - gym, a run, anything you never want to forget.
      </p>

      <form onSubmit={handleSubmit} className="mb-3 flex gap-1.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Gym"
          className="w-full min-w-0 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-slate-900 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          Add
        </button>
      </form>

      {routines.length === 0 ? (
        <p className="text-sm text-slate-400">No routines yet.</p>
      ) : (
        <ul className="space-y-1">
          {routines.map((routine) => (
            <li
              key={routine.id}
              className="group flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-slate-50"
            >
              <span className="flex items-center gap-2 truncate text-sm text-slate-700">
                <span className="shrink-0 text-slate-400">&#8635;</span>
                {routine.title}
              </span>
              <button
                onClick={() => deleteRoutine(routine.id)}
                title="Delete routine"
                className="shrink-0 text-slate-300 opacity-0 hover:text-rose-500 group-hover:opacity-100"
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
