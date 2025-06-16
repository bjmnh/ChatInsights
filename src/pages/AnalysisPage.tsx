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
  Eye,
  Search,
  Network,
  Loader2
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
      topTopics: ['Programming', 'Data Science', 'Career Advice', 'Creative Writing', 'Learning'],
      communicationStyle: 'Analytical and Curious',
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
        { name: 'Creative', value: 12, color: '#ff7300' },
        { name: 'Other', value: 8, color: '#00ff88' }
      ]
    };
  };

  // Generate mock paid insights
  const generateMockPaidInsights = () => {
    return {
      digitalMirror: {
        personalityProfile: 'Highly analytical individual with strong curiosity drives and systematic thinking patterns',
        aiPerception: 'The AI sees you as someone who approaches problems methodically, values learning, and seeks comprehensive understanding before making decisions',
        confidence: 94
      },
      hiddenPatterns: [
        {
          pattern: 'Recurring Health Anxiety',
          frequency: 'Mentioned 23 times across 8 months',
          description: 'You frequently sought reassurance about health symptoms, particularly during stressful work periods',
          surprise_factor: 'High'
        },
        {
          pattern: 'Career Transition Signals',
          frequency: 'Escalating mentions over 6 months',
          description: 'Your questions evolved from general career advice to specific industry research, suggesting unconscious preparation for a change',
          surprise_factor: 'Medium'
        },
        {
          pattern: 'Creative Outlet Seeking',
          frequency: 'Consistent weekly mentions',
          description: 'Despite your technical focus, you regularly explored creative writing and artistic projects',
          surprise_factor: 'Low'
        }
      ],
      revelationMap: {
        overarchingNarrative: 'Your conversations reveal a journey from technical expertise toward more holistic thinking, with increasing emphasis on work-life balance and creative expression',
        connectionPoints: [
          'Technical questions → Leadership concerns → Work-life balance',
          'Health queries → Stress management → Mindfulness practices',
          'Career advice → Industry research → Entrepreneurial ideas'
        ],
        unconsciousThemes: ['Control and certainty', 'Growth through challenge', 'Authentic self-expression']
      }
    };
  };

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  // Check if user has premium access
  const isPremiumUser = StripeService.isPremiumUser(orders);

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
  const paidInsights = isPremiumUser ? generateMockPaidInsights() : null;

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
            {isPremiumUser && (
              <Badge variant="secondary" className="px-3 py-1">
                <Crown className="h-4 w-4 mr-1" />
                Premium
              </Badge>
            )}
          </div>
        </div>

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
              <CardTitle className="text-sm font-medium">Processing Time</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2m 34s</div>
              <p className="text-xs text-muted-foreground">
                Analysis completed
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="mirror" className="relative">
            Digital Mirror
            {!isPremiumUser && <Crown className="h-3 w-3 ml-1 text-yellow-500" />}
          </TabsTrigger>
          <TabsTrigger value="revelations" className="relative">
            Hidden Patterns
            {!isPremiumUser && <Crown className="h-3 w-3 ml-1 text-yellow-500" />}
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
                <CardDescription>What you talk about most</CardDescription>
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
                      {freeInsights.topicDistribution.map((entry: any, index: number) => (
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
              <CardTitle>Communication Style</CardTitle>
              <CardDescription>Analysis of your conversation approach</CardDescription>
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
                    {freeInsights.topTopics.map((topic: string, index: number) => (
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
                      <span>Curiosity Score</span>
                      <span className="font-medium">9.2/10</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mirror" className="space-y-6">
          {!isPremiumUser ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Eye className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">The Digital Mirror is Locked</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    See yourself as the AI sees you. Discover the personality profile built from your digital conversations—it might be unsettlingly accurate.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button onClick={handleUpgrade} size="lg">
                      Unlock Digital Mirror - $10
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
                      <Eye className="h-5 w-5 mr-2 text-primary" />
                      How the AI Sees You
                    </CardTitle>
                    <Badge variant="secondary">{paidInsights?.digitalMirror.confidence}% confidence</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <h4 className="font-semibold mb-2">AI Personality Profile</h4>
                      <p className="text-muted-foreground">{paidInsights?.digitalMirror.personalityProfile}</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-semibold mb-2">AI's Perception of You</h4>
                      <p className="text-muted-foreground">{paidInsights?.digitalMirror.aiPerception}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="revelations" className="space-y-6">
          {!isPremiumUser ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Search className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Hidden Patterns Locked</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Uncover the recurring themes, anxieties, and personal details you've unknowingly cataloged. What has your digital subconscious revealed?
                  </p>
                  <Button onClick={handleUpgrade} size="lg">
                    Reveal Hidden Patterns - $10
                    <Crown className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {paidInsights?.hiddenPatterns.map((pattern: any, index: number) => (
                <Card key={index} className="border-l-4 border-l-primary">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center">
                        <Search className="h-5 w-5 mr-2 text-primary" />
                        {pattern.pattern}
                      </CardTitle>
                      <Badge variant={pattern.surprise_factor === 'High' ? 'destructive' : pattern.surprise_factor === 'Medium' ? 'default' : 'secondary'}>
                        {pattern.surprise_factor} Surprise
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
                    The Revelation Map
                  </CardTitle>
                  <CardDescription>Connecting the dots across your conversations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Your Overarching Narrative</h4>
                      <p className="text-muted-foreground">{paidInsights?.revelationMap.overarchingNarrative}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Connection Points</h4>
                      <ul className="space-y-1">
                        {paidInsights?.revelationMap.connectionPoints.map((point: string, index: number) => (
                          <li key={index} className="text-muted-foreground flex items-center">
                            <ArrowRight className="h-4 w-4 mr-2 text-primary" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Unconscious Themes</h4>
                      <div className="flex flex-wrap gap-2">
                        {paidInsights?.revelationMap.unconsciousThemes.map((theme: string, index: number) => (
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