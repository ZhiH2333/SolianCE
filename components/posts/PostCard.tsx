import { useState } from 'react';
import { Image, View } from 'react-native';
import { Card, Chip, Divider, IconButton, Surface, Text, useTheme } from 'react-native-paper';
import { MOCK_COMMENTS, type MockPost, type MockReaction } from '@/lib/mock/data';
import PostHeader from './PostHeader';

interface PostCardProps {
  post: MockPost;
  onPress?: () => void;
}

const MAX_LINES = 6;

interface ReactionPillProps {
  reaction: MockReaction;
  onPress: () => void;
}

function ReactionPill({ reaction, onPress }: ReactionPillProps) {
  const theme = useTheme();
  return (
    <Chip
      compact
      mode={reaction.reacted ? 'flat' : 'outlined'}
      style={{
        borderRadius: 999,
        backgroundColor: reaction.reacted
          ? theme.colors.secondaryContainer
          : theme.colors.surface,
        borderColor: reaction.reacted
          ? theme.colors.secondaryContainer
          : theme.colors.outlineVariant,
      }}
      textStyle={{ fontSize: 13 }}
      onPress={onPress}
    >
      {reaction.emoji} {reaction.count > 0 ? `${reaction.count}个${reaction.label}` : reaction.label}
    </Chip>
  );
}

interface LinkPreviewProps {
  title: string;
  description: string;
  url: string;
  source: string;
}

function LinkPreviewCard({ title, description, url, source }: LinkPreviewProps) {
  const theme = useTheme();
  return (
    <Surface
      elevation={0}
      style={{
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.outlineVariant,
        padding: 12,
        marginTop: 10,
        backgroundColor: theme.colors.surfaceVariant,
      }}
    >
      <Text
        variant="titleSmall"
        numberOfLines={1}
        style={{ color: theme.colors.onSurface, fontWeight: '600' }}
      >
        {title}
      </Text>
      <Text
        variant="bodySmall"
        numberOfLines={2}
        style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
      >
        {description}
      </Text>
      <Text
        variant="bodySmall"
        numberOfLines={1}
        style={{ color: theme.colors.primary, marginTop: 4 }}
      >
        {url}
      </Text>
      <Text
        variant="bodySmall"
        style={{ color: theme.colors.outline, marginTop: 2 }}
      >
        {source}
      </Text>
    </Surface>
  );
}

export default function PostCard({ post, onPress }: PostCardProps) {
  const theme = useTheme();
  const [reactions, setReactions] = useState<MockReaction[]>(
    post.reactions ?? [],
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTextTruncated, setIsTextTruncated] = useState(false);
  const firstComment = MOCK_COMMENTS.find((c) => c.postId === post.id);

  function toggleReaction(index: number) {
    setReactions((prev) =>
      prev.map((r, i) =>
        i === index
          ? { ...r, reacted: !r.reacted, count: r.reacted ? r.count - 1 : r.count + 1 }
          : r,
      ),
    );
  }

  return (
    <Card
      mode="elevated"
      elevation={1}
      onPress={onPress}
      style={{
        marginHorizontal: 0,
        marginVertical: 0,
        borderRadius: 0,
        backgroundColor: theme.colors.surface,
      }}
    >
      <Card.Content style={{ paddingTop: 14, paddingBottom: 0, paddingHorizontal: 16 }}>
        <PostHeader
          author={post.author}
          publishedAt={post.publishedAt}
          isEdited={post.isEdited}
        />

        {post.title && (
          <Text
            variant="titleMedium"
            style={{
              color: theme.colors.onSurface,
              fontWeight: '700',
              marginTop: 10,
              lineHeight: 24,
            }}
          >
            {post.title}
          </Text>
        )}

        <Text
          variant="bodyMedium"
          numberOfLines={isExpanded ? undefined : MAX_LINES}
          onTextLayout={(e) => {
            if (!isExpanded && e.nativeEvent.lines.length >= MAX_LINES) {
              setIsTextTruncated(true);
            }
          }}
          style={{
            color: theme.colors.onSurface,
            marginTop: post.title ? 6 : 10,
            lineHeight: 22,
          }}
        >
          {post.content}
        </Text>

        {isTextTruncated && !isExpanded && (
          <Text
            variant="labelMedium"
            onPress={() => setIsExpanded(true)}
            style={{ color: theme.colors.primary, marginTop: 4 }}
          >
            展开
          </Text>
        )}

        {post.imageUrl && (
          <Image
            source={{ uri: post.imageUrl }}
            style={{
              width: '100%',
              height: 200,
              borderRadius: 8,
              marginTop: 12,
              backgroundColor: theme.colors.surfaceVariant,
            }}
            resizeMode="cover"
          />
        )}

        {post.linkPreview && (
          <LinkPreviewCard
            title={post.linkPreview.title}
            description={post.linkPreview.description}
            url={post.linkPreview.url}
            source={post.linkPreview.source}
          />
        )}

        {(post.comments > 0 || firstComment) && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 12,
              gap: 6,
            }}
          >
            <IconButton
              icon="reply"
              size={14}
              iconColor={theme.colors.onSurfaceVariant}
              style={{ margin: 0 }}
              onPress={() => {}}
            />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {post.comments} 条评论
            </Text>
          </View>
        )}

        {firstComment && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 8,
              marginTop: 6,
              marginBottom: 4,
            }}
          >
            <Text
              numberOfLines={2}
              style={{ fontSize: 13, color: theme.colors.onSurfaceVariant }}
            >
              {firstComment.content}
            </Text>
          </View>
        )}

        {post.tags.length > 0 && (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 6,
              marginTop: 10,
            }}
          >
            {post.tags.map((tag) => (
              <Chip
                key={tag}
                compact
                mode="outlined"
                style={{ borderColor: theme.colors.outlineVariant }}
                textStyle={{ fontSize: 11 }}
              >
                #{tag}
              </Chip>
            ))}
          </View>
        )}
      </Card.Content>

      {reactions.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 4,
          }}
        >
          {reactions.map((reaction, i) => (
            <ReactionPill
              key={`${reaction.label}-${i}`}
              reaction={reaction}
              onPress={() => toggleReaction(i)}
            />
          ))}
          <Chip
            compact
            mode="outlined"
            style={{
              borderRadius: 999,
              borderColor: theme.colors.outlineVariant,
            }}
            textStyle={{ fontSize: 13 }}
            onPress={() => {}}
          >
            +
          </Chip>
        </View>
      )}

      <Divider style={{ marginTop: 12 }} />
    </Card>
  );
}
