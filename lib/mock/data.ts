export interface MockUser {
  id: string;
  name: string;
  handle: string;
  bio: string;
  avatar: string;
  followers: number;
  following: number;
  verified: boolean;
}

export interface MockPostAuthor {
  name: string;
  handle: string;
  avatar: string;
}

export interface MockReaction {
  emoji: string;
  label: string;
  count: number;
  reacted: boolean;
}

export interface MockLinkPreview {
  title: string;
  description: string;
  url: string;
  source: string;
}

export interface MockPost {
  id: string;
  author: MockPostAuthor;
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
  linkPreview?: MockLinkPreview;
  commentPreview?: string;
  reactions?: MockReaction[];
}

export interface MockConversation {
  id: string;
  name: string;
  isGroup: boolean;
  avatar: string;
  lastMessage: string;
  lastMessageSender: string;
  lastMessageTime: string;
  unread: number;
  isEncrypted?: boolean;
}

export interface MockMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  sentAt: string;
  isSelf: boolean;
}

export interface MockComment {
  id: string;
  author: MockPostAuthor;
  content: string;
  publishedAt: string;
  likes: number;
}

export const MOCK_USER: MockUser = {
  id: "user_001",
  name: "HugeSheep",
  handle: "@huge_sheep",
  bio: "Developer & ACG enthusiast ✨",
  avatar: "https://i.pravatar.cc/150?img=12",
  followers: 1024,
  following: 256,
  verified: true,
};

export const MOCK_POSTS: MockPost[] = [
  {
    id: "post_001",
    author: {
      name: "Solsynth LLC",
      handle: "@solsynth",
      avatar: "https://i.pravatar.cc/150?img=12",
    },
    title: "迁移到 v3 的通知",
    content:
      "经过小羊艰苦的八小时奋斗，大部份数据已经迁移到 v3 版本。\n\n除了钱包、以前的签到记录、密码之外的验证方式（V3 尚未实现），所有数据基本迁移完成。\n\n欢迎前往新网域 https://solian.app 体验。原生客户端将会在后续几天陆续发布。",
    publishedAt: "2025-03-21T10:00:00Z",
    isEdited: true,
    likes: 3,
    comments: 2,
    reposts: 0,
    tags: ["SolarNetwork"],
    liked: false,
    imageUrl: "https://picsum.photos/seed/solian1/600/320",
    linkPreview: {
      title: "Solar Network",
      description: "A new Flutter project.",
      url: "https://solian.app",
      source: "由 HyperNet.Reader 提供支持",
    },
    commentPreview: "八小时，的确很苦，点赞了🤌😈🫰",
    reactions: [
      { emoji: "👍", label: "顶", count: 3, reacted: false },
      { emoji: "👍", label: "thumb_up", count: 3, reacted: false },
    ],
  },
  {
    id: "post_002",
    author: {
      name: "LittleSheep",
      handle: "@little_sheep",
      avatar: "https://i.pravatar.cc/150?img=12",
    },
    title: "Solar Network v3 性能优化报告",
    content:
      "Just deployed the new Solar Network update! The performance improvements are incredible 🚀 The new architecture handles 10x more concurrent connections and latency dropped by 60%.",
    publishedAt: "2025-03-23T08:30:00Z",
    likes: 42,
    comments: 7,
    reposts: 3,
    tags: ["SolarNetwork", "Dev"],
    liked: false,
    commentPreview: "Great work! The new architecture is much faster.",
    reactions: [
      { emoji: "🚀", label: "太棒了", count: 12, reacted: true },
      { emoji: "❤️", label: "喜欢", count: 8, reacted: false },
    ],
  },
  {
    id: "post_003",
    author: {
      name: "Akira Tanaka",
      handle: "@akira_dev",
      avatar: "https://i.pravatar.cc/150?img=33",
    },
    content:
      "今日もコードを書いていたら気づいたら朝になってた。でも納得のいく実装ができた！やっぱりプログラミングは楽しい。",
    publishedAt: "2025-03-23T07:10:00Z",
    likes: 89,
    comments: 12,
    reposts: 5,
    tags: ["Programming"],
    liked: true,
    reactions: [{ emoji: "💪", label: "加油", count: 20, reacted: true }],
  },
  {
    id: "post_004",
    author: {
      name: "Maria Chen",
      handle: "@maria_ux",
      avatar: "https://i.pravatar.cc/150?img=47",
    },
    title: "Material You 新设计预览",
    content:
      "Just finished the new onboarding flow design. Material You dynamic colors make everything feel so cohesive! Sharing the Figma file soon 🎨",
    publishedAt: "2025-03-23T06:45:00Z",
    likes: 156,
    comments: 23,
    reposts: 18,
    tags: ["Design", "MaterialYou", "UX"],
    liked: false,
    imageUrl: "https://picsum.photos/seed/design1/600/300",
    commentPreview: "The color palette is stunning! 😍",
    reactions: [
      { emoji: "🎨", label: "美", count: 45, reacted: false },
      { emoji: "👍", label: "顶", count: 31, reacted: false },
    ],
  },
  {
    id: "post_005",
    author: {
      name: "DevBot9000",
      handle: "@devbot9k",
      avatar: "https://i.pravatar.cc/150?img=68",
    },
    content:
      'Pro tip: When debugging async code, always check if your promises are properly awaited. 90% of "random" bugs are just unhandled promise rejections hiding in production.',
    publishedAt: "2025-03-23T05:20:00Z",
    likes: 312,
    comments: 41,
    reposts: 87,
    tags: ["JavaScript", "WebDev", "Tips"],
    liked: true,
    reactions: [
      { emoji: "💡", label: "有用", count: 87, reacted: false },
      { emoji: "👍", label: "顶", count: 42, reacted: true },
    ],
  },
  {
    id: "post_006",
    author: {
      name: "Yuki Sato",
      handle: "@yuki_anime",
      avatar: "https://i.pravatar.cc/150?img=25",
    },
    content:
      "新しいアニメシーズンが始まった！今期は特に楽しみにしているタイトルがたくさんある。皆さんは何を見ていますか？",
    publishedAt: "2025-03-23T04:15:00Z",
    likes: 203,
    comments: 56,
    reposts: 12,
    tags: ["ACG", "Anime"],
    liked: false,
    commentPreview: "僕は「ダンジョン飯」が一番楽しみ！",
    reactions: [{ emoji: "🎌", label: "いいね", count: 60, reacted: false }],
  },
  {
    id: "post_007",
    author: {
      name: "Alex Rivera",
      handle: "@alex_builds",
      avatar: "https://i.pravatar.cc/150?img=57",
    },
    title: "100th Open Source PR Milestone 🎉",
    content:
      "Open source contribution milestone: just merged my 100th PR to a major project! Started contributing 2 years ago and it has been an amazing journey. Thank you to all maintainers who patiently reviewed my code.",
    publishedAt: "2025-03-23T03:00:00Z",
    likes: 478,
    comments: 34,
    reposts: 62,
    tags: ["OpenSource", "Dev", "Milestone"],
    liked: false,
    commentPreview: "Congratulations! Keep up the great work! 🎊",
    reactions: [
      { emoji: "🎉", label: "恭喜", count: 120, reacted: false },
      { emoji: "👏", label: "鼓掌", count: 89, reacted: false },
    ],
  },
  {
    id: "post_008",
    author: {
      name: "Luna Park",
      handle: "@luna_creates",
      avatar: "https://i.pravatar.cc/150?img=44",
    },
    content:
      "Working on a generative art project using React Native Skia. The possibilities are endless! Here is a sneak peek of what I am building 🎭✨",
    publishedAt: "2025-03-23T01:30:00Z",
    likes: 134,
    comments: 19,
    reposts: 8,
    tags: ["Art", "ReactNative", "Skia"],
    liked: true,
    imageUrl: "https://picsum.photos/seed/art1/600/300",
    reactions: [{ emoji: "✨", label: "惊艳", count: 55, reacted: true }],
  },
];

