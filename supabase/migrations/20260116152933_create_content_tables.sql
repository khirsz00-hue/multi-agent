-- Content drafts table for AI-generated content
CREATE TABLE IF NOT EXISTS public.content_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  pain_point_id UUID REFERENCES audience_insights(id) ON DELETE SET NULL,
  
  -- Content details
  content_type TEXT NOT NULL, -- 'reel', 'meme', 'deep_post', 'engagement_post', 'newsletter', 'thread'
  title TEXT,
  hook TEXT,
  body TEXT,
  cta TEXT,
  hashtags TEXT[],
  
  -- Metadata
  tone TEXT, -- 'humorous', 'empathetic', 'controversial', 'educational'
  goal TEXT, -- 'viral', 'engagement', 'education'
  target_platform TEXT, -- 'instagram', 'tiktok', 'twitter', 'facebook', 'newsletter'
  
  -- Visual suggestions (for reels/memes)
  visual_suggestions JSONB,
  
  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'ready', 'scheduled', 'posted'
  scheduled_date TIMESTAMP WITH TIME ZONE,
  
  -- Analytics placeholder
  performance JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_content_drafts_agent ON content_drafts(agent_id);
CREATE INDEX idx_content_drafts_status ON content_drafts(status);
CREATE INDEX idx_content_drafts_scheduled ON content_drafts(scheduled_date);
CREATE INDEX idx_content_drafts_type ON content_drafts(content_type);

-- Brand settings table
CREATE TABLE IF NOT EXISTS public.brand_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  
  -- Brand voice
  brand_voice TEXT,
  target_audience TEXT,
  content_guidelines TEXT,
  
  -- Default settings
  default_tone TEXT DEFAULT 'empathetic',
  default_hashtags TEXT[],
  
  -- Platform preferences
  platform_preferences JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(space_id)
);

-- RLS policies for content_drafts
ALTER TABLE content_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage content drafts for their agents"
ON content_drafts FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM agents
    JOIN spaces ON spaces.id = agents.space_id
    WHERE agents.id = content_drafts.agent_id
    AND spaces.user_id = auth.uid()
  )
);

-- RLS policies for brand_settings
ALTER TABLE brand_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage brand settings for their spaces"
ON brand_settings FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM spaces
    WHERE spaces.id = brand_settings.space_id
    AND spaces.user_id = auth.uid()
  )
);
