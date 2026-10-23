import { InvoiceFormModal } from '@/components/invoice/InvoiceFormModal';
import { confirmDialog } from '@/lib/confirm';
import { Invoice, SaveInvoicePayload } from '@/services/invoiceService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createInvoice,
  deleteInvoice,
  fetchInvoices,
  updateInvoice
} from '@/store/slices/invoiceSlice';
import { formatIndonesianDate, formatRupiah } from '@/utils/terbilang';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  HandCoins,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
  Wallet
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View
} from 'react-native';

type StatusFilter = 'all' | 'unpaid' | 'partial' | 'paid' | 'cancelled';

export default function InvoicesScreen() {
  const dispatch = useAppDispatch();
  const { invoices, isLoading } = useAppSelector((state) => state.invoice);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');

  // Modal States
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Load invoices on mount
  useEffect(() => {
    dispatch(fetchInvoices());
  }, [dispatch]);

  const onRefresh = () => {
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
    if (selectedInvoice) {
      await dispatch(updateInvoice({ id: selectedInvoice.id, payload })).unwrap();
    } else {
      await dispatch(createInvoice(payload)).unwrap();
    }
    dispatch(fetchInvoices());
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
      try {
        await dispatch(deleteInvoice(inv.id)).unwrap();
      } catch (err: any) {
        Alert.alert('Gagal', err || 'Gagal menghapus invoice.');
      }
    }
  };

  // Helper Badge Status
  const renderStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return (
          <View className="flex-row items-center bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 rounded-full">
            <CheckCircle2 size={11} color="#34D399" />
            <Text className="text-emerald-300 text-[10px] font-bold ml-1 uppercase">
              Lunas (Paid)
            </Text>
          </View>
        );
      case 'partial':
        return (
          <View className="flex-row items-center bg-sky-500/20 border border-sky-500/40 px-2.5 py-1 rounded-full">
            <Clock size={11} color="#38BDF8" />
            <Text className="text-sky-300 text-[10px] font-bold ml-1 uppercase">
              Sebagian (Partial)
            </Text>
          </View>
        );
      case 'cancelled':
        return (
          <View className="flex-row items-center bg-slate-700/50 border border-slate-600 px-2.5 py-1 rounded-full">
            <AlertCircle size={11} color="#94A3B8" />
            <Text className="text-slate-400 text-[10px] font-bold ml-1 uppercase">
              Dibatalkan
            </Text>
          </View>
        );
      case 'unpaid':
      default:
        return (
          <View className="flex-row items-center bg-rose-500/20 border border-rose-500/40 px-2.5 py-1 rounded-full">
            <AlertCircle size={11} color="#FB7185" />
            <Text className="text-rose-300 text-[10px] font-bold ml-1 uppercase">
              Belum Bayar (Unpaid)
            </Text>
          </View>
        );
    }
  };

  return (
    <View className="flex-1 bg-slate-900">
      <ScrollView
        className="flex-1 px-4 py-6 md:px-8"
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor="#38BDF8"
            colors={['#38BDF8']}
          />
        }
      >
        {/* HEADER & ACTION BUTTONS */}
        <View className="flex-col md:flex-row md:items-center justify-between mb-6 pb-5 border-b border-slate-800 gap-4">
          <View>
            <Text className="text-white font-black text-2xl tracking-tight">
              INVOICE & TAGIHAN
            </Text>
            <Text className="text-slate-400 text-xs mt-1">
              Kelola penagihan resmi, pelacakan termin, dan mutasi pembayaran klien Alora Studio
            </Text>
          </View>

          <View className="flex-row items-center space-x-2.5">
            <Pressable
              onPress={onRefresh}
              className="p-2.5 bg-slate-800 border border-slate-700 rounded-xl"
            >
              <RefreshCw size={15} color="#94A3B8" />
            </Pressable>

            <Pressable
              onPress={handleOpenCreateModal}
              className="flex-row items-center bg-sky-500 hover:bg-sky-600 px-4 py-2.5 rounded-xl shadow-lg shadow-sky-500/20"
            >
              <Plus size={16} color="#FFFFFF" />
              <Text className="text-white font-bold text-xs ml-1.5">Buat Invoice</Text>
            </Pressable>
          </View>
        </View>

        {/* WIDGET KARTU RINGKASAN FINANSIAL */}
        <View className="flex-row flex-wrap -mx-2 mb-6">
          {/* Total Tagihan */}
          <View className="w-full sm:w-1/2 lg:w-1/3 px-2 mb-3">
            <View className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl flex-row items-center justify-between shadow-sm">
              <View>
                <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  Total Nilai Tagihan
                </Text>
                <Text className="text-white text-xl font-black mt-1">
                  {formatRupiah(stats.totalBilled)}
                </Text>
                <Text className="text-slate-400 text-[11px] mt-0.5">
                  Dari {stats.totalCount} invoice aktif
                </Text>
              </View>
              <View className="w-10 h-10 rounded-xl bg-blue-500/10 items-center justify-center border border-blue-500/20">
                <FileText size={20} color="#38BDF8" />
              </View>
            </View>
          </View>

          {/* Total Sudah Terbayar */}
          <View className="w-full sm:w-1/2 lg:w-1/3 px-2 mb-3">
            <View className="bg-slate-950/80 border border-emerald-900/40 p-4 rounded-2xl flex-row items-center justify-between shadow-sm">
              <View>
                <Text className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                  Total Terbayar (Masuk)
                </Text>
                <Text className="text-emerald-400 text-xl font-black mt-1">
                  {formatRupiah(stats.totalPaid)}
                </Text>
                <Text className="text-emerald-500/80 text-[11px] mt-0.5">
                  {stats.paidCount} lunas • {stats.partialCount} termin aktif
                </Text>
              </View>
              <View className="w-10 h-10 rounded-xl bg-emerald-500/10 items-center justify-center border border-emerald-500/20">
                <Wallet size={20} color="#34D399" />
              </View>
            </View>
          </View>

          {/* Sisa Piutang / Balance Due */}
          <View className="w-full sm:w-1/2 lg:w-1/3 px-2 mb-3">
            <View className="bg-slate-950/80 border border-rose-900/40 p-4 rounded-2xl flex-row items-center justify-between shadow-sm">
              <View>
                <Text className="text-rose-400 text-xs font-semibold uppercase tracking-wider">
                  Sisa Piutang (Balance Due)
                </Text>
                <Text className="text-rose-400 text-xl font-black mt-1">
                  {formatRupiah(stats.totalBalanceDue)}
                </Text>
                <Text className="text-rose-400/80 text-[11px] mt-0.5">
                  {stats.unpaidCount} belum bayar sama sekali
                </Text>
              </View>
              <View className="w-10 h-10 rounded-xl bg-rose-500/10 items-center justify-center border border-rose-500/20">
                <HandCoins size={20} color="#FB7185" />
              </View>
            </View>
          </View>
        </View>

        {/* PENCARIAN & FILTER STATUS */}
        <View className="flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
          {/* Search Box */}
          <View className="flex-1 flex-row items-center bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl">
            <Search size={15} color="#64748B" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Cari no invoice, nama klien, atau alamat..."
              placeholderTextColor="#64748B"
              className="flex-1 ml-2 text-white text-xs"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Text className="text-slate-400 text-xs">Clear</Text>
              </Pressable>
            )}
          </View>

          {/* Filter Status Tabs */}
          <View className="flex-row items-center bg-slate-950 border border-slate-800 p-1 rounded-xl overflow-x-auto">
            <Pressable
              onPress={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg ${activeFilter === 'all' ? 'bg-sky-500' : 'bg-transparent'
                }`}
            >
              <Text
                className={`text-xs font-bold ${activeFilter === 'all' ? 'text-white' : 'text-slate-400'
                  }`}
              >
                Semua ({invoices.length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveFilter('unpaid')}
              className={`px-3 py-1.5 rounded-lg ml-1 ${activeFilter === 'unpaid' ? 'bg-rose-500' : 'bg-transparent'
                }`}
            >
              <Text
                className={`text-xs font-bold ${activeFilter === 'unpaid' ? 'text-white' : 'text-slate-400'
                  }`}
              >
                Unpaid ({stats.unpaidCount})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveFilter('partial')}
              className={`px-3 py-1.5 rounded-lg ml-1 ${activeFilter === 'partial' ? 'bg-sky-500' : 'bg-transparent'
                }`}
            >
              <Text
                className={`text-xs font-bold ${activeFilter === 'partial' ? 'text-white' : 'text-slate-400'
                  }`}
              >
                Partial ({stats.partialCount})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveFilter('paid')}
              className={`px-3 py-1.5 rounded-lg ml-1 ${activeFilter === 'paid' ? 'bg-emerald-600' : 'bg-transparent'
                }`}
            >
              <Text
                className={`text-xs font-bold ${activeFilter === 'paid' ? 'text-white' : 'text-slate-400'
                  }`}
              >
                Paid ({stats.paidCount})
              </Text>
            </Pressable>
          </View>
        </View>

        {/* DAFTAR KARTU INVOICE */}
        {filteredInvoices.length === 0 ? (
          <View className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-12 items-center justify-center">
            <FileText size={48} color="#475569" />
            <Text className="text-white font-bold text-base mt-4">Tidak ada data invoice</Text>
            <Text className="text-slate-400 text-xs text-center mt-1 max-w-sm">
              {searchQuery
                ? `Tidak ditemukan invoice dengan kata kunci "${searchQuery}".`
                : 'Belum ada invoice yang dibuat. Klik tombol "Buat Invoice" untuk membuat tagihan baru.'}
            </Text>
            {!searchQuery && (
              <Pressable
                onPress={handleOpenCreateModal}
                className="mt-4 bg-sky-500 hover:bg-sky-600 px-4 py-2 rounded-xl"
              >
                <Text className="text-white font-bold text-xs">+ Buat Invoice Pertama</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View className="flex-col space-y-4">
            {filteredInvoices.map((inv) => {
              const paidPct =
                inv.total > 0
                  ? Math.min(100, Math.round((inv.paid_amount / inv.total) * 100))
                  : 0;

              return (
                <View
                  key={inv.id}
                  className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-5 shadow-lg hover:border-slate-700 transition"
                >
                  {/* Top Bar: Nomor Invoice, Tanggal & Status Badge */}
                  <View className="flex-row flex-wrap items-center justify-between pb-3.5 border-b border-slate-800/80 gap-2">
                    <View className="flex-row items-center space-x-2">
                      <Text className="text-sky-400 font-mono font-black text-sm">
                        {inv.invoice_no}
                      </Text>
                      {renderStatusBadge(inv.status)}
                    </View>

                    <View className="flex-row items-center text-slate-400 text-xs">
                      <Calendar size={13} color="#94A3B8" />
                      <Text className="text-slate-400 text-xs ml-1.5">
                        Terbit: {formatIndonesianDate(inv.issue_date)}
                      </Text>
                      {inv.due_date && (
                        <Text className="text-slate-500 text-xs ml-2">
                          • Jatuh Tempo: {formatIndonesianDate(inv.due_date)}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Body: Klien, Alamat, Rincian Item Preview */}
                  <View className="flex-col md:flex-row justify-between py-4 gap-4">
                    <View className="flex-1">
                      <View className="flex-row items-center mb-1">
                        <User size={14} color="#38BDF8" />
                        <Text className="text-white font-bold text-sm ml-1.5">
                          {inv.client_name}
                        </Text>
                        {inv.client_phone && (
                          <Text className="text-slate-400 text-xs ml-2">
                            ({inv.client_phone})
                          </Text>
                        )}
                      </View>

                      {inv.client_address && (
                        <Text className="text-slate-400 text-xs mb-2">
                          Alamat: {inv.client_address}
                        </Text>
                      )}

                      {/* Item Preview */}
                      <View className="mt-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/60">
                        <Text className="text-slate-400 text-[11px] font-semibold mb-1">
                          Item Tagihan ({inv.invoice_items?.length || 0} item):
                        </Text>
                        {(inv.invoice_items || []).slice(0, 3).map((it, idx) => (
                          <Text
                            key={idx}
                            className="text-slate-300 text-xs truncate"
                            numberOfLines={1}
                          >
                            • {it.description} ({it.quantity} {it.unit})
                          </Text>
                        ))}
                        {(inv.invoice_items?.length || 0) > 3 && (
                          <Text className="text-sky-400 text-[10px] mt-0.5">
                            + {(inv.invoice_items?.length || 0) - 3} item lainnya...
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Financial Summary Column & Progress */}
                    <View className="w-full md:w-72 bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex-col justify-between">
                      <View>
                        <View className="flex-row justify-between items-center mb-1">
                          <Text className="text-slate-400 text-xs">Total Tagihan:</Text>
                          <Text className="text-white font-black text-sm">
                            {formatRupiah(inv.total)}
                          </Text>
                        </View>

                        <View className="flex-row justify-between items-center mb-1">
                          <Text className="text-emerald-400 text-xs">Sudah Dibayar:</Text>
                          <Text className="text-emerald-400 font-bold text-sm">
                            {formatRupiah(inv.paid_amount)}
                          </Text>
                        </View>

                        <View className="flex-row justify-between items-center mb-2">
                          <Text className="text-rose-400 text-xs">Sisa Tagihan:</Text>
                          <Text className="text-rose-400 font-black text-sm">
                            {formatRupiah(inv.balance_due)}
                          </Text>
                        </View>

                        {/* Progress Bar */}
                        <View className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-1">
                          <View
                            className={`h-full ${paidPct >= 100
                              ? 'bg-emerald-500'
                              : paidPct > 0
                                ? 'bg-sky-500'
                                : 'bg-slate-700'
                              }`}
                            style={{ width: `${paidPct}%` }}
                          />
                        </View>
                        <View className="flex-row justify-between items-center">
                          <Text className="text-slate-400 text-[10px]">Progress Bayar</Text>
                          <Text className="text-slate-300 font-bold text-[10px]">
                            {paidPct}%
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Footer Actions */}
                  <View className="flex-row flex-wrap items-center justify-between pt-3 border-t border-slate-800/80 gap-2">
                    <View className="flex-row items-center">
                      <Text className="text-slate-400 text-[11px]">
                        Rekening: {inv.bank_name} • {inv.bank_account_no} (a.n. {inv.bank_account_holder})
                      </Text>
                    </View>

                    <View className="flex-row items-center space-x-2">
                      {/* Tombol Edit */}
                      <Pressable
                        onPress={() => handleOpenEditModal(inv)}
                        className="flex-row items-center bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700"
                      >
                        <Pencil size={13} color="#94A3B8" />
                        <Text className="text-slate-300 text-xs font-semibold ml-1">Edit</Text>
                      </Pressable>

                      {/* Tombol Hapus */}
                      <Pressable
                        onPress={() => handleDeleteInvoice(inv)}
                        className="flex-row items-center bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-xl border border-rose-500/30"
                      >
                        <Trash2 size={13} color="#FB7185" />
                        <Text className="text-rose-300 text-xs font-semibold ml-1">Hapus</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FORM MODAL (CREATE / EDIT) */}
      <InvoiceFormModal
        visible={formModalVisible}
        onClose={() => setFormModalVisible(false)}
        onSave={handleSaveInvoice}
        invoice={selectedInvoice}
      />
    </View>
  );
}
