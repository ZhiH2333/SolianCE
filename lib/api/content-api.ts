import {
  performAuthorizedFetch,
  performAuthorizedGetAllowNotFound,
  performAuthorizedGetList,
} from '@/lib/api/http-client';
import { API_BASE_URL } from '@/lib/api/http-client';
import type { TokenPair } from '@/lib/api/api-types';
import {
  mapJsonToFeedComment,
  mapJsonToFeedPost,
  mapTimelinePayloadToPosts,
} from '@/lib/api/feed-post-mapper';
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

function resolveMediaUrl(raw: string): string {
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }
  if (raw.startsWith('/')) {
    return `${API_BASE_URL}${raw}`;
  }
  return `${API_BASE_URL}/drive/files/${raw}`;
}

/**
 * 与 `mapJsonToConversationListItem` 中会话 picture 一致：嵌套 url、file_meta、id/hash → Drive。
 */
function resolvePictureUrlFromFileLike(blob: unknown): string {
  const avatarRoot: Record<string, unknown> | null = readRecord(blob);
  if (!avatarRoot) {
    return '';
  }
  const avatarUrlValue: unknown = avatarRoot.url ?? null;
  const avatarUrlRoot: Record<string, unknown> | null = readRecord(avatarUrlValue);
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
  const avatarUrlFromMeta: string = ((): string => {
    const fileMeta: Record<string, unknown> | null = readRecord(avatarRoot.file_meta ?? null);
    const userMeta: Record<string, unknown> | null = readRecord(avatarRoot.user_meta ?? null);
    return (
      pickString(fileMeta ?? {}, ['public_url', 'publicUrl', 'url', 'download_url', 'downloadUrl']) ||
      pickString(userMeta ?? {}, ['public_url', 'publicUrl', 'url', 'download_url', 'downloadUrl']) ||
      ''
    );
  })();
  const fileId: string = pickString(avatarRoot, ['id', 'hash']);
  const avatarUrlFromId: string = fileId.length > 0 ? resolveMediaUrl(fileId) : '';
  return (
    pickString(avatarRoot, ['public_url', 'publicUrl', 'url', 'download_url', 'downloadUrl']) ||
    pickString(avatarUrlRoot ?? {}, ['public_url', 'publicUrl', 'url', 'download_url', 'downloadUrl']) ||
    avatarUrlFromMeta ||
    avatarUrlFromValue ||
    avatarUrlFromId ||
    ''
  );
}

