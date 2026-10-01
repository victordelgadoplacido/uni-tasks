"use client";

import { useState } from "react";
import { TaskItem, TaskItemKind } from "@/lib/types";

export interface ItemActions {
  addItem: (subtaskId: string | null, kind: TaskItemKind, label: string, content: string) => void;
  updateItem: (id: string, changes: Pick<TaskItem, "label" | "content">) => void;
  deleteItem: (id: string) => void;
}

const SECTION_TITLE: Record<TaskItemKind, string> = {
  note: "Notes",
  link: "Websites",
  file: "Documents",
};

const ADD_LABEL: Record<TaskItemKind, string> = {
  note: "+ Note",
  link: "+ Website",
  file: "+ Document",
};

const KINDS: TaskItemKind[] = ["note", "link", "file"];

const INPUT =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300";

// Accept "example.com/page" as well as full URLs.
function normalizeUrl(raw: string): string {
  const url = raw.trim();
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
}

// Windows Explorer's "Copy as path" wraps the path in quotes; drop them.
function normalizePath(raw: string): string {
  return raw.trim().replace(/^"(.*)"$/, "$1");
}

function fileName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

function hostName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Shows every note/link/document belonging to one owner (the task page
// itself when subtaskId is null, or a single subtask), plus add/edit forms.
export default function TaskItems({
  items,
  subtaskId,
  actions,
}: {
  items: TaskItem[];
  subtaskId: string | null;
  actions: ItemActions;
}) {
  const [adding, setAdding] = useState<TaskItemKind | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {KINDS.map((kind) => {
        const ofKind = items.filter((i) => i.kind === kind);
        if (ofKind.length === 0 && adding !== kind) return null;
        return (
          <div key={kind}>
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {SECTION_TITLE[kind]}
            </h4>
            <div className="space-y-1.5">
              {ofKind.map((item) =>
                editingId === item.id ? (
                  <ItemForm
                    key={item.id}
                    kind={kind}
                    initial={item}
                    onCancel={() => setEditingId(null)}
                    onSave={(label, content) => {
                      actions.updateItem(item.id, { label, content });
                      setEditingId(null);
                    }}
                  />
                ) : (
                  <ItemView
                    key={item.id}
                    item={item}
                    onEdit={() => setEditingId(item.id)}
                    onDelete={() => actions.deleteItem(item.id)}
                  />
                )
              )}
              {adding === kind && (
                <ItemForm
                  kind={kind}
                  onCancel={() => setAdding(null)}
                  onSave={(label, content) => {
                    actions.addItem(subtaskId, kind, label, content);
                    setAdding(null);
                  }}
                />
              )}
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((kind) => (
          <button
            key={kind}
            onClick={() => {
              setEditingId(null);
              setAdding(kind);
            }}
            className="rounded-md border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-500 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-800"
          >
            {ADD_LABEL[kind]}
          </button>
        ))}
      </div>
    </div>
  );
}

function ItemView({
  item,
  onEdit,
  onDelete,
}: {
  item: TaskItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const controls = (
    <div className="flex shrink-0 gap-1 opacity-0 focus-within:opacity-100 group-hover:opacity-100">
      <button
        onClick={onEdit}
        className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        Edit
      </button>
      <button
        onClick={onDelete}
        className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-600"
      >
        Delete
      </button>
    </div>
  );

  if (item.kind === "note") {
    return (
      <div className="group flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
        <p className="flex-1 whitespace-pre-wrap break-words text-sm text-slate-800">
          {item.content}
        </p>
        {controls}
      </div>
    );
  }

  if (item.kind === "link") {
    return (
      <div className="group flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">
        <span className="text-slate-400" aria-hidden>
          &#128279;
        </span>
        <a
          href={item.content}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1"
        >
          <span className="block truncate text-sm font-medium text-sky-700 hover:underline">
            {item.label || hostName(item.content)}
          </span>
          <span className="block truncate text-xs text-slate-400">{item.content}</span>
        </a>
        {controls}
      </div>
    );
  }

  // Browsers won't open local files from a web page, so documents are shown
  // with a one-click "Copy path" to paste into File Explorer / Finder.
  return (
    <div className="group flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">
      <span className="text-slate-400" aria-hidden>
        &#128196;
      </span>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-800">
          {item.label || fileName(item.content)}
        </span>
        <span className="block truncate text-xs text-slate-400" title={item.content}>
          {item.content}
        </span>
      </div>
      <button
        onClick={() => {
          navigator.clipboard.writeText(item.content).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        title="Copy the path, then paste it into File Explorer's address bar to open it"
        className="shrink-0 rounded-md border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-white"
      >
        {copied ? "Copied!" : "Copy path"}
      </button>
      {controls}
    </div>
  );
}

function ItemForm({
  kind,
  initial,
  onSave,
  onCancel,
}: {
  kind: TaskItemKind;
  initial?: TaskItem;
  onSave: (label: string, content: string) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [content, setContent] = useState(initial?.content ?? "");

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    const value =
      kind === "link"
        ? normalizeUrl(content)
        : kind === "file"
        ? normalizePath(content)
        : content.trim();
    onSave(label.trim(), value);
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCancel();
        }
      }}
      className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
    >
      {kind === "note" ? (
        <textarea
          autoFocus
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit(e);
          }}
          rows={3}
          className={INPUT}
          placeholder="Write a note..."
        />
      ) : (
        <>
          <input
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={INPUT}
            placeholder={
              kind === "link"
                ? "https://..."
                : "C:\\Users\\you\\Documents\\uni\\essay-draft.docx"
            }
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className={INPUT}
            placeholder="Display name (optional)"
          />
          {kind === "file" && (
            <p className="text-xs text-slate-500">
              Tip: in File Explorer, Shift + right-click a file and choose
              &ldquo;Copy as path&rdquo;, then paste it here.
            </p>
          )}
        </>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3 py-1 text-sm font-medium text-white hover:bg-slate-700"
        >
          {initial ? "Save" : "Add"}
        </button>
      </div>
    </form>
  );
}
