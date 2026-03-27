import { View } from 'react-native';
import { Badge, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { format, isThisYear, isToday } from 'date-fns';
import UserAvatar from '@/components/common/UserAvatar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ConversationListItemDto } from '@/lib/api/content-api';

interface ConversationItemProps {
  conversation: ConversationListItemDto;
  onPress: () => void;
}
const ITEM_TOKENS = {
  avatarSize: 48,
  avatarRadius: 24,
  horizontalPadding: 14,
  verticalPadding: 9,
  rowGap: 12,
  titleTimeGap: 8,
  metaGap: 5,
  senderTagRadius: 5,
  senderTagHorizontal: 6,
  senderTagVertical: 1,
} as const;

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isThisYear(date)) return format(date, 'MM/dd');
  return format(date, 'yy/MM/dd');
}

function ConversationAvatar({ conversation }: { conversation: ConversationListItemDto }) {
  const theme = useTheme();
  if (!conversation.isGroup) {
    return <UserAvatar uri={conversation.avatar} name={conversation.name} size={ITEM_TOKENS.avatarSize} />;
  }
  if (conversation.avatar) {
    return <UserAvatar uri={conversation.avatar} name={conversation.name} size={ITEM_TOKENS.avatarSize} />;
  }
  return (
    <View
      style={{
        width: ITEM_TOKENS.avatarSize,
        height: ITEM_TOKENS.avatarSize,
        borderRadius: ITEM_TOKENS.avatarRadius,
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
          paddingHorizontal: ITEM_TOKENS.horizontalPadding,
          paddingVertical: ITEM_TOKENS.verticalPadding,
          gap: ITEM_TOKENS.rowGap,
        }}
      >
        <ConversationAvatar conversation={conversation} />

        <View style={{ flex: 1, gap: ITEM_TOKENS.metaGap }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: ITEM_TOKENS.titleTimeGap }}>
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
                borderRadius: ITEM_TOKENS.senderTagRadius,
                paddingHorizontal: ITEM_TOKENS.senderTagHorizontal,
                paddingVertical: ITEM_TOKENS.senderTagVertical,
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
          </View>
        </View>
      </View>
    </TouchableRipple>
  );
}
