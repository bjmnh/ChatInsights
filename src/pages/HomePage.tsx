import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { samplePremiumReportData } from '../lib/sampleReportData';
import { config } from '../lib/config';
import { formatPremiumPrice } from '../config/pricing';
import { ArrowUpRight } from 'lucide-react';

const posters = [
  { index: 0, kicker: 'Classified', title: 'FBI Report', line: 'Codename, interests, and how you operate.', wash: 'from-[#3a2a1c] to-[#120e0b]', ink: 'text-[#f6ead7]' },
  { index: 1, kicker: 'Language', title: 'Linguistic Fingerprint', line: 'The words that show up when you are thinking.', wash: 'from-[#243006] to-[#10140a]', ink: 'text-[#f3ffc4]' },
  { index: 3, kicker: 'Casting', title: 'Reality TV Persona', line: 'The character your chats would play.', wash: 'from-[#4a1230] to-[#1a0a12]', ink: 'text-[#ffe4ef]' },
  { index: 6, kicker: 'Profile', title: 'Digital Doppelganger', line: 'The account you would run if you meant it.', wash: 'from-[#10243f] to-[#0b1018]', ink: 'text-[#e7f1ff]' },
  { index: 5, kicker: 'Privacy', title: 'PII Safety Compass', line: 'What you gave away without noticing.', wash: 'from-[#063226] to-[#071410]', ink: 'text-[#dfffee]' },
  { index: 4, kicker: 'Mirror', title: 'Unfiltered Mirror', line: 'One sentence you might not say out loud.', wash: 'from-[#1c1c22] to-[#0c0c10]', ink: 'text-[#f4f4f5]' },
  { index: 2, kicker: 'Archive', title: 'Top 5 Conversations', line: 'The threads that were actually doing something.', wash: 'from-[#2c2416] to-[#12100c]', ink: 'text-[#fff6df]' },
];

