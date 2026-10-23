import { BoardHeader, BoardType } from '@/components/board/BoardHeader';
import { CardDetailModal } from '@/components/board/CardDetailModal';
import { ColumnFormModal } from '@/components/board/ColumnFormModal';
import { KanbanColumn } from '@/components/board/KanbanColumn';
import { confirmDialog } from '@/lib/confirm';
import { useNetworkStatus } from '@/lib/network';
import { boardCacheService } from '@/services/boardCacheService';
import { offlineQueueService } from '@/services/offlineQueueService';
import { profileService } from '@/services/profileService';
import { syncService } from '@/services/syncService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  CardItem,
  ColumnItem,
  createCard,
  createColumn,
  deleteCard,
  deleteColumn,
  fetchBoardByType,
  moveCard,
  optimisticDeleteCard,
  optimisticMoveCard,
  optimisticUpdateCard,
  setBoardFromCache,
  Profile,
  updateCardDetails,
  updateColumn,
} from '@/store/slices/boardSlice';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

export default function BoardScreen() {
  const dispatch = useAppDispatch();
  const { currentBoard, isLoading } = useAppSelector((state) => state.board);
  const { isOnline } = useNetworkStatus();

  // Active Board Tab ('marketing' | 'production' | 'general')
  const [activeBoardType, setActiveBoardType] = useState<BoardType>('marketing');

  // Drag State (Web)
  const [draggingCard, setDraggingCard] = useState<CardItem | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  // Modal State (Web, iOS, Android)
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  // Kolom tujuan saat menambah kartu baru (mode create)
  const [createColumnId, setCreateColumnId] = useState<string | null>(null);
  // State ID kartu yang sedang dalam proses dihapus
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

  // Column Modal State (Tambah & Edit Kolom)
  const [isColumnModalVisible, setIsColumnModalVisible] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<ColumnItem | null>(null);
  const [savingColumn, setSavingColumn] = useState(false);
  const [deletingColumnId, setDeletingColumnId] = useState<string | null>(null);

  // Status Antrean Mutasi Offline
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  const refreshPendingCount = async () => {
    const count = await offlineQueueService.getCount();
    setPendingSyncCount(count);
  };

  useEffect(() => {
    refreshPendingCount();
    // Ambil daftar user untuk dropdown PIC via service (sekali saat mount)
    profileService
      .getProfiles()
      .then((data) => {
        if (data) setProfiles(data);
      })
      .catch((err) => {
        console.warn('[boards] Info: daftar profiles dimuat dari cache lokal:', err?.message || err);
      });
  }, []);

  useEffect(() => {
    let isMounted = true;
    // 1. Muat data offline terlebih dahulu secara instan jika ada di cache lokal (0ms render)
    boardCacheService.getBoardCache(activeBoardType).then((cached) => {
      if (isMounted && cached) {
        dispatch(setBoardFromCache(cached));
      }
    });

    // 2. Ambil data terbaru dari server di background (Stale-While-Revalidate)
    dispatch(fetchBoardByType(activeBoardType));

    return () => {
      isMounted = false;
    };
  }, [dispatch, activeBoardType]);

  // Otomatis sinkronkan antrean offline secara senyap di latar belakang saat online kembali (tanpa reload halaman)
  useEffect(() => {
    if (isOnline) {
      syncService
        .processQueue((remaining) => {
          setPendingSyncCount(remaining);
        })
        .then(() => {
          refreshPendingCount();
          // Simpan snapshot board lokal terbaru tanpa perlu me-reload / me-refresh halaman
          if (currentBoard) {
            boardCacheService.saveBoardCache(activeBoardType, currentBoard);
          }
        });
    } else {
      refreshPendingCount();
    }
  }, [isOnline, activeBoardType, currentBoard]);

  const handleRefresh = async () => {
    if (isOnline) {
      await syncService.processQueue((remaining) => setPendingSyncCount(remaining));
      await refreshPendingCount();
    }
    dispatch(fetchBoardByType(activeBoardType));
  };

  // Drag Handlers dengan Optimistic UI
  const handleDropOnColumn = (targetColumnId: string) => {
    if (!draggingCard) return;

    if (draggingCard.column_id !== targetColumnId) {
      const targetColumn = currentBoard?.board_columns.find((c) => c.id === targetColumnId);
      const newPosition = (targetColumn?.board_cards.length || 0) + 1;

      // 1. Optimistic Update instan di UI lokal (0ms)
      dispatch(
        optimisticMoveCard({
          cardId: draggingCard.id,
          targetColumnId,
          newPosition,
        })
      );

      // 2. Kirim mutasi (online: Supabase; offline: disimpan ke antrean offline)
      dispatch(
        moveCard({
          cardId: draggingCard.id,
          targetColumnId,
          newPosition,
        })
      ).then(() => {
        refreshPendingCount();
      });
    }

    setDraggingCard(null);
    setDragOverColumnId(null);
  };

  // Save Modal Handler (Edit & Create) dengan Optimistic UI
  const handleSaveDetail = async (updatedData: {
    title: string;
    client_name: string;
    client_phone: string;
    estimated_value: number;
    column_id: string;
    assigned_to: string | null;
    notes: string;
  }) => {
    if (!currentBoard) return;

    setSaving(true);
    try {
      if (selectedCard) {
        // 1. Optimistic Update seketika di layar
        dispatch(
          optimisticUpdateCard({
            cardId: selectedCard.id,
            ...updatedData,
          })
        );
        setIsModalVisible(false);

        // 2. Dispatch thunk (online: Supabase; offline: antrean offline)
        await dispatch(
          updateCardDetails({
            cardId: selectedCard.id,
            ...updatedData,
          })
        );
        await refreshPendingCount();
      } else {
        // Mode create
        const targetColumn = currentBoard.board_columns.find((c) => c.id === updatedData.column_id);
        const position = (targetColumn?.board_cards.length || 0) + 1;

        await dispatch(
          createCard({
            board_id: currentBoard.id,
            position,
            ...updatedData,
          })
        ).unwrap();

        setIsModalVisible(false);
        dispatch(fetchBoardByType(activeBoardType));
      }
    } catch (err: any) {
      Alert.alert('Gagal', err || 'Terjadi kesalahan saat menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenCreate = (columnId: string) => {
    setSelectedCard(null);
    setCreateColumnId(columnId);
    setIsModalVisible(true);
  };

  const handleDeleteCard = async (card: CardItem) => {
    const confirmed = await confirmDialog({
      title: 'Hapus Kartu',
      message: `Apakah Anda yakin ingin menghapus kartu "${card.title}"?`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      destructive: true,
    });

    if (!confirmed) return;

    setDeletingCardId(card.id);
    try {
      // 1. Optimistic Delete seketika
      dispatch(optimisticDeleteCard(card.id));

      // 2. Dispatch thunk delete (online: Supabase; offline: antrean offline)
      await dispatch(deleteCard(card.id));
      await refreshPendingCount();
    } catch (err: any) {
      Alert.alert('Gagal Menghapus', err || 'Gagal menghapus kartu.');
    } finally {
      setDeletingCardId(null);
    }
  };

  // Column Handlers (Tambah, Edit, Hapus Kolom)
  const handleOpenCreateColumn = () => {
    setSelectedColumn(null);
    setIsColumnModalVisible(true);
  };

  const handleOpenEditColumn = (column: ColumnItem) => {
    setSelectedColumn(column);
    setIsColumnModalVisible(true);
  };

  const handleSaveColumn = async (data: { title: string; color_hex: string }) => {
    if (!currentBoard) return;

    setSavingColumn(true);
    try {
      if (selectedColumn) {
        await dispatch(
          updateColumn({
            columnId: selectedColumn.id,
            title: data.title,
            color_hex: data.color_hex,
          })
        ).unwrap();
      } else {
        const nextPosition = (currentBoard.board_columns.length || 0) + 1;
        await dispatch(
          createColumn({
            board_id: currentBoard.id,
            title: data.title,
            color_hex: data.color_hex,
            position: nextPosition,
          })
        ).unwrap();
        dispatch(fetchBoardByType(activeBoardType));
      }
      setIsColumnModalVisible(false);
    } catch (err: any) {
      Alert.alert('Gagal', err || 'Tidak dapat menyimpan kolom.');
    } finally {
      setSavingColumn(false);
    }
  };

  const handleDeleteColumn = async (column: ColumnItem) => {
    const cardCount = column.board_cards.length;
    const warningMsg =
      cardCount > 0
        ? `Kolom "${column.title}" berisi ${cardCount} kartu. Menghapus kolom ini akan ikut menghapus seluruh kartu di dalamnya. Lanjutkan?`
        : `Apakah Anda yakin ingin menghapus kolom "${column.title}"?`;

    const confirmed = await confirmDialog({
      title: 'Hapus Kolom',
      message: warningMsg,
      confirmText: 'Hapus Kolom',
      cancelText: 'Batal',
      destructive: true,
    });

    if (!confirmed) return;

    setDeletingColumnId(column.id);
    try {
      await dispatch(deleteColumn(column.id)).unwrap();
    } catch (err: any) {
      Alert.alert('Gagal', err || 'Tidak dapat menghapus kolom.');
    } finally {
      setDeletingColumnId(null);
    }
  };

  if (isLoading && !currentBoard) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F8F6F1]">
        <ActivityIndicator size="large" color="#968363" />
      </View>
    );
  }

  const totalColumns = currentBoard?.board_columns.length || 1;

  return (
    <View className="flex-1 bg-[#F8F6F1]">
      {/* 1. Header Board & Multi-Board Switcher */}
      <BoardHeader
        title={currentBoard?.name}
        description={currentBoard?.description}
        activeBoardType={activeBoardType}
        onSelectBoardType={(type) => setActiveBoardType(type)}
        onRefresh={handleRefresh}
      />

      {/* Banner Status Mode Offline */}
      {!isOnline && (
        <View className="flex-row items-center justify-between bg-[#2B2317] border-b border-[#52442F] px-4 md:px-5 py-2">
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-[#E5B650] mr-2" />
            <Text className="text-[#F6E3B8] text-xs font-semibold">
              Mode Offline Aktif
            </Text>
            <Text className="text-[#D8BE8A] text-xs ml-2">
              • {pendingSyncCount > 0
                ? `${pendingSyncCount} perubahan tersimpan di perangkat lokal`
                : 'Menampilkan data tersimpan di perangkat lokal'}
            </Text>
          </View>
          <Text className="text-[#E5B650] text-[11px] font-medium font-mono">
            {pendingSyncCount > 0 ? `${pendingSyncCount} Antre` : 'Lokal Cache'}
          </Text>
        </View>
      )}

      {/* 2. List Kolom Kanban */}
      {isLoading && (!currentBoard || currentBoard.type !== activeBoardType) ? (
        <View className="flex-1 justify-center items-center bg-[#F8F6F1]">
          <ActivityIndicator size="large" color="#968363" />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          className="flex-1 p-3 md:p-4"
          contentContainerStyle={{ paddingRight: 32 }}
        >
          {currentBoard?.board_columns.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              totalColumns={totalColumns}
              isColumnHovered={dragOverColumnId === col.id && draggingCard?.column_id !== col.id}
              draggingCardId={draggingCard?.id}
              deletingCardId={deletingCardId}
              isDeletingColumn={deletingColumnId === col.id}
              onCardPress={(card) => {
                setSelectedCard(card);
                setIsModalVisible(true);
              }}
              onCardDragStart={(card) => setDraggingCard(card)}
              onDeleteCard={handleDeleteCard}
              onAddCard={() => handleOpenCreate(col.id)}
              onEditColumn={() => handleOpenEditColumn(col)}
              onDeleteColumn={() => handleDeleteColumn(col)}
              onDragOver={() => {
                if (dragOverColumnId !== col.id) setDragOverColumnId(col.id);
              }}
              onDragLeave={() => setDragOverColumnId(null)}
              onDrop={() => handleDropOnColumn(col.id)}
            />
          ))}

          {/* Tombol Tambah Kolom di Ujung Kanan Board */}
          <Pressable
            onPress={handleOpenCreateColumn}
            style={({ pressed }) => [{ width: 240, opacity: pressed ? 0.75 : 1 }]}
            className="h-12 bg-white hover:bg-[#FAF8F5] border border-dashed border-[#DDD6C8] rounded-[4px] items-center justify-center mr-4 shadow-2xs"
          >
            <Text className="text-[#1B2225] text-xs font-bold font-mono px-3">
              + Tambah Kolom Alur
            </Text>
          </Pressable>
        </ScrollView>
      )}

      {/* 3. Modal Overlay Edit Card & Attachment Gallery */}
      <CardDetailModal
        visible={isModalVisible}
        card={selectedCard}
        columns={currentBoard?.board_columns || []}
        profiles={profiles}
        saving={saving}
        onClose={() => setIsModalVisible(false)}
        onSave={handleSaveDetail}
        onAttachmentChange={handleRefresh}
        defaultColumnId={createColumnId}
      />

      {/* 4. Modal Tambah / Edit Kolom */}
      <ColumnFormModal
        visible={isColumnModalVisible}
        column={selectedColumn}
        saving={savingColumn}
        onClose={() => setIsColumnModalVisible(false)}
        onSave={handleSaveColumn}
      />
    </View>
  );
}
