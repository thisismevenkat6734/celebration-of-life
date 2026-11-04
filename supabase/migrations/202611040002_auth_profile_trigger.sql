-- =====================================================
-- COL | AUTH PROFILE AUTOMATION
-- Automatically create a profile after user signup
-- =====================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_username text;
  final_username text;
  new_display_name text;
begin
  -- Get display name from signup metadata or email
  new_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'COL Member'
  );

  -- Generate a clean username
  base_username := lower(
    regexp_replace(
      coalesce(
        new.raw_user_meta_data ->> 'username',
        split_part(coalesce(new.email, ''), '@', 1),
        'member'
      ),
      '[^a-zA-Z0-9_]',
      '',
      'g'
    )
  );

  base_username := trim(both '_' from base_username);

  if char_length(base_username) < 3 then
    base_username := 'member';
  end if;

  base_username := left(base_username, 22);
  final_username := base_username;

  -- Ensure username is unique
  while exists (
    select 1
    from public.profiles
    where username = final_username
  )
  loop
    final_username :=
      left(base_username, 22)
      || '_'
      || substr(
        replace(gen_random_uuid()::text, '-', ''),
        1,
        6
      );
  end loop;

  -- Create profile
  insert into public.profiles (
    id,
    username,
    display_name
  )
  values (
    new.id,
    final_username,
    left(new_display_name, 60)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Remove an older trigger if it exists
drop trigger if exists on_auth_user_created
on auth.users;

-- Automatically create profile after signup
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- =====================================================
-- END OF AUTH PROFILE AUTOMATION
-- =====================================================
