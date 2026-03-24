import { useState } from 'react';
import { Image, View } from 'react-native';
import { Card, Divider, IconButton, Text, useTheme } from 'react-native-paper';
import { formatDistanceToNow } from 'date-fns';
import { MOCK_POSTS, type MockPost } from '@/lib/mock/data';
import UserAvatar from '@/components/common/UserAvatar';

const RECOMMENDATIONS = MOCK_POSTS.slice(0, 5);

interface InlinePostProps {
  post: MockPost;
}

function InlinePost({ post }: InlinePostProps) {
  const theme = useTheme();
  const relativeTime = formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true });

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <UserAvatar uri={post.author.avatar} name={post.author.name} size={36} />
        <View style={{ flex: 1 }}>
          <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
            {post.author.name}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {post.author.handle} {relativeTime}
          </Text>
        </View>
        <IconButton
          icon="dots-horizontal"
          size={18}
          iconColor={theme.colors.onSurfaceVariant}
          style={{ margin: 0 }}
          onPress={() => {}}
        />
      </View>

      <Text
        variant="bodyMedium"
        numberOfLines={6}
        style={{ color: theme.colors.onSurface, lineHeight: 22 }}
      >
        {post.content}
      </Text>

      {post.imageUrl && (
        <Image
          source={{ uri: post.imageUrl }}
          style={{
            width: '100%',
            height: 160,
            borderRadius: 8,
            marginTop: 10,
            backgroundColor: theme.colors.surfaceVariant,
          }}
          resizeMode="cover"
        />
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 }}>
        <IconButton
          icon="eye-outline"
          size={14}
          iconColor={theme.colors.onSurfaceVariant}
          style={{ margin: 0 }}
          onPress={() => {}}
        />
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {post.likes + post.comments} 次浏览
        </Text>
      </View>
    </View>
  );
}

export default function RecommendationCard() {
  const theme = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  function goNext() {
    setCurrentIndex((i) => Math.min(i + 1, RECOMMENDATIONS.length - 1));
  }

  function goPrev() {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }

  const post = RECOMMENDATIONS[currentIndex];

  return (
    <Card
      mode="elevated"
      elevation={1}
      style={{ borderRadius: 12, backgroundColor: theme.colors.surface }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 10,
        }}
      >
        <Text style={{ fontSize: 16, marginRight: 8 }}>☆</Text>
        <Text
          variant="titleMedium"
          style={{ color: theme.colors.onSurface, flex: 1 }}
        >
          推荐帖子
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, fontVariant: ['tabular-nums'] }}
        >
          {currentIndex + 1}/{RECOMMENDATIONS.length}
        </Text>
      </View>

      <Divider />

      <InlinePost post={post} />

      <Divider />

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 4,
          gap: 4,
        }}
      >
        <IconButton
          icon="chevron-left"
          size={20}
          disabled={currentIndex === 0}
          iconColor={theme.colors.onSurfaceVariant}
          onPress={goPrev}
          style={{ margin: 0 }}
        />
        {RECOMMENDATIONS.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === currentIndex ? 16 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor:
                i === currentIndex ? theme.colors.primary : theme.colors.outlineVariant,
            }}
          />
        ))}
        <IconButton
          icon="chevron-right"
          size={20}
          disabled={currentIndex === RECOMMENDATIONS.length - 1}
          iconColor={theme.colors.onSurfaceVariant}
          onPress={goNext}
          style={{ margin: 0 }}
        />
      </View>
    </Card>
  );
}
