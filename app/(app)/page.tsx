"use client";

import { useState } from "react";
import { useAppData } from "@/app/providers";
import ModuleSection from "@/components/ModuleSection";
import ModuleModal from "@/components/ModuleModal";

export default function ListPage() {
  const { modules, tasks, loaded } = useAppData();
  const [addingModule, setAddingModule] = useState(false);

  if (!loaded) {
    return <p className="text-sm text-slate-400">Loading...</p>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      {modules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <p className="mb-3 text-slate-500">
            Add your first module to start organizing tasks.
          </p>
          <button
            onClick={() => setAddingModule(true)}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            + New module
          </button>
        </div>
      ) : (
        <>
          {modules.map((module) => (
            <ModuleSection
              key={module.id}
              module={module}
              tasks={tasks.filter((t) => t.moduleId === module.id)}
              allModules={modules}
            />
          ))}
          <button
            onClick={() => setAddingModule(true)}
            className="w-full rounded-xl border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700"
          >
            + New module
          </button>
        </>
      )}

      {addingModule && <ModuleModal onClose={() => setAddingModule(false)} />}
    </div>
  );
}
