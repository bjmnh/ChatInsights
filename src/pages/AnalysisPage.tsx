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
  Database as DatabaseIcon,
  Code,
  Network,
  Loader2,
  RefreshCw,
  Zap
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
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
      averageMessageLength: 127,
      mostActiveHour: 14,
      topTopics: ['Programming', 'Data Science', 'Career Advice', 'Technical Writing', 'Learning'],
      communicationStyle: 'Analytical and Systematic',
      engagementLevel: 8.5,
      activityPatterns: [
        { hour: '6AM', messages: 12 },
        { hour: '9AM', messages: 45 },
        { hour: '12PM', messages: 67 },
        { hour: '3PM', messages: 89 },
        { hour: '6PM', messages: 56 },
        { hour: '9PM', messages: 78 },
        { hour: '12AM', messages: 23 }
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
      behavioralProfile: {
        personalityAnalysis: 'Highly analytical individual with systematic thinking patterns and strong problem-solving orientation',
        cognitiveStyle: 'Detail-oriented with preference for structured information and logical reasoning',
        confidence: 94
      },
      dataPatterns: [
        {
          pattern: 'Technical Skill Progression',
          frequency: 'Tracked across 8 months',
          description: 'Clear progression from basic concepts to advanced implementations, with consistent learning velocity',
          significance: 'High'
        },
        {
          pattern: 'Problem-Solving Methodology',
          frequency: 'Consistent pattern in 85% of technical queries',
          description: 'Systematic approach: problem decomposition → research → implementation → optimization',
          significance: 'High'
        },
        {
          pattern: 'Knowledge Gaps and Learning',
          frequency: 'Identified 23 distinct learning cycles',
          description: 'Regular pattern of identifying knowledge gaps and systematically addressing them',
          significance: 'Medium'
        }
      ],
      insightMap: {
        overarchingNarrative: 'Your conversation data reveals a systematic learner with strong analytical capabilities, progressing from foundational concepts to advanced technical implementations',
        connectionPoints: [
          'Technical questions → Implementation challenges → Optimization strategies',
          'Learning queries → Skill development → Career advancement',
          'Problem identification → Research methodology → Solution implementation'
        ],
        cognitiveThemes: ['Systematic thinking', 'Continuous learning', 'Problem-solving orientation']
      }
    };
  };

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  const handleReprocessWithPremium = async () => {
    if (!job || !isPremiumUser) {
      toast.error('Premium access required');
      return;
    }

    setReprocessing(true);
    try {
      await JobService.reprocessWithPremium(job.id);
      toast.success('Starting premium analysis...');
      
      // Refresh the page after a short delay to show the updated job
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error reprocessing with premium:', error);
      toast.error('Failed to start premium analysis');
    } finally {
      setReprocessing(false);
    }
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
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Analysis Not Found</h1>
          <Button onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (job.status !== 'completed') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Analysis In Progress</h1>
          <p className="text-muted-foreground mb-4">
            Your analysis is still being processed. Please check back later.
          </p>
          <Progress value={job.progress} className="w-64 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground mb-4">{job.progress}% complete</p>
          <Button onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Report Not Available</h1>
          <p className="text-muted-foreground mb-4">
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Analysis Results</h1>
            <p className="text-muted-foreground">
              Insights from {job.filename} • {job.total_conversations || 'Unknown'} conversations
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="px-3 py-1">
              <Calendar className="h-4 w-4 mr-1" />
              {new Date(job.created_at).toLocaleDateString()}
            </Badge>
            {job.analysis_type === 'premium' && (
              <Badge variant="secondary" className="px-3 py-1">
                <Zap className="h-4 w-4 mr-1" />
                Premium Analysis
              </Badge>
            )}
            {isPremiumUser && (
              <Badge variant="secondary" className="px-3 py-1">
                <Crown className="h-4 w-4 mr-1" />
                Premium User
              </Badge>
            )}
          </div>
        </div>

        {/* Premium Upgrade Alert */}
        {canUpgradeToPremium && (
          <Alert className="mb-6 border-primary/20 bg-primary/5">
            <Zap className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <div>
                  <strong>Upgrade Available:</strong> Run advanced analysis on this dataset with your premium access.
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
                      Run Premium Analysis
                    </>
                  )}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="behavioral" className="relative">
            Behavioral Profile
            {!paidInsights && <Crown className="h-3 w-3 ml-1 text-yellow-500" />}
          </TabsTrigger>
          <TabsTrigger value="insights" className="relative">
            Data Insights
            {!paidInsights && <Crown className="h-3 w-3 ml-1 text-yellow-500" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Activity by Hour</CardTitle>
                <CardDescription>Your conversation patterns throughout the day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={freeInsights.activityPatterns}>
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
                <CardTitle>Topic Distribution</CardTitle>
                <CardDescription>What you discuss most frequently</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={freeInsights.topicDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(freeInsights.topicDistribution || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

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
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversation Patterns</CardTitle>
              <CardDescription>Detailed analysis of your interaction patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                
                <div className="space-y-4">
                  <h4 className="font-semibold">Engagement Metrics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Response Depth</span>
                      <span className="font-medium">High</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Topic Persistence</span>
                      <span className="font-medium">Medium</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Technical Focus</span>
                      <span className="font-medium">9.2/10</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavioral" className="space-y-6">
          {!paidInsights ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <DatabaseIcon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Behavioral Profile Analysis</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Advanced behavioral analysis using machine learning to identify cognitive patterns, 
                    learning styles, and problem-solving approaches from your conversation data.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button onClick={handleUpgrade} size="lg">
                      Unlock Advanced Analysis - $10
                      <Crown className="ml-2 h-4 w-4" />
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
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <DatabaseIcon className="h-5 w-5 mr-2 text-primary" />
                      Behavioral Profile Analysis
                    </CardTitle>
                    <Badge variant="secondary">{paidInsights?.behavioralProfile?.confidence}% confidence</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <h4 className="font-semibold mb-2">Personality Analysis</h4>
                      <p className="text-muted-foreground">{paidInsights?.behavioralProfile?.personalityAnalysis}</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-semibold mb-2">Cognitive Style</h4>
                      <p className="text-muted-foreground">{paidInsights?.behavioralProfile?.cognitiveStyle}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {!paidInsights ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Code className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Advanced Data Insights</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Deep data analysis revealing learning patterns, skill progression, and knowledge acquisition 
                    strategies extracted from your conversation history.
                  </p>
                  <Button onClick={handleUpgrade} size="lg">
                    Unlock Data Insights - $10
                    <Crown className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {(paidInsights?.dataPatterns || []).map((pattern: any, index: number) => (
                <Card key={index} className="border-l-4 border-l-primary">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center">
                        <Code className="h-5 w-5 mr-2 text-primary" />
                        {pattern.pattern}
                      </CardTitle>
                      <Badge variant={pattern.significance === 'High' ? 'destructive' : pattern.significance === 'Medium' ? 'default' : 'secondary'}>
                        {pattern.significance} Significance
                      </Badge>
                    </div>
                    <CardDescription>{pattern.frequency}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{pattern.description}</p>
                  </CardContent>
                </Card>
              ))}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Network className="h-5 w-5 mr-2 text-primary" />
                    Insight Mapping
                  </CardTitle>
                  <CardDescription>Connecting patterns across your conversation data</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Learning Narrative</h4>
                      <p className="text-muted-foreground">{paidInsights?.insightMap?.overarchingNarrative}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Connection Points</h4>
                      <ul className="space-y-1">
                        {(paidInsights?.insightMap?.connectionPoints || []).map((point: string, index: number) => (
                          <li key={index} className="text-muted-foreground flex items-center">
                            <ArrowRight className="h-4 w-4 mr-2 text-primary" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Cognitive Themes</h4>
                      <div className="flex flex-wrap gap-2">
                        {(paidInsights?.insightMap?.cognitiveThemes || []).map((theme: string, index: number) => (
                          <Badge key={index} variant="outline">{theme}</Badge>
                        ))}
                      </div>
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