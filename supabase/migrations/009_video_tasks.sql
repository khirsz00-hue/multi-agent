-- Create video_tasks table for tracking async video generation jobs
-- Supports multiple video generation engines (Pika, Remotion, D-ID, HeyGen, etc.)

CREATE TABLE IF NOT EXISTS video_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_id UUID REFERENCES content_drafts(id) ON DELETE SET NULL,
  
  -- Task tracking
  task_id TEXT NOT NULL, -- External task ID from video service (e.g., Pika task ID)
  engine TEXT NOT NULL CHECK (engine IN ('pika', 'remotion', 'creatomate', 'd-id', 'heygen')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'timeout')),
  
  -- Video configuration
  prompt TEXT NOT NULL,
  duration_seconds INTEGER CHECK (duration_seconds >= 15 AND duration_seconds <= 60),
  style TEXT,
  quality TEXT,
  config JSONB, -- Additional engine-specific configuration
  
  -- Progress tracking
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  eta_seconds INTEGER,
  
  -- Results
  video_url TEXT,
  thumbnail_url TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Ensure unique task_id per engine
  UNIQUE(engine, task_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_video_tasks_user_id ON video_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_video_tasks_draft_id ON video_tasks(draft_id);
CREATE INDEX IF NOT EXISTS idx_video_tasks_status ON video_tasks(status);
CREATE INDEX IF NOT EXISTS idx_video_tasks_engine ON video_tasks(engine);
CREATE INDEX IF NOT EXISTS idx_video_tasks_created_at ON video_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_tasks_task_id ON video_tasks(task_id);

-- Create updated_at trigger
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

CREATE TRIGGER video_tasks_updated_at
-- Trigger to automatically update updated_at
CREATE TRIGGER update_video_tasks_updated_at_trigger
  BEFORE UPDATE ON video_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_video_tasks_updated_at();

-- Enable RLS
ALTER TABLE video_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own tasks
CREATE POLICY "Users can view their own video tasks"
  ON video_tasks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own video tasks"
  ON video_tasks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video tasks"
  ON video_tasks
  FOR UPDATE
  USING (auth.uid() = user_id);
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
