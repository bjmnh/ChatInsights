import type { CaseFile } from './merge.ts';

export interface PremiumReportShape {
  fbiReport?: {
    reportTitle: string;
    subjectCodename: { name: string; justification: string; operationalSignificance?: string };
    subjectProfileSummary: string;
    psychologicalProfile?: string;
    dominantInterests: string[];
    communicationModalities: string[];
    emotionalToneAndEngagement: string;
    informationSharingTendencies: string;
    piiExamples: Array<{ pii: string; context: string; category: string; riskLevel?: string; conversationContext?: string }>;
    overallInteractionStyle: string;
    behavioralPatterns?: string[];
    potentialVulnerabilities?: string[];
    operationalAssessment?: string;
    disclaimer: string;
  };
  linguisticFingerprint?: {
    reportTitle: string;
    overallStyleDescription: string;
    vocabularyProfile: { qualitativeAssessment: string; notableWords: string[] };
    sentenceStructure: string;
    expressiveness: string;
    potentialInterestsIndicatedByLanguage: string[];
    stats?: Array<{ label: string; value: string }>;
    meters?: Array<{ label: string; value: number }>;
    disclaimer: string;
  };
  topInterestingConversations?: Array<{ conversationId: string; title?: string; justification: string; significance?: string; insights?: string[] }>;
  realityTVPersona?: {
    reportTitle: string;
    personaArchetype: string;
    description: string;
    popCultureComparisons: string[];
    characterTraits?: string[];
    likelyStoryArcs?: string[];
    viewerAppeal?: string;
    conflictStyle?: string;
    disclaimer: string;
  };
  unfilteredMirror?: {
    reportTitle: string;
    observation: string;
    deeperInsight?: string;
    psychologicalImplications?: string;
    disclaimer: string;
  };
  piiSafetyCompass?: {
    reportTitle: string;
    awarenessScore: 'Low Risk' | 'Medium Risk' | 'High Risk';
    summary: string;
    detailedBreakdown: Array<{ category: string; advice: string; riskLevel?: string; examples?: string[] }>;
    overallSecurityPosture?: string;
    recommendedActions?: string[];
    disclaimer: string;
  };
  digitalDoppelganger?: {
    reportTitle: string;
    handle: string;
    bio: string;
    topHashtags: string[];
    personalityTraits?: string[];
    posts?: Array<{ id: string; content: string; timestamp: string; likes: number; retweets: number; replies: number }>;
    disclaimer: string;
  };
}

function titlesOf(ids: string[], titles: Map<string, string>): string {
  const names = ids.map((id) => titles.get(id) || id).filter(Boolean);
  return names.length ? names.join(', ') : '';
}

export const ORIGINAL_CARD_COPY: Record<string, string> = {
  fbi: 'A comprehensive behavioral profile with psychological insights and operational assessment.',
  linguistic: 'Advanced analysis of your language patterns, vocabulary, and communication style.',
  top5: 'Your 5 most intellectually unique and engaging conversation topics.',
  reality: 'Your personality archetype and how you\'d appear on reality television.',
  mirror: 'A profound, unvarnished observation about your inner patterns and motivations.',
  pii: 'Analysis of your information sharing patterns and privacy security recommendations.',
  doppelganger: 'Your hypothetical social media profile based on your communication patterns.',
  people: 'Names that come up, and how you describe them.',
  places: 'Places and organizations that show up in the chats.',
  timeline: 'Dated events and projects pulled from the chats that were read.',
  decisions: 'Choices you wrote down, and the ones you later changed.',
  loops: 'Questions you asked more than once and have not closed.',
  mind: 'Worries and beliefs you stated in your own words.',
};

function distinct(value: string | undefined, shared: string[]): string | undefined {
  const text = value?.trim();
  if (!text) return undefined;
  if (shared.some((item) => item.trim() === text)) return undefined;
  return text;
}

export function reportSubtitle(file: CaseFile): string {
  const depth = file.model.depth === 'quick'
    ? 'Quick scan'
    : file.model.depth === 'deep'
      ? 'Deep read'
      : file.model.depth === 'forensic'
        ? 'Forensic read'
        : 'Standard read';
  const model = file.model.id === 'demo-extractor' ? 'Demo extractor' : file.model.id;
  return `${depth} · ${file.coverage.read} of ${file.coverage.conversations} conversations · ${model}`;
}

