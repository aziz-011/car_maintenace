// The parts of the claude.ai page runtime this app uses. The page gets
// `window.claude` only when it runs as a published page on claude.ai.

interface ClaudeDocSnapshot {
  id: string;
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}

interface ClaudeQuerySnapshot {
  docs: ClaudeDocSnapshot[];
}

interface ClaudeDocRef {
  set(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
}

interface ClaudeCollectionRef {
  doc(id: string): ClaudeDocRef;
  get(): Promise<ClaudeQuerySnapshot>;
  onSnapshot(next: (snap: ClaudeQuerySnapshot) => void, error?: (e: { code: string; message: string }) => void): () => void;
}

interface ClaudeDb {
  collection(path: string): ClaudeCollectionRef;
}

interface ClaudeUser {
  id(): Promise<string | null>;
  isOwner(): Promise<boolean>;
}

interface ClaudeDownloads {
  save(request: { filename: string; data: string | Blob }): Promise<{ status: string }>;
}

interface ClaudeAssets {
  upload(blob: Blob): Promise<{ id: string; url: string; sizeBytes: number; contentType: string }>;
  delete(id: string): Promise<void>;
}

interface ClaudeCapabilities {
  assets: ClaudeAssets;
  db: ClaudeDb;
  user: ClaudeUser;
  downloads: ClaudeDownloads;
}

interface Window {
  claude?: { use<K extends keyof ClaudeCapabilities>(name: K): Promise<ClaudeCapabilities[K] | null> };
}
