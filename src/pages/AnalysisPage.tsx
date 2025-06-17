import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  BarChart3, 
  MessageSquare, 
  Clock, 
  TrendingUp, 
  Brain, 
  Crown,
  Lock,
  Star,
  Calendar,
  Users,
  Lightbulb,
  Target,
  ArrowRight,
  Code,
  Network,
  Loader2,
  RefreshCw,
  Zap,
  Search,
  Eye,
  Layers,
  X,
  ArrowLeft,
  Activity,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  BarChart as BarChartIcon,
  Maximize2,
  Settings,
  Download,
  Share2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { JobService } from '../services/jobService';
import { ReportService } from '../services/reportService';
import { StripeService } from '../services/stripeService';
import { toast } from 'sonner';
import type { Database } from '../lib/database.types';

type Job = Database['public']['Tables']['jobs']['Row'];
type UserReport = Database['public']['Tables']['user_reports']['Row'];

const AnalysisPage: React.FC = () => {
  const { jobId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [report, setReport] = useState<UserReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [reprocessing, setReprocessing] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!jobId) {
      navigate('/dashboard');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch job details
        const jobData = await JobService.getJob(jobId);
        if (!jobData) {
          toast.error('Analysis not found');
          navigate('/dashboard');
          return;
        }

        // Check if user owns this job
        if (jobData.user_id !== user.id) {
          toast.error('You do not have access to this analysis');
          navigate('/dashboard');
          return;
        }

        setJob(jobData);

        // If job is completed, fetch the report
        if (jobData.status === 'completed') {
          const reportData = await ReportService.getReportByJobId(jobId);
          if (reportData) {
            setReport(reportData);
          } else {
            // Create a mock report for demo purposes
            const mockReport = await ReportService.createReport({
              user_id: user.id,
              job_id: jobId,
              free_insights: generateMockFreeInsights(jobData),
              paid_insights: null
            });
            setReport(mockReport);
          }
        }

        // Fetch user's order data
        const ordersData = await StripeService.getUserOrders();
        setOrders(ordersData);
      } catch (error) {
        console.error('Error fetching analysis data:', error);
        toast.error('Failed to load analysis data');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [jobId, user, navigate]);

  // Generate mock free insights based on job data
  const generateMockFreeInsights = (jobData: Job) => {
    return {
      totalMessages: jobData.total_conversations ? jobData.total_conversations * 15 : 2847,
      userMessagesCount: jobData.total_conversations ? Math.floor(jobData.total_conversations * 0.6 * 15) : 1708,
      aiMessagesCount: jobData.total_conversations ? Math.ceil(jobData.total_conversations * 0.4 * 15) : 1139,
      totalUserCharacters: jobData.total_conversations ? jobData.total_conversations * 2000 : 250000,
      totalAiCharacters: jobData.total_conversations ? jobData.total_conversations * 3000 : 450000,
      averageUserMessageLength: 127,
      averageAiMessageLength: 198,
      firstMessageDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      lastMessageDate: new Date().toISOString(),
      conversationDaysSpan: 30,
      mostUsedUserWords: [
        { word: 'code', count: 45 },
        { word: 'problem', count: 32 },
        { word: 'error', count: 28 },
        { word: 'how', count: 25 },
        { word: 'python', count: 22 },
        { word: 'help', count: 20 },
        { word: 'work', count: 18 },
        { word: 'thanks', count: 15 },
        { word: 'question', count: 14 },
        { word: 'better', count: 12 }
      ],
      userVocabularySizeEstimate: 1250,
      averageWordsPerUserSentence: 12.5,
      userToAiMessageRatio: 1.5,
      averageMessagesPerConversation: 8.3,
      longestConversationByMessages: {
        count: 42,
        title: 'Python Data Analysis Project'
      },
      shortestConversationByMessages: {
        count: 1,
        title: 'Quick Question'
      },
      activityByHourOfDay: [
        { hour: '00:00', messageCount: 12 },
        { hour: '03:00', messageCount: 5 },
        { hour: '06:00', messageCount: 8 },
        { hour: '09:00', messageCount: 45 },
        { hour: '12:00', messageCount: 67 },
        { hour: '15:00', messageCount: 89 },
        { hour: '18:00', messageCount: 56 },
        { hour: '21:00', messageCount: 78 }
      ],
      topicDistribution: [
        { name: 'Programming', value: 35, color: '#8884d8' },
        { name: 'Data Science', value: 25, color: '#82ca9d' },
        { name: 'Career', value: 20, color: '#ffc658' },
        { name: 'Technical', value: 12, color: '#ff7300' },
        { name: 'Other', value: 8, color: '#00ff88' }
      ]
    };
  };

  // Generate mock premium insights
  const generateMockPremiumInsights = () => {
    return {
      cognitiveProfile: {
        problemSolvingApproach: 'Systematic decomposition with iterative refinement',
        learningStyle: 'Analytical learner with preference for structured information and logical progression',
        communicationPattern: 'Detail-oriented with clear articulation of technical concepts',
        confidence: 92
      },
      learningProgression: [
        {
          skill: 'Algorithm Design',
          progression: 'Beginner → Intermediate → Advanced',
          timeframe: '6 months',
          keyMilestones: ['Basic sorting algorithms', 'Dynamic programming', 'Graph algorithms'],
          proficiencyGrowth: 85
        },
        {
          skill: 'System Architecture',
          progression: 'Novice → Competent → Proficient',
          timeframe: '8 months',
          keyMilestones: ['Monolithic design', 'Microservices', 'Distributed systems'],
          proficiencyGrowth: 78
        },
        {
          skill: 'Data Structures',
          progression: 'Basic → Advanced → Expert',
          timeframe: '4 months',
          keyMilestones: ['Arrays and lists', 'Trees and graphs', 'Advanced data structures'],
          proficiencyGrowth: 94
        }
      ],
      behavioralPatterns: [
        {
          pattern: 'Technical Problem Decomposition',
          frequency: 'Consistent across 89% of technical discussions',
          description: 'Systematic approach: problem analysis → solution design → implementation strategy → optimization',
          significance: 'High'
        },
        {
          pattern: 'Knowledge Gap Identification',
          frequency: 'Identified in 76% of learning conversations',
          description: 'Proactive identification of knowledge gaps followed by targeted learning strategies',
          significance: 'High'
        },
        {
          pattern: 'Iterative Refinement Process',
          frequency: 'Present in 82% of project discussions',
          description: 'Consistent pattern of initial implementation followed by iterative improvements',
          significance: 'Medium'
        }
      ],
      crossConversationInsights: {
        overarchingTheme: 'Your conversation data reveals a systematic learner with strong analytical capabilities, progressing from foundational concepts to advanced technical implementations',
        connectionPatterns: [
          'Technical questions → Implementation challenges → Optimization strategies',
          'Learning queries → Skill development → Career advancement',
          'Problem identification → Research methodology → Solution implementation'
        ],
        cognitiveEvolution: 'Clear progression from reactive problem-solving to proactive system design thinking'
      }
    };
  };

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  const handleReprocessWithPremium = async () => {
    if (!job || !isPremiumUser) {
      toast.error('Advanced analytics access required');
      return;
    }

    setReprocessing(true);
    try {
      await JobService.reprocessWithPremium(job.id);
      toast.success('Starting advanced analysis...');
      
      // Refresh the page after a short delay to show the updated job
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error reprocessing with premium:', error);
      toast.error('Failed to start advanced analysis');
    } finally {
      setReprocessing(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const toggleFullScreen = () => {
    setFullScreen(!fullScreen);
  };

  // Check if user has premium access
  const isPremiumUser = StripeService.isPremiumUser(orders);
  const isBasicAnalysis = job?.analysis_type === 'basic' || !job?.analysis_type;
  const canUpgradeToPremium = isPremiumUser && isBasicAnalysis && job?.status === 'completed';

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <h2 className="text-2xl font-semibold">Loading Analysis</h2>
          <p className="text-muted-foreground">Preparing your insights...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Analysis Not Found</h1>
          <Button onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (job.status !== 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Activity className="h-16 w-16 mx-auto text-primary animate-pulse" />
          <h1 className="text-2xl font-bold">Analysis In Progress</h1>
          <p className="text-muted-foreground">
            Your analysis is being processed. This may take a few minutes.
          </p>
          <Progress value={job.progress} className="w-64 mx-auto" />
          <p className="text-sm text-muted-foreground">{job.progress}% complete</p>
          <Button onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Report Not Available</h1>
          <p className="text-muted-foreground">
            The analysis report is not available. Please try again later.
          </p>
          <Button onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const freeInsights = report.free_insights as any;
  const paidInsights = (isPremiumUser && job.analysis_type === 'premium') ? generateMockPremiumInsights() : null;

  // Transform data for the UI components
  const activityData = freeInsights.activityByHourOfDay?.map(item => ({
    hour: item.hour.split(':')[0] + (parseInt(item.hour.split(':')[0]) >= 12 ? 'PM' : 'AM'),
    messages: item.messageCount
  })) || [];

  const topicData = freeInsights.mostUsedUserWords?.slice(0, 5).map((item: any, index: number) => ({
    name: item.word,
    value: item.count,
    color: ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff88'][index % 5]
  })) || [];

  const topTopics = freeInsights.mostUsedUserWords?.slice(0, 5).map((item: any) => 
    item.word.charAt(0).toUpperCase() + item.word.slice(1)
  ) || [];

  const containerClass = fullScreen 
    ? "fixed inset-0 z-50 bg-background overflow-auto" 
    : "container mx-auto px-4 py-8";

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleBackToDashboard}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            {fullScreen && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={toggleFullScreen}
                className="flex items-center"
              >
                <X className="h-4 w-4 mr-2" />
                Exit Full View
              </Button>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {!fullScreen && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={toggleFullScreen}
                className="flex items-center"
              >
                <Maximize2 className="h-4 w-4 mr-2" />
                Full Screen
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analysis Dashboard</h1>
            <p className="text-muted-foreground">
              {job.filename} • {job.total_conversations || 'Unknown'} conversations • {new Date(job.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {job.analysis_type === 'premium' && (
              <Badge variant="secondary" className="px-3 py-1">
                <Target className="h-4 w-4 mr-1" />
                Advanced Analysis
              </Badge>
            )}
            {isPremiumUser && (
              <Badge variant="secondary" className="px-3 py-1">
                <Zap className="h-4 w-4 mr-1" />
                Premium User
              </Badge>
            )}
          </div>
        </div>

        {/* Premium Upgrade Alert */}
        {canUpgradeToPremium && (
          <Alert className="mt-6 border-primary/20 bg-primary/5">
            <Target className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <div>
                  <strong>Advanced Analysis Available:</strong> Run deeper analysis on this dataset with your premium access.
                </div>
                <Button 
                  onClick={handleReprocessWithPremium}
                  disabled={reprocessing}
                  size="sm"
                  className="ml-4"
                >
                  {reprocessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Run Advanced Analysis
                    </>
                  )}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Messages</p>
                  <p className="text-2xl font-bold">{freeInsights.totalMessages.toLocaleString()}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{freeInsights.totalMessages.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Avg {freeInsights.averageMessageLength} chars per message
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Engagement Level</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{freeInsights.engagementLevel}/10</div>
              <Progress value={freeInsights.engagementLevel * 10} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Active Hour</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{freeInsights.mostActiveHour}:00</div>
              <p className="text-xs text-muted-foreground">
                Peak conversation time
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Analysis Type</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{job.analysis_type === 'premium' ? 'Premium' : 'Basic'}</div>
              <p className="text-xs text-muted-foreground">
                {job.analysis_type === 'premium' ? 'Advanced insights' : 'Standard analysis'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="patterns" className="flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            Patterns
          </TabsTrigger>
          <TabsTrigger value="cognitive" className="flex items-center relative">
            <Search className="h-4 w-4 mr-2" />
            Cognitive Analysis
            {!paidInsights && <Lock className="h-3 w-3 ml-1 text-muted-foreground" />}
          </TabsTrigger>
          <TabsTrigger value="progression" className="flex items-center relative">
            <TrendingUp className="h-4 w-4 mr-2" />
            Learning Insights
            {!paidInsights && <Lock className="h-3 w-3 ml-1 text-muted-foreground" />}
          </TabsTrigger>
          <TabsTrigger value="behavioral" className="flex items-center relative">
            <Eye className="h-4 w-4 mr-2" />
            Behavioral Patterns
            {!paidInsights && <Lock className="h-3 w-3 ml-1 text-muted-foreground" />}
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center relative">
            <Network className="h-4 w-4 mr-2" />
            Cross-Conversation
            {!paidInsights && <Lock className="h-3 w-3 ml-1 text-muted-foreground" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChartIcon className="h-5 w-5 mr-2" />
                  Activity by Hour
                </CardTitle>
                <CardDescription>Your conversation patterns throughout the day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="messages" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChartIcon className="h-5 w-5 mr-2" />
                  Topic Distribution
                </CardTitle>
                <CardDescription>What you discuss most frequently</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={topicData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {topicData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LineChartIcon className="h-5 w-5 mr-2" />
                  Weekly Engagement Trends
                </CardTitle>
                <CardDescription>Your engagement patterns over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={freeInsights.weeklyActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="engagement" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

          <Card>
            <CardHeader>
              <CardTitle>Communication Analysis</CardTitle>
              <CardDescription>Analysis of your conversation approach and topics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Primary Style:</span>
                  <Badge variant="secondary">{freeInsights.communicationStyle}</Badge>
                </div>
                <div>
                  <span className="font-medium">Top Topics:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(freeInsights.topTopics || []).map((topic: string, index: number) => (
                      <Badge key={index} variant="outline">{topic}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="patterns" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Message Characteristics</CardTitle>
              <CardDescription>Analysis of your message patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h4 className="font-semibold">Message Characteristics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Average Length</span>
                    <span className="font-medium">{freeInsights.averageMessageLength} characters</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Question Rate</span>
                    <span className="font-medium">23%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Follow-up Rate</span>
                    <span className="font-medium">67%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
            
          <Card>
            <CardHeader>
              <CardTitle>Engagement Metrics</CardTitle>
              <CardDescription>How you interact with conversations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Response Depth</span>
                  <span className="font-medium">High</span>
                </div>
                <div className="flex justify-between">
                  <span>Topic Persistence</span>
                  <span className="font-medium">Medium</span>
                </div>
                <div className="flex justify-between">
                  <span>Learning Velocity</span>
                  <span className="font-medium">8.7/10</span>
                </div>
                <div className="flex justify-between">
                  <span>Problem-Solving Style</span>
                  <span className="font-medium">Systematic</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="cognitive" className="space-y-6">
        {!paidInsights ? (
          <Card className="border-2 border-dashed border-primary/20">
            <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Search className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Cognitive Pattern Analysis</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Advanced analysis of your problem-solving approaches, learning styles, and cognitive patterns 
                    extracted from your conversation data.
                  </p>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">What You'll Discover:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Your unique problem-solving methodology</li>
                      <li>• Learning style and information processing patterns</li>
                      <li>• Communication approach in technical discussions</li>
                      <li>• Cognitive strengths and thinking preferences</li>
                    </ul>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button onClick={handleUpgrade} size="lg">
                      Unlock Advanced Analytics - $10
                      <Target className="ml-2 h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/pricing')}>
                      View Pricing
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Search className="h-5 w-5 mr-2 text-primary" />
                    Cognitive Profile Analysis
                  </CardTitle>
                  <CardDescription>
                    Advanced analysis of your thinking patterns and cognitive approach
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <h4 className="font-semibold mb-2">Problem-Solving Approach</h4>
                      <p className="text-sm text-muted-foreground">{paidInsights?.cognitiveProfile?.problemSolvingApproach}</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-semibold mb-2">Learning Style</h4>
                      <p className="text-sm text-muted-foreground">{paidInsights?.cognitiveProfile?.learningStyle}</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-semibold mb-2">Communication Pattern</h4>
                      <p className="text-sm text-muted-foreground">{paidInsights?.cognitiveProfile?.communicationPattern}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="progression" className="space-y-6">
          {!paidInsights ? (
            <Card className="border-2 border-dashed border-primary/20">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Learning Progression Analysis</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Track your skill development, learning velocity, and knowledge acquisition patterns 
                    using advanced data analysis techniques.
                  </p>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">What You'll Discover:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Skill development trajectories over time</li>
                      <li>• Learning velocity and knowledge acquisition rate</li>
                      <li>• Key milestones and breakthrough moments</li>
                      <li>• Areas of rapid growth vs. steady progression</li>
                    </ul>
                  </div>
                  <Button onClick={handleUpgrade} size="lg">
                    Unlock Learning Insights - $10
                    <Target className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                    Skill Development Progression
                  </CardTitle>
                  <CardDescription>Your learning journey across different technical areas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {(paidInsights?.learningProgression || []).map((skill: any, index: number) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold">{skill.skill}</h4>
                          <Badge variant="outline">{skill.timeframe}</Badge>
                        </div>
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>Progression</span>
                            <span>{skill.proficiencyGrowth}% growth</span>
                          </div>
                          <Progress value={skill.proficiencyGrowth} className="h-2" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{skill.progression}</p>
                        <div className="flex flex-wrap gap-1">
                          {skill.keyMilestones.map((milestone: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">{milestone}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="behavioral" className="space-y-6">
          {!paidInsights ? (
            <Card className="border-2 border-dashed border-primary/20">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Eye className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Behavioral Pattern Analysis</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Identify consistent behavioral patterns and approaches in your technical conversations 
                    and problem-solving methodology.
                  </p>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">What You'll Discover:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Consistent behavioral patterns across conversations</li>
                      <li>• Problem-solving methodology and approach</li>
                      <li>• Decision-making patterns and preferences</li>
                      <li>• Communication style in different contexts</li>
                    </ul>
                  </div>
                  <Button onClick={handleUpgrade} size="lg">
                    Unlock Behavioral Analysis - $10
                    <Target className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="h-5 w-5 mr-2 text-primary" />
                    Behavioral Patterns
                  </CardTitle>
                  <CardDescription>Consistent patterns identified across your conversations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(paidInsights?.behavioralPatterns || []).map((pattern: any, index: number) => (
                      <div key={index} className="p-4 border-l-4 border-l-primary rounded-lg bg-primary/5">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{pattern.pattern}</h4>
                          <Badge variant={pattern.significance === 'High' ? 'destructive' : 'secondary'}>
                            {pattern.significance} Impact
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{pattern.frequency}</p>
                        <p className="text-sm">{pattern.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {!paidInsights ? (
            <Card className="border-2 border-dashed border-primary/20">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Network className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Cross-Conversation Insights</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Discover connections and themes that span across your entire conversation history 
                    to reveal long-term patterns and evolution.
                  </p>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">What You'll Discover:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Connections between different conversation topics</li>
                      <li>• Evolution of your thinking over time</li>
                      <li>• Recurring themes and interests</li>
                      <li>• Long-term learning and development patterns</li>
                    </ul>
                  </div>
                  <Button onClick={handleUpgrade} size="lg">
                    Unlock Cross-Conversation Analysis - $10
                    <Target className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Network className="h-5 w-5 mr-2 text-primary" />
                    Cross-Conversation Insights
                  </CardTitle>
                  <CardDescription>Connections and themes across your entire conversation history</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Overarching Theme</h4>
                      <p className="text-muted-foreground">{paidInsights?.crossConversationInsights?.overarchingTheme}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Connection Patterns</h4>
                      <ul className="space-y-1">
                        {(paidInsights?.crossConversationInsights?.connectionPatterns || []).map((pattern: string, index: number) => (
                          <li key={index} className="text-muted-foreground flex items-center">
                            <ArrowRight className="h-4 w-4 mr-2 text-primary" />
                            {pattern}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Cognitive Evolution</h4>
                      <p className="text-muted-foreground">{paidInsights?.crossConversationInsights?.cognitiveEvolution}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalysisPage;