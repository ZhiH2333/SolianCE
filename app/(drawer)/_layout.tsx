import { Drawer } from 'expo-router/drawer';
import AppDrawer from '@/components/navigation/AppDrawer';

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <AppDrawer {...props} />}
      screenOptions={{
        headerShown: false,
        swipeEnabled: true,
        drawerType: 'front',
        drawerStyle: { width: 300 },
      }}
    />
  );
}
