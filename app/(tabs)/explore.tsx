import { Alert, FlatList, View } from 'react-native';
import { Appbar, FAB, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PostCard from '@/components/posts/PostCard';
import { MOCK_POSTS, type MockPost } from '@/lib/mock/data';

function renderPostItem({ item }: { item: MockPost }) {
  return <PostCard post={item} />;
}

function extractPostKey(item: MockPost): string {
  return item.id;
}

function ListFooter() {
  return <View style={{ height: 100 }} />;
}

export default function ExploreScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header
        style={{ backgroundColor: theme.colors.surface }}
        elevated
      >
        <Appbar.Action
          icon="menu"
          iconColor={theme.colors.onSurface}
          onPress={() => {}}
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
        data={MOCK_POSTS}
        renderItem={renderPostItem}
        keyExtractor={extractPostKey}
        contentContainerStyle={{ paddingTop: 0 }}
        ListFooterComponent={ListFooter}
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="plus"
        style={{
          position: 'absolute',
          right: 16,
          bottom: insets.bottom + 16,
          backgroundColor: theme.colors.primaryContainer,
          borderRadius: 16,
        }}
        color={theme.colors.onPrimaryContainer}
        onPress={() =>
          Alert.alert('发帖', '请选择帖子类型', [
            { text: '动态' },
            { text: '文章' },
            { text: '问题' },
            { text: '取消', style: 'cancel' },
          ])
        }
      />
    </View>
  );
}
