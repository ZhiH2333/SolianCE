import { View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { formatDistanceToNow } from 'date-fns';
import UserAvatar from '@/components/common/UserAvatar';
import type { MockPostAuthor } from '@/lib/mock/data';

interface PostHeaderProps {
  author: MockPostAuthor;
  publishedAt: string;
  isEdited?: boolean;
  onMenuPress?: () => void;
}

function formatRelativeTime(isoString: string): string {
  return formatDistanceToNow(new Date(isoString), { addSuffix: true });
}

export default function PostHeader({
  author,
  publishedAt,
  isEdited,
  onMenuPress,
}: PostHeaderProps) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <UserAvatar uri={author.avatar} name={author.name} size={38} />
      <View style={{ flex: 1 }}>
        <Text
          variant="titleSmall"
          style={{ color: theme.colors.onSurface, fontWeight: '600' }}
          numberOfLines={1}
        >
          {author.name}
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
          numberOfLines={1}
        >
          {formatRelativeTime(publishedAt)}
          {isEdited ? ' 已编辑' : ''}
        </Text>
      </View>
      <IconButton
        icon="dots-horizontal"
        size={18}
        iconColor={theme.colors.onSurfaceVariant}
        style={{ margin: 0 }}
        onPress={onMenuPress ?? (() => {})}
      />
    </View>
  );
}
