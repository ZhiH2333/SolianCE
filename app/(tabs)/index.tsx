import { Alert, FlatList, View } from 'react-native';
import { Appbar, Badge, FAB, IconButton, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PostCard from '@/components/posts/PostCard';
import { MOCK_POSTS, type MockPost } from '@/lib/mock/data';

const NOTIFICATION_COUNT = 3;

function renderPostItem({ item }: { item: MockPost }) {
  return <PostCard post={item} />;
}

function extractPostKey(item: MockPost): string {
  return item.id;
}

function ListFooter() {
  return <View style={{ height: 100 }} />;
}

export default function TimelineScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header
        style={{ backgroundColor: theme.colors.surface }}
        elevated
      >
        <Appbar.Content
          title="Solar Network"
          titleStyle={{
            color: theme.colors.primary,
            fontWeight: '700',
            fontSize: 20,
          }}
        />
        <Appbar.Action
          icon="magnify"
          iconColor={theme.colors.onSurfaceVariant}
          onPress={() => {}}
        />
        <View>
          <Appbar.Action
            icon="bell-outline"
            iconColor={theme.colors.onSurfaceVariant}
            onPress={() => {}}
          />
          {NOTIFICATION_COUNT > 0 && (
            <Badge
              size={16}
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                backgroundColor: theme.colors.error,
              }}
            >
              {NOTIFICATION_COUNT}
            </Badge>
          )}
        </View>
      </Appbar.Header>

      <FlatList
        data={MOCK_POSTS}
        renderItem={renderPostItem}
        keyExtractor={extractPostKey}
        contentContainerStyle={{ paddingTop: 8 }}
        ListFooterComponent={ListFooter}
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="pencil"
        style={{
          position: 'absolute',
          right: 16,
          bottom: insets.bottom + 16,
          backgroundColor: theme.colors.primaryContainer,
        }}
        color={theme.colors.onPrimaryContainer}
        onPress={() => Alert.alert('提示', '发帖功能开发中')}
      />
    </View>
  );
}
