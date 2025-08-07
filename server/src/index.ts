
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
function serveFile(req: any, res: any, next: any) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // Handle file serving routes like /file/:id
  if (url.pathname.startsWith('/file/')) {
    const fileId = url.pathname.split('/file/')[1];
    
    if (fileId) {
      // TODO: Implement actual file serving logic
      // 1. Get file metadata from database using fileId
      // 2. Check if file exists on disk
      // 3. Set proper content-type header based on mime_type
      // 4. Stream file content to response
      
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('File serving not yet implemented');
      return;
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
        // Then apply file serving middleware
        serveFile(req, res, next);
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
