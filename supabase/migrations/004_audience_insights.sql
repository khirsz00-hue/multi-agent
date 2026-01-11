-- Audience insights from analyzed posts
CREATE TABLE IF NOT EXISTS audience_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL, -- 'notion', 'facebook', 'manual'
  source_id TEXT, -- external ID (Notion page ID)
  pain_point TEXT NOT NULL,
  category TEXT, -- 'focus', 'time_management', 'organization', 'motivation', 'overwhelm'
  frequency INTEGER DEFAULT 1,
  sentiment TEXT, -- 'frustrated', 'confused', 'seeking_help', 'desperate'
  raw_content TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insights_agent_id ON audience_insights(agent_id);
CREATE INDEX IF NOT EXISTS idx_insights_category ON audience_insights(category);
CREATE INDEX IF NOT EXISTS idx_insights_frequency ON audience_insights(frequency DESC);

-- RLS
ALTER TABLE audience_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage insights for their agents"
ON audience_insights FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM agents
    JOIN spaces ON spaces.id = agents.space_id
    WHERE agents.id = audience_insights.agent_id
    AND spaces.user_id = auth.uid()
  )
);
