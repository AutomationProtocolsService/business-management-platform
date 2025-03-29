-- Migration: Create sessions table
-- Created at: 2025-03-29T00:00:00.000Z

CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" varchar NOT NULL PRIMARY KEY,
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  "user_id" integer
);

CREATE INDEX IF NOT EXISTS "sessions_expire_idx" ON "sessions" ("expire");
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" ("user_id");