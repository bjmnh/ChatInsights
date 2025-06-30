import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { User, Hash, MessageSquare, Heart, Repeat2, Share, MoreHorizontal, Calendar } from 'lucide-react';

interface SocialPost {
  id: string;
  content: string;
  timestamp: string;
  likes: number;
  retweets: number;
  replies: number;
}

interface DigitalDoppelgangerData {
  reportTitle: string;
  handle: string;
  bio: string;
  topHashtags: string[];
  personalityTraits?: string[];
  posts?: SocialPost[];
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
  // Generate a profile picture using a simple pattern based on handle
  const getProfilePicture = (handle: string) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 'bg-red-500'];
    const colorIndex = handle.length % colors.length;
    return colors[colorIndex];
  };

  const profileBgColor = getProfilePicture(data.handle);

  // Mock posts if none provided
  const mockPosts: SocialPost[] = data.posts || [
    {
      id: '1',
      content: "Just discovered something fascinating about the intersection of technology and human behavior. The way we adapt to new interfaces says so much about our cognitive flexibility! 🧠✨",
      timestamp: '2h',
      likes: 42,
      retweets: 8,
      replies: 12
    },
    {
      id: '2', 
      content: "Working on a new project that combines my interests in data analysis and creative problem-solving. Sometimes the best insights come from unexpected connections 🔗",
      timestamp: '6h',
      likes: 28,
      retweets: 5,
      replies: 7
    },
    {
      id: '3',
      content: "Reflecting on how our digital conversations shape our thinking patterns. Every interaction is both a mirror and a window into who we're becoming 🪟",
      timestamp: '1d',
      likes: 67,
      retweets: 15,
      replies: 23
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-black text-white relative"
    >
      {/* Navigation Controls */}
      {showNavigation && onNavigate && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('prev')}
            className="absolute top-8 left-8 z-50 bg-gray-900/80 hover:bg-gray-800/80 text-white border border-gray-700"
          >
            ← Previous
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('next')}
            className="absolute top-8 right-8 z-50 bg-gray-900/80 hover:bg-gray-800/80 text-white border border-gray-700"
          >
            Next →
          </Button>
        </>
      )}

      <div className="max-w-2xl mx-auto">
        {/* Twitter-like Header */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="sticky top-0 bg-black/80 backdrop-blur-sm border-b border-gray-800 p-4 z-40"
        >
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">{data.reportTitle}</h1>
            <MoreHorizontal className="h-5 w-5 text-gray-500" />
          </div>
        </motion.div>

        {/* Profile Section */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="p-6 border-b border-gray-800"
        >
          {/* Cover Photo Area */}
          <div className="h-32 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg mb-4 relative">
            <div className="absolute inset-0 bg-black/20 rounded-lg" />
          </div>

          {/* Profile Info */}
          <div className="relative -mt-16 mb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className={`w-24 h-24 ${profileBgColor} rounded-full border-4 border-black flex items-center justify-center text-2xl font-bold text-white`}
            >
              {data.handle.replace('@', '').charAt(0).toUpperCase()}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <h2 className="text-xl font-bold mb-1">
              {data.handle.replace('@', '').split(/(?=[A-Z])/).join(' ')}
            </h2>
            <p className="text-gray-500 mb-3">{data.handle}</p>
            
            <p className="text-white mb-4 leading-relaxed">
              {data.bio}
            </p>

            <div className="flex items-center text-gray-500 text-sm mb-4">
              <Calendar className="h-4 w-4 mr-1" />
              <span>Joined {new Date().getFullYear() - Math.floor(Math.random() * 3) - 1}</span>
            </div>

            <div className="flex space-x-6 text-sm">
              <span>
                <span className="font-bold text-white">{Math.floor(Math.random() * 500) + 100}</span>
                <span className="text-gray-500 ml-1">Following</span>
              </span>
              <span>
                <span className="font-bold text-white">{Math.floor(Math.random() * 2000) + 500}</span>
                <span className="text-gray-500 ml-1">Followers</span>
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* Hashtags Section */}
        {data.topHashtags && data.topHashtags.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="p-6 border-b border-gray-800"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Hash className="h-5 w-5 mr-2 text-blue-400" />
              Frequently Used
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.topHashtags.map((hashtag, index) => (
                <motion.span
                  key={`hashtag-${index}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.2 + index * 0.1 }}
                  className="px-3 py-1 bg-gray-900 text-blue-400 rounded-full text-sm border border-gray-700 hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  #{hashtag}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Posts Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="divide-y divide-gray-800"
        >
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-lg font-semibold">Posts</h3>
          </div>

          {mockPosts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6 + index * 0.2 }}
              className="p-4 hover:bg-gray-950/50 transition-colors cursor-pointer"
            >
              <div className="flex space-x-3">
                {/* Profile Picture */}
                <div className={`w-10 h-10 ${profileBgColor} rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                  {data.handle.replace('@', '').charAt(0).toUpperCase()}
                </div>

                {/* Post Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-bold text-white">
                      {data.handle.replace('@', '').split(/(?=[A-Z])/).join(' ')}
                    </span>
                    <span className="text-gray-500">{data.handle}</span>
                    <span className="text-gray-500">·</span>
                    <span className="text-gray-500 text-sm">{post.timestamp}</span>
                  </div>

                  <p className="text-white mb-3 leading-relaxed">
                    {post.content}
                  </p>

                  {/* Engagement Actions */}
                  <div className="flex items-center justify-between max-w-md text-gray-500">
                    <button className="flex items-center space-x-2 hover:text-blue-400 transition-colors group">
                      <div className="p-2 rounded-full group-hover:bg-blue-400/10 transition-colors">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <span className="text-sm">{post.replies}</span>
                    </button>

                    <button className="flex items-center space-x-2 hover:text-green-400 transition-colors group">
                      <div className="p-2 rounded-full group-hover:bg-green-400/10 transition-colors">
                        <Repeat2 className="h-4 w-4" />
                      </div>
                      <span className="text-sm">{post.retweets}</span>
                    </button>

                    <button className="flex items-center space-x-2 hover:text-red-400 transition-colors group">
                      <div className="p-2 rounded-full group-hover:bg-red-400/10 transition-colors">
                        <Heart className="h-4 w-4" />
                      </div>
                      <span className="text-sm">{post.likes}</span>
                    </button>

                    <button className="hover:text-blue-400 transition-colors group">
                      <div className="p-2 rounded-full group-hover:bg-blue-400/10 transition-colors">
                        <Share className="h-4 w-4" />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Personality Traits */}
        {data.personalityTraits && data.personalityTraits.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.4 }}
            className="p-6 border-t border-gray-800"
          >
            <h3 className="text-lg font-semibold mb-4">Personality Insights</h3>
            <div className="grid grid-cols-2 gap-3">
              {data.personalityTraits.map((trait, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 2.6 + index * 0.1 }}
                  className="bg-gray-900 p-3 rounded-lg border border-gray-700 text-center"
                >
                  <span className="text-gray-300 text-sm">{trait}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3 }}
          className="p-6 text-center border-t border-gray-800"
        >
          <p className="text-gray-500 text-sm">
            {data.disclaimer}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};