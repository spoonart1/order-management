import { Pagination } from '@/components/ui/Pagination';
import { confirmDialog } from '@/lib/confirm';
import { useNetworkStatus } from '@/lib/network';
import { invoiceCacheService } from '@/services/invoiceCacheService';
import { Invoice, PaymentReceipt, SaveInvoicePayload } from '@/services/invoiceService';
import { offlineQueueService } from '@/services/offlineQueueService';
import { syncService } from '@/services/syncService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createInvoice,
  deleteInvoice,
  fetchInvoices,
  optimisticDeleteInvoice,
  setInvoicesFromCache,
  updateInvoice,
} from '@/store/slices/invoiceSlice';
import { formatIndonesianDate, formatRupiah } from '@/utils/terbilang';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  HandCoins,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  User,
  Wallet,
} from 'lucide-react-native';
import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

// Lazy loading modal-modal berat agar startup render halaman cepat & ringan
const InvoiceFormModal = lazy(() =>
  import('@/components/invoice/InvoiceFormModal').then((m) => ({
    default: m.InvoiceFormModal,
  }))
);

const InvoiceDetailModal = lazy(() =>
  import('@/components/invoice/InvoiceDetailModal').then((m) => ({
    default: m.InvoiceDetailModal,
  }))
);

const PaymentRecordModal = lazy(() =>
  import('@/components/invoice/PaymentRecordModal').then((m) => ({
    default: m.PaymentRecordModal,
  }))
);

const InvoicePreviewModal = lazy(() =>
  import('@/components/invoice/InvoicePreviewModal').then((m) => ({
    default: m.InvoicePreviewModal,
  }))
);

const ReceiptPreviewModal = lazy(() =>
  import('@/components/invoice/ReceiptPreviewModal').then((m) => ({
    default: m.ReceiptPreviewModal,
  }))
);

type StatusFilter = 'all' | 'unpaid' | 'partial' | 'paid' | 'cancelled';

