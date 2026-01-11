-- KPIs table
CREATE TABLE IF NOT EXISTS kpis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  unit TEXT,
  deadline DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'failed', 'paused')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Milestones table
CREATE TABLE IF NOT EXISTS milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_id UUID REFERENCES kpis(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  deadline DATE NOT NULL,
  achieved BOOLEAN DEFAULT FALSE,
  achieved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kpis_agent_id ON kpis(agent_id);
CREATE INDEX IF NOT EXISTS idx_kpis_status ON kpis(status);
CREATE INDEX IF NOT EXISTS idx_milestones_kpi_id ON milestones(kpi_id);

-- RLS
ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage KPIs for their agents"
ON kpis FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM agents
    JOIN spaces ON spaces.id = agents.space_id
    WHERE agents.id = kpis.agent_id
    AND spaces.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage milestones"
ON milestones FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM kpis
    JOIN agents ON agents.id = kpis.agent_id
    JOIN spaces ON spaces.id = agents.space_id
    WHERE kpis.id = milestones.kpi_id
    AND spaces.user_id = auth.uid()
  )
);
