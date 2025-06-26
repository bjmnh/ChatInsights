import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDropzone } from 'react-dropzone';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  Upload, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Crown,
  BarChart3,
  MessageSquare,
  TrendingUp,
  Users,
  Loader2,
  Shield,
  Lock,
  Target,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { JobService } from '../services/jobService';
import { StorageService } from '../services/storageService';
import { StripeService } from '../services/stripeService';
import type { Database } from '../lib/database.types';

type Job = Database['public']['Tables']['jobs']['Row'];

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  // Fetch user jobs and order data
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchData = async () => {
      try {
        const [userJobs, ordersData] = await Promise.all([
          JobService.getUserJobs(user.id),
          StripeService.getUserOrders(),
        ]);
        
        setJobs(userJobs);
        setOrders(ordersData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  // Subscribe to job updates for real-time progress
  useEffect(() => {
    const subscriptions: (() => void)[] = [];

    jobs.forEach(job => {
      if (job.status === 'uploading' || job.status === 'processing') {
        const unsubscribe = JobService.subscribeToJobUpdates(job.id, (updatedJob) => {
          console.log('Received job update:', updatedJob);
          
          setJobs(prevJobs => 
            prevJobs.map(j => j.id === updatedJob.id ? updatedJob : j)
          );

          // Show completion notification
          if (updatedJob.status === 'completed' && job.status !== 'completed') {
            toast.success('Analysis completed!');
          } else if (updatedJob.status === 'failed' && job.status !== 'failed') {
            toast.error('Analysis failed. Please try again.');
          }
        });
        subscriptions.push(unsubscribe);
      }
    });

    return () => {
      subscriptions.forEach(unsubscribe => unsubscribe());
    };
  }, [jobs]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) return;

    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Please upload a JSON file');
      return;
    }

    if (file.size > 500 * 1024 * 1024) { // 500MB limit
      toast.error('File size must be less than 500MB');
      return;
    }

    setUploading(true);

    try {
      // Create job record first
      const newJob = await JobService.createJob({
        user_id: user.id,
        filename: file.name,
        status: 'uploading',
        progress: 0
      });

      // Add to local state immediately
      setJobs(prev => [newJob, ...prev]);

      // Upload file to storage with proper path structure
      const filePath = await StorageService.uploadFile(file, user.id, newJob.id);
      console.log('File uploaded to:', filePath);
      
      // Update job status to processing and start processing
      await JobService.updateJobStatus(newJob.id, 'processing', null, null, null);

      toast.success('File uploaded successfully! Starting analysis...');

      // Start processing the job
      await JobService.processJob(newJob.id);

    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Don't show error if job is already being processed
      if (!errorMessage.includes('already being processed')) {
        toast.error(`Upload failed: ${errorMessage}`);
      }
    } finally {
      setUploading(false);
    }
  }, [user]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json']
    },
    maxFiles: 1,
    disabled: uploading
  });

  const getStatusIcon = (status: Job['status']) => {
    switch (status) {
      case 'uploading':
        return <Upload className="h-4 w-4 text-blue-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const handleViewInsights = (jobId: string) => {
    navigate(`/analysis/${jobId}`);
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      await JobService.updateJobStatus(jobId, 'processing', null);
      toast.success('Retrying analysis...');
      await JobService.processJob(jobId);
    } catch (error) {
      console.error('Error retrying job:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Don't show error if job is already being processed
      if (!errorMessage.includes('already being processed')) {
        toast.error('Failed to retry analysis');
      }
    }
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

  const completedJobs = jobs.filter(j => j.status === 'completed');
  const totalConversations = completedJobs.reduce((acc, job) => acc + (job.total_conversations || 0), 0);
  
  // Check if user has premium access
  const isPremiumUser = StripeService.isPremiumUser(orders);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back! Upload your ChatGPT conversations to discover your data story.
            </p>
          </div>
          {isPremiumUser && (
            <Badge variant="secondary" className="px-3 py-1">
              <Target className="h-4 w-4 mr-1" />
              Advanced Analytics
            </Badge>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedJobs.length}</div>
              <p className="text-xs text-muted-foreground">
                Completed successfully
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversations Analyzed</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalConversations.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Across all uploads
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Insights Generated</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedJobs.length * 12}</div>
              <p className="text-xs text-muted-foreground">
                Unique data patterns
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Account Status</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isPremiumUser ? 'Advanced' : 'Basic'}</div>
              <p className="text-xs text-muted-foreground">
                {isPremiumUser 
                  ? 'All features unlocked' 
                  : `${Math.max(0, 3 - jobs.length)} free analyses remaining`
                }
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Upload New Analysis</CardTitle>
          <CardDescription>
            Upload your ChatGPT conversations.json file to discover insights about your communication patterns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Privacy-First Processing:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Export your ChatGPT data from Settings → Data Controls → Export</li>
                <li>Upload the conversations.json file securely</li>
                <li>We analyze your patterns and automatically delete your raw data</li>
                <li>Only insights are retained—never your actual conversations</li>
              </ol>
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
              <p className="text-lg">Uploading and processing your file...</p>
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

          {/* Privacy Reminder */}
          <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-muted">
            <div className="flex items-center text-sm text-muted-foreground">
              <Lock className="h-4 w-4 mr-2" />
              Your raw conversation data is automatically deleted after analysis. We keep only the insights.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis History */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis History</CardTitle>
          <CardDescription>
            View and manage your conversation analyses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {jobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No analyses yet. Upload your first conversation file to get started!</p>
              </div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(job.status)}
                    <div>
                      <p className="font-medium">{job.filename}</p>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        {job.status === 'completed' && job.total_conversations && (
                          <span>{job.total_conversations} conversations analyzed</span>
                        )}
                        {job.analysis_type === 'premium' && (
                          <Badge variant="secondary" className="text-xs">
                            <Target className="h-3 w-3 mr-1" />
                            Advanced
                          </Badge>
                        )}
                        <span>•</span>
                        <span>{new Date(job.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {(job.status === 'processing' || job.status === 'uploading') && (
                      <div className="w-32">
                        <Progress value={job.progress || 0} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {job.progress || 0}% complete
                        </p>
                      </div>
                    )}
                    
                    {job.status === 'completed' && (
                      <Button 
                        onClick={() => handleViewInsights(job.id)}
                        size="sm"
                      >
                        View Insights
                      </Button>
                    )}
                    
                    {job.status === 'failed' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRetryJob(job.id)}
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;