export const MOCK_CONVERSATIONS: MockConversation[] = [
  {
    id: "conv_001",
    name: "Solar Network Devs",
    isGroup: true,
    avatar: "https://i.pravatar.cc/150?img=50",
    lastMessage: "Anyone up for a code review session?",
    lastMessageSender: "Alex",
    lastMessageTime: "2025-03-23T09:00:00Z",
    unread: 3,
  },
  {
    id: "conv_002",
    name: "Akira Tanaka",
    isGroup: false,
    avatar: "https://i.pravatar.cc/150?img=33",
    lastMessage: "Thanks for the PR review!",
    lastMessageSender: "Akira",
    lastMessageTime: "2025-03-23T08:45:00Z",
    unread: 0,
  },
  {
    id: "conv_003",
    name: "Design Team",
    isGroup: true,
    avatar: "https://i.pravatar.cc/150?img=60",
    lastMessage: "Maria shared a new Figma file",
    lastMessageSender: "Maria",
    lastMessageTime: "2025-03-23T08:10:00Z",
    unread: 7,
  },
  {
    id: "conv_004",
    name: "Luna Park",
    isGroup: false,
    avatar: "https://i.pravatar.cc/150?img=44",
    lastMessage: "Check out my new generative art!",
    lastMessageSender: "Luna",
    lastMessageTime: "2025-03-23T07:30:00Z",
    unread: 1,
  },
  {
    id: "conv_005",
    name: "ACG Fans",
    isGroup: true,
    avatar: "https://i.pravatar.cc/150?img=55",
    lastMessage: "今期のおすすめは？",
    lastMessageSender: "Yuki",
    lastMessageTime: "2025-03-22T18:00:00Z",
    unread: 0,
  },
  {
    id: "conv_006",
    name: "Thomas Wright",
    isGroup: false,
    avatar: "https://i.pravatar.cc/150?img=70",
    lastMessage: "The Kubernetes migration went smoothly!",
    lastMessageSender: "Thomas",
    lastMessageTime: "2025-03-22T22:00:00Z",
    unread: 0,
    isEncrypted: true,
  },
];

