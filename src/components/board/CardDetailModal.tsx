import { Chip } from "@/components/ui/Chip";
import { DatePickerField } from "@/components/ui/DatePickerField";
import {
    cardAttachmentService,
    MAX_PDF_SIZE_BYTES,
    MAX_PDF_SIZE_MB,
    TARGET_IMAGE_MAX_KB,
} from "@/services/cardAttachmentService";
import { orderWorkflowService } from "@/services/orderWorkflowService";
import { Quotation, SaveQuotationPayload, quotationService } from "@/services/quotationService";
import { QuotationFormModal } from "@/components/quotation/QuotationFormModal";
import { QuotationPreviewModal } from "@/components/quotation/QuotationPreviewModal";
import { AttachmentItem, CardItem, ColumnItem, Profile } from "@/store/slices/boardSlice";
import { formatRupiah } from "@/utils/terbilang";
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Camera, FileText } from 'lucide-react-native';
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Modal,
    Platform,
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
        due_date?: string | null;
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
    const [dueDate, setDueDate] = useState('');
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

    const wasVisibleRef = useRef(false);
    const currentCardIdRef = useRef<string | null | undefined>(undefined);

    useEffect(() => {
        const isOpening = !wasVisibleRef.current && visible;
        const isCardChanged = visible && card?.id !== currentCardIdRef.current;

        if (!visible) {
            wasVisibleRef.current = false;
            currentCardIdRef.current = undefined;
            return;
        }

        if (isOpening || isCardChanged) {
            wasVisibleRef.current = true;
            currentCardIdRef.current = card?.id;
            setErrorMessage(null);

            if (card) {
                setTitle(card.title || '');
                setClientName(card.client_name || '');
                setClientPhone(card.client_phone || '');
                setValue(card.estimated_value ? String(card.estimated_value) : '');
                setColumnId(card.column_id);
                setAssignedTo(card.assigned_to || null);
                setNotes(card.notes || '');
                setDueDate(card.due_date || orderWorkflowService.getCardDueDate(card) || '');
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
                setDueDate('');
                setNotes('');
                setAttachments([]);
                setLinkedQuotation(null);
            }
        }
    }, [visible, card?.id, defaultColumnId]);

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

        // Jika ada due_date, perbarui juga metadata tag [DEADLINE:...] di notes agar tetap konsisten
        let finalNotes = notes.trim();
        if (dueDate) {
            const clean = finalNotes.replace(/\[DEADLINE:[^\]]+\]/g, '').trim();
            finalNotes = clean ? `[DEADLINE:${dueDate}] ${clean}` : `[DEADLINE:${dueDate}]`;
        }

        onSave({
            title: title.trim(),
            client_name: clientName.trim(),
            client_phone: clientPhone.trim(),
            estimated_value: parseFloat(value) || 0,
            column_id: columnId,
            assigned_to: assignedTo,
            notes: finalNotes,
            due_date: dueDate || null,
        });
    };

    // Handler Upload Foto
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
            const newAttachment = await cardAttachmentService.uploadAttachment(card.id, {
                uri: asset.uri,
                fileName: asset.fileName || `foto_${Date.now()}.jpg`,
                mimeType: asset.mimeType || 'image/jpeg',
                fileSize: asset.fileSize,
            });
            setAttachments((prev) => [...prev, newAttachment]);
            onAttachmentChange?.();
        } catch (err: any) {
            Alert.alert("Gagal Upload", err?.message || "Terjadi kesalahan saat mengunggah foto.");
        } finally {
            setUploading(false);
        }
    };

    // Handler Upload Dokumen PDF
    const handlePickAndUploadPdf = async () => {
        if (!card) return;

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets?.length) return;

            const asset = result.assets[0];

            if (asset.size && asset.size > MAX_PDF_SIZE_BYTES) {
                Alert.alert(
                    "Ukuran PDF Melebihi Batas",
                    `Ukuran file PDF (${(asset.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimal ${MAX_PDF_SIZE_MB} MB.`
                );
                return;
            }

            setUploading(true);

            // PANGGIL SERVICE LAYER
            const newAttachment = await cardAttachmentService.uploadAttachment(card.id, {
                uri: asset.uri,
                fileName: asset.name,
                mimeType: asset.mimeType || 'application/pdf',
                fileSize: asset.size,
                file: asset.file,
            });
            setAttachments((prev) => [...prev, newAttachment]);
            onAttachmentChange?.();
        } catch (err: any) {
            Alert.alert("Gagal Upload PDF", err?.message || "Terjadi kesalahan saat mengunggah dokumen PDF.");
        } finally {
            setUploading(false);
        }
    };

    // Handler Buka / Preview File Lampiran (PDF atau Gambar)
    const handleOpenAttachment = async (item: AttachmentItem) => {
        try {
            if (Platform.OS === 'web') {
                window.open(item.file_url, '_blank');
            } else {
                await Linking.openURL(item.file_url);
            }
        } catch (err: any) {
            Alert.alert("Gagal Membuka File", "Tidak dapat membuka lampiran: " + (err?.message || err));
        }
    };

    // Helper Format Ukuran File
    const formatFileSize = (bytes?: number) => {
        if (!bytes || bytes <= 0) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
            <View className="flex-1 bg-black/60 justify-center items-center p-4">
                <View className="w-full max-w-lg bg-[#F8F6F1] border border-[#DDD6C8] rounded-[4px] p-5 shadow-2xl">
                    {/* Header Modal */}
                    <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-[#E3DDCF]">
                        <View>
                            <Text className="text-[#1B2225] text-base font-bold font-mono">
                                {isCreateMode ? 'Tambah Kartu Baru' : 'Detail Kartu Pesanan'}
                            </Text>
                            <Text className="text-[#70787C] text-xs">
                                {isCreateMode
                                    ? 'Isi informasi pesanan baru'
                                    : 'Edit informasi, alur tahapan & galeri foto'}
                            </Text>
                        </View>
                        <Pressable
                            onPress={onClose}
                            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                            className="w-7 h-7 rounded-[3px] bg-[#FAF8F5] border border-[#DDD6C8] items-center justify-center"
                        >
                            <Text className="text-[#1B2225] font-bold text-xs">✕</Text>
                        </Pressable>
                    </View>

                    <ScrollView className="max-h-[70vh]">
                        {/* Pesan Error Validasi */}
                        {errorMessage && (
                            <View className="mb-3 px-3 py-2 rounded-[3px] bg-rose-50 border border-rose-200">
                                <Text className="text-rose-700 text-xs font-semibold">
                                    ⚠️ {errorMessage}
                                </Text>
                            </View>
                        )}

                        {/* Nama Project */}
                        <View className="mb-3">
                            <Text className="text-[#1B2225] text-xs font-semibold mb-1">
                                Nama Project <Text className="text-rose-600">*</Text>
                            </Text>
                            <TextInput
                                value={title}
                                onChangeText={(t) => {
                                    setTitle(t);
                                    if (errorMessage) setErrorMessage(null);
                                }}
                                className="bg-white border border-[#DDD6C8] text-[#1B2225] p-2.5 rounded-[3px] text-xs font-medium"
                                placeholder="Contoh: Kitchen Set Minimalis"
                                placeholderTextColor="#8A9296"
                            />
                        </View>

                        {/* Nama Klien */}
                        <View className="mb-3">
                            <Text className="text-[#1B2225] text-xs font-semibold mb-1">
                                Nama Klien & Lokasi <Text className="text-rose-600">*</Text>
                            </Text>
                            <TextInput
                                value={clientName}
                                onChangeText={(t) => {
                                    setClientName(t);
                                    if (errorMessage) setErrorMessage(null);
                                }}
                                className="bg-white border border-[#DDD6C8] text-[#1B2225] p-2.5 rounded-[3px] text-xs font-medium"
                                placeholder="Contoh: Ibu Rini - Pleret"
                                placeholderTextColor="#8A9296"
                            />
                        </View>

                        {/* Nomor HP Client */}
                        <View className="mb-3">
                            <Text className="text-[#1B2225] text-xs font-semibold mb-1">
                                Nomor HP Client <Text className="text-rose-600">*</Text>
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
                                className="bg-white border border-[#DDD6C8] text-[#1B2225] p-2.5 rounded-[3px] text-xs font-mono"
                                placeholder="Contoh: 081234567890"
                                placeholderTextColor="#8A9296"
                            />
                        </View>

                        {/* Nilai Estimasi */}
                        <View className="mb-3">
                            <Text className="text-[#1B2225] text-xs font-semibold mb-1">
                                Nilai Estimasi (Rp){' '}
                                {isValueRequired ? (
                                    <Text className="text-rose-600">*</Text>
                                ) : (
                                    <Text className="text-[#8A9296] font-normal">(Opsional)</Text>
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
                                className="bg-white border border-[#DDD6C8] text-[#1B2225] p-2.5 rounded-[3px] text-xs font-mono"
                                placeholder="Contoh: 12688000"
                                placeholderTextColor="#8A9296"
                            />
                        </View>

                        {/* Tenggat Waktu / Deadline (Due Date) */}
                        <View className="mb-3">
                            <DatePickerField
                                label="Tenggat Deadline (Due Date)"
                                value={dueDate}
                                onChange={(newDate) => {
                                    setDueDate(newDate);
                                    if (errorMessage) setErrorMessage(null);
                                }}
                                placeholder="Pilih tanggal deadline pengerjaan..."
                                allowClear
                            />
                        </View>

                        {/* Pindah Kolom */}
                        <View className="mb-3">
                            <Text className="text-[#1B2225] text-xs font-semibold mb-1.5">
                                Tahapan Alur (Kolom) <Text className="text-rose-600">*</Text>
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
                                        activeBorderColor={col.color_hex}
                                        inactiveBgColor="#FAF8F5"
                                        inactiveBorderColor="#DDD6C8"
                                        inactiveTextColor="#4D555A"
                                    />
                                ))}
                            </View>
                        </View>

                        {/* Pilih PIC */}
                        <View className="mb-3">
                            <Text className="text-[#1B2225] text-xs font-semibold mb-1.5">
                                Penanggung Jawab (PIC) <Text className="text-rose-600">*</Text>
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
                                        color="#1B2225"
                                        activeBorderColor="#1B2225"
                                        inactiveBgColor="#FAF8F5"
                                        inactiveBorderColor="#DDD6C8"
                                        inactiveTextColor="#4D555A"
                                    />
                                ))}
                            </View>
                        </View>

                        {/* ======================================================== */}
                        {/* BAGIAN GALERI FOTO & LAMPIRAN                            */}
                        {/* ======================================================== */}
                        {isCreateMode ? (
                            <View className="mb-3 pt-2.5 border-t border-[#E3DDCF]">
                                <Text className="text-[#8A9296] text-[11px]">
                                    📎 Foto & lampiran dokumen bisa diunggah setelah kartu disimpan.
                                </Text>
                            </View>
                        ) : (
                            <View className="mb-3 pt-2 border-t border-[#E3DDCF]">
                                <View className="flex-row justify-between items-center mb-2">
                                    <Text className="text-[#1B2225] text-xs font-semibold">
                                        Galeri Foto & Dokumen ({attachments.length})
                                    </Text>
                                    <View className="flex-row items-center gap-1.5">
                                        <Pressable
                                            onPress={handlePickAndUploadImage}
                                            disabled={uploading}
                                            style={({ pressed }) => [{ opacity: pressed || uploading ? 0.7 : 1 }]}
                                            className="bg-[#FAF8F5] border border-[#DDD6C8] hover:bg-[#F2EDE4] px-2 py-1 rounded-[3px] flex-row items-center shadow-2xs"
                                        >
                                            <Camera size={11} color="#1B2225" />
                                            <Text className="text-[#1B2225] text-[11px] font-semibold ml-1">
                                                + Foto
                                            </Text>
                                        </Pressable>

                                        <Pressable
                                            onPress={handlePickAndUploadPdf}
                                            disabled={uploading}
                                            style={({ pressed }) => [{ opacity: pressed || uploading ? 0.7 : 1 }]}
                                            className="bg-[#1B2225] border border-[#1B2225] hover:bg-[#2C373C] px-2.5 py-1 rounded-[3px] flex-row items-center shadow-2xs"
                                        >
                                            {uploading ? (
                                                <ActivityIndicator size="small" color="#FFFFFF" />
                                            ) : (
                                                <>
                                                    <FileText size={11} color="#FFFFFF" />
                                                    <Text className="text-white text-[11px] font-semibold ml-1">
                                                        + PDF
                                                    </Text>
                                                </>
                                            )}
                                        </Pressable>
                                    </View>
                                </View>

                                {/* List Thumbnail Foto & Lampiran PDF */}
                                {attachments.length === 0 ? (
                                    <View>
                                        <View className="flex-row gap-2">
                                            <Pressable
                                                className="flex-1 py-3 px-2.5 items-center justify-center border border-dashed border-[#DDD6C8] rounded-[3px] bg-white hover:bg-[#FAF8F5]"
                                                onPress={handlePickAndUploadImage}
                                                disabled={uploading}
                                            >
                                                <Camera size={18} color="#968363" />
                                                <Text className="text-[#1B2225] text-xs font-semibold mt-1">Unggah Foto</Text>
                                                <Text className="text-[#8A9296] text-[10px] mt-0.5 text-center">
                                                    Pengukuran, visual 3D & workshop
                                                </Text>
                                            </Pressable>
                                            <Pressable
                                                className="flex-1 py-3 px-2.5 items-center justify-center border border-dashed border-[#DDD6C8] rounded-[3px] bg-white hover:bg-[#FAF8F5]"
                                                onPress={handlePickAndUploadPdf}
                                                disabled={uploading}
                                            >
                                                <FileText size={18} color="#DC2626" />
                                                <Text className="text-[#1B2225] text-xs font-semibold mt-1">Unggah PDF</Text>
                                                <Text className="text-[#8A9296] text-[10px] mt-0.5 text-center">
                                                    SPK, denah CAD & spek teknis
                                                </Text>
                                            </Pressable>
                                        </View>
                                        <Text className="text-[#8A9296] text-[10px] text-center mt-1.5">
                                            Batas ukuran: <Text className="font-semibold text-[#1B2225] font-mono">PDF maks. {MAX_PDF_SIZE_MB} MB</Text> • Foto otomatis dikompresi (<Text className="font-semibold text-[#1B2225] font-mono">&lt; {TARGET_IMAGE_MAX_KB} KB</Text>)
                                        </Text>
                                    </View>
                                ) : (
                                    <View className="flex-row flex-wrap gap-2">
                                        {attachments.map((item) => {
                                            const isPdf =
                                                item.file_type === 'pdf' ||
                                                item.file_name?.toLowerCase().endsWith('.pdf') ||
                                                item.file_url?.toLowerCase().includes('.pdf');

                                            if (isPdf) {
                                                return (
                                                    <View
                                                        key={item.id}
                                                        className="w-28 h-24 rounded-[3px] overflow-hidden bg-[#FAF8F5] border border-[#DDD6C8] p-2 relative justify-between shadow-2xs"
                                                    >
                                                        <Pressable
                                                            onPress={() => handleOpenAttachment(item)}
                                                            className="flex-1 justify-between"
                                                        >
                                                            <View className="flex-row items-center justify-between pr-5">
                                                                <View className="bg-rose-50 border border-rose-200 px-1 py-0.5 rounded-[2px] flex-row items-center">
                                                                    <FileText size={10} color="#BE123C" />
                                                                    <Text className="text-rose-700 font-mono text-[9px] font-bold ml-0.5">
                                                                        PDF
                                                                    </Text>
                                                                </View>
                                                            </View>

                                                            <Text
                                                                className="text-[#1B2225] text-[11px] font-semibold leading-tight my-1"
                                                                numberOfLines={2}
                                                                ellipsizeMode="middle"
                                                            >
                                                                {item.file_name || 'Dokumen.pdf'}
                                                            </Text>

                                                            <View className="flex-row items-center justify-between">
                                                                <Text className="text-[#8A9296] text-[9px] font-mono">
                                                                    {formatFileSize(item.file_size) || 'PDF File'}
                                                                </Text>
                                                                <Text className="text-[#968363] text-[9px] font-bold">
                                                                    Buka ↗
                                                                </Text>
                                                            </View>
                                                        </Pressable>

                                                        {/* Tombol Hapus Dokumen */}
                                                        <Pressable
                                                            onPress={() => handleDeleteAttachment(item)}
                                                            disabled={deletingId === item.id}
                                                            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                                                            className="absolute top-1 right-1 w-5 h-5 rounded-[2px] bg-rose-700 items-center justify-center shadow-xs"
                                                        >
                                                            {deletingId === item.id ? (
                                                                <ActivityIndicator size="small" color="#FFFFFF" />
                                                            ) : (
                                                                <Text className="text-white text-[10px] font-bold leading-none">✕</Text>
                                                            )}
                                                        </Pressable>
                                                    </View>
                                                );
                                            }

                                            return (
                                                <View
                                                    key={item.id}
                                                    className="w-24 h-24 rounded-[3px] overflow-hidden bg-white border border-[#DDD6C8] relative shadow-2xs"
                                                >
                                                    <Pressable
                                                        onPress={() => handleOpenAttachment(item)}
                                                        className="w-full h-full"
                                                    >
                                                        <Image
                                                            source={{ uri: item.file_url }}
                                                            className="w-full h-full"
                                                            resizeMode="cover"
                                                        />
                                                    </Pressable>

                                                    {/* Tombol Hapus Foto */}
                                                    <Pressable
                                                        onPress={() => handleDeleteAttachment(item)}
                                                        disabled={deletingId === item.id}
                                                        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                                                        className="absolute top-1 right-1 w-5 h-5 rounded-[2px] bg-rose-700 items-center justify-center shadow-xs"
                                                    >
                                                        {deletingId === item.id ? (
                                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                                        ) : (
                                                            <Text className="text-white text-[10px] font-bold leading-none">✕</Text>
                                                        )}
                                                    </Pressable>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Surat Penawaran Resmi */}
                        {!isCreateMode && card && (
                            <View className="mb-3 bg-white border border-[#DDD6C8] p-3 rounded-[3px] shadow-2xs">
                                <View className="flex-row items-center justify-between mb-1.5">
                                    <Text className="text-[#1B2225] text-xs font-semibold">
                                        Surat Penawaran Resmi
                                    </Text>
                                    {linkedQuotation && (
                                        <View className="bg-[#FAF8F5] border border-[#DDD6C8] px-2 py-0.5 rounded-[2px]">
                                            <Text className="text-[#968363] text-[10px] font-bold font-mono">
                                                {linkedQuotation.quotation_no}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {linkedQuotation ? (
                                    <View>
                                        <Text className="text-emerald-800 font-bold text-sm mb-1 font-mono">
                                            {formatRupiah(linkedQuotation.total_amount)}
                                        </Text>
                                        <Text className="text-[#70787C] text-[11px] mb-2.5">
                                            Status: {linkedQuotation.status.toUpperCase()} • {linkedQuotation.quotation_items?.length || 0} Item Spesifikasi
                                        </Text>
                                        <View className="flex-row space-x-2">
                                            <Pressable
                                                onPress={() => setQuotationPreviewVisible(true)}
                                                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                                                className="flex-1 bg-[#FAF8F5] py-1.5 rounded-[3px] items-center mr-2 border border-[#DDD6C8]"
                                            >
                                                <Text className="text-[#1B2225] text-xs font-semibold">👁️ Preview PDF</Text>
                                            </Pressable>
                                            <Pressable
                                                onPress={() => setQuotationFormVisible(true)}
                                                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                                                className="flex-1 bg-[#1B2225] py-1.5 rounded-[3px] items-center border border-[#1B2225]"
                                            >
                                                <Text className="text-white text-xs font-semibold">✏️ Edit Penawaran</Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                ) : (
                                    <View className="items-center py-2">
                                        <Text className="text-[#70787C] text-xs mb-2 text-center">
                                            Belum ada Surat Penawaran resmi untuk proyek ini.
                                        </Text>
                                        <Pressable
                                            onPress={() => setQuotationFormVisible(true)}
                                            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                                            className="bg-[#FAF8F5] border border-[#DDD6C8] px-3 py-1.5 rounded-[3px] flex-row items-center"
                                        >
                                            <Text className="text-[#1B2225] text-xs font-bold">📄 + Buat Surat Penawaran</Text>
                                        </Pressable>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Catatan Proyek */}
                        <View className="mb-3">
                            <Text className="text-[#1B2225] text-xs font-semibold mb-1">
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
                                className="bg-white border border-[#DDD6C8] text-[#1B2225] p-2.5 rounded-[3px] text-xs"
                                placeholder="Catatan bahan, request aksesoris, dll."
                                placeholderTextColor="#8A9296"
                                textAlignVertical="top"
                            />
                        </View>
                    </ScrollView>

                    {/* Tombol Aksi */}
                    <View className="flex-row justify-end mt-3 pt-2.5 border-t border-[#E3DDCF]">
                        <Pressable
                            onPress={onClose}
                            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                            className="px-3.5 py-1.5 rounded-[3px] bg-[#FAF8F5] border border-[#DDD6C8] mr-2"
                        >
                            <Text className="text-[#1B2225] font-semibold text-xs">Batal</Text>
                        </Pressable>
                        <Pressable
                            onPress={handleSubmit}
                            disabled={saving}
                            style={({ pressed }) => [{ opacity: pressed || saving ? 0.8 : 1 }]}
                            className="px-4 py-1.5 rounded-[3px] bg-[#1B2225] hover:bg-[#2C373C] items-center justify-center shadow-xs"
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
