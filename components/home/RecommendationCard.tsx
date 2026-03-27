import { useCallback, useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { Card, Divider, IconButton, Text, useTheme } from 'react-native-paper';
import { formatDistanceToNow } from 'date-fns';
import type { FeedPost } from '@/lib/models/feed';
import UserAvatar from '@/components/common/UserAvatar';
import { fetchTimelineFeedPosts } from '@/lib/api/content-api';
import { useContentApiSync } from '@/lib/hooks/use-content-api-sync';

interface InlinePostProps {
  post: FeedPost;
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
  const sync = useContentApiSync();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const loadPosts = useCallback(async (): Promise<void> => {
    if (!sync) {
      setPosts([]);
      setLoadError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const list: FeedPost[] = await fetchTimelineFeedPosts(sync, 8);
      setPosts(list);
      setCurrentIndex(0);
    } catch (err) {
      const message: string = err instanceof Error ? err.message : '加载失败';
      setLoadError(message);
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [sync]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  function goNext() {
    setCurrentIndex((i) => Math.min(i + 1, Math.max(posts.length - 1, 0)));
  }

  function goPrev() {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }

  const safeLen: number = posts.length > 0 ? posts.length : 1;
  const post: FeedPost | null = posts.length > 0 ? posts[Math.min(currentIndex, posts.length - 1)] : null;

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
          {posts.length > 0 ? `${currentIndex + 1}/${posts.length}` : '0/0'}
        </Text>
      </View>

      <Divider />

      {isLoading && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 24 }}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            加载中…
          </Text>
        </View>
      )}

      {!isLoading && loadError && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 24 }}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {loadError}
          </Text>
        </View>
      )}

      {!isLoading && !loadError && !post && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 24 }}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            暂无推荐
          </Text>
        </View>
      )}

      {!isLoading && !loadError && post && <InlinePost post={post} />}

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
          disabled={currentIndex === 0 || posts.length === 0}
          iconColor={theme.colors.onSurfaceVariant}
          onPress={goPrev}
          style={{ margin: 0 }}
        />
        {Array.from({ length: safeLen }, (_, i) => (
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
          disabled={currentIndex >= posts.length - 1 || posts.length === 0}
          iconColor={theme.colors.onSurfaceVariant}
          onPress={goNext}
          style={{ margin: 0 }}
        />
      </View>
    </Card>
  );
}
