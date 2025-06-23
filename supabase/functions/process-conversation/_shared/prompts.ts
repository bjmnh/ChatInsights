// @deno-types="npm:@types/deno"
// --- Prompt Definitions ---
// Keeping prompts here makes them easier to manage, version, and A/B test.

// --- Stage 1: Per-Conversation Analysis Prompts (for Fast LLM) ---

export const STAGE1_PER_CONVO_INSIGHTS_PROMPT_IDENTIFIER = "STAGE1_PER_CONVO_INSIGHTS_PROMPT";
export function getStage1PerConvoInsightsPrompt(conversationText: string): string {
  // conversationText should be user messages, potentially with delimiters like "--- USER TURN ---"
  return `
${STAGE1_PER_CONVO_INSIGHTS_PROMPT_IDENTIFIER}
Analyze the following user conversation excerpt. Focus ONLY on the user's contributions.
Provide the output STRICTLY in the following JSON format, with no additional text before or after the JSON block.

Conversation Excerpt:
---
${conversationText}
---

JSON Output Format:
{
  "primaryTopics": ["string", "string"],
  "communicationPatterns": ["string", "string"],
  "sentimentPolarity": "positive" | "negative" | "neutral" | "mixed",
  "complexityScore": "number (1-10, 1=very simple, 10=very complex academic)",
  "complexityJustification": "string (one sentence justification for complexity)",
  "piiCategoriesMentioned": ["PersonalName", "Location", "Date_Specific", "ContactInfo_Email", "ContactInfo_Phone", "Financial_Account", "Health_Condition", "Organization_Name", "Credentials_Login", "Identifier_SSN_Like" OR "None"],
  "standoutVocabulary": ["string", "string"]
}

Detailed Instructions:
- primaryTopics: Identify 2-3 main topics. Be concise.
- communicationPatterns: Choose up to 3 from: "SeekingInformation", "GivingInstructions", "ExpressingOpinion", "Brainstorming", "Storytelling", "EmotionalVenting", "ProblemSolving", "HumorAttempt", "ReflectiveMonologue", "SeekingReassurance".
- sentimentPolarity: Overall sentiment of the user's messages.
- complexityScore: Rate linguistic complexity based on sentence structure, vocabulary, abstractness.
- complexityJustification: Briefly explain the complexity score.
- piiCategoriesMentioned: Scan for mentions that fall into the predefined PII categories. List ONLY the categories found. If none, use ["None"]. DO NOT output the PII itself.
- standoutVocabulary: Identify up to 3 unique, sophisticated, or domain-specific vocabulary words used by the user. Exclude common words.

Output JSON only:
  `;
}


// --- Stage 2: Aggregated Report Generation Prompts (for Powerful LLM) ---

export const FBI_PROFILE_PROMPT_IDENTIFIER = "FBI_PROFILE_PROMPT_IDENTIFIER";
export function getFbiProfilePrompt(
  aggregatedTopics: string[], // Top 5-10 most frequent
  aggregatedPatterns: string[], // Top 3-5 most common
  aggregatedPiiCategoryFrequency: { category: string; count: number }[], // e.g., [{category: "Location", count: 15}]
  avgComplexity: number,
  overallSentimentDistribution: Record<string, number> // e.g., {positive: 0.6, neutral: 0.3, negative: 0.1}
): string {
  const piiMentionsSummary = aggregatedPiiCategoryFrequency.length > 0
    ? `The user frequently mentions PII categories such as: ${aggregatedPiiCategoryFrequency.map(p => `${p.category} (approx. ${p.count} times)`).join(', ')}.`
    : "The user shows low frequency of PII category mentions.";

  return `
${FBI_PROFILE_PROMPT_IDENTIFIER}
You are an AI intelligence analyst compiling a confidential behavioral report based on extensive digital interaction data.
Your task is to synthesize the provided aggregated user data into a concise, objective profile.
Provide the output STRICTLY in the following JSON format:

{
  "reportTitle": "Digital Behavioral Analysis Dossier",
  "subjectProfileSummary": "string (A 2-3 sentence overarching summary of the user's digital persona)",
  "dominantInterests": ["string", "string"],
  "communicationModalities": ["string", "string"],
  "emotionalToneAndEngagement": "string (Describe the typical emotional tone and level of engagement)",
  "informationSharingTendencies": "string (Comment on PII category sharing tendencies, e.g., 'Cautious with PII' or 'Openly discusses locations')",
  "overallInteractionStyle": "string (e.g., 'Primarily collaborative and inquisitive', 'Tends towards reflective monologues')",
  "disclaimer": "This report is an AI-generated interpretation of aggregated digital interaction patterns and does not represent a comprehensive psychological assessment. It is for informational purposes only."
}

Aggregated User Data:
- Top Discussed Topics: ${aggregatedTopics.join(', ') || 'N/A'}
- Common Communication Patterns: ${aggregatedPatterns.join(', ') || 'N/A'}
- PII Category Mentions Summary: ${piiMentionsSummary}
- Average Linguistic Complexity Score: ${avgComplexity.toFixed(1)}/10
- Overall Sentiment Distribution: Positive: ${Math.round((overallSentimentDistribution.positive || 0) * 100)}%, Neutral: ${Math.round((overallSentimentDistribution.neutral || 0) * 100)}%, Negative: ${Math.round((overallSentimentDistribution.negative || 0) * 100)}%

Instructions:
- dominantInterests: List 3-5 key interests derived from topics.
- communicationModalities: Describe 2-3 primary communication approaches based on patterns.
- emotionalToneAndEngagement: Synthesize from sentiment data.
- informationSharingTendencies: Based on the PII summary.
- overallInteractionStyle: Combine patterns and complexity for a holistic view.

Output JSON only:
  `;
}


