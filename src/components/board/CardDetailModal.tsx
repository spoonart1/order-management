import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    Modal,
    ScrollView,
    TextInput,
    Pressable,
    ActivityIndicator
} from 'react-native';
import { CardItem, ColumnItem, Profile } from "@/store/slices/boardSlice";

interface CardDetailModalProps {
    visible: boolean;
    card: CardItem | null;
    columns: ColumnItem[];
    profiles: Profile[];
    saving: boolean;
    onClose: () => void;
    onSave: (updatedData: {
        title: string;
        client_name: string;
        estimated_value: number;
        column_id: string;
        assigned_to: string | null;
        notes: string;
    }) => void;
}

export function CardDetailModal({
    visible,
    card,
    columns,
    profiles,
    saving,
    onClose,
    onSave
}: CardDetailModalProps) {

    const [title, setTitle] = useState('');
    const [clientName, setClientName] = useState('');
    const [value, setValue] = useState('');
    const [columnId, setColumnId] = useState('');
    const [assignedTo, setAssignedTo] = useState<string | null>(null);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (card) {
            setTitle(card.title || '');
            setClientName(card.client_name || '');
            setValue(card.estimated_value ? String(card.estimated_value) : '0');
            setColumnId(card.column_id);
            setAssignedTo(card.assigned_to || null);
            setNotes(card.notes || '');
        }
    }, [card]);

    const handleSubmit = () => {
        onSave({
            title: title.trim(),
            client_name: clientName.trim(),
            estimated_value: parseFloat(value) || 0,
            column_id: columnId,
            assigned_to: assignedTo,
            notes: notes.trim(),
        });
    };

    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View className="flex-1 bg-black/80 justify-center items-center p-4">
                <View className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
                    {/* Header Modal */}
                    <View className="flex-row justify-between items-center mb-5 pb-3 border-b border-slate-800">
                        <View>
                            <Text className="text-white text-lg font-bold">Detail Kartu Pesanan</Text>
                            <Text className="text-slate-400 text-xs">Edit informasi dan alur tahapan</Text>
                        </View>
                        <Pressable
                            onPress={onClose}
                            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                            className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center"
                        >
                            <Text className="text-slate-400 font-bold">✕</Text>
                        </Pressable>
                    </View>
                    <ScrollView className="max-h-96">
                        {/* Nama Project */}
                        <View className="mb-4">
                            <Text className="text-slate-300 text-xs font-semibold mb-1">Nama Project</Text>
                            <TextInput
                                value={title}
                                onChangeText={setTitle}
                                className="bg-slate-950 border border-slate-700 text-white p-3 rounded-xl text-sm"
                                placeholder="Contoh: Kitchen Set Minimalis"
                                placeholderTextColor="#64748B"
                            />
                        </View>
                        {/* Nama Klien */}
                        <View className="mb-4">
                            <Text className="text-slate-300 text-xs font-semibold mb-1">Nama Klien & Lokasi</Text>
                            <TextInput
                                value={clientName}
                                onChangeText={setClientName}
                                className="bg-slate-950 border border-slate-700 text-white p-3 rounded-xl text-sm"
                                placeholder="Contoh: Ibu Rini - Pleret"
                                placeholderTextColor="#64748B"
                            />
                        </View>
                        {/* Nilai Estimasi */}
                        <View className="mb-4">
                            <Text className="text-slate-300 text-xs font-semibold mb-1">Nilai Estimasi (Rp)</Text>
                            <TextInput
                                value={value}
                                onChangeText={setValue}
                                keyboardType="numeric"
                                className="bg-slate-950 border border-slate-700 text-white p-3 rounded-xl text-sm"
                                placeholder="Contoh: 12688000"
                                placeholderTextColor="#64748B"
                            />
                        </View>
                        {/* Pindah Kolom */}
                        <View className="mb-4">
                            <Text className="text-slate-300 text-xs font-semibold mb-1.5">
                                Tahapan Alur (Kolom)
                            </Text>
                            <View className="flex-row flex-wrap">
                                {columns.map((col) => {
                                    const isSelected = columnId === col.id;
                                    return (
                                        <Pressable
                                            key={col.id}
                                            onPress={() => setColumnId(col.id)}
                                            style={({ pressed }) => [
                                                {
                                                    backgroundColor: isSelected ? col.color_hex : '#0F172A',
                                                    borderColor: isSelected ? col.color_hex : '#334155',
                                                    opacity: pressed ? 0.8 : 1,
                                                },
                                            ]}
                                            className="px-3 py-1.5 rounded-lg border mr-2 mb-2"
                                        >
                                            <Text
                                                style={{ color: isSelected ? '#FFFFFF' : '#94A3B8' }}
                                                className="text-xs font-semibold"
                                            >
                                                {col.title}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                        {/* Pilih PIC */}
                        <View className="mb-4">
                            <Text className="text-slate-300 text-xs font-semibold mb-1.5">
                                Penanggung Jawab (PIC)
                            </Text>
                            <View className="flex-row flex-wrap">
                                {profiles.map((p) => {
                                    const isSelected = assignedTo === p.id;
                                    return (
                                        <Pressable
                                            key={p.id}
                                            onPress={() => setAssignedTo(p.id)}
                                            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                                            className={`px-3 py-1.5 rounded-lg border mr-2 mb-2 ${isSelected ? 'bg-blue-600 border-blue-500' : 'bg-slate-950 border-slate-700'
                                                }`}
                                        >
                                            <Text
                                                className={`text-xs ${isSelected ? 'text-white font-bold' : 'text-slate-400'
                                                    }`}
                                            >
                                                👤 {p.full_name}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                        {/* Catatan */}
                        <View className="mb-4">
                            <Text className="text-slate-300 text-xs font-semibold mb-1">Catatan Proyek</Text>
                            <TextInput
                                value={notes}
                                onChangeText={setNotes}
                                multiline
                                numberOfLines={3}
                                className="bg-slate-950 border border-slate-700 text-white p-3 rounded-xl text-sm"
                                placeholder="Catatan bahan, request aksesoris, dll."
                                placeholderTextColor="#64748B"
                                textAlignVertical="top"
                            />
                        </View>
                    </ScrollView>
                    {/* Tombol Aksi */}
                    <View className="flex-row justify-end mt-4 pt-3 border-t border-slate-800">
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
                                <Text className="text-white font-bold text-xs">Simpan Perubahan</Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
