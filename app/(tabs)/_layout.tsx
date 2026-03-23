import { CommonActions } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import { BottomNavigation } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

type IconProps = { color: string; size: number };
type RouteName = 'index' | 'explore' | 'messaging' | 'profile';

const TAB_ICONS: Record<RouteName, { default: string; focused: string }> = {
  index: { default: 'home-outline', focused: 'home' },
  explore: { default: 'compass-outline', focused: 'compass' },
  messaging: { default: 'message-text-outline', focused: 'message-text' },
  profile: { default: 'account-outline', focused: 'account' },
};

const TAB_LABELS: Record<RouteName, string> = {
  index: 'Home',
  explore: 'Explore',
  messaging: 'Messages',
  profile: 'Profile',
};

function renderTabIcon(routeName: string, focused: boolean, color: string): React.ReactNode {
  const iconSet = TAB_ICONS[routeName as RouteName];
  const iconName = focused ? iconSet?.focused : iconSet?.default;
  return <MaterialCommunityIcons name={iconName as any} size={24} color={color} />;
}

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ navigation, state, insets }) => (
        <BottomNavigation.Bar
          navigationState={state}
          safeAreaInsets={insets}
          activeColor={theme.colors.primary}
          inactiveColor={theme.colors.onSurfaceVariant}
          style={{ backgroundColor: theme.colors.elevation.level2 }}
          onTabPress={({ route, preventDefault }) => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (event.defaultPrevented) {
              preventDefault();
            } else {
              navigation.dispatch({
                ...CommonActions.navigate(route.name, route.params),
                target: state.key,
              });
            }
          }}
          renderIcon={({ route, focused, color }) =>
            renderTabIcon(route.name, focused, color)
          }
          getLabelText={({ route }) => TAB_LABELS[route.name as RouteName] ?? route.name}
        />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="messaging" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
