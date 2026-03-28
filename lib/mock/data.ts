/** 聊天 Phase 4 前仍使用本地会话/消息结构；帖子与账户数据已由 Phase 2 API 提供 */

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

export const LOCAL_MOCK_USER_ID: string = 'user_001';

export const MOCK_CONVERSATIONS: MockConversation[] = [
  {
    id: 'conv_001',
    name: 'Solar Network Devs',
    isGroup: true,
    avatar: 'https://i.pravatar.cc/150?img=50',
    lastMessage: 'Anyone up for a code review session?',
    lastMessageSender: 'Alex',
    lastMessageTime: '2025-03-23T09:00:00Z',
    unread: 3,
  },
  {
    id: 'conv_002',
    name: 'Akira Tanaka',
    isGroup: false,
    avatar: 'https://i.pravatar.cc/150?img=33',
    lastMessage: 'Thanks for the PR review!',
    lastMessageSender: 'Akira',
    lastMessageTime: '2025-03-23T08:45:00Z',
    unread: 0,
  },
  {
    id: 'conv_003',
    name: 'Design Team',
    isGroup: true,
    avatar: 'https://i.pravatar.cc/150?img=60',
    lastMessage: 'Maria shared a new Figma file',
    lastMessageSender: 'Maria',
    lastMessageTime: '2025-03-23T08:10:00Z',
    unread: 7,
  },
  {
    id: 'conv_004',
    name: 'Luna Park',
    isGroup: false,
    avatar: 'https://i.pravatar.cc/150?img=44',
    lastMessage: 'Check out my new generative art!',
    lastMessageSender: 'Luna',
    lastMessageTime: '2025-03-23T07:30:00Z',
    unread: 1,
  },
  {
    id: 'conv_005',
    name: 'ACG Fans',
    isGroup: true,
    avatar: 'https://i.pravatar.cc/150?img=55',
    lastMessage: '今期のおすすめは？',
    lastMessageSender: 'Yuki',
    lastMessageTime: '2025-03-22T18:00:00Z',
    unread: 0,
  },
  {
    id: 'conv_006',
    name: 'Thomas Wright',
    isGroup: false,
    avatar: 'https://i.pravatar.cc/150?img=70',
    lastMessage: 'The Kubernetes migration went smoothly!',
    lastMessageSender: 'Thomas',
    lastMessageTime: '2025-03-22T22:00:00Z',
    unread: 0,
    isEncrypted: true,
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
    senderId: LOCAL_MOCK_USER_ID,
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
    senderId: LOCAL_MOCK_USER_ID,
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
