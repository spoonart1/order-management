import { CardItem } from '@/store/slices/boardSlice';
import { useRef } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

interface KanbanCardProps {
  card: CardItem;
  columnColor: string;
  progressPercent: number;
  isBeingDragged: boolean;
  onPress: () => void;
  onDragStart: () => void;
}

export function KanbanCard({
  card,
  columnColor,
  progressPercent,
  isBeingDragged,
  onPress,
  onDragStart,
}: KanbanCardProps) {
  const formatRupiah = (num: number) => {
    return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
  };

  const isDraggingRef = useRef(false);
  const attachmentCount = card.card_attachments?.length || 0;

  // Konten kartu yang dirender di dalam wrapper
  const cardContent = (
    <>
      {/* Nama Project & Klien */}
      <View>
        <Text className="text-white font-bold text-[14px] mb-3">{card.title}</Text>
        <Text className="text-slate-400 text-[10px] mb-3">
          👤 {card.client_name || 'Tanpa Klien'}
        </Text>
      </View>

      {/* Nilai Estimasi */}
      <View className="bg-slate-900 px-2.5 py-1.5 rounded-lg mb-3 flex-row justify-between items-center">
        <Text className="text-slate-500 text-[10px]">Nilai Est.:</Text>
        <Text className="text-emerald-400 font-bold text-xs">
          {formatRupiah(card.estimated_value)}
        </Text>
      </View>

      {/* Progress Bar */}
      <View className="mb-3">
        <View className="flex-row justify-between mb-1">
          <Text className="text-slate-500 text-[10px]">Progress Tahapan</Text>
          <Text className="text-slate-400 text-[10px] font-semibold">
            {progressPercent}%
          </Text>
        </View>
        <View className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <View
            style={{ width: `${progressPercent}%`, backgroundColor: columnColor }}
            className="h-full rounded-full"
          />
        </View>
      </View>

      {/* Footer Kartu: PIC Assignee & Badge Attachment Foto */}
      <View className="flex-row items-center justify-between pt-2 border-t border-slate-900">
        <View className="bg-slate-800 px-2 py-0.5 rounded-md">
          <Text className="text-sky-300 text-[9px] font-medium p-1">
            👤 {card.profiles?.full_name || 'Belum di-assign'}
          </Text>
        </View>

        {/* Badge Galeri Foto jika ada foto terlampir */}
        {attachmentCount > 0 && (
          <View className="bg-slate-800 px-2 py-0.5 rounded-md flex-row items-center">
            <Text className="text-slate-300 text-[11px]">
              📷 {attachmentCount}
            </Text>
          </View>
        )}
      </View>
    </>
  );

  // Jika Web Browser: Gunakan elemen HTML <div>
  if (Platform.OS === 'web') {
    return (
      <div
        draggable={true}
        onDragStart={(e: any) => {
          isDraggingRef.current = true;
          if (e.dataTransfer) {
            e.dataTransfer.setData('text/plain', card.id);
            e.dataTransfer.effectAllowed = 'move';
          }
          onDragStart();
        }}
        onDragEnd={() => {
          setTimeout(() => {
            isDraggingRef.current = false;
          }, 100);
        }}
        onClick={() => {
          if (!isDraggingRef.current) {
            onPress();
          }
        }}
        style={{
          opacity: isBeingDragged ? 0.35 : 1,
          cursor: isBeingDragged ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
        className="bg-slate-950 border border-slate-800 hover:border-slate-600 p-4 rounded-xl mb-3 shadow-sm transition-all"
      >
        {cardContent}
      </div>
    );
  }

  // Jika Mobile Native (Android & iOS)
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
      className="bg-slate-950 border border-slate-800 p-4 rounded-xl mb-3 shadow-sm"
    >
      {cardContent}
    </Pressable>
  );
}
