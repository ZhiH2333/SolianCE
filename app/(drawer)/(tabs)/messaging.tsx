import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, View } from 'react-native';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Appbar, Divider, FAB, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchChatConversationsPage, type ConversationListItemDto } from '@/lib/api/content-api';
import { useContentApiSync } from '@/lib/hooks/use-content-api-sync';

const BOTTOM_NAV_HEIGHT = 80;
import ConversationItem from '@/components/messaging/ConversationItem';
const PAGE_SIZE = 20;

function extractConvKey(item: ConversationListItemDto): string {
  return item.id;
}

function ItemSeparator() {
  return <Divider />;
}

function ListFooter() {
  return <View style={{ height: 88 }} />;
}

export default function MessagingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  const sync = useContentApiSync();
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [items, setItems] = useState<ConversationListItemDto[]>([]);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (fromOffset: number, append: boolean): Promise<void> => {
      if (!sync) {
        setItems([]);
        setOffset(0);
        setHasMore(false);
        setLoadError(null);
        setIsLoading(false);
        setIsLoadingMore(false);
        return;
      }
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setLoadError(null);
      try {
        const result = await fetchChatConversationsPage(sync, fromOffset, PAGE_SIZE);
        if (append) {
          setItems((prev) => [...prev, ...result.items]);
        } else {
          setItems(result.items);
        }
        setOffset(fromOffset + result.items.length);
        setHasMore(result.items.length >= PAGE_SIZE);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : '加载聊天失败');
        if (!append) {
          setItems([]);
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

  function handleConversationPress(conv: ConversationListItemDto) {
    router.push(`/chat/${conv.id}` as any);
  }

  function renderConversationItem({ item }: { item: ConversationListItemDto }) {
    return (
      <ConversationItem
        conversation={item}
        onPress={() => handleConversationPress(item)}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }} elevated>
        <Appbar.Action
          icon="menu"
          iconColor={theme.colors.onSurface}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        />
        <Appbar.Content
          title="聊天"
          titleStyle={{
            color: theme.colors.onSurface,
            fontWeight: '600',
            textAlign: 'center',
          }}
        />
        <Appbar.Action
          icon="menu"
          iconColor="transparent"
          onPress={() => {}}
        />
      </Appbar.Header>

      <FlatList
        data={items}
        renderItem={renderConversationItem}
        keyExtractor={extractConvKey}
        ItemSeparatorComponent={ItemSeparator}
        ListFooterComponent={ListFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 4 }}
        refreshing={isLoading && items.length === 0}
        onRefresh={() => {
          setOffset(0);
          void loadPage(0, false);
        }}
        onEndReached={() => {
          if (isLoading || isLoadingMore || !hasMore) {
            return;
          }
          void loadPage(offset, true);
        }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          !isLoading ? (
            <View style={{ paddingHorizontal: 16, paddingVertical: 24 }}>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>{loadError ?? '暂无聊天'}</Text>
            </View>
          ) : null
        }
      />

      <FAB.Group
        open={isFabOpen}
        visible
        icon={isFabOpen ? 'close' : 'plus'}
        style={{
          bottom: BOTTOM_NAV_HEIGHT + insets.bottom,
          paddingBottom: 0,
        }}
        fabStyle={{ backgroundColor: theme.colors.primaryContainer, marginBottom: 4 }}
        color={theme.colors.onPrimaryContainer}
        actions={[
          {
            icon: 'chat-plus-outline',
            label: '新建频道',
            onPress: () => {
              setIsFabOpen(false);
              Alert.alert('新建频道', '功能开发中');
            },
            style: { backgroundColor: theme.colors.secondaryContainer },
            color: theme.colors.onSecondaryContainer,
          },
          {
            icon: 'message-plus-outline',
            label: '新建私信',
            onPress: () => {
              setIsFabOpen(false);
              Alert.alert('新建私信', '功能开发中');
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