export function cardPreviews(file: CaseFile, hydrated: PremiumReportShape): Record<string, string> {
  const cover = file.narrative.cover.trim();
  const shared = [cover, 'From the chats that were read', 'No cover was written for this read.'];
  const pick = (...values: Array<string | undefined>) => {
    for (const value of values) {
      const text = distinct(value, shared);
      if (text) return text;
    }
    return '';
  };
  const notSearched = 'NO RECORDS FOUND AT THIS DEPTH';
  const fbi = hydrated.fbiReport;
  const reality = hydrated.realityTVPersona;
  const mirror = hydrated.unfilteredMirror;
  return {
    fbi: file.cardStatus.file === 'not-searched'
      ? notSearched
      : pick(fbi?.subjectCodename.justification, fbi?.psychologicalProfile, fbi?.dominantInterests[0]) || ORIGINAL_CARD_COPY.fbi,
    linguistic: pick(hydrated.linguisticFingerprint?.overallStyleDescription) || ORIGINAL_CARD_COPY.linguistic,
    top5: file.cardStatus.notable === 'not-searched'
      ? notSearched
      : pick(hydrated.topInterestingConversations?.[0]?.title, hydrated.topInterestingConversations?.[0]?.justification) || ORIGINAL_CARD_COPY.top5,
    reality: file.cardStatus.stranger === 'not-searched'
      ? notSearched
      : pick(reality?.personaArchetype, reality?.viewerAppeal, reality?.likelyStoryArcs?.[0]) || ORIGINAL_CARD_COPY.reality,
    mirror: file.cardStatus.stranger === 'not-searched'
      ? notSearched
      : pick(mirror?.observation, mirror?.deeperInsight, mirror?.psychologicalImplications) || ORIGINAL_CARD_COPY.mirror,
    pii: pick(hydrated.piiSafetyCompass?.summary) || ORIGINAL_CARD_COPY.pii,
    doppelganger: pick(hydrated.digitalDoppelganger?.bio, hydrated.digitalDoppelganger?.handle) || ORIGINAL_CARD_COPY.doppelganger,
    people: file.cardStatus.people === 'not-searched'
      ? notSearched
      : pick(file.people.slice(0, 3).map((person) => person.name).join(', ')) || ORIGINAL_CARD_COPY.people,
    places: file.cardStatus.places === 'not-searched'
      ? notSearched
      : pick([...file.places, ...file.orgs].slice(0, 3).map((item) => item.v).join(', ')) || ORIGINAL_CARD_COPY.places,
    timeline: file.cardStatus.timeline === 'not-searched'
      ? notSearched
      : pick(file.timeline[0]?.v, file.projects[0]?.v) || ORIGINAL_CARD_COPY.timeline,
    decisions: file.cardStatus.decisions === 'not-searched'
      ? notSearched
      : pick(file.decisions[0] ? `${file.decisions[0].question}: ${file.decisions[0].v}` : undefined) || ORIGINAL_CARD_COPY.decisions,
    loops: file.cardStatus.loops === 'not-searched'
      ? notSearched
      : pick(file.open_loops[0]?.v) || ORIGINAL_CARD_COPY.loops,
    mind: file.cardStatus.mind === 'not-searched'
      ? notSearched
      : pick(file.worries[0]?.v, file.beliefs[0]?.v) || ORIGINAL_CARD_COPY.mind,
  };
}

function prose(value: string | undefined): string | undefined {
  const text = value?.trim();
  if (!text) return undefined;
  if (text.split(/\s+/).length < 6) return undefined;
  return text;
}

function disclaimer(file: CaseFile): string {
  const state = file.coverage.partial ? 'Partial report.' : 'Complete report.';
  return `${state} ${file.model.provider} · ${file.model.id} · ${file.coverage.depth}. Read ${file.coverage.read} of ${file.coverage.conversations} conversations.`;
}

function searched(file: CaseFile, card: keyof CaseFile['cardStatus']): boolean {
  return file.cardStatus[card] !== 'not-searched';
}

