import { View } from 'react-native';
import { Card, ProgressBar, Text, useTheme } from 'react-native-paper';
import { formatDistanceToNow, differenceInDays } from 'date-fns';

interface SpecialDay {
  name: string;
  emoji: string;
  date: Date;
}

const SPECIAL_DAY_SYMBOLS: Record<string, string> = {
  NewYear: '🎉',
  LunarNewYear: '🎉',
  MidAutumn: '🥮',
  DragonBoat: '🐲',
  MerryXmas: '🎄',
  ValentineDay: '💑',
  LaborDay: '🏋️',
  MotherDay: '👩',
  ChildrenDay: '👶',
  FatherDay: '👨',
  Halloween: '🎃',
  Thanksgiving: '🎅',
  Birthday: '🎂',
};

const SPECIAL_DAY_LABELS: Record<string, string> = {
  NewYear: 'New Year',
  LunarNewYear: 'Lunar New Year',
  MidAutumn: 'Mid-Autumn Festival',
  DragonBoat: 'Dragon Boat Festival',
  MerryXmas: 'Christmas',
  ValentineDay: "Valentine's Day",
  LaborDay: 'Labour Day',
  MotherDay: "Mother's Day",
  ChildrenDay: "Children's Day",
  FatherDay: "Father's Day",
  Halloween: 'Halloween',
  Thanksgiving: 'Thanksgiving',
  Birthday: 'Birthday',
};

const SPECIAL_DAYS: Array<{ name: string; month: number; day: number }> = [
  { name: 'NewYear', month: 1, day: 1 },
  { name: 'ValentineDay', month: 2, day: 14 },
  { name: 'LaborDay', month: 5, day: 1 },
  { name: 'ChildrenDay', month: 6, day: 1 },
  { name: 'FatherDay', month: 8, day: 8 },
  { name: 'Halloween', month: 10, day: 31 },
  { name: 'Thanksgiving', month: 11, day: 28 },
  { name: 'MerryXmas', month: 12, day: 25 },
];

function findNextSpecialDay(): SpecialDay | null {
  const now = new Date();
  let closest: { name: string; date: Date } | null = null;

  for (const { name, month, day } of SPECIAL_DAYS) {
    let candidate = new Date(now.getFullYear(), month - 1, day);
    if (candidate <= now) {
      candidate = new Date(now.getFullYear() + 1, month - 1, day);
    }
    if (!closest || candidate < closest.date) {
      closest = { name, date: candidate };
    }
  }

  if (!closest) return null;
  return {
    name: closest.name,
    emoji: SPECIAL_DAY_SYMBOLS[closest.name] ?? '🎉',
    date: closest.date,
  };
}

function computeProgress(nextDate: Date): number {
  const now = new Date();
  const prevYear = new Date(nextDate);
  prevYear.setFullYear(prevYear.getFullYear() - 1);
  const total = nextDate.getTime() - prevYear.getTime();
  const elapsed = now.getTime() - prevYear.getTime();
  return Math.min(Math.max(elapsed / total, 0), 1);
}

export default function SpecialDayCard() {
  const theme = useTheme();
  const nextDay = findNextSpecialDay();

  if (!nextDay) return null;

  const daysLeft = differenceInDays(nextDay.date, new Date());
  const progress = computeProgress(nextDay.date);
  const relativeLabel = formatDistanceToNow(nextDay.date, { addSuffix: true });

  return (
    <Card
      mode="elevated"
      elevation={1}
      style={{ borderRadius: 12, backgroundColor: theme.colors.surface }}
    >
      <Card.Content style={{ paddingVertical: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 28 }}>{nextDay.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
              {SPECIAL_DAY_LABELS[nextDay.name] ?? nextDay.name}{' '}
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {relativeLabel}
              </Text>
            </Text>
            <View style={{ marginTop: 8, gap: 4 }}>
              <ProgressBar
                progress={progress}
                color={theme.colors.primary}
                style={{ height: 6, borderRadius: 4 }}
              />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {daysLeft} days to go
              </Text>
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}
