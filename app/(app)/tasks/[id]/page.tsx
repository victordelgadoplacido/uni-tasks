import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TaskPage from "@/components/TaskPage";
import { fetchTaskPageData } from "@/lib/supabase/queries";

// The task itself comes from the shared AppDataProvider (already loaded by
// the layout); this page's subtasks, items, activity and assignees are
// fetched here.
export default async function TaskRoute({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const initial = await fetchTaskPageData(supabase, params.id);

  return <TaskPage key={params.id} taskId={params.id} initial={initial} />;
}
