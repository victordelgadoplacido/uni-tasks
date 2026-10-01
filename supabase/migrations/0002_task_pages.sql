-- uni-tasks: per-task pages (status, optional subtasks, notes/links/files).
-- Apply via the Supabase SQL Editor after 0001_init.sql.

-- Three-state status. `done` stays as-is (the list/week/calendar views read
-- it) and the app keeps it in sync: done = (status = 'completed').
alter table public.tasks
  add column status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed'));

update public.tasks set status = 'completed' where done;

-- subtasks: optional containers inside a task page, each with its own
-- headline, description, status and items.
create table public.subtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed')),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index subtasks_task_id_idx on public.subtasks (task_id);

alter table public.subtasks enable row level security;

create policy "own subtasks" on public.subtasks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- task_items: notes, website links and local file paths attached either to
-- the task page itself (subtask_id null) or to one of its subtasks.
--   note: content = the note text, label unused
--   link: content = URL, label = optional display name
--   file: content = path on the user's computer, label = optional display name
create table public.task_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  subtask_id uuid references public.subtasks(id) on delete cascade,
  kind text not null check (kind in ('note', 'link', 'file')),
  label text not null default '',
  content text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index task_items_task_id_idx on public.task_items (task_id);

alter table public.task_items enable row level security;

create policy "own task items" on public.task_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
