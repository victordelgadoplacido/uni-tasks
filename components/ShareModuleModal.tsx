"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Module } from "@/lib/types";
import { useAppData } from "@/app/providers";
import Avatar from "./Avatar";

export default function ShareModuleModal({
  module,
  onClose,
}: {
  module: Module;
  onClose: () => void;
}) {
  const { currentUser, members, inviteToModule, removeModuleMember } = useAppData();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const isOwner = module.ownerId === currentUser.id;
  const moduleMembers = members
    .filter((m) => m.moduleId === module.id)
    .sort((a, b) => (a.role === b.role ? 0 : a.role === "owner" ? -1 : 1));

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    setError(null);
    const message = await inviteToModule(module.id, email.trim());
    setInviting(false);
    if (message) {
      setError(message);
    } else {
      setEmail("");
    }
  }

  function handleLeave() {
    if (!confirm(`Leave "${module.name}"? You'll lose access to its tasks.`)) return;
    removeModuleMember(module.id, currentUser.id);
    onClose();
    router.push("/");
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
        <h2 className="text-lg font-semibold text-slate-900">Share &ldquo;{module.name}&rdquo;</h2>
        <p className="mt-1 text-sm text-slate-500">
          Everyone here can see this module and add and edit its tasks, subtasks, notes,
          websites and documents.
        </p>

        {isOwner && (
          <form onSubmit={handleInvite} className="mt-4 space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Invite by email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="friend@university.ac.uk"
                className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              <button
                type="submit"
                disabled={inviting}
                className="rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {inviting ? "Adding..." : "Add"}
              </button>
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <p className="text-xs text-slate-400">
              They need a Uni Tasks account with this email first.
            </p>
          </form>
        )}

        <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          People with access ({moduleMembers.length})
        </h3>
        <ul className="max-h-64 space-y-1 overflow-y-auto">
          {moduleMembers.map((m) => (
            <li key={m.userId} className="flex items-center gap-3 rounded-lg px-1 py-1.5">
              <Avatar userId={m.userId} name={m.displayName} />
              <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
                {m.displayName}
                {m.userId === currentUser.id && (
                  <span className="text-slate-400"> (you)</span>
                )}
              </span>
              {m.role === "owner" ? (
                <span className="text-xs font-medium text-slate-400">Owner</span>
              ) : isOwner ? (
                <button
                  onClick={() => removeModuleMember(module.id, m.userId)}
                  className="rounded px-2 py-0.5 text-xs font-medium text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center justify-between">
          {!isOwner ? (
            <button
              onClick={handleLeave}
              className="text-sm font-medium text-rose-600 hover:text-rose-700"
            >
              Leave module
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
