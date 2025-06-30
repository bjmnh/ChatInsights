import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

// Import all card components
import { FBIReportCard } from './FBIReportCard';
import { LinguisticFingerprintCard } from './LinguisticFingerprintCard';
import { Top5ConversationsCard } from './Top5ConversationsCard';
import { RealityTVPersonaCard } from './RealityTVPersonaCard';
import { UnfilteredMirrorCard } from './UnfilteredMirrorCard';
import { PIISafetyCompassCard } from './PIISafetyCompassCard';
import { DigitalDoppelgangerCard } from './DigitalDoppelgangerCard';

interface ReportCardDeckProps {
  reportData: any;
  onBack: () => void;
}

export const ReportCardDeck: React.FC<ReportCardDeckProps> = ({ reportData, onBack }) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  // Define available cards based on report data
  const availableCards = [
    {
      id: 'fbi',
      component: reportData.fbiReport ? <FBIReportCard data={reportData.fbiReport} /> : null,
      available: !!reportData.fbiReport
    },
    {
      id: 'linguistic',
      component: reportData.linguisticFingerprint ? <LinguisticFingerprintCard data={reportData.linguisticFingerprint} /> : null,
      available: !!reportData.linguisticFingerprint
    },
    {
      id: 'top5',
      component: reportData.topInterestingConversations ? <Top5ConversationsCard data={reportData.topInterestingConversations} /> : null,
      available: !!reportData.topInterestingConversations
    },
    {
      id: 'reality',
      component: reportData.realityTVPersona ? <RealityTVPersonaCard data={reportData.realityTVPersona} /> : null,
      available: !!reportData.realityTVPersona
    },
    {
      id: 'mirror',
      component: reportData.unfilteredMirror ? <UnfilteredMirrorCard data={reportData.unfilteredMirror} /> : null,
      available: !!reportData.unfilteredMirror
    },
    {
      id: 'pii',
      component: reportData.piiSafetyCompass ? <PIISafetyCompassCard data={reportData.piiSafetyCompass} /> : null,
      available: !!reportData.piiSafetyCompass
    },
    {
      id: 'doppelganger',
      component: reportData.digitalDoppelganger ? <DigitalDoppelgangerCard data={reportData.digitalDoppelganger} /> : null,
      available: !!reportData.digitalDoppelganger
    }
  ].filter(card => card.available);

  const nextCard = () => {
    setCurrentCardIndex((prev) => (prev + 1) % availableCards.length);
  };

  const prevCard = () => {
    setCurrentCardIndex((prev) => (prev - 1 + availableCards.length) % availableCards.length);
  };

  const goToCard = (index: number) => {
    setCurrentCardIndex(index);
  };

  if (availableCards.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">No Reports Available</h2>
          <p className="text-slate-400 mb-6">No premium insights were generated for this analysis.</p>
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Navigation Controls */}
      <div className="fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          onClick={onBack}
          className="bg-black/50 text-white hover:bg-black/70 border border-white/20"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      {/* Card Navigation */}
      {availableCards.length > 1 && (
        <>
          <Button
            variant="ghost"
            onClick={prevCard}
            className="fixed top-1/2 left-4 transform -translate-y-1/2 z-50 bg-black/50 text-white hover:bg-black/70 border border-white/20"
            disabled={currentCardIndex === 0}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          
          <Button
            variant="ghost"
            onClick={nextCard}
            className="fixed top-1/2 right-4 transform -translate-y-1/2 z-50 bg-black/50 text-white hover:bg-black/70 border border-white/20"
            disabled={currentCardIndex === availableCards.length - 1}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      {/* Card Indicators */}
      {availableCards.length > 1 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 flex space-x-2">
          {availableCards.map((_, index) => (
            <button
              key={index}
              onClick={() => goToCard(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentCardIndex ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      )}

      {/* Card Counter */}
      {availableCards.length > 1 && (
        <div className="fixed bottom-16 left-1/2 transform -translate-x-1/2 z-50 text-white/60 text-sm">
          {currentCardIndex + 1} of {availableCards.length}
        </div>
      )}

      {/* Card Display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentCardIndex}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="w-full h-full"
        >
          {availableCards[currentCardIndex]?.component}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};