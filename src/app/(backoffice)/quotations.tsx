import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { Pagination } from '@/components/ui/Pagination';
import { confirmDialog } from '@/lib/confirm';
import { useNetworkStatus } from '@/lib/network';
import { offlineQueueService } from '@/services/offlineQueueService';
import { quotationCacheService } from '@/services/quotationCacheService';
import {
  Quotation,
  SaveQuotationPayload,
} from '@/services/quotationService';
import { syncService } from '@/services/syncService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createQuotation,
  deleteQuotation,
  fetchQuotations,
  optimisticDeleteQuotation,
  optimisticUpdateStatus,
  setQuotationsFromCache,
  updateQuotation,
  updateQuotationStatus,
} from '@/store/slices/quotationSlice';
import { formatIndonesianDate, formatRupiah } from '@/utils/terbilang';
import {
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react-native';
import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

// Lazy load modal berat untuk efisiensi performa startup & memori
const QuotationFormModal = lazy(() =>
  import('@/components/quotation/QuotationFormModal').then((m) => ({
    default: m.QuotationFormModal,
  }))
);

const QuotationPreviewModal = lazy(() =>
  import('@/components/quotation/QuotationPreviewModal').then((m) => ({
    default: m.QuotationPreviewModal,
  }))
);

type StatusFilter = 'all' | 'draft' | 'sent' | 'approved' | 'rejected';

export default function QuotationsScreen() {
  const dispatch = useAppDispatch();
  const { quotations, isLoading } = useAppSelector((state) => state.quotation);
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
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);

  // Load Quotations on mount & check initial queue (Instant Offline Cache First)
  useEffect(() => {
    let isMounted = true;
    // 1. Muat data offline terlebih dahulu secara instan jika ada di cache lokal (0ms render)
    quotationCacheService.getQuotationsCache().then((cached) => {
      if (isMounted && cached && cached.length > 0) {
        dispatch(setQuotationsFromCache(cached));
      }
    });

    refreshPendingCount();
    dispatch(fetchQuotations());

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
          // Simpan snapshot data lokal terbaru tanpa me-reload / me-refresh halaman
          if (quotations.length > 0) {
            quotationCacheService.saveQuotationsCache(quotations);
          }
        });
    } else {
      refreshPendingCount();
    }
  }, [isOnline, quotations]);

  // Otomatis reset ke halaman 1 jika filter atau kata kunci pencarian berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter]);

  const onRefresh = async () => {
    if (isOnline) {
      await syncService.processQueue((remaining) => setPendingSyncCount(remaining));
      await refreshPendingCount();
    }
    dispatch(fetchQuotations());
  };

  // Filter & Search Logic
  const filteredQuotations = useMemo(() => {
    return quotations.filter((item) => {
      // Filter Status
      if (activeFilter !== 'all' && item.status !== activeFilter) {
        return false;
      }

      // Filter Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesNo = item.quotation_no.toLowerCase().includes(query);
        const matchesClient = item.client_name.toLowerCase().includes(query);
        const matchesTitle = item.project_title.toLowerCase().includes(query);
        const matchesCity = item.client_city?.toLowerCase().includes(query);
        return matchesNo || matchesClient || matchesTitle || matchesCity;
      }

      return true;
    });
  }, [quotations, activeFilter, searchQuery]);

  // Data terpaginasi (hanya 10 item untuk halaman aktif)
  const paginatedQuotations = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredQuotations.slice(startIndex, startIndex + pageSize);
  }, [filteredQuotations, currentPage, pageSize]);

  // Statistik Ringkas
  const stats = useMemo(() => {
    const total = quotations.length;
    const approved = quotations.filter((q) => q.status === 'approved').length;
    const sent = quotations.filter((q) => q.status === 'sent').length;
    const draft = quotations.filter((q) => q.status === 'draft').length;
    const totalValue = quotations
      .filter((q) => q.status === 'approved' || q.status === 'sent')
      .reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);

    return { total, approved, sent, draft, totalValue };
  }, [quotations]);

  // Handler CRUD
  const handleOpenCreate = () => {
    setSelectedQuotation(null);
    setFormModalVisible(true);
  };

  const handleOpenEdit = (q: Quotation) => {
    setSelectedQuotation(q);
    setFormModalVisible(true);
  };

  const handleOpenPreview = (q: Quotation) => {
    setPreviewQuotation(q);
    setPreviewModalVisible(true);
  };

  const handleSaveQuotation = async (payload: SaveQuotationPayload) => {
    try {
      if (selectedQuotation) {
        await dispatch(updateQuotation({ id: selectedQuotation.id, payload })).unwrap();
      } else {
        await dispatch(createQuotation(payload)).unwrap();
      }
    } finally {
      refreshPendingCount();
    }
  };

  const handleUpdateStatus = async (
    id: string,
    status: 'draft' | 'sent' | 'approved' | 'rejected'
  ) => {
    // Optimistic Update instan di UI lokal (0ms)
    dispatch(optimisticUpdateStatus({ id, status }));
    try {
      await dispatch(updateQuotationStatus({ id, status })).unwrap();
    } catch (err: any) {
      console.warn('[quotations] Info update status:', err);
    } finally {
      refreshPendingCount();
    }
  };

  const handleDelete = async (id: string, no: string) => {
    const confirmed = await confirmDialog({
      title: 'Hapus Surat Penawaran',
      message: `Apakah Anda yakin ingin menghapus surat penawaran ${no}? Rincian item penawaran ini juga akan dihapus.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      destructive: true,
    });

    if (confirmed) {
      // Optimistic Delete instan di UI lokal (0ms)
      dispatch(optimisticDeleteQuotation(id));
      try {
        await dispatch(deleteQuotation(id)).unwrap();
      } catch (err: any) {
        console.warn('[quotations] Info delete quotation:', err);
      } finally {
        refreshPendingCount();
      }
    }
  };

  const getStatusBadge = (status: Quotation['status']) => {
    switch (status) {
      case 'approved':
        return {
          bg: 'bg-emerald-50 border-emerald-200',
          text: 'text-emerald-700',
          label: 'Disetujui',
        };
      case 'sent':
        return {
          bg: 'bg-sky-50 border-sky-200',
          text: 'text-sky-700',
          label: 'Terkirim',
        };
      case 'rejected':
        return {
          bg: 'bg-rose-50 border-rose-200',
          text: 'text-rose-700',
          label: 'Ditolak',
        };
      case 'draft':
      default:
        return {
          bg: 'bg-[#FAF8F5] border-[#DDD6C8]',
          text: 'text-[#70787C]',
          label: 'Draft',
        };
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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor="#968363" />
        }
      >
        {/* HEADER HALAMAN */}
        <View className="flex-row flex-wrap items-center justify-between pb-4 border-b border-[#E3DDCF] gap-3">
          <View>
            <View className="flex-row items-center">
              <FileText size={20} color="#968363" />
              <Text className="text-[#1B2225] text-lg md:text-xl font-bold font-mono ml-2">
                Surat Penawaran
              </Text>
            </View>
            <Text className="text-[#70787C] text-xs mt-0.5">
              Kelola penawaran harga resmi, item spesifikasi interior & cetak PDF standar Alora Studio
            </Text>
          </View>

          <Pressable
            onPress={handleOpenCreate}
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            className="flex-row items-center bg-[#1B2225] hover:bg-[#2C373C] px-3.5 py-2 rounded-[3px] shadow-xs"
          >
            <Plus size={14} color="#FFFFFF" />
            <Text className="text-white text-xs font-semibold ml-1.5">
              + Buat Surat Penawaran
            </Text>
          </Pressable>
        </View>

        {/* STATISTIK RINGKAS CARDS */}
        <View className="grid grid-cols-2 md:grid-cols-4 gap-3 my-3">
          <View className="bg-white border border-[#E3DDCF] p-3 rounded-[3px] shadow-xs justify-between">
            <View className="flex-row items-center justify-between">
              <Text className="text-[#70787C] text-[11px] font-semibold uppercase tracking-wider">
                Total Penawaran
              </Text>
              <FileCheck size={14} color="#968363" />
            </View>
            <Text className="text-[#1B2225] text-lg md:text-xl font-bold font-mono mt-1">
              {stats.total}
            </Text>
          </View>

          <View className="bg-white border border-[#E3DDCF] p-3 rounded-[3px] shadow-xs justify-between">
            <View className="flex-row items-center justify-between">
              <Text className="text-[#70787C] text-[11px] font-semibold uppercase tracking-wider">
                Disetujui Klien
              </Text>
              <CheckCircle2 size={14} color="#059669" />
            </View>
            <Text className="text-emerald-800 text-lg md:text-xl font-bold font-mono mt-1">
              {stats.approved}
            </Text>
          </View>

          <View className="bg-white border border-[#E3DDCF] p-3 rounded-[3px] shadow-xs justify-between">
            <View className="flex-row items-center justify-between">
              <Text className="text-[#70787C] text-[11px] font-semibold uppercase tracking-wider">
                Menunggu Respon
              </Text>
              <Clock size={14} color="#B45309" />
            </View>
            <Text className="text-[#968363] text-lg md:text-xl font-bold font-mono mt-1">
              {stats.sent + stats.draft}
            </Text>
          </View>

          <View className="bg-white border border-[#E3DDCF] p-3 rounded-[3px] shadow-xs justify-between">
            <View className="flex-row items-center justify-between">
              <Text className="text-[#70787C] text-[11px] font-semibold uppercase tracking-wider">
                Potensi Nilai
              </Text>
              <Text className="text-[#968363] text-[10px] font-bold font-mono">RAB</Text>
            </View>
            <Text className="text-[#1B2225] text-base md:text-lg font-bold font-mono mt-1" numberOfLines={1}>
              {formatRupiah(stats.totalValue)}
            </Text>
          </View>
        </View>

        {/* SEARCH & FILTER TABS */}
        <View className="flex-col md:flex-row md:items-center justify-between gap-2.5 mb-3">
          {/* Search Bar */}
          <View className="flex-1 flex-row items-center bg-white border border-[#DDD6C8] rounded-[3px] px-3 py-1.5">
            <Search size={14} color="#8A9296" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-[#1B2225] text-xs ml-2 p-0"
              placeholder="Cari nomor surat, nama klien, atau judul proyek..."
              placeholderTextColor="#8A9296"
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')}>
                <Text className="text-[#8A9296] text-xs">✕</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Filter Status Tabs */}
          <View className="flex-row flex-wrap gap-1.5">
            {(
              [
                { id: 'all', label: 'Semua' },
                { id: 'draft', label: 'Draft' },
                { id: 'sent', label: 'Terkirim' },
                { id: 'approved', label: 'Disetujui' },
                { id: 'rejected', label: 'Ditolak' },
              ] as const
            ).map((tab) => {
              const active = activeFilter === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-[3px] border ${
                    active
                      ? 'bg-[#1B2225] border-[#1B2225]'
                      : 'bg-white border-[#DDD6C8] hover:bg-[#FAF8F5]'
                  }`}
                >
                  <Text
                    className={`text-xs ${
                      active ? 'text-white font-bold' : 'text-[#4D555A] font-medium'
                    }`}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* LOADING INDICATOR SAAT REFRESH / DATA FETCH */}
        {isLoading && quotations.length > 0 && (
          <View className="flex-row items-center justify-center py-2 px-3 bg-white border border-[#E3DDCF] rounded-[3px] mb-3">
            <ActivityIndicator size="small" color="#968363" />
            <Text className="text-[#70787C] text-xs ml-2 font-medium">
              Memperbarui data surat penawaran...
            </Text>
          </View>
        )}

        {/* LIST PENAWARAN */}
        {isLoading && quotations.length === 0 ? (
          <View className="py-16 items-center justify-center bg-white border border-[#E3DDCF] rounded-[4px]">
            <ActivityIndicator size="large" color="#968363" />
            <Text className="text-[#70787C] text-xs mt-3">Memuat surat penawaran...</Text>
          </View>
        ) : filteredQuotations.length === 0 ? (
          <View className="py-16 items-center justify-center bg-white border border-dashed border-[#DDD6C8] rounded-[4px] p-6 text-center">
            <FileText size={36} color="#8A9296" />
            <Text className="text-[#1B2225] font-bold text-sm mt-2.5">
              Belum Ada Surat Penawaran
            </Text>
            <Text className="text-[#70787C] text-xs mt-1 max-w-sm text-center">
              {searchQuery || activeFilter !== 'all'
                ? 'Tidak ditemukan surat penawaran dengan kriteria pencarian tersebut.'
                : 'Buat surat penawaran resmi baru untuk klien Anda dengan format standar Alora Studio.'}
            </Text>
            {!(searchQuery || activeFilter !== 'all') && (
              <Pressable
                onPress={handleOpenCreate}
                className="mt-3.5 px-4 py-2 bg-[#1B2225] rounded-[3px]"
              >
                <Text className="text-white text-xs font-bold">+ Buat Sekarang</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View className="flex-col space-y-2.5">
            {paginatedQuotations.map((item) => {
              const badge = getStatusBadge(item.status);
              return (
                <View
                  key={item.id}
                  className="bg-white border border-[#E3DDCF] rounded-[4px] p-3.5 shadow-xs hover:border-[#968363] transition"
                >
                  {/* Row 1: Nomor Surat & Status Badge & Actions */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center flex-wrap gap-2">
                      <View className="bg-[#FAF8F5] px-2 py-0.5 rounded-[2px] border border-[#DDD6C8]">
                        <Text className="text-[#968363] font-mono font-bold text-xs">
                          {item.quotation_no}
                        </Text>
                      </View>

                      <View
                        className={`px-2 py-0.5 rounded-[2px] border ${badge.bg}`}
                      >
                        <Text className={`text-[10px] font-bold ${badge.text}`}>
                          ● {badge.label}
                        </Text>
                      </View>
                    </View>

                    {/* Menu Aksi Dropdown */}
                    <DropdownMenu
                      buttonClassName="w-6 h-6 rounded-[2px] items-center justify-center bg-[#FAF8F5] border border-[#DDD6C8]"
                      items={[
                        {
                          label: 'Lihat Preview & PDF',
                          icon: <Eye size={12} color="#968363" />,
                          onPress: () => handleOpenPreview(item),
                        },
                        {
                          label: 'Edit Surat Penawaran',
                          icon: <Pencil size={12} color="#B45309" />,
                          onPress: () => handleOpenEdit(item),
                        },
                        {
                          label: 'Ubah ke: Disetujui',
                          icon: <CheckCircle2 size={12} color="#059669" />,
                          onPress: () => handleUpdateStatus(item.id, 'approved'),
                        },
                        {
                          label: 'Ubah ke: Terkirim',
                          icon: <Clock size={12} color="#0284C7" />,
                          onPress: () => handleUpdateStatus(item.id, 'sent'),
                        },
                        {
                          label: 'Ubah ke: Ditolak',
                          icon: <XCircle size={12} color="#9E2A2B" />,
                          onPress: () => handleUpdateStatus(item.id, 'rejected'),
                        },
                        {
                          label: 'Hapus Surat Penawaran',
                          icon: <Trash2 size={12} color="#9E2A2B" />,
                          destructive: true,
                          onPress: () => handleDelete(item.id, item.quotation_no),
                        },
                      ]}
                    />
                  </View>

                  {/* Row 2: Judul Proyek & Klien */}
                  <View className="mb-2.5">
                    <Text className="text-[#1B2225] font-bold text-sm md:text-base mb-0.5">
                      {item.project_title}
                    </Text>
                    <Text className="text-[#70787C] text-xs">
                      👤 Kepada Yth: <Text className="text-[#1B2225] font-semibold">{item.client_name}</Text>
                      {item.client_city ? ` (${item.client_city})` : ''}
                      {item.client_phone ? ` • 📞 ${item.client_phone}` : ''}
                    </Text>
                  </View>

                  {/* Row 3: Nilai Penawaran & Spesifikasi Items Count */}
                  <View className="bg-[#FAF8F5] border border-[#EDE7DC] p-2.5 rounded-[3px] flex-row items-center justify-between mb-2.5">
                    <View>
                      <Text className="text-[#70787C] text-[10px]">Nilai Total Penawaran:</Text>
                      <Text className="text-emerald-800 font-bold text-base md:text-lg font-mono">
                        {formatRupiah(item.total_amount)}
                      </Text>
                    </View>

                    <View className="bg-white px-2 py-1 rounded-[2px] border border-[#DDD6C8]">
                      <Text className="text-[#70787C] text-xs font-semibold font-mono">
                        {item.quotation_items?.length || 0} Item Spesifikasi
                      </Text>
                    </View>
                  </View>

                  {/* Row 4: Footer Info (Tanggal, Marketing & Quick Preview Button) */}
                  <View className="flex-row items-center justify-between pt-2 border-t border-[#F2EDE4]">
                    <View className="flex-row items-center flex-wrap gap-2">
                      <Text className="text-[#70787C] text-[11px]">
                        📅 {formatIndonesianDate(item.issued_date)}
                      </Text>
                      <Text className="text-[#DDD6C8] text-[11px]">•</Text>
                      <Text className="text-[#968363] text-[11px] font-semibold">
                        ✍️ {item.marketing_name || 'Marketing Alora'}
                      </Text>
                    </View>

                    <View className="flex-row space-x-2">
                      <Pressable
                        onPress={() => handleOpenPreview(item)}
                        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                        className="flex-row items-center bg-[#FAF8F5] hover:bg-[#F2EDE4] border border-[#DDD6C8] px-2.5 py-1 rounded-[3px] mr-2"
                      >
                        <Eye size={12} color="#968363" />
                        <Text className="text-[#1B2225] text-xs font-semibold ml-1">
                          Preview & Cetak PDF
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleOpenEdit(item)}
                        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                        className="flex-row items-center bg-[#1B2225] hover:bg-[#2C373C] px-2.5 py-1 rounded-[3px]"
                      >
                        <Pencil size={11} color="#FFFFFF" />
                        <Text className="text-white text-xs font-semibold ml-1">Edit</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Pagination Controls (10 item/page) */}
            <Pagination
              currentPage={currentPage}
              totalItems={filteredQuotations.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              className="mt-2"
            />
          </View>
        )}
      </ScrollView>

      {/* FORM MODAL (BUAT / EDIT PENAWARAN) - Lazy Load on demand */}
      {formModalVisible && (
        <Suspense fallback={null}>
          <QuotationFormModal
            visible={formModalVisible}
            quotation={selectedQuotation}
            onClose={() => {
              setFormModalVisible(false);
              setSelectedQuotation(null);
            }}
            onSave={handleSaveQuotation}
            onPreview={(mock) => {
              setPreviewQuotation(mock);
              setPreviewModalVisible(true);
            }}
          />
        </Suspense>
      )}

      {/* PREVIEW & CETAK PDF MODAL - Lazy Load on demand */}
      {previewModalVisible && (
        <Suspense fallback={null}>
          <QuotationPreviewModal
            visible={previewModalVisible}
            quotation={previewQuotation}
            onClose={() => {
              setPreviewModalVisible(false);
              setPreviewQuotation(null);
            }}
          />
        </Suspense>
      )}
    </View>
  );
}
