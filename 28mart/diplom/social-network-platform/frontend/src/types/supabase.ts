// Basic user profile type
export interface Profile {
  id: string;
  updated_at?: string | null;
  created_at?: string;
  user_id?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  avatar_emoji?: string | null;
  website?: string | null;
  bio?: string | null;
  headline?: string | null;
  location?: string | null;
  is_verified?: boolean;
  is_private?: boolean;
  email_notifications?: boolean;
  last_seen_at?: string | null;
}

// You can add other Supabase-related types here as needed
export interface UserConnection {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  created_at?: string;
  updated_at?: string | null;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string | null;
  created_at: string;
  updated_at?: string | null;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  save_count?: number;
  group_id?: string | null;
  event_id?: string | null;
  tagged_user_id?: string | null;
  hashtags?: string[] | null;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    avatar_emoji?: string | null;
  } | null;
}

export interface Trending {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  category?: string | null;
  count?: number;
  created_at?: string;
  updated_at?: string | null;
}

// Add other types as needed
