-- Meme images table with version tracking
CREATE TABLE IF NOT EXISTS public.meme_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_draft_id UUID NOT NULL REFERENCES content_drafts(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  
  -- Original meme concept from OpenAI
  original_prompt TEXT NOT NULL,
  meme_format TEXT, -- e.g., 'Drake', 'Distracted Boyfriend', 'Custom'
  top_text TEXT,
  bottom_text TEXT,
  
  -- Image storage
  image_url TEXT NOT NULL, -- Public URL from Supabase Storage
  storage_path TEXT NOT NULL, -- Path in storage: meme-images/{agentId}/{contentDraftId}/{timestamp}.svg (or .png for production)
  
  -- Version tracking
  version INTEGER DEFAULT 1,
  parent_version_id UUID REFERENCES meme_images(id) ON DELETE SET NULL,
  refinement_prompt TEXT, -- User's refinement request (null for v1)
  
  -- Raw image data (optional, for regeneration purposes)
  raw_image_data JSONB, -- Store metadata about image generation params
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_meme_images_content_draft ON meme_images(content_draft_id);
CREATE INDEX idx_meme_images_agent ON meme_images(agent_id);
CREATE INDEX idx_meme_images_parent ON meme_images(parent_version_id);
CREATE INDEX idx_meme_images_version ON meme_images(content_draft_id, version DESC);

-- RLS policies
ALTER TABLE meme_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage meme images for their agents"
ON meme_images FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM agents
    JOIN spaces ON spaces.id = agents.space_id
    WHERE agents.id = meme_images.agent_id
    AND spaces.user_id = auth.uid()
  )
);

-- Storage bucket setup (SQL for reference, may need to be done via Supabase UI)
-- 1. Create bucket 'meme-images' in Supabase Storage (public: false)
-- 2. Apply RLS policies for storage:

-- Storage policy: Allow authenticated users to upload to their agent folders
-- CREATE POLICY "Authenticated users can upload meme images"
-- ON storage.objects FOR INSERT TO authenticated
-- WITH CHECK (
--   bucket_id = 'meme-images' AND
--   (storage.foldername(name))[1] IN (
--     SELECT agents.id::text FROM agents
--     JOIN spaces ON spaces.id = agents.space_id
--     WHERE spaces.user_id = auth.uid()
--   )
-- );

-- Storage policy: Users can view meme images for their agents
-- CREATE POLICY "Users can view their meme images"
-- ON storage.objects FOR SELECT TO authenticated
-- USING (
--   bucket_id = 'meme-images' AND
--   (storage.foldername(name))[1] IN (
--     SELECT agents.id::text FROM agents
--     JOIN spaces ON spaces.id = agents.space_id
--     WHERE spaces.user_id = auth.uid()
--   )
-- );

-- Storage policy: Users can delete their meme images
-- CREATE POLICY "Users can delete their meme images"
-- ON storage.objects FOR DELETE TO authenticated
-- USING (
--   bucket_id = 'meme-images' AND
--   (storage.foldername(name))[1] IN (
--     SELECT agents.id::text FROM agents
--     JOIN spaces ON spaces.id = agents.space_id
--     WHERE spaces.user_id = auth.uid()
--   )
-- );
