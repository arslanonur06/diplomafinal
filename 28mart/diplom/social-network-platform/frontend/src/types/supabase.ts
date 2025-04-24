// Supabase database types
// These types represent database entities in the Supabase backend

export interface Profile {
  id: string;
  updated_at?: string;
  created_at?: string;
  full_name: string | null;
  avatar_url: string | null;
  headline?: string | null;
  bio?: string | null;
  interests?: string[];
  location?: string | null;
  website?: string | null;
  social_links?: Record<string, string> | null;
  settings?: Record<string, any> | null;
  email?: string | null;
  languages?: string[];
}

export interface Post {
  id: string;
  created_at: string;
  updated_at?: string;
  content: string;
  user_id: string;
  image_urls?: string[] | null;
  group_id?: string | null;
  event_id?: string | null;
  mentioned_user_id?: string | null;
  hashtags?: string[] | null;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}
