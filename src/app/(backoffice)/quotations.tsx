import { QuotationFormModal } from '@/components/quotation/QuotationFormModal';
import { QuotationPreviewModal } from '@/components/quotation/QuotationPreviewModal';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import {
  Quotation,
  SaveQuotationPayload,
} from '@/services/quotationService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createQuotation,
  deleteQuotation,
  fetchQuotations,
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
import React, { useEffect, useMemo, useState } from 'react';
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

type StatusFilter = 'all' | 'draft' | 'sent' | 'approved' | 'rejected';

export default function QuotationsScreen() {
  const dispatch = useAppDispatch();
  const { quotations, isLoading } = useAppSelector((state) => state.quotation);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');

  // Modal States
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);

  // Load Quotations on mount
  useEffect(() => {
    dispatch(fetchQuotations());
  }, [dispatch]);

  const onRefresh = () => {
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
    if (selectedQuotation) {
      await dispatch(updateQuotation({ id: selectedQuotation.id, payload })).unwrap();
    } else {
      await dispatch(createQuotation(payload)).unwrap();
    }
  };

  const handleUpdateStatus = async (
    id: string,
    status: 'draft' | 'sent' | 'approved' | 'rejected'
  ) => {
    try {
      await dispatch(updateQuotationStatus({ id, status })).unwrap();
    } catch (err: any) {
      Alert.alert('Gagal Mengubah Status', err);
    }
  };

  const handleDelete = (id: string, no: string) => {
    Alert.alert(
      'Hapus Surat Penawaran',
      `Apakah Anda yakin ingin menghapus surat penawaran ${no}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteQuotation(id)).unwrap();
            } catch (err: any) {
              Alert.alert('Gagal Menghapus', err);
            }
          },
        },
      ]
    );
  };

  const getStatusBadge = (status: Quotation['status']) => {
    switch (status) {
      case 'approved':
        return {
          bg: 'bg-emerald-950/80 border-emerald-700/60',
          text: 'text-emerald-400',
          label: 'Disetujui',
        };
      case 'sent':
        return {
          bg: 'bg-sky-950/80 border-sky-700/60',
          text: 'text-sky-300',
          label: 'Terkirim',
        };
      case 'rejected':
        return {
          bg: 'bg-rose-950/80 border-rose-700/60',
          text: 'text-rose-400',
          label: 'Ditolak',
        };
      case 'draft':
      default:
        return {
          bg: 'bg-slate-800 border-slate-700',
          text: 'text-slate-300',
          label: 'Draft',
        };
    }
  };

  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView
        className="flex-1 p-4 md:p-6"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor="#38BDF8" />
        }
      >
        {/* HEADER HALAMAN */}
        <View className="flex-row flex-wrap items-center justify-between pb-5 border-b border-slate-800 gap-4">
          <View>
            <View className="flex-row items-center">
              <FileText size={22} color="#38BDF8" />
              <Text className="text-white text-xl md:text-2xl font-black ml-2.5">
                Surat Penawaran
              </Text>
            </View>
            <Text className="text-slate-400 text-xs md:text-sm mt-1">
              Kelola surat penawaran resmi, spesifikasi interior, dan cetak dokumen PDF standar Alora Studio
            </Text>
          </View>

          <Pressable
            onPress={handleOpenCreate}
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            className="flex-row items-center bg-blue-600 px-4 py-2.5 rounded-xl shadow-lg"
          >
            <Plus size={16} color="#FFFFFF" />
            <Text className="text-white text-xs md:text-sm font-bold ml-1.5">
              + Buat Surat Penawaran
            </Text>
          </Pressable>
        </View>

        {/* STATISTIK RINGKAS CARDS */}
        <View className="flex-row flex-wrap -mx-2 my-5">
          <View className="w-1/2 md:w-1/4 px-2 mb-3">
            <View className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <View className="flex-row items-center justify-between">
                <Text className="text-slate-400 text-xs">Total Penawaran</Text>
                <FileCheck size={16} color="#94A3B8" />
              </View>
              <Text className="text-white text-xl font-bold mt-1.5">{stats.total}</Text>
            </View>
          </View>

          <View className="w-1/2 md:w-1/4 px-2 mb-3">
            <View className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <View className="flex-row items-center justify-between">
                <Text className="text-slate-400 text-xs">Disetujui Klien</Text>
                <CheckCircle2 size={16} color="#34D399" />
              </View>
              <Text className="text-emerald-400 text-xl font-bold mt-1.5">{stats.approved}</Text>
            </View>
          </View>

          <View className="w-1/2 md:w-1/4 px-2 mb-3">
            <View className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <View className="flex-row items-center justify-between">
                <Text className="text-slate-400 text-xs">Menunggu Respon</Text>
                <Clock size={16} color="#38BDF8" />
              </View>
              <Text className="text-sky-300 text-xl font-bold mt-1.5">
                {stats.sent + stats.draft}
              </Text>
            </View>
          </View>

          <View className="w-1/2 md:w-1/4 px-2 mb-3">
            <View className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <View className="flex-row items-center justify-between">
                <Text className="text-slate-400 text-xs">Potensi Nilai Penawaran</Text>
                <Text className="text-amber-400 text-xs font-bold">Rp</Text>
              </View>
              <Text className="text-amber-400 text-base md:text-lg font-bold mt-1.5" numberOfLines={1}>
                {formatRupiah(stats.totalValue)}
              </Text>
            </View>
          </View>
        </View>

        {/* SEARCH & FILTER TABS */}
        <View className="flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
          {/* Search Bar */}
          <View className="flex-1 flex-row items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
            <Search size={16} color="#64748B" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-white text-xs md:text-sm ml-2.5 p-0"
              placeholder="Cari nomor surat, nama klien, atau judul proyek..."
              placeholderTextColor="#64748B"
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')}>
                <Text className="text-slate-500 text-xs">✕</Text>
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
                  className={`px-3 py-2 rounded-xl border ${
                    active
                      ? 'bg-blue-600/30 border-blue-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <Text
                    className={`text-xs ${
                      active ? 'text-blue-300 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* LIST PENAWARAN */}
        {isLoading && quotations.length === 0 ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#38BDF8" />
            <Text className="text-slate-400 text-xs mt-3">Memuat surat penawaran...</Text>
          </View>
        ) : filteredQuotations.length === 0 ? (
          <View className="py-20 items-center justify-center bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-6 text-center">
            <FileText size={42} color="#475569" />
            <Text className="text-white font-bold text-sm mt-3">
              Belum Ada Surat Penawaran
            </Text>
            <Text className="text-slate-400 text-xs mt-1 max-w-sm text-center">
              {searchQuery || activeFilter !== 'all'
                ? 'Tidak ditemukan surat penawaran dengan kriteria pencarian tersebut.'
                : 'Buat surat penawaran resmi baru untuk klien Anda dengan format standar Alora Studio.'}
            </Text>
            {!(searchQuery || activeFilter !== 'all') && (
              <Pressable
                onPress={handleOpenCreate}
                className="mt-4 px-4 py-2 bg-blue-600 rounded-xl"
              >
                <Text className="text-white text-xs font-bold">+ Buat Sekarang</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View className="flex-col space-y-3">
            {filteredQuotations.map((item) => {
              const badge = getStatusBadge(item.status);
              return (
                <View
                  key={item.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 hover:border-slate-700 transition"
                >
                  {/* Row 1: Nomor Surat & Status Badge & Actions */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center flex-wrap gap-2">
                      <View className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                        <Text className="text-sky-400 font-mono font-bold text-xs">
                          {item.quotation_no}
                        </Text>
                      </View>

                      <View
                        className={`px-2.5 py-0.5 rounded-full border ${badge.bg}`}
                      >
                        <Text className={`text-[10px] font-bold ${badge.text}`}>
                          ● {badge.label}
                        </Text>
                      </View>
                    </View>

                    {/* Menu Aksi Dropdown */}
                    <DropdownMenu
                      buttonClassName="w-8 h-8 rounded-lg items-center justify-center bg-slate-950 border border-slate-800"
                      items={[
                        {
                          label: 'Lihat Preview & PDF',
                          icon: <Eye size={13} color="#38BDF8" />,
                          onPress: () => handleOpenPreview(item),
                        },
                        {
                          label: 'Edit Surat Penawaran',
                          icon: <Pencil size={13} color="#FBBF24" />,
                          onPress: () => handleOpenEdit(item),
                        },
                        {
                          label: 'Ubah ke: Disetujui',
                          icon: <CheckCircle2 size={13} color="#34D399" />,
                          onPress: () => handleUpdateStatus(item.id, 'approved'),
                        },
                        {
                          label: 'Ubah ke: Terkirim',
                          icon: <Clock size={13} color="#38BDF8" />,
                          onPress: () => handleUpdateStatus(item.id, 'sent'),
                        },
                        {
                          label: 'Ubah ke: Ditolak',
                          icon: <XCircle size={13} color="#F87171" />,
                          onPress: () => handleUpdateStatus(item.id, 'rejected'),
                        },
                        {
                          label: 'Hapus Surat Penawaran',
                          icon: <Trash2 size={13} color="#F87171" />,
                          destructive: true,
                          onPress: () => handleDelete(item.id, item.quotation_no),
                        },
                      ]}
                    />
                  </View>

                  {/* Row 2: Judul Proyek & Klien */}
                  <View className="mb-3">
                    <Text className="text-white font-bold text-base md:text-lg mb-1">
                      {item.project_title}
                    </Text>
                    <Text className="text-slate-400 text-xs">
                      👤 Kepada Yth: <Text className="text-slate-200 font-medium">{item.client_name}</Text>
                      {item.client_city ? ` (${item.client_city})` : ''}
                      {item.client_phone ? ` • 📞 ${item.client_phone}` : ''}
                    </Text>
                  </View>

                  {/* Row 3: Nilai Penawaran & Spesifikasi Items Count */}
                  <View className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl flex-row items-center justify-between mb-3">
                    <View>
                      <Text className="text-slate-400 text-[11px]">Nilai Total Penawaran:</Text>
                      <Text className="text-emerald-400 font-black text-base md:text-lg">
                        {formatRupiah(item.total_amount)}
                      </Text>
                    </View>

                    <View className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                      <Text className="text-slate-300 text-xs font-semibold">
                        {item.quotation_items?.length || 0} Item Spesifikasi
                      </Text>
                    </View>
                  </View>

                  {/* Row 4: Footer Info (Tanggal, Marketing & Quick Preview Button) */}
                  <View className="flex-row items-center justify-between pt-2 border-t border-slate-800/80">
                    <View className="flex-row items-center flex-wrap gap-2">
                      <Text className="text-slate-500 text-[11px]">
                        📅 {formatIndonesianDate(item.issued_date)}
                      </Text>
                      <Text className="text-slate-500 text-[11px]">•</Text>
                      <Text className="text-sky-400 text-[11px]">
                        ✍️ {item.marketing_name || 'Marketing Alora'}
                      </Text>
                    </View>

                    <View className="flex-row space-x-2">
                      <Pressable
                        onPress={() => handleOpenPreview(item)}
                        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                        className="flex-row items-center bg-blue-600/20 border border-blue-500/40 px-3 py-1.5 rounded-xl mr-2"
                      >
                        <Eye size={13} color="#38BDF8" />
                        <Text className="text-sky-300 text-xs font-semibold ml-1">
                          Preview & Cetak PDF
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleOpenEdit(item)}
                        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                        className="flex-row items-center bg-slate-800 px-3 py-1.5 rounded-xl"
                      >
                        <Pencil size={12} color="#94A3B8" />
                        <Text className="text-slate-300 text-xs font-semibold ml-1">Edit</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FORM MODAL (BUAT / EDIT PENAWARAN) */}
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

      {/* PREVIEW & CETAK PDF MODAL */}
      <QuotationPreviewModal
        visible={previewModalVisible}
        quotation={previewQuotation}
        onClose={() => {
          setPreviewModalVisible(false);
          setPreviewQuotation(null);
        }}
      />
    </View>
  );
}
