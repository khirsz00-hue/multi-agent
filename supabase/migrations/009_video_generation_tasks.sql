-- Create video_generation_tasks table for tracking video generation progress
CREATE TABLE IF NOT EXISTS public.video_generation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_draft_id UUID REFERENCES content_drafts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', -- queued, processing, completed, failed
  progress INTEGER DEFAULT 0, -- 0-100
  engine TEXT, -- pika, runway, d-id, heygen, remotion, creatomate
  video_type TEXT, -- text_only, talking_head
  error_message TEXT,
  video_url TEXT,
  estimated_completion_time INTEGER, -- seconds remaining
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_video_tasks_user_id ON video_generation_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_video_tasks_status ON video_generation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_video_tasks_content_draft ON video_generation_tasks(content_draft_id);
CREATE INDEX IF NOT EXISTS idx_video_tasks_created ON video_generation_tasks(created_at);

-- Add RLS policies
ALTER TABLE video_generation_tasks ENABLE ROW LEVEL SECURITY;

-- Users can view their own tasks
CREATE POLICY "Users can view own video tasks" ON video_generation_tasks
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own tasks
CREATE POLICY "Users can create own video tasks" ON video_generation_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own tasks
CREATE POLICY "Users can update own video tasks" ON video_generation_tasks
  FOR UPDATE USING (auth.uid() = user_id);
