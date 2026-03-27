import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, View } from 'react-native';
import { Appbar, Button, Text, TextInput, useTheme } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import UserAvatar from '@/components/common/UserAvatar';
import {
  fetchAccountMe,
  fetchChatConversationById,
  fetchChatMessagesPage,
  postChatMessage,
  type ChatMessageDto,
  type ConversationListItemDto,
} from '@/lib/api/content-api';
import { useContentApiSync } from '@/lib/hooks/use-content-api-sync';

const INPUT_MAX_LENGTH = 800;
const MESSAGE_PAGE_SIZE = 50;
const CHAT_ROOM_TOKENS = {
  messageRadius: 16,
  messagePaddingHorizontal: 12,
  messagePaddingVertical: 10,
  messageItemVertical: 6,
  messageRowGap: 10,
  listPaddingTop: 8,
  listPaddingHorizontal: 12,
  listBottomSpace: 96,
  inputWrapperHorizontal: 12,
  inputWrapperTop: 8,
  inputWrapperBottomInset: 12,
  inputGap: 8,
  sendButtonRadius: 14,
  sendButtonBottom: 4,
  avatarSize: 32,
  avatarRadius: 16,
  bubbleMaxWidth: '82%',
  quoteRadius: 10,
  quotePaddingHorizontal: 10,
  quotePaddingVertical: 8,
  inputCardRadius: 20,
  inputCardHorizontal: 12,
  inputCardVertical: 8,
  inputCardElevation: 2,
  inputActionSize: 22,
  messageBottomSafeArea: 116,
} as const;

function sortMessagesByTime(messages: ChatMessageDto[]): ChatMessageDto[] {
  return [...messages].sort((a: ChatMessageDto, b: ChatMessageDto) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
}

function formatMessageTime(isoString: string): string {
  const date = new Date(isoString);
  return format(date, 'HH:mm');
}

function MessageBubble({
  message,
  conversation,
  isSelf,
}: {
  message: ChatMessageDto;
  conversation: ConversationListItemDto | null;
  isSelf: boolean;
}) {
  const theme = useTheme();
  const avatarUri: string | undefined = isSelf ? undefined : message.senderAvatar || undefined;

  const containerBackgroundColor = isSelf ? theme.colors.primaryContainer : theme.colors.surfaceVariant;
  const contentColor = isSelf ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant;
  const metaColor = isSelf ? theme.colors.onPrimaryContainer : theme.colors.outline;
  const alignSelf = isSelf ? 'flex-end' : 'flex-start';
  const bubbleBorderRadius = CHAT_ROOM_TOKENS.messageRadius;
  const showQuote: boolean = Boolean(message.quoteSenderName || message.quoteContent);

  return (
    <View
      style={{
        alignSelf,
        maxWidth: CHAT_ROOM_TOKENS.bubbleMaxWidth,
        marginVertical: CHAT_ROOM_TOKENS.messageItemVertical,
        gap: 6,
      }}
    >
      {!isSelf ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
            {message.senderName}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.outline, fontVariant: ['tabular-nums'] }}>
            {formatMessageTime(message.sentAt)}
          </Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: CHAT_ROOM_TOKENS.messageRowGap }}>
        {!isSelf && avatarUri && (
          <UserAvatar
            uri={avatarUri}
            name={message.senderName}
            size={CHAT_ROOM_TOKENS.avatarSize}
          />
        )}
        <View
          style={{
            backgroundColor: containerBackgroundColor,
            borderRadius: bubbleBorderRadius,
            paddingHorizontal: CHAT_ROOM_TOKENS.messagePaddingHorizontal,
            paddingVertical: CHAT_ROOM_TOKENS.messagePaddingVertical,
          }}
        >
          {showQuote ? (
            <View
              style={{
                borderRadius: CHAT_ROOM_TOKENS.quoteRadius,
                backgroundColor: theme.colors.primaryFixedDim + '55',
                paddingHorizontal: CHAT_ROOM_TOKENS.quotePaddingHorizontal,
                paddingVertical: CHAT_ROOM_TOKENS.quotePaddingVertical,
                marginBottom: 8,
              }}
            >
              <Text variant="labelSmall" style={{ color: contentColor, fontWeight: '600' }} numberOfLines={1}>
                {message.quoteSenderName ?? '引用消息'}
              </Text>
              <Text variant="bodySmall" style={{ color: contentColor }} numberOfLines={2}>
                {message.quoteContent ?? ''}
              </Text>
            </View>
          ) : null}
          <Text variant="bodyMedium" style={{ color: contentColor, lineHeight: 20 }}>
            {message.content}
          </Text>
          {isSelf ? (
            <Text
              variant="bodySmall"
              style={{
                color: metaColor,
                marginTop: 6,
                textAlign: 'right',
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatMessageTime(message.sentAt)}
            </Text>
          ) : null}
        </View>
        {isSelf && (
          <View
            style={{
              width: CHAT_ROOM_TOKENS.avatarSize,
              height: CHAT_ROOM_TOKENS.avatarSize,
              borderRadius: CHAT_ROOM_TOKENS.avatarRadius,
            }}
          />
        )}
      </View>
    </View>
  );
}

