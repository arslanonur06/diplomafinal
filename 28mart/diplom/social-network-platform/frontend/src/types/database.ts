export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          full_name: string
          avatar_url: string | null
          bio: string | null
          location: string | null
          website: string | null
          birth_date: string | null
          interests: string[]
          is_profile_complete: boolean
          email_verified: boolean
          language_preference: string
          theme_preference: 'light' | 'dark' | 'system'
          notification_settings: {
            email: boolean
            push: boolean
            marketing: boolean
          }
          social_links: {
            twitter?: string
            linkedin?: string
            github?: string
            instagram?: string
          }
          privacy_settings: {
            profile_visibility: 'public' | 'private' | 'friends'
            show_email: boolean
            show_location: boolean
          }
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          full_name: string
          avatar_url?: string | null
          bio?: string | null
          location?: string | null
          website?: string | null
          birth_date?: string | null
          interests?: string[]
          is_profile_complete?: boolean
          email_verified?: boolean
          language_preference?: string
          theme_preference?: 'light' | 'dark' | 'system'
          notification_settings?: {
            email: boolean
            push: boolean
            marketing: boolean
          }
          social_links?: {
            twitter?: string
            linkedin?: string
            github?: string
            instagram?: string
          }
          privacy_settings?: {
            profile_visibility: 'public' | 'private' | 'friends'
            show_email: boolean
            show_location: boolean
          }
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          full_name?: string
          avatar_url?: string | null
          bio?: string | null
          location?: string | null
          website?: string | null
          birth_date?: string | null
          interests?: string[]
          is_profile_complete?: boolean
          email_verified?: boolean
          language_preference?: string
          theme_preference?: 'light' | 'dark' | 'system'
          notification_settings?: {
            email: boolean
            push: boolean
            marketing: boolean
          }
          social_links?: {
            twitter?: string
            linkedin?: string
            github?: string
            instagram?: string
          }
          privacy_settings?: {
            profile_visibility: 'public' | 'private' | 'friends'
            show_email: boolean
            show_location: boolean
          }
        }
      }
      groups: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          description: string
          category: string
          image_url: string | null
          creator_id: string
          is_private: boolean
          rules: string[]
          member_count: number
          post_count: number
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          description: string
          category: string
          image_url?: string | null
          creator_id: string
          is_private?: boolean
          rules?: string[]
          member_count?: number
          post_count?: number
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          description?: string
          category?: string
          image_url?: string | null
          creator_id?: string
          is_private?: boolean
          rules?: string[]
          member_count?: number
          post_count?: number
        }
      }
      group_members: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          group_id: string
          user_id: string
          role: 'member' | 'moderator' | 'admin'
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          group_id: string
          user_id: string
          role?: 'member' | 'moderator' | 'admin'
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          group_id?: string
          user_id?: string
          role?: 'member' | 'moderator' | 'admin'
        }
      }
      posts: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          content: string
          user_id: string
          group_id: string | null
          image_url: string | null
          likes_count: number
          comments_count: number
          tagged_user_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          content: string
          user_id: string
          group_id?: string | null
          image_url?: string | null
          likes_count?: number
          comments_count?: number
          tagged_user_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          content?: string
          user_id?: string
          group_id?: string | null
          image_url?: string | null
          likes_count?: number
          comments_count?: number
          tagged_user_id?: string | null
        }
      }
      user_connections: {
        Row: {
          id: string
          created_at: string
          user_id: string
          connected_user_id: string
          status: 'pending' | 'accepted' | 'rejected' | 'blocked'
          updated_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          connected_user_id: string
          status?: 'pending' | 'accepted' | 'rejected' | 'blocked'
          updated_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          connected_user_id?: string
          status?: 'pending' | 'accepted' | 'rejected' | 'blocked'
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
