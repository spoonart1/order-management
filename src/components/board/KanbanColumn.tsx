import React from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { ColumnItem, CardItem } from '@/store/slices/boardSlice';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  column: ColumnItem;
  totalColumns: number;
  isColumnHovered: boolean;
  draggingCardId?: string;
  onCardPress: (card: CardItem) => void;
  onCardDragStart: (card: CardItem) => void;
  onDragOver: (e: any) => void;
  onDragLeave: (e: any) => void;
  onDrop: (e: any) => void;
}

export function KanbanColumn({
  column,
  totalColumns,
  isColumnHovered,
  draggingCardId,
  onCardPress,
  onCardDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: KanbanColumnProps) {
  const progressPercent = Math.round((column.position / totalColumns) * 100);

  const webDropProps =
    Platform.OS === 'web'
      ? {
          onDragOver: (e: any) => {
            e.preventDefault();
            if (e.dataTransfer) {
              e.dataTransfer.dropEffect = 'move';
            }
            onDragOver(e);
          },
          onDragLeave: (e: any) => {
            if (!e.currentTarget.contains(e.relatedTarget)) {
              onDragLeave(e);
            }
          },
          onDrop: (e: any) => {
            e.preventDefault();
            onDrop(e);
          },
        }
      : {};

  return (
    <View
      style={{ width: 290 }}
      {...(webDropProps as any)}
      className={`bg-slate-900 border rounded-2xl mr-4 flex-col max-h-full transition-all ${
        isColumnHovered
          ? 'border-sky-400 bg-slate-900/95 ring-2 ring-sky-500/20'
          : 'border-slate-800'
      }`}
    >
      {/* Header Kolom */}
      <View className="p-4 border-b border-slate-800/80 flex-row items-center justify-between pointer-events-none">
        <View className="flex-row items-center flex-1 pr-2">
          <View
            style={{ backgroundColor: column.color_hex }}
            className="w-2.5 h-2.5 rounded-full mr-2.5"
          />
          <Text className="text-white font-bold text-sm" numberOfLines={1}>
            {column.title}
          </Text>
        </View>
        <View className="bg-slate-800 px-2 py-0.5 rounded-full">
          <Text className="text-slate-400 text-xs font-semibold">
            {column.board_cards.length}
          </Text>
        </View>
      </View>

      {/* List Kartu */}
      <ScrollView className="flex-1 p-3">
        {column.board_cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            columnColor={column.color_hex}
            progressPercent={progressPercent}
            isBeingDragged={draggingCardId === card.id}
            onPress={() => onCardPress(card)}
            onDragStart={() => onCardDragStart(card)}
          />
        ))}

        {/* PLACEHOLDER PREVIEW SAAT DRAG */}
        {isColumnHovered && (
          <View className="h-32 border-2 border-dashed border-sky-400 bg-sky-950/40 rounded-xl mb-3 items-center justify-center pointer-events-none">
            <Text className="text-sky-300 text-xs font-bold">
              ⬇ Lepaskan kartu di sini
            </Text>
            <Text className="text-sky-400/70 text-[10px] mt-1">
              Pindah ke alur {column.title}
            </Text>
          </View>
        )}

        {/* Kolom Kosong */}
        {column.board_cards.length === 0 && !isColumnHovered && (
          <View className="py-8 items-center justify-center border border-dashed border-slate-800/80 rounded-xl">
            <Text className="text-slate-600 text-xs">Belum ada kartu</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
