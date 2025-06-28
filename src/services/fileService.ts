import { supabase } from '../lib/supabase';
import { useAuth } from '@clerk/clerk-react';

export interface UploadedFile {
  id: string;
  user_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
  has_basic_report: boolean;
  has_premium_report: boolean;
}

export interface Report {
  id: string;
  user_id: string;
  file_id: string;
  report_type: 'basic' | 'premium';
  report_data: any;
  generated_at: string;
}

export class FileService {
  // Upload a file to storage and create database record
  static async uploadFile(file: File, userId: string): Promise<UploadedFile> {
    try {
      // Generate unique file path
      const fileId = crypto.randomUUID();
      const filePath = `${userId}/${fileId}/${file.name}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('conversation-files')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Create database record
      const { data, error } = await supabase
        .from('uploaded_files')
        .insert({
          id: fileId,
          user_id: userId,
          filename: file.name,
          file_path: filePath,
          file_size: file.size,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // Get all uploaded files for a user
  static async getUserFiles(userId: string): Promise<UploadedFile[]> {
    try {
      const { data, error } = await supabase
        .from('uploaded_files')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch files: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user files:', error);
      throw error;
    }
  }

  // Delete a file and its reports
  static async deleteFile(fileId: string): Promise<void> {
    try {
      // Get file info first
      const { data: fileData, error: fileError } = await supabase
        .from('uploaded_files')
        .select('file_path')
        .eq('id', fileId)
        .single();

      if (fileError) {
        throw new Error(`File not found: ${fileError.message}`);
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('conversation-files')
        .remove([fileData.file_path]);

      if (storageError) {
        console.warn('Storage deletion failed:', storageError.message);
      }

      // Delete reports first (due to foreign key)
      await supabase
        .from('reports')
        .delete()
        .eq('file_id', fileId);

      // Delete file record
      const { error: deleteError } = await supabase
        .from('uploaded_files')
        .delete()
        .eq('id', fileId);

      if (deleteError) {
        throw new Error(`Failed to delete file: ${deleteError.message}`);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // Generate basic report
  static async generateBasicReport(fileId: string): Promise<any> {
    try {
      // Get Clerk token for authentication
      const { getToken } = useAuth();
      const token = await getToken({ template: 'supabase' });
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-basic-report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Report generation failed: ${errorText}`);
      }

      const result = await response.json();
      return result.report;
    } catch (error) {
      console.error('Error generating basic report:', error);
      throw error;
    }
  }

  // Generate premium report
  static async generatePremiumReport(fileId: string): Promise<any> {
    try {
      // Get Clerk token for authentication
      const { getToken } = useAuth();
      const token = await getToken({ template: 'supabase' });
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-premium-report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Report generation failed: ${errorText}`);
      }

      const result = await response.json();
      return result.report;
    } catch (error) {
      console.error('Error generating premium report:', error);
      throw error;
    }
  }

  // Get reports for a file
  static async getFileReports(fileId: string): Promise<Report[]> {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('file_id', fileId)
        .order('generated_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch reports: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching reports:', error);
      throw error;
    }
  }
}