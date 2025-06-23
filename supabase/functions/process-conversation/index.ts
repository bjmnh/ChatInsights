// @deno-types="npm:@types/deno"
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- Shared Imports ---
import { corsHeaders, handleError } from './_shared/utils.ts';
import {
  Job,
  UserReport,
  BasicAnalysisResult,
  AdvancedAnalysisResult,
  RawConversation,
  PerConversationInsights
} from './_shared/types.ts';

// --- Analysis Imports ---
import { performBasicAnalysis } from './analysis/basicAnalyzer.ts';
import { processConversationWithFastLlm } from './analysis/premium/stage1_processors.ts';
import { generateAllPremiumInsights } from './analysis/premium/stage2_generators.ts';

// Helper function to create consistent responses with CORS headers
const jsonResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
};

// --- Main Server Logic ---
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      } 
    });
  }

  // Initialize Supabase client for this request
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } } // Pass auth for RLS
  );

  let jobId: string | null = null; // To ensure jobId is available for error updates

  try {
    // --- Authentication ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing or invalid authorization header' }, 401);
    }
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(); // Uses header from client init
    if (authError || !user) {
      console.error("Auth error:", authError);
      return jsonResponse({ error: 'Invalid token or user not found' }, 401);
    }

    // --- Request Body & Job Validation ---
    const requestBody = await req.json();
    jobId = requestBody.jobId; // Assign to outer scope variable
    const analysisType = requestBody.analysisType || 'basic';

    if (!jobId) {
      return jsonResponse({ error: 'Job ID is required' }, 400);
    }

    const { data: jobData, error: jobError } = await supabaseClient
      .from('jobs')
      .select('id, user_id, file_path, status, premium_features_enabled')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError) throw new Error(`Job query error: ${jobError.message}`);
    if (!jobData) throw new Error('Job not found or access denied');
    if (jobData.status === 'completed') {
      console.log(`Job ${jobId} already completed. Returning existing report if available.`);
      // Optionally fetch and return existing report data
      const { data: existingReport } = await supabaseClient
        .from('user_reports')
        .select('free_insights, paid_insights, analysis_type')
        .eq('job_id', jobId)
        .single();
      if (existingReport) {
          return jsonResponse({
            success: true,
            message: 'Analysis previously completed.',
            report: {
                free_insights: existingReport.free_insights,
                paid_insights: existingReport.paid_insights,
                analysis_type: existingReport.analysis_type
            }
          });
      }
      // If report not found but job is completed, it's an odd state, but we can just say completed.
      return jsonResponse({ success: true, message: 'Analysis already completed for this job.' });
    }
    if (!jobData.file_path) throw new Error('Job record missing file_path');

    // --- Premium Access Check ---
    let effectivePremiumEnabled = jobData.premium_features_enabled || false;
    if (analysisType === 'premium' && !effectivePremiumEnabled) {
      // Check if user has premium access via orders
      const { data: userOrders } = await supabaseClient
        .from('stripe_user_orders')
        .select('payment_status, order_status')
        .eq('payment_status', 'paid')
        .eq('order_status', 'completed');

      if (!userOrders || userOrders.length === 0) {
        await supabaseClient.from('jobs').update({ status: 'failed', progress: 0, error_message: 'Premium access required' }).eq('id', jobId);
        return jsonResponse({ error: 'Premium access required for advanced analysis' }, 403);
      }
      effectivePremiumEnabled = true; // User has premium, ensure job reflects this
      if (!jobData.premium_features_enabled) {
        await supabaseClient.from('jobs').update({ premium_features_enabled: true }).eq('id', jobId);
      }
    }


    await supabaseClient.from('jobs').update({ status: 'processing', progress: 10, analysis_type: analysisType }).eq('id', jobId);

    // --- Download and Parse Conversation File ---
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('conversation-files')
      .download(jobData.file_path);

    if (downloadError) throw new Error(`Failed to download conversation file: ${downloadError.message}`);
    if (!fileData) throw new Error('Conversation file data is null');

    await supabaseClient.from('jobs').update({ progress: 20 }).eq('id', jobId); // Increased progress

    const fileText = await fileData.text();
    let parsedConversationData: RawConversation[];
    try {
        let rawParsed: any = JSON.parse(fileText);
        if (!Array.isArray(rawParsed)) {
            let foundArray = false;
            for (const key in rawParsed) {
                if (Array.isArray(rawParsed[key]) && rawParsed[key].length > 0 && rawParsed[key][0].hasOwnProperty('mapping')) { // More specific check for OpenAI array
                    rawParsed = rawParsed[key];
                    foundArray = true;
                    break;
                }
            }
            if (!foundArray && typeof rawParsed === 'object' && rawParsed !== null) {
                if (rawParsed.hasOwnProperty('id') && rawParsed.hasOwnProperty('mapping')) {
                     rawParsed = [rawParsed]; // Single conversation object
                } else {
                    throw new Error('Parsed data is not an array and no recognizable conversation structure found within the object.');
                }
            } else if (!foundArray) {
                 throw new Error('Parsed data is not an array and no recognizable conversation structure found within the object.');
            }
        }
        parsedConversationData = rawParsed as RawConversation[]; // Assume it's now in the correct format
        if (parsedConversationData.length === 0) {
            throw new Error("No conversations found in the parsed data.");
        }
    } catch (parseError) {
        await supabaseClient.from('jobs').update({ status: 'failed', progress: 0, error_message: `JSON parsing error: ${parseError.message}` }).eq('id', jobId);
        throw new Error(`JSON parsing error: ${parseError.message}`);
    }

    await supabaseClient.from('jobs').update({ progress: 30, total_conversations: parsedConversationData.length }).eq('id', jobId);

    // --- Perform Basic Analysis (Always) ---
    console.log(`Starting basic analysis for job ${jobId}...`);
    const basicInsights: BasicAnalysisResult = performBasicAnalysis(parsedConversationData);
    await supabaseClient.from('jobs').update({ progress: 50 }).eq('id', jobId);

    // --- Perform Premium Analysis (If Applicable) ---
    let advancedInsights: AdvancedAnalysisResult | null = null;
    if (analysisType === 'premium' && effectivePremiumEnabled) {
      console.log(`Starting Stage 1 premium analysis (per-conversation) for job ${jobId}...`);
      await supabaseClient.from('jobs').update({ progress: 60 }).eq('id', jobId);

      const allPerConversationInsights: PerConversationInsights[] = [];
      let processedCount = 0;

      // Process conversations in parallel (with a limit to avoid overwhelming resources/APIs)
      const CONCURRENCY_LIMIT = 5; // Adjust as needed
      const promises: Promise<PerConversationInsights | null>[] = [];

      for (const conversation of parsedConversationData) {
          const promise = processConversationWithFastLlm(conversation)
            .then(insight => {
                processedCount++;
                // Update progress more frequently during this long step
                if (jobId && parsedConversationData.length > 0) { // Check jobId exists
                    const currentProgress = 60 + Math.floor((processedCount / parsedConversationData.length) * 20); // Stage 1 takes up 20% progress (60 to 80)
                    supabaseClient.from('jobs').update({ progress: currentProgress, processed_conversations: processedCount }).eq('id', jobId).then().catch(e => console.error("Progress update failed:", e));
                }
                return insight;
            });
          promises.push(promise);

          if (promises.length >= CONCURRENCY_LIMIT) {
              const results = await Promise.all(promises);
              results.forEach(insight => insight && allPerConversationInsights.push(insight));
              promises.length = 0; // Clear the array for the next batch
          }
      }
      // Process any remaining promises
      if (promises.length > 0) {
          const results = await Promise.all(promises);
          results.forEach(insight => insight && allPerConversationInsights.push(insight));
      }

      console.log(`Stage 1 processing complete. ${allPerConversationInsights.length} conversations yielded insights.`);
      await supabaseClient.from('jobs').update({ progress: 80, processed_conversations: processedCount }).eq('id', jobId);


      if (allPerConversationInsights.length > 0) {
        console.log(`Starting Stage 2 premium analysis (aggregation) for job ${jobId}...`);
        advancedInsights = await generateAllPremiumInsights(allPerConversationInsights, basicInsights, supabaseClient);
        await supabaseClient.from('jobs').update({ progress: 90 }).eq('id', jobId);
      } else {
        console.log("No per-conversation insights collected, skipping Stage 2.");
        advancedInsights = { processingErrors: ["No data from Stage 1 processing to generate premium reports."] };
      }
    }

    // --- Save Report ---
    console.log(`Saving report for job ${jobId}...`);
    const { error: reportError } = await supabaseClient
      .from('user_reports')
      .insert({
        user_id: user.id,
        job_id: jobId,
        free_insights: basicInsights,
        paid_insights: advancedInsights,
        analysis_type: analysisType,
      });

    if (reportError) {
      await supabaseClient.from('jobs').update({ status: 'failed', progress: 90, error_message: `Failed to save report: ${reportError.message}` }).eq('id', jobId);
      throw new Error(`Failed to save analysis report: ${reportError.message}`);
    }

    await supabaseClient.from('jobs').update({ status: 'completed', progress: 100 }).eq('id', jobId);

    // --- Cleanup: Delete the original file for privacy ---
    try {
        console.log(`Deleting source file ${jobData.file_path} for job ${jobId}...`);
        const { error: deleteError } = await supabaseClient.storage.from('conversation-files').remove([jobData.file_path]);
        if (deleteError) {
            console.warn(`Failed to delete source file ${jobData.file_path}: ${deleteError.message}. Manual cleanup may be required.`);
            // Don't fail the whole job for this, but log it.
        }
    } catch (e) {
        console.warn(`Error during source file deletion for job ${jobId}: ${e.message}`);
    }


    console.log(`${analysisType} analysis completed successfully for job ${jobId}.`);
    return jsonResponse({
      success: true,
      message: `${analysisType} analysis completed successfully`,
      report: { free_insights: basicInsights, paid_insights: advancedInsights }
    });

  } catch (error) {
    console.error(`Processing error for job ${jobId || 'UNKNOWN'}:`, error);
    if (jobId) { // Check if jobId was set before attempting to update
        await supabaseClient.from('jobs').update({ status: 'failed', progress: 0, error_message: error.message }).eq('id', jobId).catch(e => console.error("Fatal: Failed to update job to failed status:", e));
    }
    return jsonResponse({ error: error.message || 'An unknown error occurred' }, 500);
  }
});