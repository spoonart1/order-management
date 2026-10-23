import { confirmDialog } from '@/lib/confirm';
import { useNetworkStatus } from '@/lib/network';
import { boardCacheService } from '@/services/boardCacheService';
import { invoiceCacheService } from '@/services/invoiceCacheService';
import { Invoice, PaymentReceipt } from '@/services/invoiceService';
import { offlineQueueService } from '@/services/offlineQueueService';
import { quotationCacheService } from '@/services/quotationCacheService';
import { syncService } from '@/services/syncService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { signOut } from '@/store/slices/authSlice';
import { fetchBoardByType, setBoardFromCache } from '@/store/slices/boardSlice';
import { fetchInvoices, setInvoicesFromCache } from '@/store/slices/invoiceSlice';
import { fetchQuotations, setQuotationsFromCache } from '@/store/slices/quotationSlice';
import { formatIndonesianDate, formatRupiah } from '@/utils/terbilang';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileCheck,
  FileText,
  Layers,
  LogOut,
  Plus,
  RefreshCw,
  TrendingUp,
  User,
  Wallet,
  XCircle,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

export default function DashboardScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { user, profile, isLoading: authLoading } = useAppSelector((state) => state.auth);
  const { invoices, isLoading: invoiceLoading } = useAppSelector((state) => state.invoice);
  const { quotations, isLoading: quotationLoading } = useAppSelector((state) => state.quotation);
  const { currentBoard, isLoading: boardLoading } = useAppSelector((state) => state.board);

  const [refreshing, setRefreshing] = useState(false);
  const { isOnline } = useNetworkStatus();

  // Status Antrean Mutasi Offline
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  const refreshPendingCount = async () => {
    const count = await offlineQueueService.getCount();
    setPendingSyncCount(count);
  };

  // Inisialisasi pengambilan data ringkasan seluruh modul saat mount (Instant Cache First)
  useEffect(() => {
    let isMounted = true;
    refreshPendingCount();

    // 1. Muat seluruh cache offline secara instan (0ms render)
    Promise.all([
      invoiceCacheService.getInvoicesCache(),
      quotationCacheService.getQuotationsCache(),
      boardCacheService.getBoardCache('marketing'),
    ]).then(([cachedInvoices, cachedQuotations, cachedBoard]) => {
      if (isMounted) {
        if (cachedInvoices && cachedInvoices.length > 0) {
          dispatch(setInvoicesFromCache(cachedInvoices));
        }
        if (cachedQuotations && cachedQuotations.length > 0) {
          dispatch(setQuotationsFromCache(cachedQuotations));
        }
        if (cachedBoard) {
          dispatch(setBoardFromCache(cachedBoard));
        }
      }
    });

    // 2. Ambil data terbaru dari server di latar belakang
    loadDashboardData();

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
        });
    } else {
      refreshPendingCount();
    }
  }, [isOnline]);

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        dispatch(fetchInvoices()).unwrap(),
        dispatch(fetchQuotations()).unwrap(),
        dispatch(fetchBoardByType('marketing')).unwrap(),
      ]);
    } catch (e) {
      // Abaikan jika salah satu fetch gagal agar dashboard tetap tampil
      console.warn('Dashboard fetch warning:', e);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (isOnline) {
      await syncService.processQueue((remaining) => setPendingSyncCount(remaining));
      await refreshPendingCount();
    }
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    const confirmed = await confirmDialog({
      title: 'Konfirmasi Keluar',
      message: 'Apakah Anda yakin ingin keluar dari sistem Alora Studio?',
      confirmText: 'Keluar',
      cancelText: 'Batal',
      destructive: true,
    });

    if (confirmed) {
      dispatch(signOut());
    }
  };

  // 1. Perhitungan Statistik Finansial (Invoices)
  const financialStats = useMemo(() => {
    const activeInvoices = invoices.filter((i) => i.status !== 'cancelled');
    const totalBilled = activeInvoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
    const totalPaid = activeInvoices.reduce((sum, i) => sum + (Number(i.paid_amount) || 0), 0);
    const totalBalanceDue = activeInvoices.reduce(
      (sum, i) => sum + (Number(i.balance_due) || 0),
      0
    );

    const paidPct = totalBilled > 0 ? Math.min(100, Math.round((totalPaid / totalBilled) * 100)) : 0;

    const unpaidCount = activeInvoices.filter((i) => i.status === 'unpaid').length;
    const partialCount = activeInvoices.filter((i) => i.status === 'partial').length;
    const paidCount = activeInvoices.filter((i) => i.status === 'paid').length;

    return {
      totalBilled,
      totalPaid,
      totalBalanceDue,
      paidPct,
      unpaidCount,
      partialCount,
      paidCount,
      totalCount: activeInvoices.length,
    };
  }, [invoices]);

  // 2. Perhitungan Statistik Pipeline Surat Penawaran (Quotations)
  const quotationStats = useMemo(() => {
    const total = quotations.length;
    const draft = quotations.filter((q) => q.status === 'draft').length;
    const sent = quotations.filter((q) => q.status === 'sent').length;
    const approved = quotations.filter((q) => q.status === 'approved').length;
    const rejected = quotations.filter((q) => q.status === 'rejected').length;

    // Nilai penawaran yang aktif (Draft + Terkirim)
    const pipelineValue = quotations
      .filter((q) => q.status === 'draft' || q.status === 'sent')
      .reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);

    const approvedValue = quotations
      .filter((q) => q.status === 'approved')
      .reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);

    return { total, draft, sent, approved, rejected, pipelineValue, approvedValue };
  }, [quotations]);

  // 3. Perhitungan Statistik Kartu Pesanan / Proyek Aktif (Board)
  const boardStats = useMemo(() => {
    if (!currentBoard?.board_columns) return { totalCards: 0, totalEstimatedValue: 0 };

    let totalCards = 0;
    let totalEstimatedValue = 0;

    currentBoard.board_columns.forEach((col) => {
      (col.board_cards || []).forEach((card) => {
        totalCards++;
        totalEstimatedValue += Number(card.estimated_value || 0);
      });
    });

    return { totalCards, totalEstimatedValue };
  }, [currentBoard]);

  // 4. Deteksi Tagihan Jatuh Tempo (Overdue & Mendekati Tempo dalam 7 Hari)
  const urgentInvoices = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return invoices
      .filter((inv) => inv.status !== 'paid' && inv.status !== 'cancelled' && inv.due_date)
      .map((inv) => {
        const dueDate = new Date(inv.due_date!);
        dueDate.setHours(0, 0, 0, 0);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { ...inv, diffDays };
      })
      .filter((inv) => inv.diffDays <= 7) // Overdue atau jatuh tempo <= 7 hari
      .sort((a, b) => a.diffDays - b.diffDays)
      .slice(0, 4);
  }, [invoices]);

  // 5. Riwayat 5 Pembayaran Termin Terbaru (Recent Receipts)
  const recentPayments = useMemo(() => {
    const allPayments: (PaymentReceipt & { invoiceNo: string; clientName: string })[] = [];

    invoices.forEach((inv) => {
      (inv.payments || []).forEach((p) => {
        allPayments.push({
          ...p,
          invoiceNo: inv.invoice_no,
          clientName: inv.client_name,
        });
      });
    });

    return allPayments
      .sort((a, b) => new Date(b.created_at || b.payment_date).getTime() - new Date(a.created_at || a.payment_date).getTime())
      .slice(0, 5);
  }, [invoices]);

  const isGlobalLoading = (invoiceLoading || quotationLoading || boardLoading) && invoices.length === 0;

  return (
    <View className="flex-1 bg-[#F8F6F1]">
      {/* 1. Offline & Sync Status Banner */}
      {!isOnline && (
        <View className="flex-row items-center justify-between bg-[#2B2317] border-b border-[#52442F] px-5 py-2">
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-[#E5B650] mr-2.5" />
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
        <View className="flex-row items-center justify-between bg-[#1B2225] border-b border-[#2C3539] px-5 py-2">
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
        className="flex-1 bg-[#F8F6F1]"
        contentContainerStyle={{ padding: 12, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#968363"
            colors={['#968363']}
          />
        }
      >
        {/* 1. BRANDED HEADER HERO */}
        <View className="bg-white border border-[#E3DDCF] rounded-[4px] p-3.5 md:p-4 mb-3 shadow-xs">
          <View className="flex-col md:flex-row md:items-center justify-between gap-3">
            <View className="flex-row items-center">
              {/* Logo Alora Studio Badge */}
              <View className="w-12 h-12 md:w-14 md:h-14 rounded-[4px] bg-[#FBF9F5] p-1 border border-[#DDD6C8] shadow-xs items-center justify-center mr-3 overflow-hidden">
                <Image
                  source={require('../../../assets/images/logo.png')}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              </View>
              <View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-[#1B2225] font-extrabold text-lg md:text-xl">
                    Selamat Datang, {profile?.full_name || 'Staff Alora'} 👋
                  </Text>
                  <View className="bg-[#F2EDE4] border border-[#DFD6C6] px-2 py-0.5 rounded-[2px] hidden sm:flex">
                    <Text className="text-[#8C7A5C] text-[10px] font-bold uppercase tracking-wider">
                      Backoffice Pro
                    </Text>
                  </View>
                </View>
                <Text className="text-[#70787C] text-xs mt-0.5">
                  Alora Studio • Interior Design & Custom Furniture Production Management
                </Text>
              </View>
            </View>

            <View className="flex-row items-center space-x-2">
              {/* Badge Tanggal Hari Ini */}
              <View className="flex-row items-center bg-[#FAF8F5] border border-[#E2DBD0] px-3 py-1.5 rounded-[3px] mr-2">
                <Calendar size={13} color="#968363" />
                <Text className="text-[#4D555A] text-xs font-medium ml-1.5">
                  {formatIndonesianDate(new Date().toISOString().split('T')[0])}
                </Text>
              </View>

              {/* Tombol Refresh */}
              <Pressable
                onPress={handleRefresh}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                className="flex-row items-center bg-[#1B2225] hover:bg-[#2C373C] px-3 py-1.5 rounded-[3px] shadow-xs"
              >
                <RefreshCw size={13} color="#FFFFFF" />
                <Text className="text-white text-xs font-semibold ml-1.5">Refresh</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {isGlobalLoading ? (
          <View className="py-20 items-center justify-center bg-white border border-[#E3DDCF] rounded-[4px]">
            <ActivityIndicator size="large" color="#968363" />
            <Text className="text-[#70787C] text-xs mt-3 font-medium">
              Memuat data dashboard Alora Studio...
            </Text>
          </View>
        ) : (
          <>
            {/* 2. TOP 4 EXECUTIVE KPI CARDS (Architectural Grid) */}
            <View className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              {/* Card 1: Total Invoiced */}
              <View className="bg-white border border-[#E3DDCF] rounded-[4px] p-3.5 shadow-xs justify-between">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[#70787C] text-[11px] font-semibold uppercase tracking-wider">
                    Total Tagihan Terbit
                  </Text>
                  <View className="bg-[#FAF8F5] border border-[#E2DBD0] px-1.5 py-0.5 rounded-[2px]">
                    <Text className="text-[#968363] text-[10px] font-bold font-mono">INV</Text>
                  </View>
                </View>
                <View className="mt-2.5">
                  <Text className="text-[#1B2225] font-bold text-lg md:text-xl font-mono" numberOfLines={1}>
                    {formatRupiah(financialStats.totalBilled)}
                  </Text>
                  <View className="flex-row items-center justify-between border-t border-[#F2EDE4] pt-1.5 mt-1.5">
                    <Text className="text-[#8A9296] text-[11px]">
                      {financialStats.totalCount} invoice aktif resmi
                    </Text>
                    <Text className="text-emerald-700 font-semibold text-[11px]">Aktif</Text>
                  </View>
                </View>
              </View>

              {/* Card 2: Kas Masuk / Terbayar */}
              <View className="bg-white border border-[#E3DDCF] rounded-[4px] p-3.5 shadow-xs justify-between">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[#70787C] text-[11px] font-semibold uppercase tracking-wider">
                    Total Kas Masuk
                  </Text>
                  <View className="bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-[2px]">
                    <Text className="text-emerald-700 text-[10px] font-bold font-mono">PAID</Text>
                  </View>
                </View>
                <View className="mt-2.5">
                  <Text className="text-emerald-800 font-bold text-lg md:text-xl font-mono" numberOfLines={1}>
                    {formatRupiah(financialStats.totalPaid)}
                  </Text>
                  <View className="flex-row items-center justify-between border-t border-[#F2EDE4] pt-1.5 mt-1.5">
                    <Text className="text-[#8A9296] text-[11px]">
                      {financialStats.paidPct}% dari total tagihan
                    </Text>
                    <Text className="text-emerald-700 font-semibold text-[11px]">Terkumpul</Text>
                  </View>
                </View>
              </View>

              {/* Card 3: Sisa Piutang Tertahan */}
              <View className="bg-white border border-[#E3DDCF] rounded-[4px] p-3.5 shadow-xs justify-between">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[#70787C] text-[11px] font-semibold uppercase tracking-wider">
                    Sisa Piutang Termin
                  </Text>
                  <View className="bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-[2px]">
                    <Text className="text-amber-700 text-[10px] font-bold font-mono">DUE</Text>
                  </View>
                </View>
                <View className="mt-2.5">
                  <Text className="text-[#968363] font-bold text-lg md:text-xl font-mono" numberOfLines={1}>
                    {formatRupiah(financialStats.totalBalanceDue)}
                  </Text>
                  <View className="flex-row items-center justify-between border-t border-[#F2EDE4] pt-1.5 mt-1.5">
                    <Text className="text-[#8A9296] text-[11px]">
                      {financialStats.unpaidCount + financialStats.partialCount} tagihan bertahap
                    </Text>
                    <Text className="text-amber-700 font-semibold text-[11px]">Progres</Text>
                  </View>
                </View>
              </View>

              {/* Card 4: Proyek Aktif di Kanban */}
              <View className="bg-white border border-[#E3DDCF] rounded-[4px] p-3.5 shadow-xs justify-between">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[#70787C] text-[11px] font-semibold uppercase tracking-wider">
                    Proyek Aktif (Kanban)
                  </Text>
                  <View className="bg-[#FAF8F5] border border-[#E2DBD0] px-1.5 py-0.5 rounded-[2px]">
                    <Text className="text-[#1B2225] text-[10px] font-bold font-mono">ORDER</Text>
                  </View>
                </View>
                <View className="mt-2.5">
                  <Text className="text-[#1B2225] font-bold text-lg md:text-xl font-mono">
                    {boardStats.totalCards} Proyek
                  </Text>
                  <View className="flex-row items-center justify-between border-t border-[#F2EDE4] pt-1.5 mt-1.5">
                    <Text className="text-[#8A9296] text-[11px]" numberOfLines={1}>
                      Est: {formatRupiah(boardStats.totalEstimatedValue)}
                    </Text>
                    <Text className="text-[#968363] font-semibold text-[11px]">Workshop</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 3. SHORTCUTS / AKSI CEPAT (Architectural Action Strip) */}
            <View className="bg-white border border-[#E3DDCF] rounded-[4px] p-3 mb-3 shadow-xs">
              <View className="flex-row items-center justify-between mb-2.5">
                <Text className="text-[#1B2225] text-[11px] font-bold uppercase tracking-wider">
                  Aksi Cepat & Navigasi Operasional
                </Text>
                <Text className="text-[#8A9296] text-[10px]">Alora Studio Workspace</Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                <Pressable
                  onPress={() => router.push('/(backoffice)/boards')}
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                  className="flex-row items-center bg-[#FAF8F5] border border-[#DDD6C8] px-3 py-2 rounded-[3px] hover:bg-[#F2EDE4]"
                >
                  <Layers size={13} color="#1B2225" />
                  <Text className="text-[#1B2225] text-xs font-semibold ml-1.5">Buka Board Kanban</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push('/(backoffice)/quotations')}
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                  className="flex-row items-center bg-[#1B2225] border border-[#1B2225] px-3 py-2 rounded-[3px] hover:bg-[#2C373C]"
                >
                  <FileCheck size={13} color="#FFFFFF" />
                  <Text className="text-white text-xs font-semibold ml-1.5">Surat Penawaran</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push('/(backoffice)/invoices')}
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                  className="flex-row items-center bg-[#968363] border border-[#968363] px-3 py-2 rounded-[3px] hover:bg-[#857354]"
                >
                  <DollarSign size={13} color="#FFFFFF" />
                  <Text className="text-white text-xs font-semibold ml-1.5">Invoice & Penagihan</Text>
                </Pressable>
              </View>
            </View>

            {/* 4. DUA KOLOM: PIPELINE PENAWARAN & STATUS PENAGIHAN */}
            <View className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
              {/* Kolom Kiri: Funnel Penawaran (Quotations) */}
              <View className="bg-white border border-[#E3DDCF] rounded-[4px] p-3.5 shadow-xs">
                <View className="flex-row items-center justify-between pb-2.5 border-b border-[#F0EBE1] mb-3">
                  <View className="flex-row items-center">
                    <FileCheck size={15} color="#968363" />
                    <Text className="text-[#1B2225] font-bold text-xs ml-2 font-mono">
                      PIPELINE SURAT PENAWARAN
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => router.push('/(backoffice)/quotations')}
                    className="flex-row items-center"
                  >
                    <Text className="text-[#968363] text-xs font-semibold mr-1">Kelola</Text>
                    <ArrowRight size={12} color="#968363" />
                  </Pressable>
                </View>

                {/* Grid 4 Status Penawaran (Clean Boxed) */}
                <View className="grid grid-cols-2 gap-2 mb-3">
                  <View className="bg-[#FAF8F5] p-2.5 rounded-[3px] border border-[#E8E2D6]">
                    <Text className="text-amber-800 text-[10px] font-bold uppercase tracking-wider">Draft</Text>
                    <Text className="text-[#1B2225] font-bold text-lg mt-0.5 font-mono">
                      {quotationStats.draft}
                    </Text>
                    <Text className="text-[#8A9296] text-[10px]">Belum dikirim</Text>
                  </View>

                  <View className="bg-[#FAF8F5] p-2.5 rounded-[3px] border border-[#E8E2D6]">
                    <Text className="text-sky-800 text-[10px] font-bold uppercase tracking-wider">Terkirim</Text>
                    <Text className="text-[#1B2225] font-bold text-lg mt-0.5 font-mono">
                      {quotationStats.sent}
                    </Text>
                    <Text className="text-[#8A9296] text-[10px]">Menunggu respon</Text>
                  </View>

                  <View className="bg-[#FAF8F5] p-2.5 rounded-[3px] border border-[#E8E2D6]">
                    <Text className="text-emerald-800 text-[10px] font-bold uppercase tracking-wider">Disetujui</Text>
                    <Text className="text-[#1B2225] font-bold text-lg mt-0.5 font-mono">
                      {quotationStats.approved}
                    </Text>
                    <Text className="text-[#8A9296] text-[10px]">Siap jadi invoice</Text>
                  </View>

                  <View className="bg-[#FAF8F5] p-2.5 rounded-[3px] border border-[#E8E2D6]">
                    <Text className="text-rose-800 text-[10px] font-bold uppercase tracking-wider">Ditolak</Text>
                    <Text className="text-[#1B2225] font-bold text-lg mt-0.5 font-mono">
                      {quotationStats.rejected}
                    </Text>
                    <Text className="text-[#8A9296] text-[10px]">Perlu follow-up</Text>
                  </View>
                </View>

                <View className="bg-[#FAF8F5] p-2.5 rounded-[3px] border border-[#E8E2D6] flex-row items-center justify-between">
                  <Text className="text-[#70787C] text-xs">Potensi Nilai Penawaran Aktif:</Text>
                  <Text className="text-[#968363] font-bold text-xs font-mono">
                    {formatRupiah(quotationStats.pipelineValue)}
                  </Text>
                </View>
              </View>

              {/* Kolom Kanan: Kesehatan Penagihan Invoice (Billing Health) */}
              <View className="bg-white border border-[#E3DDCF] rounded-[4px] p-3.5 shadow-xs">
                <View className="flex-row items-center justify-between pb-2.5 border-b border-[#F0EBE1] mb-3">
                  <View className="flex-row items-center">
                    <TrendingUp size={15} color="#065F46" />
                    <Text className="text-[#1B2225] font-bold text-xs ml-2 font-mono">
                      REALISASI PEMBAYARAN INVOICE
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => router.push('/(backoffice)/invoices')}
                    className="flex-row items-center"
                  >
                    <Text className="text-[#968363] text-xs font-semibold mr-1">Rincian</Text>
                    <ArrowRight size={12} color="#968363" />
                  </Pressable>
                </View>

                {/* Progress Bar Akumulasi (Hairline Precision) */}
                <View className="mb-3">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-[#70787C] text-xs">Rasio Pelunasan Kas</Text>
                    <Text className="text-emerald-800 text-xs font-bold font-mono">
                      {financialStats.paidPct}% Terbayar
                    </Text>
                  </View>
                  <View className="w-full bg-[#EAE5DA] h-2 rounded-[2px] overflow-hidden">
                    <View
                      className="h-full bg-emerald-700 rounded-[2px]"
                      style={{ width: `${financialStats.paidPct}%` }}
                    />
                  </View>
                </View>

                {/* Status Breakdown Bar */}
                <View className="grid grid-cols-3 gap-2 text-center mb-3">
                  <View className="bg-[#FAF8F5] p-2 rounded-[3px] border border-[#E8E2D6] items-center">
                    <Text className="text-emerald-800 font-bold text-xs font-mono">
                      {financialStats.paidCount}
                    </Text>
                    <Text className="text-[#70787C] text-[10px] mt-0.5">Lunas</Text>
                  </View>

                  <View className="bg-[#FAF8F5] p-2 rounded-[3px] border border-[#E8E2D6] items-center">
                    <Text className="text-sky-800 font-bold text-xs font-mono">
                      {financialStats.partialCount}
                    </Text>
                    <Text className="text-[#70787C] text-[10px] mt-0.5">Sebagian (DP)</Text>
                  </View>

                  <View className="bg-[#FAF8F5] p-2 rounded-[3px] border border-[#E8E2D6] items-center">
                    <Text className="text-rose-800 font-bold text-xs font-mono">
                      {financialStats.unpaidCount}
                    </Text>
                    <Text className="text-[#70787C] text-[10px] mt-0.5">Belum Bayar</Text>
                  </View>
                </View>

                <View className="bg-[#FAF8F5] p-2.5 rounded-[3px] border border-[#E8E2D6] flex-row items-center justify-between">
                  <Text className="text-[#70787C] text-xs">Total Kas Masuk Terkumpul:</Text>
                  <Text className="text-emerald-800 font-bold text-xs font-mono">
                    {formatRupiah(financialStats.totalPaid)}
                  </Text>
                </View>
              </View>
            </View>

            {/* 5. PERINGATAN JATUH TEMPO (URGENT ATTENTION) */}
            <View className="bg-white border border-[#E3DDCF] rounded-[4px] p-3.5 mb-3 shadow-xs">
              <View className="flex-row items-center justify-between pb-2.5 border-b border-[#F0EBE1] mb-2.5">
                <View className="flex-row items-center">
                  <AlertTriangle size={14} color="#B45309" />
                  <Text className="text-[#1B2225] font-bold text-xs ml-2 font-mono">
                    TAGIHAN JATUH TEMPO & PERLU PERHATIAN
                  </Text>
                </View>
                <Text className="text-[#8A9296] text-[11px]">Mendekati / Lewat Tempo</Text>
              </View>

              {urgentInvoices.length === 0 ? (
                <View className="py-4 items-center justify-center">
                  <CheckCircle2 size={24} color="#059669" />
                  <Text className="text-[#1B2225] font-semibold text-xs mt-1.5">
                    Semua penagihan dalam batas tempo aman
                  </Text>
                  <Text className="text-[#70787C] text-[11px] mt-0.5">
                    Tidak ada tagihan yang melewati batas tempo atau jatuh tempo dalam 7 hari ini.
                  </Text>
                </View>
              ) : (
                <View className="space-y-2">
                  {urgentInvoices.map((inv) => {
                    const isOverdue = inv.diffDays < 0;
                    return (
                      <View
                        key={inv.id}
                        className="bg-[#FAF8F5] border border-[#E8E2D6] p-2.5 rounded-[3px] flex-col md:flex-row md:items-center justify-between gap-2"
                      >
                        <View className="flex-row items-center space-x-2">
                          <View
                            className={`px-1.5 py-0.5 rounded-[2px] border mr-2 ${
                              isOverdue
                                ? 'bg-rose-50 border-rose-200'
                                : 'bg-amber-50 border-amber-200'
                            }`}
                          >
                            <Text
                              className={`text-[9px] font-bold font-mono ${
                                isOverdue ? 'text-rose-700' : 'text-amber-700'
                              }`}
                            >
                              {isOverdue
                                ? `LEWAT ${Math.abs(inv.diffDays)} HARI`
                                : inv.diffDays === 0
                                ? 'HARI INI'
                                : `${inv.diffDays} HARI LAGI`}
                            </Text>
                          </View>
                          <View>
                            <Text className="text-[#1B2225] font-bold text-xs">
                              {inv.invoice_no} • {inv.client_name}
                            </Text>
                            <Text className="text-[#70787C] text-[11px]">
                              Jatuh Tempo: {formatIndonesianDate(inv.due_date!)}
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row items-center justify-between md:justify-end gap-3">
                          <View className="text-right">
                            <Text className="text-[#70787C] text-[10px]">Sisa Piutang:</Text>
                            <Text className="text-[#968363] font-bold text-xs font-mono">
                              {formatRupiah(inv.balance_due)}
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => router.push('/(backoffice)/invoices')}
                            className="bg-[#1B2225] px-2.5 py-1 rounded-[2px]"
                          >
                            <Text className="text-white text-[11px] font-semibold">Tagih</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* 6. RIWAYAT MUTASI PEMBAYARAN TERAKHIR (RECENT PAYMENTS) */}
            <View className="bg-white border border-[#E3DDCF] rounded-[4px] p-3.5 mb-3 shadow-xs">
              <View className="flex-row items-center justify-between pb-2.5 border-b border-[#F0EBE1] mb-2.5">
                <View className="flex-row items-center">
                  <Wallet size={14} color="#065F46" />
                  <Text className="text-[#1B2225] font-bold text-xs ml-2 font-mono">
                    RIWAYAT PEMBAYARAN TERMIN TERBARU
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push('/(backoffice)/invoices')}
                  className="flex-row items-center"
                >
                  <Text className="text-[#968363] text-xs font-semibold mr-1">Semua Invoice</Text>
                  <ArrowRight size={12} color="#968363" />
                </Pressable>
              </View>

              {recentPayments.length === 0 ? (
                <View className="py-4 items-center justify-center">
                  <Text className="text-[#70787C] text-xs">Belum ada mutasi pembayaran tercatat.</Text>
                </View>
              ) : (
                <View className="space-y-1.5">
                  {recentPayments.map((p) => (
                    <View
                      key={p.id}
                      className="bg-[#FAF8F5] border border-[#E8E2D6] p-2.5 rounded-[3px] flex-row items-center justify-between"
                    >
                      <View className="flex-1 mr-3">
                        <View className="flex-row items-center space-x-2">
                          <Text className="text-[#968363] font-mono text-xs font-bold mr-2">
                            {p.receipt_no}
                          </Text>
                          <Text className="text-[#1B2225] font-semibold text-xs" numberOfLines={1}>
                            {p.clientName} ({p.invoiceNo})
                          </Text>
                        </View>
                        <Text className="text-[#70787C] text-[11px] mt-0.5">
                          {p.stage_name} • {formatIndonesianDate(p.payment_date)}
                        </Text>
                      </View>

                      <View className="items-end">
                        <Text className="text-emerald-800 font-bold text-xs md:text-sm font-mono">
                          + {formatRupiah(p.amount)}
                        </Text>
                        <Text className="text-[#8A9296] text-[10px]">{p.payment_method}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* 7. FOOTER & USER SESSION */}
            <View className="flex-col md:flex-row items-center justify-between pt-3 border-t border-[#E3DDCF] gap-2.5">
              <View className="flex-row items-center">
                <View className="w-7 h-7 rounded-[3px] bg-[#FAF8F5] border border-[#DDD6C8] items-center justify-center mr-2">
                  <User size={13} color="#1B2225" />
                </View>
                <View>
                  <Text className="text-[#1B2225] text-xs font-semibold">
                    {profile?.full_name || 'Staff User'}
                  </Text>
                  <Text className="text-[#70787C] text-[11px]">
                    Role: {profile?.role || 'Staff'} {user?.email ? `• ${user.email}` : ''}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={handleSignOut}
                disabled={authLoading}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                className="flex-row items-center bg-[#FAF4F4] hover:bg-[#FCEBEB] border border-[#ECD5D5] px-3 py-1.5 rounded-[3px]"
              >
                <LogOut size={12} color="#9E2A2B" />
                <Text className="text-[#9E2A2B] text-xs font-bold ml-1.5">
                  {authLoading ? 'Keluar...' : 'Keluar Aplikasi'}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
