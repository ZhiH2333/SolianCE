import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, View } from 'react-native';
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
  Text,
  useTheme,
  Checkbox as RNPCheckbox,
} from 'react-native-paper';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  type DriveFile,
  getIndexedFiles,
  getUnindexedFiles,
  getQuota,
  deleteFile,
  batchDeleteFiles,
  removeIndex,
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
  onMorePress: (file: DriveFile) => void;
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
        onPress={() => onMorePress(file)}
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
          <Image source={{ uri: file.url }} style={{ width: '100%', aspectRatio: 1, borderRadius: 12 }} />
        ) : (
          <View style={{
            width: '100%',
            aspectRatio: 1,
            borderRadius: 12,
            backgroundColor: theme.colors.surfaceVariant,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <MaterialCommunityIcons
              name={getFileIcon(file.mimeType, file.type) as any}
              size={48}
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

interface QuotaModalProps {
  visible: boolean;
  onDismiss: () => void;
  quota: DriveQuota | null;
  loading: boolean;
  theme: any;
}

function QuotaModal({ visible, onDismiss, quota, loading, theme }: QuotaModalProps) {
  const usedPercent = quota ? Math.round((quota.used / quota.total) * 100) : 0;
  return (
    <Portal>
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
            <View style={{ marginBottom: 16 }}>
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
            <Divider style={{ marginBottom: 16 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>文件数量</Text>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>{quota.fileCount}</Text>
              </View>
            </View>
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
    </Portal>
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
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number; file: DriveFile } | null>(null);
  const [dialogType, setDialogType] = useState<'delete' | 'info' | null>(null);
  const [dialogFile, setDialogFile] = useState<DriveFile | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);

  const loadFiles = useCallback(async (reset: boolean = false) => {
    if (!sync) return;
    setLoading(true);
    setLoadError(null);
    try {
      const currentOffset = reset ? 0 : offset;
      const fetchFn = tabIndex === 0 ? getIndexedFiles : getUnindexedFiles;
      const result = await fetchFn(currentOffset, PAGE_SIZE);
      const newFiles = reset ? result.items : [...files, ...result.items];
      const sorted = sortFiles(newFiles, sortField, sortOrder);
      setFiles(sorted);
      setOffset(currentOffset + result.items.length);
      setHasMore(result.items.length === PAGE_SIZE);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [sync, tabIndex, offset, sortField, sortOrder]);

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

  const sortFiles = (items: DriveFile[], field: SortField, order: SortOrder): DriveFile[] => {
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
  };

  useEffect(() => {
    console.log('[Drive] useEffect triggered, tabIndex:', tabIndex, 'sortField:', sortField, 'sortOrder:', sortOrder);
    setFiles([]);
    setOffset(0);
    setSelectedIds(new Set());
    setSelectionMode(false);
    void loadFiles(true);
    if (tabIndex === 0) {
      void loadQuota();
    }
  }, [tabIndex, sortField, sortOrder]);

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
    if (action === 'delete') {
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

  const renderItem = ({ item }: { item: DriveFile }) => {
    if (viewMode === 'grid') {
      return (
        <FileGridItem
          file={item}
          viewMode={viewMode}
          isSelected={selectedIds.has(item.id)}
          onSelect={handleSelect}
          onPress={handleFilePress}
          onMorePress={(f) => {
            // @ts-ignore
            handleMorePress(f, { nativeEvent: { pageX: 0, pageY: 0 } });
          }}
          selected={selectedIds.has(item.id)}
          theme={theme}
        />
      );
    }
    return (
      <FileListItem
        file={item}
        viewMode={viewMode}
        isSelected={selectedIds.has(item.id)}
        onSelect={handleSelect}
        onPress={handleFilePress}
        onMorePress={(f) => {
          // @ts-ignore
          handleMorePress(f, { nativeEvent: { pageX: 0, pageY: 0 } });
        }}
        selected={selectedIds.has(item.id)}
        theme={theme}
      />
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
            <Appbar.Action
              icon="menu"
              iconColor={theme.colors.onSurface}
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            />
            <Appbar.Content
              title="云盘"
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
          <IconButton
            icon={viewMode === 'list' ? 'view-grid' : 'view-list'}
            size={20}
            onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            iconColor={theme.colors.onSurfaceVariant}
          />
          <Menu
            visible={false}
            onDismiss={() => {}}
            anchor={
              <IconButton
                icon="sort"
                size={20}
                onPress={() => {}}
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
        data={files}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          console.log('[Drive] Rendering item:', item.id, item.name);
          return renderItem({ item });
        }}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80, flexGrow: files.length === 0 ? 0 : 1 }}
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
          <DialogDismiss onPress={() => setDialogVisible(false)}>
            <Text>取消</Text>
          </DialogDismiss>
          {dialogType === 'delete' && (
            <DialogConfirm onPress={confirmDelete}>
              <Text style={{ color: theme.colors.error }}>删除</Text>
            </DialogConfirm>
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

function DialogDismiss({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} style={{ padding: 8 }}>
      {children}
    </Pressable>
  );
}

function DialogConfirm({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} style={{ padding: 8 }}>
      {children}
    </Pressable>
  );
}