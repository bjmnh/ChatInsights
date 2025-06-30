import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Brain, BarChart3, TrendingUp, Globe, Zap } from 'lucide-react';

interface LinguisticFingerprintData {
  reportTitle: string;
  overallStyleDescription: string;
  vocabularyProfile: {
    qualitativeAssessment: string;
    notableWords: string[];
    sophisticationLevel?: string;
    domainSpecificTerms?: string[];
    linguisticMarkers?: string[];
  };
  sentenceStructure: string;
  expressiveness: string;
  potentialInterestsIndicatedByLanguage: string[];
  communicationEffectiveness?: string;
  rhetoricalDevices?: string[];
  cognitiveComplexity?: string;
  disclaimer: string;
}

interface LinguisticFingerprintCardProps {
  data: LinguisticFingerprintData;
  onNavigate?: (direction: 'prev' | 'next') => void;
  showNavigation?: boolean;
}

export const LinguisticFingerprintCard: React.FC<LinguisticFingerprintCardProps> = ({ 
  data, 
  onNavigate, 
  showNavigation = false 
}) => {
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimationComplete(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 relative overflow-hidden"
    >
      {/* Navigation Controls */}
      {showNavigation && onNavigate && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('prev')}
            className="absolute top-8 left-8 z-50 bg-slate-800/80 hover:bg-slate-700/80 text-orange-400 border border-orange-400/30"
          >
            ← Previous
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('next')}
            className="absolute top-8 right-8 z-50 bg-slate-800/80 hover:bg-slate-700/80 text-orange-400 border border-orange-400/30"
          >
            Next →
          </Button>
        </>
      )}

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
            {data.reportTitle}
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
                  {data.vocabularyProfile.qualitativeAssessment}
                </p>
              </div>
              
              {data.vocabularyProfile.sophisticationLevel && (
                <div>
                  <h4 className="text-white font-medium mb-2">Sophistication Level:</h4>
                  <div className="px-3 py-1 bg-orange-400/20 text-orange-300 rounded-full text-sm border border-orange-400/30 inline-block">
                    {data.vocabularyProfile.sophisticationLevel}
                  </div>
                </div>
              )}

              {data.vocabularyProfile.notableWords && data.vocabularyProfile.notableWords.length > 0 && (
                <div>
                  <h4 className="text-white font-medium mb-3">Notable Terms:</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.vocabularyProfile.notableWords.map((word, index) => (
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

              {data.vocabularyProfile.domainSpecificTerms && data.vocabularyProfile.domainSpecificTerms.length > 0 && (
                <div>
                  <h4 className="text-white font-medium mb-3">Domain Expertise:</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.vocabularyProfile.domainSpecificTerms.map((term, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-400/20 text-blue-300 rounded text-xs border border-blue-400/30"
                      >
                        {term}
                      </span>
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
              
              {data.communicationEffectiveness && (
                <div>
                  <h4 className="text-white font-medium mb-2">Communication Effectiveness:</h4>
                  <p className="text-slate-300 text-sm">
                    {data.communicationEffectiveness}
                  </p>
                </div>
              )}

              {/* Animated Waveform */}
              <div className="mt-4">
                <h4 className="text-white font-medium mb-2">Complexity Visualization:</h4>
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

        {/* Rhetorical Devices & Cognitive Complexity */}
        {(data.rhetoricalDevices || data.cognitiveComplexity) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {data.rhetoricalDevices && data.rhetoricalDevices.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-slate-900/50 backdrop-blur-sm border border-orange-400/30 rounded-2xl p-6 shadow-xl"
              >
                <h3 className="text-xl font-semibold text-orange-400 mb-4 flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  RHETORICAL DEVICES
                </h3>
                <div className="space-y-2">
                  {data.rhetoricalDevices.map((device, index) => (
                    <div key={index} className="bg-orange-400/10 border border-orange-400/20 rounded-lg p-3">
                      <span className="text-white text-sm">• {device}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {data.cognitiveComplexity && (
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-slate-900/50 backdrop-blur-sm border border-orange-400/30 rounded-2xl p-6 shadow-xl"
              >
                <h3 className="text-xl font-semibold text-orange-400 mb-4 flex items-center">
                  <Brain className="h-5 w-5 mr-2" />
                  COGNITIVE COMPLEXITY
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {data.cognitiveComplexity}
                </p>
              </motion.div>
            )}
          </div>
        )}

        {/* Interests Network */}
        {data.potentialInterestsIndicatedByLanguage && data.potentialInterestsIndicatedByLanguage.length > 0 && (
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
              {data.potentialInterestsIndicatedByLanguage.map((interest, index) => (
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