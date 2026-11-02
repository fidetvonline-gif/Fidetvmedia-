-- Migration: News Queue Implementation
-- Creates the news_queue table for idempotent processing

CREATE TABLE IF NOT EXISTS public.news_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT UNIQUE NOT NULL,
    source_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER DEFAULT 0,
    last_attempt TIMESTAMP WITH TIME ZONE,
    error_log TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for efficient job claiming by worker
CREATE INDEX IF NOT EXISTS idx_news_queue_status_pending 
ON public.news_queue (status) 
WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.news_queue ENABLE ROW LEVEL SECURITY;

-- Allow service role access (for Edge Functions)
-- If your setup uses standard RLS, ensure the service role has access
-- This assumes standard Supabase service role access for internal functions
