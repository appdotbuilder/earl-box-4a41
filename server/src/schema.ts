
import { z } from 'zod';

// File schema for database records
export const fileSchema = z.object({
  id: z.string(), // UUID for unique file identification
  filename: z.string(),
  original_name: z.string(),
  mime_type: z.string(),
  file_size: z.number().int(), // Size in bytes
  file_path: z.string(), // Server storage path
  created_at: z.coerce.date()
});

export type FileRecord = z.infer<typeof fileSchema>;

// Input schema for file upload
export const uploadFileInputSchema = z.object({
  filename: z.string(),
  original_name: z.string(),
  mime_type: z.string(),
  file_size: z.number().int().max(200 * 1024 * 1024), // 200MB limit
  file_data: z.string() // Base64 encoded file data
});

export type UploadFileInput = z.infer<typeof uploadFileInputSchema>;

// Response schema for file upload
export const uploadFileResponseSchema = z.object({
  id: z.string(),
  filename: z.string(),
  download_url: z.string(),
  success: z.boolean()
});

export type UploadFileResponse = z.infer<typeof uploadFileResponseSchema>;

// Response schema for file stats
export const fileStatsResponseSchema = z.object({
  total_files: z.number().int(),
  total_size: z.number().int() // Total size in bytes
});

export type FileStatsResponse = z.infer<typeof fileStatsResponseSchema>;

// Input schema for getting file by ID
export const getFileInputSchema = z.object({
  id: z.string()
});

export type GetFileInput = z.infer<typeof getFileInputSchema>;
