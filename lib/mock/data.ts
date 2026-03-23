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

export interface MockPost {
  id: string;
  author: MockPostAuthor;
  content: string;
  publishedAt: string;
  likes: number;
  comments: number;
  reposts: number;
  tags: string[];
  liked: boolean;
  imageUrl?: string;
}

export interface MockConversation {
  id: string;
  name: string;
  isGroup: boolean;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
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
  id: 'user_001',
  name: 'LittleSheep',
  handle: '@little_sheep',
  bio: 'Developer & ACG enthusiast ✨',
  avatar: 'https://i.pravatar.cc/150?img=12',
  followers: 1024,
  following: 256,
  verified: true,
};

export const MOCK_POSTS: MockPost[] = [
  {
    id: 'post_001',
    author: {
      name: 'LittleSheep',
      handle: '@little_sheep',
      avatar: 'https://i.pravatar.cc/150?img=12',
    },
    content:
      'Just deployed the new Solar Network update! The performance improvements are incredible 🚀 The new architecture handles 10x more concurrent connections and latency dropped by 60%.',
    publishedAt: '2025-03-23T08:30:00Z',
    likes: 42,
    comments: 7,
    reposts: 3,
    tags: ['SolarNetwork', 'Dev'],
    liked: false,
  },
  {
    id: 'post_002',
    author: {
      name: 'Akira Tanaka',
      handle: '@akira_dev',
      avatar: 'https://i.pravatar.cc/150?img=33',
    },
    content:
      '今日もコードを書いていたら気づいたら朝になってた。でも納得のいく実装ができた！やっぱりプログラミングは楽しい。',
    publishedAt: '2025-03-23T07:10:00Z',
    likes: 89,
    comments: 12,
    reposts: 5,
    tags: ['Programming'],
    liked: true,
  },
  {
    id: 'post_003',
    author: {
      name: 'Maria Chen',
      handle: '@maria_ux',
      avatar: 'https://i.pravatar.cc/150?img=47',
    },
    content:
      'Just finished the new onboarding flow design. Material You dynamic colors make everything feel so cohesive! Sharing the Figma file soon 🎨',
    publishedAt: '2025-03-23T06:45:00Z',
    likes: 156,
    comments: 23,
    reposts: 18,
    tags: ['Design', 'MaterialYou', 'UX'],
    liked: false,
    imageUrl: 'https://picsum.photos/seed/design1/600/300',
  },
  {
    id: 'post_004',
    author: {
      name: 'DevBot9000',
      handle: '@devbot9k',
      avatar: 'https://i.pravatar.cc/150?img=68',
    },
    content:
      'Pro tip: When debugging async code, always check if your promises are properly awaited. 90% of "random" bugs are just unhandled promise rejections hiding in production.',
    publishedAt: '2025-03-23T05:20:00Z',
    likes: 312,
    comments: 41,
    reposts: 87,
    tags: ['JavaScript', 'WebDev', 'Tips'],
    liked: true,
  },
  {
    id: 'post_005',
    author: {
      name: 'Yuki Sato',
      handle: '@yuki_anime',
      avatar: 'https://i.pravatar.cc/150?img=25',
    },
    content:
      '新しいアニメシーズンが始まった！今期は特に楽しみにしているタイトルがたくさんある。皆さんは何を見ていますか？',
    publishedAt: '2025-03-23T04:15:00Z',
    likes: 203,
    comments: 56,
    reposts: 12,
    tags: ['ACG', 'Anime'],
    liked: false,
  },
  {
    id: 'post_006',
    author: {
      name: 'Alex Rivera',
      handle: '@alex_builds',
      avatar: 'https://i.pravatar.cc/150?img=57',
    },
    content:
      'Open source contribution milestone: just merged my 100th PR to a major project! Started contributing 2 years ago and it has been an amazing journey. Thank you to all maintainers who patiently reviewed my code.',
    publishedAt: '2025-03-23T03:00:00Z',
    likes: 478,
    comments: 34,
    reposts: 62,
    tags: ['OpenSource', 'Dev', 'Milestone'],
    liked: false,
  },
  {
    id: 'post_007',
    author: {
      name: 'Luna Park',
      handle: '@luna_creates',
      avatar: 'https://i.pravatar.cc/150?img=44',
    },
    content:
      'Working on a generative art project using React Native Skia. The possibilities are endless! Here is a sneak peek of what I am building 🎭✨',
    publishedAt: '2025-03-23T01:30:00Z',
    likes: 134,
    comments: 19,
    reposts: 8,
    tags: ['Art', 'ReactNative', 'Skia'],
    liked: true,
    imageUrl: 'https://picsum.photos/seed/art1/600/300',
  },
  {
    id: 'post_008',
    author: {
      name: 'Thomas Wright',
      handle: '@thomas_infra',
      avatar: 'https://i.pravatar.cc/150?img=70',
    },
    content:
      'Migrated our entire infrastructure to Kubernetes this weekend. Zero downtime, 40% cost reduction, and the team is finally sleeping through the night. Modern DevOps is truly magical when done right.',
    publishedAt: '2025-03-22T22:00:00Z',
    likes: 267,
    comments: 45,
    reposts: 33,
    tags: ['DevOps', 'Kubernetes', 'Infrastructure'],
    liked: false,
  },
];

