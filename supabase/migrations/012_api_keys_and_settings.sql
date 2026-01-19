-- ============================================
-- Space Settings & API Keys
-- ============================================

-- Create api_keys table with encryption support
-- NOTE: API keys MUST be encrypted at the application layer before storage
-- Consider using crypto libraries or services like AWS KMS/Supabase Vault
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  service TEXT NOT NULL, -- 'openai', 'dall-e', 'd-id', 'heygen', etc
  api_key TEXT NOT NULL, -- MUST be encrypted before storage!
  metadata JSONB DEFAULT '{}', -- Additional config per service
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMP WITH TIME ZONE,
  test_status TEXT, -- 'success', 'failed', 'pending'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(space_id, service)
);

-- Create space_settings table
CREATE TABLE IF NOT EXISTS space_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE UNIQUE,
  
  -- Cost tracking
  monthly_budget DECIMAL(10,2) DEFAULT 100.00,
  current_month_spend DECIMAL(10,2) DEFAULT 0.00,
  budget_alerts_enabled BOOLEAN DEFAULT true,
  
  -- Default engines
  default_text_engine TEXT DEFAULT 'openai',
  default_image_engine TEXT DEFAULT 'dall-e-3',
  default_video_text_engine TEXT DEFAULT 'creatomat',
  default_video_avatar_engine TEXT DEFAULT 'd-id',
  
  -- Notion integration
  notion_database_id TEXT,
  notion_last_sync TIMESTAMP WITH TIME ZONE,
  
  -- Preferences
  auto_save_drafts BOOLEAN DEFAULT true,
  enable_ai_suggestions BOOLEAN DEFAULT true,
  content_language TEXT DEFAULT 'pl',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_settings ENABLE ROW LEVEL SECURITY;

-- Users can only access API keys for their spaces
CREATE POLICY "Users can view their space API keys"
  ON api_keys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spaces 
      WHERE spaces.id = api_keys.space_id 
      AND spaces.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their space API keys"
  ON api_keys FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM spaces 
      WHERE spaces.id = api_keys.space_id 
      AND spaces.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their space API keys"
  ON api_keys FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM spaces 
      WHERE spaces.id = api_keys.space_id 
      AND spaces.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their space API keys"
  ON api_keys FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM spaces 
      WHERE spaces.id = api_keys.space_id 
      AND spaces.user_id = auth.uid()
    )
  );

-- Similar policies for space_settings
CREATE POLICY "Users can view their space settings"
  ON space_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spaces 
      WHERE spaces.id = space_settings.space_id 
      AND spaces.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their space settings"
  ON space_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM spaces 
      WHERE spaces.id = space_settings.space_id 
      AND spaces.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their space settings"
  ON space_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM spaces 
      WHERE spaces.id = space_settings.space_id 
      AND spaces.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_api_keys_space_id ON api_keys(space_id);
CREATE INDEX idx_api_keys_service ON api_keys(service);
CREATE INDEX idx_space_settings_space_id ON space_settings(space_id);

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ API Keys & Settings tables created successfully!';
END $$;
