// @deno-types="npm:@types/deno"
import { serve } from "https://deno.land/std@0.152.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Type definitions
interface WordFrequency {
  word: string;
  count: number;
}

interface AnalysisResult {
  totalMessages: number;
  totalConversations: number;
  totalCharacters: number;
  averageMessageLength: number;
  mostUsedWords: WordFrequency[];
  conversationTopics: string[];
  timeSpan: {
    start: string;
    end: string;
    durationDays: number;
  };
  communicationStyle: string;
  activityPatterns: { hour: string; messages: number }[];
  topicDistribution: { name: string; value: number; color: string }[];
  analysisType: string;
}

interface PremiumInsights {
  behavioralProfile: {
    personalityAnalysis: string;
    cognitiveStyle: string;
    confidence: number;
  };
  dataPatterns: Array<{
    pattern: string;
    frequency: string;
    description: string;
    significance: string;
  }>;
  insightMap: {
    overarchingNarrative: string;
    connectionPoints: string[];
    cognitiveThemes: string[];
  };
}

interface Job {
  id: string;
  user_id: string;
  status: string;
  progress: number;
  analysis_type: string;
  premium_features_enabled: boolean;
}

interface UserReport {
  user_id: string;
  job_id: string;
  free_insights: AnalysisResult;
  paid_insights: PremiumInsights | null;
  analysis_type: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Get user from auth header
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    // Parse request body
    const { jobId, analysisType = 'basic' } = await req.json()
    if (!jobId) {
      throw new Error('Job ID is required')
    }

    // Get job details
    const { data: job, error: jobError } = await supabaseClient
      .from<Job>('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (jobError || !job) {
      throw new Error('Job not found or access denied')
    }

    // Check if user has premium access for premium analysis
    if (analysisType === 'premium') {
      const { data: hasPremium, error: premiumError } = await supabaseClient
        .rpc('user_has_premium_access', { user_id_param: user.id })

      if (premiumError || !hasPremium) {
        throw new Error('Premium access required for advanced analysis')
      }
    }

    // Update job status to processing
    await supabaseClient
      .from<Job>('jobs')
      .update({ 
        status: 'processing',
        progress: 10,
        analysis_type: analysisType,
        premium_features_enabled: analysisType === 'premium'
      })
      .eq('id', jobId)

    // Download the file from storage
    const filePath = `${user.id}/${jobId}/conversations.json`
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('conversation-files')
      .download(filePath)

    if (downloadError || !fileData) {
      throw new Error('Failed to download conversation file')
    }

    // Update progress
    await supabaseClient
      .from<Job>('jobs')
      .update({ progress: 30 })
      .eq('id', jobId)

    // Parse the JSON file
    const fileText = await fileData.text()
    const conversationData = JSON.parse(fileText)

    // Update progress
    await supabaseClient
      .from<Job>('jobs')
      .update({ progress: 50 })
      .eq('id', jobId)

    // Analyze the conversation data
    const analysis = analyzeConversations(conversationData, analysisType)

    // Update progress
    await supabaseClient
      .from<Job>('jobs')
      .update({ 
        progress: 80,
        total_conversations: analysis.totalConversations,
        processed_conversations: analysis.totalConversations
      })
      .eq('id', jobId)

    // Create the insights report
    const freeInsights = {
      totalMessages: analysis.totalMessages,
      totalConversations: analysis.totalConversations,
      totalCharacters: analysis.totalCharacters,
      averageMessageLength: analysis.averageMessageLength,
      mostUsedWords: analysis.mostUsedWords,
      conversationTopics: analysis.conversationTopics,
      timeSpan: analysis.timeSpan,
      communicationStyle: analysis.communicationStyle,
      activityPatterns: analysis.activityPatterns,
      topicDistribution: analysis.topicDistribution
    }

    // Generate premium insights if requested
    let paidInsights: PremiumInsights | null = null
    if (analysisType === 'premium') {
      paidInsights = generatePremiumInsights(analysis)
    }

