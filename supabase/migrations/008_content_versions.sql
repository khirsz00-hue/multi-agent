-- Content Versions Table for tracking changes and history
CREATE TABLE IF NOT EXISTS content_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_draft_id UUID REFERENCES content_drafts(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  version_type TEXT NOT NULL CHECK (version_type IN ('generated', 'user_edited', 'ai_refined', 'restored')),
  
  -- Snapshot of content at this version
  content_snapshot JSONB NOT NULL,
  
  -- Track what changed
  edited_fields JSONB, -- Array of field names that were changed: ["title", "body"]
  change_description TEXT, -- Human-readable description: "Made it funnier", "Added example"
  diff_data JSONB, -- Detailed diff information for display
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure version numbers are unique per draft
  UNIQUE(content_draft_id, version_number)
);

-- Add columns to content_drafts for version tracking
-- Note: current_version_id creates an optional circular reference for denormalization
-- This is intentional to allow quick access to the current version without a query
ALTER TABLE content_drafts 
  ADD COLUMN IF NOT EXISTS current_version_id UUID REFERENCES content_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edit_status TEXT DEFAULT 'ready' CHECK (edit_status IN ('editing', 'ready', 'published'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_versions_draft ON content_versions(content_draft_id);
CREATE INDEX IF NOT EXISTS idx_versions_created ON content_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_versions_type ON content_versions(version_type);
CREATE INDEX IF NOT EXISTS idx_drafts_edit_status ON content_drafts(edit_status);

-- RLS policies for content_versions
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view versions of their content"
ON content_versions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM content_drafts
    JOIN agents ON agents.id = content_drafts.agent_id
    JOIN spaces ON spaces.id = agents.space_id
    WHERE content_drafts.id = content_versions.content_draft_id
    AND spaces.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create versions for their content"
ON content_versions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM content_drafts
    JOIN agents ON agents.id = content_drafts.agent_id
    JOIN spaces ON spaces.id = agents.space_id
    WHERE content_drafts.id = content_versions.content_draft_id
    AND spaces.user_id = auth.uid()
  )
);

-- Function to auto-increment version numbers
CREATE OR REPLACE FUNCTION get_next_version_number(draft_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM content_versions
  WHERE content_draft_id = draft_id;
  
  RETURN next_version;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create a version on content update
-- NOTE: When adding new content fields to content_drafts, update the field list below
CREATE OR REPLACE FUNCTION create_content_version()
RETURNS TRIGGER AS $$
DECLARE
  version_num INTEGER;
  snapshot JSONB;
  changed_fields TEXT[];
BEGIN
  -- Only create version if content fields changed
  IF (OLD.title IS DISTINCT FROM NEW.title) OR
     (OLD.hook IS DISTINCT FROM NEW.hook) OR
     (OLD.body IS DISTINCT FROM NEW.body) OR
     (OLD.cta IS DISTINCT FROM NEW.cta) OR
     (OLD.hashtags IS DISTINCT FROM NEW.hashtags) THEN
    
    -- Get next version number
    version_num := get_next_version_number(NEW.id);
    
    -- Build snapshot
    snapshot := jsonb_build_object(
      'title', NEW.title,
      'hook', NEW.hook,
      'body', NEW.body,
      'cta', NEW.cta,
      'hashtags', NEW.hashtags,
      'visual_suggestions', NEW.visual_suggestions,
      'tone', NEW.tone,
      'goal', NEW.goal,
      'target_platform', NEW.target_platform
    );
    
    -- Track which fields changed
    changed_fields := ARRAY[]::TEXT[];
    IF OLD.title IS DISTINCT FROM NEW.title THEN
      changed_fields := array_append(changed_fields, 'title');
    END IF;
    IF OLD.hook IS DISTINCT FROM NEW.hook THEN
      changed_fields := array_append(changed_fields, 'hook');
    END IF;
    IF OLD.body IS DISTINCT FROM NEW.body THEN
      changed_fields := array_append(changed_fields, 'body');
    END IF;
    IF OLD.cta IS DISTINCT FROM NEW.cta THEN
      changed_fields := array_append(changed_fields, 'cta');
    END IF;
    IF OLD.hashtags IS DISTINCT FROM NEW.hashtags THEN
      changed_fields := array_append(changed_fields, 'hashtags');
    END IF;
    
    -- Insert version
    INSERT INTO content_versions (
      content_draft_id,
      version_number,
      version_type,
      content_snapshot,
      edited_fields,
      created_by
    ) VALUES (
      NEW.id,
      version_num,
      'user_edited',
      snapshot,
      to_jsonb(changed_fields),
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create versions on content_drafts update
CREATE TRIGGER content_drafts_version_trigger
  AFTER UPDATE ON content_drafts
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION create_content_version();
