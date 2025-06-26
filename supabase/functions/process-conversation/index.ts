// Declare Deno types for TypeScript
declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
  exit: (code?: number) => never;
};

// Import required modules
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Web Crypto API is globally available in Deno
await import('node:crypto').then(m => m.webcrypto);

// --- Constants ---
const CONVERSATIONS_FILENAME = 'conversations.json';
const DEFAULT_ANALYSIS_TYPE = 'basic';
const PRIMARY_BUCKET_NAME = 'conversation-files';

// --- Configuration and Initialization ---
interface AppConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
  supabaseClient: SupabaseClient;
}

function initializeApp(): AppConfig {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
    Deno.exit(1);
  }

  const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return { supabaseUrl, serviceRoleKey, supabaseClient };
}

const config = initializeApp();

// --- Types ---
interface RequestBody {
  jobId: string;
  analysisType?: 'basic' | 'premium';
}

interface JobData {
  id: string;
  user_id: string;
  filename?: string;
  file_path?: string;
  status: string;
  premium_features_enabled: boolean;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  analysis_type: string;
  error_message?: string | null;
  progress?: number;
  total_conversations?: number | null;
  processed_conversations?: number;
  result?: string;
}

interface FileInfo {
  bucketName: string;
  filePath: string;
  fullStoragePath: string;
}

interface StorageFile {
  name: string;
  id?: string;
}

// --- Generic Helper Functions ---
const createJsonResponse = (data: unknown, status = 200, additionalHeaders = {}): Response => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...additionalHeaders,
    },
  });
};

// --- Supabase Interaction Helpers ---
async function supabaseRestApiRequest(
  endpoint: string,
  options: RequestInit = {},
  appConfig: AppConfig = config
): Promise<Response> {
  const url = new URL(endpoint, appConfig.supabaseUrl);
  const headers = new Headers(options.headers);
  headers.set('apikey', appConfig.serviceRoleKey);
  headers.set('Authorization', `Bearer ${appConfig.serviceRoleKey}`);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  
  return fetch(url.toString(), { ...options, headers });
}

async function updateJob(
  jobId: string,
  updateData: Partial<JobData> & { updated_at: string },
  appConfig: AppConfig = config
): Promise<Response> {
  console.log(`Updating job ${jobId} with:`, JSON.stringify(updateData, null, 2));
  
  const response = await supabaseRestApiRequest(`/rest/v1/jobs?id=eq.${jobId}`, {
    method: 'PATCH',
    body: JSON.stringify(updateData),
  }, appConfig);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to update job ${jobId}:`, errorText);
    throw new Error(`Failed to update job: ${response.status} ${errorText}`);
  }
  
  console.log(`Successfully updated job ${jobId}`);
  return response;
}

async function createUserReport(
  userId: string,
  jobId: string,
  freeInsights: any,
  paidInsights: any = null,
  analysisType: string = 'basic',
  appConfig: AppConfig = config
): Promise<void> {
  console.log(`Creating user report for job ${jobId}`);
  
  const reportData = {
    user_id: userId,
    job_id: jobId,
    free_insights: freeInsights,
    paid_insights: paidInsights,
    analysis_type: analysisType,
    generated_at: new Date().toISOString()
  };
  
  const response = await supabaseRestApiRequest('/rest/v1/user_reports', {
    method: 'POST',
    body: JSON.stringify(reportData),
  }, appConfig);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to create user report:`, errorText);
    throw new Error(`Failed to create user report: ${response.status} ${errorText}`);
  }
  
  console.log(`Successfully created user report for job ${jobId}`);
}

async function handleJobFailure(
  jobId: string | null,
  error: Error,
  contextMessage: string = 'Processing',
  appConfig: AppConfig = config
): Promise<Response> {
  const errorMessage = `${contextMessage} failed: ${error.message || 'Unknown error'}`;
  console.error(errorMessage, error.stack);

  if (jobId) {
    try {
      await updateJob(jobId, {
        status: 'failed',
        error_message: errorMessage.substring(0, 2000),
        progress: 0,
        updated_at: new Date().toISOString(),
      }, appConfig);
    } catch (dbError) {
      console.error('Critical: Failed to update job status to "failed":', dbError);
    }
  }
  return createJsonResponse({ error: 'Processing failed', details: error.message }, 500);
}

