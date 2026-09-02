"use server";

import { createClient } from "@/lib/supabase/server";
import { assertIsAdmin } from "@/lib/admin/users";

// The admin never sees, generates, or handles a user's actual password —
// this only triggers Supabase's own password-recovery email; the user sets
// their new password themselves on /update-password.
export async function sendPasswordReset(
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await assertIsAdmin();

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/update-password`,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
