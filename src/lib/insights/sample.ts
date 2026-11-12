import type { NormalizedConversation } from '../conversationParser/types.ts';
import type { Adapter, CompleteResult } from './adapters.ts';

/** Clearly fake chats. Not a real person. */
export function buildSampleConversations(): NormalizedConversation[] {
  const at = (iso: string) => iso;
  const convo = (
    id: string,
    title: string,
    createdAt: string,
    messages: Array<{ role: 'user' | 'assistant'; text: string; timestamp: string }>,
  ): NormalizedConversation => ({
    id,
    title,
    createdAt,
    sourceFormat: 'normalized',
    messages,
  });
  return [
    convo('c_sister', 'Birthday trip', at('2024-02-11T18:04:00.000Z'), [
      { role: 'user', text: 'Help me plan a weekend. My sister Dana turns 30 in May and I want to take her to Flagstaff.', timestamp: '2024-02-11T18:04:00.000Z' },
      { role: 'assistant', text: 'Flagstaff in May is a good window. Book the train early.', timestamp: '2024-02-11T18:05:00.000Z' },
    ]),
    convo('c_work', 'Team lead notes', at('2025-03-02T15:12:00.000Z'), [
      { role: 'user', text: 'I live in the Phoenix area and I work as a backend engineer. I just moved into a team lead role at Northwind.', timestamp: '2025-03-02T15:12:00.000Z' },
      { role: 'assistant', text: 'Write down the one-on-ones before you change the schedule.', timestamp: '2025-03-02T15:13:00.000Z' },
    ]),
    convo('c_money', 'Rent or buy', at('2025-06-14T02:20:00.000Z'), [
      { role: 'user', text: 'We keep going in circles on rent or buy. I think we should keep renting for another year.', timestamp: '2025-06-14T02:20:00.000Z' },
      { role: 'assistant', text: 'A year of renting keeps the down payment intact.', timestamp: '2025-06-14T02:21:00.000Z' },
    ]),
    convo('c_health', 'Running', at('2025-09-01T13:00:00.000Z'), [
      { role: 'user', text: 'My knee hurts after running. I am not asking for a diagnosis, just a way to rest it.', timestamp: '2025-09-01T13:00:00.000Z' },
      { role: 'assistant', text: 'Ease off for a week and see a clinician if it stays swollen.', timestamp: '2025-09-01T13:01:00.000Z' },
    ]),
    convo('c_pii', 'Contact card', at('2025-01-09T16:40:00.000Z'), [
      { role: 'user', text: 'Put this on the form: sam.example@example.com and (602) 555-0148. The test card is 4242424242424242.', timestamp: '2025-01-09T16:40:00.000Z' },
      { role: 'assistant', text: 'I will not store that.', timestamp: '2025-01-09T16:41:00.000Z' },
    ]),
    convo('c_worry', 'Launch', at('2026-04-03T23:10:00.000Z'), [
      { role: 'user', text: 'I am worried about the launch deadline and I keep rewriting the checklist.', timestamp: '2026-04-03T23:10:00.000Z' },
      { role: 'assistant', text: 'Ship the checklist you have.', timestamp: '2026-04-03T23:11:00.000Z' },
    ]),
    convo('c_distress', 'A hard week', at('2026-08-19T04:12:00.000Z'), [
      { role: 'user', text: 'I have been feeling hopeless this week and I needed to say it somewhere.', timestamp: '2026-08-19T04:12:00.000Z' },
      { role: 'assistant', text: 'Thank you for saying it. If you want a person, 988 can listen.', timestamp: '2026-08-19T04:13:00.000Z' },
    ]),
    convo('c_trivial', 'Arithmetic', at('2024-07-07T12:00:00.000Z'), [
      { role: 'user', text: 'What is 2 + 2?', timestamp: '2024-07-07T12:00:00.000Z' },
      { role: 'assistant', text: '4', timestamp: '2024-07-07T12:00:01.000Z' },
    ]),
  ];
}

