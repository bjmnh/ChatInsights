import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  ArrowLeft,
  BarChart3,
  Crown,
  Loader2,
  MessageSquare,
  TrendingUp,
  Brain,
  Users,
  Lightbulb,
  Target
} from 'lucide-react';
import { FileService, type Report } from '../services/fileService';
import { toast } from 'sonner';

const ReportPage: React.FC = () => {
  const { fileId, reportType } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!fileId || !reportType || !['basic', 'premium'].includes(reportType)) {
      navigate('/dashboard');
      return;
    }

    fetchReport();
  }, [user, fileId, reportType, navigate]);

  const fetchReport = async () => {
    try {
      const reports = await FileService.getFileReports(fileId!);
      const targetReport = reports.find(r => r.report_type === reportType);
      
      if (!targetReport) {
        toast.error('Report not found');
        navigate('/dashboard');
        return;
      }

      setReport(targetReport);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('Failed to load report');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <h2 className="text-2xl font-semibold">Loading Report</h2>
          <p className="text-muted-foreground">Preparing your insights...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Report Not Found</h1>
          <Button onClick={handleBackToDashboard}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isBasicReport = reportType === 'basic';
  const reportData = report.report_data;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleBackToDashboard}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <Badge variant={isBasicReport ? "secondary" : "default"} className="px-3 py-1">
            {isBasicReport ? (
              <>
                <BarChart3 className="h-4 w-4 mr-1" />
                Basic Report
              </>
            ) : (
              <>
                <Crown className="h-4 w-4 mr-1" />
                Premium Report
              </>
            )}
          </Badge>
        </div>

        <div>
          <h1 className="text-3xl font-bold mb-2">
            {isBasicReport ? 'Basic Analysis Report' : 'Premium Analysis Report'}
          </h1>
          <p className="text-muted-foreground">
            Generated on {new Date(report.generated_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Report Content */}
      {isBasicReport ? (
        <BasicReportContent data={reportData} />
      ) : (
        <PremiumReportContent data={reportData} />
      )}
    </div>
  );
};

const BasicReportContent: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Analysis Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg mb-4">{data.summary}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{data.totalConversations}</div>
              <div className="text-sm text-muted-foreground">Total Conversations</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{data.totalMessages}</div>
              <div className="text-sm text-muted-foreground">Total Messages</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{data.averageMessageLength}</div>
              <div className="text-sm text-muted-foreground">Avg Message Length</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Communication Style */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Communication Style
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg mb-4">{data.communicationStyle}</p>
          <p className="text-muted-foreground">{data.activityPattern}</p>
        </CardContent>
      </Card>

      {/* Top Topics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Top Discussion Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.topTopics.map((topic: string, index: number) => (
              <Badge key={index} variant="outline">{topic}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lightbulb className="h-5 w-5 mr-2" />
            Key Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.insights.map((insight: string, index: number) => (
              <li key={index} className="flex items-start">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0" />
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

const PremiumReportContent: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            Premium Analysis Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">{data.summary}</p>
        </CardContent>
      </Card>

      {/* Cognitive Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Cognitive Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Problem Solving Style</h4>
              <p className="text-muted-foreground">{data.cognitiveProfile.problemSolvingStyle}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Learning Preference</h4>
              <p className="text-muted-foreground">{data.cognitiveProfile.learningPreference}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Communication Pattern</h4>
              <p className="text-muted-foreground">{data.cognitiveProfile.communicationPattern}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Thinking Style</h4>
              <p className="text-muted-foreground">{data.cognitiveProfile.thinkingStyle}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personality Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Personality Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Key Traits</h4>
              <div className="flex flex-wrap gap-2">
                {data.personalityInsights.traits.map((trait: string, index: number) => (
                  <Badge key={index} variant="secondary">{trait}</Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Strengths</h4>
              <div className="flex flex-wrap gap-2">
                {data.personalityInsights.strengths.map((strength: string, index: number) => (
                  <Badge key={index} variant="outline">{strength}</Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Working Style</h4>
              <p className="text-muted-foreground">{data.personalityInsights.workingStyle}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deep Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Deep Behavioral Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {data.deepPatterns.map((pattern: string, index: number) => (
              <li key={index} className="flex items-start">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0" />
                <span>{pattern}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lightbulb className="h-5 w-5 mr-2" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.recommendations.map((recommendation: string, index: number) => (
              <li key={index} className="flex items-start">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportPage;