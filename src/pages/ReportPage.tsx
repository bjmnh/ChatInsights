import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Separator } from '../components/ui/separator';
import { 
  ArrowLeft, 
  FileText, 
  Crown, 
  Shield, 
  Eye, 
  Users, 
  Brain,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Target,
  Globe,
  Lock,
  User,
  MessageSquare,
  TrendingUp,
  BarChart3,
  Hash,
  Star,
  Gauge
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileService, type Report } from '../services/fileService';
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
          onClick={() => navigate('/dashboard')}
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
    return <BasicReportView report={reportData} onBack={() => navigate('/dashboard')} />;
  } else {
    return <PremiumReportView report={reportData} onBack={() => navigate('/dashboard')} />;
  }
};

// FBI Report Component with Declassified Document Theme
const FBIReportCard: React.FC<{ data: any }> = ({ data }) => {
  const [revealedPII, setRevealedPII] = useState<Set<number>>(new Set());

  const togglePIIReveal = (index: number) => {
    setRevealedPII(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, rotateY: -90 }}
      animate={{ opacity: 1, rotateY: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-8"
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 50%, rgba(139, 69, 19, 0.03) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(139, 69, 19, 0.03) 0%, transparent 50%),
          radial-gradient(circle at 40% 80%, rgba(139, 69, 19, 0.03) 0%, transparent 50%)
        `
      }}
    >
      {/* Watermark */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none opacity-5">
        <Brain className="h-96 w-96 text-amber-800" />
      </div>

      {/* Manila Folder Tab */}
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          {/* Folder Tab */}
          <div className="absolute -top-6 left-8 bg-amber-200 px-6 py-2 rounded-t-lg border-2 border-amber-300 border-b-0">
            <span className="font-mono text-sm font-bold text-amber-900">SUBJECT FILE</span>
          </div>

          {/* Main Document */}
          <div className="bg-gradient-to-b from-amber-50 to-yellow-50 border-4 border-amber-300 shadow-2xl relative overflow-hidden">
            {/* Confidential Stamp */}
            <div className="absolute top-4 right-4 transform rotate-12">
              <div className="bg-red-600 text-white px-4 py-2 font-bold text-lg tracking-wider border-4 border-red-700 shadow-lg">
                CONFIDENTIAL
              </div>
            </div>

            <div className="p-12">
              {/* Header */}
              <div className="text-center mb-8 border-b-2 border-amber-400 pb-6">
                <h1 className="font-mono text-2xl font-bold text-amber-900 mb-2 tracking-wide">
                  {data.reportTitle || "DIGITAL BEHAVIORAL ANALYSIS DOSSIER"}
                </h1>
                <div className="text-xs font-mono text-amber-700">
                  CLASSIFICATION: CONFIDENTIAL • EYES ONLY
                </div>
              </div>

              {/* Subject Codename - The Star */}
              <div className="text-center mb-8">
                <div className="inline-block transform -rotate-2 bg-red-600 text-white p-6 shadow-xl border-4 border-red-700">
                  <div className="text-xs font-mono mb-2">SUBJECT CODENAME:</div>
                  <div className="text-4xl font-black tracking-wider">
                    {data.subjectCodename?.name || "THE ANALYST"}
                  </div>
                </div>
                {data.subjectCodename?.justification && (
                  <p className="mt-4 font-mono text-sm text-amber-800 italic">
                    "{data.subjectCodename.justification}"
                  </p>
                )}
              </div>

              {/* Profile Summary */}
              <div className="mb-8">
                <h2 className="font-mono text-lg font-bold text-amber-900 mb-4 border-b border-amber-400 pb-2">
                  SUBJECT PROFILE SUMMARY
                </h2>
                <p className="font-mono text-sm leading-relaxed text-amber-800 bg-amber-100 p-4 border-l-4 border-amber-500">
                  {data.subjectProfileSummary}
                </p>
              </div>

              {/* Psychological Profile */}
              {data.psychologicalProfile && (
                <div className="mb-8">
                  <h2 className="font-mono text-lg font-bold text-amber-900 mb-4 border-b border-amber-400 pb-2">
                    PSYCHOLOGICAL ASSESSMENT
                  </h2>
                  <p className="font-mono text-sm leading-relaxed text-amber-800 bg-amber-100 p-4 border-l-4 border-amber-500">
                    {data.psychologicalProfile}
                  </p>
                </div>
              )}

              {/* Dominant Interests */}
              <div className="mb-8">
                <h2 className="font-mono text-lg font-bold text-amber-900 mb-4 border-b border-amber-400 pb-2">
                  PRIMARY AREAS OF INTEREST
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {(data.dominantInterests || []).map((interest: string, index: number) => (
                    <div key={index} className="bg-amber-200 px-3 py-2 font-mono text-sm text-amber-900 border border-amber-400">
                      • {interest}
                    </div>
                  ))}
                </div>
              </div>

              {/* PII Examples with Redaction */}
              {data.piiExamples && data.piiExamples.length > 0 && (
                <div className="mb-8">
                  <h2 className="font-mono text-lg font-bold text-amber-900 mb-4 border-b border-amber-400 pb-2">
                    INFORMATION DISCLOSURE PATTERNS
                  </h2>
                  <div className="space-y-3">
                    {data.piiExamples.slice(0, 5).map((pii: any, index: number) => (
                      <div key={index} className="bg-amber-100 p-4 border border-amber-400">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-xs font-bold text-red-700">
                            {pii.category || 'CLASSIFIED'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePIIReveal(index)}
                            className="text-xs font-mono"
                          >
                            {revealedPII.has(index) ? 'HIDE' : 'REVEAL'}
                          </Button>
                        </div>
                        <div className="font-mono text-sm">
                          {revealedPII.has(index) ? (
                            <span className="text-amber-800">"{pii.pii}"</span>
                          ) : (
                            <span className="bg-black text-black select-none px-8 py-1">
                              [CLASSIFIED]
                            </span>
                          )}
                        </div>
                        <div className="mt-2 font-mono text-xs text-amber-700">
                          Context: {pii.context}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Communication Style */}
              <div className="mb-8">
                <h2 className="font-mono text-lg font-bold text-amber-900 mb-4 border-b border-amber-400 pb-2">
                  INTERACTION METHODOLOGY
                </h2>
                <p className="font-mono text-sm leading-relaxed text-amber-800 bg-amber-100 p-4 border-l-4 border-amber-500">
                  {data.overallInteractionStyle}
                </p>
              </div>

              {/* Footer */}
              <div className="mt-12 pt-6 border-t-2 border-amber-400">
                <div className="text-center font-mono text-xs text-amber-600">
                  {data.disclaimer}
                </div>
                <div className="text-center font-mono text-xs text-amber-500 mt-2">
                  DOCUMENT GENERATED: {new Date().toLocaleDateString()} • CLASSIFICATION: CONFIDENTIAL
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Linguistic Fingerprint with Futuristic Lab Theme
const LinguisticFingerprintCard: React.FC<{ data: any }> = ({ data }) => {
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimationComplete(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 relative overflow-hidden"
    >
      {/* Animated Background Grid */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(249, 115, 22, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249, 115, 22, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Holographic Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-orange-400 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-white mb-4 tracking-wide">
            {data.reportTitle || "LINGUISTIC FINGERPRINT ANALYSIS"}
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-orange-400 to-orange-600 mx-auto rounded-full" />
        </motion.div>

        {/* Main Analysis Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-900/50 backdrop-blur-sm border border-orange-400/30 rounded-2xl p-8 mb-8 shadow-2xl"
        >
          <h2 className="text-2xl font-semibold text-orange-400 mb-6 flex items-center">
            <Brain className="h-6 w-6 mr-3" />
            OVERALL LINGUISTIC PROFILE
          </h2>
          <p className="text-white text-lg leading-relaxed">
            {data.overallStyleDescription}
          </p>
        </motion.div>

        {/* Analysis Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Vocabulary Profile */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-slate-900/50 backdrop-blur-sm border border-orange-400/30 rounded-2xl p-6 shadow-xl"
          >
            <h3 className="text-xl font-semibold text-orange-400 mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              VOCABULARY ANALYSIS
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-white font-medium mb-2">Assessment:</h4>
                <p className="text-slate-300 text-sm">
                  {data.vocabularyProfile?.qualitativeAssessment}
                </p>
              </div>
              {data.vocabularyProfile?.notableWords && (
                <div>
                  <h4 className="text-white font-medium mb-3">Notable Terms:</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.vocabularyProfile.notableWords.map((word: string, index: number) => (
                      <motion.span
                        key={index}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8 + index * 0.1 }}
                        className="px-3 py-1 bg-orange-400/20 text-orange-300 rounded-full text-sm border border-orange-400/30 hover:bg-orange-400/30 transition-colors cursor-default"
                      >
                        {word}
                      </motion.span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Sentence Structure Visualization */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-slate-900/50 backdrop-blur-sm border border-orange-400/30 rounded-2xl p-6 shadow-xl"
          >
            <h3 className="text-xl font-semibold text-orange-400 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              STRUCTURAL ANALYSIS
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-white font-medium mb-2">Sentence Structure:</h4>
                <p className="text-slate-300 text-sm">
                  {data.sentenceStructure}
                </p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-2">Expressiveness:</h4>
                <p className="text-slate-300 text-sm">
                  {data.expressiveness}
                </p>
              </div>
              {/* Animated Waveform */}
              <div className="mt-4">
                <div className="flex items-end justify-center space-x-1 h-16">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="bg-gradient-to-t from-orange-600 to-orange-400 w-2 rounded-t"
                      initial={{ height: 0 }}
                      animate={{ 
                        height: animationComplete ? `${Math.random() * 60 + 10}px` : 0 
                      }}
                      transition={{ 
                        delay: 1 + i * 0.05,
                        duration: 0.5,
                        ease: "easeOut"
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Interests Network */}
        {data.potentialInterestsIndicatedByLanguage && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-slate-900/50 backdrop-blur-sm border border-orange-400/30 rounded-2xl p-6 shadow-xl"
          >
            <h3 className="text-xl font-semibold text-orange-400 mb-6 flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              INTEREST NETWORK MAPPING
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {data.potentialInterestsIndicatedByLanguage.map((interest: string, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1 + index * 0.1 }}
                  className="relative"
                >
                  <div className="bg-orange-400/10 border border-orange-400/30 rounded-lg p-3 text-center hover:bg-orange-400/20 transition-colors">
                    <div className="w-2 h-2 bg-orange-400 rounded-full mx-auto mb-2" />
                    <span className="text-white text-sm">{interest}</span>
                  </div>
                  {/* Connection Lines */}
                  {index < data.potentialInterestsIndicatedByLanguage.length - 1 && (
                    <div className="absolute top-1/2 -right-2 w-4 h-px bg-orange-400/30" />
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-12 text-center"
        >
          <p className="text-slate-400 text-sm">
            {data.disclaimer}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

// Top 5 Conversations with Museum Gallery Theme
const Top5ConversationsCard: React.FC<{ data: any[] }> = ({ data }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % data.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + data.length) % data.length);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-950 relative overflow-hidden"
    >
      {/* Elegant Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, gold 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, gold 0%, transparent 50%)
          `,
          backgroundSize: '400px 400px'
        }} />
      </div>

      {/* Navigation */}
      <div className="absolute top-8 left-8 z-20">
        <div className="flex space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={prevSlide}
            className="text-white hover:text-gold-400"
            disabled={currentSlide === 0}
          >
            ←
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={nextSlide}
            className="text-white hover:text-gold-400"
            disabled={currentSlide === data.length - 1}
          >
            →
          </Button>
        </div>
      </div>

      {/* Slide Indicators */}
      <div className="absolute top-8 right-8 z-20 flex space-x-2">
        {data.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-colors ${
              index === currentSlide ? 'bg-yellow-400' : 'bg-white/30'
            }`}
          />
        ))}
      </div>

      {/* Slides */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="h-screen flex items-center justify-center p-8"
        >
          <div className="max-w-4xl mx-auto text-center">
            {/* Large Number */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-9xl font-bold text-yellow-400/20 pointer-events-none"
            >
              {currentSlide + 1}
            </motion.div>

            {/* Conversation Title */}
            <motion.h1
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-4xl md:text-6xl font-serif font-bold text-white mb-8 leading-tight"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              {data[currentSlide]?.title || `Conversation ${currentSlide + 1}`}
            </motion.h1>

            {/* Curator's Note */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-yellow-400 text-sm font-medium mb-4 tracking-wider uppercase">
                Curator's Note
              </div>
              <p className="text-white/90 text-lg leading-relaxed font-light">
                {data[currentSlide]?.justification}
              </p>
              {data[currentSlide]?.significance && (
                <p className="text-yellow-400/80 text-sm mt-4 italic">
                  {data[currentSlide].significance}
                </p>
              )}
            </motion.div>

            {/* Insights */}
            {data[currentSlide]?.insights && data[currentSlide].insights.length > 0 && (
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.8 }}
                className="mt-12"
              >
                <div className="flex flex-wrap justify-center gap-3">
                  {data[currentSlide].insights.map((insight: string, index: number) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-white/10 text-white/80 rounded-full text-sm border border-white/20"
                    >
                      {insight}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Progress Bar */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-64 h-1 bg-white/20 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600"
          initial={{ width: 0 }}
          animate={{ width: `${((currentSlide + 1) / data.length) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </motion.div>
  );
};

