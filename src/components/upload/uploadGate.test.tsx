/**
 * @vitest-environment jsdom
 */
import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useDropzone } from 'react-dropzone';
import { describe, expect, it, vi } from 'vitest';
import ExportDropzone from './ExportDropzone';
import { dropzoneGuard } from './gate';

function Harness({ acknowledged, onDrop }: { acknowledged: boolean; onDrop: (names: string[]) => void }) {
  const guard = dropzoneGuard(acknowledged, false);
  const [error, setError] = useState<string | null>(null);
  const dropzone = useDropzone({
    multiple: false,
    disabled: guard.disabled,
    noClick: guard.noClick,
    noDrag: guard.noDrag,
    noKeyboard: guard.noKeyboard,
    onDrop: (files) => {
      if (!acknowledged) return;
      onDrop(files.map((file) => file.name));
    },
  });
  return (
    <ExportDropzone
      isDragActive={dropzone.isDragActive}
      stage="idle"
      locked={guard.locked}
      error={error}
      onRetry={() => {
        setError(null);
        onDrop(['retry.json']);
      }}
      rootProps={dropzone.getRootProps()}
      inputProps={dropzone.getInputProps()}
    />
  );
}

function fileList(file: File): FileList {
  const list = {
    0: file,
    length: 1,
    item: (index: number) => (index === 0 ? file : null),
  };
  return list as unknown as FileList;
}

describe('export acknowledgment gate', () => {
  it('disables the file input and ignores a drop until the box is checked', async () => {
    const seen: string[][] = [];
    const view = render(<Harness acknowledged={false} onDrop={(names) => seen.push(names)} />);
    const input = screen.getByTestId('export-file-input') as HTMLInputElement;
    expect(input.disabled).toBe(true);

    const file = new File(['{"messages":[]}'], 'chat.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { configurable: true, value: fileList(file) });
    fireEvent.drop(screen.getByTestId('export-dropzone'), {
      dataTransfer: { files: fileList(file), types: ['Files'] },
    });
    fireEvent.change(input);
    await Promise.resolve();
    expect(seen).toEqual([]);

    view.rerender(<Harness acknowledged={true} onDrop={(names) => seen.push(names)} />);
    const openInput = screen.getByTestId('export-file-input') as HTMLInputElement;
    expect(openInput.disabled).toBe(false);
    Object.defineProperty(openInput, 'files', { configurable: true, value: fileList(file) });
    fireEvent.change(openInput);
    await waitFor(() => expect(seen).toEqual([['chat.json']]));
  });

  it('keeps a failed upload on the page and retries from the button', () => {
    const retry = vi.fn();
    render(
      <ExportDropzone
        isDragActive={false}
        stage="idle"
        locked={false}
        error="We couldn't reach the server to store your file. Check your connection and try again."
        onRetry={retry}
        rootProps={{}}
        inputProps={{}}
      />,
    );
    expect(screen.getByTestId('upload-error').textContent).toMatch(/couldn't reach the server/);
    expect(screen.getByTestId('upload-error').textContent).not.toMatch(/failed to fetch/i);
    fireEvent.click(screen.getByTestId('upload-retry'));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
