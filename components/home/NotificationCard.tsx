import { View } from 'react-native';
import { Card, IconButton, Text, useTheme } from 'react-native-paper';

const MOCK_UNREAD_COUNT = 3;

export default function NotificationCard() {
  const theme = useTheme();

  return (
    <Card
      mode="elevated"
      elevation={1}
      style={{ flex: 1, borderRadius: 12, backgroundColor: theme.colors.surface }}
    >
      <Card.Content style={{ flex: 1, padding: 20 }}>
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          <View>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
              Notifications
            </Text>
            <Text
              variant="bodyLarge"
              style={{
                color:
                  MOCK_UNREAD_COUNT > 0
                    ? theme.colors.primary
                    : theme.colors.onSurfaceVariant,
                marginTop: 4,
              }}
            >
              {MOCK_UNREAD_COUNT} unread
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end', marginTop: 12 }}>
            <View
              style={{
                borderRadius: 999,
                backgroundColor: theme.colors.surfaceVariant,
              }}
            >
              <IconButton
                icon="arrow-right"
                size={20}
                iconColor={theme.colors.onSurfaceVariant}
                onPress={() => {}}
              />
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}
