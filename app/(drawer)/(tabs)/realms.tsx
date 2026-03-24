import { ScrollView, View } from 'react-native';
import { Appbar, Card, Text, useTheme } from 'react-native-paper';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MOCK_REALMS = [
  {
    id: 'realm_001',
    name: 'Minecraft',
    description: 'Minecraft',
    banner: 'https://images.unsplash.com/photo-1548438294-1ad5d5f4f063?w=800&q=80',
    avatar: 'https://i.pravatar.cc/80?img=10',
  },
  {
    id: 'realm_002',
    name: '音乐分享',
    description: '欢迎来到音乐分享领域！🎉',
    banner: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
    avatar: 'https://i.pravatar.cc/80?img=20',
  },
];

export default function RealmsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

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
        {MOCK_REALMS.map((realm) => (
          <Card
            key={realm.id}
            mode="elevated"
            elevation={1}
            style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: theme.colors.surface }}
            onPress={() => {}}
          >
            <Card.Cover source={{ uri: realm.banner }} style={{ height: 140 }} />
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
