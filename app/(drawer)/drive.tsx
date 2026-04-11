import React, { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { FlatList, Image, Pressable, View, Linking } from 'react-native';
import {
  Appbar,
  Checkbox,
  Chip,
  Dialog,
  Divider,
  IconButton,
  Menu,
  Modal,
  Portal,
  ProgressBar,
  Text,
  useTheme,
  Checkbox as RNPCheckbox,
} from 'react-native-paper';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  type DriveFile,
  type DriveFolder,
  getUnindexedFiles,
  getQuota,
  getUsage,
  deleteFile,
  batchDeleteFiles,
  removeIndex,
  getFolderContents,
  uploadToIndex,
  type DriveQuota,
} from '@/lib/drive';
import { useContentApiSync } from '@/lib/hooks/use-content-api-sync';

const PAGE_SIZE = 30;

type SortField = 'date' | 'name' | 'size';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN');
}

function getFileIcon(mimeType: string, fileType: DriveFile['type']): string {
  if (fileType === 'image') return 'image';
  if (fileType === 'video') return 'video';
  if (fileType === 'audio') return 'music';
  if (mimeType.includes('pdf')) return 'file-pdf-box';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'file-word';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'file-excel';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'file-powerpoint';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) return 'folder-zip';
  if (mimeType.includes('text')) return 'file-document';
  return 'file';
}

interface FileItemProps {
  file: DriveFile;
  viewMode: ViewMode;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onPress: (file: DriveFile) => void;
  onMorePress: (file: DriveFile, event: any) => void;
  selected: boolean;
  theme: any;
}

