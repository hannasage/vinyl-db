alter table "public"."album" add column "size" bigint not null default '12'::bigint;

alter table "public"."artist" drop column "album_ids";

alter table "public"."collection" add column "slug" text;


