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
          updated_at: string
        }
        Insert: {
          id: string
          name?: string | null
          username?: string | null
          profile_pic_url?: string | null
          email?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          username?: string | null
          profile_pic_url?: string | null
          email?: string | null
          updated_at?: string
        }
      }
    }
  }
}