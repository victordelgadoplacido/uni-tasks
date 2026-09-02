import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default function SignOutButton() {
  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        Sign out
      </button>
    </form>
  );
}
