import { FlatList, View } from 'react-native';
import { Appbar, Badge, useTheme } from 'react-native-paper';
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

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }} elevated>
        <Appbar.Content
          title="Timeline"
          titleStyle={{ color: theme.colors.onSurface, fontWeight: '700' }}
        />
        <Appbar.Action
          icon="tune"
          iconColor={theme.colors.onSurfaceVariant}
          onPress={() => {}}
        />
        <View>
          <Appbar.Action
            icon="bell-outline"
            iconColor={theme.colors.onSurfaceVariant}
            onPress={() => {}}
          />
          <Badge
            size={16}
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              backgroundColor: theme.colors.error,
            }}
          >
            3
          </Badge>
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
    </View>
  );
}
