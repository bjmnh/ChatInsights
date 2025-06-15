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
          avatar_url?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      jobs: {
        Row: {
          id: string
          user_id: string
          filename: string
          status: 'uploading' | 'processing' | 'completed' | 'failed'
          progress: number
          total_conversations: number | null
          processed_conversations: number | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          filename: string
          status?: 'uploading' | 'processing' | 'completed' | 'failed'
          progress?: number
          total_conversations?: number | null
          processed_conversations?: number | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          filename?: string
          status?: 'uploading' | 'processing' | 'completed' | 'failed'
          progress?: number
          total_conversations?: number | null
          processed_conversations?: number | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_reports: {
        Row: {
          id: string
          user_id: string
          job_id: string
          free_insights: Json
          paid_insights: Json | null
          generated_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          job_id: string
          free_insights: Json
          paid_insights?: Json | null
          generated_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          job_id?: string
          free_insights?: Json
          paid_insights?: Json | null
          generated_at?: string
          expires_at?: string | null
        }
      }
      payments: {
        Row: {
          id: string
          user_id: string
          job_id: string | null
          stripe_payment_intent_id: string
          amount: number
          currency: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          job_id?: string | null
          stripe_payment_intent_id: string
          amount: number
          currency: string
          status: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          job_id?: string | null
          stripe_payment_intent_id?: string
          amount?: number
          currency?: string
          status?: string
          created_at?: string
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}