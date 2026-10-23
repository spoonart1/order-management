import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { CardItem } from '@/store/slices/boardSlice';
import { FileText, Trash2 } from 'lucide-react-native';
import { useRef } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';

interface KanbanCardProps {
  card: CardItem;
  columnColor: string;
  progressPercent: number;
  isBeingDragged: boolean;
  isDeleting?: boolean;
  onPress: () => void;
  onDragStart: () => void;
  onDelete: () => void;
}

export function KanbanCard({
  card,
  columnColor,
  progressPercent,
  isBeingDragged,
  isDeleting = false,
  onPress,
  onDragStart,
  onDelete,
}: KanbanCardProps) {
  const formatRupiah = (num: number) => {
    return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
  };

  const isDraggingRef = useRef(false);
  const dragEndTimeRef = useRef(0);
  const attachmentCount = card.card_attachments?.length || 0;

  // Konten kartu yang dirender di dalam wrapper
  const cardContent = (
    <>
      {/* Header Kartu: Nama Project, Klien & Menu Triple Dot */}
      <View className="flex-row justify-between items-start">
        <View className="flex-1 pr-2 mb-2">
          <Text className="text-[#1B2225] font-bold text-xs mb-1" numberOfLines={2}>
            {card.title}
          </Text>
          <Text className="text-[#70787C] text-[10px]">
            👤 {card.client_name || 'Tanpa Klien'}
          </Text>
          {card.client_phone ? (
            <Text className="text-[#8A9296] text-[10px] mt-0.5 font-mono">
              📞 {card.client_phone}
            </Text>
          ) : null}
        </View>

        {/* Tombol Triple Vertical Dot (Modal Backdrop Lintas Platform) */}
        <DropdownMenu
          disabled={isDeleting}
          buttonClassName="w-6 h-6 rounded-[2px] items-center justify-center bg-[#FAF8F5] border border-[#DDD6C8]"
          items={[
            {
              label: 'Detail & Surat Penawaran',
              icon: <FileText size={13} color="#968363" />,
              onPress: onPress,
            },
            {
              label: 'Hapus Kartu',
              icon: <Trash2 size={13} color="#9E2A2B" />,
              destructive: true,
              onPress: onDelete,
            },
          ]}
        />
      </View>

      {/* Nilai Estimasi */}
      <View className="bg-[#FAF8F5] border border-[#EDE7DC] px-2 py-1 rounded-[2px] mb-2 flex-row justify-between items-center">
        <Text className="text-[#70787C] text-[10px]">Nilai Est.:</Text>
        <Text className="text-emerald-800 font-bold text-xs font-mono">
          {formatRupiah(card.estimated_value)}
        </Text>
      </View>

      {/* Progress Bar */}
      <View className="mb-2">
        <View className="flex-row justify-between mb-1">
          <Text className="text-[#70787C] text-[10px]">Progress Tahapan</Text>
          <Text className="text-[#1B2225] text-[10px] font-bold font-mono">
            {progressPercent}%
          </Text>
        </View>
        <View className="w-full bg-[#EAE5DA] h-1.5 rounded-[1px] overflow-hidden">
          <View
            style={{ width: `${progressPercent}%`, backgroundColor: columnColor || '#968363' }}
            className="h-full rounded-[1px]"
          />
        </View>
      </View>

      {/* Footer Kartu: PIC Assignee & Badge Attachment Foto */}
      <View className="flex-row items-center justify-between pt-1.5 border-t border-[#F2EDE4]">
        <View className="bg-[#FAF8F5] border border-[#DDD6C8] px-1.5 py-0.5 rounded-[2px]">
          <Text className="text-[#1B2225] text-[9px] font-medium">
            👤 {card.profiles?.full_name || 'Belum di-assign'}
          </Text>
        </View>

        {/* Badge Galeri Foto jika ada foto terlampir */}
        {attachmentCount > 0 && (
          <View className="bg-[#FAF8F5] border border-[#DDD6C8] px-1.5 py-0.5 rounded-[2px] flex-row items-center">
            <Text className="text-[#968363] text-[10px] font-semibold">
              📷 {attachmentCount}
            </Text>
          </View>
        )}
      </View>

      {/* Overlay Loading saat proses hapus */}
      {isDeleting && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            borderRadius: 3,
            zIndex: 60,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="small" color="#9E2A2B" />
          <Text className="text-[#9E2A2B] text-[11px] font-semibold mt-1">
            Menghapus kartu...
          </Text>
        </View>
      )}
    </>
  );

  // Jika Web Browser: Gunakan elemen HTML <div>
  if (Platform.OS === 'web') {
    return (
      <div
        draggable={!isDeleting}
        onDragStart={(e: any) => {
          if (isDeleting) {
            e.preventDefault();
            return;
          }
          isDraggingRef.current = true;
          if (e.dataTransfer) {
            e.dataTransfer.setData('text/plain', card.id);
            e.dataTransfer.effectAllowed = 'move';
          }
          onDragStart();
        }}
        onDragEnd={() => {
          dragEndTimeRef.current = Date.now();
          setTimeout(() => {
            isDraggingRef.current = false;
          }, 300);
        }}
        onClick={(e: any) => {
          if (isDeleting) return;
          // Abaikan event klik jika kartu sedang di-drag atau baru saja selesai di-drag dalam 300ms
          if (isDraggingRef.current || Date.now() - dragEndTimeRef.current < 300) {
            e?.stopPropagation?.();
            return;
          }
          onPress();
        }}
        style={{
          opacity: isBeingDragged ? 0.35 : 1,
          cursor: isDeleting ? 'not-allowed' : isBeingDragged ? 'grabbing' : 'grab',
          pointerEvents: isDeleting ? 'none' : 'auto',
          userSelect: 'none',
          position: 'relative',
        }}
        className="bg-white border border-[#E3DDCF] hover:border-[#968363] p-3 rounded-[3px] mb-2.5 shadow-xs transition-all"
      >
        {cardContent}
      </div>
    );
  }

  // Jika Mobile Native (Android & iOS)
  return (
    <Pressable
      disabled={isDeleting}
      onPress={() => {
        if (isDeleting) return;
        onPress();
      }}
      style={({ pressed }) => [
        {
          opacity: pressed && !isDeleting ? 0.8 : 1,
          position: 'relative',
        },
      ]}
      pointerEvents={isDeleting ? 'none' : 'auto'}
      className="bg-white border border-[#E3DDCF] p-3 rounded-[3px] mb-2.5 shadow-xs"
    >
      {cardContent}
    </Pressable>
  );
}
