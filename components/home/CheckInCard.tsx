import { useState } from 'react';
import { View } from 'react-native';
import { Card, IconButton, Text, useTheme } from 'react-native-paper';
import { format } from 'date-fns';

const CHECK_IN_RESULTS = [
  { symbol: '☀️', exp: 120, coin: 10 },
  { symbol: '🌤️', exp: 80, coin: 5 },
  { symbol: '⛅', exp: 60, coin: 3 },
  { symbol: '🌧️', exp: 40, coin: 0 },
  { symbol: '⛈️', exp: 20, coin: 0 },
];

interface CheckInRecord {
  symbol: string;
  exp: number;
  coin: number;
}

export default function CheckInCard() {
  const theme = useTheme();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [record, setRecord] = useState<CheckInRecord | null>(null);

  const today = format(new Date(), 'EEE\nMM/dd');

  function handleCheckIn() {
    setIsBusy(true);
    setTimeout(() => {
      const result = CHECK_IN_RESULTS[Math.floor(Math.random() * CHECK_IN_RESULTS.length)];
      setRecord(result);
      setIsCheckedIn(true);
      setIsBusy(false);
    }, 600);
  }

  return (
    <Card
      mode="elevated"
      elevation={1}
      style={{ flex: 1, borderRadius: 12, backgroundColor: theme.colors.surface }}
    >
      <Card.Content style={{ flex: 1, padding: 20 }}>
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          <View>
            {isCheckedIn && record ? (
              <>
                <Text variant="headlineMedium">{record.symbol}</Text>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                  +{record.exp} EXP
                </Text>
                {record.coin > 0 && (
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    +{record.coin} coins
                  </Text>
                )}
              </>
            ) : (
              <>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                  Daily Check-In
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                >
                  Tap the button to check in today
                </Text>
              </>
            )}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 }}>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, opacity: 0.75 }}
            >
              {today}
            </Text>
            <View
              style={{
                borderRadius: 999,
                backgroundColor: theme.colors.surfaceVariant,
              }}
            >
              {isCheckedIn ? (
                <IconButton
                  icon="help-circle-outline"
                  size={20}
                  iconColor={theme.colors.onSurfaceVariant}
                  onPress={() => {}}
                />
              ) : (
                <IconButton
                  icon="fire"
                  size={20}
                  iconColor={theme.colors.primary}
                  disabled={isBusy}
                  onPress={handleCheckIn}
                />
              )}
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}
