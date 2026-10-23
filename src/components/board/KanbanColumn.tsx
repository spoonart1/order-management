import React from 'react';
import { View, Text, ScrollView, Platform, Pressable, ActivityIndicator } from 'react-native';
import { Pencil, Trash2 } from 'lucide-react-native';
import { ColumnItem, CardItem } from '@/store/slices/boardSlice';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  column: ColumnItem;
  totalColumns: number;
  isColumnHovered: boolean;
  draggingCardId?: string;
  deletingCardId?: string | null;
  isDeletingColumn?: boolean;
  onCardPress: (card: CardItem) => void;
  onCardDragStart: (card: CardItem) => void;
  onDeleteCard: (card: CardItem) => void;
  onAddCard: () => void;
  onEditColumn: () => void;
  onDeleteColumn: () => void;
  onDragOver: (e: any) => void;
  onDragLeave: (e: any) => void;
  onDrop: (e: any) => void;
}

export function KanbanColumn({
  column,
  totalColumns,
  isColumnHovered,
  draggingCardId,
  deletingCardId,
  isDeletingColumn = false,
  onCardPress,
  onCardDragStart,
  onDeleteCard,
  onAddCard,
  onEditColumn,
  onDeleteColumn,
  onDragOver,
  onDragLeave,
  onDrop,
}: KanbanColumnProps) {
  const progressPercent = Math.round((column.position / totalColumns) * 100);

  const columnContent = (
    <>
      {/* Header Kolom */}
      <View className="p-3 border-b border-[#E3DDCF] flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 pr-2">
          <View
            style={{ backgroundColor: column.color_hex || '#968363' }}
            className="w-2 h-2 rounded-[1px] mr-2"
          />
          <Text className="text-[#1B2225] font-bold text-xs uppercase font-mono tracking-wider" numberOfLines={1}>
            {column.title}
          </Text>
        </View>

        <View className="flex-row items-center">
          <View className="bg-[#FAF8F5] border border-[#DDD6C8] px-1.5 py-0.5 rounded-[2px] mr-1.5">
            <Text className="text-[#70787C] text-[10px] font-bold font-mono">
              {column.board_cards.length}
            </Text>
          </View>

          {/* Menu Kolom (Edit / Hapus Kolom) dengan Modal Backdrop Lintas Platform */}
          <DropdownMenu
            disabled={isDeletingColumn}
            buttonClassName="w-6 h-6 rounded-[2px] items-center justify-center bg-[#FAF8F5] border border-[#DDD6C8]"
            items={[
              {
                label: 'Edit Kolom',
                icon: <Pencil size={12} color="#968363" />,
                onPress: onEditColumn,
              },
              {
                label: 'Hapus Kolom',
                icon: <Trash2 size={12} color="#9E2A2B" />,
                destructive: true,
                onPress: onDeleteColumn,
              },
            ]}
          />
        </View>
      </View>

      {/* List Kartu */}
      <ScrollView className="flex-1 p-2.5">
        {column.board_cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            columnColor={column.color_hex}
            progressPercent={progressPercent}
            isBeingDragged={draggingCardId === card.id}
            isDeleting={deletingCardId === card.id}
            onPress={() => onCardPress(card)}
            onDragStart={() => onCardDragStart(card)}
            onDelete={() => onDeleteCard(card)}
          />
        ))}

        {/* PLACEHOLDER PREVIEW SAAT DRAG MELAYANG */}
        {isColumnHovered && (
          <View
            style={{ pointerEvents: 'none' } as any}
            className="h-28 border border-dashed border-[#968363] bg-[#F2EDE4]/70 rounded-[3px] mb-2.5 items-center justify-center"
          >
            <Text className="text-[#968363] text-xs font-bold font-mono">
              ⬇ Lepaskan kartu di sini
            </Text>
            <Text className="text-[#70787C] text-[10px] mt-0.5">
              Pindah ke alur {column.title}
            </Text>
          </View>
        )}

        {/* Kolom Kosong */}
        {column.board_cards.length === 0 && !isColumnHovered && (
          <View className="py-6 items-center justify-center border border-dashed border-[#DDD6C8] rounded-[3px]">
            <Text className="text-[#8A9296] text-xs">Belum ada kartu</Text>
          </View>
        )}
      </ScrollView>

      {/* Tombol Tambah Kartu */}
      <View className="p-2.5 border-t border-[#E3DDCF]">
        <Pressable
          disabled={isDeletingColumn}
          onPress={onAddCard}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          className="py-2 bg-white hover:bg-[#FAF8F5] rounded-[3px] border border-dashed border-[#DDD6C8] items-center justify-center shadow-2xs"
        >
          <Text className="text-[#1B2225] text-xs font-semibold">+ Tambah Kartu</Text>
        </Pressable>
      </View>

      {/* Overlay Loading saat menghapus kolom */}
      {isDeletingColumn && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            borderRadius: 4,
            zIndex: 70,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="small" color="#9E2A2B" />
          <Text className="text-[#9E2A2B] text-xs font-semibold mt-1">
            Menghapus kolom...
          </Text>
        </View>
      )}
    </>
  );

  // Jika Web Browser: Render sebagai <div> langsung dengan event onDragOver, onDragLeave, onDrop native
  if (Platform.OS === 'web') {
    return (
      <div
        onDragOver={(e: any) => {
          if (isDeletingColumn) return;
          e.preventDefault();
          if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'move';
          }
          onDragOver(e);
        }}
        onDragLeave={(e: any) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            onDragLeave(e);
          }
        }}
        onDrop={(e: any) => {
          if (isDeletingColumn) return;
          e.preventDefault();
          onDrop(e);
        }}
        style={{
          width: 285,
          position: 'relative',
          pointerEvents: isDeletingColumn ? 'none' : 'auto',
        }}
        className={`bg-[#FBF9F5] border rounded-[4px] mr-3 flex flex-col max-h-full transition-all ${
          isColumnHovered
            ? 'border-[#968363] bg-[#F5EFE6] ring-1 ring-[#968363]/30'
            : 'border-[#E3DDCF] shadow-xs'
        }`}
      >
        {columnContent}
      </div>
    );
  }

  // Jika Native Mobile (Android & iOS)
  return (
    <View
      style={{ width: 285, position: 'relative' }}
      pointerEvents={isDeletingColumn ? 'none' : 'auto'}
      className="bg-[#FBF9F5] border border-[#E3DDCF] rounded-[4px] mr-3 flex-col max-h-full shadow-xs"
    >
      {columnContent}
    </View>
  );
}
