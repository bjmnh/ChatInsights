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
  Zap, 
  Users, 
  MessageSquare, 
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Star,
  Database,
  Code,
  Network
} from 'lucide-react';
import { motion } from 'framer-motion';

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const features = [
    {
      icon: <MessageSquare className="h-6 w-6" />,
      title: "Conversation Analytics",
      description: "Comprehensive analysis of communication patterns, engagement levels, and topic distribution"
    },
    {
      icon: <Database className="h-6 w-6" />,
      title: "Behavioral Profiling",
      description: "Advanced ML analysis of cognitive patterns, learning styles, and problem-solving approaches"
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Data Visualization",
      description: "Professional charts and graphs to visualize your conversation patterns and insights"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Privacy-First",
      description: "Your data is processed securely and automatically deleted after analysis"
    }
  ];

  const steps = [
    {
      icon: <Upload className="h-8 w-8" />,
      title: "Upload Your Data",
      description: "Export and upload your ChatGPT conversations.json file"
    },
    {
      icon: <Brain className="h-8 w-8" />,
      title: "AI Analysis",
      description: "Advanced machine learning analyzes your conversation patterns"
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Get Insights",
      description: "Receive detailed reports about your communication and learning patterns"
    }
  ];

  const testimonials = [
    {
      name: "Alex Chen",
      role: "Senior Software Engineer",
      content: "The behavioral analysis was incredibly accurate. It identified my learning patterns and problem-solving approach better than I could have described myself.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    },
    {
      name: "Sarah Kim",
      role: "Data Scientist", 
      content: "The pattern detection found clear progression in my technical skills over months. It's like having a data-driven career coach.",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
    },
    {
      name: "Marcus Rodriguez",
      role: "Tech Lead",
      content: "As someone who values privacy, I appreciate the transparent data handling. The insights into my cognitive style were surprisingly detailed.",
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
              <Zap className="h-3 w-3 mr-1" />
              Advanced Analytics Platform
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Professional
              <span className="text-primary"> ChatGPT </span>
              Analytics
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Advanced conversation analytics for developers. Understand your learning patterns, 
              communication style, and cognitive approach through data-driven insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => navigate(user ? '/dashboard' : '/auth')}
                className="text-lg px-8 py-6"
              >
                {user ? 'Go to Dashboard' : 'Start Analysis'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                View Sample Report
              </Button>
            </div>
          </motion.div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 opacity-20">
          <Brain className="h-16 w-16 text-primary animate-pulse" />
        </div>
        <div className="absolute bottom-20 right-10 opacity-20">
          <Database className="h-12 w-12 text-primary animate-bounce" />
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
              Professional-Grade Analytics
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Advanced machine learning tools designed for developers who want comprehensive insights
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
                <Card className="h-full hover:shadow-lg transition-shadow duration-300">
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
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get professional insights in three simple steps
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
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
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
              What Developers Say
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Real feedback from developers using our analytics platform
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
                <Card className="h-full">
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

      {/* Privacy Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center max-w-4xl mx-auto"
          >
            <Shield className="h-16 w-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Privacy-First Analytics
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Your conversation data is processed securely and automatically deleted after analysis. 
              We only retain the insights, never your raw conversations.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="p-6 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">Automatic Deletion</h4>
                <p className="text-sm text-muted-foreground">
                  Raw conversation files are permanently deleted within hours of processing
                </p>
              </div>
              <div className="p-6 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">Encrypted Processing</h4>
                <p className="text-sm text-muted-foreground">
                  All data is encrypted in transit and at rest during analysis
                </p>
              </div>
              <div className="p-6 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">No Data Sharing</h4>
                <p className="text-sm text-muted-foreground">
                  Your data is never shared, sold, or used for training other models
                </p>
              </div>
            </div>
          </motion.div>
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
              Ready for Professional Analytics?
            </h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Join developers who use data-driven insights to understand their learning patterns 
              and optimize their professional growth.
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => navigate(user ? '/dashboard' : '/auth')}
              className="text-lg px-8 py-6"
            >
              {user ? 'Start New Analysis' : 'Get Started Free'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;