
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { filesTable } from '../db/schema';
import { getFileStats } from '../handlers/get_file_stats';

describe('getFileStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats when no files exist', async () => {
    const result = await getFileStats();

    expect(result.total_files).toEqual(0);
    expect(result.total_size).toEqual(0);
  });

  it('should return correct stats for single file', async () => {
    // Create test file
    await db.insert(filesTable).values({
      id: 'test-id-1',
      filename: 'test-file.txt',
      original_name: 'original.txt',
      mime_type: 'text/plain',
      file_size: 1024,
      file_path: '/uploads/test-file.txt'
    }).execute();

    const result = await getFileStats();

    expect(result.total_files).toEqual(1);
    expect(result.total_size).toEqual(1024);
  });

  it('should return correct stats for multiple files', async () => {
    // Create multiple test files
    const files = [
      {
        id: 'test-id-1',
        filename: 'file1.txt',
        original_name: 'document1.txt',
        mime_type: 'text/plain',
        file_size: 500,
        file_path: '/uploads/file1.txt'
      },
      {
        id: 'test-id-2',
        filename: 'file2.jpg',
        original_name: 'image.jpg',
        mime_type: 'image/jpeg',
        file_size: 2048,
        file_path: '/uploads/file2.jpg'
      },
      {
        id: 'test-id-3',
        filename: 'file3.pdf',
        original_name: 'document.pdf',
        mime_type: 'application/pdf',
        file_size: 1536,
        file_path: '/uploads/file3.pdf'
      }
    ];

    for (const file of files) {
      await db.insert(filesTable).values(file).execute();
    }

    const result = await getFileStats();

    expect(result.total_files).toEqual(3);
    expect(result.total_size).toEqual(4084); // 500 + 2048 + 1536
  });

  it('should handle large file sizes correctly', async () => {
    // Create file with large size (close to 200MB limit)
    const largeFileSize = 200 * 1024 * 1024 - 1; // Just under 200MB

    await db.insert(filesTable).values({
      id: 'test-large-id',
      filename: 'large-file.zip',
      original_name: 'archive.zip',
      mime_type: 'application/zip',
      file_size: largeFileSize,
      file_path: '/uploads/large-file.zip'
    }).execute();

    const result = await getFileStats();

    expect(result.total_files).toEqual(1);
    expect(result.total_size).toEqual(largeFileSize);
    expect(typeof result.total_size).toBe('number');
  });
});
