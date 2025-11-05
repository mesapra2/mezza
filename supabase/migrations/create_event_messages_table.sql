-- ========================================
-- Migration: Create event_messages Table
-- Purpose: Chat system for events
-- Date: 2025-11-04
-- ========================================

-- 1. Create event_messages table
CREATE TABLE IF NOT EXISTS public.event_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_messages_event_id
ON public.event_messages(event_id);

CREATE INDEX IF NOT EXISTS idx_event_messages_user_id
ON public.event_messages(user_id);

CREATE INDEX IF NOT EXISTS idx_event_messages_created_at
ON public.event_messages(created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE public.event_messages ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view messages from events they participate in" ON public.event_messages;
DROP POLICY IF EXISTS "Users can insert messages to events they participate in" ON public.event_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.event_messages;
DROP POLICY IF EXISTS "Event creators can view all messages" ON public.event_messages;

-- 5. RLS Policy: Users can view messages from events they're approved in OR created
CREATE POLICY "Users can view messages from events they participate in"
ON public.event_messages
FOR SELECT
USING (
  -- User is the creator of the event
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_messages.event_id
    AND e.creator_id = auth.uid()
  )
  OR
  -- User is an approved participant
  EXISTS (
    SELECT 1 FROM public.event_participants ep
    WHERE ep.event_id = event_messages.event_id
    AND ep.user_id = auth.uid()
    AND ep.status = 'aprovado'
  )
);

-- 6. RLS Policy: Users can insert messages if they're approved participants OR creators
CREATE POLICY "Users can insert messages to events they participate in"
ON public.event_messages
FOR INSERT
WITH CHECK (
  -- User is the creator
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_messages.event_id
    AND e.creator_id = auth.uid()
  )
  OR
  -- User is an approved participant
  EXISTS (
    SELECT 1 FROM public.event_participants ep
    WHERE ep.event_id = event_messages.event_id
    AND ep.user_id = auth.uid()
    AND ep.status = 'aprovado'
  )
);

-- 7. RLS Policy: Users can delete their own messages
CREATE POLICY "Users can delete their own messages"
ON public.event_messages
FOR DELETE
USING (user_id = auth.uid());

-- 8. Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_event_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_update_event_messages_updated_at ON public.event_messages;
CREATE TRIGGER trigger_update_event_messages_updated_at
  BEFORE UPDATE ON public.event_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_event_messages_updated_at();

-- 10. Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON public.event_messages TO authenticated;

-- ========================================
-- Verification Queries
-- ========================================

-- Check if table was created
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name = 'event_messages';

-- Check indexes
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'event_messages';

-- Check RLS policies
-- SELECT policyname, cmd, roles FROM pg_policies
-- WHERE tablename = 'event_messages';

-- ========================================
-- Test Insert (after migration)
-- ========================================

-- INSERT INTO public.event_messages (event_id, user_id, content)
-- VALUES (1, auth.uid(), 'Test message');