// Basic Report View
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

// Premium Report View with Card Deck
const PremiumReportView: React.FC<{ report: any; onBack: () => void }> = ({ report, onBack }) => {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const reportCards = [
    {
      id: 'fbi',
      title: 'Digital Behavioral Analysis',
      subtitle: 'FBI-Style Dossier',
      icon: Shield,
      color: 'from-amber-500 to-red-600',
      available: !!report.fbiReport,
      component: report.fbiReport ? <FBIReportCard data={report.fbiReport} /> : null
    },
    {
      id: 'linguistic',
      title: 'Linguistic Fingerprint',
      subtitle: 'Communication Analysis',
      icon: Brain,
      color: 'from-orange-500 to-orange-600',
      available: !!report.linguisticFingerprint,
      component: report.linguisticFingerprint ? <LinguisticFingerprintCard data={report.linguisticFingerprint} /> : null
    },
    {
      id: 'top5',
      title: 'Top 5 Conversations',
      subtitle: 'Greatest Hits',
      icon: Star,
      color: 'from-purple-500 to-indigo-600',
      available: !!report.topInterestingConversations,
      component: report.topInterestingConversations ? <Top5ConversationsCard data={report.topInterestingConversations} /> : null
    },
    {
      id: 'reality',
      title: 'Reality TV Persona',
      subtitle: 'Your TV Character',
      icon: Users,
      color: 'from-pink-500 to-rose-600',
      available: !!report.realityTVPersona
    },
    {
      id: 'mirror',
      title: 'The Unfiltered Mirror',
      subtitle: 'Deep Reflection',
      icon: Eye,
      color: 'from-slate-500 to-slate-700',
      available: !!report.unfilteredMirror
    },
    {
      id: 'pii',
      title: 'PII Safety Compass',
      subtitle: 'Privacy Analysis',
      icon: Lock,
      color: 'from-green-500 to-emerald-600',
      available: !!report.piiSafetyCompass
    },
    {
      id: 'doppelganger',
      title: 'Digital Doppelgänger',
      subtitle: 'Social Media Twin',
      icon: User,
      color: 'from-cyan-500 to-blue-600',
      available: !!report.digitalDoppelganger
    }
  ];

  if (selectedCard) {
    const card = reportCards.find(c => c.id === selectedCard);
    if (card?.component) {
      return (
        <div className="relative">
          <Button
            variant="ghost"
            onClick={() => setSelectedCard(null)}
            className="absolute top-4 left-4 z-50 bg-black/50 text-white hover:bg-black/70"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cards
          </Button>
          {card.component}
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-8">
      <div className="container mx-auto">
        <Button variant="ghost" onClick={onBack} className="mb-8 text-white hover:text-purple-300">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-white mb-4">Your Premium Insights</h1>
          <p className="text-purple-300 text-lg">Draw a card to explore your digital personality</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {reportCards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 50, rotateY: -15 }}
              animate={{ opacity: 1, y: 0, rotateY: 0 }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              whileHover={{ 
                scale: 1.05, 
                rotateY: 5,
                transition: { duration: 0.2 }
              }}
              className="cursor-pointer"
              onClick={() => card.available && card.component && setSelectedCard(card.id)}
            >
              <div className={`
                relative h-80 rounded-2xl p-6 shadow-2xl border border-white/10
                ${card.available 
                  ? `bg-gradient-to-br ${card.color} hover:shadow-3xl` 
                  : 'bg-gradient-to-br from-slate-700 to-slate-800 opacity-50'
                }
                transform transition-all duration-300
              `}>
                {/* Card Number */}
                <div className="absolute top-4 left-4 text-white/70 text-sm font-mono">
                  {String(index + 1).padStart(2, '0')}
                </div>

                {/* Status Indicator */}
                <div className="absolute top-4 right-4">
                  {card.available ? (
                    <CheckCircle className="h-5 w-5 text-white/80" />
                  ) : (
                    <XCircle className="h-5 w-5 text-white/50" />
                  )}
                </div>

                {/* Card Content */}
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <card.icon className="h-16 w-16 text-white mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">{card.title}</h3>
                  <p className="text-white/80 text-sm">{card.subtitle}</p>
                  
                  {!card.available && (
                    <div className="mt-4 text-white/60 text-xs">
                      Not available in this report
                    </div>
                  )}
                </div>

                {/* Holographic Effect */}
                {card.available && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-12"
        >
          <p className="text-purple-300/80 text-sm">
            Click on any available card to explore that aspect of your digital personality
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default ReportPage;