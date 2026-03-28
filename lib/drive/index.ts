import type { TokenPair } from '@/lib/api/api-types';
import {
  API_BASE_URL,
  performAuthorizedFetch,
  refreshAccessToken,
} from '@/lib/api/http-client';
import { getStoredTokenPair, setStoredTokenPair } from '@/lib/api/token-store';

const REFRESH_SKEW_MS: number = 30_000;
const CLIENT_ABILITY_HEADER: string = 'chat-e2ee-v1';
const DRIVE_UPLOAD_FIELD: string = 'file';

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
  const tokenPair: TokenPair = await loadAuthorizedTokenPair();
  const endpoint: string = `${API_BASE_URL}/drive/files`;
  const form: FormData = new FormData();
  form.append(
    DRIVE_UPLOAD_FIELD,
    { uri: file.uri, name: file.name, type: file.type } as unknown as Blob,
  );
  return new Promise<DriveFile>((resolve, reject) => {
    const xhr: XMLHttpRequest = new XMLHttpRequest();
    xhr.open('POST', endpoint);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('X-Client-Ability', CLIENT_ABILITY_HEADER);
    xhr.setRequestHeader('Authorization', `Bearer ${tokenPair.token}`);
    xhr.upload.onprogress = (event: ProgressEvent): void => {
      if (!onProgress || !event.lengthComputable || event.total <= 0) {
        return;
      }
      const percent: number = Math.round((event.loaded / event.total) * 100);
      onProgress(Math.min(100, Math.max(0, percent)));
    };
    xhr.onerror = (): void => {
      reject(new Error('上传失败'));
    };
    xhr.onabort = (): void => {
      reject(new Error('上传已取消'));
    };
    xhr.onload = (): void => {
      const text: string = typeof xhr.responseText === 'string' ? xhr.responseText : '';
      let parsed: unknown = null;
      if (text.length > 0) {
        try {
          parsed = JSON.parse(text) as unknown;
        } catch {
          reject(new Error('无法解析上传响应'));
          return;
        }
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        const errBody: Record<string, unknown> | null = readRecord(parsed);
        const msgRaw: unknown = errBody?.message;
        const message: string =
          typeof msgRaw === 'string' && msgRaw.length > 0 ? msgRaw : `上传失败: ${xhr.status}`;
        reject(new Error(message));
        return;
      }
      try {
        resolve(mapPayloadToDriveFile(parsed));
      } catch (err) {
        reject(err instanceof Error ? err : new Error('无效的文件响应'));
      }
    };
    xhr.send(form);
  });
}
