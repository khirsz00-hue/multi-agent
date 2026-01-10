-- Update RLS policies for files table to support new storage path structure
-- Storage path: {userId}/{agentId}/{timestamp}_{sanitized_filename}

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create files in their agents" ON files;

-- Create simplified INSERT policy that allows any authenticated user
-- The storage bucket policy will handle the userId validation
CREATE POLICY "Authenticated users can insert files"
ON files FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Keep existing SELECT policy (users can view files in their agents)
-- No changes needed

-- Keep existing DELETE policy (users can delete files in their agents)  
-- No changes needed
