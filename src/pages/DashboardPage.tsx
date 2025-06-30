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

interface ParsedConversation {
  id?: string;
  title?: string;
  create_time?: number;
  mapping?: { [id: string]: any };
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());
  
  // New state for conversation selection
  const [parsedConversations, setParsedConversations] = useState<ParsedConversation[]>([]);
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

  const parseConversationFile = (file: File): Promise<ParsedConversation[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          let parsed = JSON.parse(text);
          
          // Handle different JSON structures
          if (!Array.isArray(parsed)) {
            // Look for an array within the object
            const potentialArray = Object.values(parsed).find(value => Array.isArray(value));
            if (potentialArray && Array.isArray(potentialArray)) {
              parsed = potentialArray;
            } else {
              throw new Error('JSON file does not contain a conversation array');
            }
          }
          
          if (!Array.isArray(parsed) || parsed.length === 0) {
            throw new Error('No conversations found in the file');
          }
          
          resolve(parsed as ParsedConversation[]);
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) return;

    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Please upload a JSON file');
      return;
    }

    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      toast.error('File size must be less than 100MB');
      return;
    }

    setUploading(true);

    try {
      // Parse the file to extract conversations
      const conversations = await parseConversationFile(file);
      
      if (conversations.length === 0) {
        throw new Error('No conversations found in the file');
      }

      // Store parsed data and show selection modal
      setParsedConversations(conversations);
      setOriginalFilename(file.name);
      setIsSelectionModalOpen(true);
      
      toast.success(`Found ${conversations.length} conversations. Select which ones to upload.`);
    } catch (error) {
      console.error('Parse error:', error);
      toast.error(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  }, [user]);

  const handleUploadSelectedConversations = async (selectedConversations: ParsedConversation[], filename: string) => {
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
    accept: {
      'application/json': ['.json']
    },
    maxFiles: 1,
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
          Upload your ChatGPT conversations.json file to generate insights about your communication patterns.
        </p>
      </div>

      {/* Upload Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Upload Conversations</CardTitle>
          <CardDescription>
            Upload your ChatGPT conversations.json file. You'll be able to select which conversations to analyze.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>New:</strong> After uploading, you can select which conversations to analyze. 
              This helps manage large files and ensures optimal processing performance.
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
              <p className="text-lg">Drop your conversations.json file here...</p>
            ) : (
              <div>
                <p className="text-lg mb-2">Drag & drop your conversations.json file here</p>
                <p className="text-muted-foreground mb-4">or click to browse files</p>
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