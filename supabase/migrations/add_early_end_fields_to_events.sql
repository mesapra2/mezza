-- Add early end fields to events table
-- Migration: add_early_end_fields_to_events.sql

BEGIN;

-- Add columns for early end tracking
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS early_end_reason TEXT,
ADD COLUMN IF NOT EXISTS early_ended_by VARCHAR(20) CHECK (early_ended_by IN ('creator', 'participant'));

-- Add comments
COMMENT ON COLUMN events.early_end_reason IS 'Motivo fornecido para encerramento antecipado do evento';
COMMENT ON COLUMN events.early_ended_by IS 'Quem solicitou o encerramento: creator (anfitrião) ou participant (participante)';

-- Create index for better performance on queries
CREATE INDEX IF NOT EXISTS idx_events_early_ended 
ON events(early_ended_by, early_end_reason) 
WHERE early_end_reason IS NOT NULL;

COMMIT;