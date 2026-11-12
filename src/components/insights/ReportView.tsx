import React from 'react';
import type { NormalizedConversation } from '../../lib/conversationParser/types';
import { cardStateLabel } from '../../lib/insights/depth';
import type { CardId, CardState } from '../../lib/insights/depth';
import { reportLabel, type CaseFile, type Cited } from '../../lib/insights/merge';

const TITLES: Record<CardId, string> = {
  file: 'The file on you',
  people: 'People in your chats',
  places: 'Places and organizations',
  timeline: 'Your timeline',
  interests: 'What you keep coming back to',
  decisions: 'Decisions and changes of mind',
  loops: 'Questions you haven’t settled',
  mind: 'What’s been on your mind',
  sensitive: 'Sensitive things you shared',
  style: 'Your writing fingerprint',
  usage: 'How and when you use these tools',
  notable: 'Conversations worth rereading',
  stranger: 'What a stranger would conclude',
};

function Evidence({ ids, titles }: { ids: string[]; titles: Map<string, string> }) {
  if (!ids.length) return null;
  return (
    <p className="mt-2 text-xs text-[#1c140c]/60">
      From {ids.map((id) => titles.get(id) || id).join(', ')}
    </p>
  );
}

function FactLine({ item, titles }: { item: Cited; titles: Map<string, string> }) {
  return (
    <li className="border-t border-[#1c140c]/10 py-3 first:border-t-0">
      <p>{item.v}{item.quote ? '' : ''}</p>
      {item.quote && <p className="mt-1 text-sm text-[#1c140c]/70">“{item.quote}”</p>}
      <p className="mt-1 text-xs uppercase tracking-wide text-[#1c140c]/50">
        Confidence {item.conf.toFixed(2)} · {item.src}
      </p>
      <Evidence ids={item.ev} titles={titles} />
    </li>
  );
}

