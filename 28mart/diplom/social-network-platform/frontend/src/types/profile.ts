export interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  headline?: string;
  website?: string;
  location?: string;
  banner_url?: string;
  interests?: string[];
  skills?: string[];
  experience?: Experience[];
  education?: Education[];
  linkedin_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  updated_at?: string;
  is_private?: boolean;
  is_account_locked?: boolean;
  lock_reason?: string;
  lock_password?: string;
  interests_visibility?: 'public' | 'private' | 'connections';
  education_visibility?: 'public' | 'private' | 'connections';
  experience_visibility?: 'public' | 'private' | 'connections';
  events_visibility?: 'public' | 'private' | 'connections';
  profile_visibility?: 'public' | 'private' | 'connections';
}

export interface Experience {
  id: string;
  profile_id: string;
  title: string;
  company: string;
  location?: string;
  start_date: string;
  end_date?: string;
  description?: string;
  current: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Education {
  id: string;
  profile_id: string;
  school: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date?: string;
  description?: string;
  current: boolean;
  created_at?: string;
  updated_at?: string;
}
