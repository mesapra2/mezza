-- Add last_seen column to profiles table for presence system
-- Migration: add_last_seen_to_profiles.sql

BEGIN;

-- Add last_seen column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for better performance on presence queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen 
ON profiles(last_seen DESC);

-- Create index for public profiles with last_seen
CREATE INDEX IF NOT EXISTS idx_profiles_public_last_seen 
ON profiles(public_profile, last_seen DESC) 
WHERE public_profile = true;

-- Add comment
COMMENT ON COLUMN profiles.last_seen IS 'Timestamp of user last activity for presence system';

-- Create function to auto-update last_seen on profile updates
CREATE OR REPLACE FUNCTION update_profiles_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update last_seen if it's not being explicitly set
  IF OLD.last_seen IS NOT DISTINCT FROM NEW.last_seen THEN
    NEW.last_seen = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update last_seen on any profile update
DROP TRIGGER IF EXISTS trigger_update_profiles_last_seen ON profiles;
CREATE TRIGGER trigger_update_profiles_last_seen
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_last_seen();

COMMIT;