import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Brain, Shield, Eye, EyeOff } from 'lucide-react';

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
      className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-8 relative"
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 50%, rgba(139, 69, 19, 0.03) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(139, 69, 19, 0.03) 0%, transparent 50%),
          radial-gradient(circle at 40% 80%, rgba(139, 69, 19, 0.03) 0%, transparent 50%)
        `
      }}
    >
      {/* Navigation Controls */}
      {showNavigation && onNavigate && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('prev')}
            className="absolute top-8 left-8 z-50 bg-amber-100/80 hover:bg-amber-200/80 text-amber-900"
          >
            ← Previous
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('next')}
            className="absolute top-8 right-8 z-50 bg-amber-100/80 hover:bg-amber-200/80 text-amber-900"
          >
            Next →
          </Button>
        </>
      )}

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
                  {data.reportTitle}
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
                    {data.subjectCodename.name}
                  </div>
                </div>
                <p className="mt-4 font-mono text-sm text-amber-800 italic">
                  "{data.subjectCodename.justification}"
                </p>
                {data.subjectCodename.operationalSignificance && (
                  <p className="mt-2 font-mono text-xs text-amber-700">
                    Operational Significance: {data.subjectCodename.operationalSignificance}
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
                  {data.dominantInterests.map((interest, index) => (
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
                    {data.piiExamples.slice(0, 5).map((pii, index) => (
                      <div key={index} className="bg-amber-100 p-4 border border-amber-400">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-xs font-bold text-red-700">
                            {pii.category}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePIIReveal(index)}
                            className="text-xs font-mono h-6 px-2"
                          >
                            {revealedPII.has(index) ? (
                              <>
                                <EyeOff className="h-3 w-3 mr-1" />
                                HIDE
                              </>
                            ) : (
                              <>
                                <Eye className="h-3 w-3 mr-1" />
                                REVEAL
                              </>
                            )}
                          </Button>
                        </div>
                        <div className="font-mono text-sm">
                          {revealedPII.has(index) ? (
                            <span className="text-amber-800">"{pii.pii}"</span>
                          ) : (
                            <span className="bg-black text-black select-none px-8 py-1 cursor-pointer">
                              [CLASSIFIED]
                            </span>
                          )}
                        </div>
                        <div className="mt-2 font-mono text-xs text-amber-700">
                          Context: {pii.context}
                        </div>
                        {pii.riskLevel && (
                          <div className="mt-1 font-mono text-xs">
                            <span className={`px-2 py-1 rounded text-white ${
                              pii.riskLevel === 'high' ? 'bg-red-600' :
                              pii.riskLevel === 'medium' ? 'bg-yellow-600' : 'bg-green-600'
                            }`}>
                              {pii.riskLevel.toUpperCase()} RISK
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Behavioral Patterns */}
              {data.behavioralPatterns && data.behavioralPatterns.length > 0 && (
                <div className="mb-8">
                  <h2 className="font-mono text-lg font-bold text-amber-900 mb-4 border-b border-amber-400 pb-2">
                    BEHAVIORAL PATTERNS
                  </h2>
                  <div className="space-y-2">
                    {data.behavioralPatterns.map((pattern, index) => (
                      <div key={index} className="bg-amber-100 p-3 border-l-4 border-amber-500">
                        <span className="font-mono text-sm text-amber-800">• {pattern}</span>
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

              {/* Operational Assessment */}
              {data.operationalAssessment && (
                <div className="mb-8">
                  <h2 className="font-mono text-lg font-bold text-amber-900 mb-4 border-b border-amber-400 pb-2">
                    OPERATIONAL ASSESSMENT
                  </h2>
                  <p className="font-mono text-sm leading-relaxed text-amber-800 bg-amber-100 p-4 border-l-4 border-amber-500">
                    {data.operationalAssessment}
                  </p>
                </div>
              )}

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