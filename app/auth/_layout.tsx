import { Stack } from 'expo-router';

export default function AuthLayout(): React.JSX.Element {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="captcha" />
    </Stack>
  );
}
