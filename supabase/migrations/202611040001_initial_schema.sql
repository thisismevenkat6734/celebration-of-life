-- =========================================================
-- COL | CELEBRATION OF LIFE
-- Initial Database Schema
-- =========================================================

create extension if not exists pgcrypto;

-- 1. ENUM TYPES

create type public.profile_visibility as enum (
  'public',
  'private'
);

create type public.post_visibility as enum (
  'public',
  'followers',
  'private'
);

create type public.reaction_type as enum (
  'like',
  'celebrate',
  'love',
  'clap'
);

create type public.report_status as enum (
  'pending',
  'reviewing',
  'resolved',
  'dismissed'
);

-- 2. UPDATED AT FUNCTION

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 3. USER PROFILES

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  bio text not null default '',
  avatar_url text,
  location text,
  visibility public.profile_visibility not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint username_format check (
    username ~ '^[a-zA-Z0-9_]{3,30}$'
  ),
  constraint display_name_length check (
    char_length(display_name) between 1 and 60
  ),
  constraint bio_length check (
    char_length(bio) <= 300
  )
);

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- 4. CATEGORIES

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.categories (name, slug, description)
values
  ('Birthday', 'birthday', 'Birthday celebrations'),
  ('Wedding', 'wedding', 'Wedding memories'),
  ('Achievement', 'achievement', 'Personal and professional achievements'),
  ('Family', 'family', 'Beautiful family moments'),
  ('Friendship', 'friendship', 'Memories with friends'),
  ('Travel', 'travel', 'Travel and adventure moments'),
  ('Festivals', 'festivals', 'Festival celebrations'),
  ('Graduation', 'graduation', 'Graduation and education milestones'),
  ('Other', 'other', 'Other happy moments');

-- 5. POSTS

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  caption text not null default '',
  visibility public.post_visibility not null default 'public',
  comments_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint post_caption_length check (
    char_length(caption) <= 5000
  )
);

create index posts_user_created_idx
on public.posts(user_id, created_at desc);

create index posts_created_idx
on public.posts(created_at desc);

create trigger posts_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

-- 6. POST MEDIA

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  media_type text not null,
  storage_path text not null,
  thumbnail_path text,
  media_duration_seconds integer,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),

  constraint media_type_valid check (
    media_type in ('image', 'video', 'audio')
  ),
  constraint media_duration_valid check (
    media_duration_seconds is null
    or media_duration_seconds between 1 and 30
  ),
  constraint storage_path_length check (
    char_length(storage_path) between 1 and 1000
  )
);

create index post_media_post_idx
on public.post_media(post_id, display_order);

-- 7. FOLLOWERS

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (follower_id, following_id),

  constraint no_self_follow check (
    follower_id <> following_id
  )
);

create index follows_following_idx
on public.follows(following_id);

-- 8. REACTIONS

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction public.reaction_type not null default 'like',
  created_at timestamptz not null default now(),

  unique (post_id, user_id)
);

create index reactions_post_idx
on public.reactions(post_id);

-- 9. COMMENTS

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint comment_content_length check (
    char_length(content) between 1 and 2000
  )
);

create index comments_post_idx
on public.comments(post_id, created_at);

create trigger comments_updated_at
before update on public.comments
for each row execute function public.set_updated_at();

-- 10. NOTIFICATIONS

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  notification_type text not null,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),

  constraint notification_type_valid check (
    notification_type in (
      'follow',
      'reaction',
      'comment',
      'mention'
    )
  )
);

create index notifications_recipient_idx
on public.notifications(recipient_id, created_at desc);

-- 11. BLOCKED USERS

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (blocker_id, blocked_id),

  constraint no_self_block check (
    blocker_id <> blocked_id
  )
);

-- 12. REPORTS

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete set null,
  post_id uuid references public.posts(id) on delete set null,
  comment_id uuid references public.comments(id) on delete set null,
  reason text not null,
  details text not null default '',
  status public.report_status not null default 'pending',
  created_at timestamptz not null default now(),

  constraint report_reason_length check (
    char_length(reason) between 2 and 100
  ),
  constraint report_details_length check (
    char_length(details) <= 2000
  ),
  constraint report_target_required check (
    reported_user_id is not null
    or post_id is not null
    or comment_id is not null
  )
);

create index reports_status_idx
on public.reports(status, created_at desc);

-- 13. SECURITY HELPER FUNCTIONS

create or replace function public.is_following(
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.follows f
    where f.follower_id = (select auth.uid())
      and f.following_id = target_user_id
  );
$$;

create or replace function public.is_blocked(
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.blocks b
    where (
      b.blocker_id = (select auth.uid())
      and b.blocked_id = target_user_id
    )
    or (
      b.blocker_id = target_user_id
      and b.blocked_id = (select auth.uid())
    )
  );
$$;

create or replace function public.can_view_post(
  target_post_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.posts p
    join public.profiles pr on pr.id = p.user_id
    where p.id = target_post_id
      and (
        p.user_id = (select auth.uid())
        or (
          not public.is_blocked(p.user_id)
          and (
            (
              p.visibility = 'public'
              and pr.visibility = 'public'
            )
            or (
              p.visibility = 'followers'
              and public.is_following(p.user_id)
            )
            or (
              pr.visibility = 'public'
              and p.visibility = 'followers'
              and public.is_following(p.user_id)
            )
          )
        )
      )
  );
