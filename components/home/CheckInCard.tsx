import { useState } from 'react';
import { View } from 'react-native';
import { Card, IconButton, Text, useTheme } from 'react-native-paper';
import { format } from 'date-fns';

const CHECK_IN_RESULTS = [
  { symbol: '大吉', exp: 150, coin: 103.8, streak: 1 },
  { symbol: '吉', exp: 80, coin: 50.0, streak: 1 },
  { symbol: '中吉', exp: 60, coin: 30.0, streak: 1 },
  { symbol: '小吉', exp: 40, coin: 10.0, streak: 1 },
  { symbol: '末吉', exp: 20, coin: 0, streak: 1 },
];

interface CheckInRecord {
  symbol: string;
  exp: number;
  coin: number;
  streak: number;
}

export default function CheckInCard() {
  const theme = useTheme();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [record, setRecord] = useState<CheckInRecord | null>(null);

  const todayLine1 = format(new Date(), 'EEE');
  const todayLine2 = format(new Date(), 'MM/dd');

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
      style={{ borderRadius: 12, backgroundColor: theme.colors.surface }}
    >
      <Card.Content style={{ padding: 20 }}>
        <View style={{ minHeight: 120, justifyContent: 'space-between' }}>
          <View>
            {isCheckedIn && record ? (
              <>
                <Text
                  variant="headlineSmall"
                  style={{ color: theme.colors.primary, fontWeight: '700' }}
                >
                  {record.symbol}
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginTop: 4 }}>
                  +{record.exp} EXP
                </Text>
                {record.coin > 0 && (
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                    +{record.coin} 源点
                  </Text>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                  <Text style={{ fontSize: 12 }}>📍</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    连续签到 {record.streak} 天
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                  每日签到
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                >
                  今日尚未签到
                </Text>
              </>
            )}
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 16,
            }}
          >
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, opacity: 0.75 }}
            >
              {todayLine1}{'\n'}{todayLine2}
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
                  size={22}
                  iconColor={theme.colors.onSurfaceVariant}
                  onPress={() => {}}
                />
              ) : (
                <IconButton
                  icon="fire"
                  size={22}
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
