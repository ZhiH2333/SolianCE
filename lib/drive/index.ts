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
  createdAt?: string;
  updatedAt?: string;
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
  const fileObj: Record<string, unknown> | null = readRecord(row.file) ?? nested;
  const id: string =
    pickString(fileObj, ['id', 'hash', 'object_id', 'objectId']) ||
    pickString(nested, ['id', 'hash', 'object_id', 'objectId']) ||
    pickString(row, ['id', 'hash', 'object_id', 'objectId']) ||
    (fallbackId ?? '');
  if (id.length === 0) {
    throw new Error('无效的文件响应');
  }
  const name: string =
    pickString(fileObj, ['name', 'filename', 'file_name', 'fileName']) ||
    pickString(nested, ['name', 'filename', 'file_name', 'fileName']) ||
    pickString(row, ['name', 'filename', 'file_name', 'fileName']) ||
    'file';
  const mimeType: string =
    pickString(fileObj, ['mime_type', 'mimeType', 'content_type', 'contentType']) ||
    pickString(nested, ['mime_type', 'mimeType', 'content_type', 'contentType']) ||
    pickString(row, ['mime_type', 'mimeType', 'content_type', 'contentType']) ||
    'application/octet-stream';
  const size: number = pickSize(fileObj) || pickSize(nested) || pickSize(row);
  const url: string = extractUrlFromPayload(fileObj, id) || extractUrlFromPayload(nested, id) || extractUrlFromPayload(row, id);
  const type: DriveFile['type'] = detectFileType(mimeType);
  const createdAt: string = pickString(fileObj, ['created_at', 'createdAt']) || pickString(nested, ['created_at', 'createdAt']) || pickString(row, ['created_at', 'createdAt']) || '';
  const updatedAt: string = pickString(fileObj, ['updated_at', 'updatedAt']) || pickString(nested, ['updated_at', 'updatedAt']) || pickString(row, ['updated_at', 'updatedAt']) || '';
  return { id, url: url || `${API_BASE_URL}/drive/files/${id}`, name, mimeType, size, type, createdAt, updatedAt };
}

