import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  IconButton,
  ProgressBar,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AttachmentPreview } from '@/components/common/AttachmentPreview';
import UserAvatar from '@/components/common/UserAvatar';
import { uploadFile, type DriveFile } from '@/lib/drive';

const CONTENT_TITLE_LENGTH: number = 20;
const MAX_WIDTH: number = 560;
const AVATAR_SIZE: number = 40;

type AttachmentSlotUploading = {
  localId: string;
  status: 'uploading';
  progress: number;
};

type AttachmentSlotDone = {
  localId: string;
  status: 'done';
  file: DriveFile;
};

type AttachmentSlot = AttachmentSlotUploading | AttachmentSlotDone;

function createLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function buildHeaderTitle(content: string): string {
  const trimmed: string = content.trim();
  if (trimmed.length === 0) {
    return '发帖';
  }
  if (trimmed.length <= CONTENT_TITLE_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, CONTENT_TITLE_LENGTH)}...`;
}

function computeAggregateUploadProgress(slots: AttachmentSlot[]): number {
  const uploading: AttachmentSlotUploading[] = slots.filter(
    (s): s is AttachmentSlotUploading => s.status === 'uploading',
  );
  if (uploading.length === 0) {
    return 0;
  }
  const sum: number = uploading.reduce((acc: number, s: AttachmentSlotUploading) => acc + s.progress, 0);
  return sum / uploading.length / 100;
}

export default function ComposeScreen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [attachments, setAttachments] = useState<AttachmentSlot[]>([]);
  const [snackbarVisible, setSnackbarVisible] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const headerTitle: string = useMemo(() => buildHeaderTitle(content), [content]);
  const showUploadProgress: boolean = useMemo(
    () => attachments.some((s) => s.status === 'uploading'),
    [attachments],
  );
  const aggregateProgress: number = useMemo(
    () => computeAggregateUploadProgress(attachments),
    [attachments],
  );
  const showSnackbar = useCallback((message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  }, []);
  const runUpload = useCallback(
    async (payload: { uri: string; name: string; type: string }) => {
      const localId: string = createLocalId();
      setAttachments((prev) => [...prev, { localId, status: 'uploading', progress: 0 }]);
      try {
        const file: DriveFile = await uploadFile(payload, (percent: number) => {
          setAttachments((prev) =>
            prev.map((s) =>
              s.localId === localId && s.status === 'uploading' ? { ...s, progress: percent } : s,
            ),
          );
        });
        setAttachments((prev) =>
          prev.map((s) => (s.localId === localId ? { localId, status: 'done', file } : s)),
        );
      } catch (err: unknown) {
        setAttachments((prev) => prev.filter((s) => s.localId !== localId));
        const msg: string = err instanceof Error ? err.message : '上传失败';
        showSnackbar(msg);
      }
    },
    [showSnackbar],
  );
  const pickImage = useCallback(async () => {
    const perm: ImagePicker.MediaLibraryPermissionResponse = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showSnackbar('需要相册权限');
      return;
    }
    const result: ImagePicker.ImagePickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (result.canceled || result.assets.length === 0) {
      return;
    }
    const asset: ImagePicker.ImagePickerAsset = result.assets[0];
    const name: string =
      asset.fileName && asset.fileName.length > 0 ? asset.fileName : `image_${createLocalId()}.jpg`;
    const type: string = asset.mimeType && asset.mimeType.length > 0 ? asset.mimeType : 'image/jpeg';
    await runUpload({ uri: asset.uri, name, type });
  }, [runUpload, showSnackbar]);
  const pickVideo = useCallback(async () => {
    const perm: ImagePicker.MediaLibraryPermissionResponse = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showSnackbar('需要相册权限');
      return;
    }
    const result: ImagePicker.ImagePickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });
    if (result.canceled || result.assets.length === 0) {
      return;
    }
    const asset: ImagePicker.ImagePickerAsset = result.assets[0];
    const name: string =
      asset.fileName && asset.fileName.length > 0 ? asset.fileName : `video_${createLocalId()}.mp4`;
    const type: string =
      asset.mimeType && asset.mimeType.length > 0 ? asset.mimeType : 'video/mp4';
    await runUpload({ uri: asset.uri, name, type });
  }, [runUpload, showSnackbar]);
  const pickDocument = useCallback(async () => {
    const result: DocumentPicker.DocumentPickerResult = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) {
      return;
    }
    const doc: DocumentPicker.DocumentPickerAsset = result.assets[0];
    const name: string = doc.name.length > 0 ? doc.name : `file_${createLocalId()}`;
    const type: string =
      doc.mimeType && doc.mimeType.length > 0 ? doc.mimeType : 'application/octet-stream';
    await runUpload({ uri: doc.uri, name, type });
  }, [runUpload]);
  const executePublish = useCallback(() => {
    const attachmentIds: string[] = attachments
      .filter((s): s is AttachmentSlotDone => s.status === 'done')
      .map((s) => s.file.id);
    console.log({ title, description, content, attachmentIds });
    router.back();
  }, [attachments, content, description, router, title]);
  const titleFont = theme.fonts.titleMedium;
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={{ paddingTop: insets.top, backgroundColor: theme.colors.elevation.level2 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 4,
            minHeight: 56,
          }}
        >
          <IconButton
            icon="chevron-left"
            size={28}
            iconColor={theme.colors.onSurface}
            onPress={() => router.back()}
            accessibilityLabel="返回"
          />
          <View style={{ flex: 1, marginHorizontal: 4, minWidth: 0 }}>
            <Text
              variant="headlineSmall"
              style={{ fontWeight: '600', letterSpacing: -0.5 }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {headerTitle}
            </Text>
          </View>
          <IconButton
            icon="cog"
            onPress={() => Alert.alert('提示', '设置功能开发中')}
            accessibilityLabel="设置"
          />
          <Button mode="contained" onPress={executePublish} compact style={{ marginRight: 8 }}>
            发布
          </Button>
        </View>
        {showUploadProgress ? (
          <ProgressBar
            progress={aggregateProgress}
            visible
            color={theme.colors.primary}
            style={{ height: 3 }}
          />
        ) : null}
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 24,
          alignItems: 'center',
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ width: '100%', maxWidth: MAX_WIDTH }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ paddingTop: 8, marginRight: 12 }}>
              <UserAvatar uri="" name="发布者" size={AVATAR_SIZE} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="标题（可选）"
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                style={{
                  backgroundColor: 'transparent',
                  fontSize: titleFont.fontSize,
                  fontWeight: titleFont.fontWeight,
                  lineHeight: titleFont.lineHeight,
                }}
                contentStyle={{ paddingHorizontal: 8, paddingVertical: 8 }}
              />
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="描述（可选）"
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: 'transparent',
                  marginBottom: 0,
                }}
                contentStyle={{ paddingHorizontal: 8, paddingTop: 4, paddingBottom: 12 }}
              />
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="写点什么..."
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                multiline
                autoFocus
                style={{ backgroundColor: 'transparent' }}
                contentStyle={{ paddingHorizontal: 8, paddingVertical: 8 }}
              />
              <View style={{ height: 8 }} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  {attachments.map((slot: AttachmentSlot) => (
                    <View key={slot.localId} style={{ marginRight: 12 }}>
                      {slot.status === 'uploading' ? (
                        <View
                          style={{
                            width: 200,
                            height: 150,
                            borderRadius: 8,
                            backgroundColor: theme.colors.surfaceVariant,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <ActivityIndicator animating size="large" />
                        </View>
                      ) : (
                        <AttachmentPreview file={slot.file} />
                      )}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </ScrollView>
      <View
        style={{
          backgroundColor: theme.colors.surfaceVariant,
          paddingTop: 8,
          paddingHorizontal: 16,
          paddingBottom: 8 + insets.bottom,
          elevation: Platform.OS === 'android' ? 8 : 0,
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: theme.dark ? 0.22 : 0.12,
          shadowRadius: 4,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <IconButton
                icon="image"
                iconColor={theme.colors.primary}
                onPress={pickImage}
                accessibilityLabel="图片"
              />
              <IconButton
                icon="video"
                iconColor={theme.colors.primary}
                onPress={pickVideo}
                accessibilityLabel="视频"
              />
              <IconButton
                icon="paperclip"
                iconColor={theme.colors.primary}
                onPress={pickDocument}
                accessibilityLabel="文件"
              />
              <IconButton
                icon="vote"
                iconColor={theme.colors.primary}
                onPress={() => Alert.alert('提示', '投票功能开发中')}
                accessibilityLabel="投票"
              />
              <IconButton
                icon="link"
                iconColor={theme.colors.primary}
                onPress={() => Alert.alert('提示', '链接功能开发中')}
                accessibilityLabel="链接"
              />
            </View>
          </ScrollView>
          <IconButton
            icon="content-save"
            iconColor={theme.colors.primary}
            onPress={() => Alert.alert('提示', '草稿功能开发中')}
            accessibilityLabel="草稿"
          />
        </View>
      </View>
      <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={4000}>
        {snackbarMessage}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}
