import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import {
  Appbar,
  Avatar,
  Chip,
  Divider,
  IconButton,
  Surface,
  Text,
  useTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PostHeader from '@/components/posts/PostHeader';
import { MOCK_COMMENTS, MOCK_POSTS, type MockComment, type MockReaction } from '@/lib/mock/data';
import { formatDistanceToNow } from 'date-fns';

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

interface CommentItemProps {
  comment: MockComment;
}

function CommentItem({ comment }: CommentItemProps) {
  const theme = useTheme();
  const relativeTime = formatDistanceToNow(new Date(comment.publishedAt), { addSuffix: true });
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
    >
      <Avatar.Image size={34} source={{ uri: comment.author.avatar }} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Text
            variant="labelMedium"
            style={{ color: theme.colors.onSurface, fontWeight: '600' }}
            numberOfLines={1}
          >
            {comment.author.name}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {comment.author.handle} · {relativeTime}
          </Text>
        </View>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, lineHeight: 20 }}>
          {comment.content}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
          <MaterialCommunityIcons
            name="heart-outline"
            size={14}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}
          >
            {comment.likes}
          </Text>
        </View>
      </View>
    </View>
  );
}

interface CommentsHeaderProps {
  count: number;
}

function CommentsHeader({ count }: CommentsHeaderProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
    >
      <MaterialCommunityIcons
        name="comment-outline"
        size={20}
        color={theme.colors.onSurface}
      />
      <Text
        variant="titleMedium"
        style={{ color: theme.colors.onSurface, fontWeight: '600' }}
      >
        {count} 条评论
      </Text>
    </View>
  );
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const post = MOCK_POSTS.find((p) => p.id === id) ?? MOCK_POSTS[0];
  const comments = MOCK_COMMENTS.filter((c) => c.postId === post.id);

  const [reactions, setReactions] = useState<MockReaction[]>(post.reactions ?? []);

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
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }} elevated>
        <Appbar.BackAction
          onPress={() => router.back()}
          iconColor={theme.colors.onSurface}
        />
        <Appbar.Content
          title={post.title ?? '帖子详情'}
          titleStyle={{
            color: theme.colors.onSurface,
            fontWeight: '600',
            fontSize: 16,
            textAlign: 'center',
          }}
          subtitle="帖子详情"
          subtitleStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12, textAlign: 'center' }}
        />
        <Appbar.Action
          icon="dots-horizontal"
          iconColor={theme.colors.onSurfaceVariant}
          onPress={() => {}}
        />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 完整帖子内容 */}
        <View style={{ backgroundColor: theme.colors.surface, paddingTop: 14 }}>
          <View style={{ paddingHorizontal: 16 }}>
            <PostHeader
              author={post.author}
              publishedAt={post.publishedAt}
              isEdited={post.isEdited}
            />

            {post.title && (
              <Text
                variant="titleLarge"
                style={{
                  color: theme.colors.onSurface,
                  fontWeight: '700',
                  marginTop: 12,
                  lineHeight: 28,
                }}
              >
                {post.title}
              </Text>
            )}

            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurface,
                marginTop: post.title ? 8 : 12,
                lineHeight: 22,
              }}
            >
              {post.content}
            </Text>

            {post.imageUrl && (
              <Image
                source={{ uri: post.imageUrl }}
                style={{
                  width: '100%',
                  height: 220,
                  borderRadius: 8,
                  marginTop: 14,
                  backgroundColor: theme.colors.surfaceVariant,
                }}
                resizeMode="cover"
              />
            )}

            {post.linkPreview && (
              <Surface
                elevation={0}
                style={{
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.colors.outlineVariant,
                  padding: 12,
                  marginTop: 12,
                  backgroundColor: theme.colors.surfaceVariant,
                }}
              >
                <Text
                  variant="titleSmall"
                  numberOfLines={1}
                  style={{ color: theme.colors.onSurface, fontWeight: '600' }}
                >
                  {post.linkPreview.title}
                </Text>
                <Text
                  variant="bodySmall"
                  numberOfLines={2}
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
                >
                  {post.linkPreview.description}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.primary, marginTop: 4 }}
                >
                  {post.linkPreview.url}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.outline, marginTop: 2 }}
                >
                  {post.linkPreview.source}
                </Text>
              </Surface>
            )}

            {post.commentPreview && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 14,
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
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}
                  numberOfLines={2}
                >
                  {post.commentPreview}
                </Text>
              </View>
            )}

            {post.tags.length > 0 && (
              <View
                style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}
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
          </View>

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
                style={{ borderRadius: 999, borderColor: theme.colors.outlineVariant }}
                textStyle={{ fontSize: 13 }}
                onPress={() => {}}
              >
                +
              </Chip>
            </View>
          )}

          <Divider style={{ marginTop: 12 }} />
        </View>

        {/* 评论区 */}
        <CommentsHeader count={comments.length} />
        <Divider />

        {comments.map((comment, index) => (
          <View key={comment.id}>
            <CommentItem comment={comment} />
            {index < comments.length - 1 && (
              <Divider style={{ marginLeft: 60 }} />
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
