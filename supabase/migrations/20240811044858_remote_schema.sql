SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";

ALTER SCHEMA "public" OWNER TO "postgres";

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE TYPE "public"."descriptor_type" AS ENUM (
    'genre',
    'vibe'
);

ALTER TYPE "public"."descriptor_type" OWNER TO "postgres";

CREATE TYPE "public"."entry_layout" AS ENUM (
    'default'
);

ALTER TYPE "public"."entry_layout" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."album" (
                                                "id" bigint NOT NULL,
                                                "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text",
    "artist_id" bigint,
    "variant" "text",
    "purchase_date" "date",
    "acquired_date" "date",
    "preordered" boolean,
    "artwork_url" "text",
    "release_year" bigint
    );

ALTER TABLE "public"."album" OWNER TO "postgres";

ALTER TABLE "public"."album" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."album_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."artist" (
                                                 "id" bigint NOT NULL,
                                                 "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "album_ids" bigint[]
    );

ALTER TABLE "public"."artist" OWNER TO "postgres";

ALTER TABLE "public"."artist" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."artist_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."collection" (
                                                     "id" bigint NOT NULL,
                                                     "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text",
    "shortDescription" "text",
    "longDescription" "text",
    "coverImageUrl" "text",
    "curator" "uuid" NOT NULL,
    "entries" bigint[]
    );

ALTER TABLE "public"."collection" OWNER TO "postgres";

ALTER TABLE "public"."collection" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."collection_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."entry" (
                                                "id" bigint NOT NULL,
                                                "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "albumId" bigint NOT NULL,
    "layout" "public"."entry_layout" DEFAULT 'default'::"public"."entry_layout" NOT NULL
    );

ALTER TABLE "public"."entry" OWNER TO "postgres";

ALTER TABLE "public"."entry" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."entry_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."vibe" (
                                               "id" bigint NOT NULL,
                                               "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "label" "text",
    "type" "public"."descriptor_type" NOT NULL
    );

ALTER TABLE "public"."vibe" OWNER TO "postgres";

ALTER TABLE "public"."vibe" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."genre_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."legacy-notion" (
                                                        "Title" "text",
                                                        "Artist" "text",
                                                        "Variant" "text",
                                                        "Vibes" "text",
                                                        "Purchased" "text",
                                                        "Acquired" "text",
                                                        "Retailer" "text",
                                                        "Preorder" "text",
                                                        "Genre" "text",
                                                        "LegacyID" bigint NOT NULL,
                                                        "Artwork" "text"
);

ALTER TABLE "public"."legacy-notion" OWNER TO "postgres";

COMMENT ON TABLE "public"."legacy-notion" IS 'Notion data migration';

ALTER TABLE ONLY "public"."album"
    ADD CONSTRAINT "album_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."artist"
    ADD CONSTRAINT "artist_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."collection"
    ADD CONSTRAINT "collection_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."entry"
    ADD CONSTRAINT "entry_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."vibe"
    ADD CONSTRAINT "genre_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."legacy-notion"
    ADD CONSTRAINT "legacy-notion_pkey" PRIMARY KEY ("LegacyID");

ALTER TABLE ONLY "public"."album"
    ADD CONSTRAINT "album_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artist"("id");

ALTER TABLE ONLY "public"."collection"
    ADD CONSTRAINT "collection_curator_fkey" FOREIGN KEY ("curator") REFERENCES "auth"."users"("id");

ALTER TABLE ONLY "public"."entry"
    ADD CONSTRAINT "entry_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "public"."album"("id");

CREATE POLICY "Enable read access for all users" ON "public"."album" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."artist" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."legacy-notion" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."vibe" FOR SELECT USING (true);

ALTER TABLE "public"."album" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."artist" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."collection" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."entry" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."legacy-notion" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."vibe" ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON TABLE "public"."album" TO "anon";
GRANT ALL ON TABLE "public"."album" TO "authenticated";
GRANT ALL ON TABLE "public"."album" TO "service_role";

GRANT ALL ON SEQUENCE "public"."album_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."album_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."album_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."artist" TO "anon";
GRANT ALL ON TABLE "public"."artist" TO "authenticated";
GRANT ALL ON TABLE "public"."artist" TO "service_role";

GRANT ALL ON SEQUENCE "public"."artist_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."artist_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."artist_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."collection" TO "anon";
GRANT ALL ON TABLE "public"."collection" TO "authenticated";
GRANT ALL ON TABLE "public"."collection" TO "service_role";

GRANT ALL ON SEQUENCE "public"."collection_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."collection_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."collection_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."entry" TO "anon";
GRANT ALL ON TABLE "public"."entry" TO "authenticated";
GRANT ALL ON TABLE "public"."entry" TO "service_role";

GRANT ALL ON SEQUENCE "public"."entry_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."entry_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."entry_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."vibe" TO "anon";
GRANT ALL ON TABLE "public"."vibe" TO "authenticated";
GRANT ALL ON TABLE "public"."vibe" TO "service_role";

GRANT ALL ON SEQUENCE "public"."genre_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."genre_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."genre_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."legacy-notion" TO "anon";
GRANT ALL ON TABLE "public"."legacy-notion" TO "authenticated";
GRANT ALL ON TABLE "public"."legacy-notion" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";

RESET ALL;
