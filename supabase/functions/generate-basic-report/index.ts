import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Authorization required', { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response('Invalid token', { status: 401, headers: corsHeaders });
    }

    const { fileId } = await req.json();
    
    if (!fileId) {
      return new Response('File ID required', { status: 400, headers: corsHeaders });
    }

    // Get file info
    const { data: fileData, error: fileError } = await supabase
      .from('uploaded_files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single();

    if (fileError || !fileData) {
      return new Response('File not found', { status: 404, headers: corsHeaders });
    }

    // Generate placeholder basic report
    const basicReportData = {
      summary: "Basic Analysis Complete",
      totalConversations: 42,
      totalMessages: 1247,
      averageMessageLength: 127,
      topTopics: ["Programming", "AI", "Technology", "Career", "Learning"],
      communicationStyle: "Analytical and Inquisitive",
      activityPattern: "Most active during weekday afternoons",
      insights: [
        "You tend to ask detailed technical questions",
        "Your conversations show a strong learning orientation",
        "You prefer structured, step-by-step explanations"
      ],
      generatedAt: new Date().toISOString()
    };

    // Save report to database
    const { error: reportError } = await supabase
      .from('reports')
      .insert({
        user_id: user.id,
        file_id: fileId,
        report_type: 'basic',
        report_data: basicReportData
      });

    if (reportError) {
      console.error('Error saving report:', reportError);
      return new Response('Failed to save report', { status: 500, headers: corsHeaders });
    }

    // Update file to mark it has basic report
    await supabase
      .from('uploaded_files')
      .update({ has_basic_report: true })
      .eq('id', fileId);

    return new Response(
      JSON.stringify({ success: true, report: basicReportData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});