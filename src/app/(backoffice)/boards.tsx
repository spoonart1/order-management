import { BoardHeader, BoardType } from '@/components/board/BoardHeader';
import { CardDetailModal } from '@/components/board/CardDetailModal';
import { ColumnFormModal } from '@/components/board/ColumnFormModal';
import { KanbanColumn } from '@/components/board/KanbanColumn';
import { confirmDialog } from '@/lib/confirm';
import { profileService } from '@/services/profileService';
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

  useEffect(() => {
    // Ambil daftar user untuk dropdown PIC via service (sekali saat mount)
    profileService
      .getProfiles()
      .then((data) => {
        if (data) setProfiles(data);
      })
      .catch((err) => {
        console.error('Gagal mengambil daftar profiles:', err);
      });
  }, []);

  useEffect(() => {
    dispatch(fetchBoardByType(activeBoardType));
  }, [dispatch, activeBoardType]);

  const handleRefresh = () => {
    dispatch(fetchBoardByType(activeBoardType));
  };

  // Drag Handlers
  const handleDropOnColumn = (targetColumnId: string) => {
    if (!draggingCard) return;

    if (draggingCard.column_id !== targetColumnId) {
      const targetColumn = currentBoard?.board_columns.find((c) => c.id === targetColumnId);
      const newPosition = (targetColumn?.board_cards.length || 0) + 1;

      dispatch(
        moveCard({
          cardId: draggingCard.id,
          targetColumnId,
          newPosition,
        })
      ).then(() => {
        dispatch(fetchBoardByType(activeBoardType));
      });
    }

    setDraggingCard(null);
    setDragOverColumnId(null);
  };

  // Save Modal Handler (Edit & Create)
  const handleSaveDetail = async (updatedData: {
    title: string;
    client_name: string;
    estimated_value: number;
    column_id: string;
    assigned_to: string | null;
    notes: string;
  }) => {
    if (!currentBoard) return;

    setSaving(true);
    try {
      if (selectedCard) {
        await dispatch(
          updateCardDetails({
            cardId: selectedCard.id,
            ...updatedData,
          })
        ).unwrap();
      } else {
        // Mode create: taruh kartu di urutan paling bawah kolom tujuan
        const targetColumn = currentBoard.board_columns.find((c) => c.id === updatedData.column_id);
        const position = (targetColumn?.board_cards.length || 0) + 1;

        await dispatch(
          createCard({
            board_id: currentBoard.id,
            position,
            ...updatedData,
          })
        ).unwrap();
      }

      setIsModalVisible(false);
      dispatch(fetchBoardByType(activeBoardType));
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
      await dispatch(deleteCard(card.id)).unwrap();
    } catch (err: any) {
      Alert.alert('Gagal', err || 'Tidak dapat menghapus kartu.');
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
      <View className="flex-1 justify-center items-center bg-slate-950">
        <ActivityIndicator size="large" color="#38BDF8" />
      </View>
    );
  }

  const totalColumns = currentBoard?.board_columns.length || 1;

  return (
    <View className="flex-1 bg-slate-950">
      {/* 1. Header Board & Multi-Board Switcher */}
      <BoardHeader
        title={currentBoard?.name}
        description={currentBoard?.description}
        activeBoardType={activeBoardType}
        onSelectBoardType={(type) => setActiveBoardType(type)}
        onRefresh={handleRefresh}
      />

      {/* 2. List Kolom Kanban */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center bg-slate-950">
          <ActivityIndicator size="large" color="#38BDF8" />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          className="flex-1 p-5"
          contentContainerStyle={{ paddingRight: 40 }}
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
            style={({ pressed }) => [{ width: 260, opacity: pressed ? 0.75 : 1 }]}
            className="h-14 bg-slate-900/60 border border-dashed border-slate-700 rounded-2xl items-center justify-center mr-6"
          >
            <Text className="flex-row text-slate-300 text-xs font-bold px-3">
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
