import { DatePickerField } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import {
  DEFAULT_INVOICE_TERMS,
  Invoice,
  InvoiceItem,
  SaveInvoicePayload,
  invoiceService
} from '@/services/invoiceService';
import { Quotation, quotationService } from '@/services/quotationService';
import { useAppSelector } from '@/store/hooks';
import { formatRupiah, terbilang } from '@/utils/terbilang';
import * as Clipboard from 'expo-clipboard';
import {
  Check,
  Copy,
  FileSpreadsheet,
  FileText,
  Plus,
  RefreshCw,
  Trash2,
  X
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
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

interface ClientSuggestion {
  id: string;
  client_name: string;
  client_phone?: string | null;
  client_address?: string | null;
  title?: string;
}

interface InvoiceFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (payload: SaveInvoicePayload) => Promise<void>;
  invoice?: Invoice | null;
}

export function InvoiceFormModal({
  visible,
  onClose,
  onSave,
  invoice,
}: InvoiceFormModalProps) {
  const { profile } = useAppSelector((state) => state.auth);

  // Form Fields
  const [invoiceNo, setInvoiceNo] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [bankName, setBankName] = useState('Bank Mandiri');
  const [bankAccountNo, setBankAccountNo] = useState('1370026994893');
  const [bankAccountHolder, setBankAccountHolder] = useState('M.LAFRAN PANE');
  const [authorizedBy, setAuthorizedBy] = useState('M Lafran Pane');
  const [notes, setNotes] = useState('');
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Items
  const [items, setItems] = useState<Omit<InvoiceItem, 'id' | 'invoice_id'>[]>([
    {
      item_no: 1,
      description: '',
      quantity: 1,
      unit: 'SET',
      unit_price: 0,
      amount: 0,
    },
  ]);

  // Client Search & Suggestions
  const [clientSuggestions, setClientSuggestions] = useState<ClientSuggestion[]>([]);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const isSelectingRef = useRef(false);
  const isUserTypingClientRef = useRef(false);
  const wasVisibleRef = useRef(false);
  const currentInvoiceIdRef = useRef<string | null | undefined>(undefined);

  // Quotation Import Selector
  const [showQuotationPicker, setShowQuotationPicker] = useState(false);
  const [availableQuotations, setAvailableQuotations] = useState<Quotation[]>([]);
  const [isLoadingQuotations, setIsLoadingQuotations] = useState(false);
  const [copiedBankInfo, setCopiedBankInfo] = useState(false);

  const handleCopyBankInfo = async () => {
    const textToCopy = `${bankName}\n${bankAccountNo}\n${bankAccountHolder}`;
    try {
      await Clipboard.setStringAsync(textToCopy);
    } catch {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(textToCopy);
      }
    }
    setCopiedBankInfo(true);
    setTimeout(() => setCopiedBankInfo(false), 2000);
  };

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Inisialisasi form saat modal terbuka
  useEffect(() => {
    const isOpening = !wasVisibleRef.current && visible;
    const isInvoiceChanged = visible && invoice?.id !== currentInvoiceIdRef.current;

    if (!visible) {
      wasVisibleRef.current = false;
      currentInvoiceIdRef.current = undefined;
      return;
    }

    if (isOpening || isInvoiceChanged) {
      wasVisibleRef.current = true;
      currentInvoiceIdRef.current = invoice?.id;

      if (invoice) {
        // Mode Edit
        setInvoiceNo(invoice.invoice_no);
        setIssueDate(invoice.issue_date || new Date().toISOString().split('T')[0]);
        setDueDate(invoice.due_date || '');
        setClientName(invoice.client_name);
        setClientPhone(invoice.client_phone || '');
        setClientAddress(invoice.client_address || '');
        setBankName(invoice.bank_name || 'Bank Mandiri');
        setBankAccountNo(invoice.bank_account_no || '1370026994893');
        setBankAccountHolder(invoice.bank_account_holder || 'M.LAFRAN PANE');
        setAuthorizedBy(invoice.authorized_by || 'M Lafran Pane');
        setNotes(invoice.notes || '');
        setSelectedQuotationId(invoice.quotation_id || null);
        setSelectedCardId(invoice.card_id || null);

        if (invoice.invoice_items && invoice.invoice_items.length > 0) {
          setItems(
            invoice.invoice_items.map((it) => ({
              item_no: it.item_no,
              description: it.description,
              quantity: it.quantity,
              unit: it.unit,
              unit_price: it.unit_price,
              amount: it.amount,
            }))
          );
        } else {
          setItems([
            {
              item_no: 1,
              description: '',
              quantity: 1,
              unit: 'SET',
              unit_price: 0,
              amount: 0,
            },
          ]);
        }
      } else {
        // Mode Buat Baru
        setIssueDate(new Date().toISOString().split('T')[0]);
        // Default jatuh tempo 14 hari
        const d = new Date();
        d.setDate(d.getDate() + 14);
        setDueDate(d.toISOString().split('T')[0]);
        setClientName('');
        setClientPhone('');
        setClientAddress('');
        setBankName('Bank Mandiri');
        setBankAccountNo('1370026994893');
        setBankAccountHolder('M.LAFRAN PANE');
        setAuthorizedBy(profile?.full_name || 'M Lafran Pane');
        setNotes('');
        setSelectedQuotationId(null);
        setSelectedCardId(null);

        setItems([
          {
            item_no: 1,
            description: '',
            quantity: 1,
            unit: 'SET',
            unit_price: 0,
            amount: 0,
          },
        ]);

        // Auto-generate invoice number
        invoiceService.generateNextInvoiceNumber().then((no) => {
          setInvoiceNo(no);
        });
      }

      isUserTypingClientRef.current = false;
      setClientSuggestions([]);
      setShowClientDropdown(false);
      setErrorMessage(null);
    }
  }, [visible, invoice, profile]);

  // Debounce search nama klien di board_cards
  useEffect(() => {
    if (!visible || isSelectingRef.current) {
      isSelectingRef.current = false;
      return;
    }

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
      setIsSearchingClient(true);
      try {
        const { data, error } = await supabase
          .from('board_cards')
          .select('id, client_name, client_phone, client_address, title')
          .ilike('client_name', `%${query}%`)
          .order('created_at', { ascending: false })
          .limit(6);

        if (!error && data && data.length > 0) {
          setClientSuggestions(data as ClientSuggestion[]);
          setShowClientDropdown(true);
        } else {
          setClientSuggestions([]);
          setShowClientDropdown(false);
        }
      } catch {
        setClientSuggestions([]);
        setShowClientDropdown(false);
      } finally {
        setIsSearchingClient(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [clientName, visible]);

  // Handler memilih klien dari autocomplete
  const handleSelectClient = (item: ClientSuggestion) => {
    isSelectingRef.current = true;
    isUserTypingClientRef.current = false;
    setClientName(item.client_name);

    if (item.client_phone) {
      setClientPhone(item.client_phone);
    }
    if (item.client_address) {
      setClientAddress(item.client_address);
    }
    setSelectedCardId(item.id);
    setShowClientDropdown(false);
  };

  // Muat daftar penawaran saat modal picker dibuka
  const handleOpenQuotationPicker = async () => {
    setShowQuotationPicker(true);
    setIsLoadingQuotations(true);
    try {
      const qList = await quotationService.getQuotations();
      setAvailableQuotations(qList);
    } catch (err) {
      console.warn('Gagal memuat surat penawaran:', err);
    } finally {
      setIsLoadingQuotations(false);
    }
  };

  // Import data dari Surat Penawaran terpilih
  const handleSelectQuotationToImport = (q: Quotation) => {
    setSelectedQuotationId(q.id);
    setSelectedCardId(q.card_id || null);
    setClientName(q.client_name);
    if (q.client_phone) setClientPhone(q.client_phone);
    if (q.client_city) setClientAddress(q.client_city);
    setNotes(`Diterbitkan dari Surat Penawaran No. ${q.quotation_no} (${q.project_title})`);

    if (q.quotation_items && q.quotation_items.length > 0) {
      setItems(
        q.quotation_items.map((it, idx) => ({
          item_no: idx + 1,
          description: it.description,
          quantity: Number(it.quantity || 1),
          unit: it.unit || 'SET',
          unit_price: Number(it.unit_price || 0),
          amount: Number(it.amount || 0),
        }))
      );
    }

    setShowQuotationPicker(false);
  };

  // Item Handlers
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        item_no: prev.length + 1,
        description: '',
        quantity: 1,
        unit: 'SET',
        unit_price: 0,
        amount: 0,
      },
    ]);
  };

  const handleUpdateItem = (
    index: number,
    field: keyof Omit<InvoiceItem, 'id' | 'invoice_id'>,
    value: any
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      if (field === 'quantity' || field === 'unit_price') {
        const qty = field === 'quantity' ? Number(value || 0) : item.quantity;
        const price = field === 'unit_price' ? Number(value || 0) : item.unit_price;
        item.amount = qty * price;
      }

      updated[index] = item;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      Alert.alert('Perhatian', 'Invoice minimal memiliki 1 item.');
      return;
    }
    setItems((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((it, i) => ({ ...it, item_no: i + 1 }))
    );
  };

  // Kalkulasi Total
  const subtotal = useMemo(() => {
    return items.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [items]);

  const terbilangText = useMemo(() => {
    return terbilang(subtotal);
  }, [subtotal]);

  // Handler Simpan
  const handleSave = async () => {
    if (!invoiceNo.trim()) {
      setErrorMessage('Nomor Invoice wajib diisi.');
      return;
    }
    if (!clientName.trim()) {
      setErrorMessage('Nama Klien wajib diisi.');
      return;
    }
    if (items.length === 0) {
      setErrorMessage('Minimal harus ada 1 item penagihan.');
      return;
    }

    const invalidItem = items.find((it) => !it.description.trim());
    if (invalidItem) {
      setErrorMessage(`Deskripsi item #${invalidItem.item_no} belum diisi.`);
      return;
    }

    // Validasi Tanggal Terbit <= Jatuh Tempo
    if (dueDate.trim() && issueDate > dueDate.trim()) {
      setErrorMessage(
        'Tanggal Terbit tidak boleh melewati Tanggal Jatuh Tempo (Tanggal Terbit ≤ Jatuh Tempo).'
      );
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const payload: SaveInvoicePayload = {
        invoice_no: invoiceNo.trim(),
        client_name: clientName.trim(),
        client_phone: clientPhone.trim() || null,
        client_address: clientAddress.trim() || null,
        issue_date: issueDate,
        due_date: dueDate.trim() || null,
        quotation_id: selectedQuotationId,
        card_id: selectedCardId,
        bank_name: bankName.trim(),
        bank_account_no: bankAccountNo.trim(),
        bank_account_holder: bankAccountHolder.trim(),
        authorized_by: authorizedBy.trim(),
        notes: notes.trim() || null,
        terms: DEFAULT_INVOICE_TERMS,
        items,
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan invoice.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/75 justify-center items-center p-3 md:p-6">
        <View className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[92%] rounded-2xl overflow-hidden shadow-2xl flex-col">
          {/* Header Modal */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950">
            <View className="flex-row items-center space-x-2">
              <View className="w-8 h-8 rounded-lg bg-sky-500/10 items-center justify-center mr-2">
                <FileText size={18} color="#38BDF8" />
              </View>
              <View>
                <Text className="text-white font-bold text-base">
                  {invoice ? 'Edit Invoice Penagihan' : 'Buat Invoice Baru'}
                </Text>
                <Text className="text-slate-400 text-xs">
                  Format Resmi Alora Studio (INV-015)
                </Text>
              </View>
            </View>

            <View className="flex-row items-center space-x-2">
              {/* Tombol Import Penawaran */}
              {!invoice && (
                <Pressable
                  onPress={handleOpenQuotationPicker}
                  className="flex-row items-center bg-blue-600/20 border border-blue-500/40 px-3 py-1.5 rounded-xl mr-2"
                >
                  <FileSpreadsheet size={13} color="#38BDF8" />
                  <Text className="text-sky-300 text-xs font-semibold ml-1.5">
                    Import dari Surat Penawaran
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={onClose}
                className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center"
              >
                <X size={16} color="#94A3B8" />
              </Pressable>
            </View>
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <View className="bg-rose-500/15 border-b border-rose-500/30 px-5 py-2.5 flex-row items-center justify-between">
              <Text className="text-rose-300 text-xs flex-1">{errorMessage}</Text>
              <Pressable onPress={() => setErrorMessage(null)}>
                <X size={14} color="#FDA4AF" />
              </Pressable>
            </View>
          )}

          {/* Form Body Scrollable */}
          <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
            {/* SEKSI 1: METADATA INVOICE */}
            <View className="mb-5 bg-slate-950/80 border border-slate-800/80 p-4 rounded-xl">
              <Text className="text-sky-400 font-bold text-xs uppercase tracking-wider mb-3">
                1. Metadata Tagihan
              </Text>

              <View className="flex-row flex-wrap -mx-2">
                <View className="w-full md:w-1/3 px-2 mb-3">
                  <Text className="text-slate-300 text-xs font-semibold mb-1">
                    Nomor Invoice <Text className="text-rose-400">*</Text>
                  </Text>
                  <View className="flex-row items-center">
                    <TextInput
                      value={invoiceNo}
                      onChangeText={setInvoiceNo}
                      className="flex-1 bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl text-xs font-mono"
                      placeholder="INV-015"
                      placeholderTextColor="#64748B"
                    />
                    {!invoice && (
                      <Pressable
                        onPress={async () => {
                          const no = await invoiceService.generateNextInvoiceNumber();
                          setInvoiceNo(no);
                        }}
                        className="ml-2 p-2.5 bg-slate-800 border border-slate-700 rounded-xl"
                      >
                        <RefreshCw size={14} color="#38BDF8" />
                      </Pressable>
                    )}
                  </View>
                </View>

                <View className="w-full md:w-1/3 px-2 mb-3">
                  <DatePickerField
                    label="Tanggal Terbit"
                    required
                    value={issueDate}
                    onChange={(newDate) => {
                      setIssueDate(newDate);
                      if (dueDate && dueDate < newDate) {
                        setDueDate(newDate);
                      }
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Pilih tanggal terbit..."
                  />
                </View>

                <View className="w-full md:w-1/3 px-2 mb-3">
                  <DatePickerField
                    label="Jatuh Tempo (Due Date)"
                    value={dueDate}
                    minDate={issueDate}
                    onChange={(newDate) => {
                      setDueDate(newDate);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Pilih tanggal jatuh tempo..."
                    allowClear
                  />
                </View>
              </View>
            </View>

            {/* SEKSI 2: INFORMASI KLIEN (BILL TO) */}
            <View className="mb-5 bg-slate-950/80 border border-slate-800/80 p-4 rounded-xl">
              <Text className="text-sky-400 font-bold text-xs uppercase tracking-wider mb-3">
                2. Ditujukan Kepada (Bill To)
              </Text>

              <View className="flex-row flex-wrap -mx-2">
                {/* Nama Klien dengan Auto Search */}
                <View className="w-full md:w-1/3 px-2 mb-3 relative">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-slate-300 text-xs font-semibold">
                      Nama Klien <Text className="text-rose-400">*</Text>
                    </Text>
                    {isSearchingClient && (
                      <ActivityIndicator size="small" color="#38BDF8" />
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

                  {/* Dropdown Suggestions */}
                  {showClientDropdown && clientSuggestions.length > 0 && (
                    <View className="absolute top-[60px] left-2 right-2 bg-slate-900 border border-sky-500/40 rounded-xl z-50 shadow-2xl overflow-hidden">
                      <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
                        {clientSuggestions.map((item) => (
                          <Pressable
                            key={item.id}
                            onPress={() => handleSelectClient(item)}
                            className="p-2.5 border-b border-slate-800/80 hover:bg-slate-800 active:bg-slate-800"
                          >
                            <Text className="text-white text-xs font-bold">
                              {item.client_name}
                            </Text>
                            <Text className="text-slate-400 text-[10px]">
                              {item.title} {item.client_address ? `• ${item.client_address}` : ''}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* No Telepon */}
                <View className="w-full md:w-1/3 px-2 mb-3">
                  <Text className="text-slate-300 text-xs font-semibold mb-1">
                    No. WhatsApp / HP
                  </Text>
                  <TextInput
                    value={clientPhone}
                    onChangeText={setClientPhone}
                    keyboardType="phone-pad"
                    className="bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl text-xs"
                    placeholder="081234567890"
                    placeholderTextColor="#64748B"
                  />
                </View>

                {/* Alamat Klien */}
                <View className="w-full md:w-1/3 px-2 mb-3">
                  <Text className="text-slate-300 text-xs font-semibold mb-1">
                    Alamat / Wilayah Proyek
                  </Text>
                  <TextInput
                    value={clientAddress}
                    onChangeText={setClientAddress}
                    className="bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl text-xs"
                    placeholder="Contoh: Pleret, Bantul"
                    placeholderTextColor="#64748B"
                  />
                </View>
              </View>
            </View>

            {/* SEKSI 3: RINCIAN ITEM TAGIHAN */}
            <View className="mb-5 bg-slate-950/80 border border-slate-800/80 p-4 rounded-xl">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-sky-400 font-bold text-xs uppercase tracking-wider">
                  3. Rincian Item Tagihan
                </Text>
                <Pressable
                  onPress={handleAddItem}
                  className="flex-row items-center bg-blue-600/25 border border-blue-500/50 px-3 py-1.5 rounded-xl"
                >
                  <Plus size={13} color="#38BDF8" />
                  <Text className="text-sky-300 text-xs font-semibold ml-1">Tambah Item</Text>
                </Pressable>
              </View>

              {/* Items List */}
              {items.map((item, index) => (
                <View
                  key={index}
                  className="bg-slate-900 border border-slate-800 p-3 rounded-xl mb-3"
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-slate-300 font-bold text-xs">
                      Item #{item.item_no}
                    </Text>
                    {items.length > 1 && (
                      <Pressable
                        onPress={() => handleRemoveItem(index)}
                        className="p-1 rounded hover:bg-rose-500/20"
                      >
                        <Trash2 size={14} color="#FB7185" />
                      </Pressable>
                    )}
                  </View>

                  <View className="flex-row flex-wrap -mx-1.5">
                    <View className="w-full md:w-2/5 px-1.5 mb-2">
                      <Text className="text-slate-400 text-[11px] mb-1">Deskripsi Pekerjaan</Text>
                      <TextInput
                        value={item.description}
                        onChangeText={(t) => handleUpdateItem(index, 'description', t)}
                        className="bg-slate-950 border border-slate-800 text-white p-2 rounded-xl text-xs"
                        placeholder="Contoh: Kitchen Set Kabinet Bawah"
                        placeholderTextColor="#64748B"
                      />
                    </View>

                    <View className="w-1/4 md:w-1/5 px-1.5 mb-2">
                      <Text className="text-slate-400 text-[11px] mb-1">Qty</Text>
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

                    <View className="w-1/4 md:w-1/5 px-1.5 mb-2">
                      <Text className="text-slate-400 text-[11px] mb-1">Satuan</Text>
                      <TextInput
                        value={item.unit}
                        onChangeText={(t) => handleUpdateItem(index, 'unit', t)}
                        className="bg-slate-950 border border-slate-800 text-white p-2 rounded-xl text-xs text-center"
                        placeholder="SET / PCS"
                        placeholderTextColor="#64748B"
                      />
                    </View>

                    <View className="w-2/4 md:w-1/5 px-1.5 mb-2">
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

                    <View className="w-full px-1.5 mt-1 flex-row justify-between items-center bg-slate-950/70 p-2 rounded-lg">
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
                  onPress={handleAddItem}
                  className="flex-row items-center bg-blue-600/25 border border-blue-500/50 px-3.5 py-2 rounded-xl shadow-sm"
                >
                  <Plus size={14} color="#38BDF8" />
                  <Text className="text-sky-300 text-xs font-semibold ml-1.5">Tambah Item Lain</Text>
                </Pressable>
              </View>

              {/* Ringkasan Total Box */}
              <View className="mt-3 p-4 rounded-xl bg-slate-900 border border-emerald-900/60 shadow-lg">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-slate-300 font-bold text-xs uppercase">
                    TOTAL TAGIHAN INVOICE:
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

            {/* SEKSI 4: REKENING & PENGESAHAN */}
            <View className="mb-5 bg-slate-950/80 border border-slate-800/80 p-4 rounded-xl">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-sky-400 font-bold text-xs uppercase tracking-wider">
                  4. Instruksi Pembayaran Bank & Pengesahan
                </Text>

                <Pressable
                  onPress={handleCopyBankInfo}
                  className={`flex-row items-center px-3 py-1.5 rounded-xl border ${
                    copiedBankInfo
                      ? 'bg-emerald-600/30 border-emerald-500'
                      : 'bg-slate-900 border-slate-700 hover:border-sky-500/50'
                  }`}
                >
                  {copiedBankInfo ? (
                    <>
                      <Check size={13} color="#34D399" />
                      <Text className="text-emerald-300 text-xs font-semibold ml-1.5">
                        Tersalin!
                      </Text>
                    </>
                  ) : (
                    <>
                      <Copy size={13} color="#38BDF8" />
                      <Text className="text-sky-300 text-xs font-semibold ml-1.5">
                        Salin Rekening
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>

              <View className="flex-row flex-wrap -mx-2">
                <View className="w-full md:w-1/3 px-2 mb-3">
                  <Text className="text-slate-400 text-[11px] mb-1">Nama Bank</Text>
                  <View className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl justify-center">
                    <Text className="text-white text-xs font-bold">{bankName}</Text>
                  </View>
                </View>

                <View className="w-full md:w-1/3 px-2 mb-3">
                  <Text className="text-slate-400 text-[11px] mb-1">Nomor Rekening</Text>
                  <View className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl justify-center">
                    <Text className="text-emerald-400 font-mono text-xs font-bold tracking-wider">
                      {bankAccountNo}
                    </Text>
                  </View>
                </View>

                <View className="w-full md:w-1/3 px-2 mb-3">
                  <Text className="text-slate-400 text-[11px] mb-1">Atas Nama Rekening</Text>
                  <View className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl justify-center">
                    <Text className="text-slate-200 text-xs font-semibold">
                      {bankAccountHolder}
                    </Text>
                  </View>
                </View>

                <View className="w-full md:w-1/2 px-2 mb-3">
                  <Text className="text-slate-400 text-[11px] mb-1">Disahkan Oleh</Text>
                  <TextInput
                    value={authorizedBy}
                    onChangeText={setAuthorizedBy}
                    className="bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl text-xs"
                    placeholder="M Lafran Pane"
                    placeholderTextColor="#64748B"
                  />
                </View>

                <View className="w-full md:w-1/2 px-2 mb-3">
                  <Text className="text-slate-400 text-[11px] mb-1">Catatan Tambahan (Opsional)</Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    className="bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl text-xs"
                    placeholder="Catatan transfer, termin, dsb."
                    placeholderTextColor="#64748B"
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer Modal Action Buttons */}
          <View className="flex-row items-center justify-end px-5 py-3.5 border-t border-slate-800 bg-slate-950">
            <Pressable
              onPress={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 mr-2.5"
            >
              <Text className="text-slate-300 font-semibold text-xs">Batal</Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={saving}
              className="flex-row items-center px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 active:bg-sky-600"
            >
              {saving ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text className="text-white font-bold text-xs ml-2">Menyimpan...</Text>
                </>
              ) : (
                <Text className="text-white font-bold text-xs">
                  {invoice ? 'Simpan Perubahan' : 'Buat Invoice'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      {/* Sub-Modal: Picker Import dari Surat Penawaran */}
      {showQuotationPicker && (
        <Modal transparent animationType="fade" visible={showQuotationPicker} onRequestClose={() => setShowQuotationPicker(false)}>
          <View className="flex-1 bg-black/80 justify-center items-center p-4">
            <View className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-5 shadow-2xl">
              <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <View>
                  <Text className="text-white font-bold text-sm">Pilih Surat Penawaran</Text>
                  <Text className="text-slate-400 text-xs mt-0.5">
                    Data penawaran akan disalin otomatis ke invoice ini
                  </Text>
                </View>
                <Pressable onPress={() => setShowQuotationPicker(false)}>
                  <X size={16} color="#94A3B8" />
                </Pressable>
              </View>

              {isLoadingQuotations ? (
                <View className="py-8 items-center justify-center">
                  <ActivityIndicator size="large" color="#38BDF8" />
                  <Text className="text-slate-400 text-xs mt-2">Memuat daftar penawaran...</Text>
                </View>
              ) : availableQuotations.length === 0 ? (
                <View className="py-8 items-center justify-center">
                  <Text className="text-slate-400 text-xs">Belum ada surat penawaran tersimpan.</Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  {availableQuotations.map((q) => (
                    <Pressable
                      key={q.id}
                      onPress={() => handleSelectQuotationToImport(q)}
                      className="p-3 mb-2 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-sky-500/50 active:bg-slate-800"
                    >
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className="text-sky-400 font-bold text-xs font-mono">
                          {q.quotation_no}
                        </Text>
                        <Text className="text-emerald-400 font-bold text-xs">
                          {formatRupiah(q.total_amount)}
                        </Text>
                      </View>
                      <Text className="text-white text-xs font-semibold">{q.client_name}</Text>
                      <Text className="text-slate-400 text-[11px] mt-0.5">{q.project_title}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
}
