-- Add video generation columns to content_drafts
ALTER TABLE content_drafts 
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS video_type TEXT,
  ADD COLUMN IF NOT EXISTS video_engine TEXT,
  ADD COLUMN IF NOT EXISTS video_settings JSONB,
  ADD COLUMN IF NOT EXISTS ai_video_recommendation JSONB,
  ADD COLUMN IF NOT EXISTS video_generated_at TIMESTAMP WITH TIME ZONE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_content_drafts_video_type 
  ON content_drafts(video_type);

CREATE INDEX IF NOT EXISTS idx_content_drafts_video_generated 
  ON content_drafts(video_generated_at);
