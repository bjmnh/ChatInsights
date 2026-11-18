import React, { useEffect, useRef, type MutableRefObject, type Ref } from 'react';
import type { DropzoneInputProps, DropzoneRootProps } from 'react-dropzone';
import { FileArchive, FileJson, Upload } from 'lucide-react';
import { clearFileInput } from './gate';

const stages = [
  { id: 'storing', label: 'Storing a copy for security review' },
  { id: 'reading', label: 'Opening the file' },
  { id: 'parsing', label: 'Reading the export' },
  { id: 'counting', label: 'Counting conversations' },
] as const;

export type UploadStage = 'idle' | 'storing' | 'reading' | 'parsing' | 'counting';

interface ExportDropzoneProps {
  isDragActive: boolean;
  stage: UploadStage;
  locked: boolean;
  error: string | null;
  onRetry: (() => void) | null;
  rootProps: DropzoneRootProps;
  inputProps: DropzoneInputProps;
}

const ExportDropzone: React.FC<ExportDropzoneProps> = ({
  isDragActive,
  stage,
  locked,
  error,
  onRetry,
  rootProps,
  inputProps,
}) => {
  const busy = stage !== 'idle';
  const activeIndex = stages.findIndex((item) => item.id === stage);
  const inputNode = useRef<HTMLInputElement | null>(null);
  const { ref, disabled, ...restInput } = inputProps as DropzoneInputProps & {
    ref?: Ref<HTMLInputElement>;
    disabled?: boolean;
  };

  useEffect(() => {
    if (stage === 'idle') clearFileInput(inputNode.current);
  }, [stage]);

  return (
    <div
      {...rootProps}
      data-testid="export-dropzone"
      className={`relative overflow-hidden rounded-[28px] border px-5 py-10 text-center transition sm:px-10 sm:py-14 ${
        locked ? 'opacity-60' : ''
      } ${
        isDragActive
          ? 'border-primary bg-primary/10'
          : 'border-white/15 bg-[radial-gradient(circle_at_top,_rgba(214,255,63,0.16),_transparent_55%)]'
      } ${busy ? 'cursor-progress' : locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <input
        {...restInput}
        ref={(node) => {
          inputNode.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as MutableRefObject<HTMLInputElement | null>).current = node;
        }}
        disabled={locked || Boolean(disabled)}
        data-testid="export-file-input"
      />
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
              Your LLM conversations. JSON, JSONL, Markdown, text, CSV, HTML, or a ZIP from Gemini, Claude, Grok, or ChatGPT.
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
        {error && (
          <div role="alert" data-testid="upload-error" className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-left text-sm text-red-100">
            <p>{error}</p>
            {onRetry && !busy && (
              <button
                type="button"
                data-testid="upload-retry"
                className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onRetry();
                }}
              >
                Try again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportDropzone;
