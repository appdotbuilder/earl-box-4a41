
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { filesTable } from '../db/schema';
import { type UploadFileInput } from '../schema';
import { uploadFile } from '../handlers/upload_file';
import { eq, sql } from 'drizzle-orm';
import * as fs from 'fs/promises';
import * as path from 'path';

const testFileData = Buffer.from('test file content').toString('base64');

const testInput: UploadFileInput = {
  filename: 'test-file.txt',
  original_name: 'test-file.txt',
  mime_type: 'text/plain',
  file_size: 17, // Length of 'test file content'
  file_data: testFileData
};

describe('uploadFile', () => {
  beforeEach(createDB);
  afterEach(async () => {
    // Clean up test files
    try {
      const files = await fs.readdir('uploads');
      for (const file of files) {
        await fs.unlink(path.join('uploads', file));
      }
    } catch (error) {
      // Directory might not exist, ignore
    }
    await resetDB();
  });

  it('should upload a file successfully', async () => {
    const result = await uploadFile(testInput);

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.id).not.toBe('');
    expect(result.filename).toMatch(/^[0-9a-f-]+\.txt$/); // UUID + extension
    expect(result.download_url).toBe(`/file/${result.id}`);
  });

  it('should save file to filesystem', async () => {
    const result = await uploadFile(testInput);

    expect(result.success).toBe(true);
    
    // Check file exists on filesystem
    const filePath = path.join('uploads', result.filename);
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);
    
    // Check file content
    const savedContent = await fs.readFile(filePath, 'utf8');
    expect(savedContent).toBe('test file content');
  });

  it('should save file metadata to database', async () => {
    const result = await uploadFile(testInput);

    expect(result.success).toBe(true);
    
    // Query database for file record
    const files = await db.select()
      .from(filesTable)
      .where(eq(filesTable.id, result.id))
      .execute();

    expect(files).toHaveLength(1);
    const file = files[0];
    expect(file.id).toBe(result.id);
    expect(file.filename).toBe(result.filename);
    expect(file.original_name).toBe(testInput.original_name);
    expect(file.mime_type).toBe(testInput.mime_type);
    expect(file.file_size).toBe(testInput.file_size);
    expect(file.file_path).toBe(path.join('uploads', result.filename));
    expect(file.created_at).toBeInstanceOf(Date);
  });

  it('should handle files with different extensions', async () => {
    const pdfInput: UploadFileInput = {
      filename: 'document.pdf',
      original_name: 'document.pdf',
      mime_type: 'application/pdf',
      file_size: 1024,
      file_data: Buffer.from('fake pdf content').toString('base64')
    };

    const result = await uploadFile(pdfInput);

    expect(result.success).toBe(true);
    expect(result.filename).toMatch(/^[0-9a-f-]+\.pdf$/);
    
    // Verify database record
    const files = await db.select()
      .from(filesTable)
      .where(eq(filesTable.id, result.id))
      .execute();

    expect(files[0].mime_type).toBe('application/pdf');
  });

  it('should handle files without extensions', async () => {
    const noExtInput: UploadFileInput = {
      filename: 'README',
      original_name: 'README',
      mime_type: 'text/plain',
      file_size: 100,
      file_data: Buffer.from('readme content').toString('base64')
    };

    const result = await uploadFile(noExtInput);

    expect(result.success).toBe(true);
    expect(result.filename).toMatch(/^[0-9a-f-]+$/); // UUID without extension
  });

  it('should clean up file if database insert fails', async () => {
    // First, let's break the database by dropping the table
    await db.execute(sql`DROP TABLE files CASCADE`);
    
    const result = await uploadFile(testInput);

    // Should return failure
    expect(result.success).toBe(false);
    expect(result.id).toBe('');
    expect(result.filename).toBe('');
    expect(result.download_url).toBe('');
    
    // File should not exist on filesystem (cleaned up)
    try {
      const files = await fs.readdir('uploads');
      expect(files).toHaveLength(0);
    } catch (error) {
      // uploads directory might not exist, which is also fine
    }
  });
});
