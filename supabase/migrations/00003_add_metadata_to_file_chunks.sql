-- Add metadata column to file_chunks table
ALTER TABLE file_chunks ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
