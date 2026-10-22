import { BoardHeader } from '@/components/board/BoardHeader';
import { CardDetailModal } from '@/components/board/CardDetailModal';
import { KanbanColumn } from '@/components/board/KanbanColumn';
import { confirmDialog } from '@/lib/confirm';
import { profileService } from '@/services/profileService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  CardItem,
  createCard,
  deleteCard,
  fetchBoardByType,
  moveCard,
  Profile,
  updateCardDetails,
} from '@/store/slices/boardSlice';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  View,
} from 'react-native';

export default function BoardScreen() {
  const dispatch = useAppDispatch();
  const { currentBoard, isLoading } = useAppSelector((state) => state.board);

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

  useEffect(() => {
    dispatch(fetchBoardByType('marketing'));

    // Ambil daftar user untuk dropdown PIC via service
    profileService
      .getProfiles()
      .then((data) => {
        if (data) setProfiles(data);
      })
      .catch((err) => {
        console.error('Gagal mengambil daftar profiles:', err);
      });
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchBoardByType('marketing'));
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
        dispatch(fetchBoardByType('marketing'));
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
      dispatch(fetchBoardByType('marketing'));
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
      {/* 1. Header Board */}
      <BoardHeader
        title={currentBoard?.name}
        description={currentBoard?.description}
        onRefresh={handleRefresh}
      />

      {/* 2. List Kolom Kanban */}
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
            onCardPress={(card) => {
              setSelectedCard(card);
              setIsModalVisible(true);
            }}
            onCardDragStart={(card) => setDraggingCard(card)}
            onDeleteCard={handleDeleteCard}
            onAddCard={() => handleOpenCreate(col.id)}
            onDragOver={() => {
              if (dragOverColumnId !== col.id) setDragOverColumnId(col.id);
            }}
            onDragLeave={() => setDragOverColumnId(null)}
            onDrop={() => handleDropOnColumn(col.id)}
          />
        ))}
      </ScrollView>

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
    </View>
  );
}
