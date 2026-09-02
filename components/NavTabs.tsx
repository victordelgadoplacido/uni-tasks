"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "List" },
  { href: "/calendar", label: "Calendar" },
  { href: "/week", label: "Week" },
];

export default function NavTabs({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const tabs = isAdmin ? [...TABS, { href: "/admin", label: "Admin" }] : TABS;

  return (
    <nav className="flex gap-1 rounded-lg bg-slate-200/60 p-1">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