/** 与 DM 成员 `account` + `account.profile.picture` 头像解析一致。 */
function resolvePortraitFromAccountRecord(account: Record<string, unknown> | null): string {
  if (!account) {
    return '';
  }
  const accountProfile: Record<string, unknown> | null = readRecord(account.profile ?? null);
  const avatarObj: Record<string, unknown> | null =
    readRecord(account.avatar) ??
    readRecord(account.picture) ??
    readRecord(account.profile_picture) ??
    readRecord(account.profilePicture) ??
    readRecord(accountProfile?.avatar) ??
    readRecord(accountProfile?.picture) ??
    readRecord(accountProfile?.profile_picture) ??
    readRecord(accountProfile?.profilePicture) ??
    null;
  const fromFileLike: string =
    resolvePictureUrlFromFileLike(account.avatar) ||
    resolvePictureUrlFromFileLike(account.picture) ||
    resolvePictureUrlFromFileLike(accountProfile?.picture) ||
    resolvePictureUrlFromFileLike(accountProfile?.avatar) ||
    '';
  if (fromFileLike.length > 0) {
    return fromFileLike;
  }
  const direct: string =
    pickString(account, ['avatar', 'picture', 'icon', 'photo']) ||
    pickString(accountProfile ?? {}, ['avatar', 'picture', 'icon', 'photo']) ||
    pickString(avatarObj ?? {}, ['public_url', 'publicUrl', 'url', 'download_url', 'downloadUrl']) ||
    '';
  if (direct.length > 0) {
    return resolveMediaUrl(direct);
  }
  const fallbackId: string =
    pickString(avatarObj ?? {}, ['id', 'hash']) ||
    pickString(account, ['avatar_id', 'avatarId', 'picture_id', 'pictureId']) ||
    pickString(accountProfile ?? {}, ['avatar_id', 'avatarId', 'picture_id', 'pictureId']);
  if (fallbackId.length === 0) {
    return '';
  }
  return resolveMediaUrl(fallbackId);
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

export interface ConversationListItemDto {
  id: string;
  name: string;
  isGroup: boolean;
  avatar: string;
  lastMessage: string;
  lastMessageSender: string;
  lastMessageTime: string;
  unread: number;
  isEncrypted: boolean;
}

function pickNumber(source: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value: unknown = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.length > 0) {
      const parsed: number = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return 0;
}

function mapJsonToConversationListItem(raw: unknown): ConversationListItemDto | null {
  const root: Record<string, unknown> | null = readRecord(raw);
  if (!root) {
    return null;
  }
  const id: string = pickString(root, ['id', 'chat_id', 'chatId']);
  if (!id) {
    return null;
  }
  const roomName: string = pickString(root, ['name', 'title', 'display_name', 'displayName', 'alias']);
  const firstMemberForDm: Record<string, unknown> | null = ((): Record<string, unknown> | null => {
    const membersRaw: unknown = root.members;
    if (!Array.isArray(membersRaw) || membersRaw.length === 0) {
      return null;
    }
    return readRecord(membersRaw[0]);
  })();
  const dmName: string = ((): string => {
    if (roomName.length > 0) {
      return roomName;
    }
    const firstMember: Record<string, unknown> | null = firstMemberForDm;
    if (!firstMember) {
      return '';
    }
    const account: Record<string, unknown> | null =
      readRecord(firstMember.account) ?? readRecord(firstMember.profile) ?? null;
    return (
      pickString(firstMember, ['nick', 'name', 'uname', 'username', 'display_name', 'displayName']) ||
      pickString(account ?? {}, ['nick', 'name', 'uname', 'username', 'display_name', 'displayName']) ||
      ''
    );
  })();
  const displayName: string = roomName.length > 0 ? roomName : dmName.length > 0 ? dmName : '聊天';
  const avatarRoot: Record<string, unknown> | null =
    readRecord(root.avatar) ??
    readRecord(root.picture) ??
    readRecord(root.profile_picture) ??
    readRecord(root.profilePicture);
  const avatarUrlValue: unknown = avatarRoot?.url ?? null;
  const avatarUrlRoot: Record<string, unknown> | null = readRecord(avatarUrlValue);
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
  const avatarUrlFromMeta: string = ((): string => {
    const fileMeta: Record<string, unknown> | null = readRecord(avatarRoot?.file_meta ?? null);
    const userMeta: Record<string, unknown> | null = readRecord(avatarRoot?.user_meta ?? null);
    return (
      pickString(fileMeta ?? {}, ['public_url', 'publicUrl', 'url', 'download_url', 'downloadUrl']) ||
      pickString(userMeta ?? {}, ['public_url', 'publicUrl', 'url', 'download_url', 'downloadUrl']) ||
      ''
    );
  })();
  const avatarUrlFromId: string = ((): string => {
    const fileId: string = pickString(avatarRoot ?? {}, ['id', 'hash']);
    if (fileId.length === 0) {
      return '';
    }
    return resolveMediaUrl(fileId);
  })();
  const avatarFromDmMember: string = ((): string => {
    if (roomName.length > 0) {
      return '';
    }
    const firstMember: Record<string, unknown> | null = firstMemberForDm;
    if (!firstMember) {
      return '';
    }
    const account: Record<string, unknown> | null =
      readRecord(firstMember.account) ??
      readRecord(firstMember.profile) ??
      null;
    const accountProfile: Record<string, unknown> | null = readRecord(account?.profile ?? null);
    const avatarObj: Record<string, unknown> | null =
      readRecord(account?.avatar) ??
      readRecord(account?.picture) ??
      readRecord(account?.profile_picture) ??
      readRecord(account?.profilePicture) ??
      readRecord(accountProfile?.avatar) ??
      readRecord(accountProfile?.picture) ??
      readRecord(accountProfile?.profile_picture) ??
      readRecord(accountProfile?.profilePicture) ??
      null;
    const direct: string =
      pickString(account ?? {}, ['avatar', 'picture', 'icon', 'photo']) ||
      pickString(accountProfile ?? {}, ['avatar', 'picture', 'icon', 'photo']) ||
      pickString(avatarObj ?? {}, ['public_url', 'publicUrl', 'url', 'download_url', 'downloadUrl']) ||
      '';
    if (direct.length > 0) {
      return resolveMediaUrl(direct);
    }
    const fallbackId: string =
      pickString(avatarObj ?? {}, ['id', 'hash']) ||
      pickString(account ?? {}, ['avatar_id', 'avatarId', 'picture_id', 'pictureId']) ||
      pickString(accountProfile ?? {}, ['avatar_id', 'avatarId', 'picture_id', 'pictureId']);
    if (fallbackId.length === 0) {
      return '';
    }
    return resolveMediaUrl(fallbackId);
  })();
  const avatar: string =
    pickString(root, ['avatar', 'picture', 'icon', 'photo']) ||
    pickString(avatarRoot ?? {}, ['public_url', 'publicUrl', 'url', 'download_url', 'downloadUrl']) ||
    pickString(avatarUrlRoot ?? {}, ['public_url', 'publicUrl', 'url', 'download_url', 'downloadUrl']) ||
    avatarUrlFromMeta ||
    avatarUrlFromValue ||
    avatarUrlFromId ||
    avatarFromDmMember ||
    '';
  const latestMessageRoot: Record<string, unknown> | null =
    readRecord(root.last_message) ?? readRecord(root.lastMessage) ?? readRecord(root.latest_message);
  const lastMessage: string =
    pickString(root, ['last_message_text', 'lastMessageText']) ||
    pickString(latestMessageRoot ?? {}, ['body', 'content', 'text']) ||
    '';
  const lastMessageSender: string =
    pickString(root, ['last_message_sender', 'lastMessageSender']) ||
    pickString(latestMessageRoot ?? {}, ['sender_name', 'senderName', 'author_name', 'authorName']) ||
    '';
  const lastMessageTime: string =
    pickString(root, ['last_message_time', 'lastMessageTime', 'updated_at', 'updatedAt']) ||
    pickString(latestMessageRoot ?? {}, ['created_at', 'createdAt', 'sent_at', 'sentAt']) ||
    new Date().toISOString();
  const unread: number = pickNumber(root, ['unread', 'unread_count', 'unreadCount', 'badge']);
  const isGroupRaw: unknown = root.is_group ?? root.isGroup ?? root.type;
  const isGroup: boolean =
    isGroupRaw === true ||
    isGroupRaw === 'group' ||
    isGroupRaw === 'channel' ||
    isGroupRaw === 'realm';
  const isEncryptedRaw: unknown = root.is_encrypted ?? root.isEncrypted ?? root.mls_enabled ?? root.mlsEnabled;
  const isEncrypted: boolean = isEncryptedRaw === true;
  return {
    id,
    name: displayName,
    isGroup,
    avatar,
    lastMessage,
    lastMessageSender: lastMessageSender.length > 0 ? lastMessageSender : '系统',
    lastMessageTime,
    unread,
    isEncrypted,
  };
}

export async function fetchChatConversationsPage(
  sync: ContentApiSync,
  offset: number,
  take: number,
): Promise<{ items: ConversationListItemDto[]; totalCount: number | null }> {
  const params: URLSearchParams = new URLSearchParams({
    offset: String(offset),
    take: String(take),
  });
  const { items: rawItems, tokenPair, totalCount } = await performAuthorizedGetList(
    `/messager/chat?${params.toString()}`,
    sync.tokenPair,
  );
  await syncTokenIfChanged(sync, tokenPair);
  const items: ConversationListItemDto[] = [];
  for (const raw of rawItems) {
    const mapped: ConversationListItemDto | null = mapJsonToConversationListItem(raw);
    if (mapped) {
      items.push(mapped);
    }
  }
  return { items, totalCount };
}

export async function fetchChatConversationById(
  sync: ContentApiSync,
  conversationId: string,
): Promise<ConversationListItemDto | null> {
  const { data, tokenPair } = await performAuthorizedFetch(
    `/messager/chat/${encodeURIComponent(conversationId)}`,
    { method: 'GET' },
    sync.tokenPair,
  );
  await syncTokenIfChanged(sync, tokenPair);
  return mapJsonToConversationListItem(data);
}

export interface ChatMessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  sentAt: string;
  isEncrypted: boolean;
  quoteSenderName: string | null;
  quoteContent: string | null;
}

