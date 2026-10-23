import { Chip } from "@/components/ui/Chip";
import { cardAttachmentService } from "@/services/cardAttachmentService";
import { Quotation, SaveQuotationPayload, quotationService } from "@/services/quotationService";
import { QuotationFormModal } from "@/components/quotation/QuotationFormModal";
import { QuotationPreviewModal } from "@/components/quotation/QuotationPreviewModal";
import { AttachmentItem, CardItem, ColumnItem, Profile } from "@/store/slices/boardSlice";
import { formatRupiah } from "@/utils/terbilang";
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View
} from 'react-native';

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
        client_phone: string;
        estimated_value: number;
        column_id: string;
        assigned_to: string | null;
        notes: string;
    }) => void;
    onAttachmentChange?: () => void;
    /** Kolom default saat membuat kartu baru (mode create, ketika card = null) */
    defaultColumnId?: string | null;
}

export function CardDetailModal({
    visible,
    card,
    columns,
    profiles,
    saving,
    onClose,
    onSave,
    onAttachmentChange,
    defaultColumnId
}: CardDetailModalProps) {
    const isCreateMode = !card;

    const [title, setTitle] = useState('');
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [value, setValue] = useState('');
    const [columnId, setColumnId] = useState('');
    const [assignedTo, setAssignedTo] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // State Attachment & Uploading
    const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // State Surat Penawaran
    const [linkedQuotation, setLinkedQuotation] = useState<Quotation | null>(null);
    const [quotationFormVisible, setQuotationFormVisible] = useState(false);
    const [quotationPreviewVisible, setQuotationPreviewVisible] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setErrorMessage(null);
        if (card) {
            setTitle(card.title || '');
            setClientName(card.client_name || '');
            setClientPhone(card.client_phone || '');
            setValue(card.estimated_value ? String(card.estimated_value) : '');
            setColumnId(card.column_id);
            setAssignedTo(card.assigned_to || null);
            setNotes(card.notes || '');
            setAttachments(card.card_attachments || []);

            // Ambil data penawaran yang terhubung
            quotationService.getQuotationByCardId(card.id)
                .then((q) => setLinkedQuotation(q))
                .catch(() => setLinkedQuotation(null));
        } else {
            // Mode create: reset form
            setTitle('');
            setClientName('');
            setClientPhone('');
            setValue('');
            setColumnId(defaultColumnId || columns[0]?.id || '');
            setAssignedTo(null);
            setNotes('');
            setAttachments([]);
            setLinkedQuotation(null);
        }
    }, [card, visible, defaultColumnId]);

    const handleSaveQuotationFromCard = async (payload: SaveQuotationPayload) => {
        let saved: Quotation;
        if (linkedQuotation) {
            saved = await quotationService.updateQuotation(linkedQuotation.id, payload);
        } else {
            saved = await quotationService.createQuotation(payload);
        }
        setLinkedQuotation(saved);
        setValue(String(saved.total_amount));
    };

    // Cek apakah sedang di tahap Offering (Penawaran) atau DP (Deal Payment)
    const selectedColumn = columns.find((c) => c.id === columnId);
    const selectedTitle = selectedColumn?.title.toLowerCase() || '';
    const isValueRequired =
        selectedTitle.includes('offering') ||
        selectedTitle.includes('penawaran') ||
        selectedTitle.includes('dp') ||
        selectedTitle.includes('deal payment');

    const handleSubmit = () => {
        const requiredChecks: { isValid: boolean; label: string }[] = [
            { isValid: !!title.trim(), label: 'Nama Project' },
            { isValid: !!clientName.trim(), label: 'Nama Klien & Lokasi' },
            { isValid: !!clientPhone.trim(), label: 'Nomor HP Client' },
            {
                isValid:
                    !isValueRequired ||
                    (!!value.trim() && !isNaN(parseFloat(value)) && parseFloat(value) > 0),
                label: 'Nilai Estimasi (Rp)',
            },
            { isValid: !!columnId, label: 'Tahapan Alur (Kolom)' },
            { isValid: !!assignedTo, label: 'Penanggung Jawab (PIC)' }
        ];

        const invalidField = requiredChecks.find((check) => !check.isValid);
        if (invalidField) {
            const msg = `${invalidField.label} wajib di isi.`;
            setErrorMessage(msg);
            Alert.alert('Validasi Gagal', msg);
            return;
        }

        setErrorMessage(null);
        onSave({
            title: title.trim(),
            client_name: clientName.trim(),
            client_phone: clientPhone.trim(),
            estimated_value: parseFloat(value) || 0,
            column_id: columnId,
            assigned_to: assignedTo,
            notes: notes.trim(),
        });
    };

    // Handler Upload (Memanggil Network Layer Service)
    const handlePickAndUploadImage = async () => {
        if (!card) return;

        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert("Izin Ditolak", "Izin akses galeri dibutuhkan untuk mengunggah foto.");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.8,
            });

            if (result.canceled || !result.assets?.length) return;

            setUploading(true);
            const asset = result.assets[0];

            // PANGGIL SERVICE LAYER
            const newAttachment = await cardAttachmentService.uploadAttachment(card.id, asset);
            setAttachments((prev) => [...prev, newAttachment]);
            onAttachmentChange?.();
        } catch (err: any) {
            Alert.alert("Gagal Upload", err?.message || "Terjadi kesalahan saat mengunggah foto.");
        } finally {
            setUploading(false);
        }
    };

    // Handler Hapus (Memanggil Network Layer Service)
    const handleDeleteAttachment = async (attachment: AttachmentItem) => {
        setDeletingId(attachment.id);
        try {
            // PANGGIL SERVICE LAYER
            await cardAttachmentService.deleteAttachment(attachment);
            setAttachments((prev) => prev.filter((item) => item.id !== attachment.id));
            onAttachmentChange?.();
        } catch (err: any) {
            Alert.alert("Gagal Hapus", err?.message || "Tidak dapat menghapus lampiran.");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View className="flex-1 bg-black/80 justify-center items-center p-4">
                <View className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
                    {/* Header Modal */}
                    <View className="flex-row justify-between items-center mb-5 pb-3 border-b border-slate-800">
                        <View>
                            <Text className="text-white text-lg font-bold">
                                {isCreateMode ? 'Tambah Kartu Baru' : 'Detail Kartu Pesanan'}
                            </Text>
                            <Text className="text-slate-400 text-xs">
                                {isCreateMode
                                    ? 'Isi informasi pesanan baru'
                                    : 'Edit informasi, alur tahapan & galeri foto'}
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

                    <ScrollView className="max-h-[70vh]">
                        {/* Pesan Error Validasi */}
                        {errorMessage && (
                            <View className="mb-4 px-3.5 py-2.5 rounded-xl bg-red-950/70 border border-red-500/60">
                                <Text className="text-red-400 text-xs font-semibold">
                                    ⚠️ {errorMessage}
                                </Text>
                            </View>
                        )}

                        {/* Nama Project */}
                        <View className="mb-4">
                            <Text className="text-slate-300 text-xs font-semibold mb-1">
                                Nama Project <Text className="text-red-400">*</Text>
                            </Text>
                            <TextInput
                                value={title}
                                onChangeText={(t) => {
                                    setTitle(t);
                                    if (errorMessage) setErrorMessage(null);
                                }}
                                className="bg-slate-950 border border-slate-700 text-white p-3 rounded-xl text-sm"
                                placeholder="Contoh: Kitchen Set Minimalis"
                                placeholderTextColor="#64748B"
                            />
                        </View>

                        {/* Nama Klien */}
                        <View className="mb-4">
                            <Text className="text-slate-300 text-xs font-semibold mb-1">
                                Nama Klien & Lokasi <Text className="text-red-400">*</Text>
                            </Text>
                            <TextInput
                                value={clientName}
                                onChangeText={(t) => {
                                    setClientName(t);
                                    if (errorMessage) setErrorMessage(null);
                                }}
                                className="bg-slate-950 border border-slate-700 text-white p-3 rounded-xl text-sm"
                                placeholder="Contoh: Ibu Rini - Pleret"
                                placeholderTextColor="#64748B"
                            />
                        </View>

                        {/* Nomor HP Client */}
                        <View className="mb-4">
                            <Text className="text-slate-300 text-xs font-semibold mb-1">
                                Nomor HP Client <Text className="text-red-400">*</Text>
                            </Text>
                            <TextInput
                                value={clientPhone}
                                onChangeText={(t) => {
                                    const digitsOnly = t.replace(/[^0-9]/g, '');
                                    setClientPhone(digitsOnly);
                                    if (errorMessage) setErrorMessage(null);
                                }}
                                keyboardType="phone-pad"
                                inputMode="numeric"
                                className="bg-slate-950 border border-slate-700 text-white p-3 rounded-xl text-sm"
                                placeholder="Contoh: 081234567890"
                                placeholderTextColor="#64748B"
                            />
                        </View>

                        {/* Nilai Estimasi */}
                        <View className="mb-4">
                            <Text className="text-slate-300 text-xs font-semibold mb-1">
                                Nilai Estimasi (Rp){' '}
                                {isValueRequired ? (
                                    <Text className="text-red-400">*</Text>
                                ) : (
                                    <Text className="text-slate-500 font-normal">(Opsional)</Text>
                                )}
                            </Text>
                            <TextInput
                                value={value}
                                onChangeText={(t) => {
                                    const digitsOnly = t.replace(/[^0-9]/g, '');
                                    setValue(digitsOnly);
                                    if (errorMessage) setErrorMessage(null);
                                }}
                                keyboardType="numeric"
                                inputMode="numeric"
                                className="bg-slate-950 border border-slate-700 text-white p-3 rounded-xl text-sm"
                                placeholder="Contoh: 12688000"
                                placeholderTextColor="#64748B"
                            />
                        </View>

                        {/* Pindah Kolom */}
                        <View className="mb-4">
                            <Text className="text-slate-300 text-xs font-semibold mb-1.5">
                                Tahapan Alur (Kolom) <Text className="text-red-400">*</Text>
                            </Text>
                            <View className="flex-row flex-wrap">
                                {columns.map((col) => (
                                    <Chip
                                        key={col.id}
                                        label={col.title}
                                        selected={columnId === col.id}
                                        onPress={() => {
                                            setColumnId(col.id);
                                            if (errorMessage) setErrorMessage(null);
                                        }}
                                        color={col.color_hex}
                                        activeBorderColor="#FFFFFF"
                                        inactiveBorderColor="#334155"
                                    />
                                ))}
                            </View>
                        </View>

                        {/* Pilih PIC */}
                        <View className="mb-4">
                            <Text className="text-slate-300 text-xs font-semibold mb-1.5">
                                Penanggung Jawab (PIC) <Text className="text-red-400">*</Text>
                            </Text>
                            <View className="flex-row flex-wrap">
                                {profiles.map((p) => (
                                    <Chip
                                        key={p.id}
                                        label={p.full_name}
                                        icon="👤"
                                        selected={assignedTo === p.id}
                                        onPress={() => {
                                            setAssignedTo(p.id);
                                            if (errorMessage) setErrorMessage(null);
                                        }}
                                        activeBorderColor="#FFFFFF"
                                        color="#2563EB"
                                        inactiveBgColor="#020617"
                                        inactiveBorderColor="#334155"
                                    />
                                ))}
                            </View>
                        </View>

                        {/* ======================================================== */}
                        {/* BAGIAN GALERI FOTO & LAMPIRAN (TASK 3.8)                 */}
                        {/* ======================================================== */}
                        {isCreateMode ? (
                            <View className="mb-4 pt-3 border-t border-slate-800">
                                <Text className="text-slate-500 text-[11px]">
                                    📷 Foto & lampiran bisa diunggah setelah kartu disimpan.
                                </Text>
                            </View>
                        ) : (
                            <View className="mb-4 pt-2 border-t border-slate-800">
                                <View className="flex-row justify-between items-center mb-2">
                                    <Text className="text-slate-300 text-xs font-semibold">
                                        Galeri Foto & Lampiran ({attachments.length})
                                    </Text>
                                    <Pressable
                                        onPress={handlePickAndUploadImage}
                                        disabled={uploading}
                                        style={({ pressed }) => [{ opacity: pressed || uploading ? 0.7 : 1 }]}
                                        className="bg-sky-600/20 border border-sky-500/40 px-3 py-1.5 rounded-lg flex-row items-center"
                                    >
                                        {uploading ? (
                                            <ActivityIndicator size="small" color="#38BDF8" />
                                        ) : (
                                            <Text className="text-sky-400 text-xs font-semibold">
                                                📷 + Upload Foto
                                            </Text>
                                        )}
                                    </Pressable>
                                </View>

                                {/* List Thumbnail Foto */}
                                {attachments.length === 0 ? (
                                    <Pressable
                                        className="py-5 items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40"
                                        onPress={handlePickAndUploadImage}
                                        disabled={uploading}
                                    >
                                        <Text className="text-slate-500 text-xs">Belum ada foto yang diunggah</Text>
                                        <Text className="text-slate-600 text-[10px] mt-0.5">
                                            Unggah foto pengukuran, render 3D, atau bukti pengerjaan
                                        </Text>
                                    </Pressable>
                                ) : (
                                    <View className="flex-row flex-wrap gap-2.5">
                                        {attachments.map((item) => (
                                            <View
                                                key={item.id}
                                                className="w-24 h-24 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 relative"
                                            >
                                                <Image
                                                    source={{ uri: item.file_url }}
                                                    className="w-full h-full"
                                                    resizeMode="cover"
                                                />
                                                {/* Tombol Hapus Foto */}
                                                <Pressable
                                                    onPress={() => handleDeleteAttachment(item)}
                                                    disabled={deletingId === item.id}
                                                    style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                                                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600/90 items-center justify-center shadow-md"
                                                >
                                                    {deletingId === item.id ? (
                                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                                    ) : (
                                                        <Text className="text-white text-xs font-bold leading-none">✕</Text>
                                                    )}
                                                </Pressable>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Surat Penawaran Resmi */}
                        {!isCreateMode && card && (
                            <View className="mb-4 bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl">
                                <View className="flex-row items-center justify-between mb-2">
                                    <Text className="text-slate-300 text-xs font-semibold">
                                        Surat Penawaran Resmi
                                    </Text>
                                    {linkedQuotation && (
                                        <View className="bg-sky-950/80 border border-sky-800 px-2 py-0.5 rounded-md">
                                            <Text className="text-sky-400 text-[10px] font-bold">
                                                {linkedQuotation.quotation_no}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {linkedQuotation ? (
                                    <View>
                                        <Text className="text-emerald-400 font-bold text-sm mb-1">
                                            {formatRupiah(linkedQuotation.total_amount)}
                                        </Text>
                                        <Text className="text-slate-400 text-[11px] mb-3">
                                            Status: {linkedQuotation.status.toUpperCase()} • {linkedQuotation.quotation_items?.length || 0} Item Spesifikasi
                                        </Text>
                                        <View className="flex-row space-x-2">
                                            <Pressable
                                                onPress={() => setQuotationPreviewVisible(true)}
                                                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                                                className="flex-1 bg-slate-800 py-2 rounded-lg items-center mr-2 border border-slate-700"
                                            >
                                                <Text className="text-sky-300 text-xs font-semibold">👁️ Preview PDF</Text>
                                            </Pressable>
                                            <Pressable
                                                onPress={() => setQuotationFormVisible(true)}
                                                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                                                className="flex-1 bg-blue-600/20 py-2 rounded-lg items-center border border-blue-500/40"
                                            >
                                                <Text className="text-blue-300 text-xs font-semibold">✏️ Edit Penawaran</Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                ) : (
                                    <View className="items-center py-2">
                                        <Text className="text-slate-500 text-xs mb-2 text-center">
                                            Belum ada Surat Penawaran resmi untuk proyek ini.
                                        </Text>
                                        <Pressable
                                            onPress={() => setQuotationFormVisible(true)}
                                            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                                            className="bg-blue-600/20 border border-blue-500/40 px-3.5 py-2 rounded-xl flex-row items-center"
                                        >
                                            <Text className="text-sky-300 text-xs font-bold">📄 + Buat Surat Penawaran</Text>
                                        </Pressable>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Catatan Proyek */}
                        <View className="mb-4">
                            <Text className="text-slate-300 text-xs font-semibold mb-1">
                                Catatan Proyek
                            </Text>
                            <TextInput
                                value={notes}
                                onChangeText={(t) => {
                                    setNotes(t);
                                    if (errorMessage) setErrorMessage(null);
                                }}
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
                                <Text className="text-white font-bold text-xs">
                                    {isCreateMode ? 'Tambah Kartu' : 'Simpan Perubahan'}
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>

            {/* Modal Form Surat Penawaran */}
            {card && (
                <QuotationFormModal
                    visible={quotationFormVisible}
                    quotation={linkedQuotation}
                    cardId={card.id}
                    defaultClientName={clientName || card.client_name || ''}
                    defaultClientPhone={clientPhone || card.client_phone || ''}
                    defaultProjectTitle={title || card.title || ''}
                    onClose={() => setQuotationFormVisible(false)}
                    onSave={handleSaveQuotationFromCard}
                />
            )}

            {/* Modal Preview Surat Penawaran */}
            {linkedQuotation && (
                <QuotationPreviewModal
                    visible={quotationPreviewVisible}
                    quotation={linkedQuotation}
                    onClose={() => setQuotationPreviewVisible(false)}
                />
            )}
        </Modal>
    );
}
