-- Agent outputs for inter-agent communication
CREATE TABLE IF NOT EXISTS agent_outputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  output_type TEXT NOT NULL,
  data JSONB NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_outputs_agent_id ON agent_outputs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_outputs_type ON agent_outputs(output_type);
CREATE INDEX IF NOT EXISTS idx_agent_outputs_valid ON agent_outputs(valid_from, valid_until);

-- RLS
ALTER TABLE agent_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view outputs from their agents"
ON agent_outputs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM agents
    JOIN spaces ON spaces.id = agents.space_id
    WHERE agents.id = agent_outputs.agent_id
    AND spaces.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert outputs from their agents"
ON agent_outputs FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM agents
    JOIN spaces ON spaces.id = agents.space_id
    WHERE agents.id = agent_outputs.agent_id
    AND spaces.user_id = auth.uid()
  )
);
