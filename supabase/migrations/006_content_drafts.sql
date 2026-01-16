-- Content drafts for AI-generated content
CREATE TABLE IF NOT EXISTS content_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  pain_point_id UUID REFERENCES audience_insights(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'reel', 'meme', 'deep_post', 'engagement_post', 'newsletter', 'thread'
  tone TEXT NOT NULL, -- 'humorous', 'empathetic', 'controversial', 'educational'
  goal TEXT NOT NULL, -- 'viral', 'engagement', 'education'
  draft JSONB NOT NULL, -- { hook, body, cta, hashtags, visual_suggestions }
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drafts_agent ON content_drafts(agent_id);
CREATE INDEX IF NOT EXISTS idx_drafts_pain_point ON content_drafts(pain_point_id);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON content_drafts(status);
CREATE INDEX IF NOT EXISTS idx_drafts_created ON content_drafts(created_at DESC);

-- RLS
ALTER TABLE content_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage drafts for their agents"
ON content_drafts FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM agents
    JOIN spaces ON spaces.id = agents.space_id
    WHERE agents.id = content_drafts.agent_id
    AND spaces.user_id = auth.uid()
  )
);
