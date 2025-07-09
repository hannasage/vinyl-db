-- Migration: Add conversation tables for Vinyl Collection Agent v1.1
-- This migration adds the database schema for long-term memory, chat history, and feedback system

-- Enable the vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";

-- Create conversation_sessions table
CREATE TABLE IF NOT EXISTS "public"."conversation_sessions" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "title" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "message_count" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);

-- Create conversation_messages table
CREATE TABLE IF NOT EXISTS "public"."conversation_messages" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "session_id" uuid NOT NULL,
    "content" text NOT NULL,
    "sender" text NOT NULL CHECK (sender IN ('user', 'agent')),
    "message_type" text DEFAULT 'text' NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "sequence_number" integer NOT NULL
);

-- Create conversation_embeddings table
CREATE TABLE IF NOT EXISTS "public"."conversation_embeddings" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "session_id" uuid NOT NULL,
    "embedding" vector(1536),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create conversation_feedback table
CREATE TABLE IF NOT EXISTS "public"."conversation_feedback" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "session_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "feedback_type" text NOT NULL CHECK (feedback_type IN ('thumbs_up', 'thumbs_down')),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create exemplar_conversations table
CREATE TABLE IF NOT EXISTS "public"."exemplar_conversations" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "session_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "exemplar_type" text NOT NULL CHECK (exemplar_type IN ('positive', 'negative')),
    "title" text NOT NULL,
    "description" text,
    "tags" text[] DEFAULT '{}',
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "usage_count" integer DEFAULT 0 NOT NULL,
    "last_used" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL
);

-- Add primary keys
ALTER TABLE ONLY "public"."conversation_sessions"
    ADD CONSTRAINT "conversation_sessions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."conversation_messages"
    ADD CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."conversation_embeddings"
    ADD CONSTRAINT "conversation_embeddings_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."conversation_feedback"
    ADD CONSTRAINT "conversation_feedback_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."exemplar_conversations"
    ADD CONSTRAINT "exemplar_conversations_pkey" PRIMARY KEY ("id");

-- Add foreign key constraints
ALTER TABLE ONLY "public"."conversation_sessions"
    ADD CONSTRAINT "conversation_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."conversation_messages"
    ADD CONSTRAINT "conversation_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."conversation_sessions"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."conversation_embeddings"
    ADD CONSTRAINT "conversation_embeddings_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."conversation_sessions"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."conversation_feedback"
    ADD CONSTRAINT "conversation_feedback_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."conversation_sessions"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."conversation_feedback"
    ADD CONSTRAINT "conversation_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."exemplar_conversations"
    ADD CONSTRAINT "exemplar_conversations_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."conversation_sessions"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."exemplar_conversations"
    ADD CONSTRAINT "exemplar_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX "conversation_sessions_user_id_idx" ON "public"."conversation_sessions" ("user_id");
CREATE INDEX "conversation_sessions_created_at_idx" ON "public"."conversation_sessions" ("created_at");
CREATE INDEX "conversation_sessions_is_active_idx" ON "public"."conversation_sessions" ("is_active");

CREATE INDEX "conversation_messages_session_id_idx" ON "public"."conversation_messages" ("session_id");
CREATE INDEX "conversation_messages_timestamp_idx" ON "public"."conversation_messages" ("timestamp");
CREATE INDEX "conversation_messages_sequence_number_idx" ON "public"."conversation_messages" ("session_id", "sequence_number");

CREATE INDEX "conversation_embeddings_session_id_idx" ON "public"."conversation_embeddings" ("session_id");

CREATE INDEX "conversation_feedback_session_id_idx" ON "public"."conversation_feedback" ("session_id");
CREATE INDEX "conversation_feedback_user_id_idx" ON "public"."conversation_feedback" ("user_id");
CREATE INDEX "conversation_feedback_type_idx" ON "public"."conversation_feedback" ("feedback_type");

CREATE INDEX "exemplar_conversations_user_id_idx" ON "public"."exemplar_conversations" ("user_id");
CREATE INDEX "exemplar_conversations_type_idx" ON "public"."exemplar_conversations" ("exemplar_type");
CREATE INDEX "exemplar_conversations_is_active_idx" ON "public"."exemplar_conversations" ("is_active");
CREATE INDEX "exemplar_conversations_tags_idx" ON "public"."exemplar_conversations" USING GIN ("tags");

-- Create vector similarity index for conversation embeddings
CREATE INDEX "conversation_embeddings_embedding_idx" ON "public"."conversation_embeddings" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enable Row Level Security
ALTER TABLE "public"."conversation_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."conversation_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."conversation_embeddings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."conversation_feedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."exemplar_conversations" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversation_sessions
CREATE POLICY "Users can view their own conversation sessions" ON "public"."conversation_sessions"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversation sessions" ON "public"."conversation_sessions"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversation sessions" ON "public"."conversation_sessions"
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversation sessions" ON "public"."conversation_sessions"
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for conversation_messages
CREATE POLICY "Users can view messages from their own sessions" ON "public"."conversation_messages"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "public"."conversation_sessions" 
            WHERE id = session_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add messages to their own sessions" ON "public"."conversation_messages"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "public"."conversation_sessions" 
            WHERE id = session_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update messages in their own sessions" ON "public"."conversation_messages"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "public"."conversation_sessions" 
            WHERE id = session_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete messages from their own sessions" ON "public"."conversation_messages"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "public"."conversation_sessions" 
            WHERE id = session_id AND user_id = auth.uid()
        )
    );

-- RLS Policies for conversation_embeddings
CREATE POLICY "Users can access embeddings from their own sessions" ON "public"."conversation_embeddings"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "public"."conversation_sessions" 
            WHERE id = session_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create embeddings for their own sessions" ON "public"."conversation_embeddings"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "public"."conversation_sessions" 
            WHERE id = session_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update embeddings for their own sessions" ON "public"."conversation_embeddings"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "public"."conversation_sessions" 
            WHERE id = session_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete embeddings from their own sessions" ON "public"."conversation_embeddings"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "public"."conversation_sessions" 
            WHERE id = session_id AND user_id = auth.uid()
        )
    );

-- RLS Policies for conversation_feedback
CREATE POLICY "Users can view their own feedback" ON "public"."conversation_feedback"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own feedback" ON "public"."conversation_feedback"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback" ON "public"."conversation_feedback"
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedback" ON "public"."conversation_feedback"
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for exemplar_conversations
CREATE POLICY "Users can view their own exemplars" ON "public"."exemplar_conversations"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exemplars" ON "public"."exemplar_conversations"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exemplars" ON "public"."exemplar_conversations"
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exemplars" ON "public"."exemplar_conversations"
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to update message count
CREATE OR REPLACE FUNCTION update_session_message_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE conversation_sessions 
        SET message_count = message_count + 1, updated_at = now()
        WHERE id = NEW.session_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE conversation_sessions 
        SET message_count = message_count - 1, updated_at = now()
        WHERE id = OLD.session_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update message count
CREATE TRIGGER update_session_message_count_trigger
    AFTER INSERT OR DELETE ON conversation_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_session_message_count();

-- Create function to update session timestamp
CREATE OR REPLACE FUNCTION update_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversation_sessions 
    SET updated_at = now()
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update session timestamp
CREATE TRIGGER update_session_timestamp_trigger
    AFTER INSERT OR UPDATE ON conversation_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_session_timestamp(); 