export interface Post {
  id?: string;
  content: string;
  user_id: string;
  group_id?: string | null;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
  likes_count?: number;
  comments_count?: number;
  tagged_user_id?: string | null;
  user?: {
    id?: string;
    full_name: string;
    avatar_url?: string;
    avatar_emoji?: string;
  };
}

export interface PostFormProps {
  onSubmit: (post: Post) => Promise<void>;
  onCancel: () => void;
}
