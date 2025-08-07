
import { db } from '../db';
import { filesTable } from '../db/schema';
import { type GetFileInput, type FileRecord } from '../schema';
import { eq } from 'drizzle-orm';

export const getFile = async (input: GetFileInput): Promise<FileRecord | null> => {
  try {
    // Query database for file record by ID
    const result = await db.select()
      .from(filesTable)
      .where(eq(filesTable.id, input.id))
      .limit(1)
      .execute();

    // Return the file record if found, otherwise null
    return result[0] || null;
  } catch (error) {
    console.error('Get file failed:', error);
    throw error;
  }
};
