import { Link, Stack } from 'expo-router';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text variant="headlineMedium">404</Text>
        <Text variant="bodyMedium" style={{ marginTop: 8 }}>
          This screen doesn't exist.
        </Text>
        <Link href="/" style={{ marginTop: 16 }}>
          <Text variant="labelLarge">Go to home screen</Text>
        </Link>
      </View>
    </>
  );
}