const marquee = ['FBI Report', 'Reality TV Persona', 'Digital Doppelganger', 'Linguistic Fingerprint', 'PII Safety Compass', 'Unfiltered Mirror', 'Top 5 Conversations'];

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const openSample = (cardIndex?: number) => {
    navigate('/report/sample/premium', {
      state: {
        sampleReport: samplePremiumReportData,
        isSample: true,
        cardIndex,
      },
    });
  };

  const start = () => navigate(user ? '/dashboard' : '/auth');

  return (
    <div className="overflow-x-hidden">
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 lg:grid-cols-[1.15fr_0.85fr] lg:pt-16">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Personal AI memory
          </p>
          <h1 className="font-display text-5xl leading-[0.95] text-balance sm:text-7xl">
            Your chats already filed a report.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Upload a ChatGPT or Grok export. Chat Insights turns the archive into seven cards worth screenshotting: a dossier, a persona, a fingerprint, and the conversations that mattered.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button onClick={start} className="h-12 rounded-full px-6 text-base">
              {user ? 'Open the studio' : 'Read your file'}
            </Button>
            <Button variant="outline" onClick={() => openSample()} className="h-12 rounded-full px-6 text-base">
              See a sample dossier
            </Button>
          </div>
        </div>

        <motion.button
          type="button"
          onClick={() => openSample(0)}
          initial={{ opacity: 0, y: 24, rotate: 2 }}
          animate={{ opacity: 1, y: 0, rotate: -2 }}
          transition={{ duration: 0.6 }}
          className="relative mx-auto w-full max-w-md text-left"
        >
          <div className="absolute -left-4 top-8 hidden h-64 w-full rounded-[28px] bg-[#ff3d8a] sm:block" />
          <div className="relative rounded-[28px] bg-[#f3ead7] p-6 text-[#1c140c] shadow-2xl sm:p-8">
            <div className="flex items-start justify-between">
              <p className="text-xs uppercase tracking-[0.22em]">Behavioral dossier</p>
              <span className="rounded-full border border-[#1c140c] px-2 py-1 text-[10px] font-semibold uppercase">Confidential</span>
            </div>
            <p className="mt-8 font-display text-5xl leading-none">The Catalyst</p>
            <p className="mt-4 text-sm leading-relaxed text-[#1c140c]/80">
              Accelerates systems, guards the alpha, and talks like the future is already late.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3 text-center">
              {[
                ['7', 'cards'],
                ['5', 'threads'],
                ['Low', 'PII risk'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl bg-[#1c140c] px-2 py-3 text-[#f3ead7]">
                  <div className="font-display text-2xl">{value}</div>
                  <div className="text-[10px] uppercase tracking-wider text-[#f3ead7]/70">{label}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between text-xs uppercase tracking-[0.16em]">
              <span>Sample card</span>
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
        </motion.button>
      </section>

      <div className="overflow-hidden border-y border-white/10 py-3">
        <div className="flex w-max animate-marquee gap-8 pr-8">
          {[...marquee, ...marquee].map((item, index) => (
            <span key={`${item}-${index}`} className="font-display text-2xl text-foreground/80">
              {item} <span className="text-primary">/</span>
            </span>
          ))}
        </div>
      </div>

      <section id="cards" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="font-display text-4xl sm:text-6xl">Seven reads. One export.</h2>
          <button onClick={() => openSample()} className="hidden text-sm text-primary sm:inline">
            Flip through the sample
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory lg:grid lg:grid-cols-4 lg:overflow-visible">
          {posters.map((poster) => (
            <button
              key={poster.title}
              onClick={() => openSample(poster.index)}
              className={`snap-start min-h-[280px] w-[78%] shrink-0 rounded-[28px] bg-gradient-to-br p-5 text-left sm:w-[320px] lg:w-auto ${poster.wash} ${poster.ink} ${poster.index === 0 ? 'lg:col-span-2 lg:min-h-[340px]' : ''}`}
            >
              <p className="text-xs uppercase tracking-[0.18em] opacity-70">{poster.kicker}</p>
              <h3 className="mt-10 font-display text-4xl leading-none">{poster.title}</h3>
              <p className="mt-4 max-w-xs text-sm opacity-80">{poster.line}</p>
            </button>
          ))}
        </div>
      </section>

      <section id="how" className="border-y border-white/10">
        <div className="mx-auto grid max-w-6xl gap-px bg-white/10 md:grid-cols-3">
          {[
            ['01', 'Export', 'Download your ChatGPT data, or save a Grok history as JSON.'],
            ['02', 'Choose threads', 'Drop the file. Pick the conversations that are actually you.'],
            ['03', 'Get the cards', 'Basic counts are free. Premium unlocks the seven posters.'],
          ].map(([step, title, body]) => (
            <div key={step} className="bg-background px-6 py-10">
              <p className="font-display text-5xl text-primary">{step}</p>
              <h3 className="mt-4 font-display text-3xl">{title}</h3>
              <p className="mt-2 text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto grid max-w-6xl gap-6 px-4 py-20 lg:grid-cols-2">
        <div className="rounded-[28px] border border-white/10 p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Free</p>
          <h3 className="mt-3 font-display text-5xl">The counts</h3>
          <p className="mt-4 text-muted-foreground">Messages, vocabulary, the hour you usually show up, and the words you lean on.</p>
          <Button variant="outline" className="mt-8 rounded-full" onClick={start}>Start free</Button>
        </div>
        <div className="rounded-[28px] bg-primary p-8 text-primary-foreground">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.18em]">Premium · one time</p>
            {config.stripe.testMode && <span className="rounded-full bg-black/10 px-2 py-1 text-[10px] font-semibold">Stripe test mode</span>}
          </div>
          <p className="mt-3 font-display text-6xl leading-none">{formatPremiumPrice()}</p>
          <p className="mt-2 text-sm font-medium">One-time. No subscription and no renewal.</p>
          <h3 className="mt-6 font-display text-4xl">The posters</h3>
          <p className="mt-4">
            Pay once. Generate the FBI report, reality-TV persona, doppelganger, fingerprint, safety compass, mirror, and top conversations on every upload.
          </p>
          <Button className="mt-8 rounded-full bg-[#111] text-white hover:bg-black" onClick={start}>
            Unlock in the studio
          </Button>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
