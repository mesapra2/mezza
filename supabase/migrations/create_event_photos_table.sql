-- Create event_photos table for storing event photo metadata
-- Migration: create_event_photos_table.sql

BEGIN;

-- Create event_photos table if it doesn't exist
CREATE TABLE IF NOT EXISTS event_photos (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL,
    user_id UUID NOT NULL,
    photo_url TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'aprovado' CHECK (status IN ('aprovado', 'pendente', 'rejeitado')),
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_user_id ON event_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_status ON event_photos(status);
CREATE INDEX IF NOT EXISTS idx_event_photos_created_at ON event_photos(created_at DESC);

-- Create unique constraint to ensure one photo per user per event
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_photos_user_event 
ON event_photos(event_id, user_id);

-- Add foreign key constraints if tables exist
DO $$
BEGIN
    -- Try to add foreign key to events table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
        ALTER TABLE event_photos 
        ADD CONSTRAINT fk_event_photos_event_id 
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
    END IF;
    
    -- Try to add foreign key to profiles table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        ALTER TABLE event_photos 
        ADD CONSTRAINT fk_event_photos_user_id 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        -- Foreign keys already exist, ignore
        NULL;
END $$;

-- Add comments
COMMENT ON TABLE event_photos IS 'Photos uploaded by participants for events';
COMMENT ON COLUMN event_photos.status IS 'Photo approval status: aprovado, pendente, or rejeitado';
COMMENT ON COLUMN event_photos.file_size IS 'Size of the uploaded file in bytes';

-- Enable RLS
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all approved photos
CREATE POLICY IF NOT EXISTS "Anyone can view approved event photos"
ON event_photos
FOR SELECT
TO public
USING (status = 'aprovado');

-- Policy: Users can insert their own photos
CREATE POLICY IF NOT EXISTS "Users can upload their own event photos"
ON event_photos
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own photos
CREATE POLICY IF NOT EXISTS "Users can update their own event photos"
ON event_photos
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own photos
CREATE POLICY IF NOT EXISTS "Users can delete their own event photos"
ON event_photos
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

COMMIT;