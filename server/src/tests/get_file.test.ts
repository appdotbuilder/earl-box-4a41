
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { filesTable } from '../db/schema';
import { type GetFileInput } from '../schema';
import { getFile } from '../handlers/get_file';

// Test file data
const testFileData = {
  id: 'test-file-123',
  filename: 'server_file_name.txt',
  original_name: 'user_original_name.txt',
  mime_type: 'text/plain',
  file_size: 1024,
  file_path: 'uploads/server_file_name.txt'
};

const testInput: GetFileInput = {
  id: 'test-file-123'
};

describe('getFile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve a file by ID', async () => {
    // Create test file in database
    await db.insert(filesTable)
      .values(testFileData)
      .execute();

    const result = await getFile(testInput);

    expect(result).toBeDefined();
    expect(result!.id).toEqual('test-file-123');
    expect(result!.filename).toEqual('server_file_name.txt');
    expect(result!.original_name).toEqual('user_original_name.txt');
    expect(result!.mime_type).toEqual('text/plain');
    expect(result!.file_size).toEqual(1024);
    expect(result!.file_path).toEqual('uploads/server_file_name.txt');
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent file', async () => {
    const nonExistentInput: GetFileInput = {
      id: 'non-existent-file-id'
    };

    const result = await getFile(nonExistentInput);

    expect(result).toBeNull();
  });

  it('should return correct file when multiple files exist', async () => {
    // Create multiple test files
    await db.insert(filesTable)
      .values([
        testFileData,
        {
          id: 'other-file-456',
          filename: 'other_file.jpg',
          original_name: 'other_original.jpg',
          mime_type: 'image/jpeg',
          file_size: 2048,
          file_path: 'uploads/other_file.jpg'
        }
      ])
      .execute();

    const result = await getFile(testInput);

    expect(result).toBeDefined();
    expect(result!.id).toEqual('test-file-123');
    expect(result!.filename).toEqual('server_file_name.txt');
    expect(result!.mime_type).toEqual('text/plain');
  });
});
