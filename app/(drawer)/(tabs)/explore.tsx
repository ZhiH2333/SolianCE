import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, View } from 'react-native';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Appbar, FAB, Text, useTheme } from 'react-native-paper';
import PostCard from '@/components/posts/PostCard';
import NotificationCard from '@/components/home/NotificationCard';
import TodayNewsCard from '@/components/home/TodayNewsCard';
import type { FeedPost } from '@/lib/models/feed';
import { fetchSpherePostsPage } from '@/lib/api/content-api';
import { useContentApiSync } from '@/lib/hooks/use-content-api-sync';

const PAGE_SIZE = 20;
/** Tab 场景内容区已在底栏之上，FAB.Group 内部已用 safe area padding，勿再叠加底栏高度 */
const FAB_EDGE_INSET = 8;

function RenderPostItem({ item, onPress }: { item: FeedPost; onPress: (id: string) => void }) {
  return <PostCard post={item} onPress={() => onPress(item.id)} />;
}

function ExploreHeader(): React.JSX.Element {
  return (
    <View style={{ paddingHorizontal: 8, paddingTop: 8, gap: 8 }}>
      <TodayNewsCard />
      <NotificationCard />
      <Text variant="titleMedium" style={{ marginTop: 8, marginBottom: 4 }}>
        最新帖子
      </Text>
    </View>
  );
}

function extractPostKey(item: FeedPost): string {
  return item.id;
}

export default function ExploreScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const router = useRouter();
  const sync = useContentApiSync();
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (fromOffset: number, append: boolean): Promise<void> => {
      if (!sync) {
        setPosts([]);
        setLoadError(null);
        setIsLoading(false);
        setHasMore(false);
        return;
      }
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setLoadError(null);
      try {
        const { posts: page } = await fetchSpherePostsPage(sync, fromOffset, PAGE_SIZE);
        if (append) {
          setPosts((prev) => [...prev, ...page]);
        } else {
          setPosts(page);
        }
        setOffset(fromOffset + page.length);
        setHasMore(page.length >= PAGE_SIZE);
      } catch (err) {
        const message: string = err instanceof Error ? err.message : '加载失败';
        setLoadError(message);
        if (!append) {
          setPosts([]);
        }
        setHasMore(false);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [sync],
  );

  useEffect(() => {
    void loadPage(0, false);
  }, [loadPage]);

  function handleEndReached(): void {
    if (!sync || isLoading || isLoadingMore || !hasMore || loadError) {
      return;
    }
    void loadPage(offset, true);
  }

  function ListFooter() {
    if (isLoadingMore) {
      return (
        <View style={{ paddingVertical: 16, alignItems: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      );
    }
    return <View style={{ height: 160 }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }} elevated>
        <Appbar.Action
          icon="menu"
          iconColor={theme.colors.onSurface}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        />
        <Appbar.Action
          icon="shuffle-variant"
          iconColor={theme.colors.onSurfaceVariant}
          onPress={() => {}}
        />
        <Appbar.Content title="" />
        <Appbar.Action
          icon="earth"
          iconColor={theme.colors.onSurfaceVariant}
          onPress={() => {}}
        />
        <Appbar.Action
          icon="magnify"
          iconColor={theme.colors.onSurface}
          onPress={() => {}}
        />
      </Appbar.Header>

      <FlatList
        data={posts}
        ListHeaderComponent={<ExploreHeader />}
        renderItem={({ item }) => (
          <RenderPostItem item={item} onPress={(id) => router.push(`/post/${id}`)} />
        )}
        keyExtractor={extractPostKey}
        contentContainerStyle={{ paddingTop: 0, flexGrow: 1 }}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={
          !isLoading ? (
            <View style={{ padding: 24 }}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {loadError ?? '暂无帖子'}
              </Text>
            </View>
          ) : null
        }
        refreshing={isLoading && posts.length === 0}
        onRefresh={() => {
          setOffset(0);
          void loadPage(0, false);
        }}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
      />

      <FAB.Group
        open={isFabOpen}
        visible
        icon={isFabOpen ? 'close' : 'plus'}
        style={{ bottom: FAB_EDGE_INSET }}
        fabStyle={{ backgroundColor: theme.colors.primaryContainer, marginBottom: 4 }}
        color={theme.colors.onPrimaryContainer}
        actions={[
          {
            icon: 'pencil-outline',
            label: '动态',
            onPress: () => {
              setIsFabOpen(false);
              router.push('/compose');
            },
            style: { backgroundColor: theme.colors.secondaryContainer },
            color: theme.colors.onSecondaryContainer,
          },
          {
            icon: 'file-document-outline',
            label: '文章',
            onPress: () => {
              setIsFabOpen(false);
              Alert.alert('新建文章', '功能开发中');
            },
            style: { backgroundColor: theme.colors.secondaryContainer },
            color: theme.colors.onSecondaryContainer,
          },
          {
            icon: 'help-circle-outline',
            label: '问题',
            onPress: () => {
              setIsFabOpen(false);
              Alert.alert('新建问题', '功能开发中');
            },
            style: { backgroundColor: theme.colors.secondaryContainer },
            color: theme.colors.onSecondaryContainer,
          },
        ]}
        onStateChange={({ open }) => setIsFabOpen(open)}
      />
    </View>
  );
}
