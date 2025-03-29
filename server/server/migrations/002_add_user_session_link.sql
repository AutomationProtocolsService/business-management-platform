-- Migration: Add user_id to sessions table
-- Created at: 2025-03-29T15:18:29.509Z

-- Check if the column exists before adding it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE "sessions" ADD COLUMN "user_id" integer;
        CREATE INDEX "sessions_user_id_idx" ON "sessions" ("user_id");
    END IF;
END $$;