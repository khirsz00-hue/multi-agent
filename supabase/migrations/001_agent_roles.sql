-- Agent roles definition
CREATE TABLE IF NOT EXISTS agent_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  capabilities JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO agent_roles (name, description, capabilities) VALUES
  ('strategic_planner', 'Defines business KPIs and tracks progress', '{"can_set_kpis": true, "can_track_metrics": true}'::jsonb),
  ('audience_insights', 'Analyzes audience pain points from content', '{"can_analyze_text": true, "can_extract_insights": true}'::jsonb),
  ('marketing_strategist', 'Creates content strategy based on KPIs and insights', '{"can_plan_content": true, "can_create_calendar": true}'::jsonb),
  ('content_executor', 'Generates and delivers daily content', '{"can_generate_content": true, "can_send_notifications": true}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Add columns to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS role TEXT 
  CHECK (role IN ('strategic_planner', 'audience_insights', 'marketing_strategist', 'content_executor'));
ALTER TABLE agents ADD COLUMN IF NOT EXISTS reads_from UUID[];
ALTER TABLE agents ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_agents_role ON agents(role);
