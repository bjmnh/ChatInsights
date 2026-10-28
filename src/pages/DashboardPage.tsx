import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDropzone } from 'react-dropzone';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  Upload, 
  FileText, 
  Trash2,
  BarChart3,
  Crown,
  Loader2,
  MessageSquare,
  Calendar,
  HardDrive,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { FileService, type UploadedFile } from '../services/fileService';
import ConversationSelector from '../components/ConversationSelector';
import {
  describeDetectedFormat,
  parseConversationExport,
  validateUploadFile,
  type NormalizedConversation,
} from '../lib/conversationParser';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());
  
  // New state for conversation selection
  const [parsedConversations, setParsedConversations] = useState<NormalizedConversation[]>([]);
  const [originalFilename, setOriginalFilename] = useState<string>('');
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchFiles();
  }, [user, navigate]);

  const fetchFiles = async () => {
    try {
      const userFiles = await FileService.getUserFiles(user!.id);
      setFiles(userFiles);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) return;

    const file = acceptedFiles[0];
    if (!file) return;

    const validationError = validateUploadFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setUploading(true);

    try {
      const parsed = await parseConversationExport(file.name, new Uint8Array(await file.arrayBuffer()));

      if (parsed.conversations.length === 0) {
        throw new Error('No conversations found in the file');
      }

      setParsedConversations(parsed.conversations);
      setOriginalFilename(file.name);
      setIsSelectionModalOpen(true);

      toast.success(`Found ${parsed.conversations.length} conversations in ${describeDetectedFormat(parsed.format)}. Select which ones to upload.`);
      parsed.warnings.forEach((warning) => toast.message(warning));
    } catch (error) {
      console.error('Parse error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to parse file', { duration: 8000 });
    } finally {
      setUploading(false);
    }
  }, [user]);

  const handleUploadSelectedConversations = async (selectedConversations: NormalizedConversation[], filename: string) => {
    if (!user) return;

    try {
      const uploadedFile = await FileService.uploadSelectedConversations(
        selectedConversations, 
        user.id, 
        filename
      );
      
      setFiles(prev => [uploadedFile, ...prev]);
      
      // Reset selection state
      setParsedConversations([]);
      setOriginalFilename('');
    } catch (error) {
      console.error('Upload error:', error);
      throw error; // Re-throw to be handled by ConversationSelector
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected: (rejections) => {
      const tooBig = rejections.some((rejection) => rejection.errors.some((error) => error.code === 'file-too-large'));
      toast.error(tooBig
        ? 'File size must be less than 100MB.'
        : 'That file type is not supported. Upload a .json, .jsonl, .zip, .md, .txt, .csv, or Gemini .html export.');
    },
    accept: {
      'application/json': ['.json'],
      'application/x-ndjson': ['.jsonl'],
      'application/jsonl': ['.jsonl'],
      'text/plain': ['.txt', '.jsonl', '.md', '.csv'],
      'text/markdown': ['.md', '.markdown'],
      'text/csv': ['.csv'],
      'application/csv': ['.csv'],
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip'],
      'text/html': ['.html', '.htm'],
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024,
    disabled: uploading
  });

  const handleDeleteFile = async (fileId: string) => {
    try {
      await FileService.deleteFile(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete file');
    }
  };

  const handleGenerateReport = async (fileId: string, reportType: 'basic' | 'premium') => {
    setProcessingFiles(prev => new Set(prev).add(fileId));
    
    try {
      if (reportType === 'basic') {
        await FileService.generateBasicReport(fileId);
        toast.success('Basic report generated!');
      } else {
        await FileService.generatePremiumReport(fileId);
        toast.success('Premium report generated!');
      }
      
      // Refresh files to update button states
      await fetchFiles();
    } catch (error) {
      console.error('Report generation error:', error);
      toast.error(`Failed to generate ${reportType} report`);
    } finally {
      setProcessingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  };

  const handleViewReport = async (fileId: string, reportType: 'basic' | 'premium') => {
    navigate(`/report/${fileId}/${reportType}`);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Conversation Analysis Dashboard</h1>
        <p className="text-muted-foreground">
          Upload a conversation export from any AI assistant to generate insights about your communication patterns.
        </p>
      </div>

      {/* Upload Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Upload Conversations</CardTitle>
          <CardDescription>
            Upload an export from ChatGPT, Claude, Gemini, Grok, Copilot, Perplexity, Mistral, DeepSeek, Cursor, or another LLM. You'll be able to select which conversations to analyze.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              JSON, JSONL, Markdown, plain text, CSV, HTML, or a ZIP of those files. Up to 100MB.
              After uploading, choose which conversations to analyze.
            </AlertDescription>
          </Alert>
          
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : uploading
                ? 'border-muted-foreground/25 bg-muted/50 cursor-not-allowed'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <Loader2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-spin" />
            ) : (
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            )}
            {uploading ? (
              <p className="text-lg">Processing your file...</p>
            ) : isDragActive ? (
              <p className="text-lg">Drop your conversation export here...</p>
            ) : (
              <div>
                <p className="text-lg mb-2">Drag & drop your conversation export here</p>
                <p className="text-muted-foreground mb-4">.json, .jsonl, .zip, .md, .txt, .csv, or .html</p>
                <Button variant="outline" disabled={uploading}>
                  <FileText className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Files Section */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Conversations</CardTitle>
          <CardDescription>
            Manage your uploaded files and generate analysis reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No files uploaded yet. Upload your first conversation file to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">{file.filename}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <HardDrive className="h-3 w-3 mr-1" />
                          {formatFileSize(file.file_size)}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(file.uploaded_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Basic Report Button */}
                    {file.has_basic_report ? (
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReport(file.id, 'basic')}
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View Basic Report
                      </Button>
                    ) : (
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateReport(file.id, 'basic')}
                        disabled={processingFiles.has(file.id)}
                      >
                        {processingFiles.has(file.id) ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <BarChart3 className="h-4 w-4 mr-2" />
                        )}
                        Run Basic Report
                      </Button>
                    )}

                    {/* Premium Report Button */}
                    {file.has_premium_report ? (
                      <Button 
                        size="sm"
                        onClick={() => handleViewReport(file.id, 'premium')}
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        View Premium Report
                      </Button>
                    ) : (
                      <Button 
                        size="sm"
                        onClick={() => handleGenerateReport(file.id, 'premium')}
                        disabled={processingFiles.has(file.id)}
                      >
                        {processingFiles.has(file.id) ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Crown className="h-4 w-4 mr-2" />
                        )}
                        Run Premium Report
                      </Button>
                    )}

                    {/* Delete Button */}
                    <Button 
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteFile(file.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversation Selection Modal */}
      <ConversationSelector
        isOpen={isSelectionModalOpen}
        onClose={() => setIsSelectionModalOpen(false)}
        conversations={parsedConversations}
        originalFilename={originalFilename}
        onUploadSelected={handleUploadSelectedConversations}
      />
    </div>
  );
};

export default DashboardPage;