function Shell({
  id,
  state,
  depth,
  children,
}: {
  id: CardId;
  state: CardState;
  depth: CaseFile['model']['depth'];
  children?: React.ReactNode;
}) {
  const note = cardStateLabel(state, depth);
  const quiet = state === 'not-searched';
  return (
    <article className={`rounded-3xl p-5 ${quiet ? 'bg-white/5 text-muted-foreground' : 'bg-[#f3ead7] text-[#1c140c]'}`} data-testid={`card-${id}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-2xl">{TITLES[id]}</h3>
        {state === 'not-searched' && <span className="text-xs uppercase tracking-wide">Not searched</span>}
      </div>
      {note && <p className={`mt-2 text-sm ${quiet ? '' : 'text-[#1c140c]/70'}`}>{note}</p>}
      {state === 'not-searched' ? null : <div className="mt-4">{children}</div>}
    </article>
  );
}

const ReportView: React.FC<{
  caseFile: CaseFile;
  conversations: NormalizedConversation[];
  onDownload: () => void;
  onSave?: () => void;
  saveMessage?: string;
}> = ({ caseFile, conversations, onDownload, onSave, saveMessage }) => {
  const titles = new Map(conversations.map((conversation) => [conversation.id, conversation.title]));
  const label = reportLabel(caseFile);
  const { coverage } = caseFile;
  const depthNote = coverage.depth === 'standard'
    ? `Read ${coverage.read} of ${coverage.conversations} conversations (flagged only).`
    : `Read ${coverage.read} of ${coverage.conversations} conversations.`;

  return (
    <div data-testid="report" className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground">{label} report</p>
          <h2 className="mt-2 font-display text-4xl sm:text-5xl">Case file</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {caseFile.model.provider} · {caseFile.model.id} · {coverage.depth}. {depthNote}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onDownload} className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Download JSON
          </button>
          {onSave && (
            <button type="button" onClick={onSave} className="rounded-full border border-white/15 px-4 py-2 text-sm">
              Save to account
            </button>
          )}
        </div>
      </div>

      {label === 'Partial' && (
        <div className="mt-6 rounded-2xl border border-amber-300/40 bg-amber-200/10 px-4 py-3 text-sm" data-testid="partial-banner">
          Partial report. This depth did not finish{coverage.partialReason ? ` (${coverage.partialReason})` : ''}. Unread conversations: {Math.max(0, coverage.planned - coverage.read)}. It is not marked complete.
        </div>
      )}
      {coverage.viaProxy && (
        <p className="mt-4 text-sm text-muted-foreground">
          At least one batch went through Chat Insights’ server because the browser could not call the provider directly. It was not stored.
        </p>
      )}
      {caseFile.supportNote && (
        <p className="mt-4 rounded-2xl border border-white/10 px-4 py-3 text-sm" data-testid="support-note">{caseFile.supportNote}</p>
      )}
      {saveMessage && <p className="mt-4 text-sm text-muted-foreground">{saveMessage}</p>}

      <p className="mt-8 max-w-3xl text-lg">{caseFile.narrative.cover}</p>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Shell id="file" state={caseFile.cardStatus.file} depth={coverage.depth}>
          <ul className="space-y-2 text-sm">
            {caseFile.subject.location && <li>Location: {caseFile.subject.location.v}</li>}
            {caseFile.subject.occupation && <li>Work: {caseFile.subject.occupation.v}</li>}
            {caseFile.subject.nameGuess && <li>Name: {caseFile.subject.nameGuess.v}</li>}
            {!caseFile.subject.location && !caseFile.subject.occupation && <li>No subject lines were extracted.</li>}
          </ul>
          {caseFile.narrative.blurbs.file && <p className="mt-3 text-sm">{caseFile.narrative.blurbs.file}</p>}
        </Shell>

        <Shell id="people" state={caseFile.cardStatus.people} depth={coverage.depth}>
          <ul>
            {caseFile.people.length === 0 && <li className="text-sm">No names stood out.</li>}
            {caseFile.people.map((person) => (
              <li key={person.id} className="border-t border-[#1c140c]/10 py-3 first:border-t-0">
                <p className="font-medium">{person.name}{person.relationship ? ` · ${person.relationship}` : ''}</p>
                <p className="text-sm text-[#1c140c]/70">{person.mentions} mentions · confidence {person.conf.toFixed(2)}</p>
                <Evidence ids={person.ev} titles={titles} />
              </li>
            ))}
          </ul>
        </Shell>

        <Shell id="places" state={caseFile.cardStatus.places} depth={coverage.depth}>
          <ul>
            {[...caseFile.places, ...caseFile.orgs].map((item) => (
              <FactLine key={`${item.v}-${item.ev[0]}`} item={item} titles={titles} />
            ))}
            {caseFile.places.length + caseFile.orgs.length === 0 && <li className="text-sm">None extracted.</li>}
          </ul>
        </Shell>

        <Shell id="timeline" state={caseFile.cardStatus.timeline} depth={coverage.depth}>
          <ul>
            {caseFile.timeline.map((item) => <FactLine key={`${item.v}-${item.first}`} item={item} titles={titles} />)}
            {caseFile.projects.map((item) => <FactLine key={item.v} item={item} titles={titles} />)}
            {caseFile.timeline.length + caseFile.projects.length === 0 && <li className="text-sm">No dated events came back.</li>}
          </ul>
        </Shell>

        <Shell id="interests" state={caseFile.cardStatus.interests} depth={coverage.depth}>
          <ul>
            {caseFile.interests.map((item) => <FactLine key={item.v} item={item} titles={titles} />)}
            {caseFile.interests.length === 0 && <li className="text-sm">None extracted.</li>}
          </ul>
        </Shell>

        <Shell id="decisions" state={caseFile.cardStatus.decisions} depth={coverage.depth}>
          <ul>
            {caseFile.decisions.map((item) => (
              <li key={item.question} className="border-t border-[#1c140c]/10 py-3 first:border-t-0">
                <p>{item.question}</p>
                <p className="text-sm">{item.v}{item.reversed ? ` · earlier: ${item.reversed.v}` : ''}</p>
                <Evidence ids={item.ev} titles={titles} />
              </li>
            ))}
            {caseFile.contradictions.map((item) => (
              <li key={item.field} className="border-t border-[#1c140c]/10 py-3">
                <p>{item.field}: {item.earlier.v} → {item.later.v}</p>
              </li>
            ))}
            {caseFile.decisions.length === 0 && caseFile.contradictions.length === 0 && <li className="text-sm">None extracted.</li>}
          </ul>
        </Shell>

        <Shell id="loops" state={caseFile.cardStatus.loops} depth={coverage.depth}>
          <ul>
            {caseFile.open_loops.map((item) => <FactLine key={item.v} item={item} titles={titles} />)}
            {caseFile.open_loops.length === 0 && <li className="text-sm">None extracted.</li>}
          </ul>
        </Shell>

        <Shell id="mind" state={caseFile.cardStatus.mind} depth={coverage.depth}>
          <ul>
            {[...caseFile.worries, ...caseFile.beliefs].map((item) => <FactLine key={`${item.v}-${item.ev[0]}`} item={item} titles={titles} />)}
            {caseFile.worries.length + caseFile.beliefs.length === 0 && <li className="text-sm">None extracted.</li>}
          </ul>
        </Shell>

        <Shell id="sensitive" state={caseFile.cardStatus.sensitive} depth={coverage.depth}>
          <p className="text-sm">
            You shared {caseFile.exposure.emails.length} email {caseFile.exposure.emails.length === 1 ? 'address' : 'addresses'}, {caseFile.exposure.phones.length} phone {caseFile.exposure.phones.length === 1 ? 'number' : 'numbers'}, and {caseFile.exposure.cardLike} card-like {caseFile.exposure.cardLike === 1 ? 'number' : 'numbers'}.
          </p>
          <ul className="mt-3 text-sm">
            {caseFile.exposure.emails.map((email) => <li key={email}>{email}</li>)}
            {caseFile.exposure.phones.map((phone) => <li key={phone}>{phone}</li>)}
          </ul>
          <p className="mt-3 text-xs text-[#1c140c]/60">Card-like numbers are counted, not printed. Emails and phones were masked before any model call.</p>
          <ul className="mt-3">
            {[...caseFile.health, ...caseFile.money].map((item) => <FactLine key={`${item.v}-${item.ev[0]}`} item={item} titles={titles} />)}
          </ul>
        </Shell>

        <Shell id="style" state={caseFile.cardStatus.style} depth={coverage.depth}>
          <ul className="text-sm">
            <li>{caseFile.style.wordsPerMessage} words per message you sent</li>
            <li>Question share {Math.round(caseFile.style.questionShare * 100)}%</li>
            <li>Vocabulary ratio {caseFile.style.vocabulary}</li>
            {caseFile.style.topPhrases.length > 0 && <li>Phrases: {caseFile.style.topPhrases.join(', ')}</li>}
          </ul>
        </Shell>

        <Shell id="usage" state={caseFile.cardStatus.usage} depth={coverage.depth}>
          <ul className="text-sm">
            <li>{coverage.conversations} conversations · {caseFile.style.userMessages} messages from you</li>
            <li>Peak hours (UTC): {caseFile.routines.peakHours.length ? caseFile.routines.peakHours.join(', ') : 'no timestamps'}</li>
            <li>Late-night share: {Math.round(caseFile.routines.lateNightShare * 100)}%</li>
            <li>Longest day streak: {caseFile.routines.longestStreak}</li>
          </ul>
        </Shell>

        <Shell id="notable" state={caseFile.cardStatus.notable} depth={coverage.depth}>
          <ul>
            {caseFile.notable.map((item) => (
              <li key={item.id} className="border-t border-[#1c140c]/10 py-3 first:border-t-0 text-sm">
                <p className="font-medium">{item.title}</p>
                <p className="text-[#1c140c]/70">Score {item.score}{item.reasons.length ? ` · ${item.reasons.join(', ')}` : ''}{item.modelRead ? '' : ' · not model-read'}</p>
              </li>
            ))}
            {caseFile.notable.length === 0 && <li className="text-sm">Nothing scored above the floor.</li>}
          </ul>
        </Shell>

        <Shell id="stranger" state={caseFile.cardStatus.stranger} depth={coverage.depth}>
          <p className="text-sm">{caseFile.narrative.blurbs.stranger || caseFile.narrative.cover}</p>
        </Shell>
      </div>
    </div>
  );
};

export default ReportView;