$$;

-- 14. ENABLE ROW LEVEL SECURITY

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.follows enable row level security;
alter table public.reactions enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

-- 15. PROFILE POLICIES

create policy "Profiles visible to permitted users"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (
    visibility = 'public'
    and not public.is_blocked(id)
  )
  or (
    visibility = 'private'
    and public.is_following(id)
    and not public.is_blocked(id)
  )
);

create policy "Users create their own profile"
on public.profiles
for insert
to authenticated
with check (
  id = (select auth.uid())
);

create policy "Users update their own profile"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- 16. CATEGORY POLICIES

create policy "Authenticated users view active categories"
on public.categories
for select
to authenticated
using (is_active = true);

-- 17. POST POLICIES

create policy "Users view permitted posts"
on public.posts
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (
    not public.is_blocked(user_id)
    and (
      (
        visibility = 'public'
        and exists (
          select 1
          from public.profiles pr
          where pr.id = user_id
            and pr.visibility = 'public'
        )
      )
      or (
        visibility = 'followers'
        and public.is_following(user_id)
      )
    )
  )
);

create policy "Users create their own posts"
on public.posts
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);

create policy "Users update their own posts"
on public.posts
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users delete their own posts"
on public.posts
for delete
to authenticated
using (user_id = (select auth.uid()));

-- 18. POST MEDIA POLICIES

create policy "View media of permitted posts"
on public.post_media
for select
to authenticated
using (
  public.can_view_post(post_id)
);

create policy "Owners add post media"
on public.post_media
for insert
to authenticated
with check (
  exists (
    select 1
    from public.posts p
    where p.id = post_id
      and p.user_id = (select auth.uid())
  )
);

create policy "Owners update post media"
on public.post_media
for update
to authenticated
using (
  exists (
    select 1
    from public.posts p
    where p.id = post_id
      and p.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.posts p
    where p.id = post_id
      and p.user_id = (select auth.uid())
  )
);

create policy "Owners delete post media"
on public.post_media
for delete
to authenticated
using (
  exists (
    select 1
    from public.posts p
    where p.id = post_id
      and p.user_id = (select auth.uid())
  )
);

-- 19. FOLLOW POLICIES

create policy "Users view permitted follows"
on public.follows
for select
to authenticated
using (
  follower_id = (select auth.uid())
  or following_id = (select auth.uid())
  or (
    not public.is_blocked(following_id)
    and not public.is_blocked(follower_id)
  )
);

create policy "Users follow other users"
on public.follows
for insert
to authenticated
with check (
  follower_id = (select auth.uid())
  and follower_id <> following_id
  and not public.is_blocked(following_id)
);

create policy "Users unfollow"
on public.follows
for delete
to authenticated
using (
  follower_id = (select auth.uid())
);

-- 20. REACTION POLICIES

create policy "View reactions on permitted posts"
on public.reactions
for select
to authenticated
using (
  public.can_view_post(post_id)
);

create policy "Users add their own reactions"
on public.reactions
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and public.can_view_post(post_id)
);

create policy "Users update their own reactions"
on public.reactions
for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and public.can_view_post(post_id)
);

create policy "Users remove their own reactions"
on public.reactions
for delete
to authenticated
using (user_id = (select auth.uid()));

-- 21. COMMENT POLICIES

create policy "View comments on permitted posts"
on public.comments
for select
to authenticated
using (
  public.can_view_post(post_id)
);

create policy "Users comment on permitted posts"
on public.comments
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and public.can_view_post(post_id)
  and exists (
    select 1
    from public.posts p
    where p.id = post_id
      and p.comments_enabled = true
  )
);

create policy "Users update their own comments"
on public.comments
for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
);

create policy "Users delete their own comments"
on public.comments
for delete
to authenticated
using (user_id = (select auth.uid()));

-- 22. NOTIFICATION POLICIES

create policy "Users view their notifications"
on public.notifications
for select
to authenticated
using (
  recipient_id = (select auth.uid())
);

create policy "Users update their notifications"
on public.notifications
for update
to authenticated
using (
  recipient_id = (select auth.uid())
)
with check (
  recipient_id = (select auth.uid())
);

-- 23. BLOCK POLICIES

create policy "Users view their own blocks"
on public.blocks
for select
to authenticated
using (
  blocker_id = (select auth.uid())
);

create policy "Users block other users"
on public.blocks
for insert
to authenticated
with check (
  blocker_id = (select auth.uid())
  and blocker_id <> blocked_id
);

create policy "Users unblock users"
on public.blocks
for delete
to authenticated
using (
  blocker_id = (select auth.uid())
);

-- 24. REPORT POLICIES

create policy "Users submit reports"
on public.reports
for insert
to authenticated
with check (
  reporter_id = (select auth.uid())
);

create policy "Users view their own reports"
on public.reports
for select
to authenticated
using (
  reporter_id = (select auth.uid())
);

-- =========================================================
-- END OF INITIAL COL DATABASE SCHEMA
-- =========================================================
