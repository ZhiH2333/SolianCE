import * as FileSystem from 'expo-file-system/legacy';
import type { TokenPair } from '@/lib/api/api-types';
import {
  API_BASE_URL,
  performAuthorizedFetch,
  refreshAccessToken,
} from '@/lib/api/http-client';
import { getStoredTokenPair, setStoredTokenPair } from '@/lib/api/token-store';

const REFRESH_SKEW_MS: number = 30_000;
const CLIENT_ABILITY_HEADER: string = 'chat-e2ee-v1';
const DEFAULT_CHUNK_SIZE: number = 5_242_880;

export interface DriveFile {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
  type: 'image' | 'video' | 'audio' | 'file';
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function pickString(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v: unknown = source[key];
    if (typeof v === 'string' && v.length > 0) {
      return v;
    }
  }
  return '';
}

function pickNumberField(source: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const v: unknown = source[key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      return Math.trunc(v);
    }
    if (typeof v === 'string' && v.length > 0) {
      const n: number = parseInt(v, 10);
      if (Number.isFinite(n)) {
        return n;
      }
    }
  }
  return 0;
}

function pickSize(source: Record<string, unknown>): number {
  const keys: string[] = ['size', 'file_size', 'fileSize', 'bytes', 'length'];
  for (const key of keys) {
    const v: unknown = source[key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      return Math.max(0, Math.trunc(v));
    }
  }
  return 0;
}

function resolvePublicUrl(raw: string, fileId: string): string {
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }
  if (raw.startsWith('/')) {
    return `${API_BASE_URL}${raw}`;
  }
  if (raw.length > 0) {
    return `${API_BASE_URL}/drive/files/${raw}`;
  }
  if (fileId.length > 0) {
    return `${API_BASE_URL}/drive/files/${fileId}`;
  }
  return '';
}

function extractUrlFromPayload(root: Record<string, unknown>, fileId: string): string {
  const urlValue: unknown = root.url;
  if (typeof urlValue === 'string') {
    return resolvePublicUrl(urlValue, fileId);
  }
  const urlRecord: Record<string, unknown> | null = readRecord(urlValue);
  if (urlRecord) {
    const nested: string = pickString(urlRecord, [
      'public_url',
      'publicUrl',
      'url',
      'download_url',
      'downloadUrl',
    ]);
    return resolvePublicUrl(nested, fileId);
  }
  const fileMeta: Record<string, unknown> | null = readRecord(root.file_meta ?? root.fileMeta);
  if (fileMeta) {
    const fromMeta: string = pickString(fileMeta, [
      'public_url',
      'publicUrl',
      'url',
      'download_url',
      'downloadUrl',
    ]);
    if (fromMeta.length > 0) {
      return resolvePublicUrl(fromMeta, fileId);
    }
  }
  return resolvePublicUrl('', fileId);
}

export function detectFileType(mimeType: string): DriveFile['type'] {
  const m: string = mimeType.trim().toLowerCase();
  if (m.startsWith('image/')) {
    return 'image';
  }
  if (m.startsWith('video/')) {
    return 'video';
  }
  if (m.startsWith('audio/')) {
    return 'audio';
  }
  return 'file';
}

function mapPayloadToDriveFile(data: unknown, fallbackId?: string): DriveFile {
  const row: Record<string, unknown> | null = readRecord(data);
  if (!row) {
    throw new Error('无效的文件响应');
  }
  const nested: Record<string, unknown> = readRecord(row.data) ?? row;
  const id: string =
    pickString(nested, ['id', 'hash']) ||
    pickString(row, ['id', 'hash']) ||
    (fallbackId ?? '');
  if (id.length === 0) {
    throw new Error('无效的文件响应');
  }
  const name: string =
    pickString(nested, ['name', 'filename', 'file_name', 'fileName']) ||
    pickString(row, ['name', 'filename', 'file_name', 'fileName']) ||
    'file';
  const mimeType: string =
    pickString(nested, ['mime_type', 'mimeType', 'content_type', 'contentType']) ||
    pickString(row, ['mime_type', 'mimeType', 'content_type', 'contentType']) ||
    'application/octet-stream';
  const size: number = pickSize(nested) || pickSize(row);
  const url: string = extractUrlFromPayload(nested, id) || extractUrlFromPayload(row, id);
  const type: DriveFile['type'] = detectFileType(mimeType);
  return { id, url, name, mimeType, size, type };
}

function isAccessTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) {
    return false;
  }
  const expireMs: number = new Date(expiresAt).getTime();
  return Number.isFinite(expireMs) && expireMs - REFRESH_SKEW_MS <= Date.now();
}

async function loadAuthorizedTokenPair(): Promise<TokenPair> {
  let pair: TokenPair | null = await getStoredTokenPair();
  if (!pair) {
    throw new Error('未登录');
  }
  if (isAccessTokenExpired(pair.expiresAt)) {
    pair = await refreshAccessToken(pair);
    await setStoredTokenPair(pair);
  }
  return pair;
}

async function persistTokenIfRefreshed(before: TokenPair, after: TokenPair): Promise<void> {
  if (after.token !== before.token) {
    await setStoredTokenPair(after);
  }
}

async function readFileAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response: Response = await fetch(uri);
  if (!response.ok) {
    throw new Error('无法读取待上传文件');
  }
  return response.arrayBuffer();
}

