import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { formatDistanceToNow, format } from 'date-fns';
import type { NewsArticleSummary } from '@/lib/models/feed';
import { fetchFirstNewsArticle } from '@/lib/api/content-api';
import { useContentApiSync } from '@/lib/hooks/use-content-api-sync';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

export default function TodayNewsCard() {
  const theme = useTheme();
  const sync = useContentApiSync();
  const [article, setArticle] = useState<NewsArticleSummary | null>(null);

  const loadArticle = useCallback(async (): Promise<void> => {
    if (!sync) {
      setArticle(null);
      return;
    }
    const a = await fetchFirstNewsArticle(sync);
    setArticle(a);
  }, [sync]);

  useEffect(() => {
    void loadArticle();
  }, [loadArticle]);

  const publishedDate = article ? new Date(article.publishedAt) : null;

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

        {!article && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            暂无新闻
          </Text>
        )}

        {article && (
          <>
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

            {publishedDate && !Number.isNaN(publishedDate.getTime()) && (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.outline, marginTop: 8, opacity: 0.75 }}
              >
                {format(publishedDate, 'MM/dd/yyyy')} ·{' '}
                {formatDistanceToNow(publishedDate, { addSuffix: true })}
              </Text>
            )}
          </>
        )}
      </Card.Content>
    </Card>
  );
}