export interface DriveFolder {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapPayloadToDriveFolder(data: unknown): DriveFolder {
  const row: Record<string, unknown> | null = readRecord(data);
  if (!row) {
    throw new Error('无效的文件夹响应');
  }
  const id: string = pickString(row, ['id', 'hash', 'folder_id', 'folderId']) || '';
  if (id.length === 0) {
    throw new Error('无效的文件夹响应');
  }
  const name: string = pickString(row, ['name', 'title', 'folder_name', 'folderName']) || '文件夹';
  const path: string = pickString(row, ['path', 'folder_path', 'folderPath']) || '';
  const parentId: string = pickString(row, ['parent_id', 'parentId', 'parent']) || '';
  const createdAt: string = pickString(row, ['created_at', 'createdAt']) || '';
  const updatedAt: string = pickString(row, ['updated_at', 'updatedAt']) || '';
  return { id, name, path, parentId: parentId || null, createdAt, updatedAt };
}

export async function getFolderContents(
  folderId: string | null,
  offset: number = 0,
  take: number = 50,
): Promise<{ folders: DriveFolder[]; files: DriveFile[]; totalCount: number | null }> {
  const before: TokenPair = await loadAuthorizedTokenPair();
  const params: URLSearchParams = new URLSearchParams({
    offset: String(offset),
    take: String(take),
  });
  let path = '/drive/index/browse?';
  if (folderId) {
    params.set('path', '/' + folderId);
  }
  path += params.toString();
  const { data, tokenPair } = await performAuthorizedFetch(path, { method: 'GET' }, before);
  await persistTokenIfRefreshed(before, tokenPair);
  const root = data as Record<string, unknown>;
  let folders: DriveFolder[] = [];
  let files: DriveFile[] = [];
  const foldersRaw = root.folders;
  const filesRaw = root.files;
  if (Array.isArray(foldersRaw)) {
    for (const f of foldersRaw) {
      if (typeof f === 'string') {
        folders.push({
          id: f,
          name: f,
          path: '/' + f,
          parentId: folderId,
          createdAt: '',
          updatedAt: '',
        });
      } else if (f && typeof f === 'object') {
        try { folders.push(mapPayloadToDriveFolder(f)); } catch {}
      }
    }
  }
  if (Array.isArray(filesRaw)) {
    for (const f of filesRaw) {
      if (f && typeof f === 'object') {
        try { files.push(mapPayloadToDriveFile(f)); } catch {}
      }
    }
  }
  const totalCount = typeof root.total_count === 'number' ? root.total_count : (folders.length + files.length);
  return { folders, files, totalCount };
}

export async function getIndexedFiles(
  offset: number = 0,
  take: number = 50,
): Promise<{ items: DriveFile[]; totalCount: number | null }> {
  const before: TokenPair = await loadAuthorizedTokenPair();
  const params: URLSearchParams = new URLSearchParams({
    offset: String(offset),
    take: String(take),
  });
  const { data, tokenPair } = await performAuthorizedFetch(
    `/drive/index/browse?${params.toString()}`,
    { method: 'GET' },
    before,
  );
  await persistTokenIfRefreshed(before, tokenPair);
  const root = data;
  let itemsRaw: unknown[] = [];
  if (Array.isArray(root)) {
    itemsRaw = root;
  } else if (root && typeof root === 'object') {
    if (Array.isArray((root as any).items)) {
      itemsRaw = (root as any).items;
    } else if (Array.isArray((root as any).data)) {
      itemsRaw = (root as any).data;
    } else if (Array.isArray((root as any).files)) {
      itemsRaw = (root as any).files;
    } else if (Array.isArray((root as any).list)) {
      itemsRaw = (root as any).list;
    }
  }
  const folders: DriveFolder[] = [];
  const items: DriveFile[] = [];
  for (const raw of itemsRaw) {
    try {
      const itemRecord = raw as Record<string, unknown>;
      const typeValue = itemRecord.type as string | undefined;
      const isFolder = typeValue === 'folder' || typeValue === 'dir' || typeValue === 'directory';
      if (isFolder) {
        folders.push(mapPayloadToDriveFolder(raw));
      } else {
        items.push(mapPayloadToDriveFile(raw));
      }
    } catch {}
  }
  return { items, totalCount: items.length > 0 ? items.length + folders.length : null };
}

export async function uploadToIndex(
  file: { uri: string; name: string; type: string },
  folderId: string | null,
  onProgress?: (percent: number) => void,
): Promise<DriveFile> {
  const baseFile = await uploadFile(file, onProgress);
  const before: TokenPair = await loadAuthorizedTokenPair();
  const body: Record<string, unknown> = {
    file_id: baseFile.id,
    folder_id: folderId,
  };
  const { data, tokenPair } = await performAuthorizedFetch('/drive/index/add', {
    method: 'POST',
    body: JSON.stringify(body),
  }, before);
  await persistTokenIfRefreshed(before, tokenPair);
  return mapPayloadToDriveFile(data);
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

export interface DriveQuota {
  used: number;
  total: number;
  usedFiles: number;
  totalFiles: number;
  usedPoints: number;
  totalPoints: number;
  pools: Array<{
    poolId: string;
    poolName: string;
    usageBytes: number;
    fileCount: number;
  }>;
}

function mapJsonToQuota(data: unknown): DriveQuota {
  if (Array.isArray(data)) {
    let totalUsed = 0;
    let totalFiles = 0;
    const pools: Array<{ poolId: string; poolName: string; usageBytes: number; fileCount: number }> = [];
    for (const pool of data) {
      const poolRecord = pool as Record<string, unknown>;
      const usageBytes = typeof poolRecord.usage_bytes === 'number' ? poolRecord.usage_bytes : 0;
      const fileCount = typeof poolRecord.file_count === 'number' ? poolRecord.file_count : 0;
      totalUsed += usageBytes;
      totalFiles += fileCount;
      pools.push({
        poolId: String(poolRecord.pool_id || ''),
        poolName: String(poolRecord.pool_name || ''),
        usageBytes,
        fileCount,
      });
    }
    return { used: totalUsed, total: 0, usedFiles: totalFiles, totalFiles: totalFiles, usedPoints: 0, totalPoints: 0, pools };
  }
  const root: Record<string, unknown> | null = readRecord(data);
  if (!root) {
    return { used: 0, total: 0, usedFiles: 0, totalFiles: 0, usedPoints: 0, totalPoints: 0, pools: [] };
  }
  const used = pickNumberField(root, ['used', 'used_bytes', 'usedBytes', 'used_quota', 'usedQuota']) || 0;
  const total = pickNumberField(root, ['total', 'quota', 'limit', 'total_quota', 'totalQuota', 'total_quota']) || 0;
  const usedFiles = pickNumberField(root, ['count', 'file_count', 'fileCount', 'files']) || 0;
  const totalFiles = pickNumberField(root, ['max_files', 'maxFiles', 'file_limit', 'fileLimit']) || 0;
  const usedPoints = pickNumberField(root, ['points', 'used_points', 'usedPoints', 'credits', 'used_credits']) || 0;
  const totalPoints = pickNumberField(root, ['max_points', 'maxPoints', 'points_limit', 'pointsLimit', 'credits_limit', 'creditsLimit']) || 0;
  return { used, total, usedFiles, totalFiles, usedPoints, totalPoints, pools: [] };
}

export async function getQuota(): Promise<DriveQuota> {
  const before: TokenPair = await loadAuthorizedTokenPair();
  const { data: quotaData, tokenPair: quotaToken } = await performAuthorizedFetch('/drive/billing/quota', { method: 'GET' }, before);
  const { data: usageData } = await performAuthorizedFetch('/drive/billing/usage', { method: 'GET' }, before);
  await persistTokenIfRefreshed(before, quotaToken);
  const quota = mapJsonToQuota(quotaData);
  const usage = mapJsonToQuota(usageData);
  return {
    used: usage.used || quota.used,
    total: quota.total || usage.total,
    usedFiles: usage.usedFiles,
    totalFiles: usage.totalFiles || quota.totalFiles,
    usedPoints: usage.usedPoints || quota.usedPoints,
    totalPoints: quota.totalPoints || usage.totalPoints,
    pools: usage.pools,
  };
}

export async function getUsage(): Promise<DriveQuota> {
  const before: TokenPair = await loadAuthorizedTokenPair();
  const { data, tokenPair } = await performAuthorizedFetch('/drive/billing/usage', { method: 'GET' }, before);
  await persistTokenIfRefreshed(before, tokenPair);
  return mapJsonToQuota(data);
}

export async function getUnindexedFiles(
  offset: number = 0,
  take: number = 20,
): Promise<{ items: DriveFile[]; totalCount: number | null }> {
  const before: TokenPair = await loadAuthorizedTokenPair();
  const params: URLSearchParams = new URLSearchParams({
    offset: String(offset),
    take: String(take),
  });
  const { data, tokenPair } = await performAuthorizedFetch(
    `/drive/index/unindexed?${params.toString()}`,
    { method: 'GET' },
    before,
  );
  await persistTokenIfRefreshed(before, tokenPair);
  const root = data;
  let itemsRaw: unknown[] = [];
  if (Array.isArray(root)) {
    itemsRaw = root;
  } else if (root && typeof root === 'object') {
    if (Array.isArray((root as any).items)) {
      itemsRaw = (root as any).items;
    } else if (Array.isArray((root as any).data)) {
      itemsRaw = (root as any).data;
    } else if (Array.isArray((root as any).files)) {
      itemsRaw = (root as any).files;
    }
  }
  const items: DriveFile[] = [];
  for (const raw of itemsRaw) {
    try {
      items.push(mapPayloadToDriveFile(raw));
    } catch {}
  }
  return { items, totalCount: items.length > 0 ? items.length : null };
}

export async function deleteFile(fileId: string): Promise<void> {
  const before: TokenPair = await loadAuthorizedTokenPair();
  const { tokenPair } = await performAuthorizedFetch(
    `/drive/files/${encodeURIComponent(fileId)}`,
    { method: 'DELETE' },
    before,
  );
  await persistTokenIfRefreshed(before, tokenPair);
}

export async function removeIndex(fileId: string): Promise<void> {
  const before: TokenPair = await loadAuthorizedTokenPair();
  const { tokenPair } = await performAuthorizedFetch(
    `/drive/index/remove/${encodeURIComponent(fileId)}`,
    { method: 'DELETE' },
    before,
  );
  await persistTokenIfRefreshed(before, tokenPair);
}

export async function batchDeleteFiles(fileIds: string[]): Promise<void> {
  if (fileIds.length === 0) return;
  const before: TokenPair = await loadAuthorizedTokenPair();
  const body: Record<string, unknown> = { ids: fileIds };
  const { tokenPair } = await performAuthorizedFetch('/drive/files/batches/delete', {
    method: 'POST',
    body: JSON.stringify(body),
  }, before);
  await persistTokenIfRefreshed(before, tokenPair);
}
