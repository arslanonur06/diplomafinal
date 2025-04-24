export interface Profile {
  id: string;
  full_name: string;
  headline?: string;
  bio?: string;
  avatar_url?: string;
  website?: string;
  country?: string;
  city?: string;
  interests?: string[];
  skills?: string[];
  experience?: Experience[];
  education?: Education[];
  is_profile_complete?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Experience {
  id?: string;
  profile_id?: string;
  title: string;
  company: string;
  location?: string;
  start_date: string;
  end_date?: string;
  description?: string;
  current?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Education {
  id?: string;
  profile_id?: string;
  school: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date?: string;
  description?: string;
  current?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ExperienceFormProps {
  experience?: Experience;
  onSave: (experience: Experience) => Promise<void>;
  onCancel: () => void;
}

export interface EducationFormProps {
  education?: Education;
  onSave: (education: Education) => Promise<void>;
  onCancel: () => void;
}
