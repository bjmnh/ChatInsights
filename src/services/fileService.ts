import { supabase } from '../lib/supabase';

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
  report_data: unknown;
  generated_at: string;
}

export class FileService {
  // Upload selected conversations as a new file
  static async uploadSelectedConversations(
    conversations: unknown[], 
    userId: string, 
    filename: string
  ): Promise<UploadedFile> {
    try {
      // Convert conversations array back to JSON
      const jsonContent = JSON.stringify(conversations, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      
      // Generate unique file path
      const fileId = crypto.randomUUID();
      const filePath = `${userId}/${fileId}/${filename}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('conversation-files')
        .upload(filePath, blob);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Create database record
      const { data, error } = await supabase
        .from('uploaded_files')
        .insert({
          id: fileId,
          user_id: userId,
          filename: filename,
          file_path: filePath,
          file_size: blob.size,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error uploading selected conversations:', error);
      throw error;
    }
  }

  // Original upload method (kept for backward compatibility)
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

  static async generateBasicReport(fileId: string): Promise<unknown> {
    return this.invokeReport('generate-basic-report', fileId);
  }

  static async generatePremiumReport(fileId: string): Promise<unknown> {
    return this.invokeReport('generate-premium-report', fileId);
  }

  private static async invokeReport(name: string, fileId: string): Promise<unknown> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sign in to generate a report');

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileId }),
    });

    const text = await response.text();
    let payload: { error?: string; code?: string; report?: unknown } = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { error: text };
    }

    if (!response.ok) {
      throw new Error(payload.error || 'Report generation failed');
    }

    return payload.report;
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