function mapJsonToChatMessage(raw: unknown, conversationId: string): ChatMessageDto | null {
  const root: Record<string, unknown> | null = readRecord(raw);
  if (!root) {
    return null;
  }
  const id: string = pickString(root, ['id', 'message_id', 'messageId']);
  if (!id) {
    return null;
  }
  const senderRoot: Record<string, unknown> | null =
    readRecord(root.sender) ?? readRecord(root.author) ?? readRecord(root.account);
  const senderAccountRoot: Record<string, unknown> | null =
    readRecord(senderRoot?.account) ?? readRecord(senderRoot?.profile) ?? null;
  const senderId: string =
    pickString(root, ['sender_id', 'senderId', 'author_id', 'authorId']) ||
    pickString(senderRoot ?? {}, ['id', 'uid', 'account_id', 'accountId']);
  const senderName: string =
    pickString(root, ['sender_name', 'senderName', 'author_name', 'authorName']) ||
    pickString(senderRoot ?? {}, ['nick', 'name', 'uname', 'username', 'display_name', 'displayName']) ||
    pickString(senderAccountRoot ?? {}, ['nick', 'name', 'uname', 'username', 'display_name', 'displayName']) ||
    '用户';
  const senderAvatar: string =
    resolvePictureUrlFromFileLike(senderRoot?.picture) ||
    resolvePictureUrlFromFileLike(senderRoot?.avatar) ||
    pickString(senderRoot ?? {}, ['avatar', 'picture', 'icon']) ||
    resolvePortraitFromAccountRecord(senderAccountRoot) ||
    resolvePortraitFromAccountRecord(senderRoot) ||
    '';
  const content: string =
    pickString(root, ['body', 'content', 'text', 'message']) ||
    pickString(readRecord(root.payload) ?? {}, ['body', 'text']) ||
    '';
  const sentAt: string =
    pickString(root, ['sent_at', 'sentAt', 'created_at', 'createdAt', 'timestamp']) ||
    new Date().toISOString();
  const encryptedRaw: unknown =
    root.is_encrypted ?? root.isEncrypted ?? root.mls_encrypted ?? root.mlsEncrypted;
  const isEncrypted: boolean = encryptedRaw === true;
  const quoteRoot: Record<string, unknown> | null =
    readRecord(root.quote) ?? readRecord(root.reply_to) ?? readRecord(root.replyTo);
  const quoteSenderNameRaw: string =
    pickString(quoteRoot ?? {}, ['sender_name', 'senderName', 'author_name', 'authorName']) ||
    pickString(readRecord(quoteRoot?.sender) ?? {}, ['nick', 'name', 'uname']);
  const quoteContentRaw: string =
    pickString(quoteRoot ?? {}, ['content', 'body', 'text']) ||
    pickString(readRecord(quoteRoot?.payload) ?? {}, ['content', 'body', 'text']);
  return {
    id,
    conversationId,
    senderId,
    senderName,
    senderAvatar,
    content,
    sentAt,
    isEncrypted,
    quoteSenderName: quoteSenderNameRaw.length > 0 ? quoteSenderNameRaw : null,
    quoteContent: quoteContentRaw.length > 0 ? quoteContentRaw : null,
  };
}

