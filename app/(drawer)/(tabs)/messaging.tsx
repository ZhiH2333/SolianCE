import { useState } from 'react';
import { Alert, FlatList, View } from 'react-native';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Appbar, Divider, FAB, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BOTTOM_NAV_HEIGHT = 80;
import ConversationItem from '@/components/messaging/ConversationItem';
import { MOCK_CONVERSATIONS, type MockConversation } from '@/lib/mock/data';

function extractConvKey(item: MockConversation): string {
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
  const [isFabOpen, setIsFabOpen] = useState(false);

  function handleConversationPress(conv: MockConversation) {
    router.push(`/chat/${conv.id}` as any);
  }

  function renderConversationItem({ item }: { item: MockConversation }) {
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
        data={MOCK_CONVERSATIONS}
        renderItem={renderConversationItem}
        keyExtractor={extractConvKey}
        ItemSeparatorComponent={ItemSeparator}
        ListFooterComponent={ListFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 4 }}
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
