import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, View } from 'react-native';
import { Appbar, Button, Text, TextInput, useTheme } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
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
const MESSAGE_RADIUS = 16;
const MESSAGE_PADDING_HORIZONTAL = 12;
const MESSAGE_PADDING_VERTICAL = 10;
const MESSAGE_PAGE_SIZE = 50;

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
  const avatarUri: string | undefined = isSelf ? undefined : conversation?.avatar;

  const containerBackgroundColor = isSelf ? theme.colors.primaryContainer : theme.colors.surfaceVariant;
  const contentColor = isSelf ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant;
  const metaColor = isSelf ? theme.colors.onPrimaryContainer : theme.colors.outline;
  const alignSelf = isSelf ? 'flex-end' : 'flex-start';
  const bubbleBorderRadius = MESSAGE_RADIUS;

  return (
    <View style={{ alignSelf, maxWidth: '80%', marginVertical: 6, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
        {!isSelf && avatarUri && <UserAvatar uri={avatarUri} name={conversation?.name ?? ''} size={32} />}
        <View
          style={{
            backgroundColor: containerBackgroundColor,
            borderRadius: bubbleBorderRadius,
            paddingHorizontal: MESSAGE_PADDING_HORIZONTAL,
            paddingVertical: MESSAGE_PADDING_VERTICAL,
          }}
        >
          <Text variant="bodyMedium" style={{ color: contentColor, lineHeight: 20 }}>
            {message.content}
          </Text>
          <Text
            variant="bodySmall"
            style={{
              color: metaColor,
              marginTop: 6,
              textAlign: isSelf ? 'right' : 'left',
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatMessageTime(message.sentAt)}
          </Text>
        </View>
        {isSelf && <View style={{ width: 32, height: 32, borderRadius: 16 }} />}
      </View>
    </View>
  );
}

export default function ChatScreen(): ReactElement {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
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

  function handleOpenDrawer(): void {
    navigation.dispatch(DrawerActions.openDrawer());
  }

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
        <Appbar.Action icon="menu" iconColor={theme.colors.onSurface} onPress={handleOpenDrawer} />
        <Appbar.Content
          title={conversation?.name ?? '聊天'}
          titleStyle={{
            color: theme.colors.onSurface,
            fontWeight: '600',
            textAlign: 'center',
          }}
        />
        <Appbar.Action icon="dots-horizontal" iconColor="transparent" onPress={() => {}} />
      </Appbar.Header>

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item: ChatMessageDto) => item.id}
        contentContainerStyle={{
          paddingTop: 8,
          paddingHorizontal: 12,
          paddingBottom: 90 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
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
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: insets.bottom + 8,
            backgroundColor: theme.colors.background,
            gap: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <TextInput
              mode="outlined"
              label="输入消息"
              value={draft}
              onChangeText={handleChangeDraft}
              multiline
              dense
              style={{ flex: 1 }}
              maxLength={INPUT_MAX_LENGTH}
            />
            <Button
              mode="contained"
              disabled={draft.trim().length === 0 || isSending}
              onPress={() => void executeSendMessage()}
              style={{ borderRadius: 14, marginBottom: 4 }}
            >
              <MaterialCommunityIcons name="send" size={18} color={theme.colors.onPrimaryContainer} />
              发送
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

