import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * CloudStorageService handles file operations with Google Cloud Storage
 */
export class CloudStorageService {
  private storage: Storage;
  private bucket: string;
  private projectId: string;

  constructor() {
    // Check if required environment variables are set
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || '';
    this.bucket = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || '';
    
    if (!this.projectId || !this.bucket) {
      console.error('Missing GCS environment variables: GOOGLE_CLOUD_PROJECT_ID or GOOGLE_CLOUD_STORAGE_BUCKET');
    }

    // Get credentials from environment variable
    let credentials = null;
    try {
      if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
        credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
      }
    } catch (error) {
      console.error('Error parsing Google Cloud credentials:', error);
    }

    // Initialize storage with credentials
    this.storage = new Storage({
      projectId: this.projectId,
      credentials: credentials
    });
  }

  /**
   * Upload a file to Google Cloud Storage
   * @param filePath Local path to the file to upload
   * @param options Upload options including destination folder and contentType
   * @returns URL to the uploaded file
   */
  async uploadFile(
    filePath: string, 
    options: { 
      folder?: string, 
      contentType?: string,
      filename?: string
    } = {}
  ): Promise<string> {
    try {
      // Generate a unique filename if not provided
      const originalFilename = options.filename || path.basename(filePath);
      const extension = path.extname(originalFilename);
      const filename = options.filename || `${uuidv4()}${extension}`;
      
      // Set destination path including folder if specified
      const destination = options.folder ? `${options.folder}/${filename}` : filename;
      
      // Upload file
      await this.storage.bucket(this.bucket).upload(filePath, {
        destination,
        metadata: {
          contentType: options.contentType || this.getContentType(filePath),
        },
      });

      // Make the file public (optional - can be removed for private files)
      await this.storage.bucket(this.bucket).file(destination).makePublic();

      // Return public URL
      return `https://storage.googleapis.com/${this.bucket}/${destination}`;
    } catch (error) {
      console.error('Error uploading file to Google Cloud Storage:', error);
      throw error;
    }
  }

  /**
   * Upload a buffer to Google Cloud Storage
   * @param buffer The file buffer to upload
   * @param options Upload options including destination folder, filename, and contentType
   * @returns URL to the uploaded file
   */
  async uploadBuffer(
    buffer: Buffer,
    options: {
      folder?: string,
      filename: string,
      contentType: string
    }
  ): Promise<string> {
    try {
      if (!options.filename) {
        throw new Error('Filename is required for buffer uploads');
      }

      const destination = options.folder ? `${options.folder}/${options.filename}` : options.filename;
      
      const file = this.storage.bucket(this.bucket).file(destination);
      
      await file.save(buffer, {
        metadata: {
          contentType: options.contentType
        }
      });
      
      // Make the file public (optional - can be removed for private files)
      await file.makePublic();
      
      // Return public URL
      return `https://storage.googleapis.com/${this.bucket}/${destination}`;
    } catch (error) {
      console.error('Error uploading buffer to Google Cloud Storage:', error);
      throw error;
    }
  }

  /**
   * Delete a file from Google Cloud Storage
   * @param fileUrl The URL or path of the file to delete
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract file path from URL if necessary
      let filePath = fileUrl;
      if (fileUrl.includes(`https://storage.googleapis.com/${this.bucket}/`)) {
        filePath = fileUrl.replace(`https://storage.googleapis.com/${this.bucket}/`, '');
      }
      
      await this.storage.bucket(this.bucket).file(filePath).delete();
    } catch (error) {
      console.error('Error deleting file from Google Cloud Storage:', error);
      throw error;
    }
  }

  /**
   * Generate a signed URL for temporary access to a file
   * @param filePath Path to the file in the bucket
   * @param expiresInMinutes How long the signed URL should be valid (default: 15 minutes)
   * @returns Signed URL for the file
   */
  async getSignedUrl(filePath: string, expiresInMinutes = 15): Promise<string> {
    try {
      const options = {
        version: 'v4' as const,
        action: 'read' as const,
        expires: Date.now() + expiresInMinutes * 60 * 1000,
      };

      // Get a signed URL for the file
      const [url] = await this.storage
        .bucket(this.bucket)
        .file(filePath)
        .getSignedUrl(options);

      return url;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  }

  /**
   * Check if a file exists in the bucket
   * @param filePath Path to the file in the bucket
   * @returns Boolean indicating if the file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      const [exists] = await this.storage.bucket(this.bucket).file(filePath).exists();
      return exists;
    } catch (error) {
      console.error('Error checking if file exists:', error);
      return false;
    }
  }

  /**
   * Create daily database backup and store in GCS
   * @param dbName Name of the database
   * @returns URL to the uploaded backup file
   */
  async createDatabaseBackup(dbName: string): Promise<string> {
    try {
      const date = new Date();
      const dateString = date.toISOString().split('T')[0];
      const tempFilePath = path.join('/tmp', `${dbName}_${dateString}.sql`);
      
      // Command to create database dump
      const command = `pg_dump ${process.env.DATABASE_URL} > ${tempFilePath}`;
      
      // Execute the dump command
      const { exec } = require('child_process');
      await new Promise((resolve, reject) => {
        exec(command, (error: Error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(null);
        });
      });
      
      // Upload the backup file to GCS
      const backupUrl = await this.uploadFile(tempFilePath, {
        folder: 'database-backups',
        filename: `${dbName}_${dateString}.sql`,
        contentType: 'application/sql'
      });
      
      // Clean up temp file
      fs.unlinkSync(tempFilePath);
      
      return backupUrl;
    } catch (error) {
      console.error('Error creating database backup:', error);
      throw error;
    }
  }

  /**
   * Determine content type based on file extension
   * @param filePath Path to the file
   * @returns Content type
   */
  private getContentType(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();
    const contentTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.zip': 'application/zip',
      '.svg': 'image/svg+xml',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.sql': 'application/sql',
    };
    
    return contentTypes[extension] || 'application/octet-stream';
  }
}

// Export singleton instance
export const cloudStorage = new CloudStorageService();