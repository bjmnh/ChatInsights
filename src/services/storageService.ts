import { supabase, handleSupabaseError } from '../lib/supabase';

export class StorageService {
  private static readonly BUCKET_NAME = 'conversation-files';

  // Check if bucket exists and is accessible
  static async checkBucketExists(): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error('Error checking buckets:', error);
        return false;
      }

      return data?.some(bucket => bucket.name === this.BUCKET_NAME) || false;
    } catch (error) {
      console.error('Error checking bucket existence:', error);
      return false;
    }
  }

  // Upload a file to Supabase Storage
  static async uploadFile(file: File, userId: string, jobId: string): Promise<string> {
    try {
      // First check if bucket exists
      const bucketExists = await this.checkBucketExists();
      if (!bucketExists) {
        throw new Error(
          `Storage bucket '${this.BUCKET_NAME}' not found. Please create the bucket in your Supabase dashboard under Storage section.`
        );
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${jobId}/conversations.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        // Provide more specific error messages
        if (error.message?.includes('Bucket not found')) {
          throw new Error(
            `Storage bucket '${this.BUCKET_NAME}' not found. Please create the bucket in your Supabase dashboard under Storage section.`
          );
        } else if (error.message?.includes('not allowed')) {
          throw new Error(
            'File upload not allowed. Please check your storage bucket policies in Supabase dashboard.'
          );
        } else {
          throw new Error(handleSupabaseError(error));
        }
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
        if (error.message?.includes('Bucket not found')) {
          throw new Error(
            `Storage bucket '${this.BUCKET_NAME}' not found. Please create the bucket in your Supabase dashboard.`
          );
        }
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
        if (error.message?.includes('Bucket not found')) {
          throw new Error(
            `Storage bucket '${this.BUCKET_NAME}' not found. Please create the bucket in your Supabase dashboard.`
          );
        }
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
        if (error.message?.includes('Bucket not found')) {
          throw new Error(
            `Storage bucket '${this.BUCKET_NAME}' not found. Please create the bucket in your Supabase dashboard.`
          );
        }
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
        if (listError.message?.includes('Bucket not found')) {
          throw new Error(
            `Storage bucket '${this.BUCKET_NAME}' not found. Please create the bucket in your Supabase dashboard.`
          );
        }
        throw new Error(handleSupabaseError(listError));
      }

      if (files && files.length > 0) {
        const filePaths = files.map(file => `${userId}/${jobId}/${file.name}`);
        
        const { error: deleteError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .remove(filePaths);

        if (deleteError) {
          if (deleteError.message?.includes('Bucket not found')) {
            throw new Error(
              `Storage bucket '${this.BUCKET_NAME}' not found. Please create the bucket in your Supabase dashboard.`
            );
          }
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
        if (error.message?.includes('Bucket not found')) {
          throw new Error(
            `Storage bucket '${this.BUCKET_NAME}' not found. Please create the bucket in your Supabase dashboard.`
          );
        }
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