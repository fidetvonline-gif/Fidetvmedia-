-- FideTV Supabase Schema

-- 1. Profiles Table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  social_x TEXT,
  social_instagram TEXT,
  social_linkedin TEXT,
  is_verified BOOLEAN DEFAULT false,
  verification_requested BOOLEAN DEFAULT false,
  verification_details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.1 Community Members Table (To track who is in which community)
CREATE TABLE public.community_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(community_id, user_id)
);

-- Note: If you already ran this schema, you only need to run these ALTER commands to add the social fields:
-- ALTER TABLE public.profiles ADD COLUMN social_x TEXT;
-- ALTER TABLE public.profiles ADD COLUMN social_instagram TEXT;
-- ALTER TABLE public.profiles ADD COLUMN social_linkedin TEXT;

-- 2. Events Table
CREATE TABLE public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  stream_url TEXT,
  youtube_id TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('live', 'upcoming', 'offline')),
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Communities Table
CREATE TABLE public.communities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Posts Table (Community Feed)
CREATE TABLE public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'video')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Post Likes Table
CREATE TABLE public.post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(post_id, user_id)
);

-- 6. News (Blog Posts) Table
CREATE TABLE public.news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  image_url TEXT,
  image_urls TEXT[] DEFAULT '{}',
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Comments Table (Used for Posts and Live Chat)
-- For live chat, use post_id with format 'live_{event_id}'
CREATE TABLE public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id TEXT NOT NULL, -- Flexible ID to handle both UUIDs and prefixed strings
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Bookings Table
CREATE TABLE public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  event_type TEXT NOT NULL,
  date DATE NOT NULL,
  budget TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. RLS (Row Level Security) Settings
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- 7. Policies
-- Profiles: Users can read all, but only write their own
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin can manage all profiles" ON public.profiles FOR ALL USING (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com');

-- Community Members: Everyone can see, authenticated can join/leave
CREATE POLICY "Community members viewable by everyone" ON public.community_members FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join communities" ON public.community_members FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can leave communities" ON public.community_members FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Events are viewable by everyone" ON public.events FOR SELECT USING (true);
CREATE POLICY "Only admin can manage events" ON public.events FOR ALL USING (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com');

-- Communities: Everyone can read, only admin can manage
CREATE POLICY "Communities viewable by everyone" ON public.communities FOR SELECT USING (true);
CREATE POLICY "Only admin can manage communities" ON public.communities FOR ALL USING (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com');

-- Posts: Everyone can read, signed in can write/delete own
CREATE POLICY "Posts viewable by everyone" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON public.posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE USING (auth.uid() = author_id);
CREATE POLICY "Admin can delete any post" ON public.posts FOR DELETE USING (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com');

-- Post Likes: Everyone can see, authenticated can like/unlike
CREATE POLICY "Likes viewable by everyone" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users can like posts" ON public.post_likes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can unlike posts" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

-- News: Everyone can read published, admin can manage
CREATE POLICY "Published news viewable by everyone" ON public.news FOR SELECT USING (is_published = true OR auth.jwt() ->> 'email' = 'fidetvonline@gmail.com');
CREATE POLICY "Only admin can manage news" ON public.news FOR ALL USING (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com');

-- Comments: Everyone can read, signed in can write, owner or admin can delete
CREATE POLICY "Comments viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON public.comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = author_id);
CREATE POLICY "Admin can delete any comment" ON public.comments FOR DELETE USING (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com');

-- Bookings: Only admin can see all, users can only insert
CREATE POLICY "Only admin can view bookings" ON public.bookings FOR SELECT USING (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com');
CREATE POLICY "Everyone can request booking" ON public.bookings FOR INSERT WITH CHECK (true);

-- 8. Realtime (Enable replication for specific tables)
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;

-- 9. Storage Buckets (Run these commands from the SQL Editor in Supabase)
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('event-thumbnails', 'event-thumbnails', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id IN ('avatars', 'event-thumbnails') );
CREATE POLICY "Upload Access" ON storage.objects FOR INSERT WITH CHECK ( bucket_id IN ('avatars', 'event-thumbnails') );
CREATE POLICY "Update Access" ON storage.objects FOR UPDATE WITH CHECK ( bucket_id IN ('avatars', 'event-thumbnails') );
CREATE POLICY "Delete Access" ON storage.objects FOR DELETE USING ( bucket_id IN ('avatars', 'event-thumbnails') );
