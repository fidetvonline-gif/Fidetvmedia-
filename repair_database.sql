-- FideTV Database Repair Script
-- This script fixes missing 'channels' table references and optimizes RLS policies.

-- 1. FIX: Missing 'channels' relation
-- Create a view so legacy queries or tools expecting 'channels' will work.
CREATE OR REPLACE VIEW public.channels AS SELECT * FROM public.tv_channels;

-- 2. FIX: Missing 'videos' relation
CREATE OR REPLACE VIEW public.videos AS SELECT * FROM public.portfolio_items;

-- 3. AUDIT & REPAIR RLS: TV Channels
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'tv_channels') THEN
        ALTER TABLE public.tv_channels ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "TV channels viewable by everyone" ON public.tv_channels;
        CREATE POLICY "TV channels viewable by everyone" ON public.tv_channels FOR SELECT USING (true);
        DROP POLICY IF EXISTS "Public can view tv_channels" ON public.tv_channels;
        CREATE POLICY "Public can view tv_channels" ON public.tv_channels FOR SELECT USING (true);
        DROP POLICY IF EXISTS "Only admin can manage TV channels" ON public.tv_channels;
        CREATE POLICY "Only admin can manage TV channels" ON public.tv_channels FOR ALL USING (
            (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com')
        );
    END IF;
END
$$;

-- 4. REPAIR SERVICES TABLE
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'services') THEN
        ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Services are viewable by everyone" ON public.services;
        CREATE POLICY "Services are viewable by everyone" ON public.services FOR SELECT USING (true);
    END IF;
END
$$;

-- 5. REPAIR SITE SETTINGS
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'site_settings') THEN
        ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Settings viewable by everyone" ON public.site_settings;
        CREATE POLICY "Settings viewable by everyone" ON public.site_settings FOR SELECT USING (true);
    END IF;
END
$$;

-- 6. REPAIR PORTFOLIO
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'portfolio_items') THEN
        ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Portfolio items viewable by everyone" ON public.portfolio_items;
        CREATE POLICY "Portfolio items viewable by everyone" ON public.portfolio_items FOR SELECT USING (true);
    END IF;
END
$$;

-- 7. REPAIR STABLE CHANNELS
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'stable_channels') THEN
        ALTER TABLE public.stable_channels ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public can view stable_channels" ON public.stable_channels;
        CREATE POLICY "Public can view stable_channels" ON public.stable_channels FOR SELECT USING (true);
    END IF;
END
$$;

-- 8. ALLOW LOGGING
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'error_logs') THEN
        ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Anyone can insert error logs" ON public.error_logs;
        CREATE POLICY "Anyone can insert error logs" ON public.error_logs FOR INSERT WITH CHECK (true);
    END IF;
END
$$;

-- 9. NOTIFICATIONS (Ensuring users can see their own)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'notifications') THEN
        ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
        CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = recipient_id);
    END IF;
END
$$;
