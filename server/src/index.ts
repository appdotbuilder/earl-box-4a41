
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import * as fs from 'fs';
import * as path from 'path';

// Import schemas and handlers
import { 
  uploadFileInputSchema, 
  getFileInputSchema,
  type UploadFileResponse,
  type FileStatsResponse,
  type FileRecord 
} from './schema';
import { uploadFile } from './handlers/upload_file';
import { getFile } from './handlers/get_file';
import { getFileStats } from './handlers/get_file_stats';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  // Upload file endpoint
  uploadFile: publicProcedure
    .input(uploadFileInputSchema)
    .mutation(({ input }): Promise<UploadFileResponse> => uploadFile(input)),
  
  // Get file statistics for homepage
  getFileStats: publicProcedure
    .query((): Promise<FileStatsResponse> => getFileStats()),
  
  // Get file metadata (used internally for serving files)
  getFileMetadata: publicProcedure
    .input(getFileInputSchema)
    .query(({ input }): Promise<FileRecord | null> => getFile(input)),
});

export type AppRouter = typeof appRouter;

// Custom file serving middleware
async function serveFile(req: any, res: any, next: any) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // Handle file serving routes like /file/:id
  if (url.pathname.startsWith('/file/')) {
    const fileId = url.pathname.split('/file/')[1];
    
    if (fileId) {
      try {
        // 1. Query the database for the file record using the fileId
        const fileRecord = await getFile({ id: fileId });
        
        if (!fileRecord) {
          // File not found in database
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('File not found');
          return;
        }
        
        // 2. Construct the full file path on the server using file_path from database
        const filePath = path.resolve(fileRecord.file_path);
        
        // 3. Check if the file exists on the filesystem
        if (!fs.existsSync(filePath)) {
          // File exists in database but not on disk
          console.error(`File exists in database but not on disk: ${filePath}`);
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('File not found on server');
          return;
        }
        
        // 4. Set the Content-Type header to the mime_type from database
        const headers: Record<string, string> = {
          'Content-Type': fileRecord.mime_type,
          'Content-Length': fileRecord.file_size.toString(),
          // Add cache headers for better performance
          'Cache-Control': 'public, max-age=31536000', // 1 year
          'ETag': `"${fileRecord.id}"`,
        };
        
        // Handle conditional requests (If-None-Match)
        const clientETag = req.headers['if-none-match'];
        if (clientETag === `"${fileRecord.id}"`) {
          res.writeHead(304);
          res.end();
          return;
        }
        
        // 5. Stream the file content to the client
        res.writeHead(200, headers);
        
        // Create read stream and pipe to response
        const fileStream = fs.createReadStream(filePath);
        
        // Handle stream errors
        fileStream.on('error', (streamError) => {
          console.error('File stream error:', streamError);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal server error');
          }
        });
        
        // Pipe file content to response
        fileStream.pipe(res);
        
      } catch (error) {
        // Handle database errors and other exceptions
        console.error('File serving error:', error);
        
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal server error');
        }
      }
      
      return; // Don't call next() for file serving routes
    }
  }
  
  next();
}

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  
  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      // Apply CORS first
      cors()(req, res, () => {
        // Then apply file serving middleware (handle async)
        serveFile(req, res, next).catch((error) => {
          console.error('File serving middleware error:', error);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal server error');
          }
        });
      });
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  
  server.listen(port);
  console.log(`Earl Box TRPC server listening at port: ${port}`);
}

start();
