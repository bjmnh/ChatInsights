import { supabase, handleSupabaseError } from '../lib/supabase';

export class StorageService {
  private static readonly BUCKET_NAME = 'conversation-files';

  // Upload a file to Supabase Storage
  static async uploadFile(file: File, userId: string, jobId: string): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      // Use a consistent naming pattern: userId/jobId/conversations.json
      const fileName = `${userId}/${jobId}/conversations.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      return data.path;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // Get a signed URL for file access
  static async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      throw error;
    }
  }

  // Download a file
  static async downloadFile(filePath: string): Promise<Blob> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .download(filePath);

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      return data;
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  // Delete a file
  static async deleteFile(filePath: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        throw new Error(handleSupabaseError(error));
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // Delete all files for a user/job
  static async deleteJobFiles(userId: string, jobId: string): Promise<void> {
    try {
      const { data: files, error: listError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(`${userId}/${jobId}`);

      if (listError) {
        throw new Error(handleSupabaseError(listError));
      }

      if (files && files.length > 0) {
        const filePaths = files.map(file => `${userId}/${jobId}/${file.name}`);
        
        const { error: deleteError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .remove(filePaths);

        if (deleteError) {
          throw new Error(handleSupabaseError(deleteError));
        }
      }
    } catch (error) {
      console.error('Error deleting job files:', error);
      throw error;
    }
  }

  // Get file info
  static async getFileInfo(filePath: string) {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(filePath.split('/').slice(0, -1).join('/'));

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      const fileName = filePath.split('/').pop();
      const fileInfo = data?.find(file => file.name === fileName);

      return fileInfo || null;
    } catch (error) {
      console.error('Error getting file info:', error);
      throw error;
    }
  }
}