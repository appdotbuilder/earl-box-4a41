
import { db } from '../db';
import { filesTable } from '../db/schema';
import { count, sum } from 'drizzle-orm';
import { type FileStatsResponse } from '../schema';

export async function getFileStats(): Promise<FileStatsResponse> {
  try {
    // Query database for file statistics
    const stats = await db.select({
      total_files: count(),
      total_size: sum(filesTable.file_size)
    })
    .from(filesTable)
    .execute();

    const result = stats[0];
    
    return {
      total_files: result.total_files || 0,
      total_size: result.total_size ? Number(result.total_size) : 0
    };
  } catch (error) {
    console.error('Get file stats error:', error);
    throw error;
  }
}
