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
const PRIMARY_BUCKET_NAME = 'conversation-files'; // Or make this an env var if it can change

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
  filename?: string; // Original had filename, might be useful if file name isn't always conversations.json
  file_path?: string;
  status: string;
  premium_features_enabled: boolean;
  created_at: string;
  updated_at: string;
  analysis_type: string;
  error_message?: string | null;
  progress?: number;
  total_conversations?: number | null;
  processed_conversations?: number;
}

interface FileInfo {
  bucketName: string;
  filePath: string; // Path within the bucket
  fullStoragePath: string; // For clarity, e.g., "bucketName/filePath"
}

interface StorageFile {
  name: string;
  id?: string;
  // ... other metadata fields if needed
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
  appConfig: AppConfig = config // Allow passing config for testability
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
  console.log(`Updating job ${jobId} with status: ${updateData.status}, progress: ${updateData.progress}`);
  return supabaseRestApiRequest(`/rest/v1/jobs?id=eq.${jobId}`, {
    method: 'PATCH',
    body: JSON.stringify(updateData),
  }, appConfig);
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
        error_message: errorMessage.substring(0, 2000), // Cap error message length
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
    // Ensure analysisType is one of the allowed values or default
    if (body.analysisType && !['basic', 'premium'].includes(body.analysisType)) {
        console.warn(`Invalid analysisType: ${body.analysisType}, defaulting to ${DEFAULT_ANALYSIS_TYPE}.`);
        body.analysisType = DEFAULT_ANALYSIS_TYPE;
    } else if (!body.analysisType) {
        body.analysisType = DEFAULT_ANALYSIS_TYPE;
    }
    return body as RequestBody;
  } catch (error) {
    console.error('Failed to parse request body:', error);
    throw new Error(`Invalid request body: ${error.message}`);
  }
}

async function authenticateRequest(req: Request, appConfig: AppConfig = config): Promise<any> { // Returns user data
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('No authorization token provided');
    throw new Error('Authorization token required'); // This will be caught and turned into a 401
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
      throw new Error('Invalid or expired token'); // This will be caught and turned into a 401
    }
    const userData = await userResponse.json();
    console.log('Authenticated user:', userData.id);
    return userData;
  } catch (error) {
    console.error('Error during token verification:', error);
    throw new Error(error.message || 'Token verification failed');
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
    throw new Error('Job not found'); // Will be 404
  }

  const jobData = jobDataArray[0] as JobData;
  console.log('Job data retrieved:', JSON.stringify(jobData, null, 2));

  if (jobData.status === 'completed') {
    console.log('Job already completed');
    throw new Error('Job already completed'); // Special case, not really a server error
  }
  if (jobData.status === 'failed') {
    console.log('Job previously failed');
    throw new Error(`Job previously failed: ${jobData.error_message || 'Unknown reason'}`); // Special case
  }
  return jobData;
}


