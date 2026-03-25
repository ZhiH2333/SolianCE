import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, View } from 'react-native';
import { Appbar, Button, Text, TextInput, useTheme } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import type { MockConversation, MockMessage } from '@/lib/mock/data';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES, MOCK_USER } from '@/lib/mock/data';
import UserAvatar from '@/components/common/UserAvatar';

const INPUT_MAX_LENGTH = 800;
const MESSAGE_RADIUS = 16;
const MESSAGE_PADDING_HORIZONTAL = 12;
const MESSAGE_PADDING_VERTICAL = 10;

function getConversation(messages: { conversations: MockConversation[]; conversationId: string }): MockConversation | undefined {
  return messages.conversations.find((c: MockConversation) => c.id === messages.conversationId);
}

function sortMessagesByTime(messages: MockMessage[]): MockMessage[] {
  return [...messages].sort((a: MockMessage, b: MockMessage) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
}

function formatMessageTime(isoString: string): string {
  const date = new Date(isoString);
  return format(date, 'HH:mm');
}

function MessageBubble({ message, conversation }: { message: MockMessage; conversation: MockConversation | undefined }) {
  const theme = useTheme();
  const isSelf: boolean = message.isSelf;
  const avatarUri: string | undefined = isSelf ? MOCK_USER.avatar : conversation?.avatar;

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

  const conversationId: string = typeof params.id === 'string' ? params.id : '';
  const conversation: MockConversation | undefined = useMemo(
    () => getConversation({ conversations: MOCK_CONVERSATIONS, conversationId }),
    [conversationId],
  );

  const initialMessages: MockMessage[] = useMemo(() => {
    if (!conversationId) return [];
    const filtered: MockMessage[] = MOCK_MESSAGES.filter((m: MockMessage) => m.conversationId === conversationId);
    return sortMessagesByTime(filtered);
  }, [conversationId]);

  const [messages, setMessages] = useState<MockMessage[]>(initialMessages);
  const [draft, setDraft] = useState<string>('');

  function handleOpenDrawer(): void {
    navigation.dispatch(DrawerActions.openDrawer());
  }

  function handleSendMessage(): void {
    const trimmed: string = draft.trim();
    if (!conversationId || trimmed.length === 0) return;
    if (trimmed.length > INPUT_MAX_LENGTH) return;

    const nextMessage: MockMessage = {
      id: `msg_local_${Date.now().toString()}`,
      conversationId,
      senderId: MOCK_USER.id,
      content: trimmed,
      sentAt: new Date().toISOString(),
      isSelf: true,
    };

    setMessages((prev: MockMessage[]) => sortMessagesByTime([...prev, nextMessage]));
    setDraft('');
  }

  function handleChangeDraft(value: string): void {
    if (value.length > INPUT_MAX_LENGTH) return;
    setDraft(value);
  }

  function renderMessage({ item }: { item: MockMessage }): ReactElement {
    return <MessageBubble message={item} conversation={conversation} />;
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
        keyExtractor={(item: MockMessage) => item.id}
        contentContainerStyle={{
          paddingTop: 8,
          paddingHorizontal: 12,
          paddingBottom: 90 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
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
              disabled={draft.trim().length === 0}
              onPress={handleSendMessage}
              style={{ borderRadius: 14, marginBottom: 4 }}
            >
              <MaterialCommunityIcons name="send" size={18} color={theme.colors.onPrimaryContainer} />
              发送
            </Button>
          </View>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {conversation?.isEncrypted ? '该频道消息为加密（Mock）' : '本页面使用 Mock 消息'}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

