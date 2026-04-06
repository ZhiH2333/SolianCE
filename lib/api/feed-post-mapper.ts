import type { FeedComment, FeedPost, FeedPostAuthor, FeedReaction } from '@/lib/models/feed';
import { API_BASE_URL } from '@/lib/api/http-client';

const REACTION_SYMBOL_LABELS: Record<string, string> = {
  thumb_up: '顶',
  angry: '怒',
  clap: '鼓掌',
  confuse: '疑惑',
  pray: '祈祷',
  party: '派对',
};

const REACTION_SYMBOL_EMOJI: Record<string, string> = {
  thumb_up: '👍',
  angry: '😠',
  clap: '👏',
  confuse: '😕',
  pray: '🙏',
  party: '🎉',
};

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

function pickNumber(source: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const v: unknown = source[key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      return v;
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

function pickBool(source: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const v: unknown = source[key];
    if (typeof v === 'boolean') {
      return v;
    }
  }
  return undefined;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function resolveMediaUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || raw.length === 0) {
    return undefined;
  }
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }
  if (raw.startsWith('/')) {
    return `${API_BASE_URL}${raw}`;
  }
  return `${API_BASE_URL}/drive/files/${raw}`;
}

/** 与 content-api `resolvePictureUrlFromFileLike`、聊天头像解析一致 */
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
  const avatarUrlFromId: string = fileId.length > 0 ? (resolveMediaUrl(fileId) ?? '') : '';
  return (
    pickString(avatarRoot, ['public_url', 'publicUrl', 'url', 'download_url', 'downloadUrl']) ||
    pickString(avatarUrlRoot ?? {}, ['public_url', 'publicUrl', 'url', 'download_url', 'downloadUrl']) ||
    avatarUrlFromMeta ||
    avatarUrlFromValue ||
    avatarUrlFromId ||
    ''
  );
}

/** 与 content-api `resolvePortraitFromAccountRecord` 一致，用于帖子/评论 publisher */
function resolvePortraitFromPublisherRecord(account: Record<string, unknown> | null): string {
  if (!account) {
    return '';
  }
  const accountProfile: Record<string, unknown> | null = readRecord(account.profile ?? null);
  const avatarObj: Record<string, unknown> | null =
    readRecord(account.avatar) ??
    readRecord(account.picture) ??
    readRecord(account.profile_picture) ??
    readRecord(account.profilePicture) ??
    readRecord(accountProfile?.avatar as unknown) ??
    readRecord(accountProfile?.picture as unknown) ??
    readRecord(accountProfile?.profile_picture as unknown) ??
    readRecord(accountProfile?.profilePicture as unknown) ??
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
    return resolveMediaUrl(direct) ?? '';
  }
  const fallbackId: string =
    pickString(avatarObj ?? {}, ['id', 'hash']) ||
    pickString(account, ['avatar_id', 'avatarId', 'picture_id', 'pictureId']) ||
    pickString(accountProfile ?? {}, ['avatar_id', 'avatarId', 'picture_id', 'pictureId']);
  if (fallbackId.length === 0) {
    return '';
  }
  return resolveMediaUrl(fallbackId) ?? '';
}

function mapPublisher(author: Record<string, unknown> | null): FeedPostAuthor {
  if (!author) {
    return { name: '未知用户', handle: '@unknown', avatar: '' };
  }
  const uname: string = pickString(author, ['uname', 'name', 'username']);
  const nick: string = pickString(author, ['nick', 'nickname', 'display_name', 'displayName']);
  const name: string = nick.length > 0 ? nick : uname.length > 0 ? uname : '用户';
  const handle: string = uname.length > 0 ? `@${uname}` : '@user';
  let avatar: string = resolvePortraitFromPublisherRecord(author);
  if (avatar.length > 0 && !avatar.startsWith('http')) {
    avatar = resolveMediaUrl(avatar) ?? avatar;
  }
  return { name, handle, avatar };
}

function firstImageFromAttachments(root: Record<string, unknown>): string | undefined {
  const attachments: unknown = root.attachments;
  if (!Array.isArray(attachments)) {
    return undefined;
  }
  for (const item of attachments) {
    const file = readRecord(item);
    if (!file) {
      continue;
    }
    const mime: string = pickString(file, ['mime', 'mime_type', 'mimeType']);
    if (mime.startsWith('image/')) {
      const url: string | undefined =
        resolveMediaUrl(pickString(file, ['public_url', 'publicUrl', 'url', 'direct_url', 'directUrl'])) ||
        resolveMediaUrl(pickString(file, ['id']));
      if (url) {
        return url;
      }
    }
  }
  return undefined;
}