// --- File System Logic ---
function findTargetFileInList(files: StorageFile[], targetFilename: string): StorageFile | null {
  if (!files || files.length === 0) return null;
  
  const targetLower = targetFilename.toLowerCase();
  // Prioritize exact match, then case-insensitive match, then includes (if necessary)
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
    .list(path || null, { limit: 100, offset: 0 }); // Added limit/offset defaults

  if (error) {
    console.error(`Error listing files in '${bucketName}/${path}':`, error.message);
    return null; // Don't throw, just indicate not found here
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
  
  // First, try the expected path: userId/jobId/conversations.json
  const expectedPath = `${user_id}/${jobId}`;
  console.log(`Looking for conversations file in expected path: ${expectedPath}`);
  
  let fileInfo = await searchForFileInPath(PRIMARY_BUCKET_NAME, expectedPath, CONVERSATIONS_FILENAME, appConfig.supabaseClient);
  if (fileInfo) return fileInfo;

  // If not found in expected path, try the user folder directly
  const userFolderPath = `${user_id}`;
  console.log(`Looking for conversations file in user folder: ${userFolderPath}`);
  
  fileInfo = await searchForFileInPath(PRIMARY_BUCKET_NAME, userFolderPath, CONVERSATIONS_FILENAME, appConfig.supabaseClient);
  if (fileInfo) return fileInfo;

  // If still not found, look for any JSON file in the job-specific folder
  console.log(`Looking for any JSON file in job folder: ${expectedPath}`);
  const { data: jobFiles, error: jobFilesError } = await appConfig.supabaseClient.storage
    .from(PRIMARY_BUCKET_NAME)
    .list(expectedPath);

  if (!jobFilesError && jobFiles && jobFiles.length > 0) {
    // Look for any .json file
    const jsonFile = jobFiles.find(file => file.name.toLowerCase().endsWith('.json'));
    if (jsonFile) {
      const filePath = `${expectedPath}/${jsonFile.name}`;
      const fullStoragePath = `${PRIMARY_BUCKET_NAME}/${filePath}`;
      console.log(`Found JSON file at: ${fullStoragePath}`);
      return { bucketName: PRIMARY_BUCKET_NAME, filePath, fullStoragePath };
    }
  }

  // If still not found, look for any JSON file in the user folder
  console.log(`Looking for any JSON file in user folder: ${userFolderPath}`);
  const { data: userFiles, error: userFilesError } = await appConfig.supabaseClient.storage
    .from(PRIMARY_BUCKET_NAME)
    .list(userFolderPath);

  if (!userFilesError && userFiles && userFiles.length > 0) {
    // Look for any .json file
    const jsonFile = userFiles.find(file => file.name.toLowerCase().endsWith('.json'));
    if (jsonFile) {
      const filePath = `${userFolderPath}/${jsonFile.name}`;
      const fullStoragePath = `${PRIMARY_BUCKET_NAME}/${filePath}`;
      console.log(`Found JSON file at: ${fullStoragePath}`);
      return { bucketName: PRIMARY_BUCKET_NAME, filePath, fullStoragePath };
    }
  }

  // Try root folder as last resort
  fileInfo = await searchForFileInPath(PRIMARY_BUCKET_NAME, '', CONVERSATIONS_FILENAME, appConfig.supabaseClient);
  if (fileInfo) return fileInfo;
  
  // If we still haven't found it, search all buckets
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
    if (bucket.name === PRIMARY_BUCKET_NAME) continue; // Already checked

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

  // Using Supabase client for download which handles auth correctly for RLS if set,
  // or falls back to service_role if RLS doesn't grant access (which it should for service role).
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

// --- Core Processing ---
async function processConversations(
  jobId: string,
  analysisType: 'basic' | 'premium',
  fileContent: string,
  appConfig: AppConfig = config
): Promise<{ processedItems: number; fileSize: number }> {
  console.log(`Processing ${analysisType} analysis for job ${jobId}. File size: ${fileContent.length}`);
  
  let conversations;
  try {
    conversations = JSON.parse(fileContent);
    if (!Array.isArray(conversations)) {
        throw new Error("File content is not a JSON array of conversations.");
    }
  } catch (parseError) {
    console.error("Failed to parse conversations JSON:", parseError);
    throw new Error(`Invalid JSON format in conversations file: ${parseError.message}`);
  }
  
  const numConversations = conversations.length;
  console.log(`Found ${numConversations} conversations to process.`);

  await updateJob(jobId, {
    status: 'processing',
    progress: 50,
    total_conversations: numConversations,
    updated_at: new Date().toISOString(),
  }, appConfig);

  // Simulate processing time
  console.log(`Simulating ${analysisType} processing for ${numConversations} items...`);
  await new Promise(resolve => setTimeout(resolve, analysisType === 'premium' ? 3000 : 1500));

  await updateJob(jobId, {
    status: 'completed',
    result: `Processed ${numConversations} conversations`, // 'result' field might need to be in your DB schema
    processed_conversations: numConversations,
    progress: 100,
    updated_at: new Date().toISOString(),
  }, appConfig);

  console.log('Processing complete.');
  return { processedItems: numConversations, fileSize: fileContent.length };
}


// --- Main Server Logic ---
serve(async (req: Request) => {
  console.log(`\n=== New Request: ${req.method} ${req.url} ===`);

  const preflightOrMethodResponse = handlePreflightAndMethod(req);
  if (preflightOrMethodResponse) return preflightOrMethodResponse;

  let jobId: string | null = null; // Initialize to null for error handling before jobId is parsed

  try {
    // 1. Parse and Validate Request Body
    const requestBody = await parseAndValidateRequestBody(req);
    jobId = requestBody.jobId; // Now jobId is set
    const analysisType = requestBody.analysisType || DEFAULT_ANALYSIS_TYPE;
    console.log(`Processing job ${jobId} with analysis type: ${analysisType}`);

    // 2. Authenticate Request
    //    We pass `config` explicitly here, but it's the global one.
    //    This is more for showing how dependencies could be injected for testing.
    await authenticateRequest(req, config); 
    
    // 3. Fetch and Validate Job
    const jobData = await fetchAndValidateJob(jobId, config);

    // 4. Update job status to initial processing
    await updateJob(jobId, {
      status: 'processing',
      progress: 10,
      analysis_type: analysisType,
      updated_at: new Date().toISOString(),
    }, config);

    // 5. Locate the conversations file
    const fileInfo = await locateConversationsFile(jobData, config);

    // 6. Download file content
    const fileContent = await downloadFileContent(fileInfo, config);

    // 7. Process the file
    const processingResult = await processConversations(jobId, analysisType, fileContent, config);

    // 8. Return success response
    return createJsonResponse({
      success: true,
      jobId,
      message: 'File processed successfully',
      analysisType,
      ...processingResult,
    });

  } catch (error) {
    // Specific error handling for known "user error" cases vs. server errors
    if (error.message.includes('Authorization token required') || error.message.includes('Invalid or expired token')) {
      return createJsonResponse({ error: error.message }, 401);
    }
    if (error.message.includes('Job ID is required') || error.message.includes('Invalid request body')) {
      return createJsonResponse({ error: error.message }, 400);
    }
    if (error.message === 'Job not found') {
      return createJsonResponse({ error: 'Job not found' }, 404);
    }
    if (error.message.startsWith('Job already completed')) {
      return createJsonResponse({ message: error.message, jobId, status: 'completed' }, 200);
    }
    if (error.message.startsWith('Job previously failed')) {
      // Potentially include more details if available and safe
      return createJsonResponse({ message: error.message, jobId, status: 'failed' }, 400); 
    }
    if (error.message.startsWith(`'${CONVERSATIONS_FILENAME}' not found`)) {
        // This is a critical failure for this job, but might be due to user setup.
        // It's already logged server-side, so we update the job and return a client-friendly error.
        if(jobId) {
             await updateJob(jobId, {
                status: 'failed',
                error_message: error.message,
                progress: 0,
                updated_at: new Date().toISOString(),
            }, config);
        }
        return createJsonResponse({ error: error.message, details: "Please ensure the conversations.json file exists in your storage." }, 404);
    }
    
    // Fallback to generic job failure for other errors
    return handleJobFailure(jobId, error as Error, 'Main request processing', config);
  }
});

console.log('Supabase Function initialized. Waiting for requests...');