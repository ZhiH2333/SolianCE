import CheckInCard from "@/components/home/CheckInCard";
import NotificationCard from "@/components/home/NotificationCard";
import RecommendationCard from "@/components/home/RecommendationCard";
import SpecialDayCard from "@/components/home/SpecialDayCard";
import TodayNewsCard from "@/components/home/TodayNewsCard";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { ScrollView, View } from "react-native";
import { Appbar, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CARD_GAP = 8;

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }} elevated>
        <Appbar.Action
          icon="menu"
          iconColor={theme.colors.onSurface}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        />
        <Appbar.Content
          title="首页"
          titleStyle={{
            color: theme.colors.onSurface,
            fontWeight: "600",
            textAlign: "center",
          }}
        />
        <Appbar.Action icon="menu" iconColor="transparent" onPress={() => {}} />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={{
          padding: CARD_GAP,
          paddingBottom: insets.bottom + 80,
          gap: CARD_GAP,
        }}
        showsVerticalScrollIndicator={false}
      >
        <SpecialDayCard />

        <RecommendationCard />

        <View style={{ flexDirection: "row", gap: CARD_GAP }}>
          <View style={{ flex: 1 }}>
            <CheckInCard />
          </View>
          <View style={{ flex: 1 }}>
            <NotificationCard />
          </View>
        </View>

        <TodayNewsCard />
      </ScrollView>
    </View>
  );
}