export async function fetchChatMessagesPage(
  sync: ContentApiSync,
  conversationId: string,
  offset: number,
  take: number,
): Promise<{ items: ChatMessageDto[]; totalCount: number | null }> {
  const params: URLSearchParams = new URLSearchParams({
    offset: String(offset),
    take: String(take),
  });
  const { items: rawItems, tokenPair, totalCount } = await performAuthorizedGetList(
    `/messager/chat/${encodeURIComponent(conversationId)}/messages?${params.toString()}`,
    sync.tokenPair,
  );
  await syncTokenIfChanged(sync, tokenPair);
  const items: ChatMessageDto[] = [];
  for (const raw of rawItems) {
    const mapped: ChatMessageDto | null = mapJsonToChatMessage(raw, conversationId);
    if (mapped) {
      items.push(mapped);
    }
  }
  items.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
  return { items, totalCount };
}

export function mergeChatMessagesById(
  previous: ChatMessageDto[],
  incoming: ChatMessageDto[],
): ChatMessageDto[] {
  const map: Map<string, ChatMessageDto> = new Map<string, ChatMessageDto>();
  for (const m of previous) {
    map.set(m.id, m);
  }
  for (const m of incoming) {
    map.set(m.id, m);
  }
  return [...map.values()].sort(
    (a: ChatMessageDto, b: ChatMessageDto) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
  );
}

