import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { FileService, type Report } from '../services/fileService';
import { ReportCardDeck } from '../components/reports/ReportCardDeck';
import { toast } from 'sonner';

const ReportPage: React.FC = () => {
  const { fileId, reportType } = useParams<{ fileId: string; reportType: 'basic' | 'premium' }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCardDeck, setShowCardDeck] = useState(false);
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);

  useEffect(() => {
    if (!user || !fileId || !reportType) {
      navigate('/dashboard');
      return;
    }

    fetchReport();
  }, [user, fileId, reportType, navigate]);

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
          Back to Dashboard
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
    return <BasicReportView report={reportData} onBack={handleBack} />;
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

  return <PremiumReportOverview reportData={reportData} onBack={handleBack} onCardSelect={handleCardSelect} />;
};

// Premium Report Overview Component
const PremiumReportOverview: React.FC<{ 
  reportData: any; 
  onBack: () => void; 
  onCardSelect: (index: number) => void;
}> = ({ reportData, onBack, onCardSelect }) => {
  
  const availableInsights = [
    {
      id: 'fbi',
      title: 'Digital Behavioral Analysis',
      subtitle: 'FBI-Style Dossier',
      description: 'A comprehensive behavioral profile with psychological insights and operational assessment.',
      icon: Brain,
      color: 'from-amber-500 to-orange-600',
      textColor: 'text-amber-100',
      available: !!reportData.fbiReport,
      codename: reportData.fbiReport?.subjectCodename?.name
    },
    {
      id: 'linguistic',
      title: 'Linguistic Fingerprint',
      subtitle: 'Communication Analysis',
      description: 'Advanced analysis of your language patterns, vocabulary, and communication style.',
      icon: FileText,
      color: 'from-blue-500 to-cyan-600',
      textColor: 'text-blue-100',
      available: !!reportData.linguisticFingerprint
    },
    {
      id: 'top5',
      title: 'Most Fascinating Conversations',
      subtitle: 'Curated Collection',
      description: 'Your 5 most intellectually unique and engaging conversation topics.',
      icon: Users,
      color: 'from-purple-500 to-indigo-600',
      textColor: 'text-purple-100',
      available: !!reportData.topInterestingConversations
    },
    {
      id: 'reality',
      title: 'Reality TV Persona',
      subtitle: 'Entertainment Profile',
      description: 'Your personality archetype and how you\'d appear on reality television.',
      icon: Tv,
      color: 'from-pink-500 to-rose-600',
      textColor: 'text-pink-100',
      available: !!reportData.realityTVPersona
    },
    {
      id: 'mirror',
      title: 'The Unfiltered Mirror',
      subtitle: 'Deep Reflection',
      description: 'A profound, unvarnished observation about your inner patterns and motivations.',
      icon: Eye,
      color: 'from-gray-800 to-black',
      textColor: 'text-gray-100',
      available: !!reportData.unfilteredMirror
    },
    {
      id: 'pii',
      title: 'PII Safety Compass',
      subtitle: 'Privacy Assessment',
      description: 'Analysis of your information sharing patterns and privacy security recommendations.',
      icon: Shield,
      color: 'from-green-500 to-emerald-600',
      textColor: 'text-green-100',
      available: !!reportData.piiSafetyCompass
    },
    {
      id: 'doppelganger',
      title: 'Digital Doppelgänger',
      subtitle: 'Social Media Twin',
      description: 'Your hypothetical social media profile based on your communication patterns.',
      icon: Globe,
      color: 'from-indigo-500 to-purple-600',
      textColor: 'text-indigo-100',
      available: !!reportData.digitalDoppelganger
    }
  ].filter(insight => insight.available);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="mb-8 text-white hover:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Your Premium Insights
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Explore deep AI-powered analysis of your conversation patterns and digital personality
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableInsights.map((insight, index) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                whileHover={{ scale: 1.02, y: -5 }}
                className="group cursor-pointer"
                onClick={() => onCardSelect(index)}
              >
                <Card className="h-full bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700 hover:border-slate-600 transition-all duration-300 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${insight.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <insight.icon className={`h-8 w-8 ${insight.textColor}`} />
                    </div>
                    <CardTitle className="text-white text-xl mb-2">
                      {insight.title}
                    </CardTitle>
                    <Badge variant="secondary" className="w-fit text-xs">
                      {insight.subtitle}
                    </Badge>
                    {insight.codename && (
                      <Badge variant="outline" className="w-fit text-xs mt-2 border-amber-500 text-amber-400">
                        Codename: {insight.codename}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 text-sm leading-relaxed mb-4">
                      {insight.description}
                    </p>
                    <div className="flex items-center text-blue-400 text-sm font-medium group-hover:text-blue-300 transition-colors">
                      Explore Insight
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
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

// Basic Report View (unchanged)
const BasicReportView: React.FC<{ report: any; onBack: () => void }> = ({ report, onBack }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-6 w-6 mr-2" />
                Basic Analysis Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <h3 className="font-semibold">Conversations</h3>
                  <p className="text-2xl font-bold text-primary">{report.totalConversations}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold">Total Messages</h3>
                  <p className="text-2xl font-bold text-primary">{report.totalMessages}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold">Your Messages</h3>
                  <p className="text-2xl font-bold text-primary">{report.userMessagesCount}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold">Avg Message Length</h3>
                  <p className="text-2xl font-bold text-primary">{report.averageUserMessageLength} chars</p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold">Vocabulary Size</h3>
                  <p className="text-2xl font-bold text-primary">{report.userVocabularySizeEstimate} words</p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold">Conversation Span</h3>
                  <p className="text-2xl font-bold text-primary">{report.conversationDaysSpan || 0} days</p>
                </div>
              </div>

              {report.mostUsedUserWords && report.mostUsedUserWords.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-semibold mb-4">Most Used Words</h3>
                  <div className="flex flex-wrap gap-2">
                    {report.mostUsedUserWords.slice(0, 10).map((word: any, index: number) => (
                      <Badge key={index} variant="secondary">
                        {word.word} ({word.count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {report.activityByHourOfDay && (
                <div className="mt-8">
                  <h3 className="font-semibold mb-4">Activity by Hour</h3>
                  <div className="text-sm text-muted-foreground">
                    Most active hour: {report.mostActiveHour || 'N/A'}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ReportPage;