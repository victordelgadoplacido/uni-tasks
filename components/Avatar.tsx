// Initials in a colored circle; the color is stable per user id.
const AVATAR_COLORS = [
  "bg-sky-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-orange-500",
];

function colorFor(userId: string): string {
  let hash = 0;
  for (const ch of userId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({
  userId,
  name,
  size = "md",
}: {
  userId: string;
  name: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      title={name}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ring-2 ring-white ${colorFor(
        userId
      )} ${size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs"}`}
    >
      {initials(name)}
    </span>
  );
}

// Overlapping row of avatars, e.g. a module's members or a task's assignees.
export function AvatarStack({
  people,
  max = 4,
  size = "sm",
}: {
  people: { userId: string; displayName: string }[];
  max?: number;
  size?: "sm" | "md";
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <span className="flex -space-x-1.5">
      {shown.map((p) => (
        <Avatar key={p.userId} userId={p.userId} name={p.displayName} size={size} />
      ))}
      {extra > 0 && (
        <span
          className={`inline-flex items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600 ring-2 ring-white ${
            size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs"
          }`}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}
