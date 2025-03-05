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
          name: string | null
          username: string | null
          profile_pic_url: string | null
          email: string | null
          phone_number: string | null
          gender: string | null
          date_of_birth: string | null
          is_doctor: boolean | null
          updated_at: string
        }
        Insert: {
          id: string
          name?: string | null
          username?: string | null
          profile_pic_url?: string | null
          email?: string | null
          phone_number?: string | null
          gender?: string | null
          date_of_birth?: string | null
          is_doctor?: boolean | null
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          username?: string | null
          profile_pic_url?: string | null
          email?: string | null
          phone_number?: string | null
          gender?: string | null
          date_of_birth?: string | null
          is_doctor?: boolean | null
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          title: string
          content: string
          image_url: string | null
          author_name: string | null
          author_username: string | null
          author_profile_pic: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          title: string
          content: string
          image_url?: string | null
          author_name?: string | null
          author_username?: string | null
          author_profile_pic?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          title?: string
          content?: string
          image_url?: string | null
          author_name?: string | null
          author_username?: string | null
          author_profile_pic?: string | null
        }
      }
      connections: {
        Row: {
          id: string
          requester_id: string
          target_id: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          requester_id: string
          target_id: string
          status: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          requester_id?: string
          target_id?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      posts_with_authors: {
        Row: {
          id: string
          created_at: string
          user_id: string
          title: string
          content: string
          image_url: string | null
          author_name: string | null
          author_username: string | null
          author_profile_pic: string | null
        }
      }
    }
  }
}