async function sha256HexOfBuffer(buffer: ArrayBuffer): Promise<string> {
  const subtle: { digest: (a: string, b: ArrayBuffer) => Promise<ArrayBuffer> } | undefined =
    globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('当前环境不支持 SHA-256');
  }
  const hashBuffer: ArrayBuffer = await subtle.digest('SHA-256', buffer);
  const bytes: Uint8Array = new Uint8Array(hashBuffer);
  let hex: string = '';
  for (let i: number = 0; i < bytes.length; i += 1) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function uint8ToBase64(bytes: Uint8Array): string {
  if (typeof globalThis.btoa !== 'function') {
    throw new Error('Base64 编码不可用');
  }
  let binary: string = '';
  for (let i: number = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return globalThis.btoa(binary);
}

function createLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

async function postChunkMultipart(
  taskId: string,
  chunkIndex: number,
  chunkUri: string,
  token: string,
): Promise<void> {
  const form: FormData = new FormData();
  form.append(
    'chunk',
    { uri: chunkUri, name: 'chunk', type: 'application/octet-stream' } as unknown as Blob,
  );
  return new Promise<void>((resolve, reject) => {
    const xhr: XMLHttpRequest = new XMLHttpRequest();
    const path: string = `/drive/files/upload/chunk/${encodeURIComponent(taskId)}/${chunkIndex}`;
    xhr.open('POST', `${API_BASE_URL}${path}`);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('X-Client-Ability', CLIENT_ABILITY_HEADER);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.onload = (): void => {
      const text: string = typeof xhr.responseText === 'string' ? xhr.responseText : '';
      let parsed: unknown = null;
      if (text.length > 0) {
        try {
          parsed = JSON.parse(text) as unknown;
        } catch {
          reject(new Error('无法解析分块上传响应'));
          return;
        }
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        const errBody: Record<string, unknown> | null = readRecord(parsed);
        const msgRaw: unknown = errBody?.message;
        const message: string =
          typeof msgRaw === 'string' && msgRaw.length > 0 ? msgRaw : `分块上传失败: ${xhr.status}`;
        reject(new Error(message));
        return;
      }
      resolve();
    };
    xhr.onerror = (): void => reject(new Error('分块上传失败'));
    xhr.onabort = (): void => reject(new Error('上传已取消'));
    xhr.send(form);
  });
}

export async function getFileInfo(fileId: string): Promise<DriveFile> {
  const before: TokenPair = await loadAuthorizedTokenPair();
  const { data, tokenPair } = await performAuthorizedFetch(
    `/drive/files/${encodeURIComponent(fileId)}`,
    { method: 'GET' },
    before,
  );
  await persistTokenIfRefreshed(before, tokenPair);
  return mapPayloadToDriveFile(data, fileId);
}

export async function uploadFile(
  file: { uri: string; name: string; type: string },
  onProgress?: (percent: number) => void,
): Promise<DriveFile> {
  let pair: TokenPair = await loadAuthorizedTokenPair();
  const buffer: ArrayBuffer = await readFileAsArrayBuffer(file.uri);
  const fileSize: number = buffer.byteLength;
  const hash: string = await sha256HexOfBuffer(buffer);
  const createBody: Record<string, unknown> = {
    fileName: file.name,
    fileSize,
    contentType: file.type,
    hash,
    chunkSize: DEFAULT_CHUNK_SIZE,
  };
  const createResult = await performAuthorizedFetch('/drive/files/upload/create', {
    method: 'POST',
    body: JSON.stringify(createBody),
  }, pair);
  await persistTokenIfRefreshed(pair, createResult.tokenPair);
  pair = createResult.tokenPair;
  const createRoot: Record<string, unknown> | null = readRecord(createResult.data);
  if (!createRoot) {
    throw new Error('无效的上传任务响应');
  }
  const fileExists: boolean =
    createRoot.fileExists === true || createRoot.file_exists === true;
  if (fileExists) {
    const existing: unknown = createRoot.file ?? createRoot.File;
    if (existing) {
      onProgress?.(100);
      return mapPayloadToDriveFile(existing);
    }
  }
  const taskId: string = pickString(createRoot, ['taskId', 'task_id']);
  if (taskId.length === 0) {
    throw new Error('缺少上传任务 ID');
  }
  let effectiveChunkSize: number =
    pickNumberField(createRoot, ['chunkSize', 'chunk_size']) || DEFAULT_CHUNK_SIZE;
  if (effectiveChunkSize <= 0) {
    effectiveChunkSize = DEFAULT_CHUNK_SIZE;
  }
  let chunksCount: number = pickNumberField(createRoot, ['chunksCount', 'chunks_count']);
  if (chunksCount <= 0) {
    chunksCount = Math.max(1, Math.ceil(fileSize / effectiveChunkSize));
  }
  const bytes: Uint8Array = new Uint8Array(buffer);
  const cacheDir: string | null = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!cacheDir) {
    throw new Error('无法写入缓存目录');
  }
  for (let idx: number = 0; idx < chunksCount; idx += 1) {
    const start: number = idx * effectiveChunkSize;
    const end: number = Math.min(start + effectiveChunkSize, fileSize);
    const slice: Uint8Array = bytes.subarray(start, end);
    const tempPath: string = `${cacheDir}drive_chunk_${createLocalId()}_${idx}.bin`;
    await FileSystem.writeAsStringAsync(tempPath, uint8ToBase64(slice), {
      encoding: FileSystem.EncodingType.Base64,
    });
    try {
      await postChunkMultipart(taskId, idx, tempPath, pair.token);
    } finally {
      await FileSystem.deleteAsync(tempPath, { idempotent: true }).catch(() => {});
    }
    const percent: number = Math.round(((idx + 1) / chunksCount) * 100);
    onProgress?.(Math.min(100, Math.max(0, percent)));
  }
  const completeResult = await performAuthorizedFetch(
    `/drive/files/upload/complete/${encodeURIComponent(taskId)}`,
    { method: 'POST' },
    pair,
  );
  await persistTokenIfRefreshed(pair, completeResult.tokenPair);
  return mapPayloadToDriveFile(completeResult.data);
}
