-- Meme images table for AI-generated meme images
CREATE TABLE IF NOT EXISTS public.meme_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_draft_id UUID REFERENCES content_drafts(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  
  -- Meme content
  original_prompt TEXT NOT NULL, -- AI prompt used to generate the meme
  image_url TEXT NOT NULL, -- URL in Supabase Storage
  storage_path TEXT NOT NULL, -- Path in Supabase bucket
  meme_format TEXT, -- 'Drake', 'Distracted Boyfriend', 'Custom', etc.
  top_text TEXT,
  bottom_text TEXT,
  
  -- Version control for iterative refinement
  version INTEGER DEFAULT 1 NOT NULL,
  parent_version_id UUID REFERENCES meme_images(id) ON DELETE SET NULL,
  refinement_prompt TEXT, -- User's modification request for refined versions
  
  -- Raw data from generation
  raw_image_data JSONB, -- Generation parameters, model info, etc.
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_meme_images_draft ON meme_images(content_draft_id);
CREATE INDEX idx_meme_images_agent ON meme_images(agent_id);
CREATE INDEX idx_meme_images_parent ON meme_images(parent_version_id);
CREATE INDEX idx_meme_images_created ON meme_images(created_at DESC);

-- Add optional meme_image_id reference to content_drafts
ALTER TABLE content_drafts 
ADD COLUMN IF NOT EXISTS meme_image_id UUID REFERENCES meme_images(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_content_drafts_meme_image ON content_drafts(meme_image_id);

-- RLS policies for meme_images
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
