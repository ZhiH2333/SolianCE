import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Appbar, Card, Text, useTheme } from 'react-native-paper';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchRealmsPage, type RealmListItemDto } from '@/lib/api/content-api';
import { useContentApiSync } from '@/lib/hooks/use-content-api-sync';

const PAGE_SIZE = 20;

export default function RealmsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const sync = useContentApiSync();
  const [items, setItems] = useState<RealmListItemDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadRealms = useCallback(async (): Promise<void> => {
    if (!sync) {
      setItems([]);
      setIsLoading(false);
      setLoadError(null);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await fetchRealmsPage(sync, 0, PAGE_SIZE);
      setItems(result.items);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '加载领域失败');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [sync]);

  useEffect(() => {
    void loadRealms();
  }, [loadRealms]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }} elevated>
        <Appbar.Action
          icon="menu"
          iconColor={theme.colors.onSurface}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        />
        <Appbar.Content
          title="领域"
          titleStyle={{ color: theme.colors.onSurface, fontWeight: '600', textAlign: 'center' }}
        />
        <Appbar.Action
          icon="earth"
          iconColor={theme.colors.onSurfaceVariant}
          onPress={() => {}}
        />
        <Appbar.Action
          icon="view-grid-outline"
          iconColor={theme.colors.onSurfaceVariant}
          onPress={() => {}}
        />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 80, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {!isLoading && items.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>{loadError ?? '暂无领域'}</Text>
        ) : null}
        {items.map((realm) => (
          <Card
            key={realm.id}
            mode="elevated"
            elevation={1}
            style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: theme.colors.surface }}
            onPress={() => {}}
          >
            {realm.banner.length > 0 ? (
              <Card.Cover source={{ uri: realm.banner }} style={{ height: 140 }} />
            ) : (
              <View style={{ height: 140, backgroundColor: theme.colors.surfaceVariant }} />
            )}
            <Card.Content style={{ paddingTop: 12, paddingBottom: 16 }}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                {realm.name}
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                numberOfLines={2}
              >
                {realm.description}
              </Text>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}