// --- Request Handling Logic ---
function handlePreflightAndMethod(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return new Response(null, {
      status: 204,
      headers: { ...corsHeaders, 'Access-Control-Allow-Methods': 'POST, OPTIONS' },
    });
  }
  if (req.method !== 'POST') {
    console.warn('Method not allowed:', req.method);
    return createJsonResponse({ error: 'Method not allowed' }, 405);
  }
  return null;
}

async function parseAndValidateRequestBody(req: Request): Promise<RequestBody> {
  try {
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    if (!body || typeof body.jobId !== 'string' || !body.jobId) {
      throw new Error('Job ID is required and must be a string.');
    }
    if (body.analysisType && !['basic', 'premium'].includes(body.analysisType)) {
        console.warn(`Invalid analysisType: ${body.analysisType}, defaulting to ${DEFAULT_ANALYSIS_TYPE}.`);
        body.analysisType = DEFAULT_ANALYSIS_TYPE;
    } else if (!body.analysisType) {
        body.analysisType = DEFAULT_ANALYSIS_TYPE;
    }
    return body as RequestBody;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to parse request body:', error);
    throw new Error(`Invalid request body: ${errorMessage}`);
  }
}

interface UserData {
  id: string;
  email?: string;
}

async function authenticateRequest(req: Request, appConfig: AppConfig = config): Promise<UserData> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('No authorization token provided');
    throw new Error('Authorization token required');
  }
  const token = authHeader.split(' ')[1];

  try {
    const userResponse = await fetch(`${appConfig.supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': appConfig.serviceRoleKey,
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('Token verification failed:', userResponse.status, errorText);
      throw new Error('Invalid or expired token');
    }
    const userData = await userResponse.json();
    console.log('Authenticated user:', userData.id);
    return userData;
  } catch (error: any) {
    console.error('Error during token verification:', error);
    throw new Error(error?.message || 'Token verification failed');
  }
}

// --- Job Data Logic ---
async function fetchAndValidateJob(jobId: string, appConfig: AppConfig = config): Promise<JobData> {
  console.log(`Fetching job data for job ID: ${jobId}`);
  const jobResponse = await supabaseRestApiRequest(
    `/rest/v1/jobs?id=eq.${jobId}&select=*`, 
    { method: 'GET' }, 
    appConfig
  );

  if (!jobResponse.ok) {
    const errorText = await jobResponse.text();
    console.error('Failed to fetch job data:', errorText);
    throw new Error(`Failed to fetch job data (status ${jobResponse.status})`);
  }

  const jobDataArray = await jobResponse.json();
  if (!Array.isArray(jobDataArray) || jobDataArray.length === 0) {
    console.error('Job not found:', jobId);
    throw new Error('Job not found');
  }

  const jobData = jobDataArray[0] as JobData;
  console.log('Job data retrieved:', JSON.stringify(jobData, null, 2));

  if (jobData.status === 'completed') {
    console.log('Job already completed');
    throw new Error('Job already completed');
  }
  if (jobData.status === 'failed') {
    console.log('Job previously failed');
    throw new Error(`Job previously failed: ${jobData.error_message || 'Unknown reason'}`);
  }
  return jobData;
}

// --- File System Logic ---
function findTargetFileInList(files: StorageFile[], targetFilename: string): StorageFile | null {
  if (!files || files.length === 0) return null;
  
  const targetLower = targetFilename.toLowerCase();
  return files.find(f => f.name.toLowerCase() === targetLower) ||
         files.find(f => f.name.toLowerCase().includes(targetLower) && f.name.toLowerCase().endsWith('.json')) || 
         null;
}

async function searchForFileInPath(
  bucketName: string, 
  path: string, 
  targetFilename: string,
  supabaseClient: SupabaseClient
): Promise<FileInfo | null> {
  console.log(`Searching for '${targetFilename}' in bucket '${bucketName}', path: '${path || "root"}'`);
  const { data: files, error } = await supabaseClient.storage
    .from(bucketName)
    .list(path || null, { limit: 100, offset: 0 });

  if (error) {
    console.error(`Error listing files in '${bucketName}/${path}':`, error.message);
    return null;
  }
  if (!files || files.length === 0) {
    console.log(`No files found in '${bucketName}/${path}'.`);
    return null;
  }

  console.log(`Files in '${bucketName}/${path}': ${files.map(f => f.name).join(', ')}`);
  const conversationsFile = findTargetFileInList(files, targetFilename);

  if (conversationsFile) {
    const filePath = path ? `${path.replace(/\/$/, '')}/${conversationsFile.name}` : conversationsFile.name;
    const fullStoragePath = `${bucketName}/${filePath}`;
    console.log(`Found '${targetFilename}' at: ${fullStoragePath}`);
    return { bucketName, filePath, fullStoragePath };
  }
  return null;
}

async function locateConversationsFile(jobData: JobData, appConfig: AppConfig = config): Promise<FileInfo> {
  const { user_id, id: jobId } = jobData;
  
  const expectedPath = `${user_id}/${jobId}`;
  console.log(`Looking for conversations file in expected path: ${expectedPath}`);
  
  let fileInfo = await searchForFileInPath(PRIMARY_BUCKET_NAME, expectedPath, CONVERSATIONS_FILENAME, appConfig.supabaseClient);
  if (fileInfo) return fileInfo;

  const userFolderPath = `${user_id}`;
  console.log(`Looking for conversations file in user folder: ${userFolderPath}`);
  
  fileInfo = await searchForFileInPath(PRIMARY_BUCKET_NAME, userFolderPath, CONVERSATIONS_FILENAME, appConfig.supabaseClient);
  if (fileInfo) return fileInfo;

  console.log(`Looking for any JSON file in job folder: ${expectedPath}`);
  const { data: jobFiles, error: jobFilesError } = await appConfig.supabaseClient.storage
    .from(PRIMARY_BUCKET_NAME)
    .list(expectedPath);

  if (!jobFilesError && jobFiles && jobFiles.length > 0) {
    const jsonFile = jobFiles.find(file => file.name.toLowerCase().endsWith('.json'));
    if (jsonFile) {
      const filePath = `${expectedPath}/${jsonFile.name}`;
      const fullStoragePath = `${PRIMARY_BUCKET_NAME}/${filePath}`;
      console.log(`Found JSON file at: ${fullStoragePath}`);
      return { bucketName: PRIMARY_BUCKET_NAME, filePath, fullStoragePath };
    }
  }

  console.log(`Looking for any JSON file in user folder: ${userFolderPath}`);
  const { data: userFiles, error: userFilesError } = await appConfig.supabaseClient.storage
    .from(PRIMARY_BUCKET_NAME)
    .list(userFolderPath);

  if (!userFilesError && userFiles && userFiles.length > 0) {
    const jsonFile = userFiles.find(file => file.name.toLowerCase().endsWith('.json'));
    if (jsonFile) {
      const filePath = `${userFolderPath}/${jsonFile.name}`;
      const fullStoragePath = `${PRIMARY_BUCKET_NAME}/${filePath}`;
      console.log(`Found JSON file at: ${fullStoragePath}`);
      return { bucketName: PRIMARY_BUCKET_NAME, filePath, fullStoragePath };
    }
  }

  fileInfo = await searchForFileInPath(PRIMARY_BUCKET_NAME, '', CONVERSATIONS_FILENAME, appConfig.supabaseClient);
  if (fileInfo) return fileInfo;
  
  console.log(`File not found in primary bucket '${PRIMARY_BUCKET_NAME}'. Searching other buckets...`);
  const { data: buckets, error: bucketsError } = await appConfig.supabaseClient.storage.listBuckets();
  if (bucketsError) {
    console.error('Error listing buckets:', bucketsError);
    throw new Error(`Failed to list buckets: ${bucketsError.message}`);
  }
  if (!buckets || buckets.length === 0) {
    throw new Error('No buckets found in storage.');
  }

  for (const bucket of buckets) {
    if (bucket.name === PRIMARY_BUCKET_NAME) continue;

    console.log(`\nChecking bucket: ${bucket.name}`);
    fileInfo = await searchForFileInPath(bucket.name, expectedPath, CONVERSATIONS_FILENAME, appConfig.supabaseClient);
    if (fileInfo) return fileInfo;

    fileInfo = await searchForFileInPath(bucket.name, userFolderPath, CONVERSATIONS_FILENAME, appConfig.supabaseClient);
    if (fileInfo) return fileInfo;

    fileInfo = await searchForFileInPath(bucket.name, '', CONVERSATIONS_FILENAME, appConfig.supabaseClient);
    if (fileInfo) return fileInfo;
  }

  console.error(`'${CONVERSATIONS_FILENAME}' not found for user ${user_id} in any accessible location.`);
  throw new Error(`'${CONVERSATIONS_FILENAME}' not found. Searched in user folder and root of all buckets.`);
}

async function downloadFileContent(fileInfo: FileInfo, appConfig: AppConfig = config): Promise<string> {
  const { bucketName, filePath } = fileInfo;
  console.log(`Attempting to download: ${bucketName}/${filePath}`);

  const { data, error } = await appConfig.supabaseClient.storage
    .from(bucketName)
    .download(filePath);

  if (error) {
    console.error(`Error downloading file '${filePath}' from bucket '${bucketName}':`, error);
    throw new Error(`Failed to download file: ${error.message}`);
  }
  if (!data) {
     throw new Error(`No data returned for file '${filePath}' from bucket '${bucketName}'`);
  }

  const content = await data.text();
  console.log(`Downloaded file (${content.length} bytes) from ${fileInfo.fullStoragePath}`);
  return content;
}

// --- Mock Analysis Functions ---
function generateMockFreeInsights(conversations: any[]): any {
  const totalConversations = conversations.length;
  const totalMessages = totalConversations * 15; // Estimate
  
  return {
    totalMessages,
    userMessagesCount: Math.floor(totalMessages * 0.6),
    aiMessagesCount: Math.ceil(totalMessages * 0.4),
    totalUserCharacters: totalConversations * 2000,
    totalAiCharacters: totalConversations * 3000,
    averageUserMessageLength: 127,
    averageAiMessageLength: 198,
    firstMessageDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    lastMessageDate: new Date().toISOString(),
    conversationDaysSpan: 30,
    mostUsedUserWords: [
      { word: 'code', count: 45 },
      { word: 'problem', count: 32 },
      { word: 'error', count: 28 },
      { word: 'how', count: 25 },
      { word: 'python', count: 22 }
    ],
    userVocabularySizeEstimate: 1250,
    averageWordsPerUserSentence: 12.5,
    userToAiMessageRatio: 1.5,
    averageMessagesPerConversation: 8.3,
    longestConversationByMessages: {
      count: 42,
      title: 'Python Data Analysis Project'
    },
    shortestConversationByMessages: {
      count: 1,
      title: 'Quick Question'
    },
    activityByHourOfDay: [
      { hour: '00:00', messageCount: 12 },
      { hour: '03:00', messageCount: 5 },
      { hour: '06:00', messageCount: 8 },
      { hour: '09:00', messageCount: 45 },
      { hour: '12:00', messageCount: 67 },
      { hour: '15:00', messageCount: 89 },
      { hour: '18:00', messageCount: 56 },
      { hour: '21:00', messageCount: 78 }
    ],
    topicDistribution: [
      { name: 'Programming', value: 35, color: '#8884d8' },
      { name: 'Data Science', value: 25, color: '#82ca9d' },
      { name: 'Career', value: 20, color: '#ffc658' },
      { name: 'Technical', value: 12, color: '#ff7300' },
      { name: 'Other', value: 8, color: '#00ff88' }
    ]
  };
}

// --- Core Processing ---
async function processConversations(
  jobId: string,
  userId: string,
  analysisType: 'basic' | 'premium',
  fileContent: string,
  appConfig: AppConfig = config
): Promise<{ processedItems: number; fileSize: number }> {
  console.log(`Processing ${analysisType} analysis for job ${jobId}. File size: ${fileContent.length}`);
  
  // Parse the conversations
  let conversations;
  try {
    conversations = JSON.parse(fileContent);
  } catch (error) {
    console.error('Error parsing conversations JSON:', error);
    throw new Error('Invalid conversations file format');
  }

  if (!Array.isArray(conversations)) {
    throw new Error('Conversations file should contain an array of conversations');
  }

  const numConversations = conversations.length;
  console.log(`Found ${numConversations} conversations to process.`);

  // Update with total count
  await updateJob(jobId, {
    total_conversations: numConversations,
    processed_conversations: 0,
    progress: 20,
    updated_at: new Date().toISOString()
  }, appConfig);

  // Simulate processing with progress updates
  console.log(`Simulating ${analysisType} processing for ${numConversations} items...`);
  
  const BATCH_SIZE = Math.max(1, Math.ceil(numConversations / 4)); // Update every 25%
  
  for (let i = 0; i < numConversations; i++) {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Update progress periodically
    if ((i + 1) % BATCH_SIZE === 0 || (i === numConversations - 1)) {
      const progress = Math.min(80, Math.floor(((i + 1) / numConversations) * 60) + 20); // 20-80%
      
      await updateJob(jobId, {
        processed_conversations: i + 1,
        progress: progress,
        updated_at: new Date().toISOString()
      }, appConfig);
      
      console.log(`Progress: ${progress}% (${i + 1}/${numConversations})`);
    }
  }

  // Generate mock insights
  console.log('Generating analysis insights...');
  const freeInsights = generateMockFreeInsights(conversations);
  
  // Create user report
  console.log('Creating user report...');
  await createUserReport(userId, jobId, freeInsights, null, analysisType, appConfig);

  // Mark as completed
  const completedAt = new Date().toISOString();
  await updateJob(jobId, {
    status: 'completed',
    processed_conversations: numConversations,
    progress: 100,
    updated_at: completedAt,
    completed_at: completedAt
  }, appConfig);

  console.log('Processing complete.');
  return { processedItems: numConversations, fileSize: fileContent.length };
}

// Track if we've already initialized
let isInitialized = false;

// --- Main Server Logic ---
serve(async (req: Request) => {
  console.log(`\n=== New Request: ${req.method} ${req.url} ===`);

  // Handle CORS preflight requests immediately
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400'
      },
    });
  }

  // Only initialize once
  if (!isInitialized) {
    console.log('Supabase Function initialized. Waiting for requests...');
    isInitialized = true;
  }

  let jobId: string | null = null;

  try {
    // 1. Parse and Validate Request Body
    const requestBody = await parseAndValidateRequestBody(req);
    jobId = requestBody.jobId;
    const analysisType = requestBody.analysisType || DEFAULT_ANALYSIS_TYPE;
    console.log(`Processing job ${jobId} with analysis type: ${analysisType}`);

    // 2. Authenticate Request
    const userData = await authenticateRequest(req, config); 
    
    // 3. Fetch and Validate Job
    const jobData = await fetchAndValidateJob(jobId, config);

    // 4. Check if job is already being processed
    if (jobData.status === 'processing') {
      console.log(`Job ${jobId} is already being processed.`);
      return createJsonResponse({
        success: false,
        jobId,
        message: 'Job is already being processed',
        status: 'processing'
      }, 200);
    }

    // 5. Update job status to processing
    const startedAt = new Date().toISOString();
    await updateJob(jobId, {
      status: 'processing',
      progress: 10,
      analysis_type: analysisType,
      updated_at: startedAt,
      started_at: startedAt,
      error_message: null,
      processed_conversations: 0,
      total_conversations: null
    }, config);

    // 6. Locate the conversations file
    const fileInfo = await locateConversationsFile(jobData, config);

    // 7. Download file content
    const fileContent = await downloadFileContent(fileInfo, config);

    // 8. Process the file
    const processingResult = await processConversations(jobId, userData.id, analysisType, fileContent, config);

    // 9. Return success response
    return createJsonResponse({
      success: true,
      jobId,
      message: 'File processed successfully',
      analysisType,
      ...processingResult,
    });

  } catch (error: unknown) {
    const isError = (e: unknown): e is Error => e instanceof Error;
    const errorMessage = isError(error) ? error.message : 'An unknown error occurred';
    
    // Specific error handling
    if (errorMessage.includes('Authorization token required') || errorMessage.includes('Invalid or expired token')) {
      return createJsonResponse({ error: errorMessage }, 401);
    }
    if (errorMessage.includes('Job ID is required') || errorMessage.includes('Invalid request body')) {
      return createJsonResponse({ error: errorMessage }, 400);
    }
    if (errorMessage === 'Job not found') {
      return createJsonResponse({ error: 'Job not found' }, 404);
    }
    if (errorMessage.startsWith('Job already completed')) {
      return createJsonResponse({ 
        message: errorMessage, 
        jobId, 
        status: 'completed' 
      }, 200);
    }
    if (errorMessage.startsWith('Job previously failed')) {
      return createJsonResponse({ 
        message: errorMessage, 
        jobId, 
        status: 'failed' 
      }, 400); 
    }
    if (errorMessage.startsWith(`'${CONVERSATIONS_FILENAME}' not found`)) {
      if(jobId) {
        try {
          await updateJob(jobId, {
            status: 'failed',
            error_message: errorMessage,
            progress: 0,
            updated_at: new Date().toISOString(),
          }, config);
        } catch (updateError) {
          console.error('Failed to update job status after file not found error:', updateError);
        }
      }
      return createJsonResponse({ 
        error: errorMessage, 
        details: "Please ensure the conversations.json file exists in your storage." 
      }, 404);
    }
    
    // Fallback to generic job failure
    return handleJobFailure(
      jobId, 
      isError(error) ? error : new Error(errorMessage), 
      'Main request processing', 
      config
    );
  }
});

console.log('Supabase Function initialized. Waiting for requests...');