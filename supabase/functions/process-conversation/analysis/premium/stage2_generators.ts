// @deno-types="npm:@types/deno"
import {
  PerConversationInsights,
  AdvancedAnalysisResult,
  FBIReportData,
  LinguisticFingerprintData,
  BasicAnalysisResult // We might need some basic stats too
} from '../../_shared/types.ts';
import { callLlmForJson } from '../../_shared/llmService.ts';
import { getFbiProfilePrompt, getLinguisticFingerprintPrompt } from '../../_shared/prompts.ts';

/**
 * Aggregates insights from all processed conversations.
 * @param perConvoInsights Array of insights from each conversation.
 * @returns An object containing aggregated data for Stage 2 prompts.
 */
function aggregateStage1Data(perConvoInsights: PerConversationInsights[]): {
    allTopics: string[];
    allPatterns: string[];
    allPiiCategories: string[];
    allStandoutVocab: string[];
    complexityScores: number[];
    sentiments: ("positive" | "negative" | "neutral" | "mixed")[];
} {
    const allTopics: string[] = [];
    const allPatterns: string[] = [];
    const allPiiCategories: string[] = [];
    const allStandoutVocab: string[] = [];
    const complexityScores: number[] = [];
    const sentiments: ("positive" | "negative" | "neutral" | "mixed")[] = [];

    for (const insight of perConvoInsights) {
        if (insight.primaryTopics) allTopics.push(...insight.primaryTopics);
        if (insight.communicationPatterns) allPatterns.push(...insight.communicationPatterns);
        if (insight.piiCategoriesMentioned) allPiiCategories.push(...insight.piiCategoriesMentioned);
        if (insight.standoutVocabulary) allStandoutVocab.push(...insight.standoutVocabulary);
        if (typeof insight.complexityScore === 'number') complexityScores.push(insight.complexityScore);
        if (insight.sentimentPolarity) sentiments.push(insight.sentimentPolarity);
    }
    return { allTopics, allPatterns, allPiiCategories, allStandoutVocab, complexityScores, sentiments };
}

function getFrequencyMap(items: string[]): Map<string, number> {
    const map = new Map<string, number>();
    items.forEach(item => map.set(item, (map.get(item) || 0) + 1));
    return map;
}

function getTopN(map: Map<string, number>, n: number): string[] {
    return Array.from(map.entries())
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, n)
        .map(([item]) => item);
}


/**
 * Generates the FBI-style Digital Persona Profile.
 * @param perConvoInsights Array of insights from Stage 1.
 * @returns A Promise resolving to FBIReportData or null.
 */
async function generateFbiReport(
    perConvoInsights: PerConversationInsights[]
): Promise<FBIReportData | null> {
    if (!perConvoInsights || perConvoInsights.length === 0) return null;

    const { allTopics, allPatterns, allPiiCategories, complexityScores, sentiments } = aggregateStage1Data(perConvoInsights);

    const topicFrequency = getFrequencyMap(allTopics);
    const patternFrequency = getFrequencyMap(allPatterns);
    const piiFrequencyMap = getFrequencyMap(allPiiCategories);

    const aggregatedPiiCategoryFrequency = Array.from(piiFrequencyMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a,b) => b.count - a.count);

    const avgComplexity = complexityScores.length > 0
        ? complexityScores.reduce((sum, val) => sum + val, 0) / complexityScores.length
        : 5; // Default if no scores

    const sentimentDistribution: Record<string, number> = {};
    const totalSentiments = sentiments.length;
    if (totalSentiments > 0) {
        sentiments.forEach(s => sentimentDistribution[s] = (sentimentDistribution[s] || 0) + 1);
        for (const key in sentimentDistribution) {
            sentimentDistribution[key] /= totalSentiments;
        }
    }


    const prompt = getFbiProfilePrompt(
        getTopN(topicFrequency, 7),
        getTopN(patternFrequency, 5),
        aggregatedPiiCategoryFrequency.slice(0,5), // Top 5 PII categories by freq
        avgComplexity,
        sentimentDistribution
    );

    try {
        return await callLlmForJson<FBIReportData>(prompt, "powerful");
    } catch (error) {
        console.error("Failed to generate FBI report:", error);
        return null; // Or rethrow with more context
    }
}

