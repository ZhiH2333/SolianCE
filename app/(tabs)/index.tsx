import { ScrollView, View } from 'react-native';
import { Appbar, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SpecialDayCard from '@/components/home/SpecialDayCard';
import RecommendationCard from '@/components/home/RecommendationCard';
import CheckInCard from '@/components/home/CheckInCard';
import NotificationCard from '@/components/home/NotificationCard';
import TodayNewsCard from '@/components/home/TodayNewsCard';

const CARD_GAP = 8;
const HORIZONTAL_PADDING = 16;

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }} elevated>
        <Appbar.Content
          title="Solar Network"
          titleStyle={{
            color: theme.colors.primary,
            fontWeight: '700',
            fontSize: 20,
          }}
        />
        <Appbar.Action
          icon="cog-outline"
          iconColor={theme.colors.onSurfaceVariant}
          onPress={() => {}}
        />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={{
          padding: HORIZONTAL_PADDING,
          paddingBottom: insets.bottom + 80,
          gap: CARD_GAP,
        }}
        showsVerticalScrollIndicator={false}
      >
        <SpecialDayCard />

        <View style={{ flexDirection: 'row', gap: CARD_GAP }}>
          <View style={{ flex: 3 }}>
            <RecommendationCard />
          </View>
          <View style={{ flex: 2, gap: CARD_GAP }}>
            <CheckInCard />
            <NotificationCard />
          </View>
        </View>

        <TodayNewsCard />
      </ScrollView>
    </View>
  );
}
