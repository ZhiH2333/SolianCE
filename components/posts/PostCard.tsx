import { useState } from 'react';
import { View } from 'react-native';
import { Card, Chip, Text, useTheme } from 'react-native-paper';
import type { MockPost } from '@/lib/mock/data';
import PostHeader from './PostHeader';
import PostActions from './PostActions';

interface PostCardProps {
  post: MockPost;
  onPress?: () => void;
}

const MAX_LINES = 5;

export default function PostCard({ post, onPress }: PostCardProps) {
  const theme = useTheme();
  const [isLiked, setIsLiked] = useState(post.liked);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTextTruncated, setIsTextTruncated] = useState(false);

  return (
    <Card
      mode="elevated"
      elevation={1}
      onPress={onPress}
      style={{
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 12,
        backgroundColor: theme.colors.surface,
      }}
    >
      <Card.Content style={{ paddingTop: 16, paddingBottom: 8 }}>
        <PostHeader author={post.author} publishedAt={post.publishedAt} />

        <Text
          variant="bodyMedium"
          numberOfLines={isExpanded ? undefined : MAX_LINES}
          onTextLayout={(e) => {
            if (!isExpanded && e.nativeEvent.lines.length >= MAX_LINES) {
              setIsTextTruncated(true);
            }
          }}
          style={{
            color: theme.colors.onSurface,
            marginTop: 12,
            lineHeight: 22,
          }}
        >
          {post.content}
        </Text>

        {isTextTruncated && !isExpanded && (
          <Text
            variant="labelMedium"
            onPress={() => setIsExpanded(true)}
            style={{ color: theme.colors.primary, marginTop: 4 }}
          >
            展开
          </Text>
        )}

        {post.tags.length > 0 && (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 6,
              marginTop: 12,
            }}
          >
            {post.tags.map((tag) => (
              <Chip
                key={tag}
                compact
                mode="outlined"
                style={{ borderColor: theme.colors.outlineVariant }}
                textStyle={{ fontSize: 11 }}
              >
                #{tag}
              </Chip>
            ))}
          </View>
        )}

        <PostActions
          isLiked={isLiked}
          onToggleLike={() => setIsLiked((prev) => !prev)}
          likesCount={post.likes}
          commentsCount={post.comments}
          repostsCount={post.reposts}
        />
      </Card.Content>
    </Card>
  );
}
