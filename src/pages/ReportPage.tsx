import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { ArrowLeft, BarChart3, Crown, Loader2, MessageSquare, TrendingUp, Brain, Users, Lightbulb, Target, Clock, Calendar, Hash, Activity, Zap, Eye, Shield, FileText, AlertTriangle, Star, Award, Fingerprint, Search, Timer, Globe, BookOpen, Cpu, Database, Code, Sparkles, User, AtSign, Gauge, Carrot as Mirror, TrendingDown, TrendingUp as TrendingUpIcon, Minus, CheckCircle, XCircle, AlertCircle, Lock, Mail, MapPin, CreditCard, Phone, IdCard, Heart, Building, Camera, Tv, Trophy, Compass } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
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
            {isBasicReport ? 'Conversation Analytics Report' : 'Advanced Behavioral Analysis'}
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
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  // Prepare chart data
  const hourlyData = data.activityByHourOfDay?.map((item: any) => ({
    hour: item.hour,
    messages: item.messageCount
  })) || [];

  const dailyData = data.activityByDayOfWeek?.map((item: any) => ({
    day: item.day.substring(0, 3),
    messages: item.messageCount
  })) || [];

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0', '#ffb347'];

  return (
    <div className="space-y-8">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Conversations</p>
                <p className="text-3xl font-bold text-blue-900">{formatNumber(data.totalConversations || 0)}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Your Messages</p>
                <p className="text-3xl font-bold text-green-900">{formatNumber(data.userMessagesCount || 0)}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Avg Message Length</p>
                <p className="text-3xl font-bold text-purple-900">{data.averageUserMessageLength || 0}</p>
                <p className="text-xs text-purple-600">characters</p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Vocabulary Size</p>
                <p className="text-3xl font-bold text-orange-900">{formatNumber(data.userVocabularySizeEstimate || 0)}</p>
                <p className="text-xs text-orange-600">unique words</p>
              </div>
              <BookOpen className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Conversation Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">First Message</p>
                <p className="font-semibold">{data.firstMessageDate ? formatDate(data.firstMessageDate) : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Message</p>
                <p className="font-semibold">{data.lastMessageDate ? formatDate(data.lastMessageDate) : 'N/A'}</p>
              </div>
            </div>
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <p className="text-2xl font-bold text-primary">{data.conversationDaysSpan || 0}</p>
              <p className="text-sm text-muted-foreground">days of conversations</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Activity Highlights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <Clock className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <p className="text-sm text-blue-600">Most Active Hour</p>
                <p className="font-bold text-blue-900">{data.mostActiveHour || 'N/A'}</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <Calendar className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <p className="text-sm text-green-600">Most Active Day</p>
                <p className="font-bold text-green-900">{data.mostActiveDay || 'N/A'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-900">{data.questionMarksUsedByUser || 0}</p>
                <p className="text-sm text-yellow-600">Questions Asked</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-900">{data.exclamationMarksUsedByUser || 0}</p>
                <p className="text-sm text-red-600">Exclamations Used</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Activity by Hour
            </CardTitle>
            <CardDescription>Your messaging patterns throughout the day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyData}>
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
              <Calendar className="h-5 w-5 mr-2" />
              Activity by Day
            </CardTitle>
            <CardDescription>Your weekly conversation patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="messages" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Most Used Words */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Hash className="h-5 w-5 mr-2" />
            Most Frequently Used Words
          </CardTitle>
          <CardDescription>Your top vocabulary in conversations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {data.mostUsedUserWords?.slice(0, 15).map((word: any, index: number) => (
              <div key={index} className="text-center p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                <p className="font-bold text-primary text-lg">{word.word}</p>
                <p className="text-sm text-muted-foreground">{word.count} times</p>
              </div>
            )) || []}
          </div>
        </CardContent>
      </Card>

      {/* Additional Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Communication Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">{data.averageWordsPerUserSentence?.toFixed(1) || 0}</p>
              <p className="text-sm text-muted-foreground">Average words per sentence</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">{data.userToAiMessageRatio?.toFixed(2) || 0}</p>
              <p className="text-sm text-muted-foreground">User to AI message ratio</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">{data.averageMessagesPerConversation?.toFixed(1) || 0}</p>
              <p className="text-sm text-muted-foreground">Average messages per conversation</p>
            </div>
          </div>
          {data.longestConversationByMessages && (
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">Longest Conversation</h4>
              <p className="text-blue-700">"{data.longestConversationByMessages.title}"</p>
              <p className="text-sm text-blue-600">{data.longestConversationByMessages.count} messages</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const PremiumReportContent: React.FC<{ data: any }> = ({ data }) => {
  // Handle processing errors
  if (data.processingErrors && data.processingErrors.length > 0) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center text-red-700">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Report Generation Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">Some premium insights could not be generated:</p>
          <ul className="list-disc list-inside space-y-1">
            {data.processingErrors.map((error: string, index: number) => (
              <li key={index} className="text-red-600">{error}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* FBI Report Section */}
      {data.fbiReport && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-red-600 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="h-6 w-6" />
                <span className="font-bold text-lg">CONFIDENTIAL</span>
              </div>
              <Badge variant="destructive" className="bg-red-700">
                CLASSIFIED
              </Badge>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            <div className="text-center border-b border-slate-700 pb-6">
              <h2 className="text-3xl font-bold mb-2">{data.fbiReport.reportTitle}</h2>
              <p className="text-slate-300">Digital Behavioral Analysis Division</p>
            </div>

            {/* Subject Codename */}
            {data.fbiReport.subjectCodename && (
              <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-600">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-yellow-400 mb-2">
                    SUBJECT CODENAME: "{data.fbiReport.subjectCodename.name}"
                  </h3>
                  <p className="text-slate-300 italic">
                    {data.fbiReport.subjectCodename.justification}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3 flex items-center">
                    <Target className="h-5 w-5 mr-2 text-red-400" />
                    Subject Profile Summary
                  </h3>
                  <p className="text-slate-300 leading-relaxed bg-slate-800/50 p-4 rounded-lg">
                    {data.fbiReport.subjectProfileSummary}
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3 flex items-center">
                    <Brain className="h-5 w-5 mr-2 text-blue-400" />
                    Dominant Interests
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {data.fbiReport.dominantInterests?.map((interest: string, index: number) => (
                      <div key={index} className="bg-blue-900/30 border border-blue-700 px-3 py-2 rounded">
                        <span className="text-blue-200">• {interest}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3 flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2 text-green-400" />
                    Communication Modalities
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {data.fbiReport.communicationModalities?.map((modality: string, index: number) => (
                      <Badge key={index} variant="outline" className="bg-green-900/30 border-green-700 text-green-200">
                        {modality}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3 flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-yellow-400" />
                    Emotional Tone & Engagement
                  </h3>
                  <p className="text-slate-300 leading-relaxed bg-slate-800/50 p-4 rounded-lg">
                    {data.fbiReport.emotionalToneAndEngagement}
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3 flex items-center">
                    <Eye className="h-5 w-5 mr-2 text-purple-400" />
                    Information Sharing Tendencies
                  </h3>
                  <p className="text-slate-300 leading-relaxed bg-slate-800/50 p-4 rounded-lg">
                    {data.fbiReport.informationSharingTendencies}
                  </p>
                </div>

                {/* PII Examples */}
                {data.fbiReport.piiExamples && data.fbiReport.piiExamples.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-3 flex items-center">
                      <Lock className="h-5 w-5 mr-2 text-orange-400" />
                      PII Examples
                    </h3>
                    <div className="space-y-2">
                      {data.fbiReport.piiExamples.map((pii: any, index: number) => (
                        <div key={index} className="bg-orange-900/30 border border-orange-700 p-3 rounded">
                          <div className="flex items-center mb-1">
                            <AlertTriangle className="h-4 w-4 mr-2 text-orange-400" />
                            <span className="text-orange-200 font-semibold">{pii.category}</span>
                          </div>
                          <p className="text-orange-100 text-sm">{pii.context}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-semibold mb-3 flex items-center">
                    <Users className="h-5 w-5 mr-2 text-orange-400" />
                    Overall Interaction Style
                  </h3>
                  <p className="text-slate-300 leading-relaxed bg-slate-800/50 p-4 rounded-lg">
                    {data.fbiReport.overallInteractionStyle}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-700 pt-4">
              <p className="text-xs text-slate-400 italic">
                {data.fbiReport.disclaimer}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Linguistic Fingerprint Section */}
      {data.linguisticFingerprint && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg overflow-hidden border border-amber-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4 text-white">
            <div className="flex items-center space-x-3">
              <Fingerprint className="h-6 w-6" />
              <h2 className="text-2xl font-bold">{data.linguisticFingerprint.reportTitle}</h2>
            </div>
            <p className="text-amber-100 mt-1">Computational Linguistics Analysis</p>
          </div>

          {/* Content */}
          <div className="p-8 space-y-8">
            <div>
              <h3 className="text-2xl font-semibold mb-4 flex items-center text-amber-800">
                <BookOpen className="h-6 w-6 mr-2" />
                Overall Style Description
              </h3>
              <p className="text-amber-900 leading-relaxed text-lg bg-white/70 p-6 rounded-lg border border-amber-200">
                {data.linguisticFingerprint.overallStyleDescription}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center text-amber-800">
                  <Database className="h-5 w-5 mr-2" />
                  Vocabulary Profile
                </h3>
                <div className="bg-white/70 p-6 rounded-lg border border-amber-200 space-y-4">
                  <div>
                    <h4 className="font-semibold text-amber-700 mb-2">Qualitative Assessment</h4>
                    <p className="text-amber-900 leading-relaxed">
                      {data.linguisticFingerprint.vocabularyProfile?.qualitativeAssessment}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-700 mb-3">Notable Words</h4>
                    <div className="flex flex-wrap gap-2">
                      {data.linguisticFingerprint.vocabularyProfile?.notableWords?.map((word: string, index: number) => (
                        <Badge key={index} className="bg-amber-600 hover:bg-amber-700 text-white">
                          <Code className="h-3 w-3 mr-1" />
                          {word}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3 flex items-center text-amber-800">
                    <FileText className="h-5 w-5 mr-2" />
                    Sentence Structure
                  </h3>
                  <p className="text-amber-900 leading-relaxed bg-white/70 p-4 rounded-lg border border-amber-200">
                    {data.linguisticFingerprint.sentenceStructure}
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3 flex items-center text-amber-800">
                    <Sparkles className="h-5 w-5 mr-2" />
                    Expressiveness
                  </h3>
                  <p className="text-amber-900 leading-relaxed bg-white/70 p-4 rounded-lg border border-amber-200">
                    {data.linguisticFingerprint.expressiveness}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center text-amber-800">
                <Lightbulb className="h-5 w-5 mr-2" />
                Potential Interests Indicated by Language
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.linguisticFingerprint.potentialInterestsIndicatedByLanguage?.map((interest: string, index: number) => (
                  <div key={index} className="bg-gradient-to-br from-orange-100 to-amber-100 border border-orange-300 p-4 rounded-lg text-center">
                    <Cpu className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                    <p className="font-semibold text-orange-800">{interest}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-amber-300 pt-6">
              <p className="text-sm text-amber-700 italic bg-amber-100/50 p-4 rounded-lg">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                {data.linguisticFingerprint.disclaimer}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top 5 Most Interesting Conversations */}
      {data.topInterestingConversations && (
        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
            <CardTitle className="flex items-center text-xl">
              <Trophy className="h-6 w-6 mr-2" />
              Top 5 Most Interesting Conversations
            </CardTitle>
            <CardDescription className="text-purple-100">
              Your most unique and thought-provoking interactions
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-6">
              {data.topInterestingConversations.map((conversation: any, index: number) => (
                <div key={index} className="flex items-start space-x-4 p-6 bg-white/70 rounded-lg border border-purple-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-purple-900 text-lg mb-2">
                      {conversation.title || 'Untitled Conversation'}
                    </h4>
                    <p className="text-purple-700 leading-relaxed">
                      {conversation.justification}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reality TV Persona */}
      {data.realityTVPersona && (
        <Card className="bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-pink-600 to-rose-600 text-white">
            <CardTitle className="flex items-center text-xl">
              <Tv className="h-6 w-6 mr-2" />
              {data.realityTVPersona.reportTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h3 className="text-3xl font-bold text-pink-900 mb-4">
                "{data.realityTVPersona.personaArchetype}"
              </h3>
              <p className="text-pink-800 text-lg leading-relaxed bg-white/70 p-6 rounded-lg border border-pink-200">
                {data.realityTVPersona.description}
              </p>
            </div>
            
            {data.realityTVPersona.popCultureComparisons && (
              <div className="mb-6">
                <h4 className="font-semibold text-pink-800 mb-3 text-center">Also seen as...</h4>
                <div className="flex flex-wrap justify-center gap-3">
                  {data.realityTVPersona.popCultureComparisons.map((comparison: string, index: number) => (
                    <Badge key={index} variant="outline" className="bg-pink-100 border-pink-300 text-pink-800 px-4 py-2">
                      <Star className="h-3 w-3 mr-1" />
                      {comparison}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center">
              <p className="text-sm text-pink-600 italic bg-pink-100/50 p-3 rounded-lg">
                {data.realityTVPersona.disclaimer}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PII Safety Compass */}
      {data.piiSafetyCompass && (
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
            <CardTitle className="flex items-center text-xl">
              <Compass className="h-6 w-6 mr-2" />
              {data.piiSafetyCompass.reportTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <div className={`w-32 h-32 rounded-full border-8 flex items-center justify-center ${
                  data.piiSafetyCompass.awarenessScore === 'Low Risk' 
                    ? 'border-green-500 bg-green-100' 
                    : data.piiSafetyCompass.awarenessScore === 'Medium Risk'
                    ? 'border-yellow-500 bg-yellow-100'
                    : 'border-red-500 bg-red-100'
                }`}>
                  <div className="text-center">
                    <Gauge className={`h-8 w-8 mx-auto mb-1 ${
                      data.piiSafetyCompass.awarenessScore === 'Low Risk' 
                        ? 'text-green-600' 
                        : data.piiSafetyCompass.awarenessScore === 'Medium Risk'
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`} />
                    <p className={`font-bold text-sm ${
                      data.piiSafetyCompass.awarenessScore === 'Low Risk' 
                        ? 'text-green-800' 
                        : data.piiSafetyCompass.awarenessScore === 'Medium Risk'
                        ? 'text-yellow-800'
                        : 'text-red-800'
                    }`}>
                      {data.piiSafetyCompass.awarenessScore}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-emerald-800 text-lg leading-relaxed bg-white/70 p-4 rounded-lg border border-emerald-200">
                {data.piiSafetyCompass.summary}
              </p>
            </div>

            {data.piiSafetyCompass.detailedBreakdown && (
              <div className="space-y-4">
                <h4 className="font-semibold text-emerald-800 text-center mb-4">Actionable Privacy Tips</h4>
                {data.piiSafetyCompass.detailedBreakdown.map((item: any, index: number) => (
                  <div key={index} className="flex items-start space-x-3 p-4 bg-white/70 rounded-lg border border-emerald-200">
                    <div className="flex-shrink-0">
                      {item.category.includes('Email') && <Mail className="h-5 w-5 text-emerald-600" />}
                      {item.category.includes('Phone') && <Phone className="h-5 w-5 text-emerald-600" />}
                      {item.category.includes('Location') && <MapPin className="h-5 w-5 text-emerald-600" />}
                      {item.category.includes('Financial') && <CreditCard className="h-5 w-5 text-emerald-600" />}
                      {item.category.includes('Name') && <User className="h-5 w-5 text-emerald-600" />}
                      {!item.category.includes('Email') && !item.category.includes('Phone') && !item.category.includes('Location') && !item.category.includes('Financial') && !item.category.includes('Name') && <Shield className="h-5 w-5 text-emerald-600" />}
                    </div>
                    <div>
                      <h5 className="font-semibold text-emerald-800 mb-1">{item.category}</h5>
                      <p className="text-emerald-700">{item.advice}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-emerald-600 italic bg-emerald-100/50 p-3 rounded-lg">
                {data.piiSafetyCompass.disclaimer}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* The Unfiltered Mirror */}
      {data.unfilteredMirror && (
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg overflow-hidden min-h-[400px] flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-blue-900/20"></div>
          <div className="relative z-10 text-center px-8 py-12">
            <Mirror className="h-16 w-16 text-white/80 mx-auto mb-8" />
            <h2 className="text-2xl font-bold text-white/90 mb-8 tracking-wide">
              {data.unfilteredMirror.reportTitle}
            </h2>
            <blockquote className="text-2xl md:text-3xl lg:text-4xl font-serif text-white leading-relaxed max-w-4xl mx-auto mb-8">
              "{data.unfilteredMirror.observation}"
            </blockquote>
            <p className="text-white/60 text-sm italic max-w-2xl mx-auto">
              {data.unfilteredMirror.disclaimer}
            </p>
          </div>
        </div>
      )}

      {/* Digital Doppelgänger */}
      {data.digitalDoppelganger && (
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
            <CardTitle className="flex items-center text-xl">
              <User className="h-6 w-6 mr-2" />
              {data.digitalDoppelganger.reportTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="max-w-md mx-auto bg-white rounded-lg border border-blue-200 p-6 shadow-lg">
              {/* Profile Picture Placeholder */}
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Camera className="h-8 w-8 text-white" />
              </div>
              
              {/* Handle */}
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-blue-900 flex items-center justify-center">
                  <AtSign className="h-5 w-5 mr-1" />
                  {data.digitalDoppelganger.handle?.replace('@', '') || 'username'}
                </h3>
              </div>

              {/* Bio */}
              <div className="mb-6">
                <p className="text-blue-800 leading-relaxed text-center">
                  {data.digitalDoppelganger.bio}
                </p>
              </div>

              {/* Hashtags */}
              {data.digitalDoppelganger.topHashtags && (
                <div className="flex flex-wrap justify-center gap-2">
                  {data.digitalDoppelganger.topHashtags.map((hashtag: string, index: number) => (
                    <Badge key={index} className="bg-blue-500 hover:bg-blue-600 text-white cursor-pointer">
                      #{hashtag.replace('#', '')}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-blue-600 italic bg-blue-100/50 p-3 rounded-lg">
                {data.digitalDoppelganger.disclaimer}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReportPage;