import { isEchoedPlaceholder } from './checks.ts';
import { notablePhraseOk } from './localPass.ts';
import { decisionText, isPlaceholderCopy, publicArchetype, publicCodenameReason, type CaseFile } from './merge.ts';

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
    posts?: Array<{ id: string; content: string; timestamp: string; likes?: number; retweets?: number; replies?: number }>;
    disclaimer: string;
  };
}

const RAW_CONVERSATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A saved file may only have the export's id. Those stay off the page. */
export function conversationTitle(id: string, titles: Map<string, string>): string | undefined {
  const named = titles.get(id)?.trim();
  if (!named || named === id || RAW_CONVERSATION_ID.test(named)) return undefined;
  return named;
}

function titlesOf(ids: string[], titles: Map<string, string>): string {
  return uniqueDisplay(ids.map((id) => conversationTitle(id, titles) || '')).join(', ');
}

const JUNK_TOKEN = new Set([
  'resumed', 'started', 'continued', 'finished', 'stopped', 'trying', 'working', 'going', 'using',
  'making', 'getting', 'having', 'being', 'doing', 'said', 'says', 'want', 'wanted', 'need', 'needed',
  'like', 'liked', 'just', 'also', 'really', 'very', 'more', 'some', 'this', 'that', 'with', 'from',
  'into', 'about', 'after', 'before', 'during', 'while', 'because', 'since', 'until', 'again', 'still',
  'already', 'always', 'never', 'often', 'maybe', 'perhaps', 'actually', 'basically', 'literally',
  'untitled', 'topic', 'chat',
]);

/** Case-insensitive unique list. Single-token junk, such as "resumed", can be dropped from interests. */
export function uniqueDisplay(items: Array<string | undefined>, dropJunkTokens = false): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const text = raw?.trim() ?? '';
    if (!text) continue;
    if (dropJunkTokens && !/\s/.test(text) && (text.length < 3 || JUNK_TOKEN.has(text.toLowerCase()))) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

export const EMPTY_RECORD = 'NO RECORDS FOUND AT THIS DEPTH';
export const EMPTY_IN_CHATS = 'Nothing in these chats for this card';

export function emptyCardCopy(searchedThisDepth: boolean): string {
  return searchedThisDepth ? EMPTY_IN_CHATS : EMPTY_RECORD;
}

function isPersonTrait(value: string, file: CaseFile): boolean {
  const text = value.trim().toLowerCase();
  if (!text) return false;
  return file.people.some((person) => {
    const name = person.name.trim().toLowerCase();
    if (name.length < 2) return false;
    return text === name || text.startsWith(`${name} (`) || text.startsWith(`${name} `);
  });
}

/** Drop a duplicated "copy" suffix left by some exports and test files. */
export function displayTitle(title: string): string {
  return title.replace(/\s+copy$/i, '').replace(/\s{2,}/g, ' ').trim();
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

function wordShape(word: string): 'acronym' | 'internal' | 'title' | 'lower' | 'other' {
  const letters = word.replace(/[^A-Za-z]/g, '');
  if (!letters) return 'other';
  if (/^[A-Z]{2,5}$/.test(letters)) return 'acronym';
  if (/[a-z]/.test(letters) && /[A-Z]/.test(letters) && !/^[A-Z][a-z'’-]*$/.test(letters)) return 'internal';
  if (/^[A-Z][a-z'’-]*$/.test(letters)) return 'title';
  if (letters === letters.toLowerCase()) return 'lower';
  return 'other';
}

/**
 * Sentence case for findings and labels. The first letter is capitalized.
 * A phrase that is already title case ("High School Chemistry Teacher") becomes
 * sentence case. Acronyms, internal capitals (iPhone), and later proper nouns
 * (Google Sheets) stay. Hashtags and evidence quotes are not passed through this.
 */
export function sentenceCase(value: string): string {
  const text = value.trim();
  if (!text || text.startsWith('#')) return text;
  const parts = text.split(/(\s+)/);
  const shapes = parts.filter((part) => /[A-Za-z]/.test(part)).map(wordShape);
  const titled = shapes.filter((shape) => shape === 'title').length;
  const lower = shapes.filter((shape) => shape === 'lower').length;
  const uniformTitle = titled >= 2 && lower === 0;
  let seen = false;
  return parts.map((part) => {
    if (!/[A-Za-z]/.test(part)) return part;
    const shape = wordShape(part);
    const first = !seen;
    seen = true;
    if (shape === 'acronym' || shape === 'internal') return part;
    if (uniformTitle) {
      const index = part.search(/[A-Za-z]/);
      if (first) return part.slice(0, index) + part.charAt(index).toUpperCase() + part.slice(index + 1).toLowerCase();
      return part.slice(0, index) + part.slice(index).toLowerCase();
    }
    if (!first) return part;
    const index = part.search(/[a-z]/);
    if (index < 0) return part;
    const before = part.slice(0, index);
    if (/[A-Za-z]/.test(before)) return part;
    return before + part.charAt(index).toUpperCase() + part.slice(index + 1);
  }).join('');
}

/** Type-token ratio on a 0–1 bar. 0.603 displays as 60%, not 100%. */
export function vocabularyMeterValue(style: { vocabulary: number; wordsPerMessage: number }): number {
  return Math.max(0, Math.min(1, style.vocabulary));
}

export function publicSubjectName(file: CaseFile): string {
  const name = file.narrative.codename.trim();
  if (name && !isPlaceholderCopy(name)) return name;
  const seed = [...file.interests, ...file.decisions].map((item) => item.v.trim()).find((value) => {
    const words = value.split(/\s+/);
    return words.length >= 1 && words.length <= 4 && !value.includes('#') && !/^\d/.test(value);
  });
  return seed ? sentenceCase(seed) : 'Untitled case file';
}

export function sourceLabels(ids: string[], titles: Map<string, string>, order: Map<string, number>): string[] {
  return sourceChips(ids, titles, order).map((chip) => chip.label);
}

export function sourceChips(ids: string[], titles: Map<string, string>, order: Map<string, number>): { id: string; label: string }[] {
  return ids.map((id) => {
    const title = conversationTitle(id, titles);
    const index = order.get(id);
    const label = index == null
      ? (title || 'Source chat')
      : title ? `Conversation ${index + 1} · ${title}` : `Conversation ${index + 1}`;
    return { id, label };
  });
}

export function isThinProfileLabel(value: string): boolean {
  const text = value.replace(/^@/, '').trim();
  if (!text) return true;
  if (text.length < 4) return true;
  return /^\d+\s*(year|years|month|months|day|days|week|weeks)\b\.?$/i.test(text)
    || /^\d+(year|years|month|months|day|days|week|weeks)$/i.test(text);
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
  const unread = Math.max(0, file.coverage.conversations - file.coverage.read);
  const scope = file.model.depth === 'standard' && unread > 0
    ? `${file.coverage.read} of ${file.coverage.conversations} conversations (unflagged chats were not sent)`
    : `${file.coverage.read} of ${file.coverage.conversations} conversations`;
  return `${depth} · ${scope} · ${model}`;
}

const FILED_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatFiledDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  return `${String(parsed.getUTCDate()).padStart(2, '0')} ${FILED_MONTHS[parsed.getUTCMonth()]} ${parsed.getUTCFullYear()}`;
}

export function caseDownloadName(filename: string | null | undefined): string {
  const stripped = (filename || 'chat-insights').replace(/(\.[a-z0-9]{1,8})+$/i, '').replace(/\.+$/, '').trim();
  return `${stripped || 'chat-insights'}-case-file.json`;
}

export function filedStamp(file: CaseFile): string {
  const analyst = file.model.id === 'demo-extractor' ? 'Demo extractor' : file.model.id;
  const filed = formatFiledDate(file.filedAt) || 'undated';
  return `Filed: ${filed} · Analyst: ${analyst}`;
}

const REASON_LINE: Record<string, string> = {
  identifier: 'an identifier in the chat',
  health: 'a health note',
  money: 'a money note',
  person: 'a named person',
  intense: 'a tense note',
  long: 'a long thread',
  self: 'a self-description',
};

function threadPreview(file: CaseFile): string | undefined {
  const lead = file.notable[0];
  if (!lead?.title) return undefined;
  const title = displayTitle(lead.title);
  if (!title) return undefined;
  const count = file.notable.length;
  return `${title} is one of the chats this read kept. ${count} ${count === 1 ? 'thread' : 'threads'} on file.`;
}

export function cardPreviews(file: CaseFile, hydrated: PremiumReportShape): Record<string, string> {
  const cover = file.narrative.cover.trim();
  const shared = [cover, 'From the chats that were read', 'No cover was written for this read.'];
  const pick = (...values: Array<string | undefined>) => {
    for (const value of values) {
      const text = distinct(value, shared);
      if (text) return sentenceCase(text);
    }
    return '';
  };
  const gap = (card: keyof CaseFile['cardStatus']) => emptyCardCopy(file.cardStatus[card] !== 'not-searched');
  const fbi = hydrated.fbiReport;
  const reality = hydrated.realityTVPersona;
  const mirror = hydrated.unfilteredMirror;
  return {
    fbi: file.cardStatus.file === 'not-searched'
      ? gap('file')
      : pick(fbi?.subjectCodename.justification, fbi?.psychologicalProfile, fbi?.dominantInterests[0]) || ORIGINAL_CARD_COPY.fbi,
    linguistic: pick(hydrated.linguisticFingerprint?.overallStyleDescription) || ORIGINAL_CARD_COPY.linguistic,
    top5: file.cardStatus.notable === 'not-searched'
      ? gap('notable')
      : threadPreview(file) || ORIGINAL_CARD_COPY.top5,
    reality: file.cardStatus.stranger === 'not-searched'
      ? gap('stranger')
      : pick(reality?.personaArchetype, reality?.viewerAppeal, reality?.likelyStoryArcs?.[0]) || ORIGINAL_CARD_COPY.reality,
    mirror: file.cardStatus.stranger === 'not-searched' || !mirror?.observation || mirror.observation === EMPTY_RECORD || mirror.observation === EMPTY_IN_CHATS
      ? gap('stranger')
      : pick(mirror.observation, mirror.deeperInsight, mirror.psychologicalImplications) || gap('stranger'),
    pii: pick(hydrated.piiSafetyCompass?.summary) || ORIGINAL_CARD_COPY.pii,
    doppelganger: pick(hydrated.digitalDoppelganger?.bio, hydrated.digitalDoppelganger?.handle) || ORIGINAL_CARD_COPY.doppelganger,
    people: file.cardStatus.people === 'not-searched' || file.people.length === 0
      ? gap('people')
      : pick(file.people.slice(0, 3).map((person) => sentenceCase(person.name)).join(', ')) || gap('people'),
    places: file.cardStatus.places === 'not-searched' || (file.places.length === 0 && file.orgs.length === 0)
      ? gap('places')
      : pick([...file.places, ...file.orgs].slice(0, 3).map((item) => item.v).join(', ')) || gap('places'),
    timeline: file.cardStatus.timeline === 'not-searched' || (file.timeline.length === 0 && file.projects.length === 0)
      ? gap('timeline')
      : pick(file.timeline[0]?.v, file.projects[0]?.v) || gap('timeline'),
    decisions: file.cardStatus.decisions === 'not-searched' || file.decisions.length === 0
      ? gap('decisions')
      : pick(file.decisions[0] ? decisionText(file.decisions[0].question, file.decisions[0].v) : undefined) || gap('decisions'),
    loops: file.cardStatus.loops === 'not-searched' || file.open_loops.length === 0
      ? gap('loops')
      : pick(file.open_loops[0]?.v) || gap('loops'),
    mind: file.cardStatus.mind === 'not-searched' || (file.worries.length === 0 && file.beliefs.length === 0)
      ? gap('mind')
      : pick(file.worries[0]?.v, file.beliefs[0]?.v) || gap('mind'),
  };
}

function prose(value: string | undefined): string | undefined {
  const text = value?.trim();
  if (!text) return undefined;
  if (text.split(/\s+/).length < 6) return undefined;
  return text;
}

function normText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Keep the first copy of a sentence. Later cards do not repeat it. */
function claim(value: string | undefined, used: Set<string>): string | undefined {
  const text = value?.trim();
  if (!text || isEchoedPlaceholder(text)) return undefined;
  const key = normText(text);
  if (used.has(key)) return undefined;
  used.add(key);
  return text;
}

export function scrubRawCodes(value: string): string {
  return value
    .replace(/\s*[.,;]?\s*\b(self|money|person|health|identifier|intense|long|work|pii|emotion|place|org)\b\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function toHashtag(value: string): string {
  const body = value.trim().replace(/^#+/, '').replace(/[^a-z0-9]+/gi, '');
  return body ? `#${body}` : '';
}

function keptProse(value: string | undefined): string | undefined {
  const text = prose(value);
  if (!text || isEchoedPlaceholder(text)) return undefined;
  return text;
}

function searched(file: CaseFile, card: keyof CaseFile['cardStatus']): boolean {
  return file.cardStatus[card] !== 'not-searched';
}

export function hydratePremiumReport(file: CaseFile, titles: Map<string, string>): PremiumReportShape {
  const used = new Set<string>();
  const cover = claim(file.narrative.cover, used) || 'No cover was written for this read.';
  if (file.narrative.codename_reason.trim()) used.add(normText(file.narrative.codename_reason));
  const interestLines = uniqueDisplay(file.interests.map((item) => sentenceCase(item.v)), true);
  const codenameReason = file.narrative.codename_reason;

  const report: PremiumReportShape = {};

  if (searched(file, 'file')) {
    report.fbiReport = {
      reportTitle: 'A read of your chats',
      subjectCodename: {
        name: publicSubjectName(file),
        justification: publicCodenameReason(codenameReason),
        operationalSignificance: titlesOf(file.narrative.ev, titles) || undefined,
      },
      subjectProfileSummary: sentenceCase(cover),
      psychologicalProfile: (() => {
        const text = keptProse(file.beliefs.map((item) => sentenceCase(item.v)).join(' '))
          || keptProse(file.worries.map((item) => sentenceCase(item.v)).join(' '));
        return text ? sentenceCase(text) : undefined;
      })(),
      dominantInterests: uniqueDisplay(
        interestLines.length ? interestLines : file.coverage.topics.map((topic) => topic.topic),
        true,
      ),
      communicationModalities: [
        `${file.style.wordsPerMessage} words per message you sent`,
        `${Math.round(file.style.questionShare * 100)}% of your messages ask a question`,
      ],
      emotionalToneAndEngagement: file.worries[0]?.v ? sentenceCase(file.worries[0].v) : 'No worry was extracted at this depth.',
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
        ...interestLines.slice(0, 3),
        file.routines.peakHours.length ? `Peak hours (UTC): ${file.routines.peakHours.join(', ')}` : '',
      ].filter((item): item is string => Boolean(item) && !isPersonTrait(item, file)).map((item) => sentenceCase(item)),
      potentialVulnerabilities: file.health.slice(0, 3).map((item) => sentenceCase(item.v)),
      operationalAssessment: (() => {
        const note = file.narrative.blurbs.file?.trim();
        if (!note || isEchoedPlaceholder(note)) return undefined;
        if (normText(note) === normText(cover)) return undefined;
        return claim(note, used);
      })(),
      disclaimer: '',
    };
  }

  if (searched(file, 'style') || file.cardStatus.style === 'local') {
    report.linguisticFingerprint = {
      reportTitle: 'How the sentences go',
      overallStyleDescription: `About ${file.style.wordsPerMessage} words per message you sent, across ${file.style.userMessages} messages and ${file.style.userWords} words.`,
      vocabularyProfile: {
        qualitativeAssessment: `Vocabulary ratio ${file.style.vocabulary}. Question share ${Math.round(file.style.questionShare * 100)}%.`,
        notableWords: uniqueDisplay(file.style.topPhrases.filter(notablePhraseOk)),
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
        { label: `Type-token ${file.style.vocabulary.toFixed(2)}`, value: vocabularyMeterValue(file.style) },
      ],
      potentialInterestsIndicatedByLanguage: interestLines,
      disclaimer: 'From the local pass. No model call for these counts.',
    };
  }

  if (searched(file, 'notable') || file.cardStatus.notable === 'local' || file.cardStatus.notable === 'partial') {
    const rows = file.notable.slice(0, 5).map((item) => ({
      conversationId: item.id,
      title: displayTitle(item.title),
      justification: sentenceCase(item.reasons.map((reason) => REASON_LINE[reason]).filter(Boolean).join(', ') || `Score ${item.score}`),
      insights: [`Score ${item.score}`],
    }));
    if (rows.length) report.topInterestingConversations = rows;
  }

  if (searched(file, 'stranger')) {
    const archetype = publicArchetype(file.narrative.archetype) || 'A sketch from these chats';
    const strangerNote = claim(keptProse(file.narrative.blurbs.stranger), used);
    report.realityTVPersona = {
      reportTitle: archetype,
      personaArchetype: archetype,
      description: strangerNote && normText(strangerNote) !== normText(archetype) ? strangerNote : '',
      popCultureComparisons: uniqueDisplay(interestLines).slice(0, 4),
      characterTraits: uniqueDisplay(interestLines).filter((item) => !isPersonTrait(item, file)).slice(0, 4),
      likelyStoryArcs: file.decisions.slice(0, 3).map((item) => decisionText(item.question, item.v)),
      viewerAppeal: file.subject.location ? `You place yourself in ${file.subject.location.v}.` : undefined,
      conflictStyle: file.contradictions[0]
        ? `${file.contradictions[0].field}: ${file.contradictions[0].earlier.v} → ${file.contradictions[0].later.v}`
        : undefined,
      disclaimer: '',
    };
    const observation = claim(
      file.worries[0]?.quote && !isEchoedPlaceholder(file.worries[0].quote)
        ? `“${file.worries[0].quote}”`
        : keptProse(file.worries[0]?.v) || keptProse(file.beliefs[0]?.v),
      used,
    );
    report.unfilteredMirror = {
      reportTitle: 'The unfiltered mirror',
      observation: observation ? sentenceCase(observation) : emptyCardCopy(true),
      deeperInsight: claim(keptProse(file.beliefs.map((item) => item.v).join(' ')), used),
      psychologicalImplications: claim(keptProse(file.worries.map((item) => item.v).join(' ')), used),
      disclaimer: '',
    };
  }

  if (searched(file, 'sensitive') || file.cardStatus.sensitive === 'local' || file.cardStatus.sensitive === 'partial') {
    const count = file.exposure.emails.length + file.exposure.phones.length + file.exposure.cardLike;
    const awarenessScore: 'Low Risk' | 'Medium Risk' | 'High Risk' = file.health.length > 0 || file.exposure.cardLike > 0 || count > 4
      ? 'High Risk'
      : file.money.length > 0 || count > 0
        ? 'Medium Risk'
        : 'Low Risk';
    report.piiSafetyCompass = {
      reportTitle: 'What you actually typed',
      awarenessScore,
      summary: `You shared ${file.exposure.emails.length} ${file.exposure.emails.length === 1 ? 'email address' : 'email addresses'}, ${file.exposure.phones.length} ${file.exposure.phones.length === 1 ? 'phone number' : 'phone numbers'}, and ${file.exposure.cardLike} card-like ${file.exposure.cardLike === 1 ? 'number' : 'numbers'}. Card-like numbers are counted, not printed.`,
      detailedBreakdown: [
        {
          category: 'Emails and phones',
          advice: 'These were masked before any model call. They still sit in the export, including the copy stored for security review.',
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
      overallSecurityPosture: awarenessScore === 'High Risk'
        ? (file.health.length
          ? 'High risk. A health note is in these chats.'
          : 'High risk. Several identifiers showed up in these chats.')
        : awarenessScore === 'Medium Risk'
          ? 'Medium risk. An identifier or a money note showed up.'
          : 'Low risk. No identifier turned up in the local pass.',
      recommendedActions: ['Download the case file if you want a copy of the report. The uploaded export is stored separately for security review.'],
      disclaimer: 'This is not a security audit.',
    };
  }

  if (searched(file, 'file') || searched(file, 'usage')) {
    const nameGuess = file.subject.nameGuess?.v?.trim() ?? '';
    const handleBody = nameGuess.toLowerCase().replace(/\s+/g, '');
    const bioParts = [file.subject.occupation?.v, file.subject.location?.v]
      .filter((part): part is string => Boolean(part))
      .map((part) => sentenceCase(part))
      .join(' · ');
    const bio = claim(bioParts, used);
    const posts = [
      ...file.decisions.slice(0, 2).map((item, index) => ({
        id: `d${index}`,
        content: scrubRawCodes(`${decisionText(item.question, item.v)}${item.quote ? ` “${item.quote}”` : ''}`),
        timestamp: item.first || '',
      })),
      ...file.notable.slice(0, 2).map((item) => ({
        id: item.id,
        content: scrubRawCodes(displayTitle(item.title)),
        timestamp: '',
      })),
    ].filter((post) => post.content);
    report.digitalDoppelganger = {
      reportTitle: 'A playful sketch, not a real profile',
      handle: nameGuess && !isThinProfileLabel(nameGuess) && handleBody ? `@${handleBody}` : '@your-chats',
      bio: bio && !isThinProfileLabel(bio) ? bio : 'Imagined from this case file. Not a real account.',
      topHashtags: uniqueDisplay((interestLines.length ? interestLines : file.style.topPhrases.filter(notablePhraseOk)).slice(0, 4).map(toHashtag)),
      personalityTraits: uniqueDisplay(interestLines).filter((item) => !isPersonTrait(item, file)).slice(0, 4),
      posts: posts.length ? posts : [],
      disclaimer: 'A playful sketch from this case file. Follower counts and join dates are not invented here.',
    };
  }

  return report;
}
