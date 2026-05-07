-- SQL Setup for Fide TV Media Channels
-- This file can be used to populate your 'tv_channels' table in Supabase or Postgres.

-- 1. Create the tv_channels table if it doesn't already exist
CREATE TABLE IF NOT EXISTS tv_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    url TEXT NOT NULL,
    thumbnail TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    icon TEXT DEFAULT 'Tv' -- Store icon name as string for frontend mapping
);

-- 2. Clear existing channels (Optional - use with caution)
-- TRUNCATE tv_channels;

-- 3. Insert refined stable channels
INSERT INTO tv_channels (name, category, url, thumbnail, description, icon, order_index)
VALUES 
('Channels TV', 'Nigeria', 'https://www.youtube.com/watch?v=0_u6uOnE6I4', 'https://images.unsplash.com/photo-1585829365234-781fcd04c838?q=80&w=800', 'Premier 24-hour news channel in Nigeria.', 'Tv', 1),
('TVC News', 'Nigeria', 'https://www.youtube.com/watch?v=gT8_kK2w-D4', 'https://images.unsplash.com/photo-1495020689067-958852a7765e?q=80&w=800', 'Leading news and current affairs from Nigeria and Africa.', 'Globe', 2),
('AIT Nigeria', 'Nigeria', 'https://www.youtube.com/watch?v=hGv-S6ZpIKE', 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=800', 'Africa Independent Television - news and entertainment.', 'Tv', 3),
('beIN Sports XTRA', 'Sports', 'https://beinsportsxtra-rakuten.amagi.tv/playlist.m3u8', 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800', '24/7 sports coverage including soccer, tennis, and more.', 'MonitorPlay', 4),
('FIFA+', 'Sports', 'https://fifa-fifaplus-5-us.ottera.tv/playlist.m3u8', 'https://images.unsplash.com/photo-1551958219-acbc608c6377?q=80&w=800', 'Official FIFA live and archive match content.', 'MonitorPlay', 5),
('NTA News 24', 'Nigeria', 'https://www.youtube.com/watch?v=2SgEqv8S5dY', 'https://images.unsplash.com/photo-1493612276216-ee3925520721?q=80&w=800', 'Nigeria Television Authority 24-hour news.', 'Tv', 6),
('Red Bull TV', 'Sports', 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8', 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=800', '24/7 Live Action Sports and Lifestyle.', 'MonitorPlay', 7),
('Al Jazeera English', 'News', 'https://live-hls-web-aje.getaj.net/AJE/index.m3u8', 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=800', 'Breaking news and world events happening right now.', 'Globe', 8),
-- 4. Create the services table
CREATE TABLE IF NOT EXISTS public.services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT, 
  features TEXT[] DEFAULT '{}',
  price TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Enable RLS and add policies for services
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Services are viewable by everyone" ON public.services FOR SELECT USING (true);
CREATE POLICY "Only admin can manage services" ON public.services FOR ALL USING (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com');
