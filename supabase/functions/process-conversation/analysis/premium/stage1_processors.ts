// @deno-types="npm:@types/deno"
import { RawConversation, PerConversationInsights } from '../../_shared/types.ts';
import { callLlmForJson } from '../../_shared/llmService.ts';
import { getStage1PerConvoInsightsPrompt } from '../../_shared/prompts.ts';
import { extractUserConversationText } from '../../_shared/utils.ts';

/**
 * Processes a single conversation using a fast LLM to extract structured insights.
 * @param conversation The raw conversation object.
 * @returns A Promise resolving to PerConversationInsights or null if processing fails.
 */
export async function processConversationWithFastLlm(
  conversation: RawConversation
): Promise<PerConversationInsights | null> {
  try {
    const userText = extractUserConversationText(conversation);

    if (!userText.trim()) {
      console.log(`Skipping conversation ${conversation.id || 'N/A'} due to no user text.`);
      return null; // Or return a basic structure with an error/note
    }

    // Ensure userText is not excessively long for the fast LLM's context window
    // Truncate if necessary, though this might lose some context.
    const MAX_TEXT_LENGTH = 15000; // Adjust based on your fast LLM's limit (e.g., Gemini Flash ~1M tokens, but we send much less)
                                  // This is characters, not tokens. A rough estimate.
    const truncatedUserText = userText.length > MAX_TEXT_LENGTH
        ? userText.substring(0, MAX_TEXT_LENGTH) + "\n... [TRUNCATED]"
        : userText;

    const prompt = getStage1PerConvoInsightsPrompt(truncatedUserText);

    // Define an expected raw structure from the LLM based on the prompt
    interface Stage1RawLLMOutput {
        primaryTopics: string[];
        communicationPatterns: string[];
        sentimentPolarity: "positive" | "negative" | "neutral" | "mixed";
        complexityScore: string | number; // LLM might return as string
        complexityJustification: string;
        piiCategoriesMentioned: string[];
        standoutVocabulary: string[];
    }


    const rawInsights = await callLlmForJson<Stage1RawLLMOutput>(prompt, "fast");

    // Validate and transform rawInsights into PerConversationInsights
    // This is important because LLMs can sometimes deviate from the exact format.
    const piiCategories = Array.isArray(rawInsights.piiCategoriesMentioned)
        ? rawInsights.piiCategoriesMentioned.filter(p => p && p !== "None")
        : [];

    return {
      conversationId: conversation.id || `unknown-${Date.now()}`,
      primaryTopics: Array.isArray(rawInsights.primaryTopics) ? rawInsights.primaryTopics.slice(0,3) : [],
      communicationPatterns: Array.isArray(rawInsights.communicationPatterns) ? rawInsights.communicationPatterns.slice(0,3) : [],
      sentimentPolarity: ["positive", "negative", "neutral", "mixed"].includes(rawInsights.sentimentPolarity) ? rawInsights.sentimentPolarity : "neutral",
      complexityScore: Math.max(1, Math.min(10, parseInt(String(rawInsights.complexityScore), 10) || 5)), // Robust parsing
      // complexityJustification: rawInsights.complexityJustification || "N/A", // We don't store this in PerConversationInsights directly
      piiCategoriesMentioned: piiCategories,
      standoutVocabulary: Array.isArray(rawInsights.standoutVocabulary) ? rawInsights.standoutVocabulary.slice(0,5) : [],
      // Add other fields as needed, e.g., rawConversationText if Stage 2 needs it (careful with size)
    };

  } catch (error) {
    console.error(`Error processing conversation ${conversation.id || 'N/A'} with fast LLM:`, error);
    return null; // Or throw to be caught by the caller, which might be better for job status
  }
}