export const MOCK_CONVERSATIONS: MockConversation[] = [
  {
    id: 'conv_001',
    name: 'Solar Network Devs',
    isGroup: true,
    avatar: 'https://i.pravatar.cc/150?img=50',
    lastMessage: 'Anyone up for a code review session?',
    lastMessageTime: '2025-03-23T09:00:00Z',
    unread: 3,
  },
  {
    id: 'conv_002',
    name: 'Akira Tanaka',
    isGroup: false,
    avatar: 'https://i.pravatar.cc/150?img=33',
    lastMessage: 'Thanks for the PR review!',
    lastMessageTime: '2025-03-23T08:45:00Z',
    unread: 0,
  },
  {
    id: 'conv_003',
    name: 'Design Team',
    isGroup: true,
    avatar: 'https://i.pravatar.cc/150?img=60',
    lastMessage: 'Maria shared a new Figma file',
    lastMessageTime: '2025-03-23T08:10:00Z',
    unread: 7,
  },
  {
    id: 'conv_004',
    name: 'Luna Park',
    isGroup: false,
    avatar: 'https://i.pravatar.cc/150?img=44',
    lastMessage: 'Check out my new generative art!',
    lastMessageTime: '2025-03-23T07:30:00Z',
    unread: 1,
  },
  {
    id: 'conv_005',
    name: 'ACG Fans',
    isGroup: true,
    avatar: 'https://i.pravatar.cc/150?img=55',
    lastMessage: 'Yuki: 今期のおすすめは？',
    lastMessageTime: '2025-03-23T06:00:00Z',
    unread: 0,
  },
];

export const MOCK_MESSAGES: MockMessage[] = [
  {
    id: 'msg_001',
    conversationId: 'conv_002',
    senderId: 'user_akira',
    content: 'Hey! Did you see the latest PR I submitted?',
    sentAt: '2025-03-23T08:30:00Z',
    isSelf: false,
  },
  {
    id: 'msg_002',
    conversationId: 'conv_002',
    senderId: 'user_001',
    content: 'Yes! Just finished reviewing it. The implementation looks solid 👍',
    sentAt: '2025-03-23T08:35:00Z',
    isSelf: true,
  },
  {
    id: 'msg_003',
    conversationId: 'conv_002',
    senderId: 'user_akira',
    content: 'Thanks for the PR review!',
    sentAt: '2025-03-23T08:45:00Z',
    isSelf: false,
  },
  {
    id: 'msg_004',
    conversationId: 'conv_002',
    senderId: 'user_001',
    content: 'No problem! The async handling you did was particularly elegant.',
    sentAt: '2025-03-23T08:46:00Z',
    isSelf: true,
  },
  {
    id: 'msg_005',
    conversationId: 'conv_002',
    senderId: 'user_akira',
    content: 'I learned that trick from your earlier commits actually 😄',
    sentAt: '2025-03-23T08:47:00Z',
    isSelf: false,
  },
];

export const MOCK_COMMENTS: MockComment[] = [
  {
    id: 'comment_001',
    author: {
      name: 'Akira Tanaka',
      handle: '@akira_dev',
      avatar: 'https://i.pravatar.cc/150?img=33',
    },
    content: 'This is amazing! What kind of performance optimizations did you make?',
    publishedAt: '2025-03-23T09:00:00Z',
    likes: 5,
  },
  {
    id: 'comment_002',
    author: {
      name: 'Maria Chen',
      handle: '@maria_ux',
      avatar: 'https://i.pravatar.cc/150?img=47',
    },
    content: 'Congrats on the release! The new UI looks so much smoother.',
    publishedAt: '2025-03-23T09:15:00Z',
    likes: 3,
  },
  {
    id: 'comment_003',
    author: {
      name: 'Alex Rivera',
      handle: '@alex_builds',
      avatar: 'https://i.pravatar.cc/150?img=57',
    },
    content: 'Would love to contribute to the open source version if you ever plan to release it!',
    publishedAt: '2025-03-23T09:30:00Z',
    likes: 8,
  },
];

export const MOCK_TRENDING_TAGS: string[] = [
  'SolarNetwork',
  'ACG',
  'Dev',
  'OpenSource',
  'MaterialYou',
  'ReactNative',
  'Anime',
  'Kubernetes',
  'Design',
  'WebDev',
];

export const MOCK_SUGGESTED_USERS: MockUser[] = [
  {
    id: 'user_002',
    name: 'Akira Tanaka',
    handle: '@akira_dev',
    bio: 'Full-stack developer, anime lover',
    avatar: 'https://i.pravatar.cc/150?img=33',
    followers: 892,
    following: 145,
    verified: false,
  },
  {
    id: 'user_003',
    name: 'Maria Chen',
    handle: '@maria_ux',
    bio: 'UX Designer at SolarLabs',
    avatar: 'https://i.pravatar.cc/150?img=47',
    followers: 2341,
    following: 312,
    verified: true,
  },
  {
    id: 'user_004',
    name: 'Alex Rivera',
    handle: '@alex_builds',
    bio: 'Open source enthusiast',
    avatar: 'https://i.pravatar.cc/150?img=57',
    followers: 3102,
    following: 89,
    verified: false,
  },
  {
    id: 'user_005',
    name: 'Luna Park',
    handle: '@luna_creates',
    bio: 'Generative art & creative coding',
    avatar: 'https://i.pravatar.cc/150?img=44',
    followers: 5678,
    following: 234,
    verified: true,
  },
];
