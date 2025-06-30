import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { 
  Brain, 
  Upload, 
  BarChart3, 
  Shield, 
  MessageSquare, 
  TrendingUp,
  ArrowRight,
  FileText,
  Tv,
  Globe,
  Eye,
  Sparkles,
  Database,
  Bot
} from 'lucide-react';
import { motion, useAnimation } from 'framer-motion';

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hoveredBeam, setHoveredBeam] = useState<number | null>(null);
  const [animationStarted, setAnimationStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimationStarted(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const prismBeams = [
    { 
      color: 'from-red-500 to-red-600', 
      label: 'Digital Dossier', 
      description: 'FBI-style behavioral analysis',
      icon: Brain,
      angle: -20,
      delay: 0.5
    },
    { 
      color: 'from-orange-500 to-orange-600', 
      label: 'Linguistic Fingerprint', 
      description: 'Language pattern analysis',
      icon: FileText,
      angle: -10,
      delay: 0.7
    },
    { 
      color: 'from-yellow-500 to-yellow-600', 
      label: 'Top Conversations', 
      description: 'Most fascinating discussions',
      icon: MessageSquare,
      angle: 0,
      delay: 0.9
    },
    { 
      color: 'from-green-500 to-green-600', 
      label: 'Reality TV Persona', 
      description: 'Your entertainment archetype',
      icon: Tv,
      angle: 10,
      delay: 1.1
    },
    { 
      color: 'from-blue-500 to-blue-600', 
      label: 'Unfiltered Mirror', 
      description: 'Deep self-reflection',
      icon: Eye,
      angle: 20,
      delay: 1.3
    },
    { 
      color: 'from-purple-500 to-purple-600', 
      label: 'Safety Compass', 
      description: 'Privacy & security analysis',
      icon: Shield,
      angle: 30,
      delay: 1.5
    },
    { 
      color: 'from-pink-500 to-pink-600', 
      label: 'Digital Twin', 
      description: 'Your social media persona',
      icon: Globe,
      angle: 40,
      delay: 1.7
    }
  ];

  const featureCards = [
    {
      title: "Digital Behavioral Dossier",
      description: "Professional psychological profiling with operational assessment and behavioral pattern analysis",
      icon: Brain,
      gradient: "from-red-500 to-red-600",
      bgPattern: "confidential-file",
      preview: "CONFIDENTIAL",
      style: "fbi",
      features: ["Psychological Assessment", "Behavioral Patterns", "Operational Analysis"]
    },
    {
      title: "Linguistic Fingerprint", 
      description: "Advanced analysis of communication style, vocabulary sophistication, and cognitive complexity",
      icon: BarChart3,
      gradient: "from-orange-500 to-orange-600", 
      bgPattern: "soundwave",
      preview: "ANALYZING",
      style: "tech",
      features: ["Vocabulary Analysis", "Communication Style", "Cognitive Markers"]
    },
    {
      title: "Reality TV Persona",
      description: "Entertainment industry casting profile with personality archetype and viewer appeal analysis",
      icon: Tv,
      gradient: "from-pink-500 to-pink-600",
      bgPattern: "glitter",
      preview: "ON AIR",
      style: "reality",
      features: ["Personality Archetype", "Character Traits", "Story Potential"]
    },
    {
      title: "The Unfiltered Mirror",
      description: "Profound psychological insights that reveal hidden patterns and unconscious motivations",
      icon: Eye,
      gradient: "from-gray-700 to-gray-900",
      bgPattern: "minimal",
      preview: "REFLECTING",
      style: "mirror",
      features: ["Deep Insights", "Hidden Patterns", "Self-Awareness"]
    },
    {
      title: "PII Safety Compass",
      description: "Comprehensive privacy assessment with security recommendations and risk analysis",
      icon: Shield,
      gradient: "from-green-500 to-green-600",
      bgPattern: "security",
      preview: "SECURED",
      style: "security",
      features: ["Privacy Analysis", "Security Posture", "Risk Assessment"]
    },
    {
      title: "Digital Doppelgänger",
      description: "Authentic social media profile simulation based on your communication patterns and interests",
      icon: Globe,
      gradient: "from-blue-500 to-blue-600",
      bgPattern: "social",
      preview: "@username",
      style: "social",
      features: ["Social Profile", "Content Style", "Online Behavior"]
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Bolt.new Logo positioned under header */}
      <div className="absolute top-20 right-8 z-40">
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2, duration: 0.5 }}
          className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20"
        >
          <img 
            src="/white_circle_360x360.png" 
            alt="Built with Bolt.new" 
            className="h-8 w-8"
          />
        </motion.div>
      </div>

      {/* Hero Section - The Digital Prism */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-8">
        {/* Professional Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-gray-950 to-black" />
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0" style={{
              backgroundImage: `
                radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 75% 75%, rgba(147, 51, 234, 0.1) 0%, transparent 50%),
                linear-gradient(45deg, transparent 40%, rgba(59, 130, 246, 0.05) 50%, transparent 60%)
              `,
              backgroundSize: '800px 800px, 600px 600px, 400px 400px'
            }} />
          </div>
        </div>

        {/* Floating Particles */}
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-blue-400 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0, 0.8, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                delay: Math.random() * 6,
              }}
            />
          ))}
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-5xl lg:text-7xl font-bold mb-6 leading-tight">
                <span className="block text-white">See What Your</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                  Conversations
                </span>
                <span className="block text-white">Say About You</span>
              </h1>
              <p className="text-lg lg:text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                Transform your ChatGPT conversation data into profound insights about your personality, 
                communication style, and digital behavior through advanced AI analysis.
              </p>
            </motion.div>
          </div>

          {/* Enhanced Digital Prism Animation */}
          <div className="relative flex items-center justify-center mb-12 h-[400px] lg:h-[500px]">
            {/* Data Input Visualization */}
            <motion.div
              initial={{ opacity: 0, x: -300 }}
              animate={{ opacity: animationStarted ? 1 : 0, x: animationStarted ? 0 : -300 }}
              transition={{ duration: 1.2, delay: 0.5 }}
              className="absolute left-0 lg:left-8 flex items-center"
            >
              <div className="text-right mr-8 lg:mr-12">
                <div className="flex items-center justify-end mb-4">
                  <Bot className="h-6 w-6 lg:h-8 lg:w-8 text-green-400 mr-3" />
                  <div>
                    <div className="text-base lg:text-lg font-semibold text-white">OpenAI Conversations</div>
                    <div className="text-xs lg:text-sm text-gray-400">Raw conversation data</div>
                  </div>
                </div>
                <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-lg p-3 lg:p-4 max-w-xs">
                  <div className="flex items-center mb-2">
                    <Database className="h-3 w-3 lg:h-4 lg:w-4 text-blue-400 mr-2" />
                    <span className="text-xs lg:text-sm text-gray-300">conversations.json</span>
                  </div>
                  <div className="text-xs text-gray-500 font-mono">
                    {Math.floor(Math.random() * 500 + 100)} conversations<br/>
                    {Math.floor(Math.random() * 10000 + 5000)} messages
                  </div>
                </div>
              </div>
              
              {/* Enhanced Data Flow */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: animationStarted ? 1 : 0 }}
                transition={{ duration: 2, delay: 1.2 }}
                className="relative"
              >
                <div className="w-24 lg:w-32 h-2 bg-gradient-to-r from-blue-400 to-transparent origin-left rounded-full" />
                <motion.div
                  animate={{ x: animationStarted ? [0, 96, 0] : 0 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-0 left-0 w-6 lg:w-8 h-2 bg-white rounded-full opacity-80"
                />
              </motion.div>
            </motion.div>

            {/* Enhanced 3D Prism */}
            <motion.div
              initial={{ opacity: 0, scale: 0, rotateY: -180 }}
              animate={{ 
                opacity: animationStarted ? 1 : 0, 
                scale: animationStarted ? 1 : 0, 
                rotateY: animationStarted ? 0 : -180,
              }}
              transition={{ 
                duration: 2.5, 
                delay: 1.8,
              }}
              className="relative z-20"
            >
              <motion.div
                animate={{ 
                  rotateZ: animationStarted ? [0, 360] : 0,
                  rotateY: animationStarted ? [0, 15, 0] : 0
                }}
                transition={{ 
                  rotateZ: { duration: 20, repeat: Infinity, ease: "linear" },
                  rotateY: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                }}
                className="relative"
              >
                {/* Main Prism Body */}
                <div className="w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 transform rotate-45 relative shadow-2xl">
                  {/* Inner Glow */}
                  <div className="absolute inset-3 lg:inset-4 bg-gradient-to-br from-white/30 to-transparent rounded-sm" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/20 rounded-sm" />
                  
                  {/* Prism Facets */}
                  <div className="absolute -top-1.5 lg:-top-2 -left-1.5 lg:-left-2 w-6 lg:w-8 h-6 lg:h-8 bg-gradient-to-br from-blue-300 to-blue-500 transform -rotate-45 opacity-90 shadow-lg" />
                  <div className="absolute -top-1.5 lg:-top-2 -right-1.5 lg:-right-2 w-6 lg:w-8 h-6 lg:h-8 bg-gradient-to-bl from-purple-300 to-purple-500 transform -rotate-45 opacity-90 shadow-lg" />
                  <div className="absolute -bottom-1.5 lg:-bottom-2 -left-1.5 lg:-left-2 w-6 lg:w-8 h-6 lg:h-8 bg-gradient-to-tr from-pink-300 to-pink-500 transform -rotate-45 opacity-90 shadow-lg" />
                  <div className="absolute -bottom-1.5 lg:-bottom-2 -right-1.5 lg:-right-2 w-6 lg:w-8 h-6 lg:h-8 bg-gradient-to-tl from-cyan-300 to-cyan-500 transform -rotate-45 opacity-90 shadow-lg" />
                  
                  {/* Central Core */}
                  <div className="absolute inset-6 lg:inset-8 bg-white rounded-full opacity-60 animate-pulse" />
                </div>

                {/* Prism Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 transform rotate-45 blur-xl opacity-30 scale-150" />
              </motion.div>
            </motion.div>

            {/* Enhanced Refracted Beams - Moved closer to prism */}
            <div className="absolute left-1/2 ml-16 lg:ml-20 flex flex-col items-start space-y-1 lg:space-y-2">
              {prismBeams.map((beam, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scaleX: 0, x: -100 }}
                  animate={{ 
                    opacity: animationStarted ? 1 : 0, 
                    scaleX: animationStarted ? 1 : 0,
                    x: animationStarted ? 0 : -100
                  }}
                  transition={{ duration: 1, delay: beam.delay }}
                  className="relative group cursor-pointer"
                  onMouseEnter={() => setHoveredBeam(index)}
                  onMouseLeave={() => setHoveredBeam(null)}
                  style={{ 
                    transform: `rotate(${beam.angle}deg)`,
                    transformOrigin: 'left center'
                  }}
                >
                  {/* Enhanced Beam - Responsive width */}
                  <div className={`w-24 lg:w-32 h-2 lg:h-3 bg-gradient-to-r ${beam.color} origin-left relative overflow-hidden rounded-full shadow-lg`}>
                    <motion.div
                      animate={{ x: [-150, 300] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-12"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-full" />
                  </div>
                  
                  {/* Enhanced Label - Better responsive positioning */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, x: 20 }}
                    animate={{ 
                      opacity: hoveredBeam === index ? 1 : 0,
                      scale: hoveredBeam === index ? 1 : 0.8,
                      x: hoveredBeam === index ? 0 : 20
                    }}
                    className="absolute left-full top-1/2 transform -translate-y-1/2 ml-4 lg:ml-6 bg-black/90 backdrop-blur-sm border border-white/20 rounded-xl p-3 lg:p-4 min-w-48 lg:min-w-64 shadow-2xl"
                    style={{ 
                      right: 'auto',
                      maxWidth: '280px',
                      zIndex: 1000
                    }}
                  >
                    <div className="flex items-center mb-2 lg:mb-3">
                      <beam.icon className="h-4 w-4 lg:h-5 lg:w-5 mr-2 lg:mr-3 text-white" />
                      <span className="font-semibold text-white text-sm lg:text-lg">{beam.label}</span>
                    </div>
                    <p className="text-gray-300 text-xs lg:text-sm leading-relaxed">{beam.description}</p>
                    <div className={`w-full h-0.5 lg:h-1 bg-gradient-to-r ${beam.color} rounded-full mt-2 lg:mt-3`} />
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Enhanced CTA Buttons - Better responsive sizing */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3, duration: 0.8 }}
            className="text-center"
          >
            <div className="flex flex-col sm:flex-row gap-4 lg:gap-6 justify-center items-center max-w-4xl mx-auto">
              <Button 
                size="lg" 
                onClick={() => navigate(user ? '/dashboard' : '/auth')}
                className="text-base lg:text-lg px-6 lg:px-8 py-4 lg:py-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-2xl shadow-blue-500/25 rounded-xl font-semibold w-full sm:w-auto"
              >
                {user ? 'Analyze Your Conversations' : 'Start Your Analysis'}
                <ArrowRight className="ml-2 lg:ml-3 h-4 w-4 lg:h-5 lg:w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-base lg:text-lg px-6 lg:px-8 py-4 lg:py-6 border-white/30 text-white hover:bg-white/10 rounded-xl font-semibold w-full sm:w-auto"
              >
                View Sample Analysis
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Enhanced Feature Cards Deck */}
      <section className="py-20 lg:py-32 bg-gradient-to-b from-black via-slate-950 to-black relative">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16 lg:mb-20"
          >
            <h2 className="text-4xl lg:text-6xl font-bold mb-6 lg:mb-8">
              Your Insights, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Revealed</span>
            </h2>
            <p className="text-lg lg:text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Each analysis creates a unique insight card in your personal collection. 
              Professional-grade reports that reveal the hidden patterns in your digital communication.
            </p>
          </motion.div>

          {/* Enhanced Fanned Card Deck - Better fan angle and spacing */}
          <div className="relative max-w-7xl mx-auto h-[500px] lg:h-[600px] flex items-center justify-center">
            {featureCards.map((card, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 200, rotate: 0 }}
                whileInView={{ 
                  opacity: 1, 
                  y: 0, 
                  rotate: (index - 2.5) * 6, // Reduced angle for better visibility
                  x: (index - 2.5) * 100 // Increased spacing
                }}
                whileHover={{ 
                  y: -40, 
                  rotate: 0, 
                  x: 0,
                  scale: 1.05,
                  zIndex: 50
                }}
                transition={{ 
                  duration: 0.8, 
                  delay: index * 0.15,
                  type: "spring",
                  stiffness: 200,
                  damping: 20
                }}
                viewport={{ once: true }}
                className="absolute w-80 lg:w-96 h-96 lg:h-[450px] cursor-pointer group"
                style={{ zIndex: featureCards.length - index }}
              >
                <Card className={`h-full bg-gradient-to-br ${card.gradient} border-0 shadow-2xl overflow-hidden relative transform-gpu`}>
                  {/* Enhanced Background Patterns */}
                  <div className="absolute inset-0 opacity-15">
                    {card.style === 'fbi' && (
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-200 to-amber-400" />
                    )}
                    {card.style === 'tech' && (
                      <div className="absolute inset-0" style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.1) 3px, rgba(255,255,255,0.1) 6px)'
                      }} />
                    )}
                    {card.style === 'reality' && (
                      <div className="absolute inset-0">
                        {[...Array(30)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute w-2 lg:w-3 h-2 lg:h-3 bg-white rounded-full animate-pulse"
                            style={{
                              left: `${Math.random() * 100}%`,
                              top: `${Math.random() * 100}%`,
                              animationDelay: `${Math.random() * 2}s`
                            }}
                          />
                        ))}
                      </div>
                    )}
                    {card.style === 'mirror' && (
                      <div className="absolute inset-0 bg-gradient-radial from-white/10 to-transparent" />
                    )}
                    {card.style === 'security' && (
                      <div className="absolute inset-0" style={{
                        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(255,255,255,0.05) 8px, rgba(255,255,255,0.05) 16px)'
                      }} />
                    )}
                    {card.style === 'social' && (
                      <div className="absolute inset-0" style={{
                        backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)'
                      }} />
                    )}
                  </div>

                  <CardHeader className="relative z-10 pb-3 lg:pb-4">
                    <div className="flex items-center justify-between mb-4 lg:mb-6">
                      <div className="w-14 h-14 lg:w-20 lg:h-20 bg-white/20 rounded-xl lg:rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30">
                        <card.icon className="h-7 w-7 lg:h-10 lg:w-10 text-white" />
                      </div>
                      <div className="px-3 lg:px-4 py-1 lg:py-2 bg-white/20 text-white border border-white/30 rounded-full text-xs lg:text-sm font-bold backdrop-blur-sm">
                        {card.preview}
                      </div>
                    </div>
                    <CardTitle className="text-white text-xl lg:text-2xl mb-2 lg:mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-200 transition-all duration-300 leading-tight">
                      {card.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <CardDescription className="text-white/90 text-sm lg:text-base leading-relaxed mb-4 lg:mb-6">
                      {card.description}
                    </CardDescription>
                    
                    {/* Feature List */}
                    <div className="space-y-1 lg:space-y-2">
                      {card.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center text-white/80 text-xs lg:text-sm">
                          <div className="w-1 lg:w-1.5 h-1 lg:h-1.5 bg-white rounded-full mr-2 lg:mr-3" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </CardContent>

                  {/* Enhanced Hover Effects */}
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            viewport={{ once: true }}
            className="text-center mt-16 lg:mt-20"
          >
            <p className="text-gray-400 text-base lg:text-lg">
              Hover over each card to explore the insights waiting to be discovered
            </p>
          </motion.div>
        </div>
      </section>

      {/* Enhanced Final CTA Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
        {/* Enhanced Background Animation */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black/30" />
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 lg:w-2 h-1 lg:h-2 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
                y: [0, -200],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                delay: Math.random() * 8,
              }}
            />
          ))}
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl lg:text-6xl font-bold text-white mb-6 lg:mb-8 leading-tight">
              Ready to Discover Your
              <span className="block">Digital Personality?</span>
            </h2>
            <p className="text-lg lg:text-2xl text-white/90 mb-8 lg:mb-12 max-w-4xl mx-auto leading-relaxed">
              Transform your ChatGPT conversations into profound insights about your communication patterns, 
              thinking style, and digital behavior through advanced AI analysis.
            </p>
            <Button 
              size="lg" 
              onClick={() => navigate(user ? '/dashboard' : '/auth')}
              className="text-lg lg:text-xl px-12 lg:px-16 py-6 lg:py-8 bg-white text-gray-900 hover:bg-gray-100 font-bold shadow-2xl rounded-xl transform hover:scale-105 transition-all duration-300"
            >
              {user ? 'Start New Analysis' : 'Begin Your Journey'}
              <Sparkles className="ml-2 lg:ml-3 h-5 w-5 lg:h-6 lg:w-6" />
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;