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
CREATE OR REPLACE FUNCTION update_video_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_tasks_updated_at
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