/**
 * 首屏加载「最新一页」：假定 GET messages 的 offset 从最早消息算起、返回按时间升序，
 * 且列表响应带 `X-Total`（见 `performAuthorizedGetList`）。若 total 缺失则退化为 offset=0 的一页。
 */
export async function fetchChatMessagesInitialWindow(
  sync: ContentApiSync,
  conversationId: string,
  take: number,
): Promise<{
  items: ChatMessageDto[];
  totalCount: number | null;
  oldestLoadedOffset: number;
  hasMoreOlder: boolean;
}> {
  const first: { items: ChatMessageDto[]; totalCount: number | null } = await fetchChatMessagesPage(
    sync,
    conversationId,
    0,
    take,
  );
  const total: number | null = first.totalCount;
  if (total !== null && total > take) {
    const start: number = Math.max(0, total - take);
    const latest: { items: ChatMessageDto[]; totalCount: number | null } = await fetchChatMessagesPage(
      sync,
      conversationId,
      start,
      take,
    );
    return {
      items: latest.items,
      totalCount: total,
      oldestLoadedOffset: start,
      hasMoreOlder: start > 0,
    };
  }
  return {
    items: first.items,
    totalCount: total,
    oldestLoadedOffset: 0,
    hasMoreOlder: false,
  };
}

/** 向更早方向再取一页并前移 `oldestLoadedOffset`。 */
export async function fetchChatMessagesOlderChunk(
  sync: ContentApiSync,
  conversationId: string,
  oldestLoadedOffset: number,
  take: number,
): Promise<{
  items: ChatMessageDto[];
  nextOldestOffset: number;
  hasMoreOlder: boolean;
}> {
  if (oldestLoadedOffset <= 0) {
    return { items: [], nextOldestOffset: 0, hasMoreOlder: false };
  }
  const nextOffset: number = Math.max(0, oldestLoadedOffset - take);
  const page: { items: ChatMessageDto[]; totalCount: number | null } = await fetchChatMessagesPage(
    sync,
    conversationId,
    nextOffset,
    take,
  );
  return {
    items: page.items,
    nextOldestOffset: nextOffset,
    hasMoreOlder: nextOffset > 0,
  };
}

export async function postChatMessage(
  sync: ContentApiSync,
  conversationId: string,
  content: string,
): Promise<ChatMessageDto | null> {
  const body: string = JSON.stringify({ content });
  const { data, tokenPair } = await performAuthorizedFetch(
    `/messager/chat/${encodeURIComponent(conversationId)}/messages`,
    { method: 'POST', body },
    sync.tokenPair,
  );
  await syncTokenIfChanged(sync, tokenPair);
  return mapJsonToChatMessage(data, conversationId);
}

export interface RealmListItemDto {
  id: string;
  name: string;
  description: string;
  banner: string;
  avatar: string;
}

function mapJsonToRealmListItem(raw: unknown): RealmListItemDto | null {
  const root: Record<string, unknown> | null = readRecord(raw);
  if (!root) {
    return null;
  }
  const id: string = pickString(root, ['id', 'slug', 'identifier']);
  if (!id) {
    return null;
  }
  const name: string = pickString(root, ['name', 'alias', 'title']) || '未命名领域';
  const description: string = pickString(root, ['description', 'bio', 'summary']);
  const bannerRoot: Record<string, unknown> | null =
    readRecord(root.banner) ?? readRecord(root.background) ?? readRecord(root.cover);
  const avatarRoot: Record<string, unknown> | null =
    readRecord(root.avatar) ?? readRecord(root.icon) ?? readRecord(root.profile_picture);
  const banner: string =
    pickString(root, ['banner', 'cover', 'background']) ||
    pickString(bannerRoot ?? {}, ['public_url', 'publicUrl', 'url']) ||
    '';
  const avatar: string =
    pickString(root, ['avatar', 'icon']) ||
    pickString(avatarRoot ?? {}, ['public_url', 'publicUrl', 'url']) ||
    '';
  return {
    id,
    name,
    description,
    banner,
    avatar,
  };
}

