"use client";

import { useEffect } from "react";
import { IcalEvent } from "@/lib/types";

export default function IcalEventModal({
  event,
  onClose,
}: {
  event: IcalEvent;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
            University calendar
          </span>
        </div>
        <h2 className="mb-1 text-lg font-semibold text-slate-900">{event.title}</h2>
        <p className={`text-sm text-slate-500 ${event.location ? "mb-1" : "mb-3"}`}>
          {event.date}
          {event.time ? ` · ${event.time}${event.endTime ? `–${event.endTime}` : ""}` : ""}
        </p>
        {event.location && (
          <p className="mb-3 text-sm text-slate-500">{event.location}</p>
        )}
        {event.description && (
          <p className="mb-4 whitespace-pre-wrap text-sm text-slate-600">
            {event.description}
          </p>
        )}
        <p className="mb-4 text-xs text-slate-400">
          Imported from your university's calendar file - read only.
        </p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
