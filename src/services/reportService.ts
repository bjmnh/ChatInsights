import { supabase, handleSupabaseError } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type UserReport = Database['public']['Tables']['user_reports']['Row'];
type UserReportInsert = Database['public']['Tables']['user_reports']['Insert'];

export class ReportService {
  // Create a new report
  static async createReport(reportData: Omit<UserReportInsert, 'id' | 'generated_at'>): Promise<UserReport> {
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .insert(reportData)
        .select()
        .single();

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      return data;
    } catch (error) {
      console.error('Error creating report:', error);
      throw error;
    }
  }

  // Get all reports for a user
  static async getUserReports(userId: string): Promise<UserReport[]> {
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .select(`
          *,
          jobs (
            filename,
            created_at,
            total_conversations
          )
        `)
        .eq('user_id', userId)
        .order('generated_at', { ascending: false });

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user reports:', error);
      throw error;
    }
  }

  // Get a specific report
  static async getReport(reportId: string): Promise<UserReport | null> {
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .select(`
          *,
          jobs (
            filename,
            created_at,
            total_conversations
          )
        `)
        .eq('id', reportId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Report not found
        }
        throw new Error(handleSupabaseError(error));
      }

      return data;
    } catch (error) {
      console.error('Error fetching report:', error);
      throw error;
    }
  }

  // Get report by job ID
  static async getReportByJobId(jobId: string): Promise<UserReport | null> {
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .select(`
          *,
          jobs (
            filename,
            created_at,
            total_conversations
          )
        `)
        .eq('job_id', jobId)
        .maybeSingle();

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      return data;
    } catch (error) {
      console.error('Error fetching report by job ID:', error);
      throw error;
    }
  }

  // Update report with paid insights
  static async updateReportWithPaidInsights(reportId: string, paidInsights: any): Promise<UserReport> {
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .update({ paid_insights: paidInsights })
        .eq('id', reportId)
        .select()
        .single();

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      return data;
    } catch (error) {
      console.error('Error updating report with paid insights:', error);
      throw error;
    }
  }

  // Delete a report
  static async deleteReport(reportId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_reports')
        .delete()
        .eq('id', reportId);

      if (error) {
        throw new Error(handleSupabaseError(error));
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      throw error;
    }
  }

  // Delete all reports for a user
  static async deleteAllUserReports(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_reports')
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw new Error(handleSupabaseError(error));
      }
    } catch (error) {
      console.error('Error deleting all user reports:', error);
      throw error;
    }
  }

  // Export report data
  static async exportReport(reportId: string, format: 'json' | 'pdf' = 'json'): Promise<Blob> {
    try {
      const report = await this.getReport(reportId);
      
      if (!report) {
        throw new Error('Report not found');
      }

      if (format === 'json') {
        const exportData = {
          id: report.id,
          generated_at: report.generated_at,
          free_insights: report.free_insights,
          paid_insights: report.paid_insights,
          job_info: (report as any).jobs
        };

        return new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json'
        });
      }

      // For PDF export, you would implement PDF generation here
      // For now, we'll return JSON
      throw new Error('PDF export not yet implemented');
    } catch (error) {
      console.error('Error exporting report:', error);
      throw error;
    }
  }
}