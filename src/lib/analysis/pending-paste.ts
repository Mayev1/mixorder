/**
 * Pending external analysis paste.
 *
 * The user can enable "Importer BPM + tonalités" on the welcome screen
 * BEFORE picking a folder. The pasted text is stored here and the preview
 * is shown as soon as the library is open.
 */
const KEY = "mixorder:pending-paste";

export function setPendingPaste(text: string): void {
  try {
    window.localStorage.setItem(KEY, text);
  } catch {
    /* ignore */
  }
}

export function getPendingPaste(): string | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

export function clearPendingPaste(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
