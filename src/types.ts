export type EventStatus = 'live' | 'upcoming' | 'offline';

export interface Event {
  id: string;
  title: string;
  description: string;
  stream_url?: string;
  youtube_id?: string;
  start_time: string;
  status: EventStatus;
  thumbnail_url?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  social_x?: string;
  social_instagram?: string;
  social_linkedin?: string;
  is_verified?: boolean;
  verification_requested?: boolean;
  verification_details?: string;
  created_at: string;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: 'member' | 'moderator' | 'admin';
  created_at: string;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  created_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  community_id?: string;
  content: string;
  media_url?: string;
  type: 'text' | 'image' | 'video';
  created_at: string;
  profiles?: Profile;
  post_likes?: { user_id: string }[];
  _count?: {
    post_likes: number;
    comments: number;
  };
}

export interface News {
  id: string;
  title: string;
  slug: string;
  description?: string;
  content: string;
  image_url?: string;
  image_urls?: string[];
  author_id: string;
  is_published: boolean;
  created_at: string;
  profiles?: Profile;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  profiles?: Profile;
}

export interface Booking {
  id: string;
  user_id?: string;
  client_name: string;
  client_email: string;
  event_type: string;
  date: string;
  budget?: string;
  message?: string;
  feedback?: string;
  rating?: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  description?: string;
  image_url?: string;
  video_url?: string;
  youtube_id?: string;
  is_featured: boolean;
  created_at: string;
}

export interface TvChannel {
  id: string;
  name: string;
  category: string;
  thumbnail?: string;
  url: string;
  icon?: string;
  description?: string;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content?: string;
  media_url?: string;
  media_type?: 'image' | 'file';
  is_view_once: boolean;
  is_viewed: boolean;
  is_deleted: boolean;
  created_at: string;
  sender?: Profile;
  receiver?: Profile;
}
