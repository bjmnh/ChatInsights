import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Eye, Sparkles } from 'lucide-react';

interface UnfilteredMirrorData {
  reportTitle: string;
  observation: string;
  deeperInsight?: string;
  psychologicalImplications?: string;
  disclaimer: string;
}

interface UnfilteredMirrorCardProps {
  data: UnfilteredMirrorData;
  onNavigate?: (direction: 'prev' | 'next') => void;
  showNavigation?: boolean;
}

export const UnfilteredMirrorCard: React.FC<UnfilteredMirrorCardProps> = ({ 
  data, 
  onNavigate, 
  showNavigation = false 
}) => {
  const [textVisible, setTextVisible] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const fullText = data.observation;

  useEffect(() => {
    const timer = setTimeout(() => setTextVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (textVisible && fullText) {
      let index = 0;
      const interval = setInterval(() => {
        if (index <= fullText.length) {
          setCurrentText(fullText.slice(0, index));
          index++;
        } else {
          clearInterval(interval);
        }
      }, 50); // Adjust speed as needed

      return () => clearInterval(interval);
    }
  }, [textVisible, fullText]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2 }}
      className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center"
    >
      {/* Navigation Controls */}
      {showNavigation && onNavigate && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('prev')}
            className="absolute top-8 left-8 z-50 bg-white/10 hover:bg-white/20 text-white border border-white/20"
          >
            ← Previous
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('next')}
            className="absolute top-8 right-8 z-50 bg-white/10 hover:bg-white/20 text-white border border-white/20"
          >
            Next →
          </Button>
        </>
      )}

      {/* Subtle Spotlight Effect */}
      <div className="absolute inset-0 bg-gradient-radial from-white/5 via-transparent to-transparent" />

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 0.6, 0],
              scale: [0, 1, 0],
              y: [0, -100],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              delay: Math.random() * 8,
              ease: "easeOut"
            }}
          />
        ))}
      </div>

      <div className="max-w-4xl mx-auto px-8 text-center">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="mb-16"
        >
          <div className="flex items-center justify-center mb-4">
            <Eye className="h-8 w-8 text-white/60 mr-3" />
            <h1 className="text-2xl font-light text-white/80 tracking-wider">
              {data.reportTitle}
            </h1>
            <Eye className="h-8 w-8 text-white/60 ml-3" />
          </div>
          <div className="w-32 h-px bg-white/30 mx-auto" />
        </motion.div>

        {/* Main Observation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 1.5 }}
          className="mb-16"
        >
          <div className="relative">
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full" />
            
            <p className="relative text-3xl md:text-4xl lg:text-5xl font-light text-white leading-relaxed tracking-wide">
              <span className="relative">
                {currentText}
                {textVisible && currentText.length < fullText.length && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="inline-block w-1 h-8 bg-white ml-1"
                  />
                )}
              </span>
            </p>
          </div>
        </motion.div>

        {/* Deeper Insight */}
        {data.deeperInsight && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3, duration: 1 }}
            className="mb-12"
          >
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-center mb-4">
                <Sparkles className="h-5 w-5 text-white/40 mr-2" />
                <span className="text-white/60 text-sm tracking-wider uppercase">Deeper Reflection</span>
                <Sparkles className="h-5 w-5 text-white/40 ml-2" />
              </div>
              <p className="text-lg text-white/80 leading-relaxed font-light">
                {data.deeperInsight}
              </p>
            </div>
          </motion.div>
        )}

        {/* Psychological Implications */}
        {data.psychologicalImplications && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 4, duration: 1 }}
            className="mb-12"
          >
            <div className="max-w-2xl mx-auto">
              <div className="text-white/50 text-sm tracking-wider uppercase mb-4">
                Psychological Implications
              </div>
              <p className="text-base text-white/70 leading-relaxed font-light">
                {data.psychologicalImplications}
              </p>
            </div>
          </motion.div>
        )}

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 5, duration: 1 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <p className="text-white/40 text-xs max-w-md text-center leading-relaxed">
            {data.disclaimer}
          </p>
        </motion.div>

        {/* Subtle Border */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 2, duration: 2 }}
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
        />
      </div>
    </motion.div>
  );
};