
import { text, pgTable, timestamp, integer } from 'drizzle-orm/pg-core';

export const filesTable = pgTable('files', {
  id: text('id').primaryKey(), // UUID as primary key
  filename: text('filename').notNull(), // Unique server filename
  original_name: text('original_name').notNull(), // User's original filename
  mime_type: text('mime_type').notNull(), // MIME type for proper content serving
  file_size: integer('file_size').notNull(), // File size in bytes
  file_path: text('file_path').notNull(), // Server storage path
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// TypeScript types for the table schema
export type FileRecord = typeof filesTable.$inferSelect; // For SELECT operations
export type NewFileRecord = typeof filesTable.$inferInsert; // For INSERT operations

// Export all tables for proper query building
export const tables = { files: filesTable };
