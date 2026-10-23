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
    <View className="flex-1 bg-slate-900">
      {/* 1. Offline & Sync Status Banner */}
      {!isOnline && (
        <View className="flex-row items-center justify-between bg-amber-950/80 border-b border-amber-800/80 px-5 py-2">
          <View className="flex-row items-center">
            <View className="w-2.5 h-2.5 rounded-full bg-amber-400 mr-2.5" />
            <Text className="text-amber-200 text-xs font-semibold">
              Mode Offline Aktif
            </Text>
            <Text className="text-amber-400/80 text-xs ml-2">
              • {pendingSyncCount > 0
                ? `${pendingSyncCount} perubahan tersimpan di perangkat lokal`
                : 'Menampilkan data tersimpan di perangkat lokal'}
            </Text>
          </View>
          <Text className="text-amber-300 text-[11px] font-medium">
            {pendingSyncCount > 0 ? `${pendingSyncCount} Antre` : 'Lokal Cache'}
          </Text>
        </View>
      )}

      {isOnline && pendingSyncCount > 0 && (
        <View className="flex-row items-center justify-between bg-blue-950/80 border-b border-blue-800/80 px-5 py-2">
          <View className="flex-row items-center">
            <ActivityIndicator size="small" color="#38BDF8" className="mr-2.5" />
            <Text className="text-blue-200 text-xs font-semibold">
              Menyinkronkan Perubahan ke Cloud
            </Text>
            <Text className="text-blue-400/80 text-xs ml-2">
              • {pendingSyncCount} perubahan sedang disinkronkan...
            </Text>
          </View>
          <Text className="text-sky-300 text-[11px] font-medium">
            Sinkronisasi
          </Text>
        </View>
      )}

      <ScrollView
        className="flex-1 bg-slate-900"
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#38BDF8"
            colors={['#38BDF8']}
          />
        }
      >
      {/* 1. BRANDED HEADER HERO */}
      <View className="bg-slate-950/80 border border-slate-800/80 p-4 md:p-5 rounded-2xl mb-6 shadow-sm">
        <View className="flex-col md:flex-row md:items-center justify-between gap-4">
          <View className="flex-row items-center">
            {/* Logo Alora Studio Badge */}
            <View className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white p-1 border border-slate-700/60 shadow-md items-center justify-center mr-3.5 overflow-hidden">
              <Image
                source={require('../../../assets/images/logo.png')}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text className="text-white font-extrabold text-xl md:text-2xl">
                Selamat Datang, {profile?.full_name || 'Staff Alora'} 👋
              </Text>
              <Text className="text-slate-400 text-xs md:text-sm mt-0.5">
                Alora Studio • Interior Design & Custom Furniture
              </Text>
            </View>
          </View>

          <View className="flex-row items-center space-x-2">
            {/* Badge Tanggal Hari Ini */}
            <View className="flex-row items-center bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl mr-2">
              <Calendar size={14} color="#38BDF8" />
              <Text className="text-slate-300 text-xs font-semibold ml-2">
                {formatIndonesianDate(new Date().toISOString().split('T')[0])}
              </Text>
            </View>

            {/* Tombol Refresh */}
            <Pressable
              onPress={handleRefresh}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              className="flex-row items-center bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl border border-slate-700"
            >
              <RefreshCw size={14} color="#CBD5E1" />
              <Text className="text-slate-200 text-xs font-semibold ml-1.5">Refresh</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {isGlobalLoading ? (
        <View className="py-24 items-center justify-center">
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text className="text-slate-400 text-xs mt-3 font-medium">
            Memuat data dashboard Alora Studio...
          </Text>
        </View>
      ) : (
        <>
          {/* 2. TOP 4 EXECUTIVE KPI CARDS */}
          <View className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
            {/* Card 1: Total Invoiced */}
            <View className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl shadow-sm justify-between">
              <View className="flex-row items-center justify-between">
                <Text className="text-slate-400 text-xs font-medium">Total Tagihan Terbit</Text>
                <View className="w-8 h-8 rounded-xl bg-sky-500/10 items-center justify-center border border-sky-500/20">
                  <FileText size={16} color="#38BDF8" />
                </View>
              </View>
              <View className="mt-3">
                <Text className="text-white font-black text-xl md:text-2xl" numberOfLines={1}>
                  {formatRupiah(financialStats.totalBilled)}
                </Text>
                <Text className="text-slate-500 text-[11px] mt-1">
                  Dari {financialStats.totalCount} invoice aktif resmi
                </Text>
              </View>
            </View>

            {/* Card 2: Kas Masuk / Terbayar */}
            <View className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl shadow-sm justify-between">
              <View className="flex-row items-center justify-between">
                <Text className="text-slate-400 text-xs font-medium">Total Kas Masuk (Lunas/DP)</Text>
                <View className="w-8 h-8 rounded-xl bg-emerald-500/10 items-center justify-center border border-emerald-500/20">
                  <Wallet size={16} color="#34D399" />
                </View>
              </View>
              <View className="mt-3">
                <Text className="text-emerald-400 font-black text-xl md:text-2xl" numberOfLines={1}>
                  {formatRupiah(financialStats.totalPaid)}
                </Text>
                <Text className="text-emerald-500/80 text-[11px] mt-1 font-semibold">
                  ✓ {financialStats.paidPct}% dari total tagihan terbayar
                </Text>
              </View>
            </View>

            {/* Card 3: Sisa Piutang Tertahan */}
            <View className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl shadow-sm justify-between">
              <View className="flex-row items-center justify-between">
                <Text className="text-slate-400 text-xs font-medium">Sisa Piutang Tertahan</Text>
                <View className="w-8 h-8 rounded-xl bg-rose-500/10 items-center justify-center border border-rose-500/20">
                  <Clock size={16} color="#FB7185" />
                </View>
              </View>
              <View className="mt-3">
                <Text className="text-rose-400 font-black text-xl md:text-2xl" numberOfLines={1}>
                  {formatRupiah(financialStats.totalBalanceDue)}
                </Text>
                <Text className="text-slate-500 text-[11px] mt-1">
                  {financialStats.unpaidCount + financialStats.partialCount} tagihan belum lunas
                </Text>
              </View>
            </View>

            {/* Card 4: Proyek Aktif di Kanban */}
            <View className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl shadow-sm justify-between">
              <View className="flex-row items-center justify-between">
                <Text className="text-slate-400 text-xs font-medium">Proyek Aktif (Kanban)</Text>
                <View className="w-8 h-8 rounded-xl bg-indigo-500/10 items-center justify-center border border-indigo-500/20">
                  <Layers size={16} color="#818CF8" />
                </View>
              </View>
              <View className="mt-3">
                <Text className="text-indigo-400 font-black text-xl md:text-2xl">
                  {boardStats.totalCards} Proyek
                </Text>
                <Text className="text-slate-500 text-[11px] mt-1" numberOfLines={1}>
                  Estimasi: {formatRupiah(boardStats.totalEstimatedValue)}
                </Text>
              </View>
            </View>
          </View>

          {/* 3. SHORTCUTS / AKSI CEPAT */}
          <View className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl mb-6">
            <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">
              ⚡ Aksi Cepat
            </Text>
            <View className="flex-row flex-wrap gap-2.5">
              <Pressable
                onPress={() => router.push('/(backoffice)/boards')}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                className="flex-row items-center bg-indigo-600/20 border border-indigo-500/40 px-3.5 py-2.5 rounded-xl hover:bg-indigo-600/30"
              >
                <Layers size={15} color="#A5B4FC" />
                <Text className="text-indigo-200 text-xs font-bold ml-2">Buka Board Kanban</Text>
              </Pressable>

              <Pressable
                onPress={() => router.push('/(backoffice)/quotations')}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                className="flex-row items-center bg-blue-600/20 border border-blue-500/40 px-3.5 py-2.5 rounded-xl hover:bg-blue-600/30"
              >
                <FileCheck size={15} color="#38BDF8" />
                <Text className="text-sky-200 text-xs font-bold ml-2">Surat Penawaran</Text>
              </Pressable>

              <Pressable
                onPress={() => router.push('/(backoffice)/invoices')}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                className="flex-row items-center bg-emerald-600/20 border border-emerald-500/40 px-3.5 py-2.5 rounded-xl hover:bg-emerald-600/30"
              >
                <DollarSign size={15} color="#34D399" />
                <Text className="text-emerald-200 text-xs font-bold ml-2">Invoice & Penagihan</Text>
              </Pressable>
            </View>
          </View>

          {/* 4. DUA KOLOM: PIPELINE PENAWARAN & STATUS PENAGIHAN */}
          <View className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
            {/* Kolom Kiri: Funnel Penawaran (Quotations) */}
            <View className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl">
              <View className="flex-row items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
                <View className="flex-row items-center">
                  <FileCheck size={17} color="#38BDF8" />
                  <Text className="text-white font-bold text-sm ml-2">
                    Pipeline Surat Penawaran
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push('/(backoffice)/quotations')}
                  className="flex-row items-center"
                >
                  <Text className="text-sky-400 text-xs font-semibold mr-1">Kelola</Text>
                  <ArrowRight size={13} color="#38BDF8" />
                </Pressable>
              </View>

              {/* Grid 4 Status Penawaran */}
              <View className="grid grid-cols-2 gap-2.5 mb-4">
                <View className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <Text className="text-amber-400 text-xs font-bold">Draft</Text>
                  <Text className="text-white font-extrabold text-lg mt-1">
                    {quotationStats.draft}
                  </Text>
                  <Text className="text-slate-500 text-[10px]">Belum dikirim</Text>
                </View>

                <View className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <Text className="text-sky-400 text-xs font-bold">Terkirim</Text>
                  <Text className="text-white font-extrabold text-lg mt-1">
                    {quotationStats.sent}
                  </Text>
                  <Text className="text-slate-500 text-[10px]">Menunggu respon</Text>
                </View>

                <View className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <Text className="text-emerald-400 text-xs font-bold">Disetujui</Text>
                  <Text className="text-white font-extrabold text-lg mt-1">
                    {quotationStats.approved}
                  </Text>
                  <Text className="text-slate-500 text-[10px]">Siap jadi invoice</Text>
                </View>

                <View className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <Text className="text-rose-400 text-xs font-bold">Ditolak</Text>
                  <Text className="text-white font-extrabold text-lg mt-1">
                    {quotationStats.rejected}
                  </Text>
                  <Text className="text-slate-500 text-[10px]">Perlu follow-up</Text>
                </View>
              </View>

              <View className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex-row items-center justify-between">
                <Text className="text-slate-400 text-xs">Potensi Nilai Penawaran Aktif:</Text>
                <Text className="text-amber-400 font-black text-sm">
                  {formatRupiah(quotationStats.pipelineValue)}
                </Text>
              </View>
            </View>

            {/* Kolom Kanan: Kesehatan Penagihan Invoice (Billing Health) */}
            <View className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl">
              <View className="flex-row items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
                <View className="flex-row items-center">
                  <TrendingUp size={17} color="#34D399" />
                  <Text className="text-white font-bold text-sm ml-2">
                    Kesehatan Penagihan Invoice
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push('/(backoffice)/invoices')}
                  className="flex-row items-center"
                >
                  <Text className="text-sky-400 text-xs font-semibold mr-1">Rincian</Text>
                  <ArrowRight size={13} color="#38BDF8" />
                </Pressable>
              </View>

              {/* Progress Bar Akumulasi */}
              <View className="mb-4">
                <View className="flex-row justify-between mb-1.5">
                  <Text className="text-slate-400 text-xs">Realisasi Pembayaran Tagihan</Text>
                  <Text className="text-emerald-400 text-xs font-black">
                    {financialStats.paidPct}% Terbayar
                  </Text>
                </View>
                <View className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-800">
                  <View
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${financialStats.paidPct}%` }}
                  />
                </View>
              </View>

              {/* Status Breakdown Bar */}
              <View className="grid grid-cols-3 gap-2 text-center mb-4">
                <View className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 items-center">
                  <Text className="text-emerald-400 font-bold text-sm">
                    {financialStats.paidCount}
                  </Text>
                  <Text className="text-slate-400 text-[10px] mt-0.5">Lunas</Text>
                </View>

                <View className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 items-center">
                  <Text className="text-sky-400 font-bold text-sm">
                    {financialStats.partialCount}
                  </Text>
                  <Text className="text-slate-400 text-[10px] mt-0.5">Sebagian (DP)</Text>
                </View>

                <View className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 items-center">
                  <Text className="text-rose-400 font-bold text-sm">
                    {financialStats.unpaidCount}
                  </Text>
                  <Text className="text-slate-400 text-[10px] mt-0.5">Belum Bayar</Text>
                </View>
              </View>

              <View className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex-row items-center justify-between">
                <Text className="text-slate-400 text-xs">Total Kas Masuk Terkumpul:</Text>
                <Text className="text-emerald-400 font-black text-sm">
                  {formatRupiah(financialStats.totalPaid)}
                </Text>
              </View>
            </View>
          </View>

          {/* 5. PERINGATAN JATUH TEMPO (URGENT ATTENTION) */}
          <View className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl mb-6">
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
              <View className="flex-row items-center">
                <AlertTriangle size={16} color="#FBBF24" />
                <Text className="text-white font-bold text-sm ml-2">
                  Peringatan Jatuh Tempo & Perlu Perhatian
                </Text>
              </View>
              <Text className="text-slate-500 text-xs">Mendekati / Lewat Tempo</Text>
            </View>

            {urgentInvoices.length === 0 ? (
              <View className="py-6 items-center justify-center">
                <CheckCircle2 size={32} color="#34D399" />
                <Text className="text-slate-300 font-semibold text-xs mt-2">
                  Semua penagihan dalam batas tempo aman
                </Text>
                <Text className="text-slate-500 text-[11px] mt-0.5">
                  Tidak ada tagihan yang melewati batas jatuh tempo atau jatuh tempo dalam 7 hari ini.
                </Text>
              </View>
            ) : (
              <View className="space-y-2.5">
                {urgentInvoices.map((inv) => {
                  const isOverdue = inv.diffDays < 0;
                  return (
                    <View
                      key={inv.id}
                      className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex-col md:flex-row md:items-center justify-between gap-2"
                    >
                      <View className="flex-row items-center space-x-2">
                        <View
                          className={`px-2.5 py-1 rounded-lg border mr-2 ${
                            isOverdue
                              ? 'bg-rose-950/80 border-rose-800 text-rose-400'
                              : 'bg-amber-950/80 border-amber-800 text-amber-400'
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-bold ${
                              isOverdue ? 'text-rose-400' : 'text-amber-400'
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
                          <Text className="text-white font-bold text-xs">
                            {inv.invoice_no} • {inv.client_name}
                          </Text>
                          <Text className="text-slate-400 text-[11px]">
                            Jatuh Tempo: {formatIndonesianDate(inv.due_date!)}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center justify-between md:justify-end gap-3">
                        <View className="text-right">
                          <Text className="text-slate-400 text-[10px]">Sisa Piutang:</Text>
                          <Text className="text-rose-400 font-bold text-xs">
                            {formatRupiah(inv.balance_due)}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => router.push('/(backoffice)/invoices')}
                          className="bg-sky-600/20 border border-sky-500/40 px-3 py-1.5 rounded-lg"
                        >
                          <Text className="text-sky-300 text-xs font-semibold">Tagih</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* 6. RIWAYAT MUTASI PEMBAYARAN TERAKHIR (RECENT PAYMENTS) */}
          <View className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl mb-6">
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
              <View className="flex-row items-center">
                <Wallet size={16} color="#34D399" />
                <Text className="text-white font-bold text-sm ml-2">
                  Riwayat Pembayaran Termin Terbaru
                </Text>
              </View>
              <Pressable
                onPress={() => router.push('/(backoffice)/invoices')}
                className="flex-row items-center"
              >
                <Text className="text-sky-400 text-xs font-semibold mr-1">Semua Invoice</Text>
                <ArrowRight size={13} color="#38BDF8" />
              </Pressable>
            </View>

            {recentPayments.length === 0 ? (
              <View className="py-6 items-center justify-center">
                <Text className="text-slate-500 text-xs">Belum ada mutasi pembayaran tercatat.</Text>
              </View>
            ) : (
              <View className="space-y-2">
                {recentPayments.map((p) => (
                  <View
                    key={p.id}
                    className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex-row items-center justify-between"
                  >
                    <View className="flex-1 mr-3">
                      <View className="flex-row items-center space-x-2">
                        <Text className="text-sky-400 font-mono text-xs font-bold mr-2">
                          {p.receipt_no}
                        </Text>
                        <Text className="text-slate-300 font-semibold text-xs" numberOfLines={1}>
                          {p.clientName} ({p.invoiceNo})
                        </Text>
                      </View>
                      <Text className="text-slate-500 text-[11px] mt-0.5">
                        {p.stage_name} • {formatIndonesianDate(p.payment_date)}
                      </Text>
                    </View>

                    <View className="items-end">
                      <Text className="text-emerald-400 font-black text-xs md:text-sm">
                        + {formatRupiah(p.amount)}
                      </Text>
                      <Text className="text-slate-500 text-[10px]">{p.payment_method}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* 7. FOOTER & USER SESSION */}
          <View className="flex-col md:flex-row items-center justify-between pt-4 border-t border-slate-800 gap-3">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 items-center justify-center mr-2.5">
                <User size={15} color="#94A3B8" />
              </View>
              <View>
                <Text className="text-slate-200 text-xs font-semibold">
                  {profile?.full_name || 'Staff User'}
                </Text>
                <Text className="text-slate-500 text-[11px]">
                  Role: {profile?.role || 'Staff'} {user?.email ? `• ${user.email}` : ''}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleSignOut}
              disabled={authLoading}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              className="flex-row items-center bg-rose-950/60 hover:bg-rose-950 border border-rose-800/60 px-4 py-2 rounded-xl"
            >
              <LogOut size={14} color="#FB7185" />
              <Text className="text-rose-300 text-xs font-bold ml-2">
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
