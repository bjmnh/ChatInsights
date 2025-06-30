import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

interface TopConversation {
  conversationId: string;
  title?: string;
  justification: string;
  significance?: string;
  insights?: string[];
}

interface Top5ConversationsCardProps {
  data: TopConversation[];
  onNavigate?: (direction: 'prev' | 'next') => void;
  showNavigation?: boolean;
}

export const Top5ConversationsCard: React.FC<Top5ConversationsCardProps> = ({ 
  data, 
  onNavigate, 
  showNavigation = false 
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % data.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + data.length) % data.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-950 relative overflow-hidden"
    >
      {/* Card Navigation Controls */}
      {showNavigation && onNavigate && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('prev')}
            className="absolute top-8 left-8 z-50 bg-purple-900/80 hover:bg-purple-800/80 text-purple-300 border border-purple-400/30"
          >
            ← Previous Card
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('next')}
            className="absolute top-8 right-8 z-50 bg-purple-900/80 hover:bg-purple-800/80 text-purple-300 border border-purple-400/30"
          >
            Next Card →
          </Button>
        </>
      )}

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

      {/* Slide Navigation */}
      <div className="absolute top-1/2 left-8 transform -translate-y-1/2 z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={prevSlide}
          className="text-white hover:text-yellow-400 bg-black/20 hover:bg-black/40"
          disabled={currentSlide === 0}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      </div>
      
      <div className="absolute top-1/2 right-8 transform -translate-y-1/2 z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={nextSlide}
          className="text-white hover:text-yellow-400 bg-black/20 hover:bg-black/40"
          disabled={currentSlide === data.length - 1}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>

      {/* Slide Indicators */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-20 flex space-x-2">
        {data.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-colors ${
              index === currentSlide ? 'bg-yellow-400' : 'bg-white/30'
            }`}
          />
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-20 text-center">
        <h1 className="text-2xl font-serif font-bold text-white mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
          Your Most Fascinating Conversations
        </h1>
        <div className="w-24 h-px bg-yellow-400 mx-auto" />
      </div>

      {/* Slides */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="h-screen flex items-center justify-center p-8 pt-32"
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

            {/* Star Icon */}
            <motion.div
              initial={{ rotate: -180, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mb-6"
            >
              <Star className="h-12 w-12 text-yellow-400 mx-auto fill-current" />
            </motion.div>

            {/* Conversation Title */}
            <motion.h2
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-4xl md:text-6xl font-serif font-bold text-white mb-8 leading-tight"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              {data[currentSlide]?.title || `Conversation ${currentSlide + 1}`}
            </motion.h2>

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
            {data[currentSlide]?.insights && data[currentSlide].insights!.length > 0 && (
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.8 }}
                className="mt-12"
              >
                <div className="text-yellow-400/80 text-sm font-medium mb-4 tracking-wider uppercase">
                  Key Insights
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  {data[currentSlide].insights!.map((insight, index) => (
                    <motion.span
                      key={index}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1 + index * 0.1 }}
                      className="px-4 py-2 bg-white/10 text-white/80 rounded-full text-sm border border-white/20 hover:bg-white/20 transition-colors"
                    >
                      {insight}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Conversation ID (subtle) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="mt-8 text-white/30 text-xs font-mono"
            >
              ID: {data[currentSlide]?.conversationId}
            </motion.div>
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

      {/* Slide Counter */}
      <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 text-white/60 text-sm">
        {currentSlide + 1} of {data.length}
      </div>
    </motion.div>
  );
};