import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

// S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "business-management-uploads";

/**
 * Upload file buffer to S3
 * @param buffer - File buffer
 * @param originalName - Original filename
 * @param contentType - MIME type
 * @returns Promise<string> - S3 URL
 */
export async function uploadToS3(
  buffer: Buffer,
  originalName: string,
  contentType: string
): Promise<string> {
  const fileExtension = originalName.split('.').pop() || 'png';
  const key = `logos/${randomUUID()}-${Date.now()}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: "public-read",
  });

  try {
    await s3Client.send(command);
    return `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;
  } catch (error) {
    console.error("S3 upload error:", error);
    throw new Error("Failed to upload file to S3");
  }
}

/**
 * Delete file from S3
 * @param url - S3 URL to delete
 */
export async function deleteFromS3(url: string): Promise<void> {
  try {
    const key = url.split('.amazonaws.com/')[1];
    if (!key) return;

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error("S3 delete error:", error);
    // Don't throw - deletion failures shouldn't break the app
  }
}

/**
 * Fallback: Save file locally for development
 * @param buffer - File buffer
 * @param originalName - Original filename
 * @returns Promise<string> - Local file URL
 */
export async function saveLocally(
  buffer: Buffer,
  originalName: string
): Promise<string> {
  const fs = await import("fs/promises");
  const path = await import("path");
  
  const uploadsDir = path.join(process.cwd(), "uploads", "logos");
  await fs.mkdir(uploadsDir, { recursive: true });
  
  const fileExtension = originalName.split('.').pop() || 'png';
  const filename = `${randomUUID()}-${Date.now()}.${fileExtension}`;
  const filepath = path.join(uploadsDir, filename);
  
  await fs.writeFile(filepath, buffer);
  return `/uploads/logos/${filename}`;
}

/**
 * Upload file with fallback to local storage
 * @param buffer - File buffer
 * @param originalName - Original filename
 * @param contentType - MIME type
 * @returns Promise<string> - File URL
 */
export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  contentType: string
): Promise<string> {
  // Try S3 first, fallback to local storage
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    try {
      return await uploadToS3(buffer, originalName, contentType);
    } catch (error) {
      console.warn("S3 upload failed, falling back to local storage");
    }
  }
  
  return await saveLocally(buffer, originalName);
}