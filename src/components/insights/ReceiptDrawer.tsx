import React, { useEffect, useRef } from 'react';
import type { NormalizedConversation } from '../../lib/conversationParser/types';
import { formatFiledDate } from '../../lib/insights/hydratePremium';
import { ATTACH_MISMATCH, locateQuote, RECEIPT_CHAT_MISSING, RECEIPT_MISSING } from '../../lib/insights/receipts';

function Marked({ text, start, end }: { text: string; start?: number; end?: number }) {
  if (start == null || end == null || end <= start) return <>{text}</>;
  return (
    <>
      {text.slice(0, start)}
      <mark className="bg-amber-300 text-black" data-testid="quote-hit">{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  );
}

const ReceiptDrawer: React.FC<{
  conversationId: string | null;
  quote: string | null;
  conversations: NormalizedConversation[];
  onClose: () => void;
  onAttach?: (file: File) => void;
  attachError?: string;
}> = ({ conversationId, quote, conversations, onClose, onAttach, attachError }) => {
  const hitRef = useRef<HTMLDivElement>(null);
  const conversation = conversations.find((item) => item.id === conversationId) ?? null;
  const hit = conversation ? locateQuote(conversation.messages, quote) : null;
  useEffect(() => {
    hitRef.current?.scrollIntoView({ block: 'center' });
  }, [conversationId, hit?.messageIndex]);
  if (!conversationId) return null;
  const missingExport = conversations.length === 0;
  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/50" role="presentation" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Source conversation"
        data-testid="receipt-drawer"
        className="h-full w-full max-w-md overflow-y-auto border-l border-amber-200/30 bg-[#16120c] p-5 text-amber-50 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300">Source</p>
            <h2 className="mt-1 font-display text-2xl">{conversation?.title || 'Source chat'}</h2>
            {conversation?.createdAt && (
              <p className="mt-1 font-mono text-xs text-amber-200/80">{formatFiledDate(conversation.createdAt)}</p>
            )}
          </div>
          <button type="button" className="rounded-full border border-white/20 px-3 py-1 text-sm" onClick={onClose}>Close</button>
        </div>
        {!conversation && (
          <div className="mt-6 space-y-3 text-sm" data-testid="receipt-missing">
            <p>{missingExport ? RECEIPT_MISSING : RECEIPT_CHAT_MISSING}</p>
            {onAttach && missingExport && (
              <label className="block">
                <span className="mb-1 block text-amber-200">Re-attach the export</span>
                <input
                  type="file"
                  accept=".json,.jsonl,.ndjson,.zip,.md,.markdown,.txt,.csv,.html,.htm"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onAttach(file);
                  }}
                />
              </label>
            )}
            {attachError && <p className="text-amber-200" data-testid="attach-error">{attachError || ATTACH_MISMATCH}</p>}
          </div>
        )}
        {conversation && (
          <div className="mt-6 space-y-4">
            {conversation.messages.map((message, index) => {
              const marked = hit?.messageIndex === index;
              return (
                <div key={`${message.role}-${index}`} ref={marked ? hitRef : undefined} className={marked ? 'rounded-md bg-amber-500/10 p-2' : ''}>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-amber-300">{message.role}{message.timestamp ? ` · ${formatFiledDate(message.timestamp)}` : ''}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                    <Marked text={message.text} start={marked ? hit?.start : undefined} end={marked ? hit?.end : undefined} />
                  </p>
                </div>
              );
            })}
            {quote && !hit && (
              <p className="text-sm text-amber-200">The supporting quote was not found word for word in this chat.</p>
            )}
          </div>
        )}
      </aside>
    </div>
  );
};

export default ReceiptDrawer;
