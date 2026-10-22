import { CardItem } from '@/store/slices/boardSlice';
import { EllipsisVertical, Trash2 } from 'lucide-react-native';
import { useRef, useState } from 'react';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const attachmentCount = card.card_attachments?.length || 0;

  // Konten kartu yang dirender di dalam wrapper
  const cardContent = (
    <>
      {/* Header Kartu: Nama Project, Klien & Menu Triple Dot */}
      <View style={{ zIndex: 20 }} className="flex-row justify-between items-start">
        <View className="flex-1 pr-2">
          <Text className="text-white font-bold text-[14px] mb-1.5">{card.title}</Text>
          <Text className="text-slate-400 text-[10px] mb-3">
            👤 {card.client_name || 'Tanpa Klien'}
          </Text>
        </View>

        {/* Tombol Triple Vertical Dot */}
        <View style={{ position: 'relative', zIndex: 30 }}>
          <Pressable
            disabled={isDeleting}
            onPress={(e: any) => {
              e?.stopPropagation?.();
              if (isDeleting) return;
              setMenuOpen((prev) => !prev);
            }}
            hitSlop={8}
            className="w-7 h-7 rounded-lg items-center justify-center bg-slate-900"
          >
            {({ pressed }) => (
              <View style={{ opacity: pressed ? 0.6 : 1 }}>
                <EllipsisVertical size={15} color="#94A3B8" />
              </View>
            )}
          </Pressable>

          {/* Dropdown Menu */}
          {menuOpen && (
            <View
              style={{
                position: 'absolute',
                top: 32,
                right: 0,
                minWidth: 135,
                backgroundColor: '#0F172A',
                borderColor: '#334155',
                borderWidth: 1,
                borderStyle: 'solid',
                borderRadius: 10,
                zIndex: 50,
                elevation: 8,
              }}
              className="py-1 shadow-xl"
            >
              <Pressable
                onPress={(e: any) => {
                  e?.stopPropagation?.();
                  setMenuOpen(false);
                  onDelete();
                }}
                className="px-3 py-2"
              >
                {({ pressed }) => (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      opacity: pressed ? 0.7 : 1,
                    }}
                  >
                    <Trash2 size={13} color="#F87171" />
                    <Text className="text-red-400 text-xs font-semibold ml-2">
                      Hapus Kartu
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          )}
        </View>
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

      {/* Overlay Loading saat proses hapus */}
      {isDeleting && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(2, 6, 23, 0.8)',
            borderRadius: 12,
            zIndex: 60,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="small" color="#F87171" />
          <Text className="text-red-400 text-[11px] font-semibold mt-2">
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
          setTimeout(() => {
            isDraggingRef.current = false;
          }, 100);
        }}
        onClick={() => {
          if (isDeleting) return;
          if (menuOpen) {
            setMenuOpen(false);
            return;
          }
          if (!isDraggingRef.current) {
            onPress();
          }
        }}
        style={{
          opacity: isBeingDragged ? 0.35 : 1,
          cursor: isDeleting ? 'not-allowed' : isBeingDragged ? 'grabbing' : 'grab',
          pointerEvents: isDeleting ? 'none' : 'auto',
          userSelect: 'none',
          position: 'relative',
          zIndex: menuOpen ? 40 : 1,
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
      disabled={isDeleting}
      onPress={() => {
        if (isDeleting) return;
        if (menuOpen) {
          setMenuOpen(false);
          return;
        }
        onPress();
      }}
      style={({ pressed }) => [
        {
          opacity: pressed && !isDeleting ? 0.8 : 1,
          position: 'relative',
          zIndex: menuOpen ? 40 : 1,
        },
      ]}
      pointerEvents={isDeleting ? 'none' : 'auto'}
      className="bg-slate-950 border border-slate-800 p-4 rounded-xl mb-3 shadow-sm"
    >
      {cardContent}
    </Pressable>
  );
}
