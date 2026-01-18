-- Migration: Add image_url column to content_drafts
-- For direct image URL storage from meme generation

ALTER TABLE content_drafts
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_content_drafts_image_url ON content_drafts(image_url);
