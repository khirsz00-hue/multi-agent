-- Storage Bucket Policies for 'agent-files' bucket
-- These policies must be set up in the Supabase Dashboard → Storage → agent-files bucket → Policies
-- Or run these queries in the SQL Editor after creating the bucket

-- Allow authenticated users to upload files to their own folder (userId as first folder)
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'agent-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own files
CREATE POLICY "Users can view their own files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'agent-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'agent-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
