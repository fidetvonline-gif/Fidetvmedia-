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
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
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

-- 6. Portfolio Items Table
CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  video_url TEXT,
  youtube_id TEXT,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6.5 TV Channels Table
CREATE TABLE IF NOT EXISTS public.tv_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  thumbnail TEXT,
  url TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. RLS (Row Level Security) Settings
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tv_channels ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY "Admins/Moderators can manage member roles" ON public.community_members FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = community_id
    AND user_id = auth.uid()
    AND role IN ('moderator', 'admin')
  ) OR (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com')
);
CREATE POLICY "Admins/Moderators can remove members" ON public.community_members FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = community_id
    AND user_id = auth.uid()
    AND role IN ('moderator', 'admin')
  ) OR (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com')
);
CREATE POLICY "Events are viewable by everyone" ON public.events FOR SELECT USING (true);
CREATE POLICY "Only admin can manage events" ON public.events FOR ALL USING (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com');

-- Communities: Everyone can read, only admin can create/delete, moderators can update
CREATE POLICY "Communities viewable by everyone" ON public.communities FOR SELECT USING (true);
CREATE POLICY "Only global admin can create communities" ON public.communities FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com');
CREATE POLICY "Admins can delete their own communities or global admin" ON public.communities FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = public.communities.id
    AND user_id = auth.uid()
    AND role = 'admin'
  ) OR (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com')
);
CREATE POLICY "Moderators can update community details" ON public.communities FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = public.communities.id
    AND user_id = auth.uid()
    AND role IN ('moderator', 'admin')
  ) OR (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com')
);

-- Posts: Everyone can read, signed in can write/delete own
CREATE POLICY "Posts viewable by everyone" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON public.posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users/Moderators can delete posts" ON public.posts FOR DELETE USING (
  auth.uid() = author_id OR 
  EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = public.posts.community_id
    AND user_id = auth.uid()
    AND role IN ('moderator', 'admin')
  ) OR (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com')
);

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

-- Portfolio Items: Everyone can see, only admin can manage
DROP POLICY IF EXISTS "Portfolio items viewable by everyone" ON public.portfolio_items;
CREATE POLICY "Portfolio items viewable by everyone" ON public.portfolio_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Only admin can manage portfolio items" ON public.portfolio_items;
CREATE POLICY "Only admin can manage portfolio items" ON public.portfolio_items FOR ALL USING (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com');

-- TV Channels: Everyone can see, only admin can manage
DROP POLICY IF EXISTS "TV channels viewable by everyone" ON public.tv_channels;
CREATE POLICY "TV channels viewable by everyone" ON public.tv_channels FOR SELECT USING (true);
DROP POLICY IF EXISTS "Only admin can manage TV channels" ON public.tv_channels;
CREATE POLICY "Only admin can manage TV channels" ON public.tv_channels FOR ALL USING (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com');

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

-- 10. Direct Messages Table
CREATE TABLE public.direct_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  media_url TEXT,
  media_type TEXT,
  is_view_once BOOLEAN DEFAULT false,
  is_viewed BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Notifications Table
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('follow', 'like', 'comment', 'post', 'mention', 'direct_message')),
  resource_id UUID, -- Optional ID of the related object (post_id, etc.)
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own messages" ON public.direct_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can read their own messages" ON public.direct_messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can update their own received messages (mark as viewed)" ON public.direct_messages FOR UPDATE USING (auth.uid() = receiver_id);
CREATE POLICY "Users can soft-delete their own sent messages" ON public.direct_messages FOR UPDATE USING (auth.uid() = sender_id);
CREATE POLICY "Users can delete messages" ON public.direct_messages FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = recipient_id);
CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING (auth.uid() = recipient_id);
CREATE POLICY "System/Users can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 12. Storage buckets for messages
INSERT INTO storage.buckets (id, name, public) VALUES ('message-attachments', 'message-attachments', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public Access Attachments" ON storage.objects FOR SELECT USING ( bucket_id = 'message-attachments' );
CREATE POLICY "Upload Access Attachments" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'message-attachments' );
CREATE POLICY "Update Access Attachments" ON storage.objects FOR UPDATE WITH CHECK ( bucket_id = 'message-attachments' );
CREATE POLICY "Delete Access Attachments" ON storage.objects FOR DELETE USING ( bucket_id = 'message-attachments' );

-- 13. Services Table
CREATE TABLE public.services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Name of the lucide icon
  features TEXT[] DEFAULT '{}',
  price TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Services are viewable by everyone" ON public.services FOR SELECT USING (true);
CREATE POLICY "Only admin can manage services" ON public.services FOR ALL USING (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com');
