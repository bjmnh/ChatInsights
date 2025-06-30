import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { User, Hash, Users, MessageSquare, Globe, Heart, Share, MoreHorizontal, Bell, Search, Home, Bookmark, Settings, Camera, Video, Image, Smile, Send, Eye, Repeat2, MessageCircle } from 'lucide-react';

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
  const [currentView, setCurrentView] = useState<'profile' | 'post' | 'analytics'>('profile');
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(Math.floor(Math.random() * 500) + 100);

  // Generate profile avatar based on handle
  const generateAvatar = (handle: string) => {
    const colors = ['#10B981', '#06B6D4', '#8B5CF6', '#F59E0B', '#EF4444'];
    const bgColor = colors[handle.length % colors.length];
    const initials = handle.replace('@', '').substring(0, 2).toUpperCase();
    return { bgColor, initials };
  };

  const avatar = generateAvatar(data.handle);

  // Mock post content based on personality
  const generateMockPost = () => {
    const posts = [
      "Just discovered something fascinating about the intersection of technology and human behavior. The patterns we create without even realizing it are incredible. 🧠✨",
      "Working on a new project that combines my love for data analysis with creative problem-solving. Sometimes the best insights come from unexpected connections.",
      "Reflecting on how our digital conversations reveal so much about our thinking patterns. Every interaction is a window into cognitive processes.",
      "The beauty of complex systems is in their emergent properties. What starts simple can become beautifully intricate. #SystemsThinking",
      "Today's deep dive: exploring the relationship between language patterns and personality traits. The data tells such interesting stories."
    ];
    return posts[Math.floor(Math.random() * posts.length)];
  };

  const mockPost = generateMockPost();

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-slate-900 relative overflow-hidden"
    >
      {/* Navigation Controls */}
      {showNavigation && onNavigate && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('prev')}
            className="absolute top-8 left-8 z-50 bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 border border-slate-600"
          >
            ← Previous
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('next')}
            className="absolute top-8 right-8 z-50 bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 border border-slate-600"
          >
            Next →
          </Button>
        </>
      )}

      {/* Phone Frame */}
      <div className="flex items-center justify-center min-h-screen p-8">
        <motion.div
          initial={{ y: 100, opacity: 0, rotateX: -15 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="w-full max-w-md mx-auto"
        >
          {/* Phone Container */}
          <div className="bg-slate-800 rounded-[3rem] p-4 shadow-2xl border-4 border-slate-700 relative overflow-hidden">
            {/* Phone Screen Glow */}
            <div className="absolute inset-4 bg-gradient-to-br from-emerald-400/10 to-cyan-400/10 rounded-[2.5rem] blur-xl" />
            
            {/* Screen */}
            <div className="relative bg-slate-950 rounded-[2.5rem] overflow-hidden shadow-inner border border-slate-700">
              {/* Status Bar */}
              <div className="flex justify-between items-center px-6 py-3 bg-slate-900/50 backdrop-blur-sm">
                <div className="flex items-center space-x-1">
                  <div className="w-1 h-1 bg-emerald-400 rounded-full" />
                  <div className="w-1 h-1 bg-emerald-400 rounded-full" />
                  <div className="w-1 h-1 bg-emerald-400 rounded-full" />
                  <span className="text-xs text-slate-400 ml-2">Nexus</span>
                </div>
                <div className="text-xs text-slate-400">9:41 AM</div>
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-2 border border-slate-400 rounded-sm">
                    <div className="w-3 h-1 bg-emerald-400 rounded-sm m-0.5" />
                  </div>
                </div>
              </div>

              {/* App Header */}
              <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-between px-6 py-4 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700"
              >
                <h1 className="text-xl font-bold text-emerald-400">nexus</h1>
                <div className="flex items-center space-x-4">
                  <Search className="h-5 w-5 text-slate-400" />
                  <Bell className="h-5 w-5 text-slate-400" />
                  <MoreHorizontal className="h-5 w-5 text-slate-400" />
                </div>
              </motion.div>

              {/* Content Area */}
              <div className="h-[600px] overflow-y-auto">
                {currentView === 'profile' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="p-6"
                  >
                    {/* Profile Header */}
                    <div className="flex items-start space-x-4 mb-6">
                      {/* Avatar */}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.9, type: "spring" }}
                        className="relative"
                      >
                        <div 
                          className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg border-2 border-emerald-400/30"
                          style={{ backgroundColor: avatar.bgColor }}
                        >
                          {avatar.initials}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full border-2 border-slate-950 flex items-center justify-center">
                          <div className="w-2 h-2 bg-slate-950 rounded-full" />
                        </div>
                      </motion.div>

                      {/* Profile Info */}
                      <div className="flex-1">
                        <motion.h2
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 1.1 }}
                          className="text-xl font-bold text-white mb-1"
                        >
                          {data.handle}
                        </motion.h2>
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 1.3 }}
                          className="flex items-center space-x-4 text-sm text-slate-400 mb-3"
                        >
                          <span>{Math.floor(Math.random() * 10000) + 1000} followers</span>
                          <span>{Math.floor(Math.random() * 5000) + 500} following</span>
                        </motion.div>
                        <motion.button
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 1.5 }}
                          className="px-6 py-2 bg-emerald-400 text-slate-950 rounded-xl font-semibold text-sm hover:bg-emerald-300 transition-colors"
                        >
                          Follow
                        </motion.button>
                      </div>
                    </div>

                    {/* Bio */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.7 }}
                      className="mb-6"
                    >
                      <p className="text-slate-300 leading-relaxed">
                        {data.bio}
                      </p>
                    </motion.div>

                    {/* Hashtags */}
                    {data.topHashtags && data.topHashtags.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.9 }}
                        className="mb-6"
                      >
                        <div className="flex flex-wrap gap-2">
                          {data.topHashtags.map((hashtag, index) => (
                            <motion.span
                              key={index}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 2.1 + index * 0.1 }}
                              className="px-3 py-1 bg-slate-800 text-emerald-400 rounded-full text-sm border border-slate-700 hover:bg-slate-700 transition-colors"
                            >
                              #{hashtag}
                            </motion.span>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Stats Grid */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 2.3 }}
                      className="grid grid-cols-3 gap-4 mb-6"
                    >
                      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center">
                        <div className="text-lg font-bold text-emerald-400">
                          {Math.floor(Math.random() * 100) + 50}
                        </div>
                        <div className="text-xs text-slate-400">Posts</div>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center">
                        <div className="text-lg font-bold text-emerald-400">
                          {(Math.random() * 5 + 2).toFixed(1)}%
                        </div>
                        <div className="text-xs text-slate-400">Engagement</div>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center">
                        <div className="text-lg font-bold text-emerald-400">
                          {Math.floor(Math.random() * 50) + 10}
                        </div>
                        <div className="text-xs text-slate-400">Avg Likes</div>
                      </div>
                    </motion.div>

                    {/* View Toggle */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 2.5 }}
                      className="flex space-x-2 mb-4"
                    >
                      <button
                        onClick={() => setCurrentView('profile')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                          currentView === 'profile' 
                            ? 'bg-emerald-400 text-slate-950' 
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => setCurrentView('post')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                          currentView === 'post' 
                            ? 'bg-emerald-400 text-slate-950' 
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        Latest Post
                      </button>
                      <button
                        onClick={() => setCurrentView('analytics')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                          currentView === 'analytics' 
                            ? 'bg-emerald-400 text-slate-950' 
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        Insights
                      </button>
                    </motion.div>
                  </motion.div>
                )}

                {currentView === 'post' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="p-6"
                  >
                    {/* Post Header */}
                    <div className="flex items-center space-x-3 mb-4">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: avatar.bgColor }}
                      >
                        {avatar.initials}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-semibold">{data.handle}</div>
                        <div className="text-slate-400 text-xs">2 hours ago</div>
                      </div>
                      <MoreHorizontal className="h-5 w-5 text-slate-400" />
                    </div>

                    {/* Post Content */}
                    <div className="mb-4">
                      <p className="text-slate-300 leading-relaxed mb-4">
                        {mockPost}
                      </p>
                      
                      {/* Mock Image Placeholder */}
                      <div className="bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 rounded-xl h-48 flex items-center justify-center border border-slate-700">
                        <div className="text-center">
                          <Image className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                          <div className="text-slate-400 text-sm">Visual Content</div>
                        </div>
                      </div>
                    </div>

                    {/* Post Actions */}
                    <div className="flex items-center justify-between py-3 border-t border-slate-700">
                      <div className="flex items-center space-x-6">
                        <button 
                          onClick={handleLike}
                          className="flex items-center space-x-2 text-slate-400 hover:text-emerald-400 transition-colors"
                        >
                          <Heart className={`h-5 w-5 ${isLiked ? 'fill-emerald-400 text-emerald-400' : ''}`} />
                          <span className="text-sm">{likeCount}</span>
                        </button>
                        <button className="flex items-center space-x-2 text-slate-400 hover:text-emerald-400 transition-colors">
                          <MessageCircle className="h-5 w-5" />
                          <span className="text-sm">{Math.floor(Math.random() * 20) + 5}</span>
                        </button>
                        <button className="flex items-center space-x-2 text-slate-400 hover:text-emerald-400 transition-colors">
                          <Repeat2 className="h-5 w-5" />
                          <span className="text-sm">{Math.floor(Math.random() * 10) + 2}</span>
                        </button>
                      </div>
                      <button className="text-slate-400 hover:text-emerald-400 transition-colors">
                        <Share className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Comment Input */}
                    <div className="flex items-center space-x-3 mt-4 p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: avatar.bgColor }}
                      >
                        {avatar.initials}
                      </div>
                      <input 
                        type="text" 
                        placeholder="Add a comment..." 
                        className="flex-1 bg-transparent text-slate-300 placeholder-slate-500 text-sm focus:outline-none"
                      />
                      <Smile className="h-4 w-4 text-slate-400" />
                      <Send className="h-4 w-4 text-emerald-400" />
                    </div>
                  </motion.div>
                )}

                {currentView === 'analytics' && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="p-6"
                  >
                    <h3 className="text-lg font-bold text-white mb-6">Profile Analytics</h3>
                    
                    {/* Personality Traits */}
                    {data.personalityTraits && data.personalityTraits.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-emerald-400 font-semibold mb-3">Personality Traits</h4>
                        <div className="space-y-2">
                          {data.personalityTraits.map((trait, index) => (
                            <div key={index} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                              <span className="text-slate-300 text-sm">{trait}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Content Style */}
                    {data.contentStyle && (
                      <div className="mb-6">
                        <h4 className="text-emerald-400 font-semibold mb-3">Content Style</h4>
                        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                          <p className="text-slate-300 text-sm leading-relaxed">{data.contentStyle}</p>
                        </div>
                      </div>
                    )}

                    {/* Online Behavior */}
                    {data.onlineBehavior && (
                      <div className="mb-6">
                        <h4 className="text-emerald-400 font-semibold mb-3">Online Behavior</h4>
                        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                          <p className="text-slate-300 text-sm leading-relaxed">{data.onlineBehavior}</p>
                        </div>
                      </div>
                    )}

                    {/* Likely Followers */}
                    {data.likelyFollowers && data.likelyFollowers.length > 0 && (
                      <div>
                        <h4 className="text-emerald-400 font-semibold mb-3">Target Audience</h4>
                        <div className="space-y-2">
                          {data.likelyFollowers.map((follower, index) => (
                            <div key={index} className="flex items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                              <div className="w-6 h-6 bg-emerald-400 rounded-lg flex items-center justify-center mr-3">
                                <User className="h-3 w-3 text-slate-950" />
                              </div>
                              <span className="text-slate-300 text-sm">{follower}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Bottom Navigation */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="flex items-center justify-around py-4 bg-slate-900/80 backdrop-blur-sm border-t border-slate-700"
              >
                <Home className="h-6 w-6 text-emerald-400" />
                <Search className="h-6 w-6 text-slate-400" />
                <div className="w-8 h-8 bg-emerald-400 rounded-xl flex items-center justify-center">
                  <Camera className="h-4 w-4 text-slate-950" />
                </div>
                <Bell className="h-6 w-6 text-slate-400" />
                <div 
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-white font-bold text-xs border border-emerald-400"
                  style={{ backgroundColor: avatar.bgColor }}
                >
                  {avatar.initials}
                </div>
              </motion.div>
            </div>
          </div>

          {/* Disclaimer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.7 }}
            className="text-center mt-6"
          >
            <p className="text-slate-400 text-xs max-w-sm mx-auto leading-relaxed">
              {data.disclaimer}
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};