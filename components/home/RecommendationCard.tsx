import { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Card, IconButton, Text, useTheme } from 'react-native-paper';
import { MOCK_POSTS } from '@/lib/mock/data';
import PostCard from '@/components/posts/PostCard';

const RECOMMENDATIONS = MOCK_POSTS.slice(0, 3);

export default function RecommendationCard() {
  const theme = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  function goNext() {
    setCurrentIndex((i) => Math.min(i + 1, RECOMMENDATIONS.length - 1));
  }

  function goPrev() {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }

  const post = RECOMMENDATIONS[currentIndex];

  return (
    <Card
      mode="elevated"
      elevation={1}
      style={{ borderRadius: 12, backgroundColor: theme.colors.surface }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 4,
        }}
      >
        <Text style={{ fontSize: 18 }}>⭐</Text>
        <Text
          variant="titleMedium"
          style={{ color: theme.colors.onSurface, marginLeft: 8, flex: 1 }}
        >
          Recommended
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, fontVariant: ['tabular-nums'] }}
        >
          {currentIndex + 1}/{RECOMMENDATIONS.length}
        </Text>
      </View>

      <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
        <PostCard post={post} />
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          paddingBottom: 8,
          gap: 8,
        }}
      >
        <IconButton
          icon="chevron-left"
          size={20}
          disabled={currentIndex === 0}
          iconColor={theme.colors.onSurfaceVariant}
          onPress={goPrev}
          style={{ margin: 0 }}
        />
        {RECOMMENDATIONS.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === currentIndex ? 16 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor:
                i === currentIndex ? theme.colors.primary : theme.colors.outlineVariant,
            }}
          />
        ))}
        <IconButton
          icon="chevron-right"
          size={20}
          disabled={currentIndex === RECOMMENDATIONS.length - 1}
          iconColor={theme.colors.onSurfaceVariant}
          onPress={goNext}
          style={{ margin: 0 }}
        />
      </View>
    </Card>
  );
}
