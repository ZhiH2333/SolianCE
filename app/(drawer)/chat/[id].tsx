import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  View,
  type ViewToken,
} from 'react-native';
import { Appbar, Button, FAB, IconButton, Snackbar, Text, TextInput, useTheme } from 'react-native-paper';
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
/** 视口内若完全看不到这 N 条最新消息，则显示「回到最新」FAB */
const LATEST_MESSAGES_VISIBILITY_COUNT = 5;

const CHAT_ROOM_TOKENS = {
  messageRadius: 22,
  messagePaddingHorizontal: 12,
  messagePaddingVertical: 10,
  /** 分组首条（含头像行）与下一发送者之间的底部留白 */
  messageBlockPaddingVertical: 10,
  /** 同组连续气泡之间：与上一条的间距 */
  messageContinuationGap: 3,
  /** 连续气泡所在行的上下 padding（略小于首条） */
  messageContinuationPaddingV: 3,
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
  /** FAB 距屏幕底边：输入条估算高度 + 与输入条间距（另加 safe area insets.bottom） */
  fabStackAboveInput: 80,
} as const;

/** 最新消息在前（index 0），配合 inverted FlatList 将最新固定在底部 */
function sortMessagesDescending(messages: ChatMessageDto[]): ChatMessageDto[] {
  return [...messages].sort(
    (a: ChatMessageDto, b: ChatMessageDto) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
  );
}

function formatMessageTimeShort(isoString: string): string {
  return format(new Date(isoString), 'HH:mm');
}

/** 与上一条（更旧）相比是否为新分组首条：更旧一条不存在或发送者不同 */
function computeShowGroupHeader(messages: ChatMessageDto[], index: number): boolean {
  const older: ChatMessageDto | undefined = messages[index + 1];
  const current: ChatMessageDto | undefined = messages[index];
  if (!current) {
    return true;
  }
  if (!older) {
    return true;
  }
  return older.senderId !== current.senderId;
}

