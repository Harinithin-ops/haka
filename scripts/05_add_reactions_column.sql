-- Migration: Add reactions column to messages table
-- This stores emoji reactions as a JSON object: { userId: emoji }
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;

-- Index for faster reaction queries
CREATE INDEX IF NOT EXISTS idx_messages_reactions ON messages USING gin(reactions);
