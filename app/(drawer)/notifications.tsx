import {
    fetchNotificationsPage,
    markAllNotificationsRead,
    markNotificationRead,
    type NotificationItemDto,
} from "@/lib/api/content-api";
import { useContentApiSync } from "@/lib/hooks/use-content-api-sync";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { Appbar, Divider, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PAGE_SIZE: number = 20;

function extractNotificationKey(item: NotificationItemDto): string {
  return item.id;
}

function NotificationRow({
  item,
  onPress,
}: {
  item: NotificationItemDto;
  onPress: (item: NotificationItemDto) => void;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => onPress(item)}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: item.isRead
          ? theme.colors.background
          : theme.colors.secondaryContainer + "33",
      }}
    >
      <Text
        variant="titleSmall"
        style={{
          color: theme.colors.onSurface,
          fontWeight: item.isRead ? "500" : "700",
        }}
      >
        {item.title}
      </Text>
      {item.body.length > 0 ? (
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}
          numberOfLines={2}
        >
          {item.body}
        </Text>
      ) : null}
      <Text
        variant="bodySmall"
        style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}
      >
        {new Date(item.createdAt).toLocaleString()}
      </Text>
    </Pressable>
  );
}

export default function NotificationsScreen(): React.JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const sync = useContentApiSync();
  const [items, setItems] = useState<NotificationItemDto[]>([]);
  const [offset, setOffset] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
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
        const result = await fetchNotificationsPage(
          sync,
          fromOffset,
          PAGE_SIZE,
        );
        if (append) {
          setItems((prev) => [...prev, ...result.items]);
        } else {
          setItems(result.items);
        }
        setOffset(fromOffset + result.items.length);
        setHasMore(result.items.length >= PAGE_SIZE);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "加载通知失败");
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

  const executePressItem = useCallback(
    async (item: NotificationItemDto): Promise<void> => {
      if (!sync) {
        return;
      }
      if (!item.isRead) {
        try {
          await markNotificationRead(sync, item.id);
          setItems((prev) =>
            prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
          );
        } catch {
          // 保持 UI 静默，避免阻断跳转
        }
      }
      if (item.postId) {
        router.push(`/post/${item.postId}` as any);
      }
    },
    [router, sync],
  );

  const executeMarkAllRead = useCallback(async (): Promise<void> => {
    if (!sync) {
      return;
    }
    try {
      await markAllNotificationsRead(sync);
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "操作失败");
    }
  }, [sync]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }} elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content
          title="通知"
          titleStyle={{ color: theme.colors.onSurface, fontWeight: "600" }}
        />
        <Appbar.Action
          icon="check-all"
          onPress={() => void executeMarkAllRead()}
        />
      </Appbar.Header>
      <FlatList
        data={items}
        keyExtractor={extractNotificationKey}
        renderItem={({ item }) => (
          <NotificationRow
            item={item}
            onPress={(row) => void executePressItem(row)}
          />
        )}
        ItemSeparatorComponent={() => <Divider />}
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
            <View style={{ padding: 24 }}>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                {loadError ?? "暂无通知"}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={<View style={{ height: insets.bottom + 24 }} />}
      />
    </View>
  );
}
