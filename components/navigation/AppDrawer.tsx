import { DrawerContentScrollView } from '@react-navigation/drawer';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { Avatar, Divider, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { AccountMeDto } from '@/lib/api/content-api';
import { fetchAccountMe } from '@/lib/api/content-api';
import { useContentApiSync } from '@/lib/hooks/use-content-api-sync';

interface NavDestination {
  label: string;
  icon: string;
  path: string;
}

const NAV_DESTINATIONS: NavDestination[] = [
  { label: '首页', icon: 'home', path: '/(drawer)/(tabs)/' },
  { label: '探索', icon: 'compass', path: '/(drawer)/(tabs)/explore' },
  { label: '聊天', icon: 'message-text', path: '/(drawer)/(tabs)/messaging' },
  { label: '领域', icon: 'account-group', path: '/(drawer)/(tabs)/realms' },
  { label: '文件', icon: 'folder', path: '/(drawer)/drive' },
  { label: '新闻', icon: 'newspaper', path: '/news' },
  { label: '设置', icon: 'cog', path: '/settings' },
];

interface NavItemProps {
  destination: NavDestination;
  isActive: boolean;
  onPress: () => void;
}

function NavItem({ destination, isActive, onPress }: NavItemProps) {
  const theme = useTheme();
  return (
    <TouchableRipple
      onPress={onPress}
      rippleColor={theme.colors.primary + '22'}
      style={{
        borderRadius: 28,
        marginHorizontal: 12,
        marginVertical: 2,
        backgroundColor: isActive ? theme.colors.secondaryContainer : 'transparent',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14 }}>
        <MaterialCommunityIcons
          name={destination.icon as any}
          size={22}
          color={isActive ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant}
        />
        <Text
          variant="labelLarge"
          style={{
            color: isActive ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant,
            fontWeight: isActive ? '700' : '400',
          }}
        >
          {destination.label}
        </Text>
      </View>
    </TouchableRipple>
  );
}

interface UserHeaderProps {
  onPress: () => void;
  account: AccountMeDto | null;
}

function UserHeader({ onPress, account }: UserHeaderProps) {
  const theme = useTheme();
  const displayName: string = account?.name ?? '未登录';
  const displayHandle: string = account?.handle ?? '';
  return (
    <TouchableRipple onPress={onPress} style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {account?.avatar && account.avatar.length > 0 ? (
          <Avatar.Image size={48} source={{ uri: account.avatar }} />
        ) : (
          <Avatar.Text size={48} label={(displayName.slice(0, 1) || '?').toUpperCase()} />
        )}
        <View style={{ flex: 1 }}>
          <Text
            variant="titleMedium"
            numberOfLines={1}
            style={{ color: theme.colors.onSurface, fontWeight: '700' }}
          >
            {displayName}
          </Text>
          <Text
            variant="bodySmall"
            numberOfLines={1}
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
          >
            {displayHandle}
          </Text>
        </View>
        {account?.verified === true && (
          <MaterialCommunityIcons
            name="check-decagram"
            size={18}
            color={theme.colors.primary}
          />
        )}
      </View>
    </TouchableRipple>
  );
}

export default function AppDrawer(props: DrawerContentComponentProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const sync = useContentApiSync();
  const [account, setAccount] = useState<AccountMeDto | null>(null);

  const loadAccount = useCallback(async (): Promise<void> => {
    if (!sync) {
      setAccount(null);
      return;
    }
    try {
      const me = await fetchAccountMe(sync);
      setAccount(me);
    } catch {
      setAccount(null);
    }
  }, [sync]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  function getIsActive(path: string): boolean {
    if (path === '/(drawer)/(tabs)/') {
      return pathname === '/' || pathname === '/index';
    }
    return pathname.startsWith(path.replace('/(drawer)/(tabs)', ''));
  }

  function handleNavPress(destination: NavDestination) {
    props.navigation.closeDrawer();
    if (destination.path.startsWith('/news') || destination.path.startsWith('/settings')) {
      Alert.alert(destination.label, '功能开发中');
      return;
    }
    router.push(destination.path as any);
  }

  function handleProfilePress() {
    props.navigation.closeDrawer();
    router.push('/profile' as any);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 0, flexGrow: 1 }}
        scrollEnabled={false}
      >
        <UserHeader onPress={handleProfilePress} account={account} />

        <Divider style={{ marginHorizontal: 16, marginVertical: 8 }} />

        <View style={{ flex: 1, paddingVertical: 4 }}>
          {NAV_DESTINATIONS.map((dest) => (
            <NavItem
              key={dest.path}
              destination={dest}
              isActive={getIsActive(dest.path)}
              onPress={() => handleNavPress(dest)}
            />
          ))}
        </View>
      </DrawerContentScrollView>

      <Divider style={{ marginHorizontal: 16 }} />

      <TouchableRipple
        onPress={handleProfilePress}
        rippleColor={theme.colors.primary + '22'}
        style={{
          paddingHorizontal: 24,
          paddingVertical: 16,
          paddingBottom: insets.bottom + 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <MaterialCommunityIcons
            name="account-circle-outline"
            size={22}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            variant="labelLarge"
            style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}
          >
            个人资料
          </Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={18}
            color={theme.colors.outline}
          />
        </View>
      </TouchableRipple>
    </View>
  );
}
