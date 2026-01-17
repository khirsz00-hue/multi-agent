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

-- Storage Bucket Policies for 'meme-images' bucket
-- Create the bucket first in Supabase Dashboard → Storage
-- Or run: INSERT INTO storage.buckets (id, name, public) VALUES ('meme-images', 'meme-images', true);

-- Allow authenticated users to upload meme images to their own folder
CREATE POLICY "Authenticated users can upload meme images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'meme-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to meme images (since they'll be displayed on posts)
CREATE POLICY "Public can view meme images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'meme-images');

-- Allow users to delete their own meme images
CREATE POLICY "Users can delete their own meme images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'meme-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
