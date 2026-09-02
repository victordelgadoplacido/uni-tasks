"use client";

import { useRef, useState } from "react";
import { useAppData } from "@/app/providers";
import { parseIcs } from "@/lib/ical";

export default function IcalUpload() {
  const { icalSource, importIcalEvents, clearIcalEvents } = useAppData();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    try {
      const text = await file.text();
      const { events, skipped } = parseIcs(text);
      if (events.length === 0) {
        setError("No events with a title and date were found in that file.");
        return;
      }
      importIcalEvents(events, file.name);
      if (skipped > 0) {
        setError(`Imported ${events.length} events (${skipped} skipped - missing title or date).`);
      }
    } catch {
      setError("Couldn't read that file. Make sure it's a .ics calendar export.");
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
      <input
        ref={inputRef}
        type="file"
        accept=".ics,text/calendar"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-700"
      >
        Upload .ics file
      </button>

      {icalSource ? (
        <span className="flex items-center gap-2 text-slate-500">
          <span className="truncate">
            {icalSource.fileName} - {icalSource.count} event
            {icalSource.count === 1 ? "" : "s"}
          </span>
          <button
            onClick={() => clearIcalEvents()}
            className="font-medium text-rose-600 hover:text-rose-700"
          >
            Remove
          </button>
        </span>
      ) : (
        <span className="text-slate-400">No university calendar imported yet.</span>
      )}

      {error && <span className="w-full text-xs text-amber-600">{error}</span>}
    </div>
  );
}
