import { t } from './i18n';
import { newId } from './store';
import type { Attachment } from './types';

export type Backend = 'server' | 'cloud' | 'local';

/** Longest side of an uploaded photo: enough to read a receipt, small enough to store many. */
const MAX_SIDE = 1600;
/** Without a server, photos live in browser storage, which holds only a few megabytes in total. */
const LOCAL_MAX_BYTES = 350_000;

/** Shrinks a photo to a JPEG; returns other files (PDFs, photos the browser cannot decode) unchanged. */
export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Stores a photo or PDF where this version of the app keeps files, and describes it for a record. */
export async function uploadAttachment(file: File, backend: Backend): Promise<Attachment> {
  const blob = await compressImage(file);
  const type = blob.type || file.type || 'application/octet-stream';
  const name = blob === file ? file.name : file.name.replace(/\.\w+$/, '') + '.jpg';

  if (backend === 'cloud') {
    const assets = await window.claude?.use('assets');
    if (!assets) throw new Error(t('Photos can only be added by the owner of this page.'));
    const res = await assets.upload(blob);
    return { id: res.id, name, type: res.contentType || type, url: `/_blob/${res.id}`, size: res.sizeBytes };
  }

  if (backend === 'server') {
    const res = await fetch(`/api/files?name=${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: { 'Content-Type': type },
      body: blob,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
    return { id: body.id, name, type, url: body.url, size: blob.size };
  }

  if (blob.size > LOCAL_MAX_BYTES) throw new Error(t('This file is too large to keep in the browser. Use the home server or claude.ai for photos.'));
  return { id: newId(), name, type, url: await readAsDataUrl(blob), size: blob.size };
}

export const isImage = (a: Attachment) => a.type.startsWith('image/');
