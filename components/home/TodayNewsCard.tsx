import { View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { formatDistanceToNow, format } from 'date-fns';
import { MOCK_NEWS_ARTICLE } from '@/lib/mock/data';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

export default function TodayNewsCard() {
  const theme = useTheme();
  const article = MOCK_NEWS_ARTICLE;
  const publishedDate = new Date(article.publishedAt);

  return (
    <Card
      mode="elevated"
      elevation={1}
      style={{ borderRadius: 12, backgroundColor: theme.colors.surface }}
    >
      <Card.Content style={{ paddingTop: 14, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Text style={{ fontSize: 18 }}>📰</Text>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            Today's News
          </Text>
        </View>

        <Text
          variant="titleSmall"
          numberOfLines={2}
          style={{ color: theme.colors.onSurface, lineHeight: 20, marginBottom: 6 }}
        >
          {article.title}
        </Text>

        <Text
          variant="bodySmall"
          numberOfLines={3}
          style={{ color: theme.colors.onSurfaceVariant, lineHeight: 18 }}
        >
          {stripHtml(article.description)}
        </Text>

        <Text
          variant="bodySmall"
          style={{ color: theme.colors.outline, marginTop: 8, opacity: 0.75 }}
        >
          {format(publishedDate, 'MM/dd/yyyy')} · {formatDistanceToNow(publishedDate, { addSuffix: true })}
        </Text>
      </Card.Content>
    </Card>
  );
}
