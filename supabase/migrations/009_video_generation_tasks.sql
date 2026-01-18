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
-- Video generation tasks table for tracking async video generation
CREATE TABLE IF NOT EXISTS video_generation_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_draft_id UUID REFERENCES content_drafts(id) ON DELETE CASCADE NOT NULL,
  external_task_id TEXT NOT NULL, -- Task ID from external API (Runway/Pika)
  engine TEXT NOT NULL CHECK (engine IN ('runway', 'pika')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  eta_seconds INTEGER,
  error_message TEXT,
  video_url TEXT,
  last_polled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_video_tasks_draft ON video_generation_tasks(content_draft_id);
CREATE INDEX IF NOT EXISTS idx_video_tasks_external ON video_generation_tasks(external_task_id, engine);
CREATE INDEX IF NOT EXISTS idx_video_tasks_status ON video_generation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_video_tasks_last_polled ON video_generation_tasks(last_polled_at);

-- RLS policies
ALTER TABLE video_generation_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks for their drafts"
ON video_generation_tasks FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM content_drafts
    JOIN agents ON agents.id = content_drafts.agent_id
    JOIN spaces ON spaces.id = agents.space_id
    WHERE content_drafts.id = video_generation_tasks.content_draft_id
    AND spaces.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert tasks for their drafts"
ON video_generation_tasks FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM content_drafts
    JOIN agents ON agents.id = content_drafts.agent_id
    JOIN spaces ON spaces.id = agents.space_id
    WHERE content_drafts.id = video_generation_tasks.content_draft_id
    AND spaces.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update tasks for their drafts"
ON video_generation_tasks FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM content_drafts
    JOIN agents ON agents.id = content_drafts.agent_id
    JOIN spaces ON spaces.id = agents.space_id
    WHERE content_drafts.id = video_generation_tasks.content_draft_id
    AND spaces.user_id = auth.uid()
  )
);
