import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Card, IconButton, Text, useTheme } from 'react-native-paper';
import { format } from 'date-fns';
import { fetchCheckInToday, postCheckIn } from '@/lib/api/content-api';
import { useContentApiSync } from '@/lib/hooks/use-content-api-sync';

interface CheckInRecord {
  symbol: string;
  exp: number;
  coin: number;
  streak: number;
}

export default function CheckInCard() {
  const theme = useTheme();
  const sync = useContentApiSync();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [record, setRecord] = useState<CheckInRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const todayLine1 = format(new Date(), 'EEE');
  const todayLine2 = format(new Date(), 'MM/dd');

  const refreshToday = useCallback(async (): Promise<void> => {
    if (!sync) {
      setIsCheckedIn(false);
      setRecord(null);
      setLoadError(null);
      return;
    }
    setLoadError(null);
    try {
      const today = await fetchCheckInToday(sync);
      if (today === null) {
        setIsCheckedIn(false);
        setRecord(null);
        return;
      }
      setIsCheckedIn(true);
      setRecord({
        symbol: today.symbol,
        exp: today.exp,
        coin: today.coin,
        streak: today.streak,
      });
    } catch (err) {
      const message: string = err instanceof Error ? err.message : '加载失败';
      setLoadError(message);
      setIsCheckedIn(false);
      setRecord(null);
    }
  }, [sync]);

  useEffect(() => {
    void refreshToday();
  }, [refreshToday]);

  async function handleCheckIn() {
    if (!sync) {
      return;
    }
    setIsBusy(true);
    setLoadError(null);
    try {
      const result = await postCheckIn(sync);
      setRecord({
        symbol: result.symbol,
        exp: result.exp,
        coin: result.coin,
        streak: result.streak,
      });
      setIsCheckedIn(true);
    } catch (err) {
      const message: string = err instanceof Error ? err.message : '签到失败';
      setLoadError(message);
    } finally {
      setIsBusy(false);
    }
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
            {loadError && (
              <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 4 }}>
                {loadError}
              </Text>
            )}
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
                  disabled={isBusy || !sync}
                  onPress={() => {
                    void handleCheckIn();
                  }}
                />
              )}
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}
