-- Supabase Schema for FideTV Media Hub
-- This script contains the DDL for the primary tables used in the application.

-- 1. Profiles Table (Extends Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user', -- 'admin', 'blogger', 'user'
  bio TEXT,
  is_verified BOOLEAN DEFAULT false,
  followers INTEGER DEFAULT 0,
  specialty TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. TV Channels Table
CREATE TABLE IF NOT EXISTS tv_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  category TEXT DEFAULT 'General',
  thumbnail TEXT,
  icon TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'online', -- 'online', 'offline', 'testing'
  epg_id TEXT,
  country TEXT,
  language TEXT,
  stream_type TEXT, -- 'hls', 'dash', 'youtube', 'vimeo'
  backup_urls TEXT[] DEFAULT '{}',
  order_index INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_checked TIMESTAMP WITH TIME ZONE,
  last_online TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. News / Blog Table
CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  description TEXT,
  content TEXT,
  category TEXT DEFAULT 'News',
  tags TEXT[] DEFAULT '{}',
  image_url TEXT,
  image_urls TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  read_time TEXT DEFAULT '4 min read',
  source_name TEXT DEFAULT 'FideTV Media',
  source_url TEXT,
  region TEXT DEFAULT 'Global',
  author_id TEXT, -- Can be UUID or string from bot
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Events Table (Live Schedule)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  youtube_id TEXT,
  stream_url TEXT,
  thumbnail_url TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'upcoming', -- 'live', 'upcoming', 'offline'
  category TEXT DEFAULT 'Live Broadcast',
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Site Settings Table
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Communities Table
CREATE TABLE IF NOT EXISTS communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  category TEXT,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Community Members (Relationships)
CREATE TABLE IF NOT EXISTS community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'approved', -- 'pending', 'approved'
  role TEXT DEFAULT 'member', -- 'admin', 'moderator', 'member'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(community_id, user_id)
);

-- 8. Ad Units Table
CREATE TABLE IF NOT EXISTS ad_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ad_type TEXT DEFAULT 'banner', -- 'banner', 'interstitial', 'popup'
  platform TEXT DEFAULT 'web', -- 'web', 'android', 'ios'
  image_url TEXT,
  target_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. Site Visits Table (Analytics)
CREATE TABLE IF NOT EXISTS site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 10. Archived Channels (For cleanup automation)
CREATE TABLE IF NOT EXISTS archived_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID,
  name TEXT,
  url TEXT,
  category TEXT,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tv_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;

-- Basic Public Access Policies (Read-only for anon)
CREATE POLICY "Public read access for profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Public read access for tv_channels" ON tv_channels FOR SELECT USING (true);
CREATE POLICY "Public read access for news" ON news FOR SELECT USING (is_published = true);
CREATE POLICY "Public read access for events" ON events FOR SELECT USING (true);
CREATE POLICY "Public read access for site_settings" ON site_settings FOR SELECT USING (true);
CREATE POLICY "Public read access for communities" ON communities FOR SELECT USING (true);
CREATE POLICY "Public read access for ad_units" ON ad_units FOR SELECT USING (is_active = true);

-- 11. Enable Realtime for the news table
-- CRITICAL: For immediate synchronization across the domain, ensure the 'news' table
-- is added to the supabase_realtime publication. Run this in the Supabase SQL Editor:
-- ALTER PUBLICATION supabase_realtime ADD TABLE news;