export function hydratePremiumReport(file: CaseFile, titles: Map<string, string>): PremiumReportShape {
  const note = disclaimer(file);
  const cover = file.narrative.cover || 'No cover was written for this read.';
  const interestLines = file.interests.map((item) => item.v);
  const peopleLine = file.people.slice(0, 6).map((person) => (
    person.relationship ? `${person.name} (${person.relationship})` : person.name
  ));
  const codename = file.narrative.codename;
  const codenameReason = file.narrative.codename_reason;

  const report: PremiumReportShape = {};

  if (searched(file, 'file')) {
    report.fbiReport = {
      reportTitle: 'A read of your chats',
      subjectCodename: {
        name: codename,
        justification: codenameReason,
        operationalSignificance: titlesOf(file.narrative.ev, titles) || undefined,
      },
      subjectProfileSummary: cover,
      psychologicalProfile: prose(file.beliefs.map((item) => item.v).join(' ')) || prose(file.worries.map((item) => item.v).join(' ')),
      dominantInterests: interestLines.length ? interestLines : file.coverage.topics.map((topic) => topic.topic).filter(Boolean),
      communicationModalities: [
        `${file.style.wordsPerMessage} words per message you sent`,
        `${Math.round(file.style.questionShare * 100)}% of your messages ask a question`,
      ],
      emotionalToneAndEngagement: file.worries[0]?.v || 'No worry was extracted at this depth.',
      informationSharingTendencies: `You shared ${file.exposure.emails.length} email addresses, ${file.exposure.phones.length} phone numbers, and ${file.exposure.cardLike} card-like numbers.`,
      piiExamples: [
        ...file.exposure.emails.slice(0, 3).map((email) => ({
          pii: email,
          context: 'Typed in a chat',
          category: 'Email',
          riskLevel: 'medium',
          conversationContext: titlesOf(file.exposure.ev, titles) || undefined,
        })),
        ...file.exposure.phones.slice(0, 2).map((phone) => ({
          pii: phone,
          context: 'Typed in a chat',
          category: 'Phone',
          riskLevel: 'medium',
        })),
      ],
      overallInteractionStyle: file.style.topPhrases.length
        ? `Phrases that repeat: ${file.style.topPhrases.join(', ')}.`
        : 'The local pass did not find a repeated phrase.',
      behavioralPatterns: [
        ...peopleLine.slice(0, 4),
        file.routines.peakHours.length ? `Peak hours (UTC): ${file.routines.peakHours.join(', ')}` : '',
      ].filter(Boolean),
      potentialVulnerabilities: file.health.slice(0, 3).map((item) => item.v),
      operationalAssessment: file.narrative.blurbs.file || cover,
      disclaimer: note,
    };
  }

  if (searched(file, 'style') || file.cardStatus.style === 'local') {
    report.linguisticFingerprint = {
      reportTitle: 'How the sentences go',
      overallStyleDescription: `About ${file.style.wordsPerMessage} words per message you sent, across ${file.style.userMessages} messages and ${file.style.userWords} words.`,
      vocabularyProfile: {
        qualitativeAssessment: `Vocabulary ratio ${file.style.vocabulary}. Question share ${Math.round(file.style.questionShare * 100)}%.`,
        notableWords: file.style.topPhrases.length ? file.style.topPhrases : ['No repeated phrase'],
      },
      sentenceStructure: file.style.questionShare > 0.3
        ? 'A lot of what you send is a question.'
        : 'Most of what you send is a statement, not a question.',
      expressiveness: file.style.swearCount
        ? `${file.style.swearCount} swear words in the messages you sent.`
        : 'No swear words turned up in the local pass.',
      stats: [
        { label: 'Words / message', value: String(file.style.wordsPerMessage) },
        { label: 'Your messages', value: String(file.style.userMessages) },
        { label: 'Question share', value: `${Math.round(file.style.questionShare * 100)}%` },
      ],
      meters: [
        { label: 'Questions', value: file.style.questionShare },
        { label: 'Vocabulary', value: Math.min(1, file.style.vocabulary) },
      ],
      potentialInterestsIndicatedByLanguage: interestLines,
      disclaimer: 'From the local pass. No model call for these counts.',
    };
  }

  if (searched(file, 'notable') || file.cardStatus.notable === 'local' || file.cardStatus.notable === 'partial') {
    const rows = file.notable.slice(0, 5).map((item) => ({
      conversationId: item.id,
      title: item.title,
      justification: item.reasons.length ? item.reasons.join(', ') : `Score ${item.score}`,
      significance: item.modelRead ? 'The model read this chat.' : 'Not model-read at this depth.',
      insights: [`Score ${item.score}`],
    }));
    if (rows.length) report.topInterestingConversations = rows;
  }

  if (searched(file, 'stranger')) {
    report.realityTVPersona = {
      reportTitle: 'What a stranger would conclude',
      personaArchetype: file.subject.occupation?.v || peopleLine[0] || 'From the chats that were read',
      description: [file.narrative.blurbs.stranger, file.decisions[0] ? `${file.decisions[0].question}: ${file.decisions[0].v}.` : '']
        .filter((line) => line && line.trim() !== cover)
        .join(' ') || file.subject.location?.v || cover,
      popCultureComparisons: interestLines.slice(0, 4),
      characterTraits: peopleLine.slice(0, 4),
      likelyStoryArcs: file.decisions.slice(0, 3).map((item) => `${item.question}: ${item.v}`),
      viewerAppeal: file.subject.location ? `You place yourself in ${file.subject.location.v}.` : undefined,
      conflictStyle: file.contradictions[0]
        ? `${file.contradictions[0].field}: ${file.contradictions[0].earlier.v} → ${file.contradictions[0].later.v}`
        : undefined,
      disclaimer: note,
    };
    report.unfilteredMirror = {
      reportTitle: 'The unfiltered mirror',
      observation: file.worries[0]?.quote
        ? `“${file.worries[0].quote}”`
        : file.worries[0]?.v || file.beliefs[0]?.v || cover,
      deeperInsight: file.beliefs.map((item) => item.v).join(' ') || undefined,
      psychologicalImplications: file.worries.map((item) => item.v).join(' ') || undefined,
      disclaimer: note,
    };
  }

  if (searched(file, 'sensitive') || file.cardStatus.sensitive === 'local' || file.cardStatus.sensitive === 'partial') {
    const count = file.exposure.emails.length + file.exposure.phones.length + file.exposure.cardLike;
    const awarenessScore: 'Low Risk' | 'Medium Risk' | 'High Risk' = file.exposure.cardLike > 0 || count > 4
      ? 'High Risk'
      : count > 0
        ? 'Medium Risk'
        : 'Low Risk';
    report.piiSafetyCompass = {
      reportTitle: 'What you actually typed',
      awarenessScore,
      summary: `You shared ${file.exposure.emails.length} ${file.exposure.emails.length === 1 ? 'email address' : 'email addresses'}, ${file.exposure.phones.length} ${file.exposure.phones.length === 1 ? 'phone number' : 'phone numbers'}, and ${file.exposure.cardLike} card-like ${file.exposure.cardLike === 1 ? 'number' : 'numbers'}. Card-like numbers are counted, not printed.`,
      detailedBreakdown: [
        {
          category: 'Emails and phones',
          advice: 'These were masked before any model call. They still sit in the export on this device.',
          riskLevel: file.exposure.emails.length || file.exposure.phones.length ? 'medium' : 'low',
          examples: [...file.exposure.emails, ...file.exposure.phones].slice(0, 6),
        },
        ...file.health.slice(0, 3).map((item) => ({
          category: 'Health',
          advice: item.quote ? `“${item.quote}”` : item.v,
          riskLevel: 'high',
          examples: [titlesOf(item.ev, titles) || item.v],
        })),
        ...file.money.slice(0, 3).map((item) => ({
          category: 'Money',
          advice: item.quote ? `“${item.quote}”` : item.v,
          riskLevel: 'medium',
          examples: [titlesOf(item.ev, titles) || item.v],
        })),
      ],
      overallSecurityPosture: titlesOf(file.exposure.ev, titles)
        ? `Identifiers showed up in: ${titlesOf(file.exposure.ev, titles)}.`
        : 'No identifier turned up in the local pass.',
      recommendedActions: ['Download the case file if you want a copy. The raw export is not uploaded.'],
      disclaimer: 'This is not a security audit. ' + note,
    };
  }

  if (searched(file, 'file') || searched(file, 'usage')) {
    const posts = [
      ...file.decisions.slice(0, 2).map((item, index) => ({
        id: `d${index}`,
        content: `${item.question} ${item.v}${item.quote ? ` “${item.quote}”` : ''}`,
        timestamp: item.first || '',
        likes: 0,
        retweets: 0,
        replies: 0,
      })),
      ...file.notable.slice(0, 2).map((item) => ({
        id: item.id,
        content: `${item.title}. ${item.reasons.join(', ') || 'Flagged locally.'}`,
        timestamp: '',
        likes: 0,
        retweets: 0,
        replies: 0,
      })),
    ];
    report.digitalDoppelganger = {
      reportTitle: 'A profile from the case file',
      handle: file.subject.nameGuess?.v ? `@${file.subject.nameGuess.v.toLowerCase().replace(/\s+/g, '')}` : '@your-chats',
      bio: [file.subject.occupation?.v, file.subject.location?.v].filter(Boolean).join(' · ') || cover,
      topHashtags: (interestLines.length ? interestLines : file.style.topPhrases).slice(0, 4).map((item) => `#${item.replace(/\s+/g, '')}`),
      personalityTraits: peopleLine.slice(0, 4),
      posts: posts.length ? posts : [{ id: 'cover', content: cover, timestamp: '', likes: 0, retweets: 0, replies: 0 }],
      disclaimer: note,
    };
  }

  return report;
}
