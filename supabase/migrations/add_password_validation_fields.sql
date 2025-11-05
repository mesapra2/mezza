-- Migration: Add fields for dual password validation
-- Date: 2025-11-04
-- Description: Adds partner_entry_password to partners table and host_validated to events table

-- ============================================
-- 1. Add partner_entry_password to partners
-- ============================================

-- Add column if doesn't exist
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS partner_entry_password VARCHAR(4) DEFAULT NULL;

COMMENT ON COLUMN partners.partner_entry_password IS 'Senha fixa de 4 dígitos que o restaurante usa para validar eventos. Anfitriões e inscritos devem digitar esta senha.';

-- ============================================
-- 2. Add host_validated to events
-- ============================================

-- Add column if doesn't exist
ALTER TABLE events
ADD COLUMN IF NOT EXISTS host_validated BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN events.host_validated IS 'Indica se o anfitrião validou sua presença com o restaurante (apenas para eventos padrao com partner_id)';

-- Add timestamp for when host validated
ALTER TABLE events
ADD COLUMN IF NOT EXISTS host_validated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN events.host_validated_at IS 'Timestamp de quando o anfitrião validou presença com o restaurante';

-- ============================================
-- 3. Create indexes for performance
-- ============================================

-- Index for quick lookup of partner passwords
CREATE INDEX IF NOT EXISTS idx_partners_entry_password
ON partners(partner_entry_password)
WHERE partner_entry_password IS NOT NULL;

-- Index for events that need host validation
CREATE INDEX IF NOT EXISTS idx_events_host_validation
ON events(host_validated, event_type, partner_id)
WHERE host_validated = FALSE AND partner_id IS NOT NULL;

-- ============================================
-- 4. Update RLS policies (if needed)
-- ============================================

-- Partners should be able to update their own entry password
-- This policy assumes you have user_id or similar in partners table
-- Adjust according to your actual schema

-- Example policy (uncomment and adjust if needed):
-- CREATE POLICY "Partners can update own entry password"
-- ON partners
-- FOR UPDATE
-- USING (auth.uid() = user_id)
-- WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 5. Validation function
-- ============================================

-- Function to validate that partner_entry_password is exactly 4 digits
CREATE OR REPLACE FUNCTION validate_partner_entry_password()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.partner_entry_password IS NOT NULL THEN
    IF NEW.partner_entry_password !~ '^\d{4}$' THEN
      RAISE EXCEPTION 'partner_entry_password must be exactly 4 digits';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate password format
DROP TRIGGER IF EXISTS validate_partner_password_trigger ON partners;
CREATE TRIGGER validate_partner_password_trigger
  BEFORE INSERT OR UPDATE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION validate_partner_entry_password();

-- ============================================
-- 6. Sample data for testing (optional)
-- ============================================

-- Uncomment to add test passwords to existing partners
-- UPDATE partners
-- SET partner_entry_password = LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')
-- WHERE partner_entry_password IS NULL;

-- ============================================
-- 7. Verification queries
-- ============================================

-- Verify columns were added
SELECT
  column_name,
  data_type,
  character_maximum_length,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'partners'
  AND column_name = 'partner_entry_password';

SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name IN ('host_validated', 'host_validated_at');

-- Check existing partners without password (should set them)
SELECT
  id,
  name,
  partner_entry_password
FROM partners
WHERE partner_entry_password IS NULL
LIMIT 10;