function MessageBubble({
  message,
  isSelf,
  showGroupHeader,
}: {
  message: ChatMessageDto;
  isSelf: boolean;
  showGroupHeader: boolean;
}) {
  const theme = useTheme();

  const bubbleBg = isSelf ? theme.colors.primaryContainer : theme.colors.secondaryContainer;
  const contentColor = isSelf ? theme.colors.onPrimaryContainer : theme.colors.onSurface;
  const quoteTint =
    'primaryFixedDim' in theme.colors &&
    typeof (theme.colors as { primaryFixedDim?: string }).primaryFixedDim === 'string'
      ? (theme.colors as { primaryFixedDim: string }).primaryFixedDim + '55'
      : theme.colors.surfaceVariant;
  const bubbleRadius = CHAT_ROOM_TOKENS.messageRadius;
  const showQuote: boolean = Boolean(message.quoteSenderName || message.quoteContent);
  const avatarGap = CHAT_ROOM_TOKENS.messageRowGap;
  const metaColor = theme.colors.onSurface;

  const bubbleBody = (
    <View
      style={{
        backgroundColor: bubbleBg,
        borderRadius: bubbleRadius,
        paddingHorizontal: CHAT_ROOM_TOKENS.messagePaddingHorizontal,
        paddingVertical: CHAT_ROOM_TOKENS.messagePaddingVertical,
        maxWidth: CHAT_ROOM_TOKENS.bubbleMaxWidth,
        alignSelf: isSelf ? 'flex-end' : 'flex-start',
        flexShrink: 1,
      }}
    >
      {showQuote ? (
        <View
          style={{
            borderRadius: CHAT_ROOM_TOKENS.quoteRadius,
            backgroundColor: quoteTint,
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
      <Text variant="bodyMedium" style={{ color: contentColor, lineHeight: 22 }}>
        {message.content}
      </Text>
    </View>
  );

  const blockPad = CHAT_ROOM_TOKENS.messageBlockPaddingVertical;
  const contPad = CHAT_ROOM_TOKENS.messageContinuationPaddingV;
  const contGap = CHAT_ROOM_TOKENS.messageContinuationGap;
  const paddingTop = showGroupHeader ? 6 : contPad;
  const paddingBottom = showGroupHeader ? blockPad : contPad;

  if (isSelf) {
    return (
      <View
        style={{
          alignSelf: 'flex-end',
          width: '100%',
          maxWidth: '100%',
          paddingTop,
          paddingBottom,
        }}
      >
        {showGroupHeader ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'flex-end',
              gap: avatarGap,
              marginBottom: 10,
            }}
          >
            <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
              <Text style={{ color: metaColor, fontWeight: '600', fontSize: 15 }} numberOfLines={2}>
                {message.senderName}
              </Text>
              <Text
                style={{
                  color: metaColor,
                  fontSize: 12,
                  marginTop: 2,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatMessageTimeShort(message.sentAt)}
              </Text>
            </View>
            <UserAvatar
              uri={message.senderAvatar ?? ''}
              name={message.senderName}
              size={CHAT_ROOM_TOKENS.avatarSize}
            />
          </View>
        ) : null}
        <View
          style={{
            alignItems: 'flex-end',
            marginTop: showGroupHeader ? 0 : contGap,
          }}
        >
          {bubbleBody}
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        width: '100%',
        maxWidth: '100%',
        paddingTop,
        paddingBottom,
      }}
    >
      {showGroupHeader ? (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: avatarGap }}>
            <UserAvatar
              uri={message.senderAvatar ?? ''}
              name={message.senderName}
              size={CHAT_ROOM_TOKENS.avatarSize}
            />
            <View style={{ flex: 1, flexShrink: 1, paddingRight: 8, minWidth: 0 }}>
              <Text style={{ color: metaColor, fontWeight: '600', fontSize: 15 }} numberOfLines={2}>
                {message.senderName}
              </Text>
              <Text
                style={{
                  color: metaColor,
                  fontSize: 12,
                  marginTop: 2,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatMessageTimeShort(message.sentAt)}
              </Text>
            </View>
          </View>
          <View style={{ marginTop: 10 }}>{bubbleBody}</View>
        </View>
      ) : (
        <View style={{ marginTop: contGap, alignItems: 'flex-start' }}>{bubbleBody}</View>
      )}
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
  const flatListRef = useRef<FlatList<ChatMessageDto>>(null);
  const messagesCountRef = useRef<number>(0);
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 12,
    minimumViewTime: 80,
  }).current;

  const [showJumpToLatestFab, setShowJumpToLatestFab] = useState<boolean>(false);

  useEffect(() => {
    messagesCountRef.current = messages.length;
  }, [messages.length]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const count: number = messagesCountRef.current;
      if (count === 0) {
        setShowJumpToLatestFab(false);
        return;
      }
      const visible: Set<number> = new Set<number>();
      for (const t of viewableItems) {
        if (t.isViewable && t.index != null && t.index >= 0) {
          visible.add(t.index);
        }
      }
      const latestMaxIndex: number = Math.min(LATEST_MESSAGES_VISIBILITY_COUNT - 1, count - 1);
      let anyLatestVisible = false;
      for (let i = 0; i <= latestMaxIndex; i += 1) {
        if (visible.has(i)) {
          anyLatestVisible = true;
          break;
        }
      }
      setShowJumpToLatestFab(!anyLatestVisible);
    },
    [],
  );

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

  function renderMessage({ item, index }: { item: ChatMessageDto; index: number }): ReactElement {
    const isSelf: boolean = myAccountId.length > 0 ? item.senderId === myAccountId : false;
    const showGroupHeader: boolean = computeShowGroupHeader(messages, index);
    return <MessageBubble message={item} isSelf={isSelf} showGroupHeader={showGroupHeader} />;
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
        ref={flatListRef}
        inverted={true}
        removeClippedSubviews={false}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item: ChatMessageDto) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: CHAT_ROOM_TOKENS.listPaddingTop,
          paddingHorizontal: CHAT_ROOM_TOKENS.listPaddingHorizontal,
          paddingBottom: CHAT_ROOM_TOKENS.messageBottomSafeArea + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
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

      {showJumpToLatestFab ? (
        <FAB
          icon="arrow-down"
          label="回到最新"
          visible={true}
          onPress={() => {
            // inverted 列表：offset 0 = 视觉最底部（最新一条）；scrollToEnd 会滚到相反一侧
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }}
          style={{
            position: 'absolute',
            right: 16,
            bottom: insets.bottom + CHAT_ROOM_TOKENS.fabStackAboveInput,
          }}
        />
      ) : null}

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
