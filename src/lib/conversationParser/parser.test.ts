import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { ConversationParseError, parseConversationExport } from './index.ts';

function textBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function bytesOf(values: number[]): Uint8Array {
  return Uint8Array.from(values);
}

function u16(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff];
}

function u32(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff];
}

function makeZip(files: { name: string; data: Uint8Array; method?: number; compressed?: Uint8Array }[]): Uint8Array {
  const locals: number[] = [];
  const centrals: number[] = [];
  let offset = 0;
  files.forEach((file) => {
    const method = file.method ?? 0;
    const compressed = file.compressed ?? file.data;
    const nameBytes = [...textBytes(file.name)];
    const local = [
      ...u32(0x04034b50),
      ...u16(20),
      ...u16(0),
      ...u16(method),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(compressed.length),
      ...u32(file.data.length),
      ...u16(nameBytes.length),
      ...u16(0),
      ...nameBytes,
    ];
    locals.push(...local, ...compressed);
    centrals.push(
      ...u32(0x02014b50),
      ...u16(20),
      ...u16(20),
      ...u16(0),
      ...u16(method),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(compressed.length),
      ...u32(file.data.length),
      ...u16(nameBytes.length),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(offset),
      ...nameBytes,
    );
    offset += local.length + compressed.length;
  });
  const directory = centrals;
  const eocd = [
    ...u32(0x06054b50),
    ...u16(0),
    ...u16(0),
    ...u16(files.length),
    ...u16(files.length),
    ...u32(directory.length),
    ...u32(offset),
    ...u16(0),
  ];
  return bytesOf([...locals, ...directory, ...eocd]);
}

