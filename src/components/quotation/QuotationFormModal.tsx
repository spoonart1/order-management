import { supabase } from '@/lib/supabase';
import {
  Quotation,
  QuotationItem,
  QuotationTerm,
  SaveQuotationPayload,
  quotationService,
} from '@/services/quotationService';
import { useAppSelector } from '@/store/hooks';
import { formatRupiah, terbilang } from '@/utils/terbilang';
import {
  Link,
  Phone,
  Plus,
  Trash2,
  User,
  X
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

export type QuotationItemType = 'kitchen_set' | 'other';

export interface FormItem extends Omit<QuotationItem, 'id' | 'quotation_id'> {
  item_type?: QuotationItemType;
}

// Data Hardcoded Suggestion Spesifikasi Alora Studio
export const SPEC_SUGGESTIONS = {
  material: [
    'PVC board',
    'Blockwood / Blockboard / Blocminto',
  ],
  finishing: [
    'Cat Duco',
    'HPL',
  ],
  accessories: [
    'Engsel soft close',
    'Engsel slowmotion',
    'Rel Standard',
    'Rel Tandem'
  ],
};

interface SpecFieldWithDropdownProps {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  isMultiSelect?: boolean;
  onChange: (val: string) => void;
}

function SpecFieldWithDropdown({
  label,
  value,
  placeholder,
  options,
  isMultiSelect = false,
  onChange,
}: SpecFieldWithDropdownProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSelectOption = (opt: string) => {
    if (isMultiSelect) {
      if (!value.trim()) {
        onChange(opt);
      } else {
        const parts = value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (parts.includes(opt)) {
          const filtered = parts.filter((p) => p !== opt);
          onChange(filtered.join(', '));
        } else {
          onChange([...parts, opt].join(', '));
        }
      }
    } else {
      onChange(opt);
      setDropdownOpen(false);
    }
  };

  return (
    <View className="w-full md:w-1/4 px-1.5 mb-2.5">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-slate-400 text-[11px] font-medium">{label}</Text>
        {/* <Pressable
          onPress={() => setDropdownOpen(true)}
          className="flex-row items-center bg-slate-800 px-2 py-0.5 rounded border border-slate-700"
        >
          <Text className="text-sky-400 text-[9px] font-semibold mr-0.5">▾ Dropdown</Text>
        </Pressable> */}
      </View>

      <TextInput
        value={value}
        onChangeText={onChange}
        className="bg-slate-950 border border-slate-800 text-white p-2 rounded-xl text-xs"
        placeholder={placeholder}
        placeholderTextColor="#64748B"
      />

      {/* Suggestion Chips */}
      <View className="flex-row flex-wrap gap-1 mt-1">
        {options.map((opt) => {
          const isSelected = isMultiSelect
            ? value.toLowerCase().includes(opt.toLowerCase())
            : value.toLowerCase() === opt.toLowerCase();
          return (
            <Pressable
              key={opt}
              onPress={() => handleSelectOption(opt)}
              className={`px-1.5 py-0.5 rounded border ${isSelected
                ? 'bg-blue-600/30 border-blue-500'
                : 'bg-slate-950/80 border-slate-800'
                }`}
            >
              <Text
                className={`text-[10px] ${isSelected ? 'text-blue-300 font-bold' : 'text-slate-400'
                  }`}
              >
                {isSelected ? '✓ ' : '+ '}{opt}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Modal Dropdown Pilihan Spesifikasi */}
      {dropdownOpen && (
        <Modal
          transparent
          visible={dropdownOpen}
          animationType="fade"
          onRequestClose={() => setDropdownOpen(false)}
        >
          <Pressable
            onPress={() => setDropdownOpen(false)}
            className="flex-1 bg-black/60 items-center justify-center p-4"
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-4 shadow-2xl"
            >
              <View className="flex-row items-center justify-between pb-2 mb-3 border-b border-slate-800">
                <Text className="text-white font-bold text-sm">
                  Pilih {label}
                </Text>
                <Pressable onPress={() => setDropdownOpen(false)}>
                  <Text className="text-slate-400 text-xs">✕ Tutup</Text>
                </Pressable>
              </View>

              <View className="mb-3">
                {options.map((opt) => {
                  const isSelected = isMultiSelect
                    ? value.toLowerCase().includes(opt.toLowerCase())
                    : value.toLowerCase() === opt.toLowerCase();
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => handleSelectOption(opt)}
                      className={`p-3 rounded-xl border flex-row items-center justify-between mb-2 ${isSelected
                        ? 'bg-blue-600/25 border-blue-500'
                        : 'bg-slate-950 border-slate-800'
                        }`}
                    >
                      <Text
                        className={`text-xs ${isSelected ? 'text-blue-300 font-bold' : 'text-slate-200'
                          }`}
                      >
                        {opt}
                      </Text>
                      {isSelected ? (
                        <Text className="text-emerald-400 font-bold text-xs">✓ Dipilih</Text>
                      ) : (
                        <Text className="text-slate-500 text-xs">+ Pilih</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={() => setDropdownOpen(false)}
                className="py-2.5 bg-blue-600 rounded-xl items-center shadow"
              >
                <Text className="text-white text-xs font-bold">Simpan / Selesai</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

interface ClientSuggestion {
  id: string;
  client_name: string;
  client_phone: string | null;
  title: string;
  notes: string | null;
}

interface QuotationFormModalProps {
  visible: boolean;
  quotation?: Quotation | null;
  cardId?: string | null;
  defaultClientName?: string;
  defaultClientPhone?: string;
  defaultProjectTitle?: string;
  onClose: () => void;
  onSave: (payload: SaveQuotationPayload) => Promise<void>;
  onPreview?: (quotationData: Quotation) => void;
}

export function QuotationFormModal({
  visible,
  quotation,
  cardId,
  defaultClientName = '',
  defaultClientPhone = '',
  defaultProjectTitle = '',
  onClose,
  onSave,
  onPreview,
}: QuotationFormModalProps) {
  const { user, profile } = useAppSelector((state) => state.auth);

  // Form State
  const [quotationNo, setQuotationNo] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientCity, setClientCity] = useState('Yogyakarta');
  const [projectTitle, setProjectTitle] = useState('');
  const [workDuration, setWorkDuration] = useState('20');
  const [validityDays, setValidityDays] = useState('20');
  const [marketingName, setMarketingName] = useState('');
  const [status, setStatus] = useState<'draft' | 'sent' | 'approved' | 'rejected'>('draft');
  const [notes, setNotes] = useState('');

  // Auto-Search & Relasi Order Board Card
  const [selectedCardId, setSelectedCardId] = useState<string | null>(cardId || null);
  const [selectedCardTitle, setSelectedCardTitle] = useState<string | null>(defaultProjectTitle || null);
  const [clientSuggestions, setClientSuggestions] = useState<ClientSuggestion[]>([]);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const isSelectingRef = useRef(false);
  const isUserTypingClientRef = useRef(false);
  const wasVisibleRef = useRef(false);
  const currentQuotationIdRef = useRef<string | null | undefined>(undefined);

  // Termin Pembayaran
  const [terms, setTerms] = useState<QuotationTerm[]>([
    { title: 'Termin I', pct: 50, desc: 'DP Mulai Pekerjaan' },
    { title: 'Termin II', pct: 25, desc: 'Seting Di Lokasi' },
    { title: 'Termin III', pct: 25, desc: 'Pekerjaan Selesai' },
  ]);

  // Rincian Item Penawaran & Spesifikasi
  const [items, setItems] = useState<FormItem[]>([
    {
      item_no: 1,
      item_type: 'kitchen_set',
      description: '',
      material: '',
      finishing: '',
      accessories: '',
      dimensions: '',
      quantity: 1,
      unit: 'SET',
      unit_price: 0,
      amount: 0,
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Inisialisasi data form saat modal dibuka (hanya sekali saat modal dibuka, tidak mereset saat window focus)
  useEffect(() => {
    const isOpening = !wasVisibleRef.current && visible;
    const isQuotationChanged = visible && quotation?.id !== currentQuotationIdRef.current;

    if (!visible) {
      wasVisibleRef.current = false;
      currentQuotationIdRef.current = undefined;
      return;
    }

    if (isOpening || isQuotationChanged) {
      wasVisibleRef.current = true;
      currentQuotationIdRef.current = quotation?.id;

      if (quotation) {
        // Mode Edit
        setQuotationNo(quotation.quotation_no);
        setClientName(quotation.client_name);
        setClientPhone(quotation.client_phone || '');
        setClientCity(quotation.client_city || 'Yogyakarta');
        setProjectTitle(quotation.project_title);
        setWorkDuration(String(quotation.work_duration_days || 20));
        setValidityDays(String(quotation.validity_days || 20));
        setMarketingName(quotation.marketing_name || profile?.full_name || 'Marketing Alora');
        setStatus(quotation.status);
        setNotes(quotation.notes || '');
        setSelectedCardId(quotation.card_id || cardId || null);
        setSelectedCardTitle(quotation.project_title || null);
        if (quotation.terms && quotation.terms.length > 0) {
          setTerms(quotation.terms);
        }
        if (quotation.quotation_items && quotation.quotation_items.length > 0) {
          setItems(
            quotation.quotation_items.map((it) => {
              const hasSpecs = Boolean(it.material || it.finishing || it.accessories || it.dimensions);
              return {
                item_no: it.item_no,
                item_type: hasSpecs ? 'kitchen_set' : 'other',
                description: it.description,
                material: it.material || '',
                finishing: it.finishing || '',
                accessories: it.accessories || '',
                dimensions: it.dimensions || '',
                quantity: it.quantity,
                unit: hasSpecs ? 'SET' : (it.unit || 'SET'),
                unit_price: it.unit_price,
                amount: it.amount,
              };
            })
          );
        }
      } else {
        // Mode Baru
        setClientName(defaultClientName);
        setClientPhone(defaultClientPhone);
        setProjectTitle(defaultProjectTitle);
        setClientCity('Yogyakarta');
        setWorkDuration('20');
        setValidityDays('20');
        setMarketingName(profile?.full_name || 'Marketing Alora');
        setStatus('draft');
        setNotes('');
        setSelectedCardId(cardId || null);
        setSelectedCardTitle(defaultProjectTitle || null);
        setTerms([
          { title: 'Termin I', pct: 50, desc: 'DP Mulai Pekerjaan' },
          { title: 'Termin II', pct: 25, desc: 'Seting Di Lokasi' },
          { title: 'Termin III', pct: 25, desc: 'Pekerjaan Selesai' },
        ]);
        setItems([
          {
            item_no: 1,
            item_type: 'kitchen_set',
            description: '',
            material: '',
            finishing: '',
            accessories: '',
            dimensions: '',
            quantity: 1,
            unit: 'SET',
            unit_price: 0,
            amount: 0,
          },
        ]);

        // Generate Auto Number
        quotationService.generateNextQuotationNumber().then((no) => {
          setQuotationNo(no);
        });
      }

      isUserTypingClientRef.current = false;
      setClientSuggestions([]);
      setShowClientDropdown(false);
      setErrorMessage(null);
    }
  }, [visible, quotation?.id, cardId]);

  // Efek Auto-Search Klien dari board_cards berdasarkan nama yang diketik
  useEffect(() => {
    if (!visible) return;
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      return;
    }

    // Hanya lakukan pencarian jika pengguna aktif mengetik (bukan saat initial load / klik edit)
    if (!isUserTypingClientRef.current) {
      return;
    }

    const query = clientName.trim();
    if (query.length < 2) {
      setClientSuggestions([]);
      setShowClientDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingClient(true);
        const { data, error } = await supabase
          .from('board_cards')
          .select('id, client_name, client_phone, title, notes')
          .not('client_name', 'is', null)
          .ilike('client_name', `%${query}%`)
          .limit(6);

        if (!error && data && data.length > 0) {
          const valid = data.filter(
            (c) => c.client_name && c.client_name.trim().length > 0
          ) as ClientSuggestion[];
          setClientSuggestions(valid);
          setShowClientDropdown(valid.length > 0);
        } else {
          setClientSuggestions([]);
          setShowClientDropdown(false);
        }
      } catch (err) {
        console.error('Error auto-searching clients from board_cards:', err);
      } finally {
        setIsSearchingClient(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [clientName, visible]);

  // Handler saat item klien dipilih dari dropdown
  const handleSelectClient = (item: ClientSuggestion) => {
    isSelectingRef.current = true;
    isUserTypingClientRef.current = false;
    setClientName(item.client_name);

    if (item.client_phone) {
      setClientPhone(item.client_phone);
    }

    // Auto-fill judul proyek jika kosong atau sama dengan default
    if (!projectTitle.trim() || projectTitle === defaultProjectTitle) {
      setProjectTitle(item.title);
    }

    // Auto-fill catatan jika kosong
    if (!notes.trim() && item.notes) {
      setNotes(item.notes);
    }

    setSelectedCardId(item.id);
    setSelectedCardTitle(item.title);
    setShowClientDropdown(false);
    setClientSuggestions([]);
    if (errorMessage) setErrorMessage(null);
  };

  // Kalkulasi Total
  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const terbilangText = terbilang(subtotal);

  // Helper Item Actions
  const handleAddItem = (type: QuotationItemType = 'kitchen_set') => {
    setItems((prev) => [
      ...prev,
      {
        item_no: prev.length + 1,
        item_type: type,
        description: '',
        material: '',
        finishing: '',
        accessories: '',
        dimensions: '',
        quantity: 1,
        unit: 'SET',
        unit_price: 0,
        amount: 0,
      },
    ]);
  };

  const handleToggleItemType = (index: number, newType: QuotationItemType) => {
    setItems((prev) => {
      const updated = [...prev];
      const cur = updated[index];
      if (newType === 'kitchen_set') {
        updated[index] = {
          ...cur,
          item_type: 'kitchen_set',
          unit: 'SET', // Lock satuan to SET
        };
      } else {
        updated[index] = {
          ...cur,
          item_type: 'other',
          material: '',
          finishing: '',
          accessories: '',
          dimensions: '',
          unit: cur.unit || 'SET',
        };
      }
      return updated;
    });
    if (errorMessage) setErrorMessage(null);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      Alert.alert('Perhatian', 'Minimal harus ada 1 item penawaran.');
      return;
    }
    const updated = items.filter((_, idx) => idx !== index).map((it, idx) => ({
      ...it,
      item_no: idx + 1,
    }));
    setItems(updated);
  };

  const handleUpdateItem = (index: number, field: keyof QuotationItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      if (field === 'quantity' || field === 'unit_price') {
        const qty = field === 'quantity' ? Number(value) || 0 : Number(item.quantity) || 0;
        const price = field === 'unit_price' ? Number(value) || 0 : Number(item.unit_price) || 0;
        item.amount = qty * price;
      }

      updated[index] = item;
      return updated;
    });
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async () => {
    if (!quotationNo.trim()) {
      setErrorMessage('Nomor Surat Penawaran wajib diisi.');
      return;
    }
    if (!clientName.trim()) {
      setErrorMessage('Nama Klien wajib diisi.');
      return;
    }
    if (!projectTitle.trim()) {
      setErrorMessage('Judul Proyek wajib diisi.');
      return;
    }

    // Validasi item
    const invalidItem = items.find((it) => !it.description.trim());
    if (invalidItem) {
      setErrorMessage(`Deskripsi pekerjaan pada item #${invalidItem.item_no} tidak boleh kosong.`);
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);

      // Bersihkan spesifikasi jika jenisnya bukan kitchen set
      const itemsToSave = items.map((it, idx) => ({
        item_no: idx + 1,
        description: it.description,
        material: it.item_type === 'kitchen_set' ? (it.material || null) : null,
        accessories: it.item_type === 'kitchen_set' ? (it.accessories || null) : null,
        finishing: it.item_type === 'kitchen_set' ? (it.finishing || null) : null,
        dimensions: it.item_type === 'kitchen_set' ? (it.dimensions || null) : null,
        quantity: Number(it.quantity) || 1,
        unit: it.item_type === 'kitchen_set' ? 'SET' : (it.unit || 'SET'),
        unit_price: Number(it.unit_price) || 0,
        amount: Number(it.amount) || 0,
      }));

      const payload: SaveQuotationPayload = {
        card_id: selectedCardId || cardId || quotation?.card_id || null,
        quotation_no: quotationNo.trim(),
        client_name: clientName.trim(),
        client_phone: clientPhone.trim() || null,
        client_city: clientCity.trim() || 'Yogyakarta',
        project_title: projectTitle.trim(),
        work_duration_days: parseInt(workDuration, 10) || 20,
        validity_days: parseInt(validityDays, 10) || 20,
        marketing_id: profile?.id || user?.id || null,
        marketing_name: marketingName.trim() || 'Marketing Alora',
        status,
        terms,
        items: itemsToSave,
        notes: notes.trim() || null,
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan surat penawaran.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenPreview = () => {
    if (!onPreview) return;
    const mockQuotation: Quotation = {
      id: quotation?.id || 'preview-temp',
      card_id: selectedCardId || cardId || quotation?.card_id || null,
      quotation_no: quotationNo || 'DRAFT/SP/APK/10/26',
      client_name: clientName || 'Nama Klien',
      client_phone: clientPhone || null,
      client_city: clientCity || 'Yogyakarta',
      project_title: projectTitle || 'Pekerjaan Interior & Furniture',
      total_amount: subtotal,
      terbilang: terbilangText,
      work_duration_days: parseInt(workDuration, 10) || 20,
      validity_days: parseInt(validityDays, 10) || 20,
      marketing_name: marketingName || 'Marketing Alora',
      status,
      terms,
      issued_date: quotation?.issued_date || new Date().toISOString().split('T')[0],
      notes,
      quotation_items: items.map((it, idx) => ({
        item_no: idx + 1,
        description: it.description,
        material: it.item_type === 'kitchen_set' ? (it.material || null) : null,
        accessories: it.item_type === 'kitchen_set' ? (it.accessories || null) : null,
        finishing: it.item_type === 'kitchen_set' ? (it.finishing || null) : null,
        dimensions: it.item_type === 'kitchen_set' ? (it.dimensions || null) : null,
        quantity: Number(it.quantity) || 1,
        unit: it.item_type === 'kitchen_set' ? 'SET' : (it.unit || 'SET'),
        unit_price: Number(it.unit_price) || 0,
        amount: Number(it.amount) || 0,
      })),
    };
    onPreview(mockQuotation);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/80 items-center justify-center p-2 md:p-6">
        <View className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[94%] flex-col overflow-hidden shadow-2xl">
          {/* Header Modal */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
            <View>
              <Text className="text-white font-bold text-base md:text-lg">
                {quotation ? 'Edit Surat Penawaran' : 'Buat Surat Penawaran Baru'}
              </Text>
              <Text className="text-slate-400 text-xs mt-0.5">
                Format standar resmi Alora Studio • Terhubung ke RAB & Spesifikasi
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center"
            >
              <X size={18} color="#94A3B8" />
            </Pressable>
          </View>

          {/* Form Content */}
          <ScrollView
            className="flex-1 p-5 md:p-6"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Error Message Box */}
            {errorMessage ? (
              <View className="mb-5 p-3.5 bg-rose-950/80 border border-rose-500 rounded-xl">
                <Text className="text-rose-200 text-xs font-semibold">⚠️ {errorMessage}</Text>
              </View>
            ) : null}

            {/* SEKSI 1: INFORMASI UMUM & SURAT */}
            <View className="mb-6 bg-slate-950/80 border border-slate-800/80 p-4 rounded-xl">
              <Text className="text-sky-400 font-bold text-xs uppercase tracking-wider mb-3">
                1. INFORMASI SURAT & KLIEN
              </Text>

              <View className="flex-row flex-wrap -mx-2">
                {/* No Surat */}
                <View className="w-full md:w-1/3 px-2 mb-3">
                  <Text className="text-slate-300 text-xs font-semibold mb-1">
                    No. Surat Penawaran <Text className="text-rose-400">*</Text>
                  </Text>
                  <TextInput
                    value={quotationNo}
                    onChangeText={setQuotationNo}
                    className="bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl text-xs"
                    placeholder="054/SP/APK/10/26"
                    placeholderTextColor="#64748B"
                  />
                </View>

                {/* Nama Klien dengan Auto-Search & Dropdown Board Cards */}
                <View className="w-full md:w-1/3 px-2 mb-3 relative z-30">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-slate-300 text-xs font-semibold">
                      Nama Klien (Kepada Yth) <Text className="text-rose-400">*</Text>
                    </Text>
                    {isSearchingClient && (
                      <View className="flex-row items-center">
                        <ActivityIndicator size="small" color="#38BDF8" style={{ transform: [{ scale: 0.7 }] }} />
                        <Text className="text-sky-400 text-[10px] ml-1">Mencari...</Text>
                      </View>
                    )}
                  </View>

                  <View className="relative">
                    <TextInput
                      value={clientName}
                      onChangeText={(t) => {
                        isUserTypingClientRef.current = true;
                        setClientName(t);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      onFocus={() => {
                        if (clientSuggestions.length > 0) {
                          setShowClientDropdown(true);
                        }
                      }}
                      className="bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl text-xs pr-8"
                      placeholder="Ketik nama klien (auto search)..."
                      placeholderTextColor="#64748B"
                    />
                    {clientName.trim().length > 0 && (
                      <Pressable
                        onPress={() => {
                          isUserTypingClientRef.current = false;
                          setClientName('');
                          setClientSuggestions([]);
                          setShowClientDropdown(false);
                        }}
                        className="absolute right-2.5 top-2.5"
                      >
                        <X size={14} color="#94A3B8" />
                      </Pressable>
                    )}
                  </View>

                  {/* Dropdown Hasil Pencarian dari board_cards */}
                  {showClientDropdown && clientSuggestions.length > 0 && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 58,
                        left: 8,
                        right: 8,
                        zIndex: 9999,
                        elevation: 10,
                      }}
                      className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl"
                    >
                      <View className="px-3 py-1.5 bg-slate-950 border-b border-slate-800 flex-row justify-between items-center">
                        <Text className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">
                          Ditemukan di Order Boards
                        </Text>
                        <Pressable onPress={() => setShowClientDropdown(false)}>
                          <Text className="text-slate-400 text-[10px]">Tutup ✕</Text>
                        </Pressable>
                      </View>

                      <ScrollView
                        style={{ maxHeight: 210 }}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled
                      >
                        {clientSuggestions.map((item) => (
                          <Pressable
                            key={item.id}
                            onPress={() => handleSelectClient(item)}
                            style={({ pressed }) => [{ backgroundColor: pressed ? '#1E293B' : 'transparent' }]}
                            className="p-2.5 border-b border-slate-800/80 active:bg-slate-800"
                          >
                            <View className="flex-row items-center justify-between">
                              <View className="flex-row items-center flex-1 mr-2">
                                <View className="w-6 h-6 rounded-full bg-sky-950 items-center justify-center mr-2 border border-sky-800">
                                  <User size={12} color="#38BDF8" />
                                </View>
                                <View className="flex-1">
                                  <Text className="text-white text-xs font-bold" numberOfLines={1}>
                                    {item.client_name}
                                  </Text>
                                  <Text className="text-slate-400 text-[10px]" numberOfLines={1}>
                                    Proyek: {item.title}
                                  </Text>
                                </View>
                              </View>

                              {item.client_phone ? (
                                <View className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 flex-row items-center">
                                  <Phone size={9} color="#34D399" />
                                  <Text className="text-emerald-400 text-[10px] font-medium ml-1">
                                    {item.client_phone}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          </Pressable>
                        ))}
                      </ScrollView>

                      <View className="px-3 py-1 bg-slate-950/90">
                        <Text className="text-slate-500 text-[9px] text-center">
                          💡 Klik nama klien untuk auto-fill No. HP & Proyek
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Badge Jika Terhubung ke Kartu Board */}
                  {selectedCardId && (
                    <View className="flex-row items-center mt-1.5 bg-sky-950/60 border border-sky-800/80 px-2 py-1 rounded-lg">
                      <Link size={11} color="#38BDF8" />
                      <Text className="text-sky-300 text-[10px] ml-1 flex-1 font-medium" numberOfLines={1}>
                        Terhubung: {selectedCardTitle || 'Order Board Card'}
                      </Text>
                      <Pressable
                        onPress={() => {
                          setSelectedCardId(null);
                          setSelectedCardTitle(null);
                        }}
                        className="ml-1 px-1"
                      >
                        <Text className="text-slate-400 text-[10px]">✕</Text>
                      </Pressable>
                    </View>
                  )}
                </View>

                {/* No HP Klien */}
                <View className="w-full md:w-1/3 px-2 mb-3">
                  <Text className="text-slate-300 text-xs font-semibold mb-1">
                    No. HP / WA Klien
                  </Text>
                  <TextInput
                    value={clientPhone}
                    onChangeText={(t) => setClientPhone(t.replace(/[^0-9]/g, ''))}
                    keyboardType="phone-pad"
                    className="bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl text-xs"
                    placeholder="Contoh: 081234567890"
                    placeholderTextColor="#64748B"
                  />
                </View>

                {/* Kota Klien */}
                <View className="w-full md:w-1/3 px-2 mb-3">
                  <Text className="text-slate-300 text-xs font-semibold mb-1">Kota Klien</Text>
                  <TextInput
                    value={clientCity}
                    onChangeText={setClientCity}
                    className="bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl text-xs"
                    placeholder="Yogyakarta"
                    placeholderTextColor="#64748B"
                  />
                </View>

                {/* Judul Proyek */}
                <View className="w-full md:w-2/3 px-2 mb-3">
                  <Text className="text-slate-300 text-xs font-semibold mb-1">
                    Judul Pekerjaan / Proyek <Text className="text-rose-400">*</Text>
                  </Text>
                  <TextInput
                    value={projectTitle}
                    onChangeText={setProjectTitle}
                    className="bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl text-xs"
                    placeholder="Contoh: Interior Kamar Utama & Kitchen Set"
                    placeholderTextColor="#64748B"
                  />
                </View>
              </View>
            </View>

            {/* SEKSI 2: KETENTUAN, DURASI & MARKETING SIGNATURE */}
            <View className="mb-6 bg-slate-950/80 border border-slate-800/80 p-4 rounded-xl">
              <Text className="text-sky-400 font-bold text-xs uppercase tracking-wider mb-3">
                2. SYARAT, DURASI & PENANDATANGAN
              </Text>

              <View className="flex-row flex-wrap -mx-2">
                {/* Waktu Pengerjaan */}
                <View className="w-1/2 md:w-1/4 px-2 mb-3">
                  <Text className="text-slate-300 text-xs font-semibold mb-1">
                    Durasi Pengerjaan (Hari Kerja)
                  </Text>
                  <TextInput
                    value={workDuration}
                    onChangeText={(t) => setWorkDuration(t.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    className="bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl text-xs"
                    placeholder="20"
                    placeholderTextColor="#64748B"
                  />
                </View>

                {/* Masa Berlaku */}
                <View className="w-1/2 md:w-1/4 px-2 mb-3">
                  <Text className="text-slate-300 text-xs font-semibold mb-1">
                    Masa Berlaku (Hari Kalender)
                  </Text>
                  <TextInput
                    value={validityDays}
                    onChangeText={(t) => setValidityDays(t.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    className="bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl text-xs"
                    placeholder="20"
                    placeholderTextColor="#64748B"
                  />
                </View>

                {/* Signature Marketing */}
                <View className="w-full md:w-2/4 px-2 mb-3">
                  <Text className="text-slate-300 text-xs font-semibold mb-1">
                    Nama Marketing (Penanda Tangan Surat)
                  </Text>
                  <TextInput
                    value={marketingName}
                    onChangeText={setMarketingName}
                    className="bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl text-xs"
                    placeholder="Marketing Alora"
                    placeholderTextColor="#64748B"
                  />
                  <Text className="text-slate-500 text-[10px] mt-1">
                    Jabatan resmi otomatis tercetak sebagai: Marketing Alora
                  </Text>
                </View>
              </View>

              {/* Status Surat */}
              <View className="mt-2">
                <Text className="text-slate-300 text-xs font-semibold mb-2">Status Dokumen:</Text>
                <View className="flex-row flex-wrap gap-2">
                  {(['draft', 'sent', 'approved', 'rejected'] as const).map((st) => {
                    const isSelected = status === st;
                    const labels: Record<string, string> = {
                      draft: 'Draft',
                      sent: 'Terkirim ke Klien',
                      approved: 'Disetujui Klien',
                      rejected: 'Ditolak / Batal',
                    };
                    return (
                      <Pressable
                        key={st}
                        onPress={() => setStatus(st)}
                        className={`px-3 py-1.5 rounded-lg border ${isSelected
                          ? 'bg-blue-600/30 border-blue-500'
                          : 'bg-slate-900 border-slate-700'
                          }`}
                      >
                        <Text
                          className={`text-xs ${isSelected ? 'text-blue-300 font-bold' : 'text-slate-400'
                            }`}
                        >
                          {labels[st]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* SEKSI 3: RINCIAN PENAWARAN & SPESIFIKASI */}
            <View className="mb-6 bg-slate-950/80 border border-slate-800/80 p-4 rounded-xl">
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-sky-400 font-bold text-xs uppercase tracking-wider">
                    3. RINCIAN PENAWARAN & SPESIFIKASI
                  </Text>
                  <Text className="text-slate-400 text-[11px] mt-0.5">
                    Pilih jenis item (Kitchen Set / Lainnya) dan tentukan spesifikasi teknis
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <Pressable
                    onPress={() => handleAddItem('kitchen_set')}
                    className="flex-row items-center bg-blue-600/25 border border-blue-500/50 px-3 py-1.5 rounded-xl mr-2"
                  >
                    <Plus size={13} color="#38BDF8" />
                    <Text className="text-sky-300 text-xs font-semibold ml-1">Kitchen Set</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleAddItem('other')}
                    className="flex-row items-center bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl"
                  >
                    <Plus size={13} color="#CBD5E1" />
                    <Text className="text-slate-300 text-xs font-semibold ml-1">Lainnya</Text>
                  </Pressable>
                </View>
              </View>

              {/* List Item Form */}
              {items.map((item, index) => (
                <View
                  key={index}
                  className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl mb-3.5 relative"
                >
                  {/* Item Header, Jenis Item Selector & Delete */}
                  <View className="flex-row flex-wrap items-center justify-between mb-3 pb-2.5 border-b border-slate-800 gap-2">
                    <View className="flex-row items-center flex-wrap gap-2">
                      <Text className="text-amber-400 font-bold text-xs">
                        Item #{item.item_no}
                      </Text>

                      {/* Selector Jenis Item: Kitchen Set vs Lainnya */}
                      <View className="flex-row bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                        <Pressable
                          onPress={() => handleToggleItemType(index, 'kitchen_set')}
                          className={`px-2.5 py-1 rounded-md flex-row items-center ${item.item_type === 'kitchen_set'
                            ? 'bg-blue-600 shadow'
                            : 'bg-transparent'
                            }`}
                        >
                          <Text
                            className={`text-[10px] font-bold ${item.item_type === 'kitchen_set' ? 'text-white' : 'text-slate-400'
                              }`}
                          >
                            🍳 Kitchen Set
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => handleToggleItemType(index, 'other')}
                          className={`px-2.5 py-1 rounded-md flex-row items-center ${item.item_type === 'other'
                            ? 'bg-blue-600 shadow'
                            : 'bg-transparent'
                            }`}
                        >
                          <Text
                            className={`text-[10px] font-bold ${item.item_type === 'other' ? 'text-white' : 'text-slate-400'
                              }`}
                          >
                            📦 Lainnya
                          </Text>
                        </Pressable>
                      </View>
                    </View>

                    {items.length > 1 && (
                      <Pressable
                        onPress={() => handleRemoveItem(index)}
                        className="flex-row items-center bg-rose-950/60 border border-rose-800/60 px-2.5 py-1 rounded-lg"
                      >
                        <Trash2 size={12} color="#F87171" />
                        <Text className="text-rose-400 text-[11px] font-medium ml-1">Hapus</Text>
                      </Pressable>
                    )}
                  </View>

                  {/* Deskripsi Pekerjaan */}
                  <View className="mb-3">
                    <Text className="text-slate-300 text-xs font-semibold mb-1">
                      Deskripsi Pekerjaan <Text className="text-rose-400">*</Text>
                    </Text>
                    <TextInput
                      value={item.description}
                      onChangeText={(t) => handleUpdateItem(index, 'description', t)}
                      className="bg-slate-950 border border-slate-700 text-white p-2.5 rounded-xl text-xs"
                      placeholder={
                        item.item_type === 'kitchen_set'
                          ? 'Contoh: KABINET ATAS & PINTU FRAME / KABINET BAWAH'
                          : 'Contoh: Downlight, LED Strip, Rak Piring, Rak Bumbu'
                      }
                      placeholderTextColor="#64748B"
                    />
                  </View>

                  {/* Spesifikasi Teknis: Hanya muncul jika item_type === 'kitchen_set' */}
                  {item.item_type === 'kitchen_set' ? (
                    <View className="mb-3 bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
                      <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-sky-400 text-[10px] font-bold uppercase tracking-wider">
                          Spesifikasi Teknis Kitchen Set
                        </Text>
                        <Text className="text-slate-500 text-[9px]">
                          Pilih chip atau tombol dropdown untuk mengisi opsi
                        </Text>
                      </View>

                      <View className="flex-row flex-wrap -mx-1.5">
                        {/* Bahan */}
                        <SpecFieldWithDropdown
                          label="Bahan"
                          value={item.material || ''}
                          placeholder="PVC board / Blockboard..."
                          options={SPEC_SUGGESTIONS.material}
                          onChange={(val) => handleUpdateItem(index, 'material', val)}
                        />

                        {/* Finishing */}
                        <SpecFieldWithDropdown
                          label="Finishing"
                          value={item.finishing || ''}
                          placeholder="Cat Duco / HPL..."
                          options={SPEC_SUGGESTIONS.finishing}
                          onChange={(val) => handleUpdateItem(index, 'finishing', val)}
                        />

                        {/* Aksesoris */}
                        <SpecFieldWithDropdown
                          label="Aksesoris"
                          value={item.accessories || ''}
                          placeholder="Engsel soft close, Rel Tandem..."
                          options={SPEC_SUGGESTIONS.accessories}
                          isMultiSelect
                          onChange={(val) => handleUpdateItem(index, 'accessories', val)}
                        />

                        {/* Dimensi */}
                        <View className="w-full md:w-1/4 px-1.5 mb-2.5">
                          <Text className="text-slate-400 text-[11px] font-medium mb-1">Dimensi</Text>
                          <TextInput
                            value={item.dimensions || ''}
                            onChangeText={(t) => handleUpdateItem(index, 'dimensions', t)}
                            className="bg-slate-950 border border-slate-800 text-white p-2 rounded-xl text-xs"
                            placeholder="1,44 m / P 240 x L 60 x T 220 cm"
                            placeholderTextColor="#64748B"
                          />
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View className="mb-3 px-3 py-2 bg-slate-950/50 border border-dashed border-slate-800 rounded-xl">
                      <Text className="text-slate-500 text-[10px]">
                        ℹ️ Item Lainnya: Kolom spesifikasi (Bahan, Finishing, Aksesoris, Dimensi) disembunyikan.
                      </Text>
                    </View>
                  )}

                  {/* Volume, Satuan, Harga Satuan & Subtotal Item */}
                  <View className="flex-row flex-wrap items-center -mx-1.5 pt-2 border-t border-slate-800/80">
                    <View className="w-1/4 px-1.5">
                      <Text className="text-slate-400 text-[11px] mb-1">Volume</Text>
                      <TextInput
                        value={String(item.quantity || '')}
                        onChangeText={(t) =>
                          handleUpdateItem(index, 'quantity', t.replace(/[^0-9.]/g, ''))
                        }
                        keyboardType="numeric"
                        className="bg-slate-950 border border-slate-800 text-white p-2 rounded-xl text-xs text-center font-bold"
                        placeholder="1"
                        placeholderTextColor="#64748B"
                      />
                    </View>

                    {/* Satuan: SET & locked khusus Kitchen Set */}
                    <View className="w-1/4 px-1.5">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-slate-400 text-[11px]">Satuan</Text>
                        {item.item_type === 'kitchen_set' && (
                          <Text className="text-amber-400 text-[9px] font-bold">🔒 Terkunci</Text>
                        )}
                      </View>
                      <TextInput
                        value={item.item_type === 'kitchen_set' ? 'SET' : item.unit}
                        editable={item.item_type !== 'kitchen_set'}
                        onChangeText={(t) => handleUpdateItem(index, 'unit', t)}
                        className={`border text-xs text-center font-semibold p-2 rounded-xl ${item.item_type === 'kitchen_set'
                          ? 'bg-slate-900 border-slate-800 text-slate-400 opacity-90'
                          : 'bg-slate-950 border-slate-800 text-white'
                          }`}
                        placeholder="SET / PCS / M1"
                        placeholderTextColor="#64748B"
                      />
                    </View>

                    <View className="w-2/4 px-1.5">
                      <Text className="text-slate-400 text-[11px] mb-1">Harga Satuan (Rp)</Text>
                      <TextInput
                        value={String(item.unit_price || '')}
                        onChangeText={(t) =>
                          handleUpdateItem(index, 'unit_price', t.replace(/[^0-9]/g, ''))
                        }
                        keyboardType="numeric"
                        className="bg-slate-950 border border-slate-800 text-emerald-400 p-2 rounded-xl text-xs font-bold"
                        placeholder="0"
                        placeholderTextColor="#64748B"
                      />
                    </View>

                    {/* Total Harga Item */}
                    <View className="w-full px-1.5 mt-2 flex-row justify-between items-center bg-slate-950/70 p-2 rounded-lg">
                      <Text className="text-slate-400 text-[11px]">Jumlah Harga Item #{item.item_no}:</Text>
                      <Text className="text-emerald-400 font-bold text-xs">
                        {formatRupiah(item.amount)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}

              {/* Tombol Tambah Item di Akhir Daftar (End of Items) */}
              <View className="flex-row items-center justify-start mt-1 mb-2">
                <Pressable
                  onPress={() => handleAddItem('kitchen_set')}
                  className="flex-row items-center bg-blue-600/25 border border-blue-500/50 px-3.5 py-2 rounded-xl mr-2.5 shadow-sm"
                >
                  <Plus size={14} color="#38BDF8" />
                  <Text className="text-sky-300 text-xs font-semibold ml-1.5">Kitchen Set</Text>
                </Pressable>

                <Pressable
                  onPress={() => handleAddItem('other')}
                  className="flex-row items-center bg-slate-800 border border-slate-700 px-3.5 py-2 rounded-xl shadow-sm"
                >
                  <Plus size={14} color="#CBD5E1" />
                  <Text className="text-slate-300 text-xs font-semibold ml-1.5">Lainnya</Text>
                </Pressable>
              </View>

              {/* Total & Terbilang Ringkasan Box */}
              <View className="mt-4 p-4 rounded-xl bg-slate-900 border border-emerald-900/60 shadow-lg">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-slate-300 font-bold text-xs uppercase">
                    TOTAL NILAI PENAWARAN:
                  </Text>
                  <Text className="text-emerald-400 font-black text-lg">
                    {formatRupiah(subtotal)}
                  </Text>
                </View>
                <Text className="text-slate-400 text-xs italic">
                  "{terbilangText}"
                </Text>
              </View>
            </View>

            {/* SEKSI 4: CATATAN TAMBAHAN */}
            <View className="mb-6 bg-slate-950/80 border border-slate-800/80 p-4 rounded-xl">
              <Text className="text-slate-300 text-xs font-semibold mb-1">
                Catatan Internal / Keterangan Khusus (Opsional)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={2}
                className="bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl text-xs"
                placeholder="Catatan tambahan untuk tim Alora Studio..."
                placeholderTextColor="#64748B"
              />
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View className="flex-row items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950">
            {onPreview ? (
              <Pressable
                onPress={handleOpenPreview}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700"
              >
                <Text className="text-sky-300 font-semibold text-xs">👁️ Preview PDF</Text>
              </Pressable>
            ) : (
              <View />
            )}

            <View className="flex-row space-x-2">
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
                    {quotation ? 'Simpan Perubahan' : 'Terbitkan Surat Penawaran'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
