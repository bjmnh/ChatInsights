import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Brain, Shield, Eye, EyeOff, AlertTriangle, FileText, Stamp } from 'lucide-react';

interface FBIReportData {
  reportTitle: string;
  subjectCodename: {
    name: string;
    justification: string;
    operationalSignificance?: string;
  };
  subjectProfileSummary: string;
  psychologicalProfile?: string;
  dominantInterests: string[];
  communicationModalities: string[];
  emotionalToneAndEngagement: string;
  informationSharingTendencies: string;
  piiExamples: Array<{
    pii: string;
    context: string;
    category: string;
    riskLevel?: string;
    conversationContext?: string;
  }>;
  overallInteractionStyle: string;
  behavioralPatterns?: string[];
  potentialVulnerabilities?: string[];
  operationalAssessment?: string;
  disclaimer: string;
}

interface FBIReportCardProps {
  data: FBIReportData;
  onNavigate?: (direction: 'prev' | 'next') => void;
  showNavigation?: boolean;
}

export const FBIReportCard: React.FC<FBIReportCardProps> = ({ 
  data, 
  onNavigate, 
  showNavigation = false 
}) => {
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
      exit={{ opacity: 0, rotateY: 90 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="min-h-screen relative overflow-hidden"
      style={{
        background: `
          linear-gradient(135deg, #2c1810 0%, #3d2817 25%, #4a3220 50%, #3d2817 75%, #2c1810 100%),
          radial-gradient(circle at 30% 40%, rgba(139, 69, 19, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 70% 60%, rgba(160, 82, 45, 0.08) 0%, transparent 50%)
        `,
        backgroundSize: '400px 400px, 800px 800px, 600px 600px'
      }}
    >
      {/* Navigation Controls */}
      {showNavigation && onNavigate && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('prev')}
            className="absolute top-8 left-8 z-50 bg-amber-900/80 hover:bg-amber-800/80 text-amber-200 border border-amber-600/50 font-mono text-xs"
          >
            ← PREV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('next')}
            className="absolute top-8 right-8 z-50 bg-amber-900/80 hover:bg-amber-800/80 text-amber-200 border border-amber-600/50 font-mono text-xs"
          >
            NEXT →
          </Button>
        </>
      )}

      {/* Subtle Watermark */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] z-0">
        <Brain className="h-[800px] w-[800px] text-amber-800" />
      </div>

      {/* Textured Paper Overlay */}
      <div 
        className="absolute inset-0 opacity-30 mix-blend-multiply"
        style={{
          backgroundImage: `
            radial-gradient(circle at 1px 1px, rgba(139, 69, 19, 0.15) 1px, transparent 0),
            linear-gradient(45deg, transparent 40%, rgba(160, 82, 45, 0.05) 50%, transparent 60%)
          `,
          backgroundSize: '20px 20px, 100px 100px'
        }}
      />

      {/* Main Document Container */}
      <div className="max-w-5xl mx-auto p-8 relative z-10">
        {/* Manila Folder Tab */}
        <div className="relative mb-4">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute -top-8 left-12 bg-gradient-to-b from-amber-200 to-amber-300 px-8 py-3 rounded-t-lg border-2 border-amber-400 border-b-0 shadow-lg"
            style={{
              background: 'linear-gradient(to bottom, #f3e5ab 0%, #e6d690 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            <span className="font-mono text-sm font-bold text-amber-900 tracking-wider">
              SUBJECT FILE • CLASSIFIED
            </span>
          </motion.div>
        </div>

        {/* Main Document */}
        <motion.div 
          initial={{ y: 50, opacity: 0, rotateX: -15 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="relative bg-gradient-to-b from-amber-50 to-yellow-50 shadow-2xl border-4 border-amber-400 overflow-hidden"
          style={{
            background: `
              linear-gradient(to bottom, #fefcf3 0%, #fdf8e7 100%),
              radial-gradient(circle at 20% 20%, rgba(139, 69, 19, 0.02) 0%, transparent 50%)
            `,
            boxShadow: `
              0 20px 40px rgba(0,0,0,0.3),
              inset 0 1px 0 rgba(255,255,255,0.5),
              inset 0 -1px 0 rgba(139, 69, 19, 0.1)
            `
          }}
        >
          {/* Confidential Stamps */}
          <motion.div 
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 12 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="absolute top-6 right-6 z-20"
          >
            <div 
              className="bg-red-600 text-white px-6 py-3 font-black text-lg tracking-widest border-4 border-red-700 shadow-lg transform rotate-12"
              style={{
                fontFamily: 'Impact, Arial Black, sans-serif',
                textShadow: '2px 2px 0px rgba(0,0,0,0.3)',
                background: 'linear-gradient(45deg, #dc2626 0%, #b91c1c 100%)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
              }}
            >
              CONFIDENTIAL
            </div>
          </motion.div>

          <motion.div 
            initial={{ scale: 0, rotate: 45 }}
            animate={{ scale: 1, rotate: -8 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="absolute top-32 right-12 z-20"
          >
            <div 
              className="bg-red-600 text-white px-4 py-2 font-black text-sm tracking-widest border-3 border-red-700 shadow-lg transform -rotate-8"
              style={{
                fontFamily: 'Impact, Arial Black, sans-serif',
                textShadow: '1px 1px 0px rgba(0,0,0,0.3)',
                background: 'linear-gradient(45deg, #dc2626 0%, #b91c1c 100%)'
              }}
            >
              EYES ONLY
            </div>
          </motion.div>

          <div className="p-12 relative z-10">
            {/* Header */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="text-center mb-10 border-b-4 border-amber-600 pb-8"
            >
              <h1 
                className="font-mono text-3xl font-bold text-amber-900 mb-4 tracking-wide"
                style={{
                  fontFamily: 'Courier Prime, Courier New, monospace',
                  textShadow: '1px 1px 0px rgba(139, 69, 19, 0.2)'
                }}
              >
                {data.reportTitle}
              </h1>
              <div className="font-mono text-xs text-amber-700 tracking-widest">
                CLASSIFICATION: CONFIDENTIAL • DISTRIBUTION: RESTRICTED • EYES ONLY
              </div>
              <div className="font-mono text-xs text-amber-600 mt-2">
                DOCUMENT ID: {Math.random().toString(36).substr(2, 9).toUpperCase()} • DATE: {new Date().toLocaleDateString()}
              </div>
            </motion.div>

            {/* Subject Codename - The Centerpiece */}
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: -2 }}
              transition={{ delay: 1.4, duration: 0.8, type: "spring" }}
              className="text-center mb-12"
            >
              <div className="inline-block relative">
                {/* Stamp Shadow */}
                <div className="absolute inset-0 bg-red-900 transform translate-x-2 translate-y-2 rounded-lg opacity-30" />
                
                {/* Main Stamp */}
                <div 
                  className="relative bg-gradient-to-br from-red-600 to-red-800 text-white p-8 shadow-2xl border-4 border-red-700 transform -rotate-2"
                  style={{
                    background: `
                      linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%),
                      radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, transparent 50%)
                    `,
                    boxShadow: `
                      0 8px 16px rgba(0,0,0,0.4),
                      inset 0 1px 0 rgba(255,255,255,0.2),
                      inset 0 -1px 0 rgba(0,0,0,0.2)
                    `,
                    textShadow: '2px 2px 0px rgba(0,0,0,0.5)'
                  }}
                >
                  <div className="font-mono text-xs mb-3 tracking-widest opacity-90">
                    SUBJECT CODENAME:
                  </div>
                  <div 
                    className="text-5xl font-black tracking-wider"
                    style={{
                      fontFamily: 'Impact, Arial Black, sans-serif',
                      letterSpacing: '0.1em'
                    }}
                  >
                    {data.subjectCodename.name}
                  </div>
                  
                  {/* Stamp Border Details */}
                  <div className="absolute top-2 left-2 w-4 h-4 border-2 border-white/30 rounded-full" />
                  <div className="absolute top-2 right-2 w-4 h-4 border-2 border-white/30 rounded-full" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-2 border-white/30 rounded-full" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-2 border-white/30 rounded-full" />
                </div>
              </div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2 }}
                className="mt-6 max-w-2xl mx-auto"
              >
                <p className="font-mono text-sm text-amber-800 italic leading-relaxed bg-amber-100/50 p-4 border-l-4 border-amber-600">
                  <strong>Operational Justification:</strong> "{data.subjectCodename.justification}"
                </p>
                {data.subjectCodename.operationalSignificance && (
                  <p className="font-mono text-xs text-amber-700 mt-3 bg-amber-50 p-3 border border-amber-300">
                    <strong>Operational Significance:</strong> {data.subjectCodename.operationalSignificance}
                  </p>
                )}
              </motion.div>
            </motion.div>

            {/* Profile Summary */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.6 }}
              className="mb-10"
            >
              <h2 
                className="font-mono text-xl font-bold text-amber-900 mb-6 border-b-2 border-amber-500 pb-3 flex items-center"
                style={{ fontFamily: 'Courier Prime, Courier New, monospace' }}
              >
                <FileText className="h-5 w-5 mr-3" />
                SUBJECT PROFILE SUMMARY
              </h2>
              <div 
                className="font-mono text-sm leading-relaxed text-amber-800 bg-gradient-to-r from-amber-100 to-amber-50 p-6 border-l-8 border-amber-600 shadow-inner"
                style={{
                  fontFamily: 'Courier Prime, Courier New, monospace',
                  background: `
                    linear-gradient(to right, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%),
                    repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(139, 69, 19, 0.03) 25px)
                  `
                }}
              >
                {data.subjectProfileSummary}
              </div>
            </motion.div>

            {/* Psychological Profile */}
            {data.psychologicalProfile && (
              <motion.div 
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.8 }}
                className="mb-10"
              >
                <h2 
                  className="font-mono text-xl font-bold text-amber-900 mb-6 border-b-2 border-amber-500 pb-3 flex items-center"
                  style={{ fontFamily: 'Courier Prime, Courier New, monospace' }}
                >
                  <Brain className="h-5 w-5 mr-3" />
                  PSYCHOLOGICAL ASSESSMENT
                </h2>
                <div 
                  className="font-mono text-sm leading-relaxed text-amber-800 bg-gradient-to-r from-amber-100 to-amber-50 p-6 border-l-8 border-amber-600 shadow-inner"
                  style={{
                    fontFamily: 'Courier Prime, Courier New, monospace',
                    background: `
                      linear-gradient(to right, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%),
                      repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(139, 69, 19, 0.03) 25px)
                    `
                  }}
                >
                  {data.psychologicalProfile}
                </div>
              </motion.div>
            )}

            {/* Dominant Interests */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2 }}
              className="mb-10"
            >
              <h2 
                className="font-mono text-xl font-bold text-amber-900 mb-6 border-b-2 border-amber-500 pb-3"
                style={{ fontFamily: 'Courier Prime, Courier New, monospace' }}
              >
                PRIMARY AREAS OF INTEREST
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.dominantInterests.map((interest, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 2.2 + index * 0.1 }}
                    className="bg-gradient-to-r from-amber-200 to-amber-100 px-4 py-3 font-mono text-sm text-amber-900 border-2 border-amber-400 shadow-sm"
                    style={{
                      fontFamily: 'Courier Prime, Courier New, monospace',
                      background: 'linear-gradient(to right, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.1) 100%)'
                    }}
                  >
                    <span className="font-bold">•</span> {interest}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* PII Examples with Enhanced Redaction */}
            {data.piiExamples && data.piiExamples.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.4 }}
                className="mb-10"
              >
                <h2 
                  className="font-mono text-xl font-bold text-amber-900 mb-6 border-b-2 border-amber-500 pb-3 flex items-center"
                  style={{ fontFamily: 'Courier Prime, Courier New, monospace' }}
                >
                  <Shield className="h-5 w-5 mr-3" />
                  INFORMATION DISCLOSURE PATTERNS
                  <AlertTriangle className="h-4 w-4 ml-2 text-red-600" />
                </h2>
                <div className="space-y-4">
                  {data.piiExamples.slice(0, 5).map((pii, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 2.6 + index * 0.2 }}
                      className="bg-gradient-to-r from-amber-100 to-amber-50 p-5 border-2 border-amber-400 shadow-sm"
                      style={{
                        background: `
                          linear-gradient(to right, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%),
                          repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(139, 69, 19, 0.02) 3px)
                        `
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span 
                          className="font-mono text-xs font-black text-red-700 bg-red-100 px-3 py-1 border border-red-300"
                          style={{ fontFamily: 'Courier Prime, Courier New, monospace' }}
                        >
                          {pii.category}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePIIReveal(index)}
                          className="font-mono text-xs h-7 px-3 bg-amber-200 hover:bg-amber-300 text-amber-900 border border-amber-400"
                        >
                          {revealedPII.has(index) ? (
                            <>
                              <EyeOff className="h-3 w-3 mr-1" />
                              CONCEAL
                            </>
                          ) : (
                            <>
                              <Eye className="h-3 w-3 mr-1" />
                              DECLASSIFY
                            </>
                          )}
                        </Button>
                      </div>
                      
                      <div className="font-mono text-sm mb-3">
                        {revealedPII.has(index) ? (
                          <span className="text-amber-800 bg-yellow-100 px-2 py-1 border border-yellow-300">
                            "{pii.pii}"
                          </span>
                        ) : (
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="inline-block bg-black text-black select-none px-12 py-2 cursor-pointer border-2 border-black shadow-inner relative overflow-hidden"
                            style={{
                              background: `
                                linear-gradient(45deg, #000 25%, transparent 25%),
                                linear-gradient(-45deg, #000 25%, transparent 25%),
                                linear-gradient(45deg, transparent 75%, #000 75%),
                                linear-gradient(-45deg, transparent 75%, #000 75%)
                              `,
                              backgroundSize: '4px 4px',
                              backgroundPosition: '0 0, 0 2px, 2px -2px, -2px 0px'
                            }}
                          >
                            <span className="font-mono text-xs text-white/20 tracking-widest">
                              [CLASSIFIED]
                            </span>
                          </motion.div>
                        )}
                      </div>
                      
                      <div className="font-mono text-xs text-amber-700 mb-2">
                        <strong>Context:</strong> {pii.context}
                      </div>
                      
                      {pii.conversationContext && (
                        <div className="font-mono text-xs text-amber-600 mb-2">
                          <strong>Conversation Context:</strong> {pii.conversationContext}
                        </div>
                      )}
                      
                      {pii.riskLevel && (
                        <div className="font-mono text-xs">
                          <span className={`px-3 py-1 rounded text-white font-bold ${
                            pii.riskLevel === 'high' ? 'bg-red-600' :
                            pii.riskLevel === 'medium' ? 'bg-yellow-600' : 'bg-green-600'
                          }`}>
                            {pii.riskLevel.toUpperCase()} RISK
                          </span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Behavioral Patterns */}
            {data.behavioralPatterns && data.behavioralPatterns.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.8 }}
                className="mb-10"
              >
                <h2 
                  className="font-mono text-xl font-bold text-amber-900 mb-6 border-b-2 border-amber-500 pb-3"
                  style={{ fontFamily: 'Courier Prime, Courier New, monospace' }}
                >
                  BEHAVIORAL PATTERNS
                </h2>
                <div className="space-y-3">
                  {data.behavioralPatterns.map((pattern, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 3 + index * 0.1 }}
                      className="bg-gradient-to-r from-amber-100 to-amber-50 p-4 border-l-8 border-amber-600 shadow-sm"
                      style={{
                        background: `
                          linear-gradient(to right, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%),
                          repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(139, 69, 19, 0.02) 25px)
                        `
                      }}
                    >
                      <span 
                        className="font-mono text-sm text-amber-800"
                        style={{ fontFamily: 'Courier Prime, Courier New, monospace' }}
                      >
                        <span className="font-bold text-amber-900">•</span> {pattern}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Operational Assessment */}
            {data.operationalAssessment && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 3.2 }}
                className="mb-10"
              >
                <h2 
                  className="font-mono text-xl font-bold text-amber-900 mb-6 border-b-2 border-amber-500 pb-3"
                  style={{ fontFamily: 'Courier Prime, Courier New, monospace' }}
                >
                  OPERATIONAL ASSESSMENT
                </h2>
                <div 
                  className="font-mono text-sm leading-relaxed text-amber-800 bg-gradient-to-r from-amber-100 to-amber-50 p-6 border-l-8 border-amber-600 shadow-inner"
                  style={{
                    fontFamily: 'Courier Prime, Courier New, monospace',
                    background: `
                      linear-gradient(to right, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%),
                      repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(139, 69, 19, 0.03) 25px)
                    `
                  }}
                >
                  {data.operationalAssessment}
                </div>
              </motion.div>
            )}

            {/* Footer */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3.4 }}
              className="mt-16 pt-8 border-t-4 border-amber-600"
            >
              <div 
                className="text-center font-mono text-xs text-amber-600 leading-relaxed bg-amber-50 p-4 border border-amber-300"
                style={{ fontFamily: 'Courier Prime, Courier New, monospace' }}
              >
                <div className="mb-2 font-bold tracking-wider">CLASSIFICATION NOTICE</div>
                {data.disclaimer}
              </div>
              <div 
                className="text-center font-mono text-xs text-amber-500 mt-4"
                style={{ fontFamily: 'Courier Prime, Courier New, monospace' }}
              >
                DOCUMENT GENERATED: {new Date().toLocaleDateString()} • CLASSIFICATION: CONFIDENTIAL • DISTRIBUTION: RESTRICTED
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};