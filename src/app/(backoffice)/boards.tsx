import React, { useEffect, useState } from 'react';
import {
  View,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  CardItem,
  fetchBoardByType,
  moveCard,
  updateCardDetails,
  Profile,
} from '@/store/slices/boardSlice';
import { supabase } from '@/lib/supabase';
import { BoardHeader } from '@/components/board/BoardHeader';
import { KanbanColumn } from '@/components/board/KanbanColumn';
import { CardDetailModal } from '@/components/board/CardDetailModal';

export default function BoardScreen() {
  const dispatch = useAppDispatch();
  const { currentBoard, isLoading, error } = useAppSelector((state) => state.board);

  // Drag State (Web)
  const [draggingCard, setDraggingCard] = useState<CardItem | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  // Modal State (Web, iOS, Android)
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    dispatch(fetchBoardByType('marketing'));

    // Ambil daftar user untuk dropdown PIC
    supabase
      .from('profiles')
      .select('id, full_name')
      .then(({ data }) => {
        if (data) setProfiles(data);
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

  // Save Modal Handler
  const handleSaveDetail = async (updatedData: {
    title: string;
    client_name: string;
    estimated_value: number;
    column_id: string;
    assigned_to: string | null;
    notes: string;
  }) => {
    if (!selectedCard) return;

    setSaving(true);
    try {
      await dispatch(
        updateCardDetails({
          cardId: selectedCard.id,
          ...updatedData,
        })
      ).unwrap();

      setIsModalVisible(false);
      dispatch(fetchBoardByType('marketing'));
    } catch (err: any) {
      Alert.alert('Gagal', err || 'Terjadi kesalahan saat menyimpan perubahan.');
    } finally {
      setSaving(false);
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
            onCardPress={(card) => {
              setSelectedCard(card);
              setIsModalVisible(true);
            }}
            onCardDragStart={(card) => setDraggingCard(card)}
            onDragOver={(e) => {
              if (dragOverColumnId !== col.id) setDragOverColumnId(col.id);
            }}
            onDragLeave={() => setDragOverColumnId(null)}
            onDrop={() => handleDropOnColumn(col.id)}
          />
        ))}
      </ScrollView>

      {/* 3. Modal Overlay Edit Card */}
      <CardDetailModal
        visible={isModalVisible}
        card={selectedCard}
        columns={currentBoard?.board_columns || []}
        profiles={profiles}
        saving={saving}
        onClose={() => setIsModalVisible(false)}
        onSave={handleSaveDetail}
      />
    </View>
  );
}
