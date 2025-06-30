import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Users, Tv, Star, Zap } from 'lucide-react';

interface RealityTVPersonaData {
  reportTitle: string;
  personaArchetype: string;
  description: string;
  popCultureComparisons: string[];
  characterTraits?: string[];
  likelyStoryArcs?: string[];
  viewerAppeal?: string;
  conflictStyle?: string;
  disclaimer: string;
}

interface RealityTVPersonaCardProps {
  data: RealityTVPersonaData;
  onNavigate?: (direction: 'prev' | 'next') => void;
  showNavigation?: boolean;
}

export const RealityTVPersonaCard: React.FC<RealityTVPersonaCardProps> = ({ 
  data, 
  onNavigate, 
  showNavigation = false 
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-500 to-orange-500 p-8 relative overflow-hidden"
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
          linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.05) 50%, transparent 70%)
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
            className="absolute top-8 left-8 z-50 bg-white/20 hover:bg-white/30 text-white border border-white/30"
          >
            ← Previous
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('next')}
            className="absolute top-8 right-8 z-50 bg-white/20 hover:bg-white/30 text-white border border-white/30"
          >
            Next →
          </Button>
        </>
      )}

      {/* Glitter/Sparkle Effects */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
              rotate: [0, 360],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: Math.random() * 4,
            }}
          />
        ))}
      </div>

      {/* "ON AIR" Sign */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="bg-red-600 text-white px-6 py-2 rounded-full font-bold text-sm tracking-wider border-4 border-white shadow-xl"
        >
          🔴 ON AIR
        </motion.div>
      </div>

      <div className="max-w-4xl mx-auto pt-20">
        {/* Main Card */}
        <motion.div
          initial={{ y: 100, opacity: 0, rotateX: -30 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border-4 border-white/50 relative overflow-hidden"
        >
          {/* Holographic Border Effect */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-pink-400 via-purple-400 to-orange-400 opacity-20 animate-pulse" />
          
          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.h1
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-600 via-purple-600 to-orange-600 mb-4"
                style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
              >
                {data.reportTitle}
              </motion.h1>
              <div className="flex justify-center items-center space-x-2">
                <Tv className="h-6 w-6 text-purple-600" />
                <span className="text-purple-600 font-bold text-lg">REALITY TV CASTING PROFILE</span>
                <Tv className="h-6 w-6 text-purple-600" />
              </div>
            </div>

            {/* Persona Archetype - The Star */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="text-center mb-8"
            >
              <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-6 rounded-2xl shadow-xl transform -rotate-2 border-4 border-yellow-300">
                <div className="text-sm font-bold mb-2">YOUR REALITY TV ARCHETYPE:</div>
                <div className="text-3xl font-black tracking-wider">
                  {data.personaArchetype}
                </div>
              </div>
            </motion.div>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.6 }}
              className="mb-8"
            >
              <h2 className="text-2xl font-bold text-purple-800 mb-4 flex items-center">
                <Star className="h-6 w-6 mr-2 text-yellow-500" />
                CHARACTER PROFILE
              </h2>
              <p className="text-lg text-gray-800 leading-relaxed bg-white/50 p-4 rounded-xl border-2 border-purple-200">
                {data.description}
              </p>
            </motion.div>

            {/* Pop Culture Comparisons */}
            {data.popCultureComparisons && data.popCultureComparisons.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2, duration: 0.6 }}
                className="mb-8"
              >
                <h3 className="text-xl font-bold text-purple-800 mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  YOU'RE LIKE...
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.popCultureComparisons.map((comparison, index) => (
                    <motion.div
                      key={index}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1.4 + index * 0.2 }}
                      className="bg-gradient-to-r from-pink-200 to-purple-200 p-4 rounded-xl border-2 border-pink-300 text-center"
                    >
                      <span className="font-bold text-purple-800">{comparison}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Character Traits */}
            {data.characterTraits && data.characterTraits.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.6, duration: 0.6 }}
                className="mb-8"
              >
                <h3 className="text-xl font-bold text-purple-800 mb-4 flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                  SIGNATURE TRAITS
                </h3>
                <div className="flex flex-wrap gap-3">
                  {data.characterTraits.map((trait, index) => (
                    <motion.span
                      key={index}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 1.8 + index * 0.1 }}
                      className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold rounded-full text-sm shadow-lg border-2 border-yellow-300"
                    >
                      {trait}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Story Arcs */}
            {data.likelyStoryArcs && data.likelyStoryArcs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 2, duration: 0.6 }}
                className="mb-8"
              >
                <h3 className="text-xl font-bold text-purple-800 mb-4">
                  📺 POTENTIAL STORYLINES
                </h3>
                <div className="space-y-3">
                  {data.likelyStoryArcs.map((arc, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 2.2 + index * 0.2 }}
                      className="bg-white/70 p-4 rounded-xl border-l-4 border-purple-500"
                    >
                      <span className="text-gray-800">• {arc}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Viewer Appeal & Conflict Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {data.viewerAppeal && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 2.4, duration: 0.6 }}
                  className="bg-gradient-to-br from-green-200 to-blue-200 p-6 rounded-xl border-2 border-green-300"
                >
                  <h4 className="font-bold text-green-800 mb-3">👥 VIEWER APPEAL</h4>
                  <p className="text-green-800 text-sm">{data.viewerAppeal}</p>
                </motion.div>
              )}

              {data.conflictStyle && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 2.6, duration: 0.6 }}
                  className="bg-gradient-to-br from-red-200 to-pink-200 p-6 rounded-xl border-2 border-red-300"
                >
                  <h4 className="font-bold text-red-800 mb-3">⚡ CONFLICT STYLE</h4>
                  <p className="text-red-800 text-sm">{data.conflictStyle}</p>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.8 }}
              className="text-center pt-6 border-t-2 border-purple-300"
            >
              <p className="text-purple-600 text-sm italic">
                {data.disclaimer}
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};