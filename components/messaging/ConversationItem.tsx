import { View } from 'react-native';
import { Badge, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { format, isThisYear, isToday } from 'date-fns';
import UserAvatar from '@/components/common/UserAvatar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { MockConversation } from '@/lib/mock/data';

interface ConversationItemProps {
  conversation: MockConversation;
  onPress: () => void;
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isThisYear(date)) return format(date, 'MM/dd');
  return format(date, 'yy/MM/dd');
}

function ConversationAvatar({ conversation }: { conversation: MockConversation }) {
  const theme = useTheme();
  if (!conversation.isGroup) {
    return <UserAvatar uri={conversation.avatar} name={conversation.name} size={44} />;
  }
  if (conversation.avatar) {
    return <UserAvatar uri={conversation.avatar} name={conversation.name} size={44} />;
  }
  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MaterialCommunityIcons
        name="pound"
        size={22}
        color={theme.colors.onSurfaceVariant}
      />
    </View>
  );
}

export default function ConversationItem({ conversation, onPress }: ConversationItemProps) {
  const theme = useTheme();
  const timestamp = formatTimestamp(conversation.lastMessageTime);
  const hasUnread = conversation.unread > 0;

  return (
    <TouchableRipple onPress={onPress} rippleColor={theme.colors.surfaceVariant}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 10,
          gap: 14,
        }}
      >
        <ConversationAvatar conversation={conversation} />

        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text
              variant="titleSmall"
              numberOfLines={1}
              style={{
                flex: 1,
                color: theme.colors.onSurface,
                fontWeight: hasUnread ? '700' : '400',
              }}
            >
              {conversation.name}
            </Text>
            {hasUnread && (
              <Badge style={{ backgroundColor: theme.colors.primary }}>
                {conversation.unread}
              </Badge>
            )}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                backgroundColor: theme.colors.primary,
                borderRadius: 4,
                paddingHorizontal: 6,
                paddingVertical: 1,
              }}
            >
              <Text
                variant="labelSmall"
                style={{ color: theme.colors.onPrimary, fontSize: 11 }}
                numberOfLines={1}
              >
                {conversation.lastMessageSender}
              </Text>
            </View>

            <Text
              variant="bodySmall"
              numberOfLines={1}
              style={{
                flex: 1,
                color: theme.colors.onSurfaceVariant,
                fontStyle: conversation.isEncrypted ? 'italic' : 'normal',
              }}
            >
              {conversation.isEncrypted
                ? '消息已加密，无法预览'
                : conversation.lastMessage}
            </Text>

            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.outline,
                fontSize: 12,
                fontVariant: ['tabular-nums'],
              }}
            >
              {timestamp}
            </Text>
          </View>
        </View>
      </View>
    </TouchableRipple>
  );
}