function quoteFrom(body: string, pattern: RegExp): string | null {
  const match = body.match(pattern);
  return match ? match[0] : null;
}

export function createDemoAdapter(options?: { latencyMs?: number; sleep?: (ms: number) => Promise<void> }): Adapter {
  const sleep = options?.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  return {
    id: 'demo',
    async testConnection() {
      return {
        ok: true,
        models: [{ id: 'demo-extractor' }],
        message: 'Demo extractor is in this browser. No key is sent.',
      };
    },
    async complete(request): Promise<CompleteResult> {
      if (options?.latencyMs) await sleep(options.latencyMs);
      if (request.schemaName === 'narrative') {
        return {
          text: JSON.stringify({
            cover: 'You mention Dana as your sister, you live in the Phoenix area, and you decided to keep renting.',
            blurbs: {
              people: 'Dana comes up as your sister, with a May birthday and a Flagstaff trip.',
              file: 'The flagged chats cover family, work, rent, and a running injury.',
            },
            ev: ['c_sister', 'c_work', 'c_money'],
          }),
          viaProxy: false,
          usage: { input: 200, output: 80 },
        };
      }
      if (request.schemaName === 'verify') {
        return { text: JSON.stringify({ drop: [], notes: [] }), viaProxy: false, usage: { input: 80, output: 20 } };
      }
      const facts: Array<Record<string, string | null>> = [];
      const convs: Array<{ c: string; topic: string }> = [];
      const blocks = request.user.matchAll(/<conversation id="([^"]+)"[^>]*>([\s\S]*?)<\/conversation>/g);
      for (const [, id, body] of blocks) {
        const user = [...body.matchAll(/^USER: (.+)$/gm)].map((match) => match[1]).join('\n');
        let topic = 'chat';
        const sister = quoteFrom(user, /my sister Dana/);
        if (sister) {
          topic = 'family trip';
          facts.push({ c: id, k: 'person', v: 'Dana', d: 'sister; birthday in May', t: '2024-02', q: 'My sister Dana turns 30 in May' });
          facts.push({ c: id, k: 'place', v: 'Flagstaff', d: 'trip destination', t: '2024-05', q: 'take her to Flagstaff' });
        }
        if (user.includes('Phoenix area')) {
          topic = 'work';
          facts.push({ c: id, k: 'self', v: 'Phoenix area', d: 'location', t: '2025-03', q: 'I live in the Phoenix area' });
          facts.push({ c: id, k: 'self', v: 'backend engineer, moved into team lead', d: 'occupation', t: '2025-03', q: 'I work as a backend engineer' });
          facts.push({ c: id, k: 'org', v: 'Northwind', d: 'employer', t: '2025-03', q: 'team lead role at Northwind' });
        }
        if (user.includes('keep renting')) {
          topic = 'rent or buy';
          facts.push({ c: id, k: 'decision', v: 'keep renting', d: 'Rent or buy?', t: '2025-06', q: 'we should keep renting for another year' });
          facts.push({ c: id, k: 'money', v: 'renting for another year', d: 'housing', t: '2025-06', q: 'we should keep renting for another year' });
        }
        if (user.includes('knee hurts')) {
          topic = 'running';
          facts.push({ c: id, k: 'health', v: 'knee hurts after running', d: 'self; asked for rest, not a diagnosis', t: '2025-09', q: 'My knee hurts after running' });
        }
        if (user.includes('launch deadline')) {
          topic = 'launch worry';
          facts.push({ c: id, k: 'worry', v: 'launch deadline', d: 'keeps rewriting the checklist', t: '2026-04', q: 'worried about the launch deadline' });
        }
        convs.push({ c: id, topic });
      }
      return {
        text: JSON.stringify({ convs, facts }),
        viaProxy: false,
        usage: { input: 400, output: 120 },
      };
    },
  };
}
