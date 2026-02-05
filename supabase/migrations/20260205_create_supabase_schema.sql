-- Change Approval System schema for Supabase

create table if not exists public.users (
  id text primary key,
  auth_id uuid,
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('user', 'reviewer', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Admin credentials for username/password login (demo use only)
create table if not exists public.admin_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  username text unique not null,
  password text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.change_requests (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  reviewer_id text references public.users(id) on delete set null,
  title text not null,
  description text not null,
  priority text not null check (priority in ('low','medium','high','critical')),
  status text not null check (status in ('pending','under_review','approved','rejected')),
  attachment_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id text primary key,
  request_id text not null references public.change_requests(id) on delete cascade,
  reviewer_id text references public.users(id) on delete set null,
  comment text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  request_id text not null references public.change_requests(id) on delete cascade,
  type text not null check (type in ('new_request','status_update','comment_added','request_assigned')),
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Optional: indexes for common lookups
create index if not exists idx_change_requests_user_id on public.change_requests(user_id);
create index if not exists idx_change_requests_status on public.change_requests(status);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_admin_credentials_username on public.admin_credentials(username);
