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
  /** Whether this viewer may change the page's shared records; null when not told. */
  can(capability: 'data.write'): Promise<boolean | null>;
  /** Names for person ids; an unknown id gets an entry with an empty name. */
  profiles(ids: readonly string[]): Promise<Record<string, { id: string; name: string; isMe: boolean }>>;
}

interface ClaudeSample {
  json<T = unknown>(input: string, options?: { images?: Blob[]; cache?: boolean; signal?: AbortSignal }): Promise<T>;
  limits(): Promise<{ maxPromptBytes: number; images?: { maxCount: number; maxInputBytes: number; mediaTypes: string[] } }>;
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
  sample: ClaudeSample;
}

interface Window {
  claude?: { use<K extends keyof ClaudeCapabilities>(name: K): Promise<ClaudeCapabilities[K] | null> };
}
