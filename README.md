# Uni Tasks

A small Next.js app for tracking to-do items across your university modules,
with a list view (grouped by module) and a calendar view for anything with a
due date. Each person signs in with their own account and only ever sees
their own modules/tasks/routines — data is stored in Supabase (hosted
Postgres + auth), not the browser.

## Setup

1. Install [Node.js LTS](https://nodejs.org) (20.x or newer).
2. From this folder, install dependencies:

```bash
npm install
```

3. Create a [Supabase](https://supabase.com) project (free tier is fine).
   - In the SQL Editor, run the contents of
     [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
     once to create the tables and Row Level Security policies.
   - In Authentication → URL Configuration, add
     `http://localhost:3000/auth/callback` as a redirect URL (add your
     production URL's `/auth/callback` too once you deploy).
4. Copy `.env.example` to `.env.local` and fill in the three Supabase values
   from Project Settings → API (URL, `anon` public key, `service_role` key —
   keep the service role key secret, it's never sent to the browser):

```bash
cp .env.example .env.local
```

5. Start the dev server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) and sign up.

### Making yourself an admin

There's no in-app way to create an admin (by design). After signing up once,
run this in the Supabase SQL Editor:

```sql
update public.profiles set role = 'admin' where id = (
  select id from auth.users where email = 'you@example.com'
);
```

Admins get an "Admin" tab listing every user, with a button to send that user
a password-reset email. Admins can never see anyone's actual password —
Supabase hashes and stores passwords itself; this app never touches them.

## Using it

- **List view** (`/`): tasks grouped by module. Click a module name to edit/
  delete it, click "+ Task" to add one, click a task to edit it, check the
  box to mark it done.
- **Calendar view** (`/calendar`): monthly grid, tasks with a due date show
  up as colored chips on their day (color = module). Click an empty day to
  add a task due that day; click a chip to edit that task.
- **Week view** (`/week`): plan the rest of the week by dragging tasks onto
  days, plus daily routines.
- Everything saves automatically to your Supabase project as you go.

## Project structure

```
app/
  (auth)/                 Login, signup, password reset pages (no account needed)
  (app)/                  Everything that requires a signed-in user
    layout.tsx             Auth gate + fetches this user's data + header/nav
    page.tsx               List view
    calendar/page.tsx      Calendar view
    week/page.tsx           Week view
    admin/                  Admin-only user list + password-reset trigger
  auth/callback/route.ts   Exchanges a Supabase auth code for a session
  providers.tsx            Shared state (modules + tasks + ...), backed by Supabase
components/
  ModuleSection.tsx  One module's card + its tasks (list view)
  CalendarGrid.tsx   Month grid
  TaskRow.tsx        Single task row
  TaskModal.tsx       Add/edit task form
  ModuleModal.tsx     Add/edit module form
  NavTabs.tsx        List/Calendar/Week/Admin tab switcher
  SignOutButton.tsx  Signs out and redirects to /login
  admin/AdminUserTable.tsx  User list + "send password reset" button
lib/
  types.ts   Module/Task types
  colors.ts  Module color palette (Tailwind classes)
  date.ts    Date formatting + calendar grid helpers
  supabase/  Browser/server/admin Supabase clients + DB row mappers
  admin/     Server-only admin helpers (list users, verify admin role)
supabase/migrations/0001_init.sql   Database schema + Row Level Security
middleware.ts   Redirects signed-out visitors to /login
```

Calendar-import (`.ics`) data stays local to your browser, since it's a
re-imported cached feed rather than data you author.

## Hosting it for your friends, for free

See the setup steps above for the Supabase side. For hosting the Next.js app
itself, [Vercel](https://vercel.com)'s free tier is the natural fit (built by
the Next.js team, zero-config for this app):

1. Push this repo to GitHub.
2. In Vercel, "Add New Project" → import the repo. It auto-detects Next.js.
3. Add the same four env vars from `.env.local` in the Vercel project's
   Settings → Environment Variables, but set `NEXT_PUBLIC_SITE_URL` to your
   Vercel URL (e.g. `https://your-app.vercel.app`).
4. Deploy. Then add `https://your-app.vercel.app/auth/callback` as a redirect
   URL in Supabase (Authentication → URL Configuration), alongside the
   localhost one.
5. Share the Vercel URL with your friends so they can sign up.

Both Vercel's and Supabase's free tiers are generous enough for a small group
of friends using a to-do app.
