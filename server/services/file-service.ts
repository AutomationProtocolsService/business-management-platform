import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logger';

/**
 * Service for handling file operations
 */
class FileServiceImpl {
  private readonly uploadDir: string = path.join(process.cwd(), 'uploads');
  
  constructor() {
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      logger.info(`Created uploads directory at ${this.uploadDir}`);
    }
  }
  
  /**
   * Save a file to the uploads directory
   * @param file The file buffer
   * @param filename Original filename
   * @param tenantId Optional tenant ID for isolation
   * @returns File metadata
   */
  async saveFile(file: Buffer, filename: string, tenantId?: number): Promise<{ 
    id: string; 
    originalName: string; 
    path: string; 
    size: number;
    mimetype: string;
    tenantId?: number;
  }> {
    try {
      // Generate a unique filename
      const id = uuidv4();
      const ext = path.extname(filename);
      const newFilename = `${id}${ext}`;
      
      // Define tenant directory if needed
      let filePath = this.uploadDir;
      if (tenantId) {
        filePath = path.join(this.uploadDir, `tenant-${tenantId}`);
        if (!fs.existsSync(filePath)) {
          fs.mkdirSync(filePath, { recursive: true });
        }
      }
      
      // Full path to save file
      const fullPath = path.join(filePath, newFilename);
      
      // Save the file
      await fs.promises.writeFile(fullPath, file);
      
      // Get file metadata
      const stats = await fs.promises.stat(fullPath);
      
      // Determine mimetype based on extension
      const mimeTypes: { [key: string]: string } = {
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
      };
      
      return {
        id,
        originalName: filename,
        path: fullPath,
        size: stats.size,
        mimetype: mimeTypes[ext.toLowerCase()] || 'application/octet-stream',
        tenantId
      };
    } catch (error) {
      logger.error(`Error saving file ${filename}:`, error);
      throw error;
    }
  }
  
  /**
   * Get a file from the uploads directory
   * @param fileId The file ID
   * @param tenantId Optional tenant ID for isolation
   * @returns File buffer and metadata
   */
  async getFile(fileId: string, tenantId?: number): Promise<{ 
    buffer: Buffer; 
    originalName: string; 
    mimetype: string;
  } | null> {
    try {
      // Determine directory path
      let dirPath = this.uploadDir;
      if (tenantId) {
        dirPath = path.join(this.uploadDir, `tenant-${tenantId}`);
      }
      
      // Find the file in the directory
      const files = await fs.promises.readdir(dirPath);
      const file = files.find(f => f.startsWith(fileId));
      
      if (!file) {
        logger.warn(`File with ID ${fileId} not found for tenant ${tenantId || 'none'}`);
        return null;
      }
      
      // Read the file
      const filePath = path.join(dirPath, file);
      const buffer = await fs.promises.readFile(filePath);
      
      // Get extension for mimetype
      const ext = path.extname(file);
      const mimeTypes: { [key: string]: string } = {
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
      };
      
      return {
        buffer,
        originalName: file,
        mimetype: mimeTypes[ext.toLowerCase()] || 'application/octet-stream',
      };
    } catch (error) {
      logger.error(`Error getting file ${fileId}:`, error);
      return null;
    }
  }
  
  /**
   * Delete a file from the uploads directory
   * @param fileId The file ID
   * @param tenantId Optional tenant ID for isolation
   * @returns Success status
   */
  async deleteFile(fileId: string, tenantId?: number): Promise<boolean> {
    try {
      // Determine directory path
      let dirPath = this.uploadDir;
      if (tenantId) {
        dirPath = path.join(this.uploadDir, `tenant-${tenantId}`);
      }
      
      // Find the file in the directory
      const files = await fs.promises.readdir(dirPath);
      const file = files.find(f => f.startsWith(fileId));
      
      if (!file) {
        logger.warn(`File with ID ${fileId} not found for deletion`);
        return false;
      }
      
      // Delete the file
      const filePath = path.join(dirPath, file);
      await fs.promises.unlink(filePath);
      
      logger.info(`Deleted file ${fileId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting file ${fileId}:`, error);
      return false;
    }
  }
}

// Export a singleton instance
const FileService = new FileServiceImpl();
export default FileService;