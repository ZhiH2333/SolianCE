import {
  performAuthorizedFetch,
  performAuthorizedGetAllowNotFound,
  performAuthorizedGetList,
} from '@/lib/api/http-client';
import type { TokenPair } from '@/lib/api/types';
import {
  mapJsonToFeedComment,
  mapJsonToFeedPost,
  mapTimelinePayloadToPosts,
} from '@/lib/api/map-sphere-post';
import type { FeedComment, FeedPost, NewsArticleSummary } from '@/lib/models/feed';

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

/** 已登录请求所需的 token + 写回上下文（刷新 access token 后同步） */
export interface ContentApiSync {
  tokenPair: TokenPair;
  executeSignIn: (pair: TokenPair) => Promise<void>;
}

export async function syncTokenIfChanged(sync: ContentApiSync, nextPair: TokenPair): Promise<void> {
  if (nextPair.token !== sync.tokenPair.token) {
    await sync.executeSignIn(nextPair);
  }
}

export async function fetchTimelineFeedPosts(sync: ContentApiSync, take: number): Promise<FeedPost[]> {
  const params: URLSearchParams = new URLSearchParams({
    take: String(take),
    mode: 'personalized',
    showFediverse: 'false',
  });
  const { data, tokenPair } = await performAuthorizedFetch(
    `/sphere/timeline?${params.toString()}`,
    { method: 'GET' },
    sync.tokenPair,
  );
  await syncTokenIfChanged(sync, tokenPair);
  return mapTimelinePayloadToPosts(data);
}

export async function fetchSpherePostsPage(
  sync: ContentApiSync,
  offset: number,
  take: number,
): Promise<{ posts: FeedPost[]; totalCount: number | null }> {
  const params: URLSearchParams = new URLSearchParams({
    offset: String(offset),
    take: String(take),
    orderDesc: 'true',
    replies: 'false',
  });
  const { items, tokenPair, totalCount } = await performAuthorizedGetList(
    `/sphere/posts?${params.toString()}`,
    sync.tokenPair,
  );
  await syncTokenIfChanged(sync, tokenPair);
  const posts: FeedPost[] = [];
  for (const raw of items) {
    const mapped: FeedPost | null = mapJsonToFeedPost(raw);
    if (mapped) {
      posts.push(mapped);
    }
  }
  return { posts, totalCount };
}

export async function fetchFeedPostById(sync: ContentApiSync, id: string): Promise<FeedPost | null> {
  const { data, tokenPair } = await performAuthorizedFetch(
    `/sphere/posts/${encodeURIComponent(id)}`,
    { method: 'GET' },
    sync.tokenPair,
  );
  await syncTokenIfChanged(sync, tokenPair);
  return mapJsonToFeedPost(data);
}

export async function fetchPostReplies(
  sync: ContentApiSync,
  postId: string,
  offset: number,
  take: number,
): Promise<FeedComment[]> {
  const params: URLSearchParams = new URLSearchParams({
    offset: String(offset),
    take: String(take),
  });
  const { items, tokenPair } = await performAuthorizedGetList(
    `/sphere/posts/${encodeURIComponent(postId)}/replies?${params.toString()}`,
    sync.tokenPair,
  );
  await syncTokenIfChanged(sync, tokenPair);
  const comments: FeedComment[] = [];
  for (const raw of items) {
    const c: FeedComment | null = mapJsonToFeedComment(raw, postId);
    if (c) {
      comments.push(c);
    }
  }
  return comments;
}

