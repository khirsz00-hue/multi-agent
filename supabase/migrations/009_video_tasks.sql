-- Video tasks table for tracking Runway API video generation
-- This table stores the status and metadata of video generation tasks

CREATE TABLE IF NOT EXISTS video_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Link to content draft (optional, as video can be standalone)
  content_draft_id UUID REFERENCES content_drafts(id) ON DELETE SET NULL,
  
  -- Runway API task tracking
  task_id TEXT NOT NULL UNIQUE, -- Runway task ID
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Video generation details
  prompt TEXT NOT NULL, -- Script/scenario sent to Runway
  config JSONB NOT NULL, -- VideoGenerationConfig as JSON
  -- Expected structure:
  -- {
  --   "resolution": "1080p",
  --   "duration": 30,
  --   "codec": "h264",
  --   "bitrate": 5000,
  --   "style": "cinematic",
  --   "promptingStrategy": "creative"
  -- }
  
  -- Error tracking
  error_message TEXT,
  
  -- Video URLs
  video_url TEXT, -- Original Runway video URL (temporary)
  storage_path TEXT, -- Supabase storage path
  supabase_url TEXT, -- Public URL from Supabase
  
  -- Performance tracking
  estimated_time INTEGER, -- Estimated generation time in seconds
  actual_time INTEGER, -- Actual generation time in seconds
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_video_tasks_content_draft ON video_tasks(content_draft_id);
CREATE INDEX IF NOT EXISTS idx_video_tasks_task_id ON video_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_video_tasks_status ON video_tasks(status);
CREATE INDEX IF NOT EXISTS idx_video_tasks_created ON video_tasks(created_at DESC);

-- RLS Policies
ALTER TABLE video_tasks ENABLE ROW LEVEL SECURITY;

-- Users can view and manage video tasks for their content drafts
CREATE POLICY "Users can manage video tasks for their content"
ON video_tasks FOR ALL TO authenticated
USING (
  content_draft_id IS NULL OR -- Allow null content_draft_id
  EXISTS (
    SELECT 1 FROM content_drafts
    JOIN agents ON agents.id = content_drafts.agent_id
    JOIN spaces ON spaces.id = agents.space_id
    WHERE content_drafts.id = video_tasks.content_draft_id
    AND spaces.user_id = auth.uid()
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_video_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_video_tasks_updated_at_trigger
  BEFORE UPDATE ON video_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_video_tasks_updated_at();

-- Function to calculate actual_time when task completes
CREATE OR REPLACE FUNCTION calculate_video_task_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
    NEW.actual_time = EXTRACT(EPOCH FROM (NOW() - NEW.created_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate actual_time on completion
CREATE TRIGGER calculate_video_task_time_trigger
  BEFORE UPDATE ON video_tasks
  FOR EACH ROW
  EXECUTE FUNCTION calculate_video_task_time();
