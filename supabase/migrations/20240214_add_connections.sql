-- Create connections table
create table if not exists connections (
    id uuid default uuid_generate_v4() primary key,
    requester_id uuid references profiles(id) on delete cascade,
    target_id uuid references profiles(id) on delete cascade,
    status text check (status in ('pending', 'accepted', 'rejected')) default 'pending',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(requester_id, target_id)
);

-- Enable RLS
alter table connections enable row level security;

-- Create policies
create policy "Users can view their own connections"
on connections for select
using (auth.uid() = requester_id or auth.uid() = target_id);

create policy "Users can create connection requests"
on connections for insert
with check (auth.uid() = requester_id);

create policy "Users can update their received connection requests"
on connections for update
using (auth.uid() = target_id)
with check (status in ('accepted', 'rejected'));

-- Create indexes
create index if not exists connections_requester_id_idx on connections(requester_id);
create index if not exists connections_target_id_idx on connections(target_id);
create index if not exists connections_status_idx on connections(status);

-- Create function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create trigger to update updated_at
create trigger update_connections_updated_at
    before update on connections
    for each row
    execute function update_updated_at_column(); 