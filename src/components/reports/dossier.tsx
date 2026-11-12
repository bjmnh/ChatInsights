import React, { createContext, useContext, useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

export interface DossierMeta {
  caseNo: string;
  subject: string;
}

const DossierContext = createContext<DossierMeta | null>(null);

export function DossierFrame({ meta, children }: { meta: DossierMeta; children: React.ReactNode }) {
  return (
    <DossierContext.Provider value={meta}>
      <ClassificationBar />
      {children}
    </DossierContext.Provider>
  );
}

function useTypewriter(text: string): string {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(reduce ? text.length : 0);
  useEffect(() => {
    if (reduce) {
      setCount(text.length);
      return undefined;
    }
    setCount(0);
    const timer = window.setInterval(() => {
      setCount((current) => {
        if (current >= text.length) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, 28);
    return () => window.clearInterval(timer);
  }, [reduce, text]);
  return text.slice(0, count);
}

export function ClassificationBar() {
  const meta = useContext(DossierContext);
  const line = useTypewriter('CONFIDENTIAL // EYES ONLY');
  if (!meta) return null;
  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex h-9 items-center justify-between gap-3 border-b border-red-300/50 bg-red-950 px-3 font-mono text-[11px] tracking-[0.16em] text-red-50 sm:px-4">
        <span className="min-w-0 truncate">{line}</span>
        <span className="shrink-0">CASE FILE No. {meta.caseNo}</span>
        <span className="hidden shrink-0 truncate sm:inline">SUBJECT: {meta.subject}</span>
      </div>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex h-7 items-center justify-center border-t border-red-300/40 bg-red-950 font-mono text-[10px] tracking-[0.22em] text-red-50">
        CONFIDENTIAL // EYES ONLY
      </div>
    </>
  );
}

export function DossierKicker({ label, subtitle }: { label: string; subtitle: string }) {
  return (
    <div className="mb-3 font-mono">
      <p className="text-[11px] uppercase tracking-[0.22em] text-red-200">{label}</p>
      <p className="text-xs tracking-wide text-white/70">{subtitle}</p>
    </div>
  );
}

export function Stamp({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none inline-block rotate-[-8deg] border-[3px] border-red-400/80 px-2 py-0.5 font-mono text-[11px] font-black tracking-[0.18em] text-red-300 ${className}`}
    >
      {text}
    </div>
  );
}

export function Redaction({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={open}
      aria-label={open ? undefined : 'Redacted. Reveal on this device only.'}
      onClick={() => setOpen((value) => !value)}
      className="rounded-sm border border-zinc-400 bg-zinc-950 px-2 py-0.5 font-mono text-xs text-transparent hover:text-zinc-100 focus-visible:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 aria-pressed:text-zinc-100"
      title="Declassify on this device only"
    >
      <span aria-hidden={!open} className={open ? '' : 'select-none'}>{text}</span>
    </button>
  );
}

export function Paperclip({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 48" className={`h-12 w-6 text-zinc-100 ${className}`} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 14c0-4 8-4 8 0v18c0 5-8 5-8 0V16c0-2 4-2 4 0v14" strokeLinecap="round" />
    </svg>
  );
}
