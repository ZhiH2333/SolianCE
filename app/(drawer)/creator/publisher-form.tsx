import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';
import {
  Appbar,
  Button,
  Snackbar,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UserAvatar from '@/components/common/UserAvatar';
import {
  createPublisher,
  deletePublisher,
  getPublisher,
  updatePublisher,
} from '@/lib/api/publisher-api';
import { useContentApiSync } from '@/lib/hooks/use-content-api-sync';

function normalizeParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const s: string = Array.isArray(value) ? value[0] : value;
  const t: string = typeof s === 'string' ? s.trim() : '';
  return t.length > 0 ? t : undefined;
}

export default function PublisherFormScreen(): React.JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string | string[] }>();
  const editName: string | undefined = normalizeParam(params.name);

  const sync = useContentApiSync();
  const isEditMode: boolean = useMemo(() => editName !== undefined, [editName]);

  const [nick, setNick] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [avatarUri, setAvatarUri] = useState<string>('');

  const [isBootLoading, setIsBootLoading] = useState<boolean>(isEditMode);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [snackbarVisible, setSnackbarVisible] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');

  const showError = useCallback((message: string): void => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  }, []);

  useEffect(() => {
    if (!isEditMode || !editName || !sync) {
      setIsBootLoading(false);
      return;
    }
    let cancelled: boolean = false;
    setIsBootLoading(true);
    void (async (): Promise<void> => {
      try {
        const pub = await getPublisher(sync, editName);
        if (cancelled) {
          return;
        }
        setNick(pub.nick);
        setName(pub.name);
        setDescription(pub.description ?? '');
        setAvatarUri(pub.avatar ?? '');
      } catch (e: unknown) {
        if (!cancelled) {
          const msg: string = e instanceof Error ? e.message : '加载发布者失败';
          showError(msg);
        }
      } finally {
        if (!cancelled) {
          setIsBootLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEditMode, editName, sync, showError]);

  const onSave = useCallback(async (): Promise<void> => {
    if (!sync) {
      showError('请先登录');
      return;
    }
    const nickTrim: string = nick.trim();
    const nameTrim: string = name.trim();
    if (nickTrim.length === 0) {
      showError('请填写显示名称');
      return;
    }
    if (nameTrim.length === 0) {
      showError('请填写唯一标识');
      return;
    }
    setIsSaving(true);
    try {
      if (isEditMode && editName) {
        await updatePublisher(sync, editName, {
          nick: nickTrim,
          description: description.trim().length > 0 ? description.trim() : undefined,
        });
      } else {
        await createPublisher(sync, {
          name: nameTrim,
          nick: nickTrim,
          description: description.trim().length > 0 ? description.trim() : undefined,
          type: 'individual',
        });
      }
      router.back();
    } catch (e: unknown) {
      const msg: string = e instanceof Error ? e.message : '保存失败';
      showError(msg);
    } finally {
      setIsSaving(false);
    }
  }, [sync, nick, name, description, isEditMode, editName, router, showError]);

  const onDelete = useCallback((): void => {
    if (!editName || !sync) {
      return;
    }
    Alert.alert('删除发布者', `确定要删除 @${editName} 吗？此操作不可恢复。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: (): void => {
          void (async (): Promise<void> => {
            try {
              await deletePublisher(sync, editName);
              router.replace('/creator');
            } catch (e: unknown) {
              const msg: string = e instanceof Error ? e.message : '删除失败';
              showError(msg);
            }
          })();
        },
      },
    ]);
  }, [editName, sync, router, showError]);

  const inputTheme = {
    colors: {
      ...theme.colors,
      background: theme.colors.surfaceVariant,
    },
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header
        mode="small"
        elevated
        style={{ paddingTop: insets.top, backgroundColor: theme.colors.elevation.level2 }}
      >
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={isEditMode ? '编辑发布者' : '新建发布者'} />
        <Appbar.Action
          disabled={isSaving || isBootLoading || !sync}
          icon="check"
          iconColor={theme.colors.onSurface}
          loading={isSaving}
          onPress={() => void onSave()}
        />
      </Appbar.Header>

      {isBootLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <UserAvatar uri={avatarUri} name={nick.trim().length > 0 ? nick : name || '?'} size={80} />
            <TouchableRipple
              onPress={() => Alert.alert('提示', '头像上传开发中')}
              borderless
              style={{ marginTop: 12, borderRadius: 8 }}
            >
              <Text variant="labelLarge" style={{ color: theme.colors.primary, padding: 8 }}>
                更换头像
              </Text>
            </TouchableRipple>
          </View>

          <TextInput
            mode="flat"
            label="显示名称（nick）"
            value={nick}
            onChangeText={setNick}
            style={{ marginBottom: 12, backgroundColor: theme.colors.surfaceVariant }}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            theme={inputTheme}
          />
          <TextInput
            mode="flat"
            label="唯一标识（name）"
            value={name}
            onChangeText={setName}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isEditMode}
            style={{
              marginBottom: 12,
              backgroundColor: isEditMode ? theme.colors.surfaceDisabled : theme.colors.surfaceVariant,
            }}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            theme={inputTheme}
          />
          <TextInput
            mode="flat"
            label="简介"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={{ marginBottom: 12, backgroundColor: theme.colors.surfaceVariant, minHeight: 120 }}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            theme={inputTheme}
          />

          {isEditMode ? (
            <Button mode="text" textColor={theme.colors.error} onPress={onDelete} style={{ marginTop: 8 }}>
              删除发布者
            </Button>
          ) : null}
        </ScrollView>
      )}

      <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={4000}>
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}
