import { supabase, handleSupabaseError } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Job = Database['public']['Tables']['jobs']['Row'];
type JobInsert = Database['public']['Tables']['jobs']['Insert'];
type JobUpdate = Database['public']['Tables']['jobs']['Update'];

export class JobService {
  // Create a new job
  static async createJob(jobData: Omit<JobInsert, 'id' | 'created_at' | 'updated_at'>): Promise<Job> {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .insert(jobData)
        .select()
        .single();

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      return data;
    } catch (error) {
      console.error('Error creating job:', error);
      throw error;
    }
  }

  // Get all jobs for a user
  static async getUserJobs(userId: string): Promise<Job[]> {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user jobs:', error);
      throw error;
    }
  }

  // Get a specific job
  static async getJob(jobId: string): Promise<Job | null> {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Job not found
        }
        throw new Error(handleSupabaseError(error));
      }

      return data;
    } catch (error) {
      console.error('Error fetching job:', error);
      throw error;
    }
  }

  // Update job progress
  static async updateJobProgress(jobId: string, progress: number, status?: Job['status']): Promise<Job> {
    try {
      const updateData: JobUpdate = { progress };
      if (status) {
        updateData.status = status;
      }

      const { data, error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId)
        .select()
        .single();

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      return data;
    } catch (error) {
      console.error('Error updating job progress:', error);
      throw error;
    }
  }

  // Update job status
  static async updateJobStatus(
    jobId: string, 
    status: Job['status'], 
    errorMessage?: string,
    totalConversations?: number,
    processedConversations?: number
  ): Promise<Job> {
    try {
      const updateData: JobUpdate = { status };
      
      if (errorMessage !== undefined) {
        updateData.error_message = errorMessage;
      }
      
      if (totalConversations !== undefined) {
        updateData.total_conversations = totalConversations;
      }
      
      if (processedConversations !== undefined) {
        updateData.processed_conversations = processedConversations;
      }

      const { data, error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId)
        .select()
        .single();

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      return data;
    } catch (error) {
      console.error('Error updating job status:', error);
      throw error;
    }
  }

  // Process a job (trigger the edge function)
  static async processJob(jobId: string, analysisType: 'basic' | 'premium' = 'basic'): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-conversation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          jobId,
          analysisType 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Processing failed');
      }

      const result = await response.json();
      console.log('Processing result:', result);
    } catch (error) {
      console.error('Error processing job:', error);
      throw error;
    }
  }

  // Reprocess job with premium analysis
  static async reprocessWithPremium(jobId: string): Promise<void> {
    try {
      // Update job to indicate premium reprocessing
      await this.updateJobStatus(jobId, 'processing');
      
      // Update analysis type
      const { error } = await supabase
        .from('jobs')
        .update({ 
          analysis_type: 'premium',
          premium_features_enabled: true 
        })
        .eq('id', jobId);

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      // Trigger premium processing
      await this.processJob(jobId, 'premium');
    } catch (error) {
      console.error('Error reprocessing with premium:', error);
      throw error;
    }
  }

  // Delete a job
  static async deleteJob(jobId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId);

      if (error) {
        throw new Error(handleSupabaseError(error));
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      throw error;
    }
  }

  // Subscribe to job updates
  static subscribeToJobUpdates(jobId: string, callback: (job: Job) => void) {
    const subscription = supabase
      .channel(`job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          callback(payload.new as Job);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }
}