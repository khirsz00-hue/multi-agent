-- Migration: Add Meme Creator Columns to content_drafts
-- Adds columns for template, image URL, engine, prompt, and AI feedback history

-- ============================================
-- 1. ADD MEME CREATOR COLUMNS TO CONTENT_DRAFTS
-- ============================================
ALTER TABLE content_drafts 
  ADD COLUMN IF NOT EXISTS meme_template VARCHAR(100),
  ADD COLUMN IF NOT EXISTS meme_image_url TEXT,
  ADD COLUMN IF NOT EXISTS meme_engine VARCHAR(50),
  ADD COLUMN IF NOT EXISTS meme_prompt TEXT,
  ADD COLUMN IF NOT EXISTS ai_feedback_history JSONB DEFAULT '[]'::jsonb;

-- ============================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_content_drafts_meme_template 
  ON content_drafts(meme_template);

CREATE INDEX IF NOT EXISTS idx_content_drafts_content_type 
  ON content_drafts(content_type);