export async function fetchNotificationUnreadCount(sync: ContentApiSync): Promise<number> {
  const { data, tokenPair } = await performAuthorizedFetch('/ring/notifications/count', { method: 'GET' }, sync.tokenPair);
  await syncTokenIfChanged(sync, tokenPair);
  if (typeof data === 'number' && Number.isFinite(data)) {
    return data;
  }
  if (typeof data === 'string' && data.length > 0) {
    const n: number = parseInt(data, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export interface AccountMeDto {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  verified: boolean;
  bio: string;
}

export async function fetchAccountMe(sync: ContentApiSync): Promise<AccountMeDto | null> {
  const { data, tokenPair } = await performAuthorizedFetch('/passport/accounts/me', { method: 'GET' }, sync.tokenPair);
  await syncTokenIfChanged(sync, tokenPair);
  const root = readRecord(data);
  if (!root) {
    return null;
  }
  const id: string = pickString(root, ['id']) || 'me';
  const uname: string = pickString(root, ['uname', 'name']);
  const nick: string = pickString(root, ['nick', 'nickname']);
  const name: string = nick.length > 0 ? nick : uname.length > 0 ? uname : '用户';
  const handle: string = uname.length > 0 ? `@${uname}` : '@';
  let avatar: string = pickString(root, ['avatar']);
  const pfp = readRecord(root.profile_picture ?? root.profilePicture);
  if (pfp) {
    avatar = pickString(pfp, ['public_url', 'publicUrl', 'url']) || avatar;
  }
  const verifiedRaw: unknown = root.verified ?? root.is_verified ?? root.isVerified;
  const verified: boolean = verifiedRaw === true;
  const bio: string = pickString(root, ['bio', 'description', 'summary', 'about']);
  return { id, name, handle, avatar, verified, bio };
}

export interface NotableDayDto {
  localName: string;
  localizableKey: string | null;
  date: Date;
}

export async function fetchNextNotableDay(sync: ContentApiSync): Promise<NotableDayDto | null> {
  try {
    const { data, tokenPair } = await performAuthorizedFetch(
      '/passport/notable/me/next',
      { method: 'GET' },
      sync.tokenPair,
    );
    await syncTokenIfChanged(sync, tokenPair);
    const root = readRecord(data);
    if (!root) {
      return null;
    }
    const localizableKey: string | null = ((): string | null => {
      const k: string = pickString(root, ['localizable_key', 'localizableKey']);
      return k.length > 0 ? k : null;
    })();
    const localName: string = pickString(root, ['local_name', 'localName', 'name']);
    const dateStr: string = pickString(root, ['date', 'at', 'starts_at', 'startsAt']);
    const date: Date = dateStr.length > 0 ? new Date(dateStr) : new Date();
    return { localName, localizableKey, date };
  } catch {
    return null;
  }
}

export interface CheckInTodayStateDto {
  isCheckedIn: boolean;
  symbol: string;
  exp: number;
  coin: number;
  streak: number;
}

function pickNumberRecord(source: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const v: unknown = source[key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      return v;
    }
    if (typeof v === 'string' && v.length > 0) {
      const n: number = parseFloat(v);
      if (Number.isFinite(n)) {
        return n;
      }
    }
  }
  return 0;
}

function mapCheckInResultJson(root: Record<string, unknown>): CheckInTodayStateDto {
  const level: number = typeof root.level === 'number' ? root.level : 0;
  const tips: unknown = root.tips;
  let symbol: string = level > 0 ? `Lv.${level}` : '已签到';
  if (Array.isArray(tips) && tips.length > 0) {
    const first = readRecord(tips[0]);
    if (first) {
      const t: string = pickString(first, ['title', 'text']);
      if (t.length > 0) {
        symbol = t;
      }
    }
  }
  const streak: number = pickNumberRecord(root, ['streak', 'streak_days', 'streakDays']);
  return {
    isCheckedIn: true,
    symbol,
    exp: pickNumberRecord(root, ['exp', 'experience', 'exp_gain', 'expGain']),
    coin: pickNumberRecord(root, ['credits', 'coins', 'coin']),
    streak: streak > 0 ? streak : 1,
  };
}

export async function fetchCheckInToday(sync: ContentApiSync): Promise<CheckInTodayStateDto | null> {
  const result = await performAuthorizedGetAllowNotFound('/passport/accounts/me/check-in', sync.tokenPair);
  await syncTokenIfChanged(sync, result.tokenPair);
  if (result.data === null) {
    return null;
  }
  const root = readRecord(result.data);
  if (!root) {
    return null;
  }
  return mapCheckInResultJson(root);
}

export async function postCheckIn(sync: ContentApiSync): Promise<CheckInTodayStateDto> {
  const { data, tokenPair } = await performAuthorizedFetch('/passport/accounts/me/check-in', { method: 'POST' }, sync.tokenPair);
  await syncTokenIfChanged(sync, tokenPair);
  const root = readRecord(data);
  if (!root) {
    return { isCheckedIn: true, symbol: '已签到', exp: 0, coin: 0, streak: 1 };
  }
  return mapCheckInResultJson(root);
}

export async function fetchFirstNewsArticle(sync: ContentApiSync): Promise<NewsArticleSummary | null> {
  try {
    const params: URLSearchParams = new URLSearchParams({ limit: '1', offset: '0' });
    const { items, tokenPair } = await performAuthorizedGetList(
      `/insight/feeds/articles?${params.toString()}`,
      sync.tokenPair,
    );
    await syncTokenIfChanged(sync, tokenPair);
    if (items.length === 0) {
      return null;
    }
    const root = readRecord(items[0]);
    if (!root) {
      return null;
    }
    const id: string = pickString(root, ['id', 'hash', 'slug']) || 'article';
    const title: string = pickString(root, ['title', 'name']);
    const description: string =
      pickString(root, ['description', 'summary', 'content', 'excerpt']) || '';
    const publishedAt: string =
      pickString(root, ['published_at', 'publishedAt', 'created_at', 'createdAt']) ||
      new Date().toISOString();
    return { hash: id, title: title.length > 0 ? title : '文章', description, publishedAt };
  } catch {
    return null;
  }
}
