
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { UploadFileResponse, FileStatsResponse } from '../../server/src/schema';

function App() {
  const [stats, setStats] = useState<FileStatsResponse>({ total_files: 0, total_size: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadFileResponse | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showCopyAlert, setShowCopyAlert] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStats = useCallback(async () => {
    try {
      const result = await trpc.getFileStats.query();
      setStats(result);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileChange = async (file: File) => {
    if (!file) return;

    // Check file size (200MB limit)
    if (file.size > 200 * 1024 * 1024) {
      alert('⚠️ File too large! Maximum size is 200MB.');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1]; // Remove data:type;base64, prefix

        try {
          const result = await trpc.uploadFile.mutate({
            filename: file.name,
            original_name: file.name,
            mime_type: file.type || 'application/octet-stream',
            file_size: file.size,
            file_data: base64Data
          });

          setUploadResult(result);
          if (result.success) {
            await loadStats(); // Refresh stats after successful upload
          }
        } catch (error) {
          console.error('Upload failed:', error);
          setUploadResult({
            id: '',
            filename: '',
            download_url: '',
            success: false
          });
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File read error:', error);
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileChange(files[0]);
    }
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShowCopyAlert(true);
      setTimeout(() => setShowCopyAlert(false), 3000);
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setShowCopyAlert(true);
      setTimeout(() => setShowCopyAlert(false), 3000);
    }
  };

  const getFullUrl = (path: string) => {
    return `${window.location.origin}${path}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-4xl font-bold text-purple-700 mb-2">
            📦 Earl Box
          </h1>
          <p className="text-gray-600">Share your files with ease! ✨</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="border-purple-200 bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                📁 Total Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats.total_files.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="border-pink-200 bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                💾 Total Storage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-pink-600">
                {formatFileSize(stats.total_size)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upload Area */}
        <Card className="mb-8 border-2 border-dashed border-purple-300 bg-white/70 backdrop-blur-sm">
          <CardContent className="p-8">
            <div
              className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 ${
                dragActive
                  ? 'border-purple-400 bg-purple-50 scale-105'
                  : isUploading
                  ? 'border-orange-300 bg-orange-50'
                  : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/50'
              }`}
              onDragEnter={handleDragIn}
              onDragLeave={handleDragOut}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleInputChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />

              <div className="space-y-4">
                {isUploading ? (
                  <div className="animate-pulse">
                    <div className="text-6xl mb-4">⏳</div>
                    <div className="text-xl font-semibold text-orange-600">
                      Uploading your file...
                    </div>
                    <div className="text-gray-500">Please wait a moment</div>
                  </div>
                ) : (
                  <>
                    <div className="text-6xl mb-4">
                      {dragActive ? '🎯' : '📤'}
                    </div>
                    <div className="text-xl font-semibold text-gray-700">
                      {dragActive
                        ? 'Drop your file here!'
                        : 'Drag & drop a file or click to browse'}
                    </div>
                    <div className="text-gray-500">
                      Maximum file size: <Badge variant="secondary">200MB</Badge>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Result */}
        {uploadResult && (
          <Card className="mb-8 border-green-200 bg-white/70 backdrop-blur-sm">
            <CardContent className="p-6">
              {uploadResult.success ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600 font-semibold">
                    ✅ Upload Successful!
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      🔗 Your file link:
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={getFullUrl(uploadResult.download_url)}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        onClick={() => copyToClipboard(getFullUrl(uploadResult.download_url))}
                        variant="outline"
                        size="sm"
                        className="whitespace-nowrap"
                      >
                        📋 Copy
                      </Button>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">
                    💡 Click the link to view your file directly in the browser!
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600 font-semibold">
                  ❌ Upload failed. Please try again.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Copy Success Alert */}
        {showCopyAlert && (
          <div className="fixed top-4 right-4 z-50">
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <AlertDescription className="flex items-center gap-2">
                ✅ Link copied to clipboard!
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center py-8 text-gray-600">
          Created by <span className="font-semibold text-purple-600">Earl Store</span>❤️
        </footer>
      </div>
    </div>
  );
}

export default App;
