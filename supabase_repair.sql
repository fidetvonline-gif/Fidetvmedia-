
-- FIDE TV COMPLETE DATABASE REPAIR v3.0
-- This script fixes RLS, missing views, and permissions for production users.

-- 1. TV CHANNELS TABLE
-- Ensure the table existence and columns
CREATE TABLE IF NOT EXISTS public.tv_channels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    category text,
    url text NOT NULL,
    thumbnail text,
    description text,
    is_active boolean DEFAULT true,
    order_index integer DEFAULT 0,
    stream_type text DEFAULT 'hls',
    last_checked timestamptz,
    status text DEFAULT 'unknown',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tv_channels ENABLE ROW LEVEL SECURITY;

-- 2. POLICIES FOR TV_CHANNELS
-- Drop existing to avoid conflicts
DROP POLICY IF EXISTS "Public Select All" ON public.tv_channels;
DROP POLICY IF EXISTS "Public Select tv_channels" ON public.tv_channels;
DROP POLICY IF EXISTS "Everyone can select tv_channels" ON public.tv_channels;
DROP POLICY IF EXISTS "TV channels viewable by everyone" ON public.tv_channels;
DROP POLICY IF EXISTS "Public can view tv_channels" ON public.tv_channels;

-- Create a clean, definitive public access policy
CREATE POLICY "Public Select All" ON public.tv_channels FOR SELECT TO anon, authenticated USING (true);

-- Admin policy (INSERT/UPDATE/DELETE)
DROP POLICY IF EXISTS "Admin All Access" ON public.tv_channels;
DROP POLICY IF EXISTS "Admin All tv_channels" ON public.tv_channels;
DROP POLICY IF EXISTS "Only admin can manage TV channels" ON public.tv_channels;
CREATE POLICY "Admin All Access" ON public.tv_channels FOR ALL 
USING (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com')
WITH CHECK (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com');


-- 3. THE 'channels' VIEW
-- The user reported errors referencing 'channels'. 
-- We ensure this view exists and is accessible.
DROP VIEW IF EXISTS public.channels;
CREATE OR REPLACE VIEW public.channels WITH (security_invoker = true) AS 
SELECT * FROM public.tv_channels;

-- 4. OTHER TABLES (Quick Audit)
-- site_settings
CREATE TABLE IF NOT EXISTS public.site_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text UNIQUE NOT NULL,
    value text,
    updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Settings" ON public.site_settings;
CREATE POLICY "Public Read Settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);

-- portfolio_items (videos)
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Videos" ON public.portfolio_items;
CREATE POLICY "Public Read Videos" ON public.portfolio_items FOR SELECT TO anon, authenticated USING (true);

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 5. GRANTS (CRITICAL FOR SUPABASE REST API)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.tv_channels TO anon, authenticated;
GRANT SELECT ON public.channels TO anon, authenticated;
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT SELECT ON public.portfolio_items TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;

-- Ensure the 'channels' view is viewable by the anon role
GRANT SELECT ON public.channels TO anon;

-- Done.
