import React from 'react';
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
  Target
} from 'lucide-react';
import { motion } from 'framer-motion';

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const features = [
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Conversation Analytics",
      description: "Quantitative analysis of your communication patterns, engagement metrics, and interaction data"
    },
    {
      icon: <Search className="h-6 w-6" />,
      title: "Behavioral Pattern Recognition",
      description: "Advanced algorithms identify learning styles, problem-solving approaches, and cognitive patterns"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Data Visualization",
      description: "Professional-grade charts and insights that reveal the story hidden in your conversation data"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Privacy-First Processing",
      description: "Your raw data is automatically deleted after analysis. We keep only the insights, never your conversations"
    }
  ];

  const steps = [
    {
      icon: <Upload className="h-8 w-8" />,
      title: "Upload Your Data",
      description: "Securely upload your ChatGPT conversations.json export file"
    },
    {
      icon: <Brain className="h-8 w-8" />,
      title: "Advanced Analysis",
      description: "Our algorithms analyze patterns, extract insights, then delete your raw data"
    },
    {
      icon: <Eye className="h-8 w-8" />,
      title: "Discover Your Story",
      description: "Receive detailed reports revealing your unique communication and learning patterns"
    }
  ];

  const testimonials = [
    {
      name: "Alex Chen",
      role: "Senior Software Engineer",
      content: "The analysis revealed patterns in my problem-solving approach that I never consciously recognized. It's like having a data scientist analyze your thinking process.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    },
    {
      name: "Sarah Kim",
      role: "Data Scientist", 
      content: "Finally, a tool that respects privacy while delivering genuine insights. The skill progression analysis helped me understand my learning velocity.",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
    },
    {
      name: "Marcus Rodriguez",
      role: "Tech Lead",
      content: "The depth of analysis is impressive. It identified cognitive patterns I use in technical discussions that I wasn't even aware of.",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <Badge variant="secondary" className="mb-6">
              <Database className="h-3 w-3 mr-1" />
              Advanced Conversation Analytics
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Understand Your
              <span className="text-primary"> Digital Mind</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Professional conversation analytics that reveal your unique communication patterns, 
              learning style, and cognitive approach. Your data, your insights, your story.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => navigate(user ? '/dashboard' : '/auth')}
                className="text-lg px-8 py-6"
              >
                {user ? 'Analyze Your Data' : 'Start Analysis'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                View Sample Report
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Data-Driven Self-Discovery
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Advanced analytics designed for developers who value both insights and privacy
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary/20 hover:border-l-primary">
                  <CardHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Your Data Journey
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Three steps to understanding your digital communication patterns
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-primary/20">
                  {step.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
                {index < steps.length - 1 && (
                  <ArrowRight className="h-6 w-6 text-muted-foreground mx-auto mt-6 hidden md:block" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Developer Insights
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Real feedback from developers who've discovered their data story
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-l-4 border-l-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-6 italic">
                      "{testimonial.content}"
                    </p>
                    <div className="flex items-center">
                      <img 
                        src={testimonial.avatar} 
                        alt={testimonial.name}
                        className="w-10 h-10 rounded-full mr-3"
                      />
                      <div>
                        <p className="font-semibold">{testimonial.name}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Ready to Discover Your Data Story?
            </h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Join developers who use data-driven insights to understand their communication patterns 
              and optimize their learning approach.
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => navigate(user ? '/dashboard' : '/auth')}
              className="text-lg px-8 py-6"
            >
              {user ? 'Start New Analysis' : 'Begin Your Analysis'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;