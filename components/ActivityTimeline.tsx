"use client";

import { useEffect, useState } from "react";
import { TaskActivity, TaskStatus } from "@/lib/types";
import { formatDueDate, timeAgo } from "@/lib/date";
import { STATUS_LABEL } from "@/lib/status";
import Avatar from "./Avatar";

const PAGE_SIZE = 25;

const ITEM_NOUN: Record<string, string> = {
  note: "a note",
  link: "a website",
  file: "a document",
};

function quote(text: string | null | undefined): string {
  return `“${text ?? ""}”`;
}

// Turns one activity row (written by the triggers in
// supabase/migrations/0004_collaboration.sql) into a sentence fragment that
// follows the actor's name, e.g. "completed subtask “Lit review”".
function describe(a: TaskActivity, nameOf: (id: string | null) => string): string {
  const d = a.details;
  const status = (s: string | null) => STATUS_LABEL[s as TaskStatus] ?? s;
  const inSubtask = d.subtask ? ` in ${quote(d.subtask)}` : "";

  switch (a.action) {
    case "task_created":
      return "created this task";
    case "task_renamed":
      return `renamed the task to ${quote(d.to)}`;
    case "task_status":
      return d.to === "completed"
        ? "marked the task as completed"
        : `changed the status to ${status(d.to)}`;
    case "description_edited":
      return "edited the description";
    case "due_date_changed":
      return d.to ? `set the due date to ${formatDueDate(d.to)}` : "removed the due date";
    case "priority_changed":
      return `set the priority to ${d.to}`;
    case "task_moved":
      return `moved the task to ${quote(d.module)}`;
    case "subtask_created":
      return `created subtask ${quote(d.title)}`;
    case "subtask_deleted":
      return `deleted subtask ${quote(d.title)}`;
    case "subtask_renamed":
      return `renamed subtask ${quote(d.from)} to ${quote(d.to)}`;
    case "subtask_description_edited":
      return `edited the description of ${quote(d.title)}`;
    case "subtask_status":
      if (d.to === "completed") return `completed subtask ${quote(d.title)}`;
      if (d.to === "in_progress") return `started subtask ${quote(d.title)}`;
      return `moved subtask ${quote(d.title)} back to Pending`;
    case "item_added":
    case "item_edited":
    case "item_removed": {
      const verb =
        a.action === "item_added" ? "added" : a.action === "item_edited" ? "edited" : "removed";
      const noun = ITEM_NOUN[d.kind ?? ""] ?? "an item";
      const text = d.kind === "note" ? "" : ` ${quote(d.text)}`;
      return `${verb} ${noun}${text}${inSubtask}`;
    }
    case "assignee_added":
      return d.user_id === a.actorId
        ? "started working on this task"
        : `added ${nameOf(d.user_id)} to this task`;
    case "assignee_removed":
      return d.user_id === a.actorId
        ? "stopped working on this task"
        : `removed ${nameOf(d.user_id)} from this task`;
    default:
      return "made a change";
  }
}

const DOT: Record<string, string> = {
  task_status: "bg-sky-500",
  subtask_status: "bg-emerald-500",
  task_created: "bg-slate-900",
  subtask_created: "bg-violet-500",
  assignee_added: "bg-amber-500",
};

export default function ActivityTimeline({
  activity,
  nameOf,
}: {
  activity: TaskActivity[];
  nameOf: (userId: string | null) => string;
}) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  // Re-render every minute so "5m ago" stays accurate.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (activity.length === 0) {
    return <p className="text-sm text-slate-400">No activity yet.</p>;
  }

  return (
    <div>
      <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-slate-200">
        {activity.slice(0, limit).map((a) => (
          <li key={a.id} className="relative flex gap-3">
            <div className="relative">
              <Avatar userId={a.actorId ?? "?"} name={nameOf(a.actorId)} size="sm" />
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                  DOT[a.action] ?? "bg-slate-300"
                }`}
              />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="break-words text-sm leading-snug text-slate-700">
                <span className="font-semibold text-slate-900">{nameOf(a.actorId)}</span>{" "}
                {describe(a, nameOf)}
              </p>
              <time
                dateTime={a.createdAt}
                title={new Date(a.createdAt).toLocaleString()}
                className="text-xs text-slate-400"
              >
                {timeAgo(a.createdAt)}
              </time>
            </div>
          </li>
        ))}
      </ol>
      {activity.length > limit && (
        <button
          onClick={() => setLimit((l) => l + PAGE_SIZE)}
          className="mt-4 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          Show older activity
        </button>
      )}
    </div>
  );
}
