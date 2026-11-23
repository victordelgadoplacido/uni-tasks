"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Subtask, TaskActivity, TaskItem, TaskStatus } from "@/lib/types";
import { COLORS } from "@/lib/colors";
import { formatDueDate } from "@/lib/date";
import { STATUSES, STATUS_LABEL, STATUS_PILL } from "@/lib/status";
import { createClient } from "@/lib/supabase/client";
import { subtaskChangesToRow } from "@/lib/supabase/mappers";
import { TaskPageData, fetchTaskPageData } from "@/lib/supabase/queries";
import { useAppData } from "@/app/providers";
import TaskItems, { ItemActions } from "./TaskItems";
import TaskModal from "./TaskModal";
import ActivityTimeline from "./ActivityTimeline";
import Avatar from "./Avatar";

type SubtaskChanges = Partial<Pick<Subtask, "title" | "description" | "status">>;

const STATUS_BORDER: Record<TaskStatus, string> = {
  pending: "border-l-slate-300",
  in_progress: "border-l-sky-400",
  completed: "border-l-emerald-400",
};

function nextPosition(list: { position: number }[]): number {
  return list.reduce((max, x) => Math.max(max, x.position + 1), 0);
}

export default function TaskPage({
  taskId,
  initial,
}: {
  taskId: string;
  initial: TaskPageData;
}) {
  const { currentUser, tasks, modules, members, updateTask } = useAppData();
  const userId = currentUser.id;
  const supabase = useMemo(() => createClient(), []);
  const [subtasks, setSubtasks] = useState<Subtask[]>(initial.subtasks);
  const [items, setItems] = useState<TaskItem[]>(initial.items);
  const [activity, setActivity] = useState<TaskActivity[]>(initial.activity);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(initial.assigneeIds);
  const [editingDetails, setEditingDetails] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState<string | null>(null);

  const task = tasks.find((t) => t.id === taskId);
  const module = modules.find((m) => m.id === task?.moduleId);
  const moduleMembers = members.filter((m) => m.moduleId === task?.moduleId);

  function nameOf(id: string | null): string {
    if (!id) return "Someone";
    if (id === userId) return currentUser.displayName;
    return moduleMembers.find((m) => m.userId === id)?.displayName ?? "Former member";
  }

  // Live collaboration: every change to this task's content (by anyone)
  // writes a task_activity row via database triggers, so one subscription
  // to new activity is enough to know when to re-fetch the whole page. The
  // task row itself (title, status, ...) is kept live by AppDataProvider.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    function refresh() {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const data = await fetchTaskPageData(supabase, taskId);
        if (cancelled) return;
        setSubtasks(data.subtasks);
        setItems(data.items);
        setActivity(data.activity);
        setAssigneeIds(data.assigneeIds);
      }, 300);
    }

    const channel = supabase.channel(`task-${taskId}`).on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "task_activity", filter: `task_id=eq.${taskId}` },
      refresh
    );
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) supabase.realtime.setAuth(data.session.access_token);
      channel.subscribe();
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [supabase, taskId]);

  function addAssignee(memberId: string) {
    setAssigneeIds((prev) => (prev.includes(memberId) ? prev : [...prev, memberId]));
    supabase
      .from("task_assignees")
      .insert({ task_id: taskId, user_id: memberId })
      .then(({ error }) => {
        if (error) setAssigneeIds((prev) => prev.filter((id) => id !== memberId));
      });
  }

  function removeAssignee(memberId: string) {
    const prevIds = assigneeIds;
    setAssigneeIds((prev) => prev.filter((id) => id !== memberId));
    supabase
      .from("task_assignees")
      .delete()
      .match({ task_id: taskId, user_id: memberId })
      .then(({ error }) => {
        if (error) setAssigneeIds(prevIds);
      });
  }

  // --- persistence (optimistic, rolled back on error like app/providers.tsx)

  function addSubtask(title: string) {
    const subtask: Subtask = {
      id: crypto.randomUUID(),
      taskId,
      title,
      description: "",
      status: "pending",
      position: nextPosition(subtasks),
    };
    setSubtasks((prev) => [...prev, subtask]);
    supabase
      .from("subtasks")
      .insert({
        id: subtask.id,
        task_id: taskId,
        user_id: userId,
        title: subtask.title,
        position: subtask.position,
      })
      .then(({ error }) => {
        if (error) setSubtasks((prev) => prev.filter((s) => s.id !== subtask.id));
      });
  }

  function updateSubtask(id: string, changes: SubtaskChanges) {
    let prevSubtask: Subtask | undefined;
    setSubtasks((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        prevSubtask = s;
        return { ...s, ...changes };
      })
    );
    supabase
      .from("subtasks")
      .update(subtaskChangesToRow(changes))
      .eq("id", id)
      .then(({ error }) => {
        if (error && prevSubtask) {
          const restored = prevSubtask;
          setSubtasks((prev) => prev.map((s) => (s.id === id ? restored : s)));
        }
      });
  }

  function deleteSubtask(id: string) {
    const prevSubtasks = subtasks;
    const prevItems = items;
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
    setItems((prev) => prev.filter((i) => i.subtaskId !== id));
    supabase
      .from("subtasks")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          setSubtasks(prevSubtasks);
          setItems(prevItems);
        }
      });
  }

  const itemActions: ItemActions = {
    addItem: (subtaskId, kind, label, content) => {
      const item: TaskItem = {
        id: crypto.randomUUID(),
        taskId,
        subtaskId,
        kind,
        label,
        content,
        position: nextPosition(items.filter((i) => i.subtaskId === subtaskId)),
      };
      setItems((prev) => [...prev, item]);
      supabase
        .from("task_items")
        .insert({
          id: item.id,
          task_id: taskId,
          subtask_id: subtaskId,
          user_id: userId,
          kind,
          label,
          content,
          position: item.position,
        })
        .then(({ error }) => {
          if (error) setItems((prev) => prev.filter((i) => i.id !== item.id));
        });
    },

    updateItem: (id, changes) => {
      let prevItem: TaskItem | undefined;
      setItems((prev) =>
        prev.map((i) => {
          if (i.id !== id) return i;
          prevItem = i;
          return { ...i, ...changes };
        })
      );
      supabase
        .from("task_items")
        .update({ label: changes.label, content: changes.content })
        .eq("id", id)
        .then(({ error }) => {
          if (error && prevItem) {
            const restored = prevItem;
            setItems((prev) => prev.map((i) => (i.id === id ? restored : i)));
          }
        });
    },

    deleteItem: (id) => {
      const prevItems = items;
      setItems((prev) => prev.filter((i) => i.id !== id));
      supabase
        .from("task_items")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) setItems(prevItems);
        });
    },
  };

  // --- render

  if (!task) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-600">This task doesn&rsquo;t exist (it may have been deleted).</p>
        <Link href="/" className="mt-3 inline-block text-sm font-medium text-slate-900 underline">
          Back to all tasks
        </Link>
      </div>
    );
  }

  const colorClasses = module ? COLORS[module.color] : null;
  const sortedSubtasks = [...subtasks].sort((a, b) => a.position - b.position);
  const completedCount = subtasks.filter((s) => s.status === "completed").length;
  const pageItems = items.filter((i) => i.subtaskId === null);

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href={module ? `/modules/${module.id}` : "/"}
        className="mb-5 inline-block text-sm text-slate-500 hover:text-slate-900"
      >
        &larr; {module ? module.name : "All tasks"}
      </Link>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-5">

      {/* Header */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {colorClasses && <div className={`h-1 ${colorClasses.bar}`} />}
        <div className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {module && colorClasses && (
                <Link
                  href={`/modules/${module.id}`}
                  className="mb-1 flex w-fit items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 hover:underline"
                >
                  <span className={`h-2 w-2 rounded-full ${colorClasses.dot}`} />
                  {module.name}
                </Link>
              )}
              <InlineText
                value={task.title}
                onSave={(title) => updateTask(task.id, { title })}
                className="text-2xl font-bold tracking-tight text-slate-900"
              />
            </div>
            <button
              onClick={() => setEditingDetails(true)}
              className="shrink-0 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Edit details
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <StatusPicker
              value={task.status}
              onChange={(status) => updateTask(task.id, { status })}
            />
            <div className="flex gap-4 text-sm text-slate-500">
              <span>
                Due{" "}
                <span className="font-medium text-slate-700">
                  {task.dueDate ? formatDueDate(task.dueDate) : "—"}
                </span>
              </span>
              <span>
                Priority{" "}
                <span className="font-medium capitalize text-slate-700">{task.priority}</span>
              </span>
            </div>
          </div>

          <Assignees
            assigneeIds={assigneeIds}
            candidates={moduleMembers}
            currentUserId={userId}
            nameOf={nameOf}
            onAdd={addAssignee}
            onRemove={removeAssignee}
          />
        </div>
      </section>

      {/* Description + task-level notes/links/documents */}
      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Description</h3>
          <AutoSaveTextarea
            value={task.notes}
            onSave={(notes) => updateTask(task.id, { notes })}
            placeholder="Describe the task: what needs to be done, requirements, marking criteria..."
          />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">
            Notes, websites &amp; documents
          </h3>
          <TaskItems items={pageItems} subtaskId={null} actions={itemActions} />
        </div>
      </section>

      {/* Subtasks */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Subtasks</h3>
            {subtasks.length > 0 && (
              <span className="text-xs text-slate-400">
                {completedCount}/{subtasks.length} completed
              </span>
            )}
          </div>
          {newSubtaskTitle === null && (
            <button
              onClick={() => setNewSubtaskTitle("")}
              className="rounded-md px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              + Subtask
            </button>
          )}
        </div>

        {subtasks.length > 0 && (
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${(completedCount / subtasks.length) * 100}%` }}
            />
          </div>
        )}

        {sortedSubtasks.map((subtask) => (
          <SubtaskCard
            key={subtask.id}
            subtask={subtask}
            items={items.filter((i) => i.subtaskId === subtask.id)}
            itemActions={itemActions}
            onChange={(changes) => updateSubtask(subtask.id, changes)}
            onDelete={() => deleteSubtask(subtask.id)}
          />
        ))}

        {newSubtaskTitle !== null ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newSubtaskTitle.trim()) return;
              addSubtask(newSubtaskTitle.trim());
              setNewSubtaskTitle("");
            }}
            className="flex gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <input
              autoFocus
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setNewSubtaskTitle(null)}
              placeholder="Subtask headline, e.g. Literature review"
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <button
              type="button"
              onClick={() => setNewSubtaskTitle(null)}
              className="rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Done
            </button>
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-700"
            >
              Add
            </button>
          </form>
        ) : (
          subtasks.length === 0 && (
            <button
              onClick={() => setNewSubtaskTitle("")}
              className="w-full rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 hover:border-slate-400 hover:bg-white"
            >
              Big task? Split it into subtasks &mdash; each one gets its own status,
              description, notes, websites and documents.
            </button>
          )
        )}
      </section>
      </div>

      {/* Timeline */}
      <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Activity</h3>
        <ActivityTimeline activity={activity} nameOf={nameOf} />
      </aside>
      </div>

      {editingDetails && (
        <TaskModal modules={modules} task={task} onClose={() => setEditingDetails(false)} />
      )}
    </div>
  );
}

// "People working on this": avatars with names, a one-click join/leave for
// the current user, and a picker for adding other module members.
function Assignees({
  assigneeIds,
  candidates,
  currentUserId,
  nameOf,
  onAdd,
  onRemove,
}: {
  assigneeIds: string[];
  candidates: { userId: string; displayName: string }[];
  currentUserId: string;
  nameOf: (id: string) => string;
  onAdd: (userId: string) => void;
  onRemove: (userId: string) => void;
}) {
  const [picking, setPicking] = useState(false);
  const imOn = assigneeIds.includes(currentUserId);
  const addable = candidates.filter(
    (c) => !assigneeIds.includes(c.userId) && c.userId !== currentUserId
  );

  return (
    <div className="border-t border-slate-100 pt-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          People working on this
        </h3>
        <button
          onClick={() => (imOn ? onRemove(currentUserId) : onAdd(currentUserId))}
          className={`rounded-md px-2.5 py-1 text-xs font-medium ${
            imOn
              ? "text-slate-500 hover:bg-slate-100"
              : "bg-slate-900 text-white hover:bg-slate-700"
          }`}
        >
          {imOn ? "Leave" : "I'm working on this"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {assigneeIds.length === 0 && (
          <span className="text-sm text-slate-400">Nobody yet.</span>
        )}
        {assigneeIds.map((id) => (
          <span
            key={id}
            className="group flex items-center gap-1.5 rounded-full bg-slate-100 py-0.5 pl-0.5 pr-2 text-sm text-slate-700"
          >
            <Avatar userId={id} name={nameOf(id)} size="sm" />
            {nameOf(id)}
            <button
              onClick={() => onRemove(id)}
              title={`Remove ${nameOf(id)}`}
              className="text-slate-400 hover:text-rose-600"
            >
              &times;
            </button>
          </span>
        ))}

        {addable.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setPicking((p) => !p)}
              className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-slate-800"
            >
              + Add person
            </button>
            {picking && (
              <ul
                className="absolute left-0 top-full z-20 mt-1 max-h-60 w-56 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                onMouseLeave={() => setPicking(false)}
              >
                {addable.map((c) => (
                  <li key={c.userId}>
                    <button
                      onClick={() => {
                        onAdd(c.userId);
                        setPicking(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Avatar userId={c.userId} name={c.displayName} size="sm" />
                      {c.displayName}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SubtaskCard({
  subtask,
  items,
  itemActions,
  onChange,
  onDelete,
}: {
  subtask: Subtask;
  items: TaskItem[];
  itemActions: ItemActions;
  onChange: (changes: SubtaskChanges) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(true);

  function handleDelete() {
    const hasContent = items.length > 0 || subtask.description.trim() !== "";
    if (hasContent && !confirm(`Delete "${subtask.title}" and everything inside it?`)) return;
    onDelete();
  }

  return (
    <div
      className={`rounded-xl border border-l-4 border-slate-200 bg-white shadow-sm ${
        STATUS_BORDER[subtask.status]
      }`}
    >
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Collapse subtask" : "Expand subtask"}
          className="shrink-0 text-slate-400 hover:text-slate-700"
        >
          <span className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}>
            &#9656;
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <InlineText
            value={subtask.title}
            onSave={(title) => onChange({ title })}
            className={`font-semibold ${
              subtask.status === "completed" ? "text-slate-400 line-through" : "text-slate-900"
            }`}
          />
        </div>
        {!open && items.length > 0 && (
          <span className="shrink-0 text-xs text-slate-400">{items.length} items</span>
        )}
        <select
          value={subtask.status}
          onChange={(e) => onChange({ status: e.target.value as TaskStatus })}
          className={`shrink-0 cursor-pointer rounded-full border-0 py-0.5 pl-2.5 pr-7 text-xs font-medium focus:ring-2 focus:ring-slate-300 ${
            STATUS_PILL[subtask.status]
          }`}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <button
          onClick={handleDelete}
          title="Delete subtask"
          className="shrink-0 rounded px-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600"
        >
          &times;
        </button>
      </div>

      {open && (
        <div className="space-y-4 border-t border-slate-100 px-4 py-4">
          <AutoSaveTextarea
            value={subtask.description}
            onSave={(description) => onChange({ description })}
            placeholder="Describe this subtask..."
            rows={2}
          />
          <TaskItems items={items} subtaskId={subtask.id} actions={itemActions} />
        </div>
      )}
    </div>
  );
}

function StatusPicker({
  value,
  onChange,
}: {
  value: TaskStatus;
  onChange: (status: TaskStatus) => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="radiogroup" aria-label="Status">
      {STATUSES.map((s) => (
        <button
          key={s}
          role="radio"
          aria-checked={value === s}
          onClick={() => onChange(s)}
          className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
            value === s ? `${STATUS_PILL[s]} shadow-sm` : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  );
}

// Click-to-edit single line of text; saves on Enter or blur, Escape cancels.
function InlineText({
  value,
  onSave,
  className,
}: {
  value: string;
  onSave: (value: string) => void;
  className: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  if (draft === null) {
    return (
      <button
        onClick={() => setDraft(value)}
        title="Click to rename"
        className={`block max-w-full truncate text-left hover:text-slate-600 ${className}`}
      >
        {value}
      </button>
    );
  }

  function commit() {
    const next = draft?.trim();
    if (next && next !== value) onSave(next);
    setDraft(null);
  }

  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setDraft(null);
      }}
      className={`w-full rounded-md border border-slate-300 px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-slate-300 ${className}`}
    />
  );
}

// Textarea that saves when it loses focus (only if the text changed).
function AutoSaveTextarea({
  value,
  onSave,
  placeholder,
  rows = 3,
}: {
  value: string;
  onSave: (value: string) => void;
  placeholder: string;
  rows?: number;
}) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);

  // Follow outside changes (e.g. the Edit details modal) while not editing.
  const shown = focused ? draft : value;

  return (
    <textarea
      value={shown}
      onFocus={() => {
        setDraft(value);
        setFocused(true);
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setFocused(false);
        if (draft.trim() !== value) onSave(draft.trim());
      }}
      rows={rows}
      placeholder={placeholder}
      className="w-full resize-y rounded-md border border-transparent bg-slate-50 px-3 py-2 text-sm text-slate-800 hover:border-slate-200 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
    />
  );
}
