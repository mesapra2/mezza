-- Add google_profile_url column to partners table
-- Migration: add_google_profile_url_to_partners.sql

BEGIN;

-- Add google_profile_url column if it doesn't exist
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS google_profile_url TEXT;

-- Add comment
COMMENT ON COLUMN partners.google_profile_url IS 'URL do perfil público do restaurante no Google Business/Maps';

-- Create index for better performance on searches
CREATE INDEX IF NOT EXISTS idx_partners_google_profile_url 
ON partners(google_profile_url) 
WHERE google_profile_url IS NOT NULL;

COMMIT;