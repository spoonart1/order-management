import React, { useState } from 'react';
import { confirmDialog } from '@/lib/confirm';
import { Invoice, PaymentReceipt } from '@/services/invoiceService';
import { useAppDispatch } from '@/store/hooks';
import { deletePayment } from '@/store/slices/invoiceSlice';
import { formatIndonesianDate, formatRupiah } from '@/utils/terbilang';
import * as Clipboard from 'expo-clipboard';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
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
  const [copiedBank, setCopiedBank] = useState(false);

  if (!invoice) return null;

  const handleCopyBank = async () => {
    const textToCopy = `${invoice.bank_name || 'Bank Mandiri'}\n${invoice.bank_account_no || '1370026994893'}\n${invoice.bank_account_holder || 'M.LAFRAN PANE'}`;
    try {
      await Clipboard.setStringAsync(textToCopy);
    } catch {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(textToCopy);
      }
    }
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

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
          <View className="flex-row items-center bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-[2px]">
            <CheckCircle2 size={10} color="#059669" />
            <Text className="text-emerald-800 text-[10px] font-bold ml-1 uppercase font-mono">
              LUNAS (PAID)
            </Text>
          </View>
        );
      case 'partial':
        return (
          <View className="flex-row items-center bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-[2px]">
            <Clock size={10} color="#B45309" />
            <Text className="text-amber-800 text-[10px] font-bold ml-1 uppercase font-mono">
              SEBAGIAN (PARTIAL)
            </Text>
          </View>
        );
      case 'cancelled':
        return (
          <View className="flex-row items-center bg-[#FAF8F5] border border-[#DDD6C8] px-2 py-0.5 rounded-[2px]">
            <AlertCircle size={10} color="#70787C" />
            <Text className="text-[#70787C] text-[10px] font-bold ml-1 uppercase font-mono">
              DIBATALKAN
            </Text>
          </View>
        );
      case 'unpaid':
      default:
        return (
          <View className="flex-row items-center bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-[2px]">
            <AlertCircle size={10} color="#9E2A2B" />
            <Text className="text-rose-800 text-[10px] font-bold ml-1 uppercase font-mono">
              BELUM BAYAR (UNPAID)
            </Text>
          </View>
        );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-center items-center p-3 md:p-6">
        <View className="bg-[#F8F6F1] border border-[#DDD6C8] w-full max-w-4xl max-h-[92%] rounded-[4px] overflow-hidden shadow-2xl flex-col">
          {/* Header Modal */}
          <View className="flex-row items-center justify-between px-5 py-3.5 border-b border-[#E3DDCF] bg-white">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-[3px] bg-[#FAF8F5] border border-[#DDD6C8] items-center justify-center mr-2.5">
                <Receipt size={16} color="#968363" />
              </View>
              <View>
                <View className="flex-row items-center">
                  <Text className="text-[#1B2225] font-bold text-base font-mono mr-2">
                    {invoice.invoice_no}
                  </Text>
                  {renderStatusBadge()}
                </View>
                <Text className="text-[#70787C] text-xs mt-0.5">
                  Ditujukan kepada <Text className="font-semibold text-[#1B2225]">{invoice.client_name}</Text>
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              className="w-7 h-7 rounded-[3px] bg-[#FAF8F5] border border-[#DDD6C8] items-center justify-center hover:bg-[#F2ECE1]"
            >
              <X size={15} color="#70787C" />
            </Pressable>
          </View>

          {/* Modal Body Scrollable */}
          <ScrollView className="flex-1 p-4 md:p-5" showsVerticalScrollIndicator={false}>
            {/* SALDO & PROGRESS CARD */}
            <View className="bg-white border border-[#E3DDCF] p-4 rounded-[3px] mb-3.5 shadow-xs">
              <View className="flex-row flex-wrap justify-between items-center pb-3 border-b border-[#EFEAE1] gap-3">
                <View>
                  <Text className="text-[#8A9296] text-[10px] uppercase font-bold tracking-wider">
                    Total Nilai Tagihan
                  </Text>
                  <Text className="text-[#1B2225] font-mono font-bold text-lg mt-0.5">
                    {formatRupiah(invoice.total)}
                  </Text>
                </View>

                <View>
                  <Text className="text-emerald-700 text-[10px] uppercase font-bold tracking-wider">
                    Total Sudah Dibayar
                  </Text>
                  <Text className="text-emerald-700 font-mono font-bold text-lg mt-0.5">
                    {formatRupiah(invoice.paid_amount)}
                  </Text>
                </View>

                <View>
                  <Text className="text-rose-700 text-[10px] uppercase font-bold tracking-wider">
                    Sisa Piutang (Balance Due)
                  </Text>
                  <Text className="text-rose-700 font-mono font-black text-lg mt-0.5">
                    {formatRupiah(invoice.balance_due)}
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View className="mt-3">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-[#70787C] text-xs">Progress Pelunasan</Text>
                  <Text className="text-[#1B2225] font-mono font-bold text-xs">{paidPct}% Lunas</Text>
                </View>
                <View className="w-full bg-[#FAF8F5] border border-[#EDE7DC] h-2 rounded-[2px] overflow-hidden">
                  <View
                    className={`h-full ${
                      paidPct >= 100
                        ? 'bg-emerald-600'
                        : paidPct > 0
                        ? 'bg-[#1B2225]'
                        : 'bg-[#DDD6C8]'
                    }`}
                    style={{ width: `${paidPct}%` }}
                  />
                </View>
              </View>
            </View>

            {/* INFORMASI KLIEN & REKENING (DUAL COLUMN) */}
            <View className="flex-row flex-wrap -mx-1.5 mb-3.5">
              {/* Kolom Kiri: Data Klien */}
              <View className="w-full md:w-1/2 px-1.5 mb-3 md:mb-0">
                <View className="bg-white border border-[#E3DDCF] p-3.5 rounded-[3px] h-full shadow-xs">
                  <Text className="text-[#1B2225] font-bold text-xs uppercase tracking-wider mb-2">
                    Informasi Klien (Bill To)
                  </Text>
                  <View className="space-y-1.5">
                    <View className="flex-row items-center">
                      <User size={13} color="#968363" />
                      <Text className="text-[#1B2225] text-xs font-semibold ml-2">
                        {invoice.client_name}
                      </Text>
                    </View>
                    {invoice.client_phone && (
                      <Text className="text-[#70787C] text-xs ml-5 font-mono">
                        WhatsApp: {invoice.client_phone}
                      </Text>
                    )}
                    {invoice.client_address && (
                      <Text className="text-[#70787C] text-xs ml-5">
                        Alamat: {invoice.client_address}
                      </Text>
                    )}
                    <View className="flex-row items-center pt-1.5">
                      <Calendar size={13} color="#968363" />
                      <Text className="text-[#70787C] text-xs ml-2">
                        Terbit: {formatIndonesianDate(invoice.issue_date)}
                      </Text>
                      {invoice.due_date && (
                        <Text className="text-[#8A9296] text-xs ml-2">
                          • Jatuh Tempo: {formatIndonesianDate(invoice.due_date)}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>

              {/* Kolom Kanan: Rekening Pembayaran */}
              <View className="w-full md:w-1/2 px-1.5">
                <View className="bg-white border border-[#E3DDCF] p-3.5 rounded-[3px] h-full shadow-xs">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-[#1B2225] font-bold text-xs uppercase tracking-wider">
                      Rekening Pembayaran Resmi
                    </Text>

                    <Pressable
                      onPress={handleCopyBank}
                      className={`flex-row items-center px-2 py-0.5 rounded-[2px] border ${
                        copiedBank
                          ? 'bg-emerald-50 border-emerald-300'
                          : 'bg-[#FAF8F5] border-[#DDD6C8] hover:bg-[#F2ECE1]'
                      }`}
                    >
                      {copiedBank ? (
                        <>
                          <Check size={10} color="#059669" />
                          <Text className="text-emerald-800 text-[10px] font-semibold ml-1">
                            Tersalin
                          </Text>
                        </>
                      ) : (
                        <>
                          <Copy size={10} color="#70787C" />
                          <Text className="text-[#70787C] text-[10px] font-semibold ml-1">
                            Salin
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>

                  <View className="space-y-0.5">
                    <Text className="text-[#1B2225] text-xs font-bold">
                      {invoice.bank_name || 'Bank Mandiri'}
                    </Text>
                    <Text className="text-emerald-800 text-sm font-mono font-bold tracking-wider">
                      {invoice.bank_account_no || '1370026994893'}
                    </Text>
                    <Text className="text-[#70787C] text-xs">
                      a.n. {invoice.bank_account_holder || 'M.LAFRAN PANE'}
                    </Text>
                    <Text className="text-[#8A9296] text-[10px] pt-1">
                      Disahkan oleh: {invoice.authorized_by || 'M Lafran Pane'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* TABEL RINCIAN ITEM TAGIHAN */}
            <View className="bg-white border border-[#E3DDCF] p-3.5 rounded-[3px] mb-3.5 shadow-xs">
              <Text className="text-[#1B2225] font-bold text-xs uppercase tracking-wider mb-2.5">
                Rincian Item Tagihan ({invoice.invoice_items?.length || 0} Item)
              </Text>

              <View className="border border-[#E3DDCF] rounded-[2px] overflow-hidden">
                {/* Table Header */}
                <View className="flex-row bg-[#FAF8F5] px-3 py-2 border-b border-[#E3DDCF]">
                  <Text className="w-10 text-[#70787C] text-[10px] font-bold uppercase tracking-wider font-mono">No</Text>
                  <Text className="flex-1 text-[#70787C] text-[10px] font-bold uppercase tracking-wider">Deskripsi</Text>
                  <Text className="w-16 text-center text-[#70787C] text-[10px] font-bold uppercase tracking-wider">Qty</Text>
                  <Text className="w-28 text-right text-[#70787C] text-[10px] font-bold uppercase tracking-wider">Harga</Text>
                  <Text className="w-32 text-right text-[#70787C] text-[10px] font-bold uppercase tracking-wider">Jumlah</Text>
                </View>

                {/* Table Rows */}
                {(invoice.invoice_items || []).map((it, idx) => (
                  <View
                    key={it.id || idx}
                    className="flex-row px-3 py-2 border-b border-[#EFEAE1] bg-white items-center"
                  >
                    <Text className="w-10 text-[#8A9296] text-xs font-mono">{it.item_no}</Text>
                    <Text className="flex-1 text-[#1B2225] text-xs font-medium">{it.description}</Text>
                    <Text className="w-16 text-center text-[#70787C] text-xs font-mono">
                      {it.quantity} {it.unit}
                    </Text>
                    <Text className="w-28 text-right text-[#70787C] text-xs font-mono">
                      {formatRupiah(it.unit_price)}
                    </Text>
                    <Text className="w-32 text-right text-[#1B2225] text-xs font-bold font-mono">
                      {formatRupiah(it.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* RIWAYAT MUTASI PEMBAYARAN & KWITANSI */}
            <View className="bg-white border border-[#E3DDCF] p-3.5 rounded-[3px] mb-2 shadow-xs">
              <View className="flex-row items-center justify-between mb-3">
                <View>
                  <Text className="text-[#1B2225] font-bold text-xs uppercase tracking-wider">
                    Riwayat Mutasi Pembayaran & Kwitansi
                  </Text>
                  <Text className="text-[#8A9296] text-[10px] font-mono mt-0.5">
                    {invoice.payments?.length || 0} transaksi tercatat
                  </Text>
                </View>

                {invoice.balance_due > 0 && (
                  <Pressable
                    onPress={() => onOpenPaymentRecord(invoice)}
                    className="flex-row items-center bg-[#1B2225] hover:bg-[#2C3539] px-3 py-1.5 rounded-[3px]"
                  >
                    <Plus size={12} color="#FFFFFF" />
                    <Text className="text-white font-bold text-xs ml-1">Catat Mutasi</Text>
                  </Pressable>
                )}
              </View>

              {(!invoice.payments || invoice.payments.length === 0) ? (
                <View className="py-6 items-center justify-center bg-[#FAF8F5] rounded-[2px] border border-[#EDE7DC]">
                  <CreditCard size={24} color="#8A9296" />
                  <Text className="text-[#70787C] text-xs mt-2">
                    Belum ada pembayaran yang dicatat untuk invoice ini.
                  </Text>
                  {invoice.balance_due > 0 && (
                    <Pressable
                      onPress={() => onOpenPaymentRecord(invoice)}
                      className="mt-2.5 bg-white border border-[#DDD6C8] px-3 py-1.5 rounded-[3px] hover:bg-[#F2ECE1]"
                    >
                      <Text className="text-[#1B2225] font-bold text-xs">
                        + Catat Pembayaran Sekarang
                      </Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <View className="space-y-2">
                  {invoice.payments.map((p) => (
                    <View
                      key={p.id}
                      className="bg-[#FAF8F5] border border-[#DDD6C8] p-3 rounded-[3px] flex-col md:flex-row md:items-center justify-between gap-2.5"
                    >
                      <View className="flex-1">
                        <View className="flex-row items-center mb-0.5">
                          <Text className="text-[#1B2225] font-bold text-xs mr-2">
                            {p.stage_name}
                          </Text>
                          <Text className="text-emerald-700 font-mono font-bold text-xs">
                            {formatRupiah(p.amount)}
                          </Text>
                        </View>

                        <Text className="text-[#70787C] text-[11px] font-mono">
                          Kwitansi: #{p.receipt_no} • {formatIndonesianDate(p.payment_date)} • {p.payment_method}
                        </Text>

                        {p.description && (
                          <Text className="text-[#8A9296] text-[11px] italic mt-0.5">
                            "{p.description}"
                          </Text>
                        )}

                        {/* Bukti Transfer */}
                        {p.proof_url && (
                          <Pressable
                            onPress={() => Linking.openURL(p.proof_url!)}
                            className="flex-row items-center mt-1.5 bg-white px-2 py-1 rounded-[2px] border border-[#DDD6C8] w-fit"
                          >
                            <ExternalLink size={11} color="#968363" />
                            <Text className="text-[#1B2225] text-[10px] font-semibold ml-1">
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
                            className="flex-row items-center bg-white hover:bg-[#F2ECE1] px-2.5 py-1.5 rounded-[3px] border border-[#DDD6C8]"
                          >
                            <Printer size={12} color="#70787C" />
                            <Text className="text-[#1B2225] text-xs font-semibold ml-1">
                              Cetak Kwitansi
                            </Text>
                          </Pressable>
                        )}

                        <Pressable
                          onPress={() => handleDeletePayment(p)}
                          className="p-1.5 rounded-[2px] hover:bg-rose-100 bg-rose-50 border border-rose-200"
                        >
                          <Trash2 size={12} color="#9E2A2B" />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Action Buttons */}
          <View className="flex-row flex-wrap items-center justify-between px-5 py-3 border-t border-[#E3DDCF] bg-white gap-2">
            <View className="flex-row items-center">
              {onOpenInvoicePdf && (
                <Pressable
                  onPress={() => onOpenInvoicePdf(invoice)}
                  className="flex-row items-center bg-[#FAF8F5] hover:bg-[#F2ECE1] px-3.5 py-2 rounded-[3px] border border-[#DDD6C8] mr-2"
                >
                  <Printer size={13} color="#70787C" />
                  <Text className="text-[#1B2225] font-semibold text-xs ml-1.5">
                    Cetak / Simpan PDF Invoice
                  </Text>
                </Pressable>
              )}
            </View>

            <View className="flex-row items-center space-x-2">
              <Pressable
                onPress={onClose}
                className="px-4 py-2 rounded-[3px] bg-[#FAF8F5] border border-[#DDD6C8] hover:bg-[#F2ECE1]"
              >
                <Text className="text-[#70787C] font-semibold text-xs">Tutup</Text>
              </Pressable>

              {invoice.balance_due > 0 && (
                <Pressable
                  onPress={() => onOpenPaymentRecord(invoice)}
                  className="flex-row items-center px-4 py-2 rounded-[3px] bg-[#1B2225] hover:bg-[#2C3539]"
                >
                  <Plus size={13} color="#FFFFFF" />
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
