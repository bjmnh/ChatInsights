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
  AlertTriangle
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
    navigate('/dashboard');
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
  } else {
    return <ReportCardDeck reportData={reportData} onBack={handleBack} />;
  }
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