describe('conversation export parser', () => {
  it('normalizes a ChatGPT mapping export and keeps timestamps', async () => {
    const raw = [{
      id: 'cg-1',
      title: 'Morning notes',
      create_time: 1700000000,
      mapping: {
        later: {
          message: {
            author: { role: 'assistant' },
            create_time: 1700000002,
            content: { content_type: 'text', parts: ['Here is a short plan.', { asset_pointer: 'file' }] },
          },
        },
        earlier: {
          message: {
            author: { role: 'user' },
            create_time: 1700000001,
            content: { content_type: 'text', parts: ['Help me plan the day'] },
          },
        },
        system: {
          message: {
            author: { role: 'system' },
            create_time: 1700000000,
            content: { content_type: 'text', parts: ['You are a helpful assistant.'] },
          },
        },
      },
    }];

    const parsed = await parseConversationExport('conversations.json', JSON.stringify(raw));
    expect(parsed.format).toBe('chatgpt');
    expect(parsed.conversations).toHaveLength(1);
    expect(parsed.conversations[0].title).toBe('Morning notes');
    expect(parsed.conversations[0].messages.map((message) => message.role)).toEqual(['system', 'user', 'assistant']);
    expect(parsed.conversations[0].messages[1]).toMatchObject({
      role: 'user',
      text: 'Help me plan the day',
      timestamp: '2023-11-14T22:13:21.000Z',
    });
  });

  it('normalizes a Claude chat_messages export', async () => {
    const raw = [{
      uuid: 'cl-1',
      name: 'Recipe help',
      created_at: '2024-05-01T12:00:00.000Z',
      chat_messages: [
        {
          sender: 'human',
          text: 'How do I roast a chicken?',
          created_at: '2024-05-01T12:00:00.000Z',
        },
        {
          sender: 'assistant',
          content: [{ type: 'text', text: 'Heat the oven to 425F.' }],
          created_at: '2024-05-01T12:00:05.000Z',
        },
      ],
    }];

    const parsed = await parseConversationExport('conversations.json', JSON.stringify(raw));
    expect(parsed.format).toBe('claude');
    expect(parsed.conversations[0].id).toBe('cl-1');
    expect(parsed.conversations[0].messages).toEqual([
      { role: 'user', text: 'How do I roast a chicken?', timestamp: '2024-05-01T12:00:00.000Z' },
      { role: 'assistant', text: 'Heat the oven to 425F.', timestamp: '2024-05-01T12:00:05.000Z' },
    ]);
  });

  it('reads Gemini My Activity JSON, including a response when one is present', async () => {
    const promptsOnly = [{
      header: 'Gemini Apps',
      title: 'Prompted how do I center a div',
      time: '2024-06-02T15:04:00.000Z',
      products: ['Gemini Apps'],
    }];
    const withReply = [{
      header: 'Gemini Apps',
      title: 'Prompted what is 2 + 2',
      time: '2024-06-02T15:05:00.000Z',
      products: ['Gemini Apps'],
      details: [{ name: 'Response', value: '4' }],
    }];

    const prompts = await parseConversationExport('My Activity.json', JSON.stringify(promptsOnly));
    expect(prompts.format).toBe('gemini');
    expect(prompts.conversations[0].messages).toEqual([
      { role: 'user', text: 'how do I center a div', timestamp: '2024-06-02T15:04:00.000Z' },
    ]);
    expect(prompts.warnings[0]).toMatch(/prompts only/i);

    const replied = await parseConversationExport('My Activity.json', JSON.stringify(withReply));
    expect(replied.warnings).toEqual([]);
    expect(replied.conversations[0].messages.map((message) => message.text)).toEqual(['what is 2 + 2', '4']);
  });

  it('reads Gemini Takeout HTML', async () => {
    const html = `<html><body>
      <div class="outer-cell">
        <div class="content-cell mdl-typography--body-1">
          Prompted explain photosynthesis<br>
          Jun 2, 2024, 3:04:00 PM UTC<br>
          Gemini: Plants store energy from light.
        </div>
      </div>
    </body></html>`;
    const parsed = await parseConversationExport('My Activity.html', html);
    expect(parsed.format).toBe('gemini');
    expect(parsed.conversations[0].messages[0].role).toBe('user');
    expect(parsed.conversations[0].messages[0].text).toMatch(/photosynthesis/);
    expect(parsed.conversations[0].messages[1].text).toMatch(/store energy/);
  });

  it('reads Grok conversation_items and turn pairs', async () => {
    const items = {
      grok_conversations: [{
        conversation_id: 'g1',
        title: 'Stars',
        created_at: '2024-08-01T00:00:00.000Z',
        conversation_items: [
          { sender_type: 'USER', message: 'What is a neutron star?', created_at: '2024-08-01T00:00:00.000Z' },
          { sender_type: 'AGENT', message: 'A collapsed stellar core.', created_at: '2024-08-01T00:00:01.000Z' },
        ],
      }],
    };
    const turns = {
      id: 'g2',
      title: 'Orbit',
      turns: [{ user: 'Why is the sky blue?', grok: 'Rayleigh scattering.', timestamp: '2024-08-02T00:00:00.000Z' }],
    };

    const fromItems = await parseConversationExport('grok.json', JSON.stringify(items));
    expect(fromItems.format).toBe('grok');
    expect(fromItems.conversations[0].messages.map((message) => [message.role, message.text])).toEqual([
      ['user', 'What is a neutron star?'],
      ['assistant', 'A collapsed stellar core.'],
    ]);

    const fromTurns = await parseConversationExport('export.json', JSON.stringify(turns));
    expect(fromTurns.format).toBe('grok');
    expect(fromTurns.conversations[0].messages[1]).toMatchObject({ role: 'assistant', text: 'Rayleigh scattering.' });
  });

  it('reads generic JSON message lists and conversation lists', async () => {
    const flat = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: [{ type: 'text', text: 'Hi there' }] },
    ];
    const wrapped = { title: 'Wrapped', messages: [{ role: 'user', content: 'One conversation' }] };
    const many = [
      { id: 'a', title: 'First', messages: [{ role: 'human', content: 'A' }, { role: 'ai', content: 'B' }] },
      { id: 'b', title: 'Second', messages: [{ role: 'user', text: 'C' }] },
    ];
    const copilotLike = [{
      title: 'Hooks',
      messages: [
        { author: 'user', text: 'Explain hooks' },
        { author: 'bot', text: 'Hooks let you use state.' },
      ],
    }];

    expect((await parseConversationExport('chat.json', JSON.stringify(flat))).conversations[0].messages[1].text).toBe('Hi there');
    expect((await parseConversationExport('chat.json', JSON.stringify(wrapped))).conversations[0].title).toBe('Wrapped');
    const listed = await parseConversationExport('chats.json', JSON.stringify(many));
    expect(listed.format).toBe('generic-json');
    expect(listed.conversations.map((conversation) => conversation.title)).toEqual(['First', 'Second']);
    expect(listed.conversations[0].messages[0].role).toBe('user');
    const copilot = await parseConversationExport('copilot.json', JSON.stringify(copilotLike));
    expect(copilot.conversations[0].messages.map((message) => message.role)).toEqual(['user', 'assistant']);
  });

  it('reads JSONL messages, grouped threads, and one conversation per line', async () => {
    const messages = [
      '{"role":"user","content":"First line"}',
      '{"role":"assistant","content":"Second line"}',
    ].join('\n');
    const grouped = [
      '{"conversation_id":"t1","title":"Thread","role":"user","content":"Alpha"}',
      '{"conversation_id":"t2","role":"user","content":"Beta"}',
      '{"conversation_id":"t1","role":"assistant","content":"Reply"}',
    ].join('\n');
    const conversations = [
      JSON.stringify({ messages: [{ role: 'user', content: 'Line convo' }] }),
      JSON.stringify({ messages: [{ role: 'assistant', content: 'Line reply' }] }),
    ].join('\n');

    const flat = await parseConversationExport('chat.jsonl', messages);
    expect(flat.format).toBe('jsonl');
    expect(flat.conversations).toHaveLength(1);
    expect(flat.conversations[0].messages).toHaveLength(2);

    const threads = await parseConversationExport('threads.jsonl', grouped);
    expect(threads.conversations).toHaveLength(2);
    expect(threads.conversations.find((conversation) => conversation.id === 't1')?.messages).toHaveLength(2);

    const lines = await parseConversationExport('export.jsonl', conversations);
    expect(lines.conversations).toHaveLength(2);
    expect(lines.conversations[1].messages[0].text).toBe('Line reply');
  });

  it('reads markdown and plain-text transcripts, including a second conversation', async () => {
    const markdown = `# Planning

**User:** I need a title
**Assistant:** Try "Field notes".

# Later

### User
What about the ending?

### Assistant
Leave the last line open.
`;
    const plain = 'Human: Ping\nAI: Pong\n';

    const fromMarkdown = await parseConversationExport('notes.md', markdown);
    expect(fromMarkdown.format).toBe('markdown');
    expect(fromMarkdown.conversations).toHaveLength(2);
    expect(fromMarkdown.conversations[0].title).toBe('Planning');
    expect(fromMarkdown.conversations[0].messages[0]).toMatchObject({ role: 'user', text: 'I need a title' });
    expect(fromMarkdown.conversations[1].messages[1].text).toMatch(/last line/);

    const fromText = await parseConversationExport('transcript.txt', plain);
    expect(fromText.conversations[0].messages.map((message) => message.text)).toEqual(['Ping', 'Pong']);
  });

  it('reads a CSV with role and content columns and groups by conversation id', async () => {
    const csv = [
      'conversation_id,title,role,content,timestamp',
      'c1,Greetings,user,"Hello, world",2024-01-01T00:00:00.000Z',
      'c1,Greetings,assistant,Hi,2024-01-01T00:00:01.000Z',
      'c2,Other,human,Second chat,2024-02-01T00:00:00.000Z',
    ].join('\n');

    const parsed = await parseConversationExport('chats.csv', csv);
    expect(parsed.format).toBe('csv');
    expect(parsed.conversations).toHaveLength(2);
    expect(parsed.conversations[0].title).toBe('Greetings');
    expect(parsed.conversations[0].messages[0].text).toBe('Hello, world');
    expect(parsed.conversations[0].messages[1].timestamp).toBe('2024-01-01T00:00:01.000Z');
  });

  it('reads ZIP archives of stored and deflated exports', async () => {
    const chatgpt = JSON.stringify([{
      title: 'Inside zip',
      mapping: {
        m1: { message: { author: { role: 'user' }, create_time: 1700000100, content: { parts: ['From the archive'] } } },
      },
    }]);
    const transcript = 'User: Also in the zip\nAssistant: Noted.';
    const stored = makeZip([
      { name: 'Takeout/conversations.json', data: textBytes(chatgpt) },
      { name: 'notes/transcript.txt', data: textBytes(transcript) },
      { name: '__MACOSX/._junk', data: textBytes('ignore') },
    ]);
    const storedParsed = await parseConversationExport('export.zip', stored);
    expect(storedParsed.format).toBe('mixed');
    expect(storedParsed.conversations.map((conversation) => conversation.messages[0].text).sort()).toEqual([
      'Also in the zip',
      'From the archive',
    ]);

    const generic = JSON.stringify([{ role: 'user', content: 'Deflated hello' }]);
    const raw = textBytes(generic);
    const compressed = deflateRawSync(raw);
    const deflated = makeZip([{
      name: 'chat.json',
      data: raw,
      method: 8,
      compressed: new Uint8Array(compressed),
    }]);
    const deflatedParsed = await parseConversationExport('chat.zip', deflated);
    expect(deflatedParsed.conversations[0].messages[0].text).toBe('Deflated hello');
  });

  it('keeps an already normalized export stable for the report functions', async () => {
    const first = await parseConversationExport('conversations.json', JSON.stringify([{
      title: 'Legacy',
      mapping: {
        m: { message: { author: { role: 'user' }, create_time: 1700000200, content: { parts: ['Ship the parser'] } } },
      },
    }]));
    const second = await parseConversationExport('selected.json', JSON.stringify(first.conversations));
    expect(second.format).toBe('chatgpt');
    expect(second.conversations[0].messages).toEqual(first.conversations[0].messages);
    expect(second.conversations[0].title).toBe('Legacy');
  });

  it('lists supported formats when detection fails', async () => {
    await expect(parseConversationExport('notes.txt', 'Just a grocery list with no speakers.')).rejects.toBeInstanceOf(ConversationParseError);
    await expect(parseConversationExport('data.json', '{"hello":"world"}')).rejects.toThrow(/ChatGPT conversations\.json/);
    await expect(parseConversationExport('data.json', '{"hello":"world"}')).rejects.toThrow(/ZIP archives/);
    await expect(parseConversationExport('empty.csv', 'name,age\nAda,36\n')).rejects.toThrow(/role column and a content column/);
  });
});
