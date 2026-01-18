-- Migration: Add Meme Text Columns to content_drafts
-- Fixes schema mismatch where code expects dedicated meme text columns
-- but they were previously stored in JSONB draft column

-- ============================================
-- 1. ADD MEME TEXT COLUMNS TO CONTENT_DRAFTS
-- ============================================
ALTER TABLE content_drafts
  ADD COLUMN IF NOT EXISTS meme_top_text VARCHAR(500),
  ADD COLUMN IF NOT EXISTS meme_bottom_text VARCHAR(500),
  ADD COLUMN IF NOT EXISTS generation_engine VARCHAR(50); -- For backwards compatibility

-- ============================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_content_drafts_meme_texts 
  ON content_drafts(meme_top_text, meme_bottom_text);

CREATE INDEX IF NOT EXISTS idx_content_drafts_generation_engine 
  ON content_drafts(generation_engine);

-- Note: image_engine and video_engine indexes already exist from 009_video_tasks_and_image_generations.sql
-- Note: video_tasks and image_generations tables already exist from 009_video_tasks_and_image_generations.sql
