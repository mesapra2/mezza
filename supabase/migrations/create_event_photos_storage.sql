-- Create event-photos storage bucket and policies
-- Migration: create_event_photos_storage.sql

BEGIN;

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-photos', 'event-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos
CREATE POLICY IF NOT EXISTS "Users can upload event photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-photos' 
  AND auth.uid()::text = (storage.foldername(name))[2] -- Folder name should be user's ID
);

-- Allow users to view all event photos (public read)
CREATE POLICY IF NOT EXISTS "Anyone can view event photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'event-photos');

-- Allow users to update their own photos
CREATE POLICY IF NOT EXISTS "Users can update their own event photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-photos' 
  AND auth.uid()::text = (storage.foldername(name))[2]
)
WITH CHECK (
  bucket_id = 'event-photos' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow users to delete their own photos
CREATE POLICY IF NOT EXISTS "Users can delete their own event photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-photos' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

COMMIT;