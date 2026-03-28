import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Modal, Pressable, View, type ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import type { DriveFile } from '@/lib/drive';

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units: readonly string[] = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value: number = bytes;
  let unitIndex: number = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const decimals: number = unitIndex === 0 ? 0 : value < 10 ? 1 : 1;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

interface AttachmentPreviewProps {
  file: DriveFile;
  style?: ViewStyle;
}

export function AttachmentPreview({ file, style }: AttachmentPreviewProps): React.JSX.Element {
  const theme = useTheme();
  const [isFullscreenOpen, setIsFullscreenOpen] = useState<boolean>(false);
  const iconColor: string = theme.colors.onSurfaceVariant;
  const textColor: string = theme.colors.onSurface;
  const secondaryColor: string = theme.colors.onSurfaceVariant;

  if (file.type === 'image') {
    return (
      <View style={style}>
        <Pressable onPress={() => setIsFullscreenOpen(true)} accessibilityRole="imagebutton">
          <Image
            source={{ uri: file.url }}
            style={{ width: 200, height: 150, borderRadius: 8 }}
            resizeMode="cover"
            accessibilityLabel={file.name}
          />
        </Pressable>
        <Modal
          visible={isFullscreenOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsFullscreenOpen(false)}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: theme.colors.backdrop,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={() => setIsFullscreenOpen(false)}
          >
            <Image
              source={{ uri: file.url }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
              accessibilityLabel={file.name}
            />
          </Pressable>
        </Modal>
      </View>
    );
  }

  if (file.type === 'video') {
    return (
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, maxWidth: 280 }, style]}>
        <MaterialCommunityIcons name="file-video" size={28} color={iconColor} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={2}
            style={{ color: textColor }}
            variant="bodyMedium"
          >
            {file.name}
          </Text>
          <Text style={{ color: secondaryColor, marginTop: 4 }} variant="bodySmall">
            —:—
          </Text>
        </View>
      </View>
    );
  }

  if (file.type === 'audio') {
    return (
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, maxWidth: 280 }, style]}>
        <MaterialCommunityIcons name="music-note" size={28} color={iconColor} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={2} style={{ color: textColor }} variant="bodyMedium">
            {file.name}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, maxWidth: 280 }, style]}>
      <MaterialCommunityIcons name="file-outline" size={28} color={iconColor} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={2} style={{ color: textColor }} variant="bodyMedium">
          {file.name}
        </Text>
        <Text style={{ color: secondaryColor, marginTop: 4 }} variant="bodySmall">
          {formatBytes(file.size)}
        </Text>
      </View>
    </View>
  );
}
