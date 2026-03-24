import { View } from 'react-native';
import { Card, IconButton, Text, useTheme } from 'react-native-paper';

const MOCK_UNREAD_COUNT = 0;

export default function NotificationCard() {
  const theme = useTheme();

  return (
    <Card
      mode="elevated"
      elevation={1}
      style={{ borderRadius: 12, backgroundColor: theme.colors.surface }}
    >
      <Card.Content style={{ padding: 20 }}>
        <View style={{ minHeight: 120, justifyContent: 'space-between' }}>
          <View>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
              通知
            </Text>
            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                marginTop: 4,
              }}
            >
              {MOCK_UNREAD_COUNT > 0
                ? `${MOCK_UNREAD_COUNT} 条未读`
                : '无未读通知'}
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end', marginTop: 16 }}>
            <View
              style={{
                borderRadius: 999,
                backgroundColor: theme.colors.surfaceVariant,
              }}
            >
              <IconButton
                icon="arrow-right"
                size={22}
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