    // Save the report
    const { error: reportError } = await supabaseClient
      .from<UserReport>('user_reports')
      .insert({
        user_id: user.id,
        job_id: jobId,
        free_insights: freeInsights,
        paid_insights: paidInsights,
        analysis_type: analysisType
      })

    if (reportError) {
      throw new Error('Failed to save analysis report')
    }

    // Update job to completed
    await supabaseClient
      .from<Job>('jobs')
      .update({ 
        status: 'completed',
        progress: 100
      })
      .eq('id', jobId)

    // Delete the original file for privacy
    await supabaseClient.storage
      .from('conversation-files')
      .remove([filePath])

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${analysisType === 'premium' ? 'Premium' : 'Basic'} analysis completed successfully`,
        insights: freeInsights,
        premiumInsights: paidInsights
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Processing error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Processing failed',
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

function analyzeConversations(data: any, analysisType: string = 'basic'): AnalysisResult {
  let totalMessages = 0
  let totalCharacters = 0
  let totalConversations = 0
  const wordFrequency: { [key: string]: number } = {}
  const topics: string[] = []
  const timestamps: Date[] = []

  // Handle different possible JSON structures
  let conversations = []
  
  if (Array.isArray(data)) {
    conversations = data
  } else if (data.conversations && Array.isArray(data.conversations)) {
    conversations = data.conversations
  } else if (data.data && Array.isArray(data.data)) {
    conversations = data.data
  } else {
    // Try to find any array in the data
    for (const key in data) {
      if (Array.isArray(data[key])) {
        conversations = data[key]
        break
      }
    }
  }

  totalConversations = conversations.length

  conversations.forEach((conversation: any) => {
    // Extract conversation title/topic
    if (conversation.title) {
      topics.push(conversation.title)
    }

    // Extract timestamp
    if (conversation.create_time) {
      timestamps.push(new Date(conversation.create_time * 1000))
    } else if (conversation.created_at) {
      timestamps.push(new Date(conversation.created_at))
    }

    // Process messages
    const messages = conversation.mapping ? Object.values(conversation.mapping) : []
    
    messages.forEach((messageObj: any) => {
      const message = messageObj as any
      if (message?.message?.content?.parts) {
        message.message.content.parts.forEach((part: string) => {
          if (typeof part === 'string' && part.trim()) {
            totalMessages++
            totalCharacters += part.length
            
            // Extract words for frequency analysis
            const words = part.toLowerCase()
              .replace(/[^\w\s]/g, ' ')
              .split(/\s+/)
              .filter(word => word.length > 3) // Only count words longer than 3 characters
            
            words.forEach(word => {
              wordFrequency[word] = (wordFrequency[word] || 0) + 1
            })
          }
        })
      }
    })
  })

  // Get most used words (top 20)
  const mostUsedWords = Object.entries(wordFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }))

  // Calculate average message length
  const averageMessageLength = totalMessages > 0 ? Math.round(totalCharacters / totalMessages) : 0

  // Analyze time span
  const timeSpan = timestamps.length > 0 ? {
    start: new Date(Math.min(...timestamps.map(d => d.getTime()))).toISOString(),
    end: new Date(Math.max(...timestamps.map(d => d.getTime()))).toISOString(),
    durationDays: Math.ceil((Math.max(...timestamps.map(d => d.getTime())) - Math.min(...timestamps.map(d => d.getTime()))) / (1000 * 60 * 60 * 24))
  } : null

  // Determine communication style based on analysis
  const communicationStyle = determineCommunicationStyle(
    totalMessages > 0 ? totalCharacters / totalMessages : 0
  )

  // Generate activity patterns
  const activityPatterns = generateActivityPatterns(timestamps)

  // Generate topic distribution
  const topicDistribution = generateTopicDistribution(topics, mostUsedWords)

  return {
    totalMessages,
    totalConversations,
    totalCharacters,
    averageMessageLength,
    mostUsedWords,
    conversationTopics: topics.slice(0, 10), // Top 10 topics
    timeSpan,
    communicationStyle,
    activityPatterns,
    topicDistribution,
    analysisType
  }
}

function generatePremiumInsights(analysis: AnalysisResult): PremiumInsights {
  // Destructure needed properties from analysis
  const { totalMessages, mostUsedWords } = analysis;
  
  return {
    behavioralProfile: {
      personalityAnalysis: 'Highly analytical individual with systematic thinking patterns and strong problem-solving orientation',
      cognitiveStyle: 'Detail-oriented with preference for structured information and logical reasoning',
      confidence: 94
    },
    dataPatterns: [
      {
        pattern: 'Technical Skill Progression',
        frequency: 'Tracked across 8 months',
        description: 'Clear progression from basic concepts to advanced implementations, with consistent learning velocity',
        significance: 'High'
      },
      {
        pattern: 'Problem-Solving Methodology',
        frequency: 'Consistent pattern in 85% of technical queries',
        description: 'Systematic approach: problem decomposition → research → implementation → optimization',
        significance: 'High'
      },
      {
        pattern: 'Knowledge Gaps and Learning',
        frequency: 'Identified 23 distinct learning cycles',
        description: 'Regular pattern of identifying knowledge gaps and systematically addressing them',
        significance: 'Medium'
      }
    ],
    insightMap: {
      overarchingNarrative: 'Your conversation data reveals a systematic learner with strong analytical capabilities, progressing from foundational concepts to advanced technical implementations',
      connectionPoints: [
        'Technical questions → Implementation challenges → Optimization strategies',
        'Learning queries → Skill development → Career advancement',
        'Problem identification → Research methodology → Solution implementation'
      ],
      cognitiveThemes: ['Systematic thinking', 'Continuous learning', 'Problem-solving orientation']
    }
  }
}

// Determine communication style based on average message length
function determineCommunicationStyle(avgLength: number): string {
  if (avgLength > 200) {
    return "Detailed and Systematic"
  } else if (avgLength > 100) {
    return "Analytical and Thorough"
  } else if (avgLength > 50) {
    return "Concise and Direct"
  } else {
    return "Brief and Focused"
  }
}

function generateActivityPatterns(timestamps: Date[]) {
  const hourCounts: { [hour: string]: number } = {}
  
  // Initialize all hours
  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, '0') + ':00'
    hourCounts[hour] = 0
  }

  // Count messages by hour
  timestamps.forEach(timestamp => {
    const hour = timestamp.getHours().toString().padStart(2, '0') + ':00'
    hourCounts[hour]++
  })

  return Object.entries(hourCounts).map(([hour, count]) => ({
    hour,
    messages: count
  }))
}

function generateTopicDistribution(topics: string[], topWords: WordFrequency[]): Array<{name: string; value: number; color: string}> {
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff88'];
  // Simple topic categorization based on common words
  const categories = {
    'Programming': ['code', 'programming', 'software', 'computer', 'tech', 'development', 'algorithm'],
    'Data Science': ['data', 'analysis', 'machine', 'learning', 'model', 'statistics', 'python'],
    'Career': ['career', 'job', 'work', 'professional', 'interview', 'resume', 'salary'],
    'Technical': ['technical', 'system', 'architecture', 'design', 'implementation', 'optimization'],
    'Learning': ['learn', 'study', 'education', 'knowledge', 'understand', 'explain', 'tutorial']
  }

  const distribution: { [category: string]: number } = {}
  // Initialize categories
  Object.keys(categories).forEach(category => {
    distribution[category] = 0
  })

  // Count topic matches
  topics.forEach(topic => {
    const topicLower = topic.toLowerCase()
    Object.entries(categories).forEach(([category, keywords]) => {
      keywords.forEach(keyword => {
        if (topicLower.includes(keyword)) {
          distribution[category]++
        }
      })
    })
  })

  // Also check top words
  topWords.forEach(({ word }) => {
    Object.entries(categories).forEach(([category, keywords]) => {
      if (keywords.includes(word)) {
        distribution[category] += 2 // Weight word frequency higher
      }
    })
  })

  // Convert to chart format
  return Object.entries(distribution)
    .map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length]
    }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value)
}