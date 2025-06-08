alter table "public"."entry" alter column "layout" drop default;

alter type "public"."entry_layout" rename to "entry_layout__old_version_to_be_dropped";

create type "public"."entry_layout" as enum ('album-card', 'album-blurb');

alter table "public"."entry" alter column layout type "public"."entry_layout" using layout::text::"public"."entry_layout";

alter table "public"."entry" alter column "layout" set default 'album-card'::entry_layout;

drop type "public"."entry_layout__old_version_to_be_dropped";

alter table "public"."collection" add column "bannerImageUrl" text;

alter table "public"."collection" add column "isPublic" boolean not null default false;

alter table "public"."entry" add column "position" bigint;

alter table "public"."entry" alter column "layout" set default 'album-card'::entry_layout;

-- Allow authenticated users to upload to the artwork bucket
create policy "Authenticated users can upload artwork"
on storage.objects
for insert
with check (
  bucket_id = 'artwork' AND auth.role() = 'authenticated'
);

-- Allow authenticated users to insert into the album table
create policy "Authenticated users can insert albums"
on public.album
for insert
with check (
  auth.role() = 'authenticated'
);


