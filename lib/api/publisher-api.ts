import type { ContentApiSync } from '@/lib/api/content-api';
import { syncTokenIfChanged } from '@/lib/api/content-api';
import { API_BASE_URL, performAuthorizedFetch, performAuthorizedGetList } from '@/lib/api/http-client';

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

function resolveMediaUrl(raw: string): string {
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }
  if (raw.startsWith('/')) {
    return `${API_BASE_URL}${raw}`;
  }
  return `${API_BASE_URL}/drive/files/${raw}`;
}

function resolvePictureUrlFromFileLike(blob: unknown): string {
  const root: Record<string, unknown> | null = readRecord(blob);
  if (!root) {
    return '';
  }
  const avatarUrlValue: unknown = root.url ?? null;
  const avatarUrlFromValue: string = ((): string => {
    if (typeof avatarUrlValue === 'string' && avatarUrlValue.length > 0) {
      return avatarUrlValue;
    }
    const urlRecord: Record<string, unknown> | null = readRecord(avatarUrlValue);
    if (urlRecord) {
      return pickString(urlRecord, ['public_url', 'publicUrl', 'url', 'download_url', 'downloadUrl']);
    }
    return '';
  })();
  const fileMeta: Record<string, unknown> | null = readRecord(root.file_meta ?? null);
  const userMeta: Record<string, unknown> | null = readRecord(root.user_meta ?? null);
  const avatarUrlFromMeta: string =
    pickString(fileMeta ?? {}, ['public_url', 'publicUrl', 'url', 'download_url', 'downloadUrl']) ||
    pickString(userMeta ?? {}, ['public_url', 'publicUrl', 'url', 'download_url', 'downloadUrl']) ||
    '';
  const fileId: string = pickString(root, ['id', 'hash']);
  const avatarUrlFromId: string = fileId.length > 0 ? resolveMediaUrl(fileId) : '';
  return (
    pickString(root, ['public_url', 'publicUrl', 'url', 'download_url', 'downloadUrl']) ||
    avatarUrlFromMeta ||
    avatarUrlFromValue ||
    avatarUrlFromId ||
    ''
  );
}

function mapPublisherType(raw: unknown): 'individual' | 'organization' {
  if (raw === 'individual' || raw === 'organization') {
    return raw;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.trunc(raw) === 0 ? 'individual' : 'organization';
  }
  if (typeof raw === 'string' && raw.length > 0) {
    const n: number = parseInt(raw, 10);
    if (Number.isFinite(n) && String(n) === raw.trim()) {
      return n === 0 ? 'individual' : 'organization';
    }
    const lower: string = raw.toLowerCase();
    if (lower === 'individual' || lower === 'org' || lower === 'organization') {
      return lower === 'individual' ? 'individual' : 'organization';
    }
  }
  return 'individual';
}

function readIsoDate(raw: unknown, fallback: string): string {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString();
  }
  if (typeof raw === 'string' && raw.length > 0) {
    return raw;
  }
  return fallback;
}