export const LINGUISTIC_FINGERPRINT_PROMPT_IDENTIFIER = "LINGUISTIC_FINGERPRINT_PROMPT_IDENTIFIER";
export function getLinguisticFingerprintPrompt(
  allStandoutVocabulary: string[], // A list of all unique standout words collected
  avgComplexityScore: number,
  avgUserSentenceLength: number, // From basic analysis
  userVocabularySizeEstimate: number // From basic analysis (unique word count)
): string {
  // Create a sample of standout vocabulary to pass to the LLM to keep prompt size manageable
  const vocabSample = allStandoutVocabulary.slice(0, 30).join(', '); // Take first 30 unique ones

  return `
${LINGUISTIC_FINGERPRINT_PROMPT_IDENTIFIER}
You are an AI linguistic analyst. Based on the provided aggregated linguistic data, create a "Linguistic Fingerprint" report for the user.
Provide the output STRICTLY in the following JSON format:

{
  "reportTitle": "User Linguistic Fingerprint Analysis",
  "overallStyleDescription": "string (e.g., 'The user's linguistic style is predominantly analytical and articulate, characterized by...')",
  "vocabularyProfile": {
    "qualitativeAssessment": "string (e.g., 'Exhibits a rich and nuanced vocabulary', 'Employs precise and often technical terminology', 'Vocabulary is functional and direct')",
    "notableWords": ["string", "string"],
    "estimatedLexicalDiversity": "string ('Below Average', 'Average', 'Above Average', 'High' - based on variety and uniqueness if inferable)"
  },
  "sentenceStructure": "string (e.g., 'Often uses complex sentence structures with multiple clauses', 'Prefers concise and direct sentences', 'Varies sentence length effectively')",
  "expressiveness": "string (e.g., 'Language is generally formal with moments of informal expression', 'Consistently informal and conversational', 'Primarily objective and factual')",
  "potentialInterestsIndicatedByLanguage": ["string", "string"],
  "disclaimer": "This linguistic analysis is an AI-generated interpretation based on aggregated text patterns. It is not a formal psychometric assessment of verbal intelligence or ability."
}

Aggregated Linguistic Data:
- Sample of Standout Vocabulary: ${vocabSample || 'N/A'}
- Average Linguistic Complexity Score (1-10): ${avgComplexityScore.toFixed(1)}
- Average User Sentence Length (words): ${avgUserSentenceLength.toFixed(1)}
- Estimated User Vocabulary Size (unique words): ${userVocabularySizeEstimate}

Instructions:
- overallStyleDescription: A 2-3 sentence summary of their communication voice.
- vocabularyProfile.qualitativeAssessment: Judge the richness and type of vocabulary.
- vocabularyProfile.notableWords: List 5-7 particularly interesting or representative words from the provided sample or inferred from the overall description.
- vocabularyProfile.estimatedLexicalDiversity: A qualitative estimate of vocabulary breadth.
- sentenceStructure: Comment on typical sentence complexity and length.
- expressiveness: Formal/informal, objective/subjective.
- potentialInterestsIndicatedByLanguage: What topics or domains might their word choices suggest? (e.g., "Frequent use of medical terms suggests interest in health"). List 2-3.

Output JSON only:
  `;
}