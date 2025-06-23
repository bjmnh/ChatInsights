// @deno-types="npm:@types/deno"
// --- LLM Service Abstraction ---
// This allows you to swap out LLM providers more easily.

// You'll need to install the respective SDKs
// For Gemini: npm install @google/generative-ai
// For Cohere: npm install cohere-ai (or use their Deno compatible library if available)

// Example using Gemini (adapt for Cohere or others)
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig } from "npm:@google/generative-ai";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const COHERE_API_KEY = Deno.env.get("COHERE_API_KEY"); // If you use Cohere

if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY environment variable not set. LLM calls will fail.");
}

// --- Model Configuration ---
// Define your preferred models for "fast" (Stage 1) and "powerful" (Stage 2) tasks.
// This makes it easy to change models globally.

const FAST_LLM_PROVIDER: "gemini" | "cohere" | "mock" = (Deno.env.get("FAST_LLM_PROVIDER") as any) || "gemini";
const POWERFUL_LLM_PROVIDER: "gemini" | "cohere" | "mock" = (Deno.env.get("POWERFUL_LLM_PROVIDER") as any) || "gemini";

// Specific model names
const GEMINI_FAST_MODEL_NAME = "gemini-1.5-flash-latest"; // Or gemini-1.0-pro for a bit more power if flash is too weak
const GEMINI_POWERFUL_MODEL_NAME = "gemini-1.5-pro-latest"; // Or "gemini-1.0-pro" for less cost if 1.5 is overkill

// const COHERE_FAST_MODEL_NAME = "command-light";
// const COHERE_POWERFUL_MODEL_NAME = "command-r-plus"; // or "command-r"


// Centralized generation config for consistency
const defaultGenerationConfig: GenerationConfig = {
    temperature: 0.3, // Lower for more deterministic, factual output
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048, // Adjust as needed, JSON outputs are usually smaller
};

const defaultSafetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

/**
 * Invokes an LLM with the given prompt and expects a JSON response.
 * @param prompt The prompt to send to the LLM.
 * @param modelType "fast" for Stage 1 (cheaper, quicker) or "powerful" for Stage 2 (synthesis).
 * @param customConfig Optional GenerationConfig to override defaults.
 * @returns Parsed JSON object from the LLM response.
 * @throws Error if LLM call fails or response is not valid JSON.
 */
export async function callLlmForJson<T>(
  prompt: string,
  modelType: "fast" | "powerful",
  customConfig?: Partial<GenerationConfig>
): Promise<T> {
  const provider = modelType === "fast" ? FAST_LLM_PROVIDER : POWERFUL_LLM_PROVIDER;
  const finalConfig = { ...defaultGenerationConfig, ...customConfig };

  console.log(`Calling LLM (Provider: ${provider}, ModelType: ${modelType}) with prompt: ${prompt.substring(0,100)}...`);


  try {
    let llmResponseText: string | undefined;

    if (provider === "gemini") {
      if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set for Gemini provider.");
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const modelName = modelType === "fast" ? GEMINI_FAST_MODEL_NAME : GEMINI_POWERFUL_MODEL_NAME;
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: finalConfig,
        safetySettings: defaultSafetySettings,
        // Ensure you specify JSON mode if the model/SDK supports it directly
        // For Gemini, you often instruct it in the prompt to "Output JSON only"
      });

      // Gemini often benefits from explicit instruction to output JSON in the prompt itself.
      // And also check if the model supports `responseMimeType: "application/json"`
      // const result = await model.generateContent(prompt + "\n\nOutput ONLY valid JSON that adheres to the specified schema.");
      // Forcing JSON mode:
       const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                ...finalConfig,
                responseMimeType: "application/json", // This is key for Gemini JSON mode
            }
        });

      const response = result.response;
      llmResponseText = response.text();

    } else if (provider === "cohere") {
      // TODO: Implement Cohere call
      // Ensure you handle JSON mode correctly with Cohere's API
      // e.g., cohere.generate({ model: modelName, prompt: prompt, ... })
      if (!COHERE_API_KEY) throw new Error("COHERE_API_KEY not set for Cohere provider.");
      // const co = new CohereClient({ token: COHERE_API_KEY });
      // const cohereResponse = await co.chat({ ... }); // Use chat or generate depending on Cohere's best practice for structured output
      // llmResponseText = cohereResponse.text; // or however Cohere returns the text
      throw new Error("Cohere provider not fully implemented yet.");
    } else if (provider === "mock") {
        console.warn("Using MOCK LLM provider. Returning placeholder JSON.");
        // Return a mock response structure based on what you expect.
        // This is useful for testing the rest of your pipeline without actual LLM calls.
        if (prompt.includes("FBI_PROFILE_PROMPT_IDENTIFIER")) { // Use identifiers in prompts for mock routing
            return {
                reportTitle: "Mock FBI Report",
                subjectProfileSummary: "Mock summary based on patterns.",
                dominantInterests: ["mock interest 1", "mock interest 2"],
                communicationModalities: ["mock modality 1", "mock modality 2"],
                emotionalToneAndEngagement: "Mock emotional tone",
                informationSharingTendencies: "Mock sharing tendencies",
                overallInteractionStyle: "Mock interaction style",
                disclaimer: "This is a mock report for testing purposes."
            } as unknown as T;
        } else if (prompt.includes("LINGUISTIC_FINGERPRINT_PROMPT_IDENTIFIER")) {
             return {
                reportTitle: "Mock Linguistic Fingerprint",
                overallStyleDescription: "Mock eloquent and insightful.",
                vocabularyProfile: {
                    qualitativeAssessment: "Mock vocabulary assessment",
                    notableWords: ["mock", "word", "list"],
                    estimatedLexicalDiversity: "Above Average"
                },
                sentenceStructure: "Mock sentence structure",
                expressiveness: "Mock expressiveness",
                potentialInterestsIndicatedByLanguage: ["mock interest 1", "mock interest 2"],
                disclaimer: "This is a mock report for testing purposes."
            } as unknown as T;
        } else if (prompt.includes("STAGE1_PER_CONVO_INSIGHTS_PROMPT")) {
            return {
                primaryTopics: ["mock topic 1", "mock topic 2"],
                communicationPatterns: ["SeekingInformation", "ProblemSolving"],
                sentimentPolarity: "positive",
                complexityScore: 7,
                complexityJustification: "Mock complexity justification",
                piiCategoriesMentioned: ["None"],
                standoutVocabulary: ["sophisticated", "analytical", "comprehensive"]
            } as unknown as T;
        }
        return {} as T; // Default mock
    }
    else {
      throw new Error(`Unsupported LLM provider: ${provider}`);
    }

    if (!llmResponseText) {
      throw new Error("LLM returned an empty response.");
    }

    // Clean the response: LLMs sometimes add ```json ... ```
    const cleanedJsonText = llmResponseText.replace(/^```json\s*|```\s*$/g, "").trim();

    return JSON.parse(cleanedJsonText) as T;

  } catch (error) {
    console.error(`LLM call failed for ${modelType} model. Provider: ${provider}. Error:`, error);
    if (error.response && error.response.promptFeedback) {
        console.error("Prompt Feedback:", JSON.stringify(error.response.promptFeedback, null, 2));
    }
    throw new Error(`LLM processing error: ${error.message}`);
  }
}