export interface SnPublisher {
  id: string;
  type: 'individual' | 'organization';
  name: string;
  nick: string;
  description?: string;
  avatar?: string;
  banner?: string;
  accountId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePublisherRequest {
  name: string;
  nick: string;
  description?: string;
  avatarId?: string;
  bannerId?: string;
  type: 'individual' | 'organization';
}

export interface UpdatePublisherRequest {
  nick?: string;
  description?: string;
  avatarId?: string;
  bannerId?: string;
}

function mapJsonToSnPublisher(raw: unknown): SnPublisher | null {
  const root: Record<string, unknown> | null = readRecord(raw);
  if (!root) {
    return null;
  }
  const id: string = pickString(root, ['id']);
  const name: string = pickString(root, ['name']);
  const nick: string = pickString(root, ['nick', 'nickname', 'display_name', 'displayName']);
  if (!id || !name) {
    return null;
  }
  const description: string | undefined = ((): string | undefined => {
    const d: string = pickString(root, ['description', 'bio', 'summary']);
    return d.length > 0 ? d : undefined;
  })();
  const pictureBlob: unknown = root.picture ?? root.avatar ?? root.portrait ?? null;
  const backgroundBlob: unknown = root.background ?? root.banner ?? root.cover ?? null;
  const avatar: string | undefined = ((): string | undefined => {
    const fromFile: string = resolvePictureUrlFromFileLike(pictureBlob);
    if (fromFile.length > 0) {
      return fromFile;
    }
    const direct: string = pickString(root, ['avatar', 'avatar_url', 'avatarUrl', 'picture_url', 'pictureUrl']);
    if (direct.length > 0) {
      return resolveMediaUrl(direct);
    }
    const idOnly: string = pickString(root, ['avatar_id', 'avatarId', 'picture_id', 'pictureId']);
    if (idOnly.length > 0) {
      return resolveMediaUrl(idOnly);
    }
    return undefined;
  })();
  const banner: string | undefined = ((): string | undefined => {
    const fromFile: string = resolvePictureUrlFromFileLike(backgroundBlob);
    if (fromFile.length > 0) {
      return fromFile;
    }
    const direct: string = pickString(root, [
      'banner',
      'banner_url',
      'bannerUrl',
      'background_url',
      'backgroundUrl',
      'cover',
      'cover_url',
      'coverUrl',
    ]);
    if (direct.length > 0) {
      return resolveMediaUrl(direct);
    }
    const idOnly: string = pickString(root, ['banner_id', 'bannerId', 'background_id', 'backgroundId']);
    if (idOnly.length > 0) {
      return resolveMediaUrl(idOnly);
    }
    return undefined;
  })();
  const accountId: string | undefined = ((): string | undefined => {
    const a: string = pickString(root, ['account_id', 'accountId']);
    if (a.length > 0) {
      return a;
    }
    const acc: Record<string, unknown> | null = readRecord(root.account ?? null);
    if (acc) {
      const inner: string = pickString(acc, ['id']);
      return inner.length > 0 ? inner : undefined;
    }
    return undefined;
  })();
  const now: string = new Date().toISOString();
  return {
    id,
    type: mapPublisherType(root.type ?? root.publisher_type ?? root.publisherType),
    name,
    nick: nick.length > 0 ? nick : name,
    description,
    avatar,
    banner,
    accountId,
    createdAt: readIsoDate(root.created_at ?? root.createdAt, now),
    updatedAt: readIsoDate(root.updated_at ?? root.updatedAt, now),
  };
}

function throwRequestError(error: unknown, fallbackMessage: string): never {
  if (error instanceof Error && error.message.length > 0) {
    throw error;
  }
  throw new Error(fallbackMessage);
}

function buildCreatePublisherBody(data: CreatePublisherRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: data.name,
    nick: data.nick,
    type: data.type,
  };
  if (data.description !== undefined && data.description.length > 0) {
    body.description = data.description;
  }
  if (data.avatarId !== undefined && data.avatarId.length > 0) {
    body.avatar_id = data.avatarId;
  }
  if (data.bannerId !== undefined && data.bannerId.length > 0) {
    body.banner_id = data.bannerId;
  }
  return body;
}

function buildUpdatePublisherBody(data: UpdatePublisherRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.nick !== undefined) {
    body.nick = data.nick;
  }
  if (data.description !== undefined) {
    body.description = data.description;
  }
  if (data.avatarId !== undefined) {
    body.avatar_id = data.avatarId;
  }
  if (data.bannerId !== undefined) {
    body.banner_id = data.bannerId;
  }
  return body;
}

/** 首个参数与 {@link ContentApiSync} 一致，请传入 `useContentApiSync()` 的返回值以便刷新 token。 */
export async function getMyPublishers(sync: ContentApiSync): Promise<SnPublisher[]> {
  try {
    const { items, tokenPair } = await performAuthorizedGetList('/sphere/publishers', sync.tokenPair);
    await syncTokenIfChanged(sync, tokenPair);
    const out: SnPublisher[] = [];
    for (const raw of items) {
      const mapped: SnPublisher | null = mapJsonToSnPublisher(raw);
      if (mapped) {
        out.push(mapped);
      }
    }
    return out;
  } catch (e: unknown) {
    throwRequestError(e, '获取我的发布者列表失败');
  }
}

export async function getPublishersByAccount(
  sync: ContentApiSync,
  accountId: string,
): Promise<SnPublisher[]> {
  try {
    const path: string = `/sphere/publishers/of/${encodeURIComponent(accountId)}`;
    const { items, tokenPair } = await performAuthorizedGetList(path, sync.tokenPair);
    await syncTokenIfChanged(sync, tokenPair);
    const out: SnPublisher[] = [];
    for (const raw of items) {
      const mapped: SnPublisher | null = mapJsonToSnPublisher(raw);
      if (mapped) {
        out.push(mapped);
      }
    }
    return out;
  } catch (e: unknown) {
    throwRequestError(e, '获取账户发布者列表失败');
  }
}

export async function getPublisher(sync: ContentApiSync, name: string): Promise<SnPublisher> {
  try {
    const path: string = `/sphere/publishers/${encodeURIComponent(name)}`;
    const { data, tokenPair } = await performAuthorizedFetch(path, { method: 'GET' }, sync.tokenPair);
    await syncTokenIfChanged(sync, tokenPair);
    const mapped: SnPublisher | null = mapJsonToSnPublisher(data);
    if (!mapped) {
      throw new Error('发布者数据格式无效');
    }
    return mapped;
  } catch (e: unknown) {
    throwRequestError(e, '获取发布者详情失败');
  }
}