export async function fetchRealmsPage(
  sync: ContentApiSync,
  offset: number,
  take: number,
): Promise<{ items: RealmListItemDto[]; totalCount: number | null }> {
  const params: URLSearchParams = new URLSearchParams({
    offset: String(offset),
    take: String(take),
  });
  const { items: rawItems, tokenPair, totalCount } = await performAuthorizedGetList(
    `/passport/realms?${params.toString()}`,
    sync.tokenPair,
  );
  await syncTokenIfChanged(sync, tokenPair);
  const items: RealmListItemDto[] = [];
  for (const raw of rawItems) {
    const mapped: RealmListItemDto | null = mapJsonToRealmListItem(raw);
    if (mapped) {
      items.push(mapped);
    }
  }
  return { items, totalCount };
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

export interface NotificationItemDto {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
  postId: string | null;
}

function mapJsonToNotificationItem(raw: unknown): NotificationItemDto | null {
  const root: Record<string, unknown> | null = readRecord(raw);
  if (!root) {
    return null;
  }
  const id: string =
    pickString(root, ['id', 'notification_id', 'notificationId']) ||
    pickString(readRecord(root.data) ?? {}, ['id']) ||
    '';
  if (!id) {
    return null;
  }
  const title: string =
    pickString(root, ['title', 'subject', 'name']) ||
    pickString(readRecord(root.data) ?? {}, ['title', 'subject']) ||
    '通知';
  const body: string =
    pickString(root, ['body', 'content', 'message', 'description']) ||
    pickString(readRecord(root.data) ?? {}, ['body', 'content', 'message']) ||
    '';
  const createdAt: string =
    pickString(root, ['created_at', 'createdAt', 'at', 'time']) ||
    new Date().toISOString();
  const isReadRaw: unknown = root.is_read ?? root.isRead ?? root.read ?? false;
  const isRead: boolean = isReadRaw === true;
  const postId: string = ((): string => {
    const direct: string = pickString(root, ['post_id', 'postId', 'related_post_id', 'relatedPostId']);
    if (direct) {
      return direct;
    }
    const post: Record<string, unknown> | null = readRecord(root.post);
    if (post) {
      return pickString(post, ['id', 'post_id', 'postId']);
    }
    const data: Record<string, unknown> | null = readRecord(root.data);
    if (data) {
      return pickString(data, ['post_id', 'postId']);
    }
    return '';
  })();
  return { id, title, body, createdAt, isRead, postId: postId || null };
}

export async function fetchNotificationsPage(
  sync: ContentApiSync,
  offset: number,
  take: number,
): Promise<{ items: NotificationItemDto[]; totalCount: number | null }> {
  const params: URLSearchParams = new URLSearchParams({
    offset: String(offset),
    take: String(take),
  });
  const { items: rawItems, tokenPair, totalCount } = await performAuthorizedGetList(
    `/ring/notifications?${params.toString()}`,
    sync.tokenPair,
  );
  await syncTokenIfChanged(sync, tokenPair);
  const items: NotificationItemDto[] = [];
  for (const raw of rawItems) {
    const mapped: NotificationItemDto | null = mapJsonToNotificationItem(raw);
    if (mapped) {
      items.push(mapped);
    }
  }
  return { items, totalCount };
}

export async function markNotificationRead(sync: ContentApiSync, id: string): Promise<void> {
  const endpointCandidates: Array<{ path: string; method: 'POST' | 'PATCH'; body?: unknown }> = [
    { path: `/ring/notifications/${encodeURIComponent(id)}/read`, method: 'POST' },
    { path: `/ring/notifications/${encodeURIComponent(id)}/mark-read`, method: 'POST' },
    { path: `/ring/notifications/${encodeURIComponent(id)}`, method: 'PATCH', body: { is_read: true } },
  ];
  let lastError: unknown = null;
  for (const endpoint of endpointCandidates) {
    try {
      const { tokenPair } = await performAuthorizedFetch(
        endpoint.path,
        {
          method: endpoint.method,
          body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
        },
        sync.tokenPair,
      );
      await syncTokenIfChanged(sync, tokenPair);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('标记已读失败');
}

export async function markAllNotificationsRead(sync: ContentApiSync): Promise<void> {
  const endpointCandidates: string[] = ['/ring/notifications/read', '/ring/notifications/read/all'];
  let lastError: unknown = null;
  for (const path of endpointCandidates) {
    try {
      const { tokenPair } = await performAuthorizedFetch(path, { method: 'POST' }, sync.tokenPair);
      await syncTokenIfChanged(sync, tokenPair);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('全部已读失败');
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
