-- Create the venue-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('venue-images', 'venue-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "authenticated upload venue images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'venue-images');

-- Allow authenticated users to delete their uploads
CREATE POLICY "authenticated delete venue images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'venue-images');

-- Allow public read access (bucket is public, but policy is still needed)
CREATE POLICY "public read venue images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'venue-images');