function mapReactions(root: Record<string, unknown>): FeedReaction[] | undefined {
  const reactionsCount: unknown = root.reactions_count ?? root.reactionsCount;
  const rec = readRecord(reactionsCount);
  if (!rec || Object.keys(rec).length === 0) {
    return undefined;
  }
  const myRaw: unknown = root.my_reactions ?? root.myReactions;
  const myList: string[] = Array.isArray(myRaw)
    ? myRaw.filter((x): x is string => typeof x === 'string')
    : [];
  const out: FeedReaction[] = [];
  for (const [symbol, countVal] of Object.entries(rec)) {
    const count: number = typeof countVal === 'number' ? countVal : parseInt(String(countVal), 10) || 0;
    if (count <= 0) {
      continue;
    }
    const label: string = REACTION_SYMBOL_LABELS[symbol] ?? symbol;
    const emoji: string = REACTION_SYMBOL_EMOJI[symbol] ?? '·';
    out.push({
      emoji,
      label,
      count,
      reacted: myList.includes(symbol),
    });
  }
  return out.length > 0 ? out : undefined;
}

function mapTags(root: Record<string, unknown>): string[] {
  const tags: unknown = root.tags ?? root.hashtags;
  if (!Array.isArray(tags)) {
    return [];
  }
  return tags
    .map((t) => (typeof t === 'string' ? t : pickString(readRecord(t) ?? {}, ['name', 'slug', 'id'])))
    .filter((s) => s.length > 0);
}

export function mapJsonToFeedPost(raw: unknown): FeedPost | null {
  const root = readRecord(raw);
  if (!root) {
    return null;
  }
  const id: string = pickString(root, ['id']);
  if (!id) {
    return null;
  }
  const publisher: Record<string, unknown> | null =
    readRecord(root.publisher as unknown) ??
    readRecord(root.account as unknown) ??
    readRecord(root.author as unknown);
  const author: FeedPostAuthor = mapPublisher(publisher);
  const contentType: number = pickNumber(root, ['content_type', 'contentType']);
  let content: string = pickString(root, ['content', 'text', 'body']);
  if (contentType === 1 && content.length > 0) {
    content = stripHtml(content);
  }
  const publishedAtRaw: string =
    pickString(root, ['created_at', 'createdAt', 'published_at', 'publishedAt']) || new Date().toISOString();
  const editedAtLine: string = pickString(root, ['edited_at', 'editedAt']);
  const isEdited: boolean | undefined =
    editedAtLine.length > 0 ? true : pickBool(root, ['is_edited', 'isEdited']);
  const score: number = pickNumber(root, ['score', 'upvotes', 'likes']);
  const replyCount: number = pickNumber(root, ['reply_count', 'replyCount', 'replies', 'comments_count', 'commentsCount']);
  const repostCount: number = pickNumber(root, ['repost_count', 'repostCount', 'reposts']);
  const title: string | undefined = ((): string | undefined => {
    const t: string = pickString(root, ['title', 'subject']);
    return t.length > 0 ? t : undefined;
  })();
  const imageUrl: string | undefined = firstImageFromAttachments(root);
  const embeds: unknown = root.embeds ?? root.embeddings;
  let linkPreview: FeedPost['linkPreview'];
  if (Array.isArray(embeds) && embeds.length > 0) {
    const first = readRecord(embeds[0]);
    if (first) {
      const url: string = pickString(first, ['url', 'link']);
      if (url.length > 0) {
        linkPreview = {
          title: pickString(first, ['title', 'site_name', 'siteName']) || url,
          description: pickString(first, ['description', 'summary']),
          url,
          source: pickString(first, ['provider', 'source']) || '',
        };
      }
    }
  }
  return {
    id,
    author,
    title,
    content: content.length > 0 ? content : ' ',
    publishedAt: publishedAtRaw,
    isEdited: isEdited === true,
    likes: score,
    comments: replyCount,
    reposts: repostCount,
    tags: mapTags(root),
    liked: false,
    imageUrl,
    linkPreview,
    reactions: mapReactions(root),
  };
}

export function mapTimelinePayloadToPosts(payload: unknown): FeedPost[] {
  const root = readRecord(payload);
  if (!root) {
    return [];
  }
  const items: unknown = root.items;
  if (!Array.isArray(items)) {
    return [];
  }
  const posts: FeedPost[] = [];
  for (const ev of items) {
    const eventRec = readRecord(ev);
    if (!eventRec) {
      continue;
    }
    const data = eventRec.data;
    const postRec = readRecord(data);
    if (postRec) {
      const mapped = mapJsonToFeedPost(postRec);
      if (mapped) {
        posts.push(mapped);
      }
    }
  }
  return posts;
}

export function mapJsonToFeedComment(raw: unknown, parentPostId: string): FeedComment | null {
  const root = readRecord(raw);
  if (!root) {
    return null;
  }
  const id: string = pickString(root, ['id']);
  if (!id) {
    return null;
  }
  const publisher: Record<string, unknown> | null =
    readRecord(root.publisher as unknown) ??
    readRecord(root.account as unknown) ??
    readRecord(root.author as unknown);
  const contentType: number = pickNumber(root, ['content_type', 'contentType']);
  let content: string = pickString(root, ['content', 'text']);
  if (contentType === 1 && content.length > 0) {
    content = stripHtml(content);
  }
  const publishedAt: string =
    pickString(root, ['created_at', 'createdAt']) || new Date().toISOString();
  return {
    id,
    postId: parentPostId,
    author: mapPublisher(publisher),
    content: content.length > 0 ? content : ' ',
    publishedAt,
    likes: pickNumber(root, ['score', 'upvotes', 'likes']),
  };
}
