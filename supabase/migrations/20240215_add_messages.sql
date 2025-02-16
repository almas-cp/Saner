-- Drop existing table if it exists
drop table if exists messages;

-- Create messages table
create table if not exists messages (
    id uuid default uuid_generate_v4() primary key,
    sender_id uuid references profiles(id) on delete cascade,
    receiver_id uuid references profiles(id) on delete cascade,
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    read_at timestamp with time zone default null
);

-- Create function to validate connection before message insertion
create or replace function validate_message_connection()
returns trigger as $$
begin
    if not exists (
        select 1 from connections
        where status = 'accepted'
        and (
            (requester_id = NEW.sender_id and target_id = NEW.receiver_id)
            or
            (requester_id = NEW.receiver_id and target_id = NEW.sender_id)
        )
    ) then
        raise exception 'Cannot send message: No accepted connection exists between users';
    end if;
    return NEW;
end;
$$ language plpgsql;

-- Create trigger to validate connection
create trigger validate_message_connection_trigger
    before insert on messages
    for each row
    execute function validate_message_connection();

-- Enable RLS
alter table messages enable row level security;

-- Create policies
create policy "Users can view their own messages"
on messages for select
using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send messages"
on messages for insert
with check (auth.uid() = sender_id);

create policy "Users can update their received messages (mark as read)"
on messages for update
using (auth.uid() = receiver_id)
with check (read_at is not null);

-- Create indexes
create index if not exists messages_sender_id_idx on messages(sender_id);
create index if not exists messages_receiver_id_idx on messages(receiver_id);
create index if not exists messages_created_at_idx on messages(created_at);
create index if not exists messages_read_at_idx on messages(read_at);

-- Create function to get chat list for a user
create or replace function get_chat_list(user_id uuid)
returns table (
    connection_id uuid,
    other_user_id uuid,
    other_user_name text,
    other_user_username text,
    other_user_profile_pic text,
    last_message text,
    last_message_time timestamptz,
    unread_count bigint,
    is_wall_e boolean
) language sql as $$
    with connections_list as (
        -- Include Wall-E as a special connection
        select 
            '00000000-0000-0000-0000-000000000000'::uuid as connection_id,
            '00000000-0000-0000-0000-000000000000'::uuid as other_user_id,
            'Wall-E' as other_user_name,
            'wall-e' as other_user_username,
            null as other_user_profile_pic,
            true as is_wall_e
        union all
        -- Regular connections
        select 
            c.id as connection_id,
            case 
                when c.requester_id = user_id then c.target_id 
                else c.requester_id 
            end as other_user_id,
            p.name as other_user_name,
            p.username as other_user_username,
            p.profile_pic_url as other_user_profile_pic,
            false as is_wall_e
        from connections c
        join profiles p on p.id = case 
            when c.requester_id = user_id then c.target_id 
            else c.requester_id 
        end
        where (c.requester_id = user_id or c.target_id = user_id)
        and c.status = 'accepted'
    ),
    messages_with_users as (
        select 
            cl.connection_id,
            cl.other_user_id,
            cl.other_user_name,
            cl.other_user_username,
            cl.other_user_profile_pic,
            cl.is_wall_e,
            coalesce(m.content, 
                case when cl.is_wall_e then 
                    'Hello! I''m Wall-E, your mental health support companion.'
                else null end
            ) as content,
            coalesce(m.created_at, 
                case when cl.is_wall_e then 
                    now() 
                else null end
            ) as created_at,
            m.read_at,
            row_number() over (partition by cl.connection_id order by m.created_at desc) as rn
        from connections_list cl
        left join messages m on 
            (not cl.is_wall_e) and (
                (m.sender_id = user_id and m.receiver_id = cl.other_user_id) or
                (m.sender_id = cl.other_user_id and m.receiver_id = user_id)
            )
    ),
    chat_summary as (
        select 
            connection_id,
            other_user_id,
            other_user_name,
            other_user_username,
            other_user_profile_pic,
            is_wall_e,
            content as last_message,
            created_at as last_message_time,
            case 
                when is_wall_e then
                    (select count(*)
                    from wall_e_chats w
                    where w.user_id = user_id
                    and w.role = 'assistant'
                    and w.read_at is null)
                else
                    (select count(*)
                    from messages m2
                    where m2.receiver_id = user_id
                    and m2.read_at is null
                    and m2.sender_id = mwu.other_user_id)
            end as unread_count
        from messages_with_users mwu
        where rn = 1 or rn is null
    )
    select 
        connection_id,
        other_user_id,
        other_user_name,
        other_user_username,
        other_user_profile_pic,
        last_message,
        last_message_time,
        unread_count,
        is_wall_e
    from chat_summary
    order by 
        is_wall_e desc, -- Wall-E always appears first
        last_message_time desc nulls last;
$$; 