export default function InvoicesScreen() {
  const dispatch = useAppDispatch();
  const { invoices, isLoading } = useAppSelector((state) => state.invoice);
  const { isOnline } = useNetworkStatus();

  // Status Antrean Mutasi Offline
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  const refreshPendingCount = async () => {
    const count = await offlineQueueService.getCount();
    setPendingSyncCount(count);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');

  // Pagination State (10 item per page)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modal States
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);

  const [invoicePreviewVisible, setInvoicePreviewVisible] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  const [receiptPreviewVisible, setReceiptPreviewVisible] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState<PaymentReceipt | null>(null);
  const [previewReceiptInvoice, setPreviewReceiptInvoice] = useState<Invoice | null>(null);

  // Load invoices on mount & Instant Offline Cache First (0ms render)
  useEffect(() => {
    let isMounted = true;
    invoiceCacheService.getInvoicesCache().then((cached) => {
      if (isMounted && cached && cached.length > 0) {
        dispatch(setInvoicesFromCache(cached));
      }
    });

    refreshPendingCount();
    dispatch(fetchInvoices());

    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  // Otomatis sinkronkan antrean offline secara senyap di latar belakang saat online kembali (tanpa reload / refresh halaman)
  useEffect(() => {
    if (isOnline) {
      syncService
        .processQueue((remaining) => {
          setPendingSyncCount(remaining);
        })
        .then(() => {
          refreshPendingCount();
          if (invoices.length > 0) {
            invoiceCacheService.saveInvoicesCache(invoices);
          }
        });
    } else {
      refreshPendingCount();
    }
  }, [isOnline, invoices]);

  // Otomatis reset ke halaman 1 jika filter atau kata kunci pencarian berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter]);

  const onRefresh = async () => {
    if (isOnline) {
      await syncService.processQueue((remaining) => setPendingSyncCount(remaining));
      await refreshPendingCount();
    }
    dispatch(fetchInvoices());
  };

  // Filter & Search Logic
  const filteredInvoices = useMemo(() => {
    return invoices.filter((item) => {
      // Filter Status
      if (activeFilter !== 'all' && item.status !== activeFilter) {
        return false;
      }

      // Filter Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesNo = item.invoice_no.toLowerCase().includes(query);
        const matchesClient = item.client_name.toLowerCase().includes(query);
        const matchesAddress = item.client_address?.toLowerCase().includes(query) || false;
        return matchesNo || matchesClient || matchesAddress;
      }

      return true;
    });
  }, [invoices, activeFilter, searchQuery]);

  // Data terpaginasi (hanya 10 item untuk halaman aktif)
  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(startIndex, startIndex + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  // Statistik Ringkas Finansial
  const stats = useMemo(() => {
    const totalCount = invoices.length;
    const unpaidCount = invoices.filter((i) => i.status === 'unpaid').length;
    const partialCount = invoices.filter((i) => i.status === 'partial').length;
    const paidCount = invoices.filter((i) => i.status === 'paid').length;

    const totalBilled = invoices
      .filter((i) => i.status !== 'cancelled')
      .reduce((sum, i) => sum + (Number(i.total) || 0), 0);

    const totalPaid = invoices
      .filter((i) => i.status !== 'cancelled')
      .reduce((sum, i) => sum + (Number(i.paid_amount) || 0), 0);

    const totalBalanceDue = invoices
      .filter((i) => i.status !== 'cancelled')
      .reduce((sum, i) => sum + (Number(i.balance_due) || 0), 0);

    return {
      totalCount,
      unpaidCount,
      partialCount,
      paidCount,
      totalBilled,
      totalPaid,
      totalBalanceDue,
    };
  }, [invoices]);

  // Handler Buka Detail Invoice
  const handleOpenDetailModal = (inv: Invoice) => {
    setDetailInvoice(inv);
    setDetailModalVisible(true);
  };

  // Handler Buka Catat Pembayaran
  const handleOpenPaymentModal = (inv: Invoice) => {
    setPaymentInvoice(inv);
    setPaymentModalVisible(true);
  };

  // Handler Buka Preview / Cetak Invoice PDF
  const handleOpenInvoicePreview = (inv: Invoice) => {
    setPreviewInvoice(inv);
    setInvoicePreviewVisible(true);
  };

  // Handler Buka Preview / Cetak Kwitansi PDF
  const handleOpenReceiptPreview = (receipt: PaymentReceipt, inv: Invoice) => {
    setPreviewReceipt(receipt);
    setPreviewReceiptInvoice(inv);
    setReceiptPreviewVisible(true);
  };

  // Handler Buat Invoice Baru
  const handleOpenCreateModal = () => {
    setSelectedInvoice(null);
    setFormModalVisible(true);
  };

  // Handler Edit Invoice
  const handleOpenEditModal = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setFormModalVisible(true);
  };

  // Handler Simpan Invoice (Create / Update)
  const handleSaveInvoice = async (payload: SaveInvoicePayload) => {
    try {
      if (selectedInvoice) {
        await dispatch(updateInvoice({ id: selectedInvoice.id, payload })).unwrap();
      } else {
        await dispatch(createInvoice(payload)).unwrap();
      }
    } finally {
      refreshPendingCount();
    }
  };

  // Handler Hapus Invoice
  const handleDeleteInvoice = async (inv: Invoice) => {
    const confirmed = await confirmDialog({
      title: 'Hapus Invoice?',
      message: `Apakah Anda yakin ingin menghapus invoice ${inv.invoice_no} (${inv.client_name})? Data tagihan dan riwayat pembayaran terkait akan terhapus.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      destructive: true,
    });

    if (confirmed) {
      // Optimistic delete instan di UI lokal (0ms)
      dispatch(optimisticDeleteInvoice(inv.id));
      try {
        await dispatch(deleteInvoice(inv.id)).unwrap();
      } catch (err: any) {
        console.warn('[invoices] Delete error:', err);
      } finally {
        refreshPendingCount();
      }
    }
  };

  // Helper Badge Status
  const renderStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return (
          <View className="flex-row items-center bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-[2px]">
            <CheckCircle2 size={10} color="#059669" />
            <Text className="text-emerald-800 text-[10px] font-bold ml-1 uppercase font-mono">
              Lunas (Paid)
            </Text>
          </View>
        );
      case 'partial':
        return (
          <View className="flex-row items-center bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-[2px]">
            <Clock size={10} color="#B45309" />
            <Text className="text-amber-800 text-[10px] font-bold ml-1 uppercase font-mono">
              Sebagian (Partial)
            </Text>
          </View>
        );
      case 'cancelled':
        return (
          <View className="flex-row items-center bg-[#FAF8F5] border border-[#DDD6C8] px-2 py-0.5 rounded-[2px]">
            <AlertCircle size={10} color="#70787C" />
            <Text className="text-[#70787C] text-[10px] font-bold ml-1 uppercase font-mono">
              Dibatalkan
            </Text>
          </View>
        );
      case 'unpaid':
      default:
        return (
          <View className="flex-row items-center bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-[2px]">
            <AlertCircle size={10} color="#9E2A2B" />
            <Text className="text-rose-800 text-[10px] font-bold ml-1 uppercase font-mono">
              Belum Bayar (Unpaid)
            </Text>
          </View>
        );
    }
  };

  return (
    <View className="flex-1 bg-[#F8F6F1]">
      {/* 1. Offline & Sync Status Banner */}
      {!isOnline && (
        <View className="flex-row items-center justify-between bg-[#2B2317] border-b border-[#52442F] px-4 md:px-5 py-2">
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-[#E5B650] mr-2" />
            <Text className="text-[#F6E3B8] text-xs font-semibold">
              Mode Offline Aktif
            </Text>
            <Text className="text-[#D8BE8A] text-xs ml-2">
              • {pendingSyncCount > 0
                ? `${pendingSyncCount} perubahan tersimpan di perangkat lokal`
                : 'Menampilkan data tersimpan di perangkat lokal'}
            </Text>
          </View>
          <Text className="text-[#E5B650] text-[11px] font-medium font-mono">
            {pendingSyncCount > 0 ? `${pendingSyncCount} Antre` : 'Lokal Cache'}
          </Text>
        </View>
      )}

      {isOnline && pendingSyncCount > 0 && (
        <View className="flex-row items-center justify-between bg-[#1B2225] border-b border-[#2C3539] px-4 md:px-5 py-2">
          <View className="flex-row items-center">
            <ActivityIndicator size="small" color="#C8B89A" className="mr-2.5" />
            <Text className="text-[#F4F1EA] text-xs font-semibold">
              Menyinkronkan Perubahan ke Cloud
            </Text>
            <Text className="text-[#A8B2B7] text-xs ml-2">
              • {pendingSyncCount} perubahan sedang disinkronkan...
            </Text>
          </View>
          <Text className="text-[#C8B89A] text-[11px] font-medium font-mono">
            Sinkronisasi
          </Text>
        </View>
      )}

      <ScrollView
        className="flex-1 p-3.5 md:p-5"
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor="#968363"
            colors={['#968363']}
          />
        }
      >
        {/* HEADER & ACTION BUTTONS */}
        <View className="flex-col md:flex-row md:items-center justify-between mb-4 pb-3.5 border-b border-[#E3DDCF] gap-3">
          <View>
            <View className="flex-row items-center">
              <FileText size={20} color="#968363" />
              <Text className="text-[#1B2225] font-bold text-lg md:text-xl font-mono ml-2">
                INVOICE & TAGIHAN
              </Text>
            </View>
            <Text className="text-[#70787C] text-xs mt-0.5">
              Kelola penagihan resmi, pelacakan termin, dan mutasi pembayaran klien Alora Studio
            </Text>
          </View>

          <View className="flex-row items-center space-x-2">
            <Pressable
              onPress={onRefresh}
              className="p-2 bg-white border border-[#DDD6C8] rounded-[3px] mr-2"
            >
              <RefreshCw size={13} color="#1B2225" />
            </Pressable>

            <Pressable
              onPress={handleOpenCreateModal}
              className="flex-row items-center bg-[#1B2225] hover:bg-[#2C373C] px-3.5 py-2 rounded-[3px] shadow-xs"
            >
              <Plus size={14} color="#FFFFFF" />
              <Text className="text-white font-semibold text-xs ml-1.5">Buat Invoice</Text>
            </Pressable>
          </View>
        </View>

        {/* WIDGET KARTU RINGKASAN FINANSIAL */}
        <View className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {/* Total Tagihan */}
          <View className="bg-white border border-[#E3DDCF] p-3.5 rounded-[3px] flex-row items-center justify-between shadow-xs">
            <View>
              <Text className="text-[#70787C] text-[11px] font-semibold uppercase tracking-wider">
                Total Nilai Tagihan
              </Text>
              <Text className="text-[#1B2225] text-lg md:text-xl font-bold font-mono mt-1">
                {formatRupiah(stats.totalBilled)}
              </Text>
              <Text className="text-[#8A9296] text-[11px] mt-0.5">
                Dari {stats.totalCount} invoice aktif
              </Text>
            </View>
            <View className="w-8 h-8 rounded-[2px] bg-[#FAF8F5] items-center justify-center border border-[#DDD6C8]">
              <FileText size={16} color="#1B2225" />
            </View>
          </View>

          {/* Total Sudah Terbayar */}
          <View className="bg-white border border-[#E3DDCF] p-3.5 rounded-[3px] flex-row items-center justify-between shadow-xs">
            <View>
              <Text className="text-[#70787C] text-[11px] font-semibold uppercase tracking-wider">
                Total Terbayar (Masuk)
              </Text>
              <Text className="text-emerald-800 text-lg md:text-xl font-bold font-mono mt-1">
                {formatRupiah(stats.totalPaid)}
              </Text>
              <Text className="text-emerald-700 text-[11px] mt-0.5">
                {stats.paidCount} lunas • {stats.partialCount} termin aktif
              </Text>
            </View>
            <View className="w-8 h-8 rounded-[2px] bg-emerald-50 items-center justify-center border border-emerald-200">
              <Wallet size={16} color="#059669" />
            </View>
          </View>

          {/* Sisa Piutang / Balance Due */}
          <View className="bg-white border border-[#E3DDCF] p-3.5 rounded-[3px] flex-row items-center justify-between shadow-xs">
            <View>
              <Text className="text-[#70787C] text-[11px] font-semibold uppercase tracking-wider">
                Sisa Piutang (Balance Due)
              </Text>
              <Text className="text-[#968363] text-lg md:text-xl font-bold font-mono mt-1">
                {formatRupiah(stats.totalBalanceDue)}
              </Text>
              <Text className="text-[#8A9296] text-[11px] mt-0.5">
                {stats.unpaidCount} belum bayar sama sekali
              </Text>
            </View>
            <View className="w-8 h-8 rounded-[2px] bg-amber-50 items-center justify-center border border-amber-200">
              <HandCoins size={16} color="#B45309" />
            </View>
          </View>
        </View>

        {/* PENCARIAN & FILTER STATUS */}
        <View className="flex-col md:flex-row md:items-center justify-between mb-4 gap-2.5">
          {/* Search Box */}
          <View className="flex-1 flex-row items-center bg-white border border-[#DDD6C8] px-3 py-1.5 rounded-[3px]">
            <Search size={14} color="#8A9296" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Cari no invoice, nama klien, atau alamat..."
              placeholderTextColor="#8A9296"
              className="flex-1 ml-2 text-[#1B2225] text-xs p-0"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Text className="text-[#8A9296] text-xs">Clear</Text>
              </Pressable>
            )}
          </View>

          {/* Filter Status Tabs */}
          <View className="flex-row items-center flex-wrap gap-1.5">
            <Pressable
              onPress={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-[3px] border ${
                activeFilter === 'all'
                  ? 'bg-[#1B2225] border-[#1B2225]'
                  : 'bg-white border-[#DDD6C8] hover:bg-[#FAF8F5]'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  activeFilter === 'all' ? 'text-white' : 'text-[#4D555A]'
                }`}
              >
                Semua ({invoices.length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveFilter('unpaid')}
              className={`px-3 py-1.5 rounded-[3px] border ${
                activeFilter === 'unpaid'
                  ? 'bg-[#1B2225] border-[#1B2225]'
                  : 'bg-white border-[#DDD6C8] hover:bg-[#FAF8F5]'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  activeFilter === 'unpaid' ? 'text-white' : 'text-[#4D555A]'
                }`}
              >
                Unpaid ({stats.unpaidCount})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveFilter('partial')}
              className={`px-3 py-1.5 rounded-[3px] border ${
                activeFilter === 'partial'
                  ? 'bg-[#1B2225] border-[#1B2225]'
                  : 'bg-white border-[#DDD6C8] hover:bg-[#FAF8F5]'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  activeFilter === 'partial' ? 'text-white' : 'text-[#4D555A]'
                }`}
              >
                Partial ({stats.partialCount})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveFilter('paid')}
              className={`px-3 py-1.5 rounded-[3px] border ${
                activeFilter === 'paid'
                  ? 'bg-[#1B2225] border-[#1B2225]'
                  : 'bg-white border-[#DDD6C8] hover:bg-[#FAF8F5]'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  activeFilter === 'paid' ? 'text-white' : 'text-[#4D555A]'
                }`}
              >
                Paid ({stats.paidCount})
              </Text>
            </Pressable>
          </View>
        </View>

        {/* LOADING INDICATOR SAAT REFRESH / DATA FETCH */}
        {isLoading && invoices.length > 0 && (
          <View className="flex-row items-center justify-center py-2 px-3 bg-white border border-[#E3DDCF] rounded-[3px] mb-3">
            <ActivityIndicator size="small" color="#968363" />
            <Text className="text-[#70787C] text-xs ml-2 font-medium">
              Memperbarui data invoice...
            </Text>
          </View>
        )}

        {/* DAFTAR KARTU INVOICE */}
        {isLoading && invoices.length === 0 ? (
          <View className="py-16 items-center justify-center bg-white border border-[#E3DDCF] rounded-[4px]">
            <ActivityIndicator size="large" color="#968363" />
            <Text className="text-[#70787C] text-xs mt-3">Memuat data invoice & penagihan...</Text>
          </View>
        ) : filteredInvoices.length === 0 ? (
          <View className="bg-white border border-dashed border-[#DDD6C8] rounded-[4px] p-10 items-center justify-center">
            <FileText size={40} color="#8A9296" />
            <Text className="text-[#1B2225] font-bold text-sm mt-3">Tidak ada data invoice</Text>
            <Text className="text-[#70787C] text-xs text-center mt-1 max-w-sm">
              {searchQuery
                ? `Tidak ditemukan invoice dengan kata kunci "${searchQuery}".`
                : 'Belum ada invoice yang dibuat. Klik tombol "Buat Invoice" untuk membuat tagihan baru.'}
            </Text>
            {!searchQuery && (
              <Pressable
                onPress={handleOpenCreateModal}
                className="mt-3.5 bg-[#1B2225] px-4 py-2 rounded-[3px]"
              >
                <Text className="text-white font-bold text-xs">+ Buat Invoice Pertama</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View className="flex-col space-y-3">
            {paginatedInvoices.map((inv) => {
              const paidPct =
                inv.total > 0
                  ? Math.min(100, Math.round((inv.paid_amount / inv.total) * 100))
                  : 0;

              return (
                <View
                  key={inv.id}
                  className="bg-white border border-[#E3DDCF] rounded-[4px] p-4 shadow-xs hover:border-[#968363] transition"
                >
                  {/* Top Bar: Nomor Invoice, Tanggal & Status Badge */}
                  <View className="flex-row flex-wrap items-center justify-between pb-2.5 border-b border-[#F0EBE1] gap-2">
                    <View className="flex-row items-center space-x-2">
                      <Text className="text-[#968363] font-mono font-bold text-xs mr-2">
                        {inv.invoice_no}
                      </Text>
                      {renderStatusBadge(inv.status)}
                    </View>

                    <View className="flex-row items-center text-[#70787C] text-xs">
                      <Calendar size={12} color="#968363" />
                      <Text className="text-[#70787C] text-xs ml-1">
                        Terbit: {formatIndonesianDate(inv.issue_date)}
                      </Text>
                      {inv.due_date && (
                        <Text className="text-[#8A9296] text-xs ml-2">
                          • Jatuh Tempo: {formatIndonesianDate(inv.due_date)}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Body: Klien, Alamat, Rincian Item Preview */}
                  <View className="flex-col md:flex-row justify-between py-3 gap-3">
                    <View className="flex-1">
                      <View className="flex-row items-center mb-1">
                        <User size={13} color="#1B2225" />
                        <Text className="text-[#1B2225] font-bold text-xs ml-1.5">
                          {inv.client_name}
                        </Text>
                        {inv.client_phone && (
                          <Text className="text-[#8A9296] text-[11px] ml-1.5 font-mono">
                            ({inv.client_phone})
                          </Text>
                        )}
                      </View>

                      {inv.client_address && (
                        <Text className="text-[#70787C] text-[11px] mb-2">
                          Alamat: {inv.client_address}
                        </Text>
                      )}

                      {/* Item Preview */}
                      <View className="mt-1.5 bg-[#FAF8F5] p-2.5 rounded-[3px] border border-[#EDE7DC]">
                        <Text className="text-[#70787C] text-[10px] font-semibold mb-1">
                          Item Tagihan ({inv.invoice_items?.length || 0} item):
                        </Text>
                        {(inv.invoice_items || []).slice(0, 3).map((it, idx) => (
                          <Text
                            key={idx}
                            className="text-[#1B2225] text-xs truncate"
                            numberOfLines={1}
                          >
                            • {it.description} ({it.quantity} {it.unit})
                          </Text>
                        ))}
                        {(inv.invoice_items?.length || 0) > 3 && (
                          <Text className="text-[#968363] text-[10px] mt-0.5">
                            + {(inv.invoice_items?.length || 0) - 3} item lainnya...
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Financial Summary Column & Progress */}
                    <View className="w-full md:w-72 bg-[#FAF8F5] p-3 rounded-[3px] border border-[#EDE7DC] flex-col justify-between">
                      <View>
                        <View className="flex-row justify-between items-center mb-1">
                          <Text className="text-[#70787C] text-xs">Total Tagihan:</Text>
                          <Text className="text-[#1B2225] font-bold text-xs font-mono">
                            {formatRupiah(inv.total)}
                          </Text>
                        </View>

                        <View className="flex-row justify-between items-center mb-1">
                          <Text className="text-[#70787C] text-xs">Sudah Dibayar:</Text>
                          <Text className="text-emerald-800 font-bold text-xs font-mono">
                            {formatRupiah(inv.paid_amount)}
                          </Text>
                        </View>

                        <View className="flex-row justify-between items-center mb-1.5">
                          <Text className="text-[#70787C] text-xs">Sisa Tagihan:</Text>
                          <Text className="text-[#968363] font-bold text-xs font-mono">
                            {formatRupiah(inv.balance_due)}
                          </Text>
                        </View>

                        {/* Progress Bar */}
                        <View className="w-full bg-[#EAE5DA] h-1.5 rounded-[1px] overflow-hidden mb-1">
                          <View
                            className="h-full bg-emerald-700 rounded-[1px]"
                            style={{ width: `${paidPct}%` }}
                          />
                        </View>
                        <View className="flex-row justify-between items-center">
                          <Text className="text-[#70787C] text-[10px]">Progress Bayar</Text>
                          <Text className="text-[#1B2225] font-bold text-[10px] font-mono">
                            {paidPct}%
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Footer Actions */}
                  <View className="flex-row flex-wrap items-center justify-between pt-2.5 border-t border-[#F0EBE1] gap-2">
                    <View className="flex-row items-center">
                      <Text className="text-[#70787C] text-[10px]">
                        Rekening: {inv.bank_name} • {inv.bank_account_no} (a.n. {inv.bank_account_holder})
                      </Text>
                    </View>

                    <View className="flex-row items-center space-x-1.5">
                      {/* Tombol Detail & Termin */}
                      <Pressable
                        onPress={() => handleOpenDetailModal(inv)}
                        className="flex-row items-center bg-[#FAF8F5] hover:bg-[#F2EDE4] px-2.5 py-1 rounded-[3px] border border-[#DDD6C8] mr-1.5"
                      >
                        <Eye size={12} color="#968363" />
                        <Text className="text-[#1B2225] text-xs font-semibold ml-1">Detail</Text>
                      </Pressable>

                      {/* Tombol Cetak / PDF Invoice */}
                      <Pressable
                        onPress={() => handleOpenInvoicePreview(inv)}
                        className="flex-row items-center bg-[#FAF8F5] hover:bg-[#F2EDE4] px-2.5 py-1 rounded-[3px] border border-[#DDD6C8] mr-1.5"
                      >
                        <Printer size={12} color="#968363" />
                        <Text className="text-[#1B2225] text-xs font-semibold ml-1">Cetak</Text>
                      </Pressable>

                      {/* Tombol Catat Bayar */}
                      {inv.balance_due > 0 && (
                        <Pressable
                          onPress={() => handleOpenPaymentModal(inv)}
                          className="flex-row items-center bg-[#1B2225] hover:bg-[#2C373C] px-2.5 py-1 rounded-[3px] mr-1.5 shadow-xs"
                        >
                          <Plus size={12} color="#FFFFFF" />
                          <Text className="text-white text-xs font-semibold ml-1">Bayar</Text>
                        </Pressable>
                      )}

                      {/* Tombol Edit */}
                      <Pressable
                        onPress={() => handleOpenEditModal(inv)}
                        className="flex-row items-center bg-[#FAF8F5] hover:bg-[#F2EDE4] px-2.5 py-1 rounded-[3px] border border-[#DDD6C8] mr-1.5"
                      >
                        <Pencil size={11} color="#1B2225" />
                        <Text className="text-[#1B2225] text-xs font-semibold ml-1">Edit</Text>
                      </Pressable>

                      {/* Tombol Hapus */}
                      <Pressable
                        onPress={() => handleDeleteInvoice(inv)}
                        className="flex-row items-center bg-[#FFF1F2] hover:bg-[#FEE2E2] px-2.5 py-1 rounded-[3px] border border-[#FECDD3]"
                      >
                        <Trash2 size={11} color="#9E2A2B" />
                        <Text className="text-[#9E2A2B] text-xs font-semibold ml-1">Hapus</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
            {/* Pagination Controls (10 item/page) */}
            <Pagination
              currentPage={currentPage}
              totalItems={filteredInvoices.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              className="mt-2"
            />
          </View>
        )}
      </ScrollView>

      {/* FORM MODAL (CREATE / EDIT) - Lazy load on demand */}
      {formModalVisible && (
        <Suspense fallback={null}>
          <InvoiceFormModal
            visible={formModalVisible}
            onClose={() => setFormModalVisible(false)}
            onSave={handleSaveInvoice}
            invoice={selectedInvoice}
          />
        </Suspense>
      )}

      {/* DETAIL INVOICE & TRACKING TERMIN MODAL - Lazy load on demand */}
      {detailModalVisible && (
        <Suspense fallback={null}>
          <InvoiceDetailModal
            visible={detailModalVisible}
            onClose={() => setDetailModalVisible(false)}
            invoice={
              detailInvoice
                ? invoices.find((i) => i.id === detailInvoice.id) || detailInvoice
                : null
            }
            onOpenPaymentRecord={(inv) => {
              setDetailModalVisible(false);
              handleOpenPaymentModal(inv);
            }}
            onOpenInvoicePdf={(inv) => {
              handleOpenInvoicePreview(inv);
            }}
            onOpenReceiptPdf={(receipt, inv) => {
              handleOpenReceiptPreview(receipt, inv);
            }}
          />
        </Suspense>
      )}

      {/* CATAT PEMBAYARAN TERMIN MODAL - Lazy load on demand */}
      {paymentModalVisible && (
        <Suspense fallback={null}>
          <PaymentRecordModal
            visible={paymentModalVisible}
            onClose={() => setPaymentModalVisible(false)}
            invoice={
              paymentInvoice
                ? invoices.find((i) => i.id === paymentInvoice.id) || paymentInvoice
                : null
            }
            onSuccess={() => {
              dispatch(fetchInvoices());
            }}
          />
        </Suspense>
      )}

      {/* PREVIEW & PRINT INVOICE MODAL - Lazy load on demand */}
      {invoicePreviewVisible && (
        <Suspense fallback={null}>
          <InvoicePreviewModal
            visible={invoicePreviewVisible}
            invoice={
              previewInvoice
                ? invoices.find((i) => i.id === previewInvoice.id) || previewInvoice
                : null
            }
            onClose={() => setInvoicePreviewVisible(false)}
          />
        </Suspense>
      )}

      {/* PREVIEW & PRINT KWITANSI MODAL - Lazy load on demand */}
      {receiptPreviewVisible && (
        <Suspense fallback={null}>
          <ReceiptPreviewModal
            visible={receiptPreviewVisible}
            receipt={previewReceipt}
            invoice={
              previewReceiptInvoice
                ? invoices.find((i) => i.id === previewReceiptInvoice.id) || previewReceiptInvoice
                : null
            }
            onClose={() => setReceiptPreviewVisible(false)}
          />
        </Suspense>
      )}
    </View>
  );
}
