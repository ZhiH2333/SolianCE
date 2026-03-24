import { Alert, ScrollView, View } from 'react-native';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { Appbar, Card, Divider, List, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import UserAvatar from '@/components/common/UserAvatar';
import { MOCK_USER } from '@/lib/mock/data';
import { useAuthContext } from '@/lib/auth/auth-context';

const MOCK_IS_ONLINE = true;

interface NavItem {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

const NAV_ITEMS: NavItem[] = [
  {
    icon: 'face-man-outline',
    title: '发布者',
    subtitle: '管理你的发布者身份',
    onPress: () => Alert.alert('发布者', '功能开发中'),
  },
  {
    icon: 'account-group-outline',
    title: '好友',
    subtitle: '查看好友列表与关注',
    onPress: () => Alert.alert('好友', '功能开发中'),
  },
  {
    icon: 'image-multiple-outline',
    title: '相册',
    subtitle: '查看上传的图片和文件',
    onPress: () => Alert.alert('相册', '功能开发中'),
  },
  {
    icon: 'emoticon-outline',
    title: '贴纸',
    subtitle: '管理贴纸包',
    onPress: () => Alert.alert('贴纸', '功能开发中'),
  },
  {
    icon: 'wallet-outline',
    title: '钱包',
    subtitle: '查看账户余额与交易记录',
    onPress: () => Alert.alert('钱包', '功能开发中'),
  },
  {
    icon: 'star-circle-outline',
    title: '徽章',
    subtitle: '查看已获得的成就徽章',
    onPress: () => Alert.alert('徽章', '功能开发中'),
  },
  {
    icon: 'key-outline',
    title: '密钥对',
    subtitle: '管理端对端加密密钥',
    onPress: () => Alert.alert('密钥对', '功能开发中'),
  },
  {
    icon: 'history',
    title: '操作记录',
    subtitle: '查看账户安全事件记录',
    onPress: () => Alert.alert('操作记录', '功能开发中'),
  },
  {
    icon: 'manage-accounts',
    title: '账户设置',
    subtitle: '修改账户信息与隐私偏好',
    onPress: () => Alert.alert('账户设置', '功能开发中'),
  },
];

interface StatusDotProps {
  isOnline: boolean;
}

function StatusDot({ isOnline }: StatusDotProps) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: isOnline ? '#4CAF50' : theme.colors.outline,
        }}
      />
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {isOnline ? '在线' : '离线'}
      </Text>
    </View>
  );
}

interface ProfileCardProps {
  user: typeof MOCK_USER;
  isOnline: boolean;
}

function ProfileCard({ user, isOnline }: ProfileCardProps) {
  const theme = useTheme();
  return (
    <Card
      mode="elevated"
      elevation={1}
      style={{
        marginHorizontal: 8,
        marginTop: 16,
        marginBottom: 4,
        borderRadius: 12,
        backgroundColor: theme.colors.surface,
      }}
    >
      <Card.Content style={{ padding: 20 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 12,
          }}
        >
          <UserAvatar uri={user.avatar} name={user.name} size={56} />
          <StatusDot isOnline={isOnline} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text
            variant="headlineSmall"
            style={{ color: theme.colors.onSurface, fontWeight: '700' }}
          >
            {user.name}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {user.handle}
          </Text>
        </View>

        <Text
          variant="bodyMedium"
          style={{
            color: user.bio ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
            fontStyle: user.bio ? 'normal' : 'italic',
            marginTop: 4,
          }}
        >
          {user.bio || '暂无描述'}
        </Text>
      </Card.Content>
    </Card>
  );
}

interface NavListItemProps {
  item: NavItem;
}

function NavListItem({ item }: NavListItemProps) {
  const theme = useTheme();
  return (
    <TouchableRipple onPress={item.onPress} rippleColor={theme.colors.surfaceVariant}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 24,
          paddingVertical: 12,
          gap: 16,
        }}
      >
        <MaterialCommunityIcons
          name={item.icon as any}
          size={24}
          color={theme.colors.onSurfaceVariant}
        />
        <View style={{ flex: 1 }}>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
            {item.title}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {item.subtitle}
          </Text>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={theme.colors.outline}
        />
      </View>
    </TouchableRipple>
  );
}

function LogoutItem() {
  const theme = useTheme();
  const { executeSignOut } = useAuthContext();

  function handleLogout() {
    Alert.alert('退出登录', '确定要退出登录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出',
        style: 'destructive',
        onPress: () => {
          executeSignOut();
        },
      },
    ]);
  }

  return (
    <TouchableRipple onPress={handleLogout} rippleColor={theme.colors.errorContainer}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 24,
          paddingVertical: 12,
          gap: 16,
        }}
      >
        <MaterialCommunityIcons
          name="logout"
          size={24}
          color={theme.colors.error}
        />
        <View style={{ flex: 1 }}>
          <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
            退出登录
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            退出当前账户
          </Text>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={theme.colors.outline}
        />
      </View>
    </TouchableRipple>
  );
}

export default function ProfileScreen() {
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
          title="账户"
          titleStyle={{
            color: theme.colors.onSurface,
            fontWeight: '600',
            textAlign: 'center',
          }}
        />
        <Appbar.Action
          icon="cog-outline"
          iconColor={theme.colors.onSurfaceVariant}
          onPress={() => Alert.alert('设置', '功能开发中')}
        />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        <ProfileCard user={MOCK_USER} isOnline={MOCK_IS_ONLINE} />

        <View style={{ marginTop: 8 }}>
          {NAV_ITEMS.map((item, index) => (
            <View key={item.title}>
              <NavListItem item={item} />
              {index < NAV_ITEMS.length - 1 && (
                <Divider style={{ marginLeft: 64 }} />
              )}
            </View>
          ))}
          <Divider style={{ marginLeft: 64 }} />
          <LogoutItem />
        </View>
      </ScrollView>
    </View>
  );
}
