-- uni-tasks: shared modules, task assignees, per-task activity timeline and
-- personal week plans. Apply via the Supabase SQL Editor after 0003.
--
-- Access model: a module has members (one owner + invited people). Every
-- member can see and edit the module's tasks, subtasks and items. Only the
-- owner can rename/recolor/delete the module or invite/remove members.

------------------------------------------------------------------------------
-- Display names
------------------------------------------------------------------------------

alter table public.profiles add column display_name text not null default '';

update public.profiles p
set display_name = split_part(u.email, '@', 1)
from auth.users u
where u.id = p.id and p.display_name = '';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    'user',
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
             split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

-- Users may change their own name, but never their role, so this goes
-- through a function instead of an update policy on profiles.
create function public.set_display_name(p_name text)
returns void
language sql
security definer set search_path = public
as $$
  update public.profiles
  set display_name = left(trim(p_name), 60)
  where id = auth.uid() and trim(p_name) <> '';
$$;

------------------------------------------------------------------------------
-- Module membership
------------------------------------------------------------------------------

create table public.module_members (
  module_id uuid not null references public.modules(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  added_at timestamptz not null default now(),
  primary key (module_id, user_id)
);

create index module_members_user_id_idx on public.module_members (user_id);

insert into public.module_members (module_id, user_id, role)
select id, user_id, 'owner' from public.modules;

-- Helpers used by the RLS policies below. security definer so they can read
-- module_members/tasks without recursing into those tables' own policies.
create function public.is_module_member(p_module_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.module_members
    where module_id = p_module_id and user_id = auth.uid()
  );
$$;

create function public.is_module_owner(p_module_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.module_members
    where module_id = p_module_id and user_id = auth.uid() and role = 'owner'
  );
$$;

create function public.can_access_task(p_task_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.tasks t
    join public.module_members m on m.module_id = t.module_id
    where t.id = p_task_id and m.user_id = auth.uid()
  );
$$;

create function public.shares_module_with(p_user_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.module_members a
    join public.module_members b on b.module_id = a.module_id
    where a.user_id = auth.uid() and b.user_id = p_user_id
  );
$$;

alter table public.module_members enable row level security;

create policy "members see module members" on public.module_members
  for select using (public.is_module_member(module_id));

-- Owner removes anyone but themselves; members can remove themselves (leave).
create policy "owner removes members, members leave" on public.module_members
  for delete using (
    role <> 'owner'
    and (user_id = auth.uid() or public.is_module_owner(module_id))
  );
-- No insert policy: rows are added by the trigger below (owner) and by
-- add_module_member() (invites).

create function public.add_module_owner()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.module_members (module_id, user_id, role)
  values (new.id, new.user_id, 'owner');
  return new;
end;
$$;

create trigger on_module_created
  after insert on public.modules
  for each row execute function public.add_module_owner();

-- Invite an existing account by email. Returns the new member's user id.
create function public.add_module_member(p_module_id uuid, p_email text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if not public.is_module_owner(p_module_id) then
    raise exception 'Only the module owner can invite people.';
  end if;

  select id into v_user_id from auth.users
  where lower(email) = lower(trim(p_email));

  if v_user_id is null then
    raise exception 'No account uses that email. Ask them to sign up first.';
  end if;

  insert into public.module_members (module_id, user_id, role)
  values (p_module_id, v_user_id, 'member')
  on conflict (module_id, user_id) do nothing;

  return v_user_id;
end;
$$;

-- Profiles: see your own and those of people you share a module with.
create policy "read co-member profiles" on public.profiles
  for select using (public.shares_module_with(id));

------------------------------------------------------------------------------
-- Modules, tasks, subtasks, items: access by membership instead of owner
------------------------------------------------------------------------------

drop policy "own modules" on public.modules;

create policy "members see modules" on public.modules
  for select using (public.is_module_member(id));
create policy "create own modules" on public.modules
  for insert with check (user_id = auth.uid());
create policy "owner updates module" on public.modules
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner deletes module" on public.modules
  for delete using (user_id = auth.uid());

-- tasks.user_id now means "created by".
drop policy "own tasks" on public.tasks;

create policy "members see tasks" on public.tasks
  for select using (public.is_module_member(module_id));
create policy "members create tasks" on public.tasks
  for insert with check (user_id = auth.uid() and public.is_module_member(module_id));
create policy "members update tasks" on public.tasks
  for update using (public.is_module_member(module_id))
  with check (public.is_module_member(module_id));
create policy "members delete tasks" on public.tasks
  for delete using (public.is_module_member(module_id));

drop policy "own subtasks" on public.subtasks;

create policy "members see subtasks" on public.subtasks
  for select using (public.can_access_task(task_id));
create policy "members create subtasks" on public.subtasks
  for insert with check (user_id = auth.uid() and public.can_access_task(task_id));
create policy "members update subtasks" on public.subtasks
  for update using (public.can_access_task(task_id))
  with check (public.can_access_task(task_id));
create policy "members delete subtasks" on public.subtasks
  for delete using (public.can_access_task(task_id));

drop policy "own task items" on public.task_items;

create policy "members see task items" on public.task_items
  for select using (public.can_access_task(task_id));
create policy "members create task items" on public.task_items
  for insert with check (user_id = auth.uid() and public.can_access_task(task_id));
create policy "members update task items" on public.task_items
  for update using (public.can_access_task(task_id))
  with check (public.can_access_task(task_id));
create policy "members delete task items" on public.task_items
  for delete using (public.can_access_task(task_id));

create or replace function public.reorder_module_tasks(p_ids uuid[])
returns void
language sql
security invoker
as $$
  update public.tasks t
  set module_order = o.ord - 1
  from unnest(p_ids) with ordinality as o(id, ord)
  where t.id = o.id and public.is_module_member(t.module_id);
$$;

------------------------------------------------------------------------------
-- Personal week plans (each person plans shared tasks on their own days)
------------------------------------------------------------------------------

create table public.task_plans (
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  planned_date date not null,
  plan_order integer not null default 0,
  primary key (user_id, task_id)
);

alter table public.task_plans enable row level security;

create policy "own task plans" on public.task_plans
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into public.task_plans (user_id, task_id, planned_date, plan_order)
select user_id, id, planned_date, plan_order
from public.tasks
where planned_date is not null;

alter table public.tasks drop column planned_date;
alter table public.tasks drop column plan_order;

-- Same signature as before; now writes the caller's own plans. A null
-- planned_date removes the task from the caller's week.
create or replace function public.reorder_tasks(p_updates jsonb)
returns void
language plpgsql
security invoker
as $$
declare
  u jsonb;
begin
  for u in select * from jsonb_array_elements(p_updates) loop
    if u ->> 'planned_date' is null then
      delete from public.task_plans
      where user_id = auth.uid() and task_id = (u ->> 'id')::uuid;
    else
      insert into public.task_plans (user_id, task_id, planned_date, plan_order)
      values (auth.uid(), (u ->> 'id')::uuid, (u ->> 'planned_date')::date,
              coalesce((u ->> 'plan_order')::int, 0))
      on conflict (user_id, task_id) do update
      set planned_date = excluded.planned_date, plan_order = excluded.plan_order;
    end if;
  end loop;
end;
$$;

------------------------------------------------------------------------------
-- People working on a task
------------------------------------------------------------------------------

create table public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

alter table public.task_assignees enable row level security;

create policy "members see assignees" on public.task_assignees
  for select using (public.can_access_task(task_id));
-- Anyone in the module can assign anyone else in the module.
create policy "members assign co-members" on public.task_assignees
  for insert with check (
    public.can_access_task(task_id)
    and exists (
      select 1 from public.tasks t
      join public.module_members m on m.module_id = t.module_id
      where t.id = task_id and m.user_id = task_assignees.user_id
    )
  );
create policy "members unassign" on public.task_assignees
  for delete using (public.can_access_task(task_id));

------------------------------------------------------------------------------
-- Activity timeline, written by triggers so every client's changes appear
------------------------------------------------------------------------------

create table public.task_activity (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.tasks(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index task_activity_task_id_idx on public.task_activity (task_id, created_at desc);

alter table public.task_activity enable row level security;

create policy "members see activity" on public.task_activity
  for select using (public.can_access_task(task_id));
-- No insert/update/delete policies: only the triggers below write here.

create function public.log_task_activity(p_task_id uuid, p_action text, p_details jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  -- Skip when the task itself is being deleted (cascades would otherwise
  -- try to log against a task that no longer exists).
  if exists (select 1 from public.tasks where id = p_task_id) then
    insert into public.task_activity (task_id, actor_id, action, details)
    values (p_task_id, auth.uid(), p_action, p_details);
  end if;
end;
$$;

create function public.track_task_changes()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_task_activity(new.id, 'task_created', jsonb_build_object('title', new.title));
    return new;
  end if;

  if new.title is distinct from old.title then
    perform public.log_task_activity(new.id, 'task_renamed',
      jsonb_build_object('from', old.title, 'to', new.title));
  end if;
  if new.status is distinct from old.status then
    perform public.log_task_activity(new.id, 'task_status',
      jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  if new.notes is distinct from old.notes then
    perform public.log_task_activity(new.id, 'description_edited', '{}'::jsonb);
  end if;
  if new.due_date is distinct from old.due_date then
    perform public.log_task_activity(new.id, 'due_date_changed',
      jsonb_build_object('to', new.due_date));
  end if;
  if new.priority is distinct from old.priority then
    perform public.log_task_activity(new.id, 'priority_changed',
      jsonb_build_object('to', new.priority));
  end if;
  if new.module_id is distinct from old.module_id then
    perform public.log_task_activity(new.id, 'task_moved',
      jsonb_build_object('module', (select name from public.modules where id = new.module_id)));
  end if;
  return new;
end;
$$;

create trigger track_task_changes
  after insert or update on public.tasks
  for each row execute function public.track_task_changes();

create function public.track_subtask_changes()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_task_activity(new.task_id, 'subtask_created',
      jsonb_build_object('title', new.title));
    return new;
  elsif tg_op = 'DELETE' then
    perform public.log_task_activity(old.task_id, 'subtask_deleted',
      jsonb_build_object('title', old.title));
    return old;
  end if;

  if new.status is distinct from old.status then
    perform public.log_task_activity(new.task_id, 'subtask_status',
      jsonb_build_object('title', new.title, 'from', old.status, 'to', new.status));
  end if;
  if new.title is distinct from old.title then
    perform public.log_task_activity(new.task_id, 'subtask_renamed',
      jsonb_build_object('from', old.title, 'to', new.title));
  end if;
  if new.description is distinct from old.description then
    perform public.log_task_activity(new.task_id, 'subtask_description_edited',
      jsonb_build_object('title', new.title));
  end if;
  return new;
end;
$$;

create trigger track_subtask_changes
  after insert or update or delete on public.subtasks
  for each row execute function public.track_subtask_changes();

create function public.track_task_item_changes()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  r public.task_items;
  v_subtask text;
  v_action text;
begin
  if tg_op = 'DELETE' then
    r := old;
  else
    r := new;
  end if;

  if r.subtask_id is not null then
    select title into v_subtask from public.subtasks where id = r.subtask_id;
    -- Subtask is being deleted: its own 'subtask_deleted' entry covers this.
    if v_subtask is null then
      return r;
    end if;
  end if;

  v_action := case tg_op
    when 'INSERT' then 'item_added'
    when 'UPDATE' then 'item_edited'
    else 'item_removed'
  end;

  perform public.log_task_activity(r.task_id, v_action, jsonb_build_object(
    'kind', r.kind,
    'text', case when r.label <> '' then r.label else left(r.content, 80) end,
    'subtask', v_subtask
  ));
  return r;
end;
$$;

create trigger track_task_item_changes
  after insert or update or delete on public.task_items
  for each row execute function public.track_task_item_changes();

create function public.track_assignee_changes()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_task_activity(new.task_id, 'assignee_added',
      jsonb_build_object('user_id', new.user_id));
    return new;
  end if;
  perform public.log_task_activity(old.task_id, 'assignee_removed',
    jsonb_build_object('user_id', old.user_id));
  return old;
end;
$$;

create trigger track_assignee_changes
  after insert or delete on public.task_assignees
  for each row execute function public.track_assignee_changes();

------------------------------------------------------------------------------
-- Live updates: let the app subscribe to changes made by other members
------------------------------------------------------------------------------

alter publication supabase_realtime
  add table public.modules, public.module_members, public.tasks, public.task_activity;
