-- Create posts table
create table if not exists public.posts (
    id uuid default gen_random_uuid() primary key,
    profile_id uuid references public.profiles(id) on delete cascade not null,
    content text not null,
    image_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.posts enable row level security;

-- Create policies
create policy "Users can view all posts"
    on public.posts for select
    using (true);

create policy "Users can insert their own posts"
    on public.posts for insert
    with check (auth.uid() = profile_id);

create policy "Users can update their own posts"
    on public.posts for update
    using (auth.uid() = profile_id);

create policy "Users can delete their own posts"
    on public.posts for delete
    using (auth.uid() = profile_id);

-- Create function to handle updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql security definer;

-- Create trigger for updated_at
create trigger handle_posts_updated_at
    before update on public.posts
    for each row
    execute procedure public.handle_updated_at();
