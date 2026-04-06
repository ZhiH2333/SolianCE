import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Appbar, Button, List, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UserAvatar from '@/components/common/UserAvatar';
import { getMyPublishers, type SnPublisher } from '@/lib/api/publisher-api';
import { useContentApiSync } from '@/lib/hooks/use-content-api-sync';

const SKELETON_ROW_COUNT: number = 6;

function PublisherListSkeleton(): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 12 }}>
      {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
        <View
          key={`sk-${i}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: theme.colors.surfaceVariant,
            }}
          />
          <View style={{ flex: 1, gap: 8 }}>
            <View
              style={{
                height: 16,
                width: '55%',
                borderRadius: 4,
                backgroundColor: theme.colors.surfaceVariant,
              }}
            />
            <View
              style={{
                height: 14,
                width: '35%',
                borderRadius: 4,
                backgroundColor: theme.colors.surfaceVariant,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function CreatorHubScreen(): React.JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const sync = useContentApiSync();
  const [publishers, setPublishers] = useState<SnPublisher[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPublishers = useCallback(async (): Promise<void> => {
    if (!sync) {
      setIsLoading(false);
      setLoadError('请先登录');
      setPublishers([]);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const list: SnPublisher[] = await getMyPublishers(sync);
      setPublishers(list);
    } catch (e: unknown) {
      const msg: string = e instanceof Error ? e.message : '加载失败';
      setLoadError(msg);
      setPublishers([]);
    } finally {
      setIsLoading(false);
    }
  }, [sync]);

  useEffect(() => {
    void loadPublishers();
  }, [loadPublishers]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header
        mode="small"
        elevated
        style={{ paddingTop: insets.top, backgroundColor: theme.colors.elevation.level2 }}
      >
        <Appbar.Content title="创作者中心" />
        <Appbar.Action
          icon="plus"
          iconColor={theme.colors.onSurface}
          onPress={() => router.push('/creator/publisher-form')}
        />
      </Appbar.Header>

      {isLoading ? (
        <PublisherListSkeleton />
      ) : loadError !== null && publishers.length === 0 ? (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 32,
          }}
        >
          <Text
            variant="bodyLarge"
            style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}
          >
            {loadError}
          </Text>
        </View>
      ) : publishers.length === 0 ? (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 32,
            gap: 16,
          }}
        >
          <MaterialCommunityIcons
            name="account-edit"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            还没有发布者
          </Text>
          <Button mode="contained-tonal" onPress={() => router.push('/creator/publisher-form')}>
            创建发布者
          </Button>
        </View>
      ) : (
        <FlatList
          data={publishers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          renderItem={({ item }) => (
            <List.Item
              title={item.nick}
              description={`@${item.name}`}
              onPress={() =>
                router.push(`/creator/${encodeURIComponent(item.name)}` as Parameters<typeof router.push>[0])
              }
              left={() => (
                <View style={{ justifyContent: 'center', paddingLeft: 8 }}>
                  <UserAvatar uri={item.avatar ?? ''} name={item.nick} size={48} />
                </View>
              )}
              right={() => (
                <View style={{ justifyContent: 'center', paddingRight: 8 }}>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={24}
                    color={theme.colors.onSurfaceVariant}
                  />
                </View>
              )}
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            />
          )}
        />
      )}
    </View>
  );
}
