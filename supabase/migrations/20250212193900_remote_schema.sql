-- First drop existing policies
drop policy if exists "Users can view their own profile" on profiles;
drop policy if exists "Users can update their own profile" on profiles;
drop policy if exists "Users can insert their own profile" on profiles;

-- Enable RLS
alter table profiles enable row level security;

-- Create policies for profiles table
-- Allow anyone to view any profile (needed for search functionality)
create policy "Profiles are viewable by everyone"
on profiles for select
using (true);

-- Allow users to update only their own profile
create policy "Users can update their own profile"
on profiles for update
using (auth.uid() = id);

-- Allow users to insert only their own profile
create policy "Users can insert their own profile"
on profiles for insert
with check (auth.uid() = id);