import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Shield, Lock, AlertTriangle, CheckCircle, Info, Gauge } from 'lucide-react';

interface PIIBreakdown {
  category: string;
  advice: string;
  riskLevel?: string;
  examples?: string[];
}

interface PIISafetyCompassData {
  reportTitle: string;
  awarenessScore: "Low Risk" | "Medium Risk" | "High Risk";
  summary: string;
  detailedBreakdown: PIIBreakdown[];
  overallSecurityPosture?: string;
  recommendedActions?: string[];
  disclaimer: string;
}

interface PIISafetyCompassCardProps {
  data: PIISafetyCompassData;
  onNavigate?: (direction: 'prev' | 'next') => void;
  showNavigation?: boolean;
}

export const PIISafetyCompassCard: React.FC<PIISafetyCompassCardProps> = ({ 
  data, 
  onNavigate, 
  showNavigation = false 
}) => {
  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low risk': return { bg: 'from-green-500 to-emerald-600', text: 'text-green-100', border: 'border-green-400' };
      case 'medium risk': return { bg: 'from-yellow-500 to-orange-500', text: 'text-yellow-100', border: 'border-yellow-400' };
      case 'high risk': return { bg: 'from-red-500 to-red-600', text: 'text-red-100', border: 'border-red-400' };
      default: return { bg: 'from-gray-500 to-gray-600', text: 'text-gray-100', border: 'border-gray-400' };
    }
  };

  const riskColors = getRiskColor(data.awarenessScore);
  const riskPercentage = data.awarenessScore === 'Low Risk' ? 25 : data.awarenessScore === 'Medium Risk' ? 60 : 85;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 p-8 relative"
    >
      {/* Navigation Controls */}
      {showNavigation && onNavigate && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('prev')}
            className="absolute top-8 left-8 z-50 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-600"
          >
            ← Previous
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('next')}
            className="absolute top-8 right-8 z-50 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-600"
          >
            Next →
          </Button>
        </>
      )}

      {/* Grid Background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-blue-400 mr-3" />
            <h1 className="text-4xl font-bold text-white tracking-wide">
              {data.reportTitle}
            </h1>
            <Shield className="h-8 w-8 text-blue-400 ml-3" />
          </div>
          <div className="w-32 h-1 bg-gradient-to-r from-blue-400 to-cyan-400 mx-auto rounded-full" />
        </motion.div>

        {/* Main Gauge */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="relative inline-block">
            {/* Gauge Background */}
            <div className="w-64 h-64 rounded-full border-8 border-slate-700 relative overflow-hidden">
              {/* Gauge Fill */}
              <motion.div
                initial={{ rotate: -90, scale: 0 }}
                animate={{ rotate: -90 + (riskPercentage / 100) * 180, scale: 1 }}
                transition={{ delay: 0.8, duration: 1.5, ease: "easeOut" }}
                className={`absolute inset-2 rounded-full bg-gradient-to-r ${riskColors.bg} opacity-80`}
                style={{
                  clipPath: `polygon(50% 50%, 50% 0%, ${50 + (riskPercentage / 100) * 50}% 0%, 100% 100%, 0% 100%)`
                }}
              />
              
              {/* Gauge Center */}
              <div className="absolute inset-8 rounded-full bg-slate-800 border-4 border-slate-600 flex items-center justify-center">
                <div className="text-center">
                  <Gauge className={`h-8 w-8 mx-auto mb-2 ${riskColors.text}`} />
                  <div className={`text-lg font-bold ${riskColors.text}`}>
                    {data.awarenessScore}
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Level Indicator */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className={`mt-6 inline-block px-6 py-3 rounded-full bg-gradient-to-r ${riskColors.bg} ${riskColors.text} font-bold text-lg border-2 ${riskColors.border}`}
            >
              {data.awarenessScore}
            </motion.div>
          </div>
        </motion.div>

        {/* Summary */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-slate-800/50 backdrop-blur-sm border border-slate-600 rounded-2xl p-8 mb-8 shadow-xl"
        >
          <h2 className="text-2xl font-semibold text-blue-400 mb-6 flex items-center">
            <Info className="h-6 w-6 mr-3" />
            SECURITY ASSESSMENT SUMMARY
          </h2>
          <p className="text-white text-lg leading-relaxed">
            {data.summary}
          </p>
        </motion.div>

        {/* Detailed Breakdown */}
        {data.detailedBreakdown && data.detailedBreakdown.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-semibold text-blue-400 mb-6 flex items-center">
              <Lock className="h-6 w-6 mr-3" />
              DETAILED ANALYSIS
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {data.detailedBreakdown.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 + index * 0.2 }}
                  className="bg-slate-800/50 backdrop-blur-sm border border-slate-600 rounded-xl p-6 shadow-lg"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">{item.category}</h3>
                    {item.riskLevel && (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        item.riskLevel.toLowerCase().includes('high') ? 'bg-red-600 text-white' :
                        item.riskLevel.toLowerCase().includes('medium') ? 'bg-yellow-600 text-white' :
                        'bg-green-600 text-white'
                      }`}>
                        {item.riskLevel}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed mb-4">
                    {item.advice}
                  </p>
                  {item.examples && item.examples.length > 0 && (
                    <div>
                      <h4 className="text-white font-medium mb-2 text-sm">Examples to watch for:</h4>
                      <ul className="space-y-1">
                        {item.examples.map((example, exIndex) => (
                          <li key={exIndex} className="text-slate-400 text-xs flex items-start">
                            <span className="text-blue-400 mr-2">•</span>
                            {example}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Overall Security Posture */}
        {data.overallSecurityPosture && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="bg-slate-800/50 backdrop-blur-sm border border-slate-600 rounded-2xl p-8 mb-8 shadow-xl"
          >
            <h2 className="text-2xl font-semibold text-blue-400 mb-6 flex items-center">
              <CheckCircle className="h-6 w-6 mr-3" />
              OVERALL SECURITY POSTURE
            </h2>
            <p className="text-white text-lg leading-relaxed">
              {data.overallSecurityPosture}
            </p>
          </motion.div>
        )}

        {/* Recommended Actions */}
        {data.recommendedActions && data.recommendedActions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 }}
            className="bg-slate-800/50 backdrop-blur-sm border border-slate-600 rounded-2xl p-8 mb-8 shadow-xl"
          >
            <h2 className="text-2xl font-semibold text-blue-400 mb-6 flex items-center">
              <AlertTriangle className="h-6 w-6 mr-3" />
              RECOMMENDED ACTIONS
            </h2>
            <div className="space-y-4">
              {data.recommendedActions.map((action, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.6 + index * 0.1 }}
                  className="flex items-start bg-blue-900/20 p-4 rounded-lg border border-blue-800/30"
                >
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 mt-0.5 flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-white text-sm leading-relaxed">{action}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="text-center"
        >
          <p className="text-slate-400 text-sm">
            {data.disclaimer}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};