function FileListItem({ file, isSelected, onSelect, onPress, onMorePress, theme }: FileItemProps) {
  return (
    <Pressable
      onPress={() => onPress(file)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        backgroundColor: isSelected ? theme.colors.primaryContainer + '44' : 'transparent',
        borderRadius: 8,
      }}
    >
      <RNPCheckbox status={isSelected ? 'checked' : 'unchecked'} onPress={() => onSelect(file.id)} />
      {file.type === 'image' && file.url ? (
        <Image source={{ uri: file.url }} style={{ width: 48, height: 48, borderRadius: 8, marginRight: 12 }} />
      ) : (
        <View style={{
          width: 48,
          height: 48,
          borderRadius: 8,
          backgroundColor: theme.colors.surfaceVariant,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}>
          <MaterialCommunityIcons
            name={getFileIcon(file.mimeType, file.type) as any}
            size={24}
            color={theme.colors.onSurfaceVariant}
          />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium" numberOfLines={1} style={{ color: theme.colors.onSurface }}>
          {file.name}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
          {formatFileSize(file.size)} · {formatDate(file.createdAt || file.updatedAt || '')}
        </Text>
      </View>
      <IconButton
        icon="dots-vertical"
        size={20}
        onPress={(e) => onMorePress(file, e)}
        iconColor={theme.colors.onSurfaceVariant}
      />
    </Pressable>
  );
}

function FileGridItem({ file, isSelected, onSelect, onPress, onMorePress, theme }: FileItemProps) {
  return (
    <Pressable
      onPress={() => onPress(file)}
      onLongPress={() => onSelect(file.id)}
      style={{
        width: '48%',
        marginBottom: 12,
        backgroundColor: isSelected ? theme.colors.primaryContainer + '44' : 'transparent',
        borderRadius: 12,
        padding: 8,
      }}
    >
      <View style={{ position: 'relative' }}>
        {file.type === 'image' && file.url ? (
          <Image source={{ uri: file.url }} style={{ width: '100%', aspectRatio: 1, borderRadius: 8 }} />
        ) : (
          <View style={{
            width: '100%',
            aspectRatio: 1,
            borderRadius: 8,
            backgroundColor: theme.colors.surfaceVariant,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <MaterialCommunityIcons
              name={getFileIcon(file.mimeType, file.type) as any}
              size={36}
              color={theme.colors.onSurfaceVariant}
            />
          </View>
        )}
        <View style={{ position: 'absolute', top: 4, left: 4 }}>
          <RNPCheckbox
            status={isSelected ? 'checked' : 'unchecked'}
            onPress={() => onSelect(file.id)}
          />
        </View>
      </View>
      <Text variant="bodySmall" numberOfLines={1} style={{ color: theme.colors.onSurface, marginTop: 8 }}>
        {file.name}
      </Text>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
        {formatFileSize(file.size)}
      </Text>
    </Pressable>
  );
}

interface FolderItemProps {
  folder: DriveFolder;
  onPress: (folder: DriveFolder) => void;
  theme: any;
}

function FolderListItem({ folder, onPress, theme }: FolderItemProps) {
  return (
    <Pressable
      onPress={() => onPress(folder)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 8,
      }}
    >
      <View style={{
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: theme.colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
      }}>
        <MaterialCommunityIcons
          name="folder"
          size={24}
          color={theme.colors.onPrimaryContainer}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium" numberOfLines={1} style={{ color: theme.colors.onSurface }}>
          {folder.name}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
          {formatDate(folder.createdAt || folder.updatedAt || '')}
        </Text>
      </View>
    </Pressable>
  );
}

function FolderGridItem({ folder, onPress, theme }: FolderItemProps) {
  return (
    <Pressable
      onPress={() => onPress(folder)}
      style={{
        width: '48%',
        marginBottom: 12,
        borderRadius: 12,
        padding: 8,
      }}
    >
      <View style={{ alignItems: 'center', padding: 12 }}>
        <View style={{
          width: 64,
          height: 64,
          borderRadius: 12,
          backgroundColor: theme.colors.primaryContainer,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <MaterialCommunityIcons
            name="folder"
            size={36}
            color={theme.colors.onPrimaryContainer}
          />
        </View>
        <Text variant="bodySmall" numberOfLines={1} style={{ color: theme.colors.onSurface, marginTop: 8 }}>
          {folder.name}
        </Text>
      </View>
    </Pressable>
  );
}

interface QuotaModalProps {
  visible: boolean;
  onDismiss: () => void;
  quota: DriveQuota | null;
  loading: boolean;
  theme: any;
}

function QuotaModal({ visible, onDismiss, quota, loading, theme }: QuotaModalProps) {
  const [selectedPoolIndex, setSelectedPoolIndex] = useState(0);
  const [poolMenuVisible, setPoolMenuVisible] = useState(false);
  const selectedPool = quota?.pools?.[selectedPoolIndex];
  const usedPercent = quota && quota.total > 0 ? Math.round((quota.used / quota.total) * 100) : 0;
  const usedPointsPercent = quota && quota.totalPoints > 0 ? Math.round((quota.usedPoints / quota.totalPoints) * 100) : 0;
  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={{
        backgroundColor: theme.colors.surface,
        margin: 24,
        borderRadius: 16,
        padding: 20,
      }}>
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '600', marginBottom: 16 }}>
          存储配额
        </Text>
        {loading ? (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>加载中...</Text>
        ) : quota ? (
          <>
            <View style={{ marginBottom: 20 }}>
              <Text variant="labelMedium" style={{ color: theme.colors.primary, marginBottom: 8 }}>存储空间</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>已使用</Text>
                <Text style={{ color: theme.colors.onSurface }}>{formatFileSize(quota.used)}</Text>
              </View>
              <View style={{ height: 8, backgroundColor: theme.colors.surfaceVariant, borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ width: `${usedPercent}%`, height: '100%', backgroundColor: theme.colors.primary }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>总容量</Text>
                <Text style={{ color: theme.colors.onSurface }}>{formatFileSize(quota.total)}</Text>
              </View>
            </View>
            <Divider style={{ marginBottom: 20 }} />
            <View style={{ marginBottom: 20 }}>
              <Text variant="labelMedium" style={{ color: theme.colors.primary, marginBottom: 8 }}>文件数量</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>已使用</Text>
                <Text style={{ color: theme.colors.onSurface }}>{quota.usedFiles} 个文件</Text>
              </View>
              {quota.totalFiles > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>上限</Text>
                  <Text style={{ color: theme.colors.onSurface }}>{quota.totalFiles} 个</Text>
                </View>
              )}
            </View>
            <Divider style={{ marginBottom: 20 }} />
            <View style={{ marginBottom: 20 }}>
              <Text variant="labelMedium" style={{ color: theme.colors.primary, marginBottom: 8 }}>配额点</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>已使用</Text>
                <Text style={{ color: theme.colors.onSurface }}>{quota.usedPoints.toLocaleString()}</Text>
              </View>
              {quota.totalPoints > 0 && (
                <>
                  <View style={{ height: 8, backgroundColor: theme.colors.surfaceVariant, borderRadius: 4, overflow: 'hidden' }}>
                    <View style={{ width: `${usedPointsPercent}%`, height: '100%', backgroundColor: theme.colors.tertiary }} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                    <Text style={{ color: theme.colors.onSurfaceVariant }}>总配额点</Text>
                    <Text style={{ color: theme.colors.onSurface }}>{quota.totalPoints.toLocaleString()}</Text>
                  </View>
                </>
              )}
            </View>
            {quota.pools && quota.pools.length > 0 && (
              <>
                <Divider style={{ marginTop: 20, marginBottom: 20 }} />
                <Text variant="labelMedium" style={{ color: theme.colors.primary, marginBottom: 8 }}>存储池</Text>
                <Menu
                  visible={poolMenuVisible}
                  onDismiss={() => setPoolMenuVisible(false)}
                  anchor={
                    <Chip
                      icon="chevron-down"
                      onPress={() => setPoolMenuVisible(true)}
                      style={{ backgroundColor: theme.colors.surfaceVariant, marginBottom: 12 }}
                      textStyle={{ color: theme.colors.onSurfaceVariant }}
                    >
                      {selectedPool?.poolName || '选择存储池'}
                    </Chip>
                  }
                >
                  {quota.pools.map((pool, index) => (
                    <Menu.Item
                      key={pool.poolId}
                      title={pool.poolName}
                      leadingIcon={index === selectedPoolIndex ? 'check' : undefined}
                      onPress={() => {
                        setSelectedPoolIndex(index);
                        setPoolMenuVisible(false);
                      }}
                    />
                  ))}
                </Menu>
                {selectedPool && (
                  <View style={{ marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ color: theme.colors.onSurfaceVariant }}>已使用</Text>
                      <Text style={{ color: theme.colors.onSurface }}>{formatFileSize(selectedPool.usageBytes)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.colors.onSurfaceVariant }}>文件数</Text>
                      <Text style={{ color: theme.colors.onSurface }}>{selectedPool.fileCount} 个</Text>
                    </View>
                  </View>
                )}
              </>
            )}
          </>
        ) : (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>无法获取配额信息</Text>
        )}
        <Appbar.Action
          icon="close"
          onPress={onDismiss}
          style={{ position: 'absolute', top: 8, right: 8 }}
        />
      </Modal>
  );
}

export default function DriveScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const sync = useContentApiSync();

  const [tabIndex, setTabIndex] = useState(0);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const [quota, setQuota] = useState<DriveQuota | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);

  const [menuVisible, setMenuVisible] = useState(false);
  const [typeMenuVisible, setTypeMenuVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number; file: DriveFile } | null>(null);
  const [dialogType, setDialogType] = useState<'delete' | 'info' | null>(null);
  const [dialogFile, setDialogFile] = useState<DriveFile | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);

  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<DriveFolder[]>([]);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const loadFiles = useCallback(async (reset: boolean = false) => {
    if (!sync) return;
    if (loading) return;
    setLoading(true);
    setLoadError(null);
    try {
      const currentOffset = reset ? 0 : offset;
      if (tabIndex === 0) {
        const result = await getFolderContents(currentFolderId, currentOffset, PAGE_SIZE);
        const sortedFiles = sortFiles(result.files, sortField, sortOrder);
        setFolders(result.folders);
        setFiles(sortedFiles);
        setOffset(currentOffset + result.files.length);
        setHasMore(result.files.length === PAGE_SIZE);
      } else {
        const result = await getUnindexedFiles(currentOffset, PAGE_SIZE);
        if (result.items.length === 0 && currentOffset === 0) {
          setLoadError('暂无未索引文件');
        }
        setFiles(prev => {
          const newFiles = reset ? result.items : [...prev, ...result.items];
          return sortFiles(newFiles, sortField, sortOrder);
        });
        setOffset(currentOffset + result.items.length);
        setHasMore(result.items.length === PAGE_SIZE);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [sync, tabIndex, sortField, sortOrder, currentFolderId]);

  const loadQuota = useCallback(async () => {
    if (!sync) return;
    setQuotaLoading(true);
    try {
      const q = await getQuota();
      setQuota(q);
    } catch {} finally {
      setQuotaLoading(false);
    }
  }, [sync]);

  const handleFolderPress = (folder: DriveFolder) => {
    const newPath = folderPath.length > 0 ? [...folderPath] : [];
    newPath.push({ id: currentFolderId || 'root', name: currentFolderId ? folderPath[folderPath.length - 1]?.name || '目录' : '根目录', path: '', parentId: null, createdAt: '', updatedAt: '' });
    setFolderPath(newPath);
    setCurrentFolderId(folder.id);
    setOffset(0);
    setFiles([]);
    setFolders([]);
    setLoadError(null);
  };

  const handleGoBack = () => {
    if (folderPath.length > 0) {
      const newPath = [...folderPath];
      newPath.pop();
      setFolderPath(newPath);
      const prev = newPath[newPath.length - 1];
      const newFolderId = prev?.id === 'root' || !prev ? null : prev?.id;
      setCurrentFolderId(newFolderId);
      setOffset(0);
      setFiles([]);
      setFolders([]);
      setLoadError(null);
    } else if (currentFolderId) {
      setCurrentFolderId(null);
      setOffset(0);
      setFiles([]);
      setFolders([]);
      setLoadError(null);
    }
  };

  const handleUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 1,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];
      setUploading(true);
      setUploadProgress(0);
      await uploadToIndex(
        { uri: asset.uri, name: asset.fileName || 'file', type: asset.mimeType || 'application/octet-stream' },
        currentFolderId,
        (p) => setUploadProgress(p)
      );
      void loadFiles(true);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '上传失败');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const sortFiles = useCallback((items: DriveFile[], field: SortField, order: SortOrder): DriveFile[] => {
    const sorted = [...items].sort((a, b) => {
      let cmp = 0;
      if (field === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (field === 'size') {
        cmp = a.size - b.size;
      } else {
        const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        cmp = dateA - dateB;
      }
      return order === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, []);

  useEffect(() => {
    if (!sync) return;
    setFiles([]);
    setFolders([]);
    setOffset(0);
    setSelectedIds(new Set());
    setSelectionMode(false);
    void loadFiles(true);
  }, [sync]);

  useEffect(() => {
    if (!sync) return;
    void loadFiles(true);
  }, [tabIndex, sortField, sortOrder, currentFolderId]);

  useEffect(() => {
    if (!sync || tabIndex !== 0) return;
    void loadQuota();
  }, [sync, tabIndex]);

  const handleSelect = (id: string) => {
    if (!selectionMode) {
      setSelectionMode(true);
    }
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
    if (newSet.size === 0) {
      setSelectionMode(false);
    }
  };

  const handleFilePress = (file: DriveFile) => {
    if (selectionMode) {
      handleSelect(file.id);
    } else {
      setDialogFile(file);
      setDialogType('info');
      setDialogVisible(true);
    }
  };

  const handleMorePress = (file: DriveFile, event: any) => {
    setMenuAnchor({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY, file });
    setMenuVisible(true);
  };

  const handleMenuAction = async (action: string) => {
    setMenuVisible(false);
    if (!menuAnchor) return;
    const file = menuAnchor.file;
    if (action === 'download') {
      try {
        await Linking.openURL(file.url);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : '下载失败');
      }
    } else if (action === 'delete') {
      setDialogFile(file);
      setDialogType('delete');
      setDialogVisible(true);
    } else if (action === 'info') {
      setDialogFile(file);
      setDialogType('info');
      setDialogVisible(true);
    }
  };

  const confirmDelete = async () => {
    if (!sync || !dialogFile) return;
    setDialogVisible(false);
    try {
      if (selectedIds.size > 0) {
        await batchDeleteFiles([...selectedIds]);
        setSelectedIds(new Set());
        setSelectionMode(false);
      } else {
        await deleteFile(dialogFile.id);
      }
      void loadFiles(true);
    } catch (error) {
      // handle error
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      void loadFiles(false);
    }
  };

  const renderItem = ({ item, index }: { item: DriveFile | DriveFolder; index: number }) => {
    if (index < folders.length) {
      const folder = folders[index] as DriveFolder;
      if (viewMode === 'grid') {
        return <FolderGridItem folder={folder} onPress={handleFolderPress} theme={theme} />;
      }
      return <FolderListItem folder={folder} onPress={handleFolderPress} theme={theme} />;
    }
    const file = item as DriveFile;
    if (viewMode === 'grid') {
      return (
        <FileGridItem
          file={file}
          viewMode={viewMode}
          isSelected={selectedIds.has(file.id)}
          onSelect={handleSelect}
          onPress={handleFilePress}
          onMorePress={(f, e) => handleMorePress(f, e)}
          selected={selectedIds.has(file.id)}
          theme={theme}
        />
      );
    }
    return (
      <FileListItem
        file={file}
        viewMode={viewMode}
        isSelected={selectedIds.has(file.id)}
        onSelect={handleSelect}
        onPress={handleFilePress}
        onMorePress={(f, e) => handleMorePress(f, e)}
        selected={selectedIds.has(file.id)}
        theme={theme}
      />
    );
  };

  const allItems = [...folders, ...files];

  const DriveDialogDismiss = ({ onPress, children }: { onPress: () => void; children: ReactNode }) => {
    return (
      <Pressable onPress={onPress} style={{ padding: 8 }}>{children}</Pressable>
    );
  };

  const DriveDialogConfirm = ({ onPress, children }: { onPress: () => void; children: ReactNode }) => {
    return (
      <Pressable onPress={onPress} style={{ padding: 8 }}>{children}</Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }} elevated>
        {selectionMode ? (
          <>
            <Appbar.Action
              icon="close"
              iconColor={theme.colors.onSurface}
              onPress={() => {
                setSelectedIds(new Set());
                setSelectionMode(false);
              }}
            />
            <Appbar.Content
              title={`已选择 ${selectedIds.size} 项`}
              titleStyle={{ color: theme.colors.onSurface }}
            />
            <Appbar.Action
              icon="delete"
              iconColor={theme.colors.error}
              onPress={() => {
                setDialogType('delete');
                setDialogVisible(true);
              }}
              disabled={selectedIds.size === 0}
            />
          </>
        ) : (
          <>
            {currentFolderId || folderPath.length > 0 ? (
              <Appbar.BackAction
                onPress={handleGoBack}
              />
            ) : (
              <Appbar.Action
                icon="menu"
                iconColor={theme.colors.onSurface}
                onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
              />
            )}
            <Appbar.Content
              title={currentFolderId ? folderPath[folderPath.length - 1]?.name || '文件夹' : '文件'}
              titleStyle={{ color: theme.colors.onSurface, fontWeight: '600', textAlign: 'center' }}
            />
            <Appbar.Action
              icon="chart-donut"
              iconColor={theme.colors.onSurfaceVariant}
              onPress={() => setShowQuotaModal(true)}
            />
          </>
        )}
      </Appbar.Header>

      {uploading && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
            上传中... {uploadProgress}%
          </Text>
          <ProgressBar progress={uploadProgress / 100} />
        </View>
      )}

      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Menu
            visible={typeMenuVisible}
            onDismiss={() => setTypeMenuVisible(false)}
            anchor={
              <Chip
                icon="chevron-down"
                onPress={() => setTypeMenuVisible(true)}
                style={{ backgroundColor: theme.colors.surfaceVariant }}
                textStyle={{ color: theme.colors.onSurfaceVariant }}
              >
                {tabIndex === 0 ? '已索引文件' : '未索引文件'}
              </Chip>
            }
          >
            <Menu.Item
              title="已索引文件"
              leadingIcon={tabIndex === 0 ? 'check' : undefined}
              onPress={() => {
                setTabIndex(0);
                setTypeMenuVisible(false);
              }}
            />
            <Menu.Item
              title="未索引文件"
              leadingIcon={tabIndex === 1 ? 'check' : undefined}
              onPress={() => {
                setTabIndex(1);
                setTypeMenuVisible(false);
              }}
            />
          </Menu>
          <View style={{ flex: 1 }} />
          {tabIndex === 0 && (
            <IconButton
              icon="upload"
              size={20}
              onPress={handleUpload}
              iconColor={theme.colors.onSurfaceVariant}
              disabled={uploading}
            />
          )}
          <IconButton
            icon={viewMode === 'list' ? 'view-grid' : 'view-list'}
            size={20}
            onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            iconColor={theme.colors.onSurfaceVariant}
          />
          <Menu
            visible={sortMenuVisible}
            onDismiss={() => setSortMenuVisible(false)}
            anchor={
              <IconButton
                icon="sort"
                size={20}
                onPress={() => setSortMenuVisible(true)}
                iconColor={theme.colors.onSurfaceVariant}
              />
            }
          >
            <Menu.Item
              title="按日期"
              leadingIcon={sortField === 'date' ? 'check' : undefined}
              onPress={() => setSortField('date')}
            />
            <Menu.Item
              title="按名称"
              leadingIcon={sortField === 'name' ? 'check' : undefined}
              onPress={() => setSortField('name')}
            />
            <Menu.Item
              title="按大小"
              leadingIcon={sortField === 'size' ? 'check' : undefined}
              onPress={() => setSortField('size')}
            />
            <Divider />
            <Menu.Item
              title="升序"
              leadingIcon={sortOrder === 'asc' ? 'check' : undefined}
              onPress={() => setSortOrder('asc')}
            />
            <Menu.Item
              title="降序"
              leadingIcon={sortOrder === 'desc' ? 'check' : undefined}
              onPress={() => setSortOrder('desc')}
            />
          </Menu>
        </View>
      </View>

      {selectionMode && selectedIds.size > 0 && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            已选择 {selectedIds.size} 个文件
          </Text>
        </View>
      )}

      <FlatList
        data={allItems}
        keyExtractor={(item, index) => index < folders.length ? `folder-${(item as DriveFolder).id}` : `file-${(item as DriveFile).id}`}
        renderItem={({ item, index }) => renderItem({ item, index })}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80, flexGrow: allItems.length === 0 ? 0 : 1 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          loading ? (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>加载中...</Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <MaterialCommunityIcons
                name="folder-open-outline"
                size={64}
                color={theme.colors.onSurfaceVariant}
              />
              <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
                {loadError || (tabIndex === 0 ? '暂无已索引文件' : '暂无未索引文件')}
              </Text>
            </View>
          )
        }
      />

      {menuAnchor && (
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={{ x: menuAnchor.x, y: menuAnchor.y }}
        >
          <Menu.Item
            title="下载"
            leadingIcon="download"
            onPress={() => handleMenuAction('download')}
          />
          <Menu.Item
            title="查看详情"
            leadingIcon="information"
            onPress={() => handleMenuAction('info')}
          />
          <Menu.Item
            title="删除"
            leadingIcon="delete"
            onPress={() => handleMenuAction('delete')}
          />
        </Menu>
      )}

      <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
        <Dialog.Title>{dialogType === 'delete' ? '确认删除' : '文件信息'}</Dialog.Title>
        <Dialog.Content>
          {dialogType === 'delete' ? (
            <Text>
              {selectedIds.size > 0
                ? `确定删除选中的 ${selectedIds.size} 个文件吗？此操作不可撤销。`
                : `确定删除文件 "${dialogFile?.name}" 吗？此操作不可撤销。`}
            </Text>
          ) : dialogFile ? (
            <View>
              <Text style={{ marginBottom: 8 }}>文件名: {dialogFile.name}</Text>
              <Text style={{ marginBottom: 8 }}>大小: {formatFileSize(dialogFile.size)}</Text>
              <Text style={{ marginBottom: 8 }}>类型: {dialogFile.mimeType}</Text>
              {dialogFile.createdAt && <Text style={{ marginBottom: 8 }}>创建时间: {formatDate(dialogFile.createdAt)}</Text>}
              {dialogFile.updatedAt && <Text style={{ marginBottom: 8 }}>更新时间: {formatDate(dialogFile.updatedAt)}</Text>}
            </View>
          ) : null}
        </Dialog.Content>
        <Dialog.Actions>
          <DriveDialogDismiss onPress={() => setDialogVisible(false)}>
            <Text>取消</Text>
          </DriveDialogDismiss>
          {dialogType === 'delete' && (
            <DriveDialogConfirm onPress={confirmDelete}>
              <Text style={{ color: theme.colors.error }}>删除</Text>
            </DriveDialogConfirm>
          )}
        </Dialog.Actions>
      </Dialog>

      <QuotaModal
        visible={showQuotaModal}
        onDismiss={() => setShowQuotaModal(false)}
        quota={quota}
        loading={quotaLoading}
        theme={theme}
      />
    </View>
  );
}

// End of file