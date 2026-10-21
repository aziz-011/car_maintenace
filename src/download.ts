import type { Backend } from './files';

/**
 * Gives the user a file. claude.ai pages cannot start downloads themselves,
 * so there the viewer is asked to save it. Resolves false when declined.
 */
export async function saveFile(filename: string, text: string, type: string, backend: Backend): Promise<boolean> {
  const downloads = backend === 'cloud' ? await window.claude?.use('downloads') : null;
  if (downloads) {
    try {
      await downloads.save({ filename, data: new Blob([text], { type }) });
      return true;
    } catch (e) {
      if ((e as { code?: string }).code === 'declined') return false;
      throw e;
    }
  }
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
