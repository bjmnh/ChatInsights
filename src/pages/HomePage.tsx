import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Brain, 
  Upload, 
  BarChart3, 
  Shield, 
  Users, 
  MessageSquare, 
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Star,
  Database,
  Eye,
  Search,
  Target,
  FileText,
  Tv,
  Globe,
  Zap,
  Sparkles
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
      angle: -30,
      delay: 0.5
    },
    { 
      color: 'from-orange-500 to-orange-600', 
      label: 'Linguistic', 
      description: 'Language pattern analysis',
      icon: FileText,
      angle: -15,
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
      label: 'Reality TV', 
      description: 'Your entertainment persona',
      icon: Tv,
      angle: 15,
      delay: 1.1
    },
    { 
      color: 'from-blue-500 to-blue-600', 
      label: 'Mirror', 
      description: 'Unfiltered self-reflection',
      icon: Eye,
      angle: 30,
      delay: 1.3
    },
    { 
      color: 'from-purple-500 to-purple-600', 
      label: 'Safety Compass', 
      description: 'Privacy & security analysis',
      icon: Shield,
      angle: 45,
      delay: 1.5
    },
    { 
      color: 'from-pink-500 to-pink-600', 
      label: 'Doppelgänger', 
      description: 'Your digital twin',
      icon: Globe,
      angle: 60,
      delay: 1.7
    }
  ];

  const featureCards = [
    {
      title: "Digital Behavioral Dossier",
      description: "An objective analysis of your behavioral patterns",
      icon: Brain,
      gradient: "from-red-500 to-red-600",
      bgPattern: "confidential-file",
      preview: "CONFIDENTIAL",
      style: "fbi"
    },
    {
      title: "Linguistic Fingerprint", 
      description: "Your unique communication signature revealed",
      icon: BarChart3,
      gradient: "from-orange-500 to-orange-600", 
      bgPattern: "soundwave",
      preview: "ANALYZING...",
      style: "tech"
    },
    {
      title: "Reality TV Persona",
      description: "How you'd appear on reality television",
      icon: Tv,
      gradient: "from-pink-500 to-pink-600",
      bgPattern: "glitter",
      preview: "ON AIR",
      style: "reality"
    },
    {
      title: "The Unfiltered Mirror",
      description: "The one thing it learned about you...",
      icon: Eye,
      gradient: "from-gray-700 to-gray-900",
      bgPattern: "minimal",
      preview: "REFLECTING...",
      style: "mirror"
    },
    {
      title: "PII Safety Compass",
      description: "Your privacy and security assessment",
      icon: Shield,
      gradient: "from-green-500 to-green-600",
      bgPattern: "security",
      preview: "SCANNING...",
      style: "security"
    },
    {
      title: "Digital Doppelgänger",
      description: "Your hypothetical social media presence",
      icon: Globe,
      gradient: "from-blue-500 to-blue-600",
      bgPattern: "social",
      preview: "@username",
      style: "social"
    }
  ];

  const testimonials = [
    {
      name: "Alex Chen",
      role: "Senior Software Engineer",
      content: "The analysis revealed patterns in my problem-solving approach that I never consciously recognized. It's like having a data scientist analyze your thinking process.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      rating: 5
    },
    {
      name: "Sarah Kim",
      role: "Data Scientist", 
      content: "Finally, a tool that respects privacy while delivering genuine insights. The skill progression analysis helped me understand my learning velocity.",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      rating: 5
    },
    {
      name: "Marcus Rodriguez",
      role: "Tech Lead",
      content: "The depth of analysis is impressive. It identified cognitive patterns I use in technical discussions that I wasn't even aware of.",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Hero Section - The Digital Prism */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background Particles */}
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
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
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: Math.random() * 4,
              }}
            />
          ))}
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Badge variant="secondary" className="mb-6 bg-white/10 text-white border-white/20">
                <Sparkles className="h-3 w-3 mr-1" />
                Advanced Conversation Analytics
              </Badge>
              <h1 className="text-5xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent">
                See Your Thoughts
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                  Refracted
                </span>
              </h1>
              <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                Transform your raw conversation data into a beautiful spectrum of insights. 
                Your digital mind, visualized through the prism of AI analysis.
              </p>
            </motion.div>
          </div>

          {/* The Digital Prism Animation */}
          <div className="relative flex items-center justify-center mb-16 h-96">
            {/* Data Stream Input */}
            <motion.div
              initial={{ opacity: 0, x: -200 }}
              animate={{ opacity: animationStarted ? 1 : 0, x: animationStarted ? 0 : -200 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="absolute left-0 flex items-center"
            >
              <div className="text-right mr-8">
                <div className="text-sm text-gray-400 mb-2">Raw Conversation Data</div>
                <div className="font-mono text-xs text-gray-500 bg-gray-900/50 p-3 rounded border">
                  conversations.json
                </div>
              </div>
              
              {/* Flowing Data Line */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: animationStarted ? 1 : 0 }}
                transition={{ duration: 1.5, delay: 1 }}
                className="w-32 h-1 bg-gradient-to-r from-white to-transparent origin-left"
              />
            </motion.div>

            {/* The Prism */}
            <motion.div
              initial={{ opacity: 0, scale: 0, rotateY: -180 }}
              animate={{ 
                opacity: animationStarted ? 1 : 0, 
                scale: animationStarted ? 1 : 0, 
                rotateY: animationStarted ? 0 : -180,
                rotateZ: animationStarted ? [0, 360] : 0
              }}
              transition={{ 
                duration: 2, 
                delay: 1.5,
                rotateZ: { duration: 20, repeat: Infinity, ease: "linear" }
              }}
              className="relative z-20"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 transform rotate-45 relative">
                <div className="absolute inset-2 bg-gradient-to-br from-white/20 to-transparent rounded-sm" />
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/10 rounded-sm" />
                
                {/* Prism Facets */}
                <div className="absolute -top-1 -left-1 w-6 h-6 bg-gradient-to-br from-blue-300 to-blue-500 transform -rotate-45 opacity-80" />
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-bl from-purple-300 to-purple-500 transform -rotate-45 opacity-80" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 bg-gradient-to-tr from-pink-300 to-pink-500 transform -rotate-45 opacity-80" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-tl from-cyan-300 to-cyan-500 transform -rotate-45 opacity-80" />
              </div>
            </motion.div>

            {/* Refracted Beams */}
            <div className="absolute right-0 flex flex-col items-start space-y-2">
              {prismBeams.map((beam, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scaleX: 0, x: -50 }}
                  animate={{ 
                    opacity: animationStarted ? 1 : 0, 
                    scaleX: animationStarted ? 1 : 0,
                    x: animationStarted ? 0 : -50
                  }}
                  transition={{ duration: 0.8, delay: beam.delay }}
                  className="relative group cursor-pointer"
                  onMouseEnter={() => setHoveredBeam(index)}
                  onMouseLeave={() => setHoveredBeam(null)}
                  style={{ transform: `rotate(${beam.angle}deg)` }}
                >
                  {/* Beam */}
                  <div className={`w-32 h-2 bg-gradient-to-r ${beam.color} origin-left relative overflow-hidden`}>
                    <motion.div
                      animate={{ x: [-100, 200] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-8"
                    />
                  </div>
                  
                  {/* Label */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ 
                      opacity: hoveredBeam === index ? 1 : 0,
                      scale: hoveredBeam === index ? 1 : 0.8
                    }}
                    className="absolute left-full top-1/2 transform -translate-y-1/2 ml-4 bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg p-3 min-w-48"
                  >
                    <div className="flex items-center mb-2">
                      <beam.icon className="h-4 w-4 mr-2" />
                      <span className="font-semibold text-sm">{beam.label}</span>
                    </div>
                    <p className="text-xs text-gray-300">{beam.description}</p>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2, duration: 0.8 }}
            className="text-center"
          >
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => navigate(user ? '/dashboard' : '/auth')}
                className="text-lg px-8 py-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-2xl shadow-blue-500/25"
              >
                {user ? 'Analyze Your Data' : 'Start Analysis'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-6 border-white/20 text-white hover:bg-white/10"
              >
                Explore a Sample Mind
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Cards Deck */}
      <section className="py-20 bg-gradient-to-b from-black to-gray-900 relative">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Your Insights, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Visualized</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Each analysis creates a unique card in your personal deck of insights. 
              Collect them all to see the complete picture of your digital mind.
            </p>
          </motion.div>

          {/* Fanned Card Deck */}
          <div className="relative max-w-6xl mx-auto h-96 flex items-center justify-center">
            {featureCards.map((card, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 100, rotate: 0 }}
                whileInView={{ 
                  opacity: 1, 
                  y: 0, 
                  rotate: (index - 2.5) * 8,
                  x: (index - 2.5) * 40
                }}
                whileHover={{ 
                  y: -20, 
                  rotate: 0, 
                  x: 0,
                  scale: 1.05,
                  zIndex: 50
                }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 300
                }}
                viewport={{ once: true }}
                className="absolute w-64 h-80 cursor-pointer group"
                style={{ zIndex: featureCards.length - index }}
              >
                <Card className={`h-full bg-gradient-to-br ${card.gradient} border-0 shadow-2xl overflow-hidden relative`}>
                  {/* Card Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    {card.style === 'fbi' && (
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-200 to-amber-400" />
                    )}
                    {card.style === 'tech' && (
                      <div className="absolute inset-0" style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
                      }} />
                    )}
                    {card.style === 'reality' && (
                      <div className="absolute inset-0">
                        {[...Array(20)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute w-2 h-2 bg-white rounded-full animate-pulse"
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
                      <div className="absolute inset-0 bg-gradient-radial from-white/5 to-transparent" />
                    )}
                  </div>

                  <CardHeader className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <card.icon className="h-8 w-8 text-white" />
                      <Badge variant="secondary" className="bg-white/20 text-white border-0">
                        {card.preview}
                      </Badge>
                    </div>
                    <CardTitle className="text-white text-xl mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-200 transition-all duration-300">
                      {card.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <CardDescription className="text-white/80 text-base">
                      {card.description}
                    </CardDescription>
                  </CardContent>

                  {/* Hover Glow Effect */}
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 1 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <p className="text-gray-400 text-sm">
              Hover over each card to see a preview of your personalized insights
            </p>
          </motion.div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Trusted by <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">Developers</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Join thousands of developers who've discovered their digital personality through data
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group"
              >
                <Card className="h-full bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 backdrop-blur-sm">
                  <CardContent className="p-8">
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-gray-300 mb-6 italic leading-relaxed">
                      "{testimonial.content}"
                    </p>
                    <div className="flex items-center">
                      <img 
                        src={testimonial.avatar} 
                        alt={testimonial.name}
                        className="w-12 h-12 rounded-full mr-4 border-2 border-gray-600 group-hover:border-gray-500 transition-colors"
                      />
                      <div>
                        <p className="font-semibold text-white">{testimonial.name}</p>
                        <p className="text-sm text-gray-400">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black/20" />
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
                y: [0, -100],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                delay: Math.random() * 6,
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
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Ready to See Your Mind Refracted?
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
              Transform your conversations into insights. Discover patterns you never knew existed. 
              See yourself through the lens of advanced AI analysis.
            </p>
            <Button 
              size="lg" 
              onClick={() => navigate(user ? '/dashboard' : '/auth')}
              className="text-lg px-12 py-6 bg-white text-gray-900 hover:bg-gray-100 font-semibold shadow-2xl"
            >
              {user ? 'Start New Analysis' : 'Begin Your Analysis'}
              <Sparkles className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;