import { confirmDialog } from '@/lib/confirm';
import { Invoice, PaymentReceipt } from '@/services/invoiceService';
import { useAppDispatch } from '@/store/hooks';
import { deletePayment } from '@/store/slices/invoiceSlice';
import { formatIndonesianDate, formatRupiah } from '@/utils/terbilang';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  Plus,
  Printer,
  Receipt,
  Trash2,
  User,
  X
} from 'lucide-react-native';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View
} from 'react-native';

interface InvoiceDetailModalProps {
  visible: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onOpenPaymentRecord: (inv: Invoice) => void;
  onOpenInvoicePdf?: (inv: Invoice) => void;
  onOpenReceiptPdf?: (receipt: PaymentReceipt, inv: Invoice) => void;
}

export function InvoiceDetailModal({
  visible,
  onClose,
  invoice,
  onOpenPaymentRecord,
  onOpenInvoicePdf,
  onOpenReceiptPdf,
}: InvoiceDetailModalProps) {
  const dispatch = useAppDispatch();

  if (!invoice) return null;

  const paidPct =
    invoice.total > 0
      ? Math.min(100, Math.round((invoice.paid_amount / invoice.total) * 100))
      : 0;

  // Handler Hapus Mutasi Pembayaran
  const handleDeletePayment = async (p: PaymentReceipt) => {
    const confirmed = await confirmDialog({
      title: 'Hapus Pembayaran?',
      message: `Hapus mutasi ${p.stage_name} sebesar ${formatRupiah(
        p.amount
      )}? Status saldo invoice akan dihitung ulang secara otomatis.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      destructive: true,
    });

    if (confirmed) {
      try {
        await dispatch(
          deletePayment({ paymentId: p.id, invoiceId: invoice.id })
        ).unwrap();
        Alert.alert('Berhasil', 'Catatan pembayaran telah dihapus.');
      } catch (err: any) {
        Alert.alert('Gagal', err || 'Gagal menghapus pembayaran.');
      }
    }
  };

  // Helper Badge Status
  const renderStatusBadge = () => {
    switch (invoice.status) {
      case 'paid':
        return (
          <View className="flex-row items-center bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 rounded-full">
            <CheckCircle2 size={12} color="#34D399" />
            <Text className="text-emerald-300 text-xs font-bold ml-1.5 uppercase">
              LUNAS (PAID)
            </Text>
          </View>
        );
      case 'partial':
        return (
          <View className="flex-row items-center bg-sky-500/20 border border-sky-500/40 px-3 py-1 rounded-full">
            <Clock size={12} color="#38BDF8" />
            <Text className="text-sky-300 text-xs font-bold ml-1.5 uppercase">
              SEBAGIAN (PARTIAL)
            </Text>
          </View>
        );
      case 'cancelled':
        return (
          <View className="flex-row items-center bg-slate-700/50 border border-slate-600 px-3 py-1 rounded-full">
            <AlertCircle size={12} color="#94A3B8" />
            <Text className="text-slate-400 text-xs font-bold ml-1.5 uppercase">
              DIBATALKAN
            </Text>
          </View>
        );
      case 'unpaid':
      default:
        return (
          <View className="flex-row items-center bg-rose-500/20 border border-rose-500/40 px-3 py-1 rounded-full">
            <AlertCircle size={12} color="#FB7185" />
            <Text className="text-rose-300 text-xs font-bold ml-1.5 uppercase">
              BELUM BAYAR (UNPAID)
            </Text>
          </View>
        );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/80 justify-center items-center p-3 md:p-6">
        <View className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[92%] rounded-2xl overflow-hidden shadow-2xl flex-col">
          {/* Header Modal */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
            <View className="flex-row items-center space-x-3">
              <View className="w-9 h-9 rounded-xl bg-sky-500/10 items-center justify-center mr-2 border border-sky-500/20">
                <Receipt size={18} color="#38BDF8" />
              </View>
              <View>
                <View className="flex-row items-center">
                  <Text className="text-white font-bold text-lg font-mono mr-2.5">
                    {invoice.invoice_no}
                  </Text>
                  {renderStatusBadge()}
                </View>
                <Text className="text-slate-400 text-xs mt-0.5">
                  Ditujukan kepada {invoice.client_name}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center"
            >
              <X size={16} color="#94A3B8" />
            </Pressable>
          </View>

          {/* Modal Body Scrollable */}
          <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
            {/* SALDO & PROGRESS CARD */}
            <View className="bg-slate-950 border border-slate-800 p-5 rounded-2xl mb-6 shadow-md">
              <View className="flex-row flex-wrap justify-between items-center pb-4 border-b border-slate-800/80 gap-3">
                <View>
                  <Text className="text-slate-400 text-xs uppercase font-semibold">
                    Total Nilai Tagihan
                  </Text>
                  <Text className="text-white font-black text-xl mt-1">
                    {formatRupiah(invoice.total)}
                  </Text>
                </View>

                <View>
                  <Text className="text-emerald-400 text-xs uppercase font-semibold">
                    Total Sudah Dibayar
                  </Text>
                  <Text className="text-emerald-400 font-black text-xl mt-1">
                    {formatRupiah(invoice.paid_amount)}
                  </Text>
                </View>

                <View>
                  <Text className="text-rose-400 text-xs uppercase font-semibold">
                    Sisa Piutang (Balance Due)
                  </Text>
                  <Text className="text-rose-400 font-black text-xl mt-1">
                    {formatRupiah(invoice.balance_due)}
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View className="mt-4">
                <View className="flex-row justify-between items-center mb-1.5">
                  <Text className="text-slate-400 text-xs">Progress Pelunasan</Text>
                  <Text className="text-sky-300 font-bold text-xs">{paidPct}% Lunas</Text>
                </View>
                <View className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
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
              </View>
            </View>

            {/* INFORMASI KLIEN & REKENING (DUAL COLUMN) */}
            <View className="flex-row flex-wrap -mx-2 mb-6">
              {/* Kolom Kiri: Data Klien */}
              <View className="w-full md:w-1/2 px-2 mb-4 md:mb-0">
                <View className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl h-full">
                  <Text className="text-sky-400 font-bold text-xs uppercase tracking-wider mb-2.5">
                    Informasi Klien (Bill To)
                  </Text>
                  <View className="space-y-1.5">
                    <View className="flex-row items-center">
                      <User size={13} color="#94A3B8" />
                      <Text className="text-white text-xs font-semibold ml-2">
                        {invoice.client_name}
                      </Text>
                    </View>
                    {invoice.client_phone && (
                      <Text className="text-slate-400 text-xs ml-5">
                        WhatsApp: {invoice.client_phone}
                      </Text>
                    )}
                    {invoice.client_address && (
                      <Text className="text-slate-400 text-xs ml-5">
                        Alamat: {invoice.client_address}
                      </Text>
                    )}
                    <View className="flex-row items-center pt-2">
                      <Calendar size={13} color="#94A3B8" />
                      <Text className="text-slate-400 text-xs ml-2">
                        Terbit: {formatIndonesianDate(invoice.issue_date)}
                      </Text>
                      {invoice.due_date && (
                        <Text className="text-slate-500 text-xs ml-2">
                          • Jatuh Tempo: {formatIndonesianDate(invoice.due_date)}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>

              {/* Kolom Kanan: Rekening Pembayaran */}
              <View className="w-full md:w-1/2 px-2">
                <View className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl h-full">
                  <Text className="text-sky-400 font-bold text-xs uppercase tracking-wider mb-2.5">
                    Rekening Pembayaran Resmi
                  </Text>
                  <View className="space-y-1">
                    <Text className="text-white text-xs font-bold">
                      {invoice.bank_name || 'Bank Mandiri'}
                    </Text>
                    <Text className="text-emerald-400 text-sm font-mono font-bold tracking-wider">
                      {invoice.bank_account_no || '1370026994893'}
                    </Text>
                    <Text className="text-slate-300 text-xs">
                      a.n. {invoice.bank_account_holder || 'M.LAFRAN PANE'}
                    </Text>
                    <Text className="text-slate-500 text-[11px] pt-1">
                      Disahkan oleh: {invoice.authorized_by || 'M Lafran Pane'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* TABEL RINCIAN ITEM TAGIHAN */}
            <View className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl mb-6">
              <Text className="text-sky-400 font-bold text-xs uppercase tracking-wider mb-3">
                Rincian Item Tagihan ({invoice.invoice_items?.length || 0} Item)
              </Text>

              <View className="border border-slate-800 rounded-xl overflow-hidden">
                {/* Table Header */}
                <View className="flex-row bg-slate-900 px-3 py-2 border-b border-slate-800">
                  <Text className="w-10 text-slate-400 text-[11px] font-bold">No</Text>
                  <Text className="flex-1 text-slate-400 text-[11px] font-bold">Deskripsi</Text>
                  <Text className="w-16 text-center text-slate-400 text-[11px] font-bold">Qty</Text>
                  <Text className="w-28 text-right text-slate-400 text-[11px] font-bold">Harga</Text>
                  <Text className="w-32 text-right text-slate-400 text-[11px] font-bold">Jumlah</Text>
                </View>

                {/* Table Rows */}
                {(invoice.invoice_items || []).map((it, idx) => (
                  <View
                    key={it.id || idx}
                    className="flex-row px-3 py-2.5 border-b border-slate-800/60 bg-slate-950/40"
                  >
                    <Text className="w-10 text-slate-500 text-xs font-mono">{it.item_no}</Text>
                    <Text className="flex-1 text-white text-xs font-medium">{it.description}</Text>
                    <Text className="w-16 text-center text-slate-300 text-xs">
                      {it.quantity} {it.unit}
                    </Text>
                    <Text className="w-28 text-right text-slate-300 text-xs font-mono">
                      {formatRupiah(it.unit_price)}
                    </Text>
                    <Text className="w-32 text-right text-emerald-400 text-xs font-bold font-mono">
                      {formatRupiah(it.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* RIWAYAT MUTASI PEMBAYARAN & KWITANSI */}
            <View className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <View>
                  <Text className="text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    Riwayat Mutasi Pembayaran & Kwitansi
                  </Text>
                  <Text className="text-slate-400 text-[11px] mt-0.5">
                    {invoice.payments?.length || 0} transaksi tercatat
                  </Text>
                </View>

                {invoice.balance_due > 0 && (
                  <Pressable
                    onPress={() => onOpenPaymentRecord(invoice)}
                    className="flex-row items-center bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-xl shadow-sm"
                  >
                    <Plus size={13} color="#FFFFFF" />
                    <Text className="text-white font-bold text-xs ml-1">Catat Mutasi</Text>
                  </Pressable>
                )}
              </View>

              {(!invoice.payments || invoice.payments.length === 0) ? (
                <View className="py-6 items-center justify-center bg-slate-900/50 rounded-xl border border-slate-800/60">
                  <CreditCard size={28} color="#475569" />
                  <Text className="text-slate-400 text-xs mt-2">
                    Belum ada pembayaran yang dicatat untuk invoice ini.
                  </Text>
                  {invoice.balance_due > 0 && (
                    <Pressable
                      onPress={() => onOpenPaymentRecord(invoice)}
                      className="mt-3 bg-sky-500/20 border border-sky-500/40 px-3.5 py-1.5 rounded-xl"
                    >
                      <Text className="text-sky-300 font-bold text-xs">
                        + Catat Pembayaran Sekarang
                      </Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <View className="space-y-3">
                  {invoice.payments.map((p) => (
                    <View
                      key={p.id}
                      className="bg-slate-900 border border-slate-800/80 p-3.5 rounded-xl flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <View className="flex-1">
                        <View className="flex-row items-center mb-1">
                          <Text className="text-white font-bold text-sm mr-2">
                            {p.stage_name}
                          </Text>
                          <Text className="text-emerald-400 font-mono font-bold text-sm">
                            {formatRupiah(p.amount)}
                          </Text>
                        </View>

                        <Text className="text-slate-400 text-xs">
                          Kwitansi: #{p.receipt_no} • {formatIndonesianDate(p.payment_date)} • {p.payment_method}
                        </Text>

                        {p.description && (
                          <Text className="text-slate-400 text-[11px] italic mt-0.5">
                            "{p.description}"
                          </Text>
                        )}

                        {/* Bukti Transfer */}
                        {p.proof_url && (
                          <Pressable
                            onPress={() => Linking.openURL(p.proof_url!)}
                            className="flex-row items-center mt-2 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 w-fit"
                          >
                            <ExternalLink size={12} color="#38BDF8" />
                            <Text className="text-sky-400 text-[11px] font-semibold ml-1.5">
                              Lihat Bukti Transfer
                            </Text>
                          </Pressable>
                        )}
                      </View>

                      {/* Aksi Per Pembayaran */}
                      <View className="flex-row items-center space-x-2">
                        {onOpenReceiptPdf && (
                          <Pressable
                            onPress={() => onOpenReceiptPdf(p, invoice)}
                            className="flex-row items-center bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1.5 rounded-xl border border-sky-500/30"
                          >
                            <Printer size={13} color="#38BDF8" />
                            <Text className="text-sky-300 text-xs font-semibold ml-1">
                              Cetak Kwitansi
                            </Text>
                          </Pressable>
                        )}

                        <Pressable
                          onPress={() => handleDeletePayment(p)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 bg-slate-800"
                        >
                          <Trash2 size={13} color="#FB7185" />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Action Buttons */}
          <View className="flex-row flex-wrap items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950 gap-2">
            <View className="flex-row items-center">
              {onOpenInvoicePdf && (
                <Pressable
                  onPress={() => onOpenInvoicePdf(invoice)}
                  className="flex-row items-center bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl border border-slate-700 mr-2"
                >
                  <Printer size={14} color="#94A3B8" />
                  <Text className="text-slate-200 font-bold text-xs ml-1.5">
                    Cetak / Simpan PDF Invoice
                  </Text>
                </Pressable>
              )}
            </View>

            <View className="flex-row items-center space-x-2">
              <Pressable
                onPress={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700"
              >
                <Text className="text-slate-300 font-semibold text-xs">Tutup</Text>
              </Pressable>

              {invoice.balance_due > 0 && (
                <Pressable
                  onPress={() => onOpenPaymentRecord(invoice)}
                  className="flex-row items-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500"
                >
                  <Plus size={14} color="#FFFFFF" />
                  <Text className="text-white font-bold text-xs ml-1.5">
                    Catat Mutasi Pembayaran
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