export const MOCK_MESSAGES: MockMessage[] = [
  {
    id: "msg_001",
    conversationId: "conv_002",
    senderId: "user_akira",
    content: "Hey! Did you see the latest PR I submitted?",
    sentAt: "2025-03-23T08:30:00Z",
    isSelf: false,
  },
  {
    id: "msg_002",
    conversationId: "conv_002",
    senderId: "user_001",
    content:
      "Yes! Just finished reviewing it. The implementation looks solid 👍",
    sentAt: "2025-03-23T08:35:00Z",
    isSelf: true,
  },
  {
    id: "msg_003",
    conversationId: "conv_002",
    senderId: "user_akira",
    content: "Thanks for the PR review!",
    sentAt: "2025-03-23T08:45:00Z",
    isSelf: false,
  },
  {
    id: "msg_004",
    conversationId: "conv_002",
    senderId: "user_001",
    content: "No problem! The async handling you did was particularly elegant.",
    sentAt: "2025-03-23T08:46:00Z",
    isSelf: true,
  },
  {
    id: "msg_005",
    conversationId: "conv_002",
    senderId: "user_akira",
    content: "I learned that trick from your earlier commits actually 😄",
    sentAt: "2025-03-23T08:47:00Z",
    isSelf: false,
  },
];

export const MOCK_COMMENTS: MockComment[] = [
  {
    id: "comment_001",
    author: {
      name: "Akira Tanaka",
      handle: "@akira_dev",
      avatar: "https://i.pravatar.cc/150?img=33",
    },
    content:
      "This is amazing! What kind of performance optimizations did you make?",
    publishedAt: "2025-03-23T09:00:00Z",
    likes: 5,
  },
  {
    id: "comment_002",
    author: {
      name: "Maria Chen",
      handle: "@maria_ux",
      avatar: "https://i.pravatar.cc/150?img=47",
    },
    content: "Congrats on the release! The new UI looks so much smoother.",
    publishedAt: "2025-03-23T09:15:00Z",
    likes: 3,
  },
  {
    id: "comment_003",
    author: {
      name: "Alex Rivera",
      handle: "@alex_builds",
      avatar: "https://i.pravatar.cc/150?img=57",
    },
    content:
      "Would love to contribute to the open source version if you ever plan to release it!",
    publishedAt: "2025-03-23T09:30:00Z",
    likes: 8,
  },
];

export interface MockNewsArticle {
  hash: string;
  title: string;
  description: string;
  publishedAt: string;
}

export const MOCK_NEWS_ARTICLE: MockNewsArticle = {
  hash: "news_001",
  title: "Solar Network Achieves 10 Million Active Users Milestone",
  description:
    "<p>The decentralized social platform Solar Network has reached a major milestone with over 10 million active users globally. The platform, known for its privacy-first approach and open-source infrastructure, has seen explosive growth in recent months following the launch of its Material You redesign.</p>",
  publishedAt: "2025-03-23T06:00:00Z",
};

export const MOCK_TRENDING_TAGS: string[] = [
  "SolarNetwork",
  "ACG",
  "Dev",
  "OpenSource",
  "MaterialYou",
  "ReactNative",
  "Anime",
  "Kubernetes",
  "Design",
  "WebDev",
];

export const MOCK_SUGGESTED_USERS: MockUser[] = [
  {
    id: "user_002",
    name: "Akira Tanaka",
    handle: "@akira_dev",
    bio: "Full-stack developer, anime lover",
    avatar: "https://i.pravatar.cc/150?img=33",
    followers: 892,
    following: 145,
    verified: false,
  },
  {
    id: "user_003",
    name: "Maria Chen",
    handle: "@maria_ux",
    bio: "UX Designer at SolarLabs",
    avatar: "https://i.pravatar.cc/150?img=47",
    followers: 2341,
    following: 312,
    verified: true,
  },
  {
    id: "user_004",
    name: "Alex Rivera",
    handle: "@alex_builds",
    bio: "Open source enthusiast",
    avatar: "https://i.pravatar.cc/150?img=57",
    followers: 3102,
    following: 89,
    verified: false,
  },
  {
    id: "user_005",
    name: "Luna Park",
    handle: "@luna_creates",
    bio: "Generative art & creative coding",
    avatar: "https://i.pravatar.cc/150?img=44",
    followers: 5678,
    following: 234,
    verified: true,
  },
];
