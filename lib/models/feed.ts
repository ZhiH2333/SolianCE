/** 帖子与动态流在 UI 层使用的数据结构（与历史 Mock 形状一致，便于不改布局接 API） */

export interface FeedPostAuthor {
  name: string;
  handle: string;
  avatar: string;
}

export interface FeedReaction {
  emoji: string;
  label: string;
  count: number;
  reacted: boolean;
}

export interface FeedLinkPreview {
  title: string;
  description: string;
  url: string;
  source: string;
}

export interface FeedPost {
  id: string;
  author: FeedPostAuthor;
  title?: string;
  content: string;
  publishedAt: string;
  isEdited?: boolean;
  likes: number;
  comments: number;
  reposts: number;
  tags: string[];
  liked: boolean;
  imageUrl?: string;
  linkPreview?: FeedLinkPreview;
  commentPreview?: string;
  reactions?: FeedReaction[];
}

export interface FeedComment {
  id: string;
  postId: string;
  author: FeedPostAuthor;
  content: string;
  publishedAt: string;
  likes: number;
}

export interface NewsArticleSummary {
  hash: string;
  title: string;
  description: string;
  publishedAt: string;
}

/** @deprecated 使用 FeedPost */
export type MockPost = FeedPost;
/** @deprecated 使用 FeedPostAuthor */
export type MockPostAuthor = FeedPostAuthor;
/** @deprecated 使用 FeedReaction */
export type MockReaction = FeedReaction;
/** @deprecated 使用 FeedLinkPreview */
export type MockLinkPreview = FeedLinkPreview;
/** @deprecated 使用 FeedComment */
export type MockComment = FeedComment;
