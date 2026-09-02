-- uni-tasks: users, roles, and per-user data with Row Level Security.
-- Apply via the Supabase SQL Editor, or `supabase db push` if using the CLI.

-- profiles: one row per auth.users row, holds role only.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "read own profile" on public.profiles
  for select using (id = auth.uid());
-- Deliberately no insert/update/delete policy for regular users: role can
-- only be changed via the service-role key (bypasses RLS), never by users.

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role) values (new.id, 'user');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- modules
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null check (
    color in ('blue', 'purple', 'emerald', 'amber', 'rose', 'teal', 'indigo', 'orange')
  ),
  created_at timestamptz not null default now()
);

alter table public.modules enable row level security;

create policy "own modules" on public.modules
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  notes text not null default '',
  due_date date,
  done boolean not null default false,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  planned_date date,
  plan_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "own tasks" on public.tasks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- routines
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

alter table public.routines enable row level security;

create policy "own routines" on public.routines
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- routine_completions: which routines were checked off on which date.
create table public.routine_completions (
  routine_id uuid not null references public.routines(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_date date not null,
  primary key (routine_id, completed_date)
);

alter table public.routine_completions enable row level security;

create policy "own routine completions" on public.routine_completions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Batched reorder for the Week view's drag-and-drop: updates plan_order (and
-- planned_date) for many tasks in one round trip. A plain PostgREST
-- .upsert() can't be used here because its INSERT ... ON CONFLICT path still
-- enforces NOT NULL on columns omitted from the partial row (title,
-- module_id, ...); this does real per-row UPDATEs instead, scoped to the
-- caller via auth.uid() same as the RLS policies above.
create function public.reorder_tasks(p_updates jsonb)
returns void
language plpgsql
security invoker
as $$
declare
  u jsonb;
begin
  for u in select * from jsonb_array_elements(p_updates) loop
    update public.tasks
    set planned_date = (u ->> 'planned_date')::date,
        plan_order = (u ->> 'plan_order')::int
    where id = (u ->> 'id')::uuid and user_id = auth.uid();
  end loop;
end;
$$;
