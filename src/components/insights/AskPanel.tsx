import React, { useEffect, useMemo, useState } from 'react';
import type { NormalizedConversation } from '../../lib/conversationParser/types';
import { askCaseFile, askEstimate, askUserPayload, compactFacts, NOT_IN_CASE_FILE, rememberQuestions, retrieveChats, type AskTurn } from '../../lib/insights/askCase';
import type { CompleteRequest, CompleteResult } from '../../lib/insights/adapters';
import { formatCost } from '../../lib/insights/estimate';
import type { CaseFile } from '../../lib/insights/merge';
import { sourceChips } from '../../lib/insights/hydratePremium';
import { EvidenceChips } from '../reports/reportPolish';

function historyKey(file: CaseFile): string {
  return `ci-ask:${file.runId || file.filedAt || 'case'}`;
}

function loadHistory(file: CaseFile): AskTurn[] {
  try {
    const raw = sessionStorage.getItem(historyKey(file));
    const parsed = raw ? JSON.parse(raw) as AskTurn[] : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.reduce((history, turn) => rememberQuestions(history, turn), [] as AskTurn[]);
  } catch {
    return [];
  }
}

const AskPanel: React.FC<{
  caseFile: CaseFile;
  conversations: NormalizedConversation[];
  titles: Map<string, string>;
  order: Map<string, number>;
  prices: { input: number; output: number };
  budget?: { maxTokens?: number; maxDollars?: number };
  complete?: (request: CompleteRequest) => Promise<CompleteResult>;
  onCaseFile: (file: CaseFile) => void;
  onOpen: (id: string, quote: string | null) => void;
}> = ({ caseFile, conversations, titles, order, prices, budget, complete, onCaseFile, onOpen }) => {
  const [question, setQuestion] = useState('');
  const [searchChats, setSearchChats] = useState(false);
  const [history, setHistory] = useState<AskTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setHistory(loadHistory(caseFile));
  }, [caseFile]);
  const preview = useMemo(() => {
    const facts = compactFacts(caseFile);
    const chats = searchChats ? retrieveChats(conversations, question || 'placeholder') : '';
    return askEstimate(askUserPayload(facts, question || 'What does this file say?', chats), prices);
  }, [caseFile, conversations, question, searchChats, prices]);
  const ask = async () => {
    if (!complete || !question.trim()) return;
    setBusy(true);
    setError('');
    try {
      const result = await askCaseFile({
        file: caseFile,
        question,
        conversations,
        searchChats,
        prices,
        budget,
        complete,
      });
      const nextHistory = rememberQuestions(history, result.turn);
      setHistory(nextHistory);
      sessionStorage.setItem(historyKey(caseFile), JSON.stringify(nextHistory));
      if (result.ledger) onCaseFile({ ...caseFile, ledger: result.ledger });
      if (result.blocked) setError(result.blocked);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The question could not be asked.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="mb-12 rounded-xl border border-white/15 bg-slate-900/50 p-5" data-testid="ask-panel">
      <h2 className="font-display text-3xl text-white">Ask the case file</h2>
      <p className="mt-2 text-sm text-gray-300">Answers use the facts in this file. A question that the file cannot support comes back as “{NOT_IN_CASE_FILE}”.</p>
      <label className="mt-4 block text-sm text-gray-200">
        Question
        <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={3} className="mt-1 w-full rounded-md border border-white/20 bg-black/30 p-2 text-white" />
      </label>
      <label className="mt-3 flex items-start gap-2 text-sm text-gray-300">
        <input type="checkbox" checked={searchChats} disabled={!conversations.length} onChange={(event) => setSearchChats(event.target.checked)} data-testid="search-chats" />
        <span>Also search the original chats on this device. This sends short excerpts of the closest chats, not the whole export.</span>
      </label>
      <p className="mt-3 font-mono text-xs text-gray-300" data-testid="ask-estimate">About {formatCost(preview.dollars)} and {preview.tokens.toLocaleString()} tokens for this question.</p>
      {!complete && <p className="mt-2 text-sm text-amber-100">Save a provider key on this device to ask. The key is not stored in the case file or in the question history.</p>}
      <button type="button" disabled={!complete || busy || !question.trim()} onClick={() => { ask().catch(() => undefined); }} className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
        {busy ? 'Asking…' : 'Ask'}
      </button>
      {error && <p className="mt-3 text-sm text-amber-100">{error}</p>}
      <ul className="mt-6 space-y-4">
        {history.map((turn) => (
          <li key={`${turn.question}-${turn.tokens}`} className="rounded-lg border border-white/10 p-3">
            <p className="text-sm text-gray-400">{turn.question}</p>
            <p className="mt-2 text-white" data-testid="ask-answer">{turn.answer}</p>
            <div className="text-sky-100">
              <EvidenceChips
                sources={sourceChips(turn.ev.map((chip) => chip.id), titles, order)}
                onOpen={(id) => onOpen(id, turn.ev.find((chip) => chip.id === id)?.quote ?? null)}
              />
            </div>
            <p className="mt-2 font-mono text-[11px] text-gray-400">{formatCost(turn.dollars)} · {turn.tokens.toLocaleString()} tokens</p>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default AskPanel;
