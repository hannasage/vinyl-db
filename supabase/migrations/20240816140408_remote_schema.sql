alter table "public"."collection" drop column "entries";

alter table "public"."entry" add column "collectionId" bigint;

alter table "public"."entry" add column "layoutProps" jsonb;

alter table "public"."entry" add constraint "entry_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES collection(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."entry" validate constraint "entry_collectionId_fkey";


