import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, View } from 'react-native';
import { Appbar, Button, IconButton, Snackbar, Text, TextInput, useTheme } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import UserAvatar from '@/components/common/UserAvatar';
import {
  fetchAccountMe,
  fetchChatConversationById,
  fetchChatMessagesPage,
  mergeChatMessagesById,
  postChatMessage,
  type ChatMessageDto,
  type ConversationListItemDto,
} from '@/lib/api/content-api';
import { useContentApiSync } from '@/lib/hooks/use-content-api-sync';

const INPUT_MAX_LENGTH = 800;
const INITIAL_LOAD_SIZE = 100;
const PAGINATION_SIZE = 200;
const TRUNCATE_SIZE = 20;

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

/** 最新消息在前（index 0），配合 inverted FlatList 将最新固定在底部 */
function sortMessagesDescending(messages: ChatMessageDto[]): ChatMessageDto[] {
  return [...messages].sort(
    (a: ChatMessageDto, b: ChatMessageDto) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
  );
}

function formatMessageFullDateTime(isoString: string): string {
  return format(new Date(isoString), 'yyyy/M/d HH:mm');
}

function MessageBubble({
  message,
  isSelf,
}: {
  message: ChatMessageDto;
  isSelf: boolean;
}) {
  const theme = useTheme();

  const containerBackgroundColor = isSelf ? theme.colors.primaryContainer : theme.colors.surfaceVariant;
  const contentColor = isSelf ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant;
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
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: CHAT_ROOM_TOKENS.messageRowGap }}>
        {!isSelf ? (
          <UserAvatar
            uri={message.senderAvatar ?? ''}
            name={message.senderName}
            size={CHAT_ROOM_TOKENS.avatarSize}
          />
        ) : null}
        <View style={{ maxWidth: CHAT_ROOM_TOKENS.bubbleMaxWidth }}>
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
                  backgroundColor:
                    'primaryFixedDim' in theme.colors &&
                    typeof (theme.colors as { primaryFixedDim?: string }).primaryFixedDim === 'string'
                      ? (theme.colors as { primaryFixedDim: string }).primaryFixedDim + '55'
                      : theme.colors.surfaceVariant,
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
          </View>
          <Text
            style={{
              marginTop: 4,
              fontSize: 11,
              color: theme.colors.onSurfaceVariant,
              textAlign: isSelf ? 'right' : 'left',
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatMessageFullDateTime(message.sentAt)}
          </Text>
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
  const [oldestOffset, setOldestOffset] = useState<number>(0);
  const [hasMoreOlder, setHasMoreOlder] = useState<boolean>(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState<boolean>(false);
  const [syncHint, setSyncHint] = useState<string | null>(null);
  const [showTimeoutSnackbar, setShowTimeoutSnackbar] = useState<boolean>(false);
  const [serverTotalCount, setServerTotalCount] = useState<number | null>(null);

  const isLoadingRef = useRef<boolean>(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snackbarShown = useRef<boolean>(false);
  const loopGenerationRef = useRef<number>(0);
  const loadOlderBusyRef = useRef<boolean>(false);

  const handleLoadLatestOnly = useCallback((): void => {
    loopGenerationRef.current += 1;
    isLoadingRef.current = false;
    setIsLoading(false);
    setShowTimeoutSnackbar(false);
    setSyncHint(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setMessages((prev: ChatMessageDto[]) => prev.slice(0, TRUNCATE_SIZE));
    setOldestOffset(TRUNCATE_SIZE);
    setHasMoreOlder(true);
    setServerTotalCount(null);
  }, []);

  const startInitialLoad = useCallback(async (): Promise<void> => {
    if (!sync || !conversationId) {
      setConversation(null);
      setMessages([]);
      setMyAccountId('');
      setIsLoading(false);
      setLoadError(null);
      setOldestOffset(0);
      setHasMoreOlder(false);
      setServerTotalCount(null);
      setSyncHint(null);
      isLoadingRef.current = false;
      return;
    }

    loopGenerationRef.current += 1;
    const generation: number = loopGenerationRef.current;
    isLoadingRef.current = true;
    snackbarShown.current = false;
    setIsLoading(true);
    setLoadError(null);
    setMessages([]);
    setOldestOffset(0);
    setHasMoreOlder(false);
    setServerTotalCount(null);
    setShowTimeoutSnackbar(false);
    setSyncHint(`正在加载消息（${INITIAL_LOAD_SIZE} 条）...`);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      if (isLoadingRef.current && !snackbarShown.current) {
        snackbarShown.current = true;
        setShowTimeoutSnackbar(true);
      }
    }, 5000);

    try {
      const [conversationResult, meResult] = await Promise.all([
        fetchChatConversationById(sync, conversationId),
        fetchAccountMe(sync),
      ]);
      if (generation !== loopGenerationRef.current) {
        return;
      }
      setConversation(conversationResult);
      setMyAccountId(meResult?.id ?? '');

      const page: { items: ChatMessageDto[]; totalCount: number | null } = await fetchChatMessagesPage(
        sync,
        conversationId,
        0,
        INITIAL_LOAD_SIZE,
      );
      if (generation !== loopGenerationRef.current) {
        return;
      }
      const sorted: ChatMessageDto[] = sortMessagesDescending(page.items);
      setMessages(sorted);
      setOldestOffset(INITIAL_LOAD_SIZE);
      const total: number | null = page.totalCount;
      setServerTotalCount(total);
      if (total !== null) {
        setHasMoreOlder(total > INITIAL_LOAD_SIZE);
      } else {
        setHasMoreOlder(page.items.length >= INITIAL_LOAD_SIZE);
      }
    } catch (error) {
      if (generation === loopGenerationRef.current) {
        setLoadError(error instanceof Error ? error.message : '加载聊天失败');
        setConversation(null);
        setMessages([]);
        setHasMoreOlder(false);
        setServerTotalCount(null);
      }
    } finally {
      if (generation === loopGenerationRef.current) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        isLoadingRef.current = false;
        setIsLoading(false);
        setSyncHint(null);
      }
    }
  }, [conversationId, sync]);

  useEffect(() => {
    void startInitialLoad();
    return () => {
      loopGenerationRef.current += 1;
      isLoadingRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [startInitialLoad]);

  const loadMoreOlderMessages = useCallback(async (): Promise<void> => {
    if (!sync || !conversationId || isLoadingOlder || loadOlderBusyRef.current || !hasMoreOlder) {
      return;
    }
    const generationAtStart: number = loopGenerationRef.current;
    loadOlderBusyRef.current = true;
    setIsLoadingOlder(true);
    try {
      const page: { items: ChatMessageDto[]; totalCount: number | null } = await fetchChatMessagesPage(
        sync,
        conversationId,
        oldestOffset,
        PAGINATION_SIZE,
      );
      if (generationAtStart !== loopGenerationRef.current) {
        return;
      }
      if (page.totalCount !== null) {
        setServerTotalCount(page.totalCount);
      }
      setMessages((prev: ChatMessageDto[]) =>
        sortMessagesDescending(mergeChatMessagesById(prev, page.items)),
      );
      const nextOffset: number = oldestOffset + PAGINATION_SIZE;
      setOldestOffset(nextOffset);
      const total: number | null = page.totalCount ?? serverTotalCount;
      if (total !== null) {
        setHasMoreOlder(nextOffset < total);
      } else {
        setHasMoreOlder(page.items.length >= PAGINATION_SIZE);
      }
    } catch (error) {
      if (generationAtStart === loopGenerationRef.current) {
        setLoadError(error instanceof Error ? error.message : '加载更早消息失败');
      }
    } finally {
      setIsLoadingOlder(false);
      loadOlderBusyRef.current = false;
    }
  }, [sync, conversationId, hasMoreOlder, isLoadingOlder, oldestOffset, serverTotalCount]);

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
        setMessages((prev: ChatMessageDto[]) => sortMessagesDescending(mergeChatMessagesById(prev, [sent])));
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
    return <MessageBubble message={item} isSelf={isSelf} />;
  }

  const keyboardBehavior: 'padding' | 'height' | undefined =
    Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined;

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

      {syncHint ? (
        <View
          style={{
            backgroundColor: theme.colors.inverseSurface,
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}
        >
          <Text style={{ color: theme.colors.inverseOnSurface, fontSize: 13 }}>{syncHint}</Text>
        </View>
      ) : null}

      <FlatList
        inverted={true}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item: ChatMessageDto) => item.id}
        contentContainerStyle={{
          paddingTop: CHAT_ROOM_TOKENS.listPaddingTop,
          paddingHorizontal: CHAT_ROOM_TOKENS.listPaddingHorizontal,
          paddingBottom: CHAT_ROOM_TOKENS.messageBottomSafeArea + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onEndReached={() => {
          void loadMoreOlderMessages();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoadingOlder ? (
            <View style={{ paddingVertical: 8, alignItems: 'center' }}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <Text style={{ color: theme.colors.onSurfaceVariant, paddingHorizontal: 8, paddingTop: 8 }}>
              {loadError ?? '暂无消息'}
            </Text>
          ) : null
        }
      />

      <KeyboardAvoidingView behavior={keyboardBehavior} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
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
            <IconButton
              icon="plus"
              size={CHAT_ROOM_TOKENS.inputActionSize}
              iconColor={theme.colors.onSurface}
              style={{ margin: 0 }}
              onPress={() => {}}
            />
            <IconButton
              icon="upload-outline"
              size={CHAT_ROOM_TOKENS.inputActionSize}
              iconColor={theme.colors.onSurface}
              style={{ margin: 0 }}
              onPress={() => {}}
            />
            <TextInput
              mode="flat"
              placeholder={`Message in ${conversation?.name ?? '聊天'}`}
              value={draft}
              onChangeText={handleChangeDraft}
              editable={!isSending}
              showSoftInputOnFocus
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
        </View>
      </KeyboardAvoidingView>

      <Snackbar
        visible={showTimeoutSnackbar}
        onDismiss={() => setShowTimeoutSnackbar(false)}
        duration={Infinity}
        action={{
          label: '只加载最新',
          onPress: handleLoadLatestOnly,
        }}
      >
        加载时间过长，是否只显示最新消息？
      </Snackbar>
    </View>
  );
}
