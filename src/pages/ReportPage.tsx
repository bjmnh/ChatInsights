import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  ArrowLeft, 
  BarChart3,
  Loader2,
  AlertTriangle,
  Brain,
  FileText,
  Users,
  Tv,
  Eye,
  Shield,
  Globe,
  ArrowRight,
  MessageSquare,
  Calendar,
  Hash,
  TrendingUp,
  Clock,
  Target
} from 'lucide-react';
import { motion } from 'framer-motion';
import { FileService, type Report } from '../services/fileService';
import { ReportCardDeck } from '../components/reports/ReportCardDeck';
import { toast } from 'sonner';

const ReportPage: React.FC = () => {
  const { fileId, reportType } = useParams<{ fileId: string; reportType: 'basic' | 'premium' }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCardDeck, setShowCardDeck] = useState(false);
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [isSampleReport, setIsSampleReport] = useState(false);

  useEffect(() => {
    // Check if this is a sample report
    if (fileId === 'sample' && reportType === 'premium' && location.state?.isSample) {
      setIsSampleReport(true);
      setReport({
        id: 'sample',
        user_id: 'sample',
        file_id: 'sample',
        report_type: 'premium',
        report_data: location.state.sampleReport,
        generated_at: new Date().toISOString()
      });
      setLoading(false);
      return;
    }

    if (!user || !fileId || !reportType) {
      navigate('/dashboard');
      return;
    }

    fetchReport();
  }, [user, fileId, reportType, navigate, location.state]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const reports = await FileService.getFileReports(fileId!);
      const targetReport = reports.find(r => r.report_type === reportType);
      
      if (!targetReport) {
        setError(`${reportType === 'basic' ? 'Basic' : 'Premium'} report not found`);
        return;
      }

      setReport(targetReport);
    } catch (error) {
      console.error('Error fetching report:', error);
      setError('Failed to load report');
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (showCardDeck) {
      setShowCardDeck(false);
    } else if (isSampleReport) {
      navigate('/');
    } else {
      navigate('/dashboard');
    }
  };

  const handleCardSelect = (cardIndex: number) => {
    setSelectedCardIndex(cardIndex);
    setShowCardDeck(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg text-muted-foreground">Loading your insights...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={handleBack}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {isSampleReport ? 'Back to Home' : 'Back to Dashboard'}
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const reportData = report.report_data;

  if (reportType === 'basic') {
    return <BasicReportView report={reportData} onBack={handleBack} isSample={isSampleReport} />;
  }

  if (showCardDeck) {
    return (
      <ReportCardDeck 
        reportData={reportData} 
        onBack={handleBack}
        initialCardIndex={selectedCardIndex}
      />
    );
  }

  return <PremiumReportOverview reportData={reportData} onBack={handleBack} onCardSelect={handleCardSelect} isSample={isSampleReport} />;
};

// Premium Report Overview Component
const PremiumReportOverview: React.FC<{ 
  reportData: any; 
  onBack: () => void; 
  onCardSelect: (index: number) => void;
  isSample?: boolean;
}> = ({ reportData, onBack, onCardSelect, isSample = false }) => {
  
  const availableInsights = [
    {
      id: 'fbi',
      title: 'Digital Behavioral Analysis',
      description: 'A comprehensive behavioral profile with psychological insights and operational assessment.',
      icon: Brain,
      gradient: 'from-amber-500 via-orange-500 to-red-500',
      iconBg: 'bg-gradient-to-br from-amber-400 to-orange-600',
      textColor: 'text-amber-100',
      borderColor: 'border-amber-500/30',
      hoverBorder: 'hover:border-amber-400',
      available: !!reportData.fbiReport,
      codename: reportData.fbiReport?.subjectCodename?.name
    },
    {
      id: 'linguistic',
      title: 'Linguistic Fingerprint',
      description: 'Advanced analysis of your language patterns, vocabulary, and communication style.',
      icon: FileText,
      gradient: 'from-blue-500 via-cyan-500 to-teal-500',
      iconBg: 'bg-gradient-to-br from-blue-400 to-cyan-600',
      textColor: 'text-blue-100',
      borderColor: 'border-blue-500/30',
      hoverBorder: 'hover:border-blue-400',
      available: !!reportData.linguisticFingerprint
    },
    {
      id: 'top5',
      title: 'Most Fascinating Conversations',
      description: 'Your 5 most intellectually unique and engaging conversation topics.',
      icon: Users,
      gradient: 'from-purple-500 via-violet-500 to-indigo-500',
      iconBg: 'bg-gradient-to-br from-purple-400 to-indigo-600',
      textColor: 'text-purple-100',
      borderColor: 'border-purple-500/30',
      hoverBorder: 'hover:border-purple-400',
      available: !!reportData.topInterestingConversations
    },
    {
      id: 'reality',
      title: 'Reality TV Persona',
      description: 'Your personality archetype and how you\'d appear on reality television.',
      icon: Tv,
      gradient: 'from-pink-500 via-rose-500 to-red-500',
      iconBg: 'bg-gradient-to-br from-pink-400 to-rose-600',
      textColor: 'text-pink-100',
      borderColor: 'border-pink-500/30',
      hoverBorder: 'hover:border-pink-400',
      available: !!reportData.realityTVPersona
    },
    {
      id: 'mirror',
      title: 'The Unfiltered Mirror',
      description: 'A profound, unvarnished observation about your inner patterns and motivations.',
      icon: Eye,
      gradient: 'from-gray-700 via-slate-600 to-gray-800',
      iconBg: 'bg-gradient-to-br from-gray-600 to-slate-800',
      textColor: 'text-gray-100',
      borderColor: 'border-gray-500/30',
      hoverBorder: 'hover:border-gray-400',
      available: !!reportData.unfilteredMirror
    },
    {
      id: 'pii',
      title: 'PII Safety Compass',
      description: 'Analysis of your information sharing patterns and privacy security recommendations.',
      icon: Shield,
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      iconBg: 'bg-gradient-to-br from-green-400 to-emerald-600',
      textColor: 'text-green-100',
      borderColor: 'border-green-500/30',
      hoverBorder: 'hover:border-green-400',
      available: !!reportData.piiSafetyCompass
    },
    {
      id: 'doppelganger',
      title: 'Digital Doppelgänger',
      description: 'Your hypothetical social media profile based on your communication patterns.',
      icon: Globe,
      gradient: 'from-indigo-500 via-blue-500 to-cyan-500',
      iconBg: 'bg-gradient-to-br from-indigo-400 to-blue-600',
      textColor: 'text-indigo-100',
      borderColor: 'border-indigo-500/30',
      hoverBorder: 'hover:border-indigo-400',
      available: !!reportData.digitalDoppelganger
    }
  ].filter(insight => insight.available);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="secondary"
          onClick={onBack}
          className="mb-8 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow hover:shadow-lg transition-all"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {isSample ? 'Back to Home' : 'Back to Dashboard'}
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {isSample ? 'Sample Premium Insights' : 'Your Premium Insights'}
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            {isSample 
              ? 'Explore this sample analysis to see the depth of insights available with premium reports'
              : 'Explore deep AI-powered analysis of your conversation patterns and digital personality'
            }
          </p>
          <div className="w-32 h-1 bg-gradient-to-r from-blue-400 to-purple-600 mx-auto mt-6 rounded-full" />
        </motion.div>

        {availableInsights.length === 0 ? (
          <div className="text-center py-16">
            <AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No Insights Available</h2>
            <p className="text-gray-400">No premium insights were generated for this analysis.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {availableInsights.map((insight, index) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                whileHover={{ scale: 1.02, y: -8 }}
                className="group cursor-pointer"
                onClick={() => onCardSelect(index)}
              >
                <Card className={`h-full bg-gradient-to-br from-slate-800/50 to-slate-900/50 border ${insight.borderColor} ${insight.hoverBorder} transition-all duration-300 backdrop-blur-sm hover:shadow-2xl hover:shadow-white/10`}>
                  <CardHeader className="pb-4">
                    <div className={`w-20 h-20 rounded-2xl ${insight.iconBg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <insight.icon className={`h-10 w-10 ${insight.textColor}`} />
                    </div>
                    <CardTitle className="text-white text-2xl mb-4 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all duration-300">
                      {insight.title}
                    </CardTitle>
                    {insight.codename && (
                      <div className="mb-4">
                        <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                          Codename: {insight.codename}
                        </Badge>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 text-base leading-relaxed mb-6">
                      {insight.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center text-sm font-medium bg-gradient-to-r ${insight.gradient} bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300`}>
                        Explore Insight
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {availableInsights.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center mt-12"
          >
            <p className="text-gray-400 text-sm">
              Click on any insight card to explore it in detail. Use the navigation arrows to move between insights.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// Enhanced Basic Report View
const BasicReportView: React.FC<{ report: any; onBack: () => void; isSample?: boolean }> = ({ report, onBack, isSample = false }) => {
  const stats = [
    {
      icon: MessageSquare,
      label: 'Total Conversations',
      value: report.totalConversations,
      color: 'from-blue-500 to-cyan-500',
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-400'
    },
    {
      icon: BarChart3,
      label: 'Total Messages',
      value: report.totalMessages,
      color: 'from-purple-500 to-pink-500',
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-400'
    },
    {
      icon: Users,
      label: 'Your Messages',
      value: report.userMessagesCount,
      color: 'from-green-500 to-emerald-500',
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-400'
    },
    {
      icon: FileText,
      label: 'Avg Message Length',
      value: `${report.averageUserMessageLength} chars`,
      color: 'from-orange-500 to-red-500',
      iconBg: 'bg-orange-500/20',
      iconColor: 'text-orange-400'
    },
    {
      icon: Hash,
      label: 'Vocabulary Size',
      value: `${report.userVocabularySizeEstimate} words`,
      color: 'from-teal-500 to-blue-500',
      iconBg: 'bg-teal-500/20',
      iconColor: 'text-teal-400'
    },
    {
      icon: Calendar,
      label: 'Conversation Span',
      value: `${report.conversationDaysSpan || 0} days`,
      color: 'from-indigo-500 to-purple-500',
      iconBg: 'bg-indigo-500/20',
      iconColor: 'text-indigo-400'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={onBack} 
          className="mb-8 text-white hover:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {isSample ? 'Back to Home' : 'Back to Dashboard'}
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {isSample ? 'Sample Conversation Analytics' : 'Your Conversation Analytics'}
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Essential insights into your communication patterns and conversation data
          </p>
          <div className="w-32 h-1 bg-gradient-to-r from-blue-400 to-purple-600 mx-auto mt-6 rounded-full" />
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              whileHover={{ scale: 1.02, y: -4 }}
            >
              <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 backdrop-blur-sm hover:shadow-xl hover:shadow-white/5">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                      <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                    </div>
                    <div className={`text-2xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                      {stat.value}
                    </div>
                  </div>
                  <h3 className="text-white font-medium text-lg">{stat.label}</h3>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Most Used Words */}
        {report.mostUsedUserWords && report.mostUsedUserWords.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-12"
          >
            <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-2xl flex items-center">
                  <TrendingUp className="h-6 w-6 mr-3 text-blue-400" />
                  Most Frequently Used Words
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {report.mostUsedUserWords.slice(0, 15).map((word: any, index: number) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1 + index * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <Badge 
                        variant="secondary" 
                        className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30 hover:border-blue-400/50 transition-colors text-sm py-2 px-4"
                      >
                        {word.word} ({word.count})
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Activity Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Activity Summary */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2 }}
          >
            <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 backdrop-blur-sm h-full">
              <CardHeader>
                <CardTitle className="text-white text-xl flex items-center">
                  <Clock className="h-5 w-5 mr-3 text-green-400" />
                  Activity Patterns
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {report.mostActiveHour && (
                  <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <span className="text-gray-300">Most Active Hour</span>
                    <span className="text-green-400 font-semibold">{report.mostActiveHour}</span>
                  </div>
                )}
                {report.mostActiveDay && (
                  <div className="flex items-center justify-between p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <span className="text-gray-300">Most Active Day</span>
                    <span className="text-blue-400 font-semibold">{report.mostActiveDay}</span>
                  </div>
                )}
                <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <span className="text-gray-300">Avg Words per Sentence</span>
                  <span className="text-purple-400 font-semibold">{report.averageWordsPerUserSentence}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Communication Style */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2 }}
          >
            <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 backdrop-blur-sm h-full">
              <CardHeader>
                <CardTitle className="text-white text-xl flex items-center">
                  <Target className="h-5 w-5 mr-3 text-orange-400" />
                  Communication Style
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <span className="text-gray-300">Question Marks Used</span>
                  <span className="text-orange-400 font-semibold">{report.questionMarksUsedByUser || 0}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                  <span className="text-gray-300">Exclamation Marks Used</span>
                  <span className="text-red-400 font-semibold">{report.exclamationMarksUsedByUser || 0}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                  <span className="text-gray-300">User to AI Ratio</span>
                  <span className="text-cyan-400 font-semibold">{report.userToAiMessageRatio?.toFixed(2) || 'N/A'}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Upgrade Prompt */}
        {!isSample && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6 }}
            className="mt-12 text-center"
          >
            <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/30 backdrop-blur-sm">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-white mb-4">Want Deeper Insights?</h3>
                <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                  Upgrade to premium analysis for psychological profiling, personality insights, 
                  linguistic fingerprinting, and much more detailed behavioral analysis.
                </p>
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-8 py-3"
                  onClick={onBack}
                >
                  Generate Premium Report
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ReportPage;