import React from 'react';

const steps = [
  {
    title: 'You upload the export',
    body: 'A JSON, JSONL, Markdown, text, CSV, HTML, or ZIP file from Gemini, Claude, Grok, ChatGPT, or another assistant.',
  },
  {
    title: 'Parsed in your browser',
    body: 'The file is normalized here into conversations and messages (role, text, and a timestamp when the export has one). The same parser runs again in the report function when you generate a report.',
  },
  {
    title: 'Stored on your account',
    body: 'The conversations you select are saved as a private file in Supabase Storage, tied to your user.',
  },
  {
    title: 'Basic report',
    body: 'Server-side counts only: messages, words, timing, and similar stats. That report is not sent to an AI model.',
  },
  {
    title: 'Premium report',
    body: 'The message text from the conversations you kept is sent to Google Gemini, which writes the seven cards.',
  },
  {
    title: 'Saved, until you delete it',
    body: 'The report lands on your dashboard. You can delete an upload and its reports whenever you want. Nothing is deleted automatically after a report is made.',
  },
];

const DataPipeline: React.FC = () => {
  return (
    <section id="data" className="mx-auto max-w-6xl px-4 py-20">
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">What happens to the file</p>
        <h2 className="mt-3 font-display text-4xl sm:text-6xl">From export to cards.</h2>
        <p className="mt-4 text-muted-foreground">
          Your LLM conversations stay on your account. Basic stats stay in our code. Only a premium report sends the selected messages to Gemini.
        </p>
      </div>

      <ol className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="relative rounded-[28px] border border-white/10 p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary font-display text-lg text-primary-foreground">
                {index + 1}
              </span>
              {index < steps.length - 1 && (
                <svg className="hidden h-4 flex-1 text-white/20 xl:block" viewBox="0 0 120 16" fill="none" aria-hidden="true">
                  <path d="M0 8h108" stroke="currentColor" strokeDasharray="4 4" />
                  <path d="M108 3l8 5-8 5" stroke="currentColor" />
                </svg>
              )}
            </div>
            <h3 className="mt-5 font-display text-2xl">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default DataPipeline;
