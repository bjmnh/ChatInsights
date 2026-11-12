import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Calendar,
  Eye,
  FileText,
  Globe,
  MapPin,
  Shield,
  Tv,
  Users,
} from 'lucide-react';
import type { NormalizedConversation } from '../../lib/conversationParser/types';
import { cardStateLabel } from '../../lib/insights/depth';
import type { CardId } from '../../lib/insights/depth';
import { cardPreviews, filedStamp, hydratePremiumReport, reportSubtitle, type PremiumReportShape } from '../../lib/insights/hydratePremium';
import { reportLabel, type CaseFile, type Cited } from '../../lib/insights/merge';
import { DossierFrame, DossierKicker, Paperclip, Stamp } from '../reports/dossier';
import { caseFileNumber } from '../../lib/insights/caseNumber';
import { ReportCardDeck } from '../reports/ReportCardDeck';
import { ConfidenceMeter, EvidenceChips } from '../reports/reportPolish';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

type OriginalId = 'fbi' | 'linguistic' | 'top5' | 'reality' | 'mirror' | 'pii' | 'doppelganger';

const ORIGINAL: Array<{
  id: OriginalId;
  card: CardId;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  iconBg: string;
  textColor: string;
  borderColor: string;
  hoverBorder: string;
  badgeClass: string;
  dossier: string;
  key: keyof PremiumReportShape;
}> = [
  { id: 'fbi', card: 'file', title: 'Digital Behavioral Analysis', dossier: 'Behavioral Profile', icon: Brain, gradient: 'from-amber-500 via-orange-500 to-red-500', iconBg: 'bg-gradient-to-br from-amber-400 to-orange-600', textColor: 'text-amber-100', borderColor: 'border-amber-500/30', hoverBorder: 'hover:border-amber-400', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30', key: 'fbiReport' },
  { id: 'linguistic', card: 'style', title: 'Linguistic Fingerprint', dossier: 'Language Trace', icon: FileText, gradient: 'from-blue-500 via-cyan-500 to-teal-500', iconBg: 'bg-gradient-to-br from-blue-400 to-cyan-600', textColor: 'text-blue-100', borderColor: 'border-blue-500/30', hoverBorder: 'hover:border-blue-400', badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30', key: 'linguisticFingerprint' },
  { id: 'top5', card: 'notable', title: 'Most Fascinating Conversations', dossier: 'Priority Threads', icon: Users, gradient: 'from-purple-500 via-violet-500 to-indigo-500', iconBg: 'bg-gradient-to-br from-purple-400 to-indigo-600', textColor: 'text-purple-100', borderColor: 'border-purple-500/30', hoverBorder: 'hover:border-purple-400', badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30', key: 'topInterestingConversations' },
  { id: 'reality', card: 'stranger', title: 'Reality TV Persona', dossier: 'Subject Archetype', icon: Tv, gradient: 'from-pink-500 via-rose-500 to-red-500', iconBg: 'bg-gradient-to-br from-pink-400 to-rose-600', textColor: 'text-pink-100', borderColor: 'border-pink-500/30', hoverBorder: 'hover:border-pink-400', badgeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/30', key: 'realityTVPersona' },
  { id: 'mirror', card: 'stranger', title: 'The Unfiltered Mirror', dossier: 'Psychological Assessment', icon: Eye, gradient: 'from-slate-100 via-zinc-100 to-slate-200', iconBg: 'bg-gradient-to-br from-gray-600 to-slate-800', textColor: 'text-gray-100', borderColor: 'border-gray-500/30', hoverBorder: 'hover:border-gray-400', badgeClass: 'bg-slate-500/20 text-slate-200 border-slate-400/40', key: 'unfilteredMirror' },
  { id: 'pii', card: 'sensitive', title: 'PII Safety Compass', dossier: 'Sensitive Holdings', icon: Shield, gradient: 'from-green-500 via-emerald-500 to-teal-500', iconBg: 'bg-gradient-to-br from-green-400 to-emerald-600', textColor: 'text-green-100', borderColor: 'border-green-500/30', hoverBorder: 'hover:border-green-400', badgeClass: 'bg-green-500/20 text-green-300 border-green-500/30', key: 'piiSafetyCompass' },
  { id: 'doppelganger', card: 'usage', title: 'Digital Doppelgänger', dossier: 'Cover Identity', icon: Globe, gradient: 'from-indigo-500 via-blue-500 to-cyan-500', iconBg: 'bg-gradient-to-br from-indigo-400 to-blue-600', textColor: 'text-indigo-100', borderColor: 'border-indigo-500/30', hoverBorder: 'hover:border-indigo-400', badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', key: 'digitalDoppelganger' },
];

const EXTRA: Array<{
  id: CardId;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  iconBg: string;
  textColor: string;
  borderColor: string;
  hoverBorder: string;
  badgeClass: string;
  dossier: string;
}> = [
  { id: 'people', title: 'People in your chats', dossier: 'Known Associates', icon: Users, gradient: 'from-amber-500 via-yellow-500 to-orange-500', iconBg: 'bg-gradient-to-br from-amber-400 to-yellow-600', textColor: 'text-amber-100', borderColor: 'border-amber-500/30', hoverBorder: 'hover:border-amber-400', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { id: 'places', title: 'Places and organizations', dossier: 'Known Locations', icon: MapPin, gradient: 'from-teal-500 via-emerald-500 to-green-500', iconBg: 'bg-gradient-to-br from-teal-400 to-emerald-600', textColor: 'text-teal-100', borderColor: 'border-teal-500/30', hoverBorder: 'hover:border-teal-400', badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
  { id: 'timeline', title: 'Your timeline', dossier: 'Chronology', icon: Calendar, gradient: 'from-orange-500 via-amber-500 to-yellow-500', iconBg: 'bg-gradient-to-br from-orange-400 to-amber-600', textColor: 'text-orange-100', borderColor: 'border-orange-500/30', hoverBorder: 'hover:border-orange-400', badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  { id: 'decisions', title: 'Decisions and changes of mind', dossier: 'Decisions on File', icon: Brain, gradient: 'from-rose-500 via-pink-500 to-fuchsia-500', iconBg: 'bg-gradient-to-br from-rose-400 to-pink-600', textColor: 'text-rose-100', borderColor: 'border-rose-500/30', hoverBorder: 'hover:border-rose-400', badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  { id: 'loops', title: 'Questions you haven’t settled', dossier: 'Open Inquiries', icon: FileText, gradient: 'from-violet-500 via-purple-500 to-indigo-500', iconBg: 'bg-gradient-to-br from-violet-400 to-purple-600', textColor: 'text-violet-100', borderColor: 'border-violet-500/30', hoverBorder: 'hover:border-violet-400', badgeClass: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  { id: 'mind', title: 'What’s been on your mind', dossier: 'Psychological Notes', icon: Eye, gradient: 'from-slate-500 via-slate-600 to-slate-700', iconBg: 'bg-gradient-to-br from-slate-400 to-slate-700', textColor: 'text-slate-100', borderColor: 'border-slate-500/30', hoverBorder: 'hover:border-slate-400', badgeClass: 'bg-slate-500/20 text-slate-200 border-slate-400/40' },
];

function FactBlock({ item, titles }: { item: Cited; titles: Map<string, string> }) {
  const from = item.ev.map((id) => titles.get(id) || id).filter(Boolean);
  return (
    <div className="rounded-2xl border border-amber-700/40 bg-[#1a140c]/80 p-5 shadow-lg" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 22px, rgba(255,220,160,0.04) 23px)' }}>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-200">Finding</p>
      <p className="mt-1 text-lg text-amber-50">{item.v}</p>
      {item.quote && (
        <blockquote className="mt-3 border-l-4 border-amber-500 pl-4 font-mono text-sm leading-relaxed text-amber-100">
          <span className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-amber-300">Evidence</span>
          “{item.quote}”
        </blockquote>
      )}
      <ConfidenceMeter value={item.conf} />
      {from.length > 0 && (
        <div className="text-amber-200">
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em]">Source</p>
          <EvidenceChips labels={from.map((label, index) => `conversation #${index + 1} ${label}`)} />
        </div>
      )}
    </div>
  );
}

function ExtraScreen({
  dossier,
  title,
  note,
  onBack,
  children,
}: {
  dossier: string;
  title: string;
  note?: string | null;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#120e0a] px-4 pb-16 pt-14 sm:px-8">
      <Button variant="ghost" onClick={onBack} className="border border-amber-200/30 bg-black/50 font-mono text-amber-100 hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-amber-200">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Overview
      </Button>
      <div className="relative mx-auto mt-8 max-w-4xl rounded-sm border border-amber-200/20 bg-[#24180f] p-6 shadow-2xl" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,220,170,0.08) 1px, transparent 0)', backgroundSize: '16px 16px' }}>
        <Paperclip className="absolute -top-6 left-8 drop-shadow-md" />
        <Stamp text="REVIEWED" className="absolute right-6 top-6" />
        <DossierKicker label={dossier} subtitle={title} />
        <h1 className="font-display text-4xl text-amber-50 sm:text-5xl">{dossier}</h1>
        {note && <p className="mt-3 font-mono text-sm uppercase tracking-[0.14em] text-amber-200">{note}</p>}
        <div className="mt-8 space-y-4">{children}</div>
      </div>
    </div>
  );
}

const ReportView: React.FC<{
  caseFile: CaseFile;
  conversations: NormalizedConversation[];
  onDownload: () => void;
  onSave?: () => void;
  saveMessage?: string;
}> = ({ caseFile, conversations, onDownload, onSave, saveMessage }) => {
  const titles = useMemo(() => new Map(conversations.map((conversation) => [conversation.id, conversation.title])), [conversations]);
  const hydrated = useMemo(() => hydratePremiumReport(caseFile, titles), [caseFile, titles]);
  const previews = useMemo(() => cardPreviews(caseFile, hydrated), [caseFile, hydrated]);
  const [deckIndex, setDeckIndex] = useState<number | null>(null);
  const [extra, setExtra] = useState<CardId | null>(null);
  const [blockedTitle, setBlockedTitle] = useState<string | null>(null);
  const label = reportLabel(caseFile);
  const codename = caseFile.narrative.codename;
  const caseNo = caseFileNumber(`${codename}|${caseFile.model.id}|${caseFile.coverage.read}`);
  const frame = (node: React.ReactNode) => (
    <DossierFrame meta={{ caseNo, subject: codename }}>{node}</DossierFrame>
  );

  const originalAvailable = ORIGINAL.filter((item) => Boolean(hydrated[item.key]));

  if (deckIndex != null) {
    return frame(
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950 pb-8 pt-9">
        <ReportCardDeck
          reportData={hydrated}
          onBack={() => setDeckIndex(null)}
          initialCardIndex={deckIndex}
        />
      </div>,
    );
  }

  if (blockedTitle) {
    return frame(
      <ExtraScreen dossier="NO RECORDS" title={blockedTitle} note="NO RECORDS FOUND AT THIS DEPTH" onBack={() => setBlockedTitle(null)}>
        <p className="font-mono text-sm uppercase tracking-[0.14em] text-amber-100">This depth did not open this file.</p>
      </ExtraScreen>,
    );
  }

  if (extra) {
    const state = caseFile.cardStatus[extra];
    const note = cardStateLabel(state, caseFile.model.depth);
    const entry = EXTRA.find((item) => item.id === extra);
    const title = entry?.title || extra;
    const dossier = entry?.dossier || title;
    if (state === 'not-searched') {
      return frame(
        <ExtraScreen dossier={dossier} title={title} note="NO RECORDS FOUND AT THIS DEPTH" onBack={() => setExtra(null)}>
          <p className="font-mono text-sm uppercase tracking-[0.14em] text-amber-100">A deeper pass would open this file.</p>
        </ExtraScreen>,
      );
    }
    const blocks = extraFacts(caseFile, extra);
    return frame(
      <ExtraScreen dossier={dossier} title={title} note={note} onBack={() => setExtra(null)}>
        {blocks.length === 0 && (
          <div className="rounded-sm border border-dashed border-amber-200/40 bg-black/30 p-6 font-mono text-sm uppercase tracking-[0.16em] text-amber-100">
            NO RECORDS FOUND AT THIS DEPTH
          </div>
        )}
        {blocks.map((item) => <FactBlock key={`${item.v}-${item.ev[0] || item.quote}`} item={item} titles={titles} />)}
      </ExtraScreen>,
    );
  }

  return frame(
    <div data-testid="report" className="fixed inset-0 z-[60] overflow-y-auto bg-[#0c1018] pb-16 pt-14">
      <div className="container relative mx-auto px-4 py-8">
        <Stamp text={label === 'Partial' ? 'PARTIAL' : 'CLASSIFIED'} className="absolute right-6 top-2 hidden sm:block" />
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={onDownload} className="bg-blue-600 hover:bg-blue-700 text-white">Download JSON</Button>
            {onSave && (
              <Button variant="outline" onClick={onSave} className="border-white/20 text-white hover:bg-white/10">Save to account</Button>
            )}
          </div>
          <Badge variant="outline" className={label === 'Partial' ? 'border-amber-500/40 bg-amber-500/20 text-amber-200' : 'border-emerald-500/40 bg-emerald-500/20 text-emerald-200'} data-testid={label === 'Partial' ? 'partial-banner' : 'complete-banner'}>
            {label} report
          </Badge>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-red-200">Case file No. {caseNo}</p>
          <h1 className="mt-2 font-display text-5xl text-white md:text-7xl">Subject: {codename}</h1>
          <p className="mt-2 font-mono text-sm uppercase tracking-[0.16em] text-amber-100/90">Your cards</p>
          <p className="mx-auto mt-3 max-w-2xl text-xl text-gray-300">
            {reportSubtitle(caseFile)}
          </p>
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-red-100">{filedStamp(caseFile)}</p>
          <div className="mx-auto mt-6 h-1 w-32 rounded-full bg-gradient-to-r from-blue-400 to-purple-600" />
        </motion.div>

        {label === 'Partial' && (
          <div className="mb-8 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-100" data-testid="partial-banner">
            Partial report{caseFile.coverage.partialReason ? ` (${caseFile.coverage.partialReason})` : ''}. Unread conversations: {Math.max(0, caseFile.coverage.planned - caseFile.coverage.read)}. This is not saved as a complete success.
          </div>
        )}
        {caseFile.coverage.viaProxy && (
          <p className="mb-6 text-sm text-gray-300">At least one batch passed through Chat Insights’ server because the browser could not call the provider. It was not stored.</p>
        )}
        {caseFile.supportNote && (
          <p className="mb-8 rounded-xl border border-slate-600 bg-slate-800/60 px-4 py-3 text-sm text-slate-200" data-testid="support-note">{caseFile.supportNote}</p>
        )}
        {saveMessage && <p className="mb-6 text-sm text-gray-400">{saveMessage}</p>}

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {ORIGINAL.map((insight, index) => {
            const state = caseFile.cardStatus[insight.card];
            const quiet = state === 'not-searched' || !hydrated[insight.key];
            return (
              <Tile
                key={insight.id}
                index={index}
                title={insight.dossier}
                subtitle={insight.title}
                description={previews[insight.id]}
                icon={insight.icon}
                iconBg={insight.iconBg}
                textColor={insight.textColor}
                borderColor={insight.borderColor}
                hoverBorder={insight.hoverBorder}
                gradient={insight.gradient}
                badgeClass={insight.badgeClass}
                quiet={quiet}
                badge={quiet ? 'NO RECORDS FOUND AT THIS DEPTH' : state === 'partial' ? 'PARTIAL' : state === 'local' ? 'LOCAL PASS' : insight.id === 'fbi' ? `SUBJECT: ${codename}` : undefined}
                onClick={() => {
                  if (quiet) {
                    setBlockedTitle(insight.title);
                    return;
                  }
                  const deckAt = originalAvailable.findIndex((item) => item.id === insight.id);
                  if (deckAt >= 0) setDeckIndex(deckAt);
                }}
              />
            );
          })}
          {EXTRA.map((insight, index) => {
            const state = caseFile.cardStatus[insight.id];
            const quiet = state === 'not-searched';
            return (
              <Tile
                key={insight.id}
                index={ORIGINAL.length + index}
                title={insight.dossier}
                subtitle={insight.title}
                description={previews[insight.id]}
                icon={insight.icon}
                iconBg={insight.iconBg}
                textColor={insight.textColor}
                borderColor={insight.borderColor}
                hoverBorder={insight.hoverBorder}
                gradient={insight.gradient}
                badgeClass={insight.badgeClass}
                quiet={quiet}
                badge={quiet ? 'NO RECORDS FOUND AT THIS DEPTH' : state === 'partial' ? 'PARTIAL' : state === 'local' ? 'LOCAL PASS' : undefined}
                onClick={() => setExtra(insight.id)}
              />
            );
          })}
        </div>

        <p className="mt-12 text-center text-sm text-gray-400">
          Click a card to open it. The seven original cards use the same layouts as before. Cards this depth did not search stay on the grid and say so.
        </p>
      </div>
    </div>,
  );
};

function extraFacts(file: CaseFile, id: CardId): Cited[] {
  if (id === 'people') {
    return file.people.map((person) => ({
      v: person.relationship ? `${person.name} · ${person.relationship}` : person.name,
      conf: person.conf,
      ev: person.ev,
      src: person.src,
      first: person.first,
      last: person.last,
      quote: person.quote,
    }));
  }
  if (id === 'places') return [...file.places, ...file.orgs];
  if (id === 'timeline') return [...file.timeline, ...file.projects];
  if (id === 'decisions') {
    return file.decisions.map((item) => ({
      ...item,
      v: `${item.question}: ${item.v}${item.reversed ? ` (earlier: ${item.reversed.v})` : ''}`,
    }));
  }
  if (id === 'loops') return file.open_loops;
  if (id === 'mind') return [...file.worries, ...file.beliefs];
  return [];
}

function Tile({
  index, title, subtitle, description, icon: Icon, iconBg, textColor, borderColor, hoverBorder, gradient, badgeClass, quiet, badge, onClick,
}: {
  index: number;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  textColor: string;
  borderColor: string;
  hoverBorder: string;
  gradient: string;
  badgeClass: string;
  quiet: boolean;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.05, duration: 0.6 }}
      whileHover={quiet ? undefined : { scale: 1.02, y: -8 }}
      role="button"
      tabIndex={0}
      aria-label={subtitle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className={`group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${quiet ? 'cursor-default' : 'cursor-pointer'}`}
      onClick={onClick}
    >
      <Card className={`relative h-full border bg-gradient-to-br from-slate-800/60 to-slate-900/70 ${borderColor} ${quiet ? 'border-dashed opacity-80' : hoverBorder} shadow-lg backdrop-blur-sm transition duration-300 hover:shadow-2xl hover:shadow-black/40`}>
        <div className="absolute -top-px left-5 rounded-b-sm bg-[#c4a574] px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.16em] text-[#3a2a14]">
          FILE
        </div>
        <CardHeader className="pb-4">
          <div className={`mb-6 flex h-20 w-20 items-center justify-center rounded-2xl shadow-lg ${iconBg} ${quiet ? '' : 'transition-transform duration-300 group-hover:scale-110'}`}>
            <Icon className={`h-10 w-10 ${textColor}`} />
          </div>
          <CardTitle className="mb-1 font-mono text-lg uppercase tracking-[0.12em] text-white">{title}</CardTitle>
          <p className="mb-4 text-sm text-gray-400">{subtitle}</p>
          {badge && (
            <Badge variant="outline" className={`mb-4 w-fit ${badgeClass}`}>{badge}</Badge>
          )}
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-base leading-relaxed text-gray-300">{description}</p>
          {!quiet && (
            <div className="flex items-center justify-between">
              <div className={`bg-gradient-to-r ${gradient} bg-clip-text text-sm font-medium text-transparent transition-transform duration-300 group-hover:scale-105`}>
                Explore Insight
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white" />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default ReportView;
