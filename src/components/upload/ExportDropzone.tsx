import React from 'react';
import type { DropzoneInputProps, DropzoneRootProps } from 'react-dropzone';
import { FileArchive, FileJson, Upload } from 'lucide-react';

const stages = [
  { id: 'reading', label: 'Opening the file' },
  { id: 'parsing', label: 'Reading the export' },
  { id: 'counting', label: 'Counting conversations' },
] as const;

export type UploadStage = 'idle' | 'reading' | 'parsing' | 'counting';

interface ExportDropzoneProps {
  isDragActive: boolean;
  stage: UploadStage;
  rootProps: DropzoneRootProps;
  inputProps: DropzoneInputProps;
}

const ExportDropzone: React.FC<ExportDropzoneProps> = ({ isDragActive, stage, rootProps, inputProps }) => {
  const busy = stage !== 'idle';
  const activeIndex = stages.findIndex((item) => item.id === stage);

  return (
    <div
      {...rootProps}
      className={`relative overflow-hidden rounded-[28px] border px-5 py-10 text-center transition sm:px-10 sm:py-14 ${
        isDragActive
          ? 'border-primary bg-primary/10'
          : 'border-white/15 bg-[radial-gradient(circle_at_top,_rgba(214,255,63,0.16),_transparent_55%)]'
      } ${busy ? 'cursor-progress' : 'cursor-pointer'}`}
    >
      <input {...inputProps} />
      <div className="mx-auto grid max-w-xl gap-6">
        <div className="relative mx-auto h-36 w-28 rounded-2xl border border-white/15 bg-[#101218] shadow-2xl">
          <div className="space-y-2 p-3 pt-5">
            <div className="h-2 w-16 rounded-full bg-white/20" />
            <div className="h-2 w-full rounded-full bg-white/10" />
            <div className="h-2 w-5/6 rounded-full bg-white/10" />
            <div className="h-2 w-full rounded-full bg-white/10" />
            <div className="h-2 w-2/3 rounded-full bg-primary/70" />
            <div className="h-2 w-full rounded-full bg-white/10" />
          </div>
          {busy && <div className="animate-scan absolute left-2 right-2 h-8 bg-gradient-to-b from-transparent via-primary/70 to-transparent" />}
          <div className="absolute -right-3 -top-3 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground">
            <Upload className="h-4 w-4" />
          </div>
        </div>

        {busy ? (
          <div>
            <p className="font-display text-3xl">Reading your archive</p>
            <ul className="mx-auto mt-4 max-w-xs space-y-2 text-left text-sm">
              {stages.map((item, index) => (
                <li key={item.id} className={index <= activeIndex ? 'text-foreground' : 'text-muted-foreground'}>
                  <span className={`mr-2 inline-block h-2 w-2 rounded-full ${index <= activeIndex ? 'bg-primary' : 'bg-white/20'}`} />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div>
            <p className="font-display text-4xl text-balance sm:text-5xl">
              {isDragActive ? 'Drop it.' : 'Drop the export.'}
            </p>
            <p className="mt-3 text-muted-foreground">
              JSON, JSONL, Markdown, text, CSV, HTML, or a ZIP from ChatGPT, Claude, Gemini, Grok, or another assistant.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1">
                <FileJson className="h-3.5 w-3.5" /> JSON
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1">
                <FileArchive className="h-3.5 w-3.5" /> ZIP
              </span>
              <span className="rounded-full border border-white/15 px-3 py-1">MD · CSV · HTML</span>
              <span className="rounded-full border border-white/15 px-3 py-1">Up to 200MB</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportDropzone;
