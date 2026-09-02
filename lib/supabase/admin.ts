import "server-only";
import { createClient as createRawClient } from "@supabase/supabase-js";

// Service-role client: bypasses Row Level Security entirely. Only import
// this from server-only code (Server Components / Server Actions / Route
// Handlers) that has already independently verified the caller is an admin.
// The `server-only` import above turns an accidental client-bundle import
// into a build error.
export function createAdminClient() {
  return createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