export default function ChatScreen(): ReactElement {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const sync = useContentApiSync();

  const conversationId: string = typeof params.id === 'string' ? params.id : '';
  const [conversation, setConversation] = useState<ConversationListItemDto | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [myAccountId, setMyAccountId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>('');
  const listRef = useRef<FlatList<ChatMessageDto> | null>(null);
  const shouldScrollToLatestRef = useRef<boolean>(false);

  const executeScrollToLatest = useCallback((animated: boolean): void => {
    listRef.current?.scrollToEnd({ animated });
  }, []);

  useEffect(() => {
    const executeLoadChat = async (): Promise<void> => {
      if (!sync || !conversationId) {
        setConversation(null);
        setMessages([]);
        setMyAccountId('');
        setIsLoading(false);
        setLoadError(null);
        return;
      }
      setIsLoading(true);
      setLoadError(null);
      try {
        const [conversationResult, messageResult, meResult] = await Promise.all([
          fetchChatConversationById(sync, conversationId),
          fetchChatMessagesPage(sync, conversationId, 0, MESSAGE_PAGE_SIZE),
          fetchAccountMe(sync),
        ]);
        setConversation(conversationResult);
        setMessages(sortMessagesByTime(messageResult.items));
        shouldScrollToLatestRef.current = true;
        setMyAccountId(meResult?.id ?? '');
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : '加载聊天失败');
        setConversation(null);
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    };
    void executeLoadChat();
  }, [conversationId, sync]);

  const executeSendMessage = useCallback(async (): Promise<void> => {
    if (!sync) {
      return;
    }
    const trimmed: string = draft.trim();
    if (!conversationId || trimmed.length === 0 || trimmed.length > INPUT_MAX_LENGTH) {
      return;
    }
    setIsSending(true);
    try {
      const sent: ChatMessageDto | null = await postChatMessage(sync, conversationId, trimmed);
      if (sent) {
        setMessages((prev: ChatMessageDto[]) => sortMessagesByTime([...prev, sent]));
        shouldScrollToLatestRef.current = true;
      }
      setDraft('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '发送消息失败');
    } finally {
      setIsSending(false);
    }
  }, [conversationId, draft, sync]);

  function handleChangeDraft(value: string): void {
    if (value.length > INPUT_MAX_LENGTH) return;
    setDraft(value);
  }

  function renderMessage({ item }: { item: ChatMessageDto }): ReactElement {
    const isSelf: boolean = myAccountId.length > 0 ? item.senderId === myAccountId : false;
    return <MessageBubble message={item} conversation={conversation} isSelf={isSelf} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }} elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 8 }}>
          <UserAvatar uri={conversation?.avatar ?? ''} name={conversation?.name ?? '聊天'} size={40} />
          <View style={{ flex: 1 }}>
            <Text
              variant="titleLarge"
              numberOfLines={1}
              style={{
                color: theme.colors.onSurface,
                fontWeight: '600',
              }}
            >
              {conversation?.name ?? '聊天'}
            </Text>
          </View>
        </View>
        <Appbar.Action icon="phone-outline" iconColor={theme.colors.onSurface} onPress={() => {}} />
        <Appbar.Action icon="dots-vertical" iconColor={theme.colors.onSurface} onPress={() => {}} />
      </Appbar.Header>

      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item: ChatMessageDto) => item.id}
        contentContainerStyle={{
          paddingTop: CHAT_ROOM_TOKENS.listPaddingTop,
          paddingHorizontal: CHAT_ROOM_TOKENS.listPaddingHorizontal,
          paddingBottom: CHAT_ROOM_TOKENS.messageBottomSafeArea + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (!shouldScrollToLatestRef.current) {
            return;
          }
          shouldScrollToLatestRef.current = false;
          requestAnimationFrame(() => executeScrollToLatest(false));
        }}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={{ color: theme.colors.onSurfaceVariant, paddingHorizontal: 8, paddingTop: 8 }}>
              {loadError ?? '暂无消息'}
            </Text>
          ) : null
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View
          style={{
            paddingHorizontal: CHAT_ROOM_TOKENS.inputWrapperHorizontal,
            paddingTop: CHAT_ROOM_TOKENS.inputWrapperTop,
            paddingBottom: insets.bottom + CHAT_ROOM_TOKENS.inputWrapperBottomInset,
            backgroundColor: theme.colors.background,
            gap: CHAT_ROOM_TOKENS.inputGap,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: CHAT_ROOM_TOKENS.inputGap,
              backgroundColor: theme.colors.surface,
              borderRadius: CHAT_ROOM_TOKENS.inputCardRadius,
              paddingHorizontal: CHAT_ROOM_TOKENS.inputCardHorizontal,
              paddingVertical: CHAT_ROOM_TOKENS.inputCardVertical,
              elevation: CHAT_ROOM_TOKENS.inputCardElevation,
            }}
          >
            <MaterialCommunityIcons
              name="plus"
              size={CHAT_ROOM_TOKENS.inputActionSize}
              color={theme.colors.onSurface}
            />
            <MaterialCommunityIcons
              name="upload-outline"
              size={CHAT_ROOM_TOKENS.inputActionSize}
              color={theme.colors.onSurface}
            />
            <TextInput
              mode="flat"
              placeholder={`Message in ${conversation?.name ?? '聊天'}`}
              value={draft}
              onChangeText={handleChangeDraft}
              multiline
              dense
              style={{ flex: 1, backgroundColor: 'transparent' }}
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              contentStyle={{ minHeight: 22 }}
              maxLength={INPUT_MAX_LENGTH}
            />
            <Button
              mode="contained"
              disabled={draft.trim().length === 0 || isSending}
              onPress={() => void executeSendMessage()}
              style={{
                borderRadius: CHAT_ROOM_TOKENS.sendButtonRadius,
                marginBottom: CHAT_ROOM_TOKENS.sendButtonBottom - 2,
                minWidth: 40,
              }}
              contentStyle={{ width: 36, height: 36 }}
              labelStyle={{ marginHorizontal: 0 }}
            >
              <MaterialCommunityIcons name="send" size={18} color={theme.colors.onPrimaryContainer} />
            </Button>
          </View>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {conversation?.isEncrypted ? '该频道消息为加密' : '消息由服务器同步'}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

