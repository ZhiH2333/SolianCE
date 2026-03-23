import { View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';

interface PostActionsProps {
  isLiked: boolean;
  onToggleLike: () => void;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  onComment?: () => void;
  onRepost?: () => void;
  onShare?: () => void;
}

interface ActionButtonProps {
  icon: string;
  count: number;
  color: string;
  onPress: () => void;
}

function ActionButton({ icon, count, color, onPress }: ActionButtonProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <IconButton
        icon={icon}
        size={20}
        iconColor={color}
        onPress={onPress}
        style={{ margin: 0 }}
      />
      <Text variant="labelSmall" style={{ color, marginLeft: -4 }}>
        {count}
      </Text>
    </View>
  );
}

export default function PostActions({
  isLiked,
  onToggleLike,
  likesCount,
  commentsCount,
  repostsCount,
  onComment,
  onRepost,
  onShare,
}: PostActionsProps) {
  const theme = useTheme();
  const likeColor = isLiked ? theme.colors.error : theme.colors.onSurfaceVariant;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
      <ActionButton
        icon={isLiked ? 'heart' : 'heart-outline'}
        count={likesCount + (isLiked ? 1 : 0)}
        color={likeColor}
        onPress={onToggleLike}
      />
      <ActionButton
        icon="comment-outline"
        count={commentsCount}
        color={theme.colors.onSurfaceVariant}
        onPress={onComment ?? (() => {})}
      />
      <ActionButton
        icon="repeat"
        count={repostsCount}
        color={theme.colors.onSurfaceVariant}
        onPress={onRepost ?? (() => {})}
      />
      <View style={{ flex: 1 }} />
      <IconButton
        icon="share-outline"
        size={20}
        iconColor={theme.colors.onSurfaceVariant}
        onPress={onShare ?? (() => {})}
        style={{ margin: 0 }}
      />
    </View>
  );
}
