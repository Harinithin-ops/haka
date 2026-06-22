-- Supabase SQL Migration: Add Reactions Column
-- Paste and run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/vbgqcdosupkdlwopvgff/sql/new

ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;
