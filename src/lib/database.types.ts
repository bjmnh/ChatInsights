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
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          premium_status: boolean
          premium_unlocked_at: string | null
          avatar_url: string | null
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          premium_status?: boolean
          premium_unlocked_at?: string | null
          avatar_url?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          premium_status?: boolean
          premium_unlocked_at?: string | null
          avatar_url?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      uploaded_files: {
        Row: {
          id: string
          user_id: string
          filename: string
          file_path: string
          file_size: number
          uploaded_at: string
          has_basic_report: boolean
          has_premium_report: boolean
        }
        Insert: {
          id?: string
          user_id: string
          filename: string
          file_path: string
          file_size: number
          uploaded_at?: string
          has_basic_report?: boolean
          has_premium_report?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          filename?: string
          file_path?: string
          file_size?: number
          uploaded_at?: string
          has_basic_report?: boolean
          has_premium_report?: boolean
        }
        Relationships: []
      }
      reports: {
        Row: {
          id: string
          user_id: string
          file_id: string
          report_type: 'basic' | 'premium'
          report_data: Json
          generated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_id: string
          report_type: 'basic' | 'premium'
          report_data: Json
          generated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_id?: string
          report_type?: 'basic' | 'premium'
          report_data?: Json
          generated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          user_id: string
          stripe_checkout_session_id: string
          stripe_payment_intent_id: string | null
          stripe_customer_id: string | null
          price_id: string | null
          amount: number | null
          currency: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_checkout_session_id: string
          stripe_payment_intent_id?: string | null
          stripe_customer_id?: string | null
          price_id?: string | null
          amount?: number | null
          currency?: string
          status: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_checkout_session_id?: string
          stripe_payment_intent_id?: string | null
          stripe_customer_id?: string | null
          price_id?: string | null
          amount?: number | null
          currency?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
