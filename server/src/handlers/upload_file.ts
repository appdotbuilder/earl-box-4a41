
import { db } from '../db';
import { filesTable } from '../db/schema';
import { type UploadFileInput, type UploadFileResponse } from '../schema';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';

export async function uploadFile(input: UploadFileInput): Promise<UploadFileResponse> {
    const fileId = randomUUID();
    const fileExtension = path.extname(input.original_name);
    const serverFilename = `${fileId}${fileExtension}`;
    const storagePath = path.join('uploads', serverFilename);
    
    try {
        // Ensure uploads directory exists
        await fs.mkdir('uploads', { recursive: true });
        
        // Decode and save file
        const fileBuffer = Buffer.from(input.file_data, 'base64');
        await fs.writeFile(storagePath, fileBuffer);
        
        // Insert file record into database
        await db.insert(filesTable).values({
            id: fileId,
            filename: serverFilename,
            original_name: input.original_name,
            mime_type: input.mime_type,
            file_size: input.file_size,
            file_path: storagePath
        }).execute();
        
        return {
            id: fileId,
            filename: serverFilename,
            download_url: `/file/${fileId}`,
            success: true
        };
    } catch (error) {
        console.error('File upload error:', error);
        
        // Clean up file if database insert failed
        try {
            await fs.unlink(storagePath);
        } catch (cleanupError) {
            console.error('Failed to clean up file after error:', cleanupError);
        }
        
        return {
            id: '',
            filename: '',
            download_url: '',
            success: false
        };
    }
}
