import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { User, Hash, Users, MessageSquare, Globe, Heart, Share } from 'lucide-react';

interface DigitalDoppelgangerData {
  reportTitle: string;
  handle: string;
  bio: string;
  topHashtags: string[];
  personalityTraits?: string[];
  likelyFollowers?: string[];
  contentStyle?: string;
  onlineBehavior?: string;
  disclaimer: string;
}

interface DigitalDoppelgangerCardProps {
  data: DigitalDoppelgangerData;
  onNavigate?: (direction: 'prev' | 'next') => void;
  showNavigation?: boolean;
}

export const DigitalDoppelgangerCard: React.FC<DigitalDoppelgangerCardProps> = ({ 
  data, 
  onNavigate, 
  showNavigation = false 
}) => {
  // Generate a unique color scheme based on the handle
  const getProfileColor = (handle: string) => {
    const colors = [
      { bg: 'from-purple-600 to-blue-600', accent: 'text-purple-400', border: 'border-purple-500' },
      { bg: 'from-green-600 to-teal-600', accent: 'text-green-400', border: 'border-green-500' },
      { bg: 'from-pink-600 to-rose-600', accent: 'text-pink-400', border: 'border-pink-500' },
      { bg: 'from-orange-600 to-red-600', accent: 'text-orange-400', border: 'border-orange-500' },
      { bg: 'from-indigo-600 to-purple-600', accent: 'text-indigo-400', border: 'border-indigo-500' },
    ];
    const index = handle.length % colors.length;
    return colors[index];
  };

  const profileColor = getProfileColor(data.handle);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950 p-8 relative"
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

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)
          `,
          backgroundSize: '300px 300px'
        }} />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
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
          <div className="flex items-center justify-center">
            <Globe className="h-6 w-6 text-cyan-400 mr-2" />
            <span className="text-cyan-400 text-lg">Your Social Media Twin</span>
            <Globe className="h-6 w-6 text-cyan-400 ml-2" />
          </div>
        </motion.div>

        {/* Main Profile Card */}
        <motion.div
          initial={{ y: 100, opacity: 0, rotateX: -30 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-slate-600 overflow-hidden"
        >
          {/* Profile Header */}
          <div className={`bg-gradient-to-r ${profileColor.bg} p-8 relative`}>
            {/* Decorative Elements */}
            <div className="absolute top-4 right-4 opacity-20">
              <MessageSquare className="h-8 w-8 text-white" />
            </div>
            <div className="absolute bottom-4 left-4 opacity-20">
              <Share className="h-6 w-6 text-white" />
            </div>

            <div className="flex items-center space-x-6">
              {/* Profile Picture Placeholder */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center border-4 border-white/30"
              >
                <User className="h-12 w-12 text-white" />
              </motion.div>

              {/* Profile Info */}
              <div className="flex-1">
                <motion.h2
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                  className="text-3xl font-bold text-white mb-2"
                >
                  {data.handle}
                </motion.h2>
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 }}
                  className="flex items-center space-x-4 text-white/80"
                >
                  <span className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {Math.floor(Math.random() * 10000) + 1000} followers
                  </span>
                  <span className="flex items-center">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    {Math.floor(Math.random() * 5000) + 500} posts
                  </span>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="p-8">
            {/* Bio */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="mb-8"
            >
              <h3 className="text-lg font-semibold text-white mb-3">Bio</h3>
              <p className="text-slate-300 leading-relaxed text-lg">
                {data.bio}
              </p>
            </motion.div>

            {/* Top Hashtags */}
            {data.topHashtags && data.topHashtags.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
                className="mb-8"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Hash className="h-5 w-5 mr-2" />
                  Signature Hashtags
                </h3>
                <div className="flex flex-wrap gap-3">
                  {data.topHashtags.map((hashtag, index) => (
                    <motion.span
                      key={index}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 1.6 + index * 0.1 }}
                      className={`px-4 py-2 bg-gradient-to-r ${profileColor.bg} text-white rounded-full text-sm font-medium border-2 ${profileColor.border} hover:scale-105 transition-transform cursor-default`}
                    >
                      #{hashtag}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Personality Traits */}
            {data.personalityTraits && data.personalityTraits.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8 }}
                className="mb-8"
              >
                <h3 className="text-lg font-semibold text-white mb-4">Personality Traits</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {data.personalityTraits.map((trait, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 2 + index * 0.1 }}
                      className="bg-slate-700/50 p-3 rounded-lg border border-slate-600 text-center"
                    >
                      <span className="text-slate-300 text-sm">{trait}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Content Style & Online Behavior */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {data.contentStyle && (
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 2.2 }}
                  className="bg-slate-700/30 p-6 rounded-xl border border-slate-600"
                >
                  <h4 className="text-white font-semibold mb-3 flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Content Style
                  </h4>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {data.contentStyle}
                  </p>
                </motion.div>
              )}

              {data.onlineBehavior && (
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 2.4 }}
                  className="bg-slate-700/30 p-6 rounded-xl border border-slate-600"
                >
                  <h4 className="text-white font-semibold mb-3 flex items-center">
                    <Globe className="h-5 w-5 mr-2" />
                    Online Behavior
                  </h4>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {data.onlineBehavior}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Likely Followers */}
            {data.likelyFollowers && data.likelyFollowers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.6 }}
                className="mb-8"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Your Likely Audience
                </h3>
                <div className="space-y-3">
                  {data.likelyFollowers.map((follower, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 2.8 + index * 0.1 }}
                      className="flex items-center bg-slate-700/30 p-4 rounded-lg border border-slate-600"
                    >
                      <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center mr-3">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-slate-300">{follower}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Engagement Metrics (Mock) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 3 }}
              className="bg-slate-700/30 p-6 rounded-xl border border-slate-600 mb-8"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Predicted Engagement</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-cyan-400">
                    {(Math.random() * 5 + 2).toFixed(1)}%
                  </div>
                  <div className="text-slate-400 text-sm">Avg. Engagement</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    {Math.floor(Math.random() * 100 + 50)}
                  </div>
                  <div className="text-slate-400 text-sm">Likes per Post</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">
                    {Math.floor(Math.random() * 20 + 5)}
                  </div>
                  <div className="text-slate-400 text-sm">Comments per Post</div>
                </div>
              </div>
            </motion.div>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3.2 }}
              className="text-center pt-6 border-t border-slate-600"
            >
              <p className="text-slate-400 text-sm">
                {data.disclaimer}
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};