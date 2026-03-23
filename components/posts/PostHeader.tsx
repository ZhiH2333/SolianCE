import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { formatDistanceToNow } from 'date-fns';
import UserAvatar from '@/components/common/UserAvatar';
import type { MockPostAuthor } from '@/lib/mock/data';

interface PostHeaderProps {
  author: MockPostAuthor;
  publishedAt: string;
}

function formatRelativeTime(isoString: string): string {
  return formatDistanceToNow(new Date(isoString), { addSuffix: true });
}

export default function PostHeader({ author, publishedAt }: PostHeaderProps) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <UserAvatar uri={author.avatar} name={author.name} size={40} />
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
          {author.handle} · {formatRelativeTime(publishedAt)}
        </Text>
      </View>
    </View>
  );
}
