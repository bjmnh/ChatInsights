import React from 'react';
import { Link } from 'react-router-dom';
import DonateLink from '../components/insights/DonateLink';
import { Button } from '../components/ui/button';

const HomePage: React.FC = () => {
  return (
    <div data-testid="landing">
      <section className="mx-auto grid max-w-6xl items-end gap-12 px-4 pb-16 pt-12 lg:grid-cols-[1.2fr_0.8fr] lg:pt-20">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">A one-person hobby project</p>
          <h1 className="mt-4 font-display text-5xl leading-[0.95] text-balance sm:text-7xl">
            See what your chat history says about you.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Export your chats from ChatGPT, Claude, Gemini, or Grok. Pick a model you already pay for, and choose how deep to look. The read runs in your browser. We do not take your API key, and we do not run the model for you.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-12 rounded-full px-6 text-base">
              <Link to="/read">Read an export</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 rounded-full px-6 text-base">
              <Link to="/read?sample=1">Try the sample</Link>
            </Button>
          </div>
          <p className="mt-4 max-w-xl text-sm text-muted-foreground">
            On a cheap model, a standard pass over a typical history is often well under a dollar, billed by your provider. The sample is fake and stays on this page.
          </p>
        </div>
        <aside className="rounded-[28px] bg-[#f3ead7] p-6 text-[#1c140c] shadow-2xl sm:p-8">
          <p className="text-xs uppercase tracking-[0.18em]">Sample wording, not a real person</p>
          <p className="mt-6 font-display text-3xl leading-tight">You mention Dana in 41 conversations, and you call her your sister twice.</p>
          <p className="mt-4 text-sm leading-relaxed">
            Every claim in a real report points at the conversations it came from. If a depth did not search a card, the card says so.
          </p>
        </aside>
      </section>

      <section id="how" className="border-y border-white/10">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-3">
          {[
            ['1. Drop the export', 'Parsed in the browser. A local pass shows writing stats, identifier counts, and which chats look worth reading. Nothing is uploaded.'],
            ['2. Bring a key and a depth', 'Gemini, OpenAI, Anthropic, xAI, or an OpenAI-compatible host. Standard is the default. You see tokens, approximate cost, and time before anything is sent.'],
            ['3. Read the case file', 'Cards fill from a fixed schema. Download the JSON, or save it to an account if you want. The key is not saved with it.'],
          ].map(([title, body]) => (
            <div key={title}>
              <h2 className="font-display text-3xl">{title}</h2>
              <p className="mt-3 text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-4xl sm:text-5xl">How deep should it look?</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          The local pass always runs over every conversation. Depth is how much of that the model is allowed to see.
        </p>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b border-white/10">
                <th className="py-3 pr-4 font-medium">Depth</th>
                <th className="py-3 pr-4 font-medium">What the model sees</th>
                <th className="py-3 font-medium">What stays local</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Quick scan', 'About the top 10% of chats, user turns, a short summary.', 'Style, usage, and exposure counts. Several cards say they were not searched.'],
                ['Standard', 'Every chat the local pass flagged. User turns, full extract.', 'Unflagged chats are skipped, and the report says so.'],
                ['Deep', 'Every conversation’s user turns. Assistant replies shortened to a line.', 'Every card is in scope.'],
                ['Forensic', 'Full threads, then a second pass that checks quotes.', 'The most expensive option. Still your key, still your provider.'],
              ].map(([tier, sees, local]) => (
                <tr key={tier} className="border-b border-white/10 align-top">
                  <td className="py-4 pr-4 font-medium">{tier}</td>
                  <td className="py-4 pr-4 text-muted-foreground">{sees}</td>
                  <td className="py-4 text-muted-foreground">{local}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="privacy-plain" className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-4xl">Who sees the text</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <p className="text-muted-foreground">Your browser holds the export and the key. Calls go to the provider you picked. On that path, our server does not see the chats or the key.</p>
            <p className="text-muted-foreground">If a provider blocks the browser, a pass-through on our host streams that one batch to an allowlisted host and forgets it. The progress screen says when that happens. Local servers are never proxied.</p>
            <p className="text-muted-foreground">
              A saved account stores the case file, not the key and not the raw export. Deleting a saved case file is not self-serve yet. <Link to="/privacy" className="text-foreground underline">Privacy details</Link>.
            </p>
          </div>
          <DonateLink className="mt-8 inline-flex text-sm text-primary underline-offset-4 hover:underline" />
        </div>
      </section>
    </div>
  );
};

export default HomePage;
