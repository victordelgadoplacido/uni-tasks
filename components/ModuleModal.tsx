"use client";

import { useState } from "react";
import { ColorKey, Module } from "@/lib/types";
import { COLORS, COLOR_KEYS } from "@/lib/colors";
import { useAppData } from "@/app/providers";

interface ModuleModalProps {
  module?: Module | null;
  onClose: () => void;
}

export default function ModuleModal({ module, onClose }: ModuleModalProps) {
  const { addModule, updateModule, deleteModule } = useAppData();
  const isEditing = Boolean(module);

  const [name, setName] = useState(module?.name ?? "");
  const [color, setColor] = useState<ColorKey>(module?.color ?? "blue");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    if (isEditing && module) {
      updateModule(module.id, { name: name.trim(), color });
    } else {
      addModule(name.trim(), color);
    }
    onClose();
  }

  function handleDelete() {
    if (module && confirm(`Delete "${module.name}" and all its tasks?`)) {
      deleteModule(module.id);
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {isEditing ? "Edit module" : "New module"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Module name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              placeholder="e.g. Operating Systems"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setColor(key)}
                  title={COLORS[key].label}
                  className={`h-7 w-7 rounded-full ${COLORS[key].dot} ${
                    color === key
                      ? "ring-2 ring-offset-2 ring-slate-500"
                      : "opacity-70 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="text-sm font-medium text-rose-600 hover:text-rose-700"
                >
                  Delete module
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
                {isEditing ? "Save" : "Add module"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
