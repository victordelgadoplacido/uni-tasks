-- uni-tasks: user-defined task order within a module (module page drag and
-- drop). Apply via the Supabase SQL Editor after 0002_task_pages.sql.

alter table public.tasks
  add column module_order integer not null default 0;

-- Start from the order the list view already showed: open tasks first, then
-- by due date (undated last), then oldest first.
update public.tasks t
set module_order = s.rn
from (
  select id,
         row_number() over (
           partition by module_id
           order by done, due_date nulls last, created_at
         ) - 1 as rn
  from public.tasks
) s
where t.id = s.id;

-- Sets module_order to each id's index in p_ids, in one round trip. Scoped
-- to the caller via auth.uid(), same as the RLS policies.
create function public.reorder_module_tasks(p_ids uuid[])
returns void
language sql
security invoker
as $$
  update public.tasks t
  set module_order = o.ord - 1
  from unnest(p_ids) with ordinality as o(id, ord)
  where t.id = o.id and t.user_id = auth.uid();
$$;
