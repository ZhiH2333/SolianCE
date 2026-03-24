import { useState } from 'react';
import { Alert, FlatList, View } from 'react-native';
import { Appbar, FAB, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PostCard from '@/components/posts/PostCard';
import { MOCK_POSTS, type MockPost } from '@/lib/mock/data';

const BOTTOM_NAV_HEIGHT = 80;

function renderPostItem({ item }: { item: MockPost }) {
  return <PostCard post={item} />;
}

function extractPostKey(item: MockPost): string {
  return item.id;
}

function ListFooter() {
  return <View style={{ height: 160 }} />;
}

export default function ExploreScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [isFabOpen, setIsFabOpen] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }} elevated>
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

      <FAB.Group
        open={isFabOpen}
        visible
        icon={isFabOpen ? 'close' : 'plus'}
        style={{ paddingBottom: BOTTOM_NAV_HEIGHT + insets.bottom }}
        fabStyle={{ backgroundColor: theme.colors.primaryContainer }}
        color={theme.colors.onPrimaryContainer}
        actions={[
          {
            icon: 'pencil-outline',
            label: '动态',
            onPress: () => {
              setIsFabOpen(false);
              Alert.alert('新建动态', '功能开发中');
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
