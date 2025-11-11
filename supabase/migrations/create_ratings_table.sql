-- Create ratings table for user ratings system
-- Migration: create_ratings_table.sql

BEGIN;

-- Create ratings table if it doesn't exist
CREATE TABLE IF NOT EXISTS ratings (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL,
    from_user_id UUID NOT NULL,
    to_user_id UUID NOT NULL,
    rating_type VARCHAR(20) NOT NULL CHECK (rating_type IN ('host', 'participant')),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique rating per user pair per event
    UNIQUE(event_id, from_user_id, to_user_id, rating_type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ratings_event_id ON ratings(event_id);
CREATE INDEX IF NOT EXISTS idx_ratings_from_user ON ratings(from_user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_to_user ON ratings(to_user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_type ON ratings(rating_type);

-- Add foreign key constraints if tables exist
DO $$
BEGIN
    -- Try to add foreign key to events table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
        ALTER TABLE ratings 
        ADD CONSTRAINT fk_ratings_event_id 
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
    END IF;
    
    -- Try to add foreign key to profiles table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        ALTER TABLE ratings 
        ADD CONSTRAINT fk_ratings_from_user_id 
        FOREIGN KEY (from_user_id) REFERENCES profiles(id) ON DELETE CASCADE;
        
        ALTER TABLE ratings 
        ADD CONSTRAINT fk_ratings_to_user_id 
        FOREIGN KEY (to_user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        -- Foreign keys already exist, ignore
        NULL;
END $$;

-- Add comments
COMMENT ON TABLE ratings IS 'User ratings for events (host and participant ratings)';
COMMENT ON COLUMN ratings.rating_type IS 'Type of rating: host (rating anfitrião) or participant (rating outro participante)';
COMMENT ON COLUMN ratings.rating IS 'Rating value from 1 to 5 stars';

COMMIT;