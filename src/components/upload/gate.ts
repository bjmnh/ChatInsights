export interface DropzoneGuard {
  locked: boolean;
  disabled: boolean;
  noClick: boolean;
  noDrag: boolean;
  noKeyboard: boolean;
}

export function dropzoneGuard(acknowledged: boolean, busy: boolean): DropzoneGuard {
  const locked = !acknowledged || busy;
  return {
    locked,
    disabled: locked,
    noClick: !acknowledged,
    noDrag: !acknowledged,
    noKeyboard: !acknowledged,
  };
}

export function clearFileInput(input: HTMLInputElement | null): void {
  if (input) input.value = '';
}
