-- FideTV Health Check Migration
-- This script adds fields for monitoring and creates an archive table.

-- 1. Update tv_channels
ALTER TABLE tv_channels ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'online' CHECK (status IN ('online', 'offline'));
ALTER TABLE tv_channels ADD COLUMN IF NOT EXISTS last_checked TIMESTAMP WITH TIME ZONE;
ALTER TABLE tv_channels ADD COLUMN IF NOT EXISTS last_online TIMESTAMP WITH TIME ZONE;
ALTER TABLE tv_channels ADD COLUMN IF NOT EXISTS failure_count INTEGER DEFAULT 0;

-- 2. Create archived_channels table for safety
CREATE TABLE IF NOT EXISTS archived_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_id UUID,
  name TEXT NOT NULL,
  category TEXT,
  thumbnail TEXT,
  url TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  country TEXT,
  language TEXT,
  stream_type TEXT,
  backup_urls TEXT[] DEFAULT '{}',
  epg_id TEXT,
  is_active BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  reason TEXT,
  metadata JSONB
);

-- 3. Enable RLS
ALTER TABLE archived_channels ENABLE ROW LEVEL SECURITY;

-- 4. Policies
DROP POLICY IF EXISTS "Admin can manage archived_channels" ON archived_channels;
CREATE POLICY "Admin can manage archived_channels" ON archived_channels FOR ALL USING (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com');

DROP POLICY IF EXISTS "Public can view archived_channels" ON archived_channels;
CREATE POLICY "Public can view archived_channels" ON archived_channels FOR SELECT USING (true);