/**
 * Generates the Linguistic Fingerprint report.
 * @param perConvoInsights Array of insights from Stage 1.
 * @param basicAnalysis For supplemental data like sentence length.
 * @returns A Promise resolving to LinguisticFingerprintData or null.
 */
async function generateLinguisticFingerprint(
  perConvoInsights: PerConversationInsights[],
  basicAnalysis: BasicAnalysisResult
): Promise<LinguisticFingerprintData | null> {
  if (!perConvoInsights || perConvoInsights.length === 0) return null;

  const { allStandoutVocab, complexityScores } = aggregateStage1Data(perConvoInsights);

  const uniqueStandoutVocab = Array.from(new Set(allStandoutVocab)); // Get unique words

  const avgComplexity = complexityScores.length > 0
    ? complexityScores.reduce((sum, val) => sum + val, 0) / complexityScores.length
    : 5;

  const prompt = getLinguisticFingerprintPrompt(
    uniqueStandoutVocab,
    avgComplexity,
    basicAnalysis.averageWordsPerUserSentence,
    basicAnalysis.userVocabularySizeEstimate // This is the simple unique word count from basic
  );

  try {
    return await callLlmForJson<LinguisticFingerprintData>(prompt, "powerful");
  } catch (error) {
    console.error("Failed to generate Linguistic Fingerprint:", error);
    return null;
  }
}


/**
 * Main orchestrator for generating all premium insights.
 * @param allPerConversationInsights Array of PerConversationInsights from Stage 1.
 * @param basicAnalysisResult The result from the basic non-LLM analysis.
 * @returns A Promise resolving to AdvancedAnalysisResult.
 */
export async function generateAllPremiumInsights(
  allPerConversationInsights: PerConversationInsights[],
  basicAnalysisResult: BasicAnalysisResult,
  supabaseClient: any // Pass Supabase client if needed for progress updates
): Promise<AdvancedAnalysisResult> {
  const advancedResults: AdvancedAnalysisResult = {
    processingErrors: []
  };

  if (!allPerConversationInsights || allPerConversationInsights.length === 0) {
    advancedResults.processingErrors?.push("No per-conversation insights available to generate premium reports.");
    return advancedResults;
  }

  // --- Generate FBI Report ---
  try {
    console.log("Generating FBI Report...");
    // Update job progress if needed via supabaseClient
    const fbiReport = await generateFbiReport(allPerConversationInsights);
    if (fbiReport) {
      advancedResults.fbiReport = fbiReport;
    } else {
      advancedResults.processingErrors?.push("FBI Report generation failed or returned null.");
    }
  } catch (e) {
    advancedResults.processingErrors?.push(`FBI Report generation error: ${e.message}`);
  }

  // --- Generate Linguistic Fingerprint ---
  try {
    console.log("Generating Linguistic Fingerprint...");
    // Update job progress
    const linguisticFingerprint = await generateLinguisticFingerprint(allPerConversationInsights, basicAnalysisResult);
    if (linguisticFingerprint) {
      advancedResults.linguisticFingerprint = linguisticFingerprint;
    } else {
      advancedResults.processingErrors?.push("Linguistic Fingerprint generation failed or returned null.");
    }
  } catch (e) {
    advancedResults.processingErrors?.push(`Linguistic Fingerprint generation error: ${e.message}`);
  }

  // --- Add other report generations here ---
  // e.g., Reality TV Persona, Cognitive Blueprint, etc.
  // Each would follow a similar pattern:
  // 1. Prepare data (aggregate from perConvoInsights, use basicAnalysisResult)
  // 2. Craft prompt using _shared/prompts.ts
  // 3. Call callLlmForJson with "powerful" model
  // 4. Store result or error in advancedResults

  if (advancedResults.processingErrors?.length === 0) {
    delete advancedResults.processingErrors; // Clean up if no errors
  }

  return advancedResults;
}