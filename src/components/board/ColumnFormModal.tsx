import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ColumnItem } from '@/store/slices/boardSlice';

const COLOR_PALETTE = [
  { hex: '#38BDF8', name: 'Sky' },
  { hex: '#818CF8', name: 'Indigo' },
  { hex: '#A855F7', name: 'Purple' },
  { hex: '#EC4899', name: 'Pink' },
  { hex: '#F59E0B', name: 'Amber' },
  { hex: '#F97316', name: 'Orange' },
  { hex: '#10B981', name: 'Emerald' },
  { hex: '#06B6D4', name: 'Cyan' },
  { hex: '#EF4444', name: 'Red' },
  { hex: '#64748B', name: 'Slate' },
];

interface ColumnFormModalProps {
  visible: boolean;
  column: ColumnItem | null; // null = mode tambah kolom baru, ada = mode edit kolom
  saving: boolean;
  onClose: () => void;
  onSave: (data: { title: string; color_hex: string }) => void;
}

export function ColumnFormModal({
  visible,
  column,
  saving,
  onClose,
  onSave,
}: ColumnFormModalProps) {
  const isCreateMode = !column;
  const [title, setTitle] = useState('');
  const [colorHex, setColorHex] = useState('#38BDF8');

  useEffect(() => {
    if (!visible) return;
    if (column) {
      setTitle(column.title);
      setColorHex(column.color_hex || '#38BDF8');
    } else {
      setTitle('');
      setColorHex('#38BDF8');
    }
  }, [visible, column]);

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Data Belum Lengkap', 'Nama tahapan kolom wajib diisi.');
      return;
    }
    onSave({
      title: title.trim(),
      color_hex: colorHex,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/80 justify-center items-center p-4">
        <View className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-5 pb-3 border-b border-slate-800">
            <View>
              <Text className="text-white text-lg font-bold">
                {isCreateMode ? 'Tambah Kolom Baru' : 'Edit Kolom Tahapan'}
              </Text>
              <Text className="text-slate-400 text-xs">
                {isCreateMode
                  ? 'Tambahkan tahapan alur baru ke dalam board ini'
                  : 'Ubah judul dan warna indikator tahapan'}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center"
            >
              <Text className="text-slate-400 font-bold">✕</Text>
            </Pressable>
          </View>

          {/* Nama Kolom */}
          <View className="mb-4">
            <Text className="text-slate-300 text-xs font-semibold mb-1.5">
              Judul Kolom Tahapan
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              className="bg-slate-950 border border-slate-700 text-white p-3 rounded-xl text-sm"
              placeholder="Contoh: Quality Control / Finishing"
              placeholderTextColor="#64748B"
            />
          </View>

          {/* Pilih Warna Indikator */}
          <View className="mb-5">
            <Text className="text-slate-300 text-xs font-semibold mb-2">
              Warna Indikator Kolom
            </Text>
            <View className="flex-row flex-wrap">
              {COLOR_PALETTE.map((item) => {
                const isSelected = colorHex.toUpperCase() === item.hex.toUpperCase();
                return (
                  <Pressable
                    key={item.hex}
                    onPress={() => setColorHex(item.hex)}
                    className="mr-3 mb-3"
                  >
                    {({ pressed }) => (
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          backgroundColor: item.hex,
                          borderWidth: isSelected ? 2.5 : 1,
                          borderColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.15)',
                          borderStyle: 'solid',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: pressed ? 0.8 : 1,
                        }}
                      >
                        {isSelected && (
                          <Text className="text-white text-xs font-bold">✓</Text>
                        )}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Tombol Aksi */}
          <View className="flex-row justify-end pt-3 border-t border-slate-800">
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              className="px-4 py-2.5 rounded-xl bg-slate-800 mr-2"
            >
              <Text className="text-slate-300 font-semibold text-xs">Batal</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={saving}
              style={({ pressed }) => [{ opacity: pressed || saving ? 0.8 : 1 }]}
              className="px-5 py-2.5 rounded-xl bg-blue-600 items-center justify-center shadow-lg"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white font-bold text-xs">
                  {isCreateMode ? 'Tambah Kolom' : 'Simpan Kolom'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
