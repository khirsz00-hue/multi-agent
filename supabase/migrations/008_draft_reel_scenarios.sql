-- Draft reel scenarios for two-stage content generation
-- Stage 1: Generate draft scenario for user to edit
-- Stage 2: Generate final reel from edited scenario

CREATE TABLE IF NOT EXISTS draft_reel_scenarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  pain_point_id UUID REFERENCES audience_insights(id) ON DELETE CASCADE,
  
  -- Draft scenario (editable before finalization)
  draft_scenario JSONB NOT NULL,
  -- Expected structure:
  -- {
  --   "hook": "Attention-grabbing first 3 seconds",
  --   "body": "Main content with clear structure",
  --   "cta": "Call to action that drives engagement",
  --   "key_moments": [
  --     { "timing": "0-3s", "description": "Hook moment", "text": "..." },
  --     { "timing": "3-15s", "description": "Main point", "text": "..." },
  --     { "timing": "15-30s", "description": "CTA", "text": "..." }
  --   ],
  --   "visual_suggestions": {
  --     "format": "talking head / b-roll / text overlay",
  --     "music_vibe": "upbeat / emotional / trending"
  --   },
  --   "hashtags": ["relevant", "hashtags"]
  -- }
  
  -- Original generated scenario (for comparison)
  original_scenario JSONB,
  
  -- Edit history tracking
  edit_history JSONB DEFAULT '[]'::jsonb,
  -- Array of edit records:
  -- [
  --   {
  --     "timestamp": "2024-01-17T10:00:00Z",
  --     "field": "hook",
  --     "old_value": "...",
  --     "new_value": "..."
  --   }
  -- ]
  
  -- Final reel reference (after finalization)
  final_draft_id UUID REFERENCES content_drafts(id) ON DELETE SET NULL,
  
  -- Status tracking
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'editing', 'ready_to_finalize', 'finalized', 'archived')),
  version INTEGER DEFAULT 1,
  
  -- Metadata
  tone TEXT, -- 'humorous', 'empathetic', 'controversial', 'educational'
  goal TEXT, -- 'viral', 'engagement', 'education'
  
  -- Validation results
  validation_results JSONB,
  -- {
  --   "hook_length_valid": true,
  --   "hook_char_count": 85,
  --   "key_moments_valid": true,
  --   "cta_clear": true,
  --   "suggestions": ["Consider adding emotion words", "Try a question format"]
  -- }
  
  -- Quality estimation
  estimated_quality_score INTEGER, -- 0-100 based on edits and validation
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_draft_reel_agent ON draft_reel_scenarios(agent_id);
CREATE INDEX IF NOT EXISTS idx_draft_reel_pain_point ON draft_reel_scenarios(pain_point_id);
CREATE INDEX IF NOT EXISTS idx_draft_reel_status ON draft_reel_scenarios(status);
CREATE INDEX IF NOT EXISTS idx_draft_reel_created ON draft_reel_scenarios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_draft_reel_final ON draft_reel_scenarios(final_draft_id);

-- RLS
ALTER TABLE draft_reel_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage draft reels for their agents"
ON draft_reel_scenarios FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM agents
    JOIN spaces ON spaces.id = agents.space_id
    WHERE agents.id = draft_reel_scenarios.agent_id
    AND spaces.user_id = auth.uid()
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_draft_reel_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_draft_reel_scenarios_updated_at
  BEFORE UPDATE ON draft_reel_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_draft_reel_updated_at();
