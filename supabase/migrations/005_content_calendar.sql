-- Content calendar - flexible monthly generation
CREATE TABLE IF NOT EXISTS content_calendar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  publish_date DATE NOT NULL,
  content_type TEXT NOT NULL, -- 'linkedin_post', 'newsletter', 'twitter', 'instagram'
  title TEXT,
  content TEXT NOT NULL,
  pain_point_id UUID REFERENCES audience_insights(id),
  kpi_id UUID REFERENCES kpis(id),
  
  -- Monthly grouping (editable, not rigid 52-week)
  month_group TEXT, -- '2026-11' for November
  week_in_month INTEGER, -- 1, 2, 3, 4
  
  -- Status workflow
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published', 'skipped')),
  
  -- Narrative tracking
  narrative_position INTEGER,
  narrative_phase TEXT, -- 'awareness', 'education', 'trust', 'conversion'
  
  -- Editability tracking
  metadata JSONB DEFAULT '{}'::jsonb, -- { version: 1, regenerated: false, edited: true, original_content: "..." }
  
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_agent_date ON content_calendar(agent_id, publish_date);
CREATE INDEX IF NOT EXISTS idx_calendar_month_group ON content_calendar(month_group);
CREATE INDEX IF NOT EXISTS idx_calendar_status ON content_calendar(status);

-- RLS
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage content for their agents"
ON content_calendar FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM agents
    JOIN spaces ON spaces.id = agents.space_id
    WHERE agents.id = content_calendar.agent_id
    AND spaces.user_id = auth.uid()
  )
);