export async function createPublisher(
  sync: ContentApiSync,
  data: CreatePublisherRequest,
): Promise<SnPublisher> {
  try {
    const body: string = JSON.stringify(buildCreatePublisherBody(data));
    const { data: raw, tokenPair } = await performAuthorizedFetch(
      '/sphere/publishers',
      { method: 'POST', body },
      sync.tokenPair,
    );
    await syncTokenIfChanged(sync, tokenPair);
    const mapped: SnPublisher | null = mapJsonToSnPublisher(raw);
    if (!mapped) {
      throw new Error('创建发布者响应无效');
    }
    return mapped;
  } catch (e: unknown) {
    throwRequestError(e, '创建发布者失败');
  }
}

export async function updatePublisher(
  sync: ContentApiSync,
  name: string,
  data: UpdatePublisherRequest,
): Promise<SnPublisher> {
  try {
    const body: string = JSON.stringify(buildUpdatePublisherBody(data));
    const path: string = `/sphere/publishers/${encodeURIComponent(name)}`;
    const { data: raw, tokenPair } = await performAuthorizedFetch(
      path,
      { method: 'PATCH', body },
      sync.tokenPair,
    );
    await syncTokenIfChanged(sync, tokenPair);
    const mapped: SnPublisher | null = mapJsonToSnPublisher(raw);
    if (!mapped) {
      throw new Error('更新发布者响应无效');
    }
    return mapped;
  } catch (e: unknown) {
    throwRequestError(e, '更新发布者失败');
  }
}

export async function deletePublisher(sync: ContentApiSync, name: string): Promise<void> {
  try {
    const path: string = `/sphere/publishers/${encodeURIComponent(name)}`;
    const { tokenPair } = await performAuthorizedFetch(path, { method: 'DELETE' }, sync.tokenPair);
    await syncTokenIfChanged(sync, tokenPair);
  } catch (e: unknown) {
    throwRequestError(e, '删除发布者失败');
  }
}

export async function getPublisherHeatmap(
  sync: ContentApiSync,
  name: string,
): Promise<Record<string, number>> {
  try {
    const path: string = `/sphere/publishers/${encodeURIComponent(name)}/heatmap`;
    const { data, tokenPair } = await performAuthorizedFetch(path, { method: 'GET' }, sync.tokenPair);
    await syncTokenIfChanged(sync, tokenPair);
    const root: Record<string, unknown> | null = readRecord(data);
    if (!root) {
      return {};
    }
    const nested: Record<string, unknown> | null = readRecord(root.data ?? root.heatmap ?? null);
    const source: Record<string, unknown> = nested ?? root;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(source)) {
      if (typeof v === 'number' && Number.isFinite(v)) {
        out[k] = v;
      } else if (typeof v === 'string' && v.length > 0) {
        const n: number = parseFloat(v);
        if (Number.isFinite(n)) {
          out[k] = n;
        }
      }
    }
    return out;
  } catch (e: unknown) {
    throwRequestError(e, '获取发布者热力图失败');
  }
}

export async function getPublisherStats(
  sync: ContentApiSync,
  name: string,
): Promise<{ totalPosts: number; totalViews: number; totalSubscribers: number }> {
  try {
    const path: string = `/sphere/publishers/${encodeURIComponent(name)}/stats`;
    const { data, tokenPair } = await performAuthorizedFetch(path, { method: 'GET' }, sync.tokenPair);
    await syncTokenIfChanged(sync, tokenPair);
    const root: Record<string, unknown> | null = readRecord(data);
    if (!root) {
      return { totalPosts: 0, totalViews: 0, totalSubscribers: 0 };
    }
    const inner: Record<string, unknown> | null = readRecord(root.data ?? null);
    const src: Record<string, unknown> = inner ?? root;
    const readInt = (obj: Record<string, unknown>, keys: string[]): number => {
      for (const key of keys) {
        const v: unknown = obj[key];
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
    };
    return {
      totalPosts: readInt(src, ['totalPosts', 'total_posts', 'posts', 'post_count', 'postCount']),
      totalViews: readInt(src, ['totalViews', 'total_views', 'views', 'view_count', 'viewCount']),
      totalSubscribers: readInt(src, [
        'totalSubscribers',
        'total_subscribers',
        'subscribers',
        'subscriber_count',
        'subscriberCount',
      ]),
    };
  } catch (e: unknown) {
    throwRequestError(e, '获取发布者统计失败');
  }
}

export async function unsubscribePublisher(sync: ContentApiSync, name: string): Promise<void> {
  try {
    const path: string = `/sphere/publishers/${encodeURIComponent(name)}/unsubscribe`;
    const { tokenPair } = await performAuthorizedFetch(path, { method: 'POST' }, sync.tokenPair);
    await syncTokenIfChanged(sync, tokenPair);
  } catch (e: unknown) {
    throwRequestError(e, '取消订阅发布者失败');
  }
}
