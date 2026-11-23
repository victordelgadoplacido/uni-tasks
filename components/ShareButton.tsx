"use client";

import { useState } from "react";
import { Module } from "@/lib/types";
import { useAppData } from "@/app/providers";
import { AvatarStack } from "./Avatar";
import ShareModuleModal from "./ShareModuleModal";

// "Share" for a private module; the members' avatars once it's shared.
// Either way it opens the share dialog.
export default function ShareButton({ module }: { module: Module }) {
  const { members } = useAppData();
  const [open, setOpen] = useState(false);
  const moduleMembers = members.filter((m) => m.moduleId === module.id);
  const shared = moduleMembers.length > 1;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={shared ? `Shared with ${moduleMembers.length} people` : "Share this module"}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      >
        {shared ? <AvatarStack people={moduleMembers} /> : "Share"}
      </button>
      {open && <ShareModuleModal module={module} onClose={() => setOpen(false)} />}
    </>
  );
}
