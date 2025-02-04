-- Create album_drafts table
create table "public"."album_drafts" (
  "id" uuid default gen_random_uuid() primary key,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
  "updated_at" timestamp with time zone default timezone('utc'::text, now()) not null,
  "title" text,
  "artist_id" bigint references artist(id),
  "variant" text,
  "size" bigint not null default '12'::bigint,
  "purchase_date" date,
  "acquired_date" date,
  "preordered" boolean default false,
  "artwork_url" text,
  "release_year" bigint,
  "receipt_id" uuid references receipt(id),
  "info_approved" boolean default false,
  -- Additional columns for draft management
  "is_approved" boolean default false,
  "reviewed_at" timestamp with time zone,
  "original_extraction" jsonb,
  "review_changes" jsonb
);

-- Create trigger for updated_at
create trigger update_album_drafts_updated_at
  before update on "public"."album_drafts"
  for each row
  execute function update_updated_at_column();

-- Enable RLS
alter table "public"."album_drafts" enable row level security;

-- RLS Policies
create policy "Allow authenticated users to select album drafts"
  on "public"."album_drafts"
  for select
  to authenticated
  using (true);

create policy "Allow authenticated users to update album drafts"
  on "public"."album_drafts"
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Allow service role to insert album drafts"
  on "public"."album_drafts"
  for insert
  to service_role
  with check (true);

-- Grant permissions
grant usage on schema public to anon;
grant usage on schema public to authenticated;
grant usage on schema public to service_role;

grant all on table public.album_drafts to service_role;
grant select, update on table public.album_drafts to authenticated;
grant select on table public.album_drafts to anon; 