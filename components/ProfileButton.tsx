"use client";

import { useState } from "react";
import { useAppData } from "@/app/providers";
import Avatar from "./Avatar";

// Header chip with the user's name. Collaborators see this name on shared
// modules, task assignees and the activity timeline, so it's editable here.
export default function ProfileButton() {
  const { currentUser, setDisplayName } = useAppData();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentUser.displayName);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim() && name.trim() !== currentUser.displayName) {
      setDisplayName(name.trim());
    }
    setEditing(false);
  }

  return (
    <>
      <button
        onClick={() => {
          setName(currentUser.displayName);
          setEditing(true);
        }}
        title="Change your display name"
        className="flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        <Avatar userId={currentUser.id} name={currentUser.displayName} size="sm" />
        <span className="hidden sm:inline">{currentUser.displayName}</span>
      </button>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          onClick={() => setEditing(false)}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
            className="w-full max-w-sm space-y-3 rounded-xl bg-white p-5 shadow-xl"
          >
            <h2 className="text-lg font-semibold text-slate-900">Your name</h2>
            <p className="text-sm text-slate-500">
              This is how people you share modules with will see you.
            </p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
