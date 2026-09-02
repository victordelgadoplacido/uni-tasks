"use client";

import { useState } from "react";
import { sendPasswordReset } from "@/app/(app)/admin/actions";
import type { AdminUser } from "@/lib/admin/users";

export default function AdminUserTable({ users }: { users: AdminUser[] }) {
  const [status, setStatus] = useState<Record<string, string>>({});

  async function handleReset(email: string) {
    setStatus((prev) => ({ ...prev, [email]: "Sending..." }));
    const result = await sendPasswordReset(email);
    setStatus((prev) => ({
      ...prev,
      [email]: result.ok ? "Reset email sent" : result.error,
    }));
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2 font-medium">Email</th>
            <th className="px-4 py-2 font-medium">Role</th>
            <th className="px-4 py-2 font-medium">Joined</th>
            <th className="px-4 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-3 text-slate-900">{u.email}</td>
              <td className="px-4 py-3 text-slate-600">{u.role}</td>
              <td className="px-4 py-3 text-slate-600">
                {new Date(u.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => handleReset(u.email)}
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Send password reset
                </button>
                {status[u.email] && (
                  <p className="mt-1 text-xs text-slate-500">{status[u.email]}</p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
