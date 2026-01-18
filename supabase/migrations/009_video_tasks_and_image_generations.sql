-- Migration: Video Tasks & Image Generations
-- Adds support for multi-engine video/image generation with task tracking

-- ============================================
-- 1. VIDEO TASKS TABLE
-- ============================================
-- Track long-running video generation tasks
CREATE TABLE IF NOT EXISTS public.video_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_draft_id UUID NOT NULL REFERENCES content_drafts(id) ON DELETE CASCADE,
  task_id VARCHAR(255) NOT NULL, -- External task ID from video generation service
  engine VARCHAR(50) NOT NULL, -- Engine used: 'runway', 'pika', 'luma', etc.
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  video_url TEXT, -- Final video URL when completed
  progress INTEGER DEFAULT 0, -- Progress percentage (0-100)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for video_tasks
CREATE INDEX idx_video_tasks_task_id ON video_tasks(task_id);
CREATE INDEX idx_video_tasks_engine ON video_tasks(engine);
CREATE INDEX idx_video_tasks_status ON video_tasks(status);
CREATE INDEX idx_video_tasks_content_draft ON video_tasks(content_draft_id);
CREATE INDEX idx_video_tasks_engine_status ON video_tasks(engine, status);

-- RLS for video_tasks
ALTER TABLE video_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage video tasks for their agents"
ON video_tasks FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM content_drafts
    JOIN agents ON agents.id = content_drafts.agent_id
    JOIN spaces ON spaces.id = agents.space_id
    WHERE content_drafts.id = video_tasks.content_draft_id
    AND spaces.user_id = auth.uid()
  )
);

-- ============================================
-- 2. IMAGE GENERATIONS TABLE
-- ============================================
-- Track image generation history with version support
CREATE TABLE IF NOT EXISTS public.image_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_draft_id UUID NOT NULL REFERENCES content_drafts(id) ON DELETE CASCADE,
  engine VARCHAR(50) NOT NULL, -- Engine used: 'dalle3', 'midjourney', 'stable-diffusion', etc.
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  image_url TEXT, -- Public URL when completed
  storage_path TEXT, -- Path in Supabase storage
  error_message TEXT,
  version INTEGER DEFAULT 1 NOT NULL, -- Version tracking for iterative refinement
  parent_generation_id UUID REFERENCES image_generations(id) ON DELETE SET NULL,
  refinement_prompt TEXT, -- User's refinement request for new versions
  generation_params JSONB, -- Store generation parameters (prompt, size, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for image_generations
CREATE INDEX idx_image_generations_content_draft ON image_generations(content_draft_id);
CREATE INDEX idx_image_generations_engine ON image_generations(engine);
CREATE INDEX idx_image_generations_status ON image_generations(status);
CREATE INDEX idx_image_generations_parent ON image_generations(parent_generation_id);
CREATE INDEX idx_image_generations_version ON image_generations(content_draft_id, version DESC);

-- RLS for image_generations
ALTER TABLE image_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage image generations for their agents"
ON image_generations FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM content_drafts
    JOIN agents ON agents.id = content_drafts.agent_id
    JOIN spaces ON spaces.id = agents.space_id
    WHERE content_drafts.id = image_generations.content_draft_id
    AND spaces.user_id = auth.uid()
  )
);

-- ============================================
-- 3. UPDATE CONTENT_DRAFTS TABLE
-- ============================================
-- Add new columns for multi-engine support and cost tracking
ALTER TABLE content_drafts 
  ADD COLUMN IF NOT EXISTS image_engine VARCHAR(50),
  ADD COLUMN IF NOT EXISTS video_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS video_task_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS video_eta TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS generation_cost DECIMAL(10, 4) DEFAULT 0.00;

-- Note: video_engine and video_url already exist from 007_video_recommendation.sql

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_content_drafts_image_engine ON content_drafts(image_engine);
CREATE INDEX IF NOT EXISTS idx_content_drafts_video_engine ON content_drafts(video_engine);
CREATE INDEX IF NOT EXISTS idx_content_drafts_video_status ON content_drafts(video_status);
CREATE INDEX IF NOT EXISTS idx_content_drafts_video_task_id ON content_drafts(video_task_id);

-- Add foreign key constraint for video_task_id (optional, for data integrity)
-- Note: This creates a soft link since video_task_id is VARCHAR, not UUID
-- We'll rely on application logic to maintain consistency

-- ============================================
-- 4. STORAGE BUCKET POLICIES (Reference)
-- ============================================
-- These need to be created via Supabase UI or storage API:
-- 
-- Bucket: 'video-outputs' (public: false)
-- Bucket: 'image-generations' (public: false)
--
-- Storage policies for video-outputs:
-- CREATE POLICY "Authenticated users can upload videos"
-- ON storage.objects FOR INSERT TO authenticated
-- WITH CHECK (
--   bucket_id = 'video-outputs' AND
--   (storage.foldername(name))[1] IN (
--     SELECT agents.id::text FROM agents
--     JOIN spaces ON spaces.id = agents.space_id
--     WHERE spaces.user_id = auth.uid()
--   )
-- );
--
-- CREATE POLICY "Users can view their video outputs"
-- ON storage.objects FOR SELECT TO authenticated
-- USING (
--   bucket_id = 'video-outputs' AND
--   (storage.foldername(name))[1] IN (
--     SELECT agents.id::text FROM agents
--     JOIN spaces ON spaces.id = agents.space_id
--     WHERE spaces.user_id = auth.uid()
--   )
-- );
--
-- Similar policies for 'image-generations' bucket
