import { DatePickerField } from '@/components/ui';
import { checkIsOnline } from '@/lib/network';
import { Invoice, invoiceService } from '@/services/invoiceService';
import { useAppDispatch } from '@/store/hooks';
import { recordPayment } from '@/store/slices/invoiceSlice';
import { formatRupiah, terbilang } from '@/utils/terbilang';
import * as ImagePicker from 'expo-image-picker';
import {
  CreditCard,
  Trash2,
  Upload,
  X
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from 'react-native';

interface PaymentRecordModalProps {
  visible: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSuccess?: () => void;
}

export function PaymentRecordModal({
  visible,
  onClose,
  invoice,
  onSuccess,
}: PaymentRecordModalProps) {
  const dispatch = useAppDispatch();

  // Form State
  const [stageName, setStageName] = useState('Termin I (DP 50%)');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState(
    'Bank Mandiri (1370026994893 a.n. M.LAFRAN PANE)'
  );
  const [description, setDescription] = useState('');
  const [receivedBy, setReceivedBy] = useState('M Lafran Pane');

  // Bukti Transfer
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Inisialisasi saat modal dibuka
  useEffect(() => {
    if (visible && invoice) {
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('Bank Mandiri (1370026994893 a.n. M.LAFRAN PANE)');
      setReceivedBy(invoice.authorized_by || 'M Lafran Pane');
      setSelectedAsset(null);
      setErrorMessage(null);

      // Auto-pilih termin yang paling relevan
      const paid = invoice.paid_amount || 0;
      const total = invoice.total || 0;
      const balance = invoice.balance_due || 0;

      if (paid === 0) {
        // Belum bayar -> default ke DP 50%
        setStageName('Termin I (DP 50%)');
        setAmount(String(Math.round(total * 0.5)));
        setDescription('Pembayaran DP 50% Mulai Pekerjaan');
      } else if (paid < total * 0.75) {
        // Sudah DP -> default ke Termin II (25%)
        setStageName('Termin II (25%)');
        setAmount(String(Math.round(total * 0.25)));
        setDescription('Pembayaran Termin II 25% Seting Di Lokasi');
      } else {
        // Sisa -> Pelunasan
        setStageName('Termin III (Pelunasan)');
        setAmount(String(balance));
        setDescription('Pembayaran Pelunasan Pekerjaan Selesai');
      }
    }
  }, [visible, invoice]);

  // Handler Preset Termin Quick Buttons
  const handleSelectPresetTerm = (preset: 'dp50' | 'term25' | 'pelunasan' | 'custom') => {
    if (!invoice) return;
    const total = invoice.total || 0;
    const balance = invoice.balance_due || 0;

    switch (preset) {
      case 'dp50':
        setStageName('Termin I (DP 50%)');
        setAmount(String(Math.round(total * 0.5)));
        setDescription('Pembayaran DP 50% Mulai Pekerjaan');
        break;
      case 'term25':
        setStageName('Termin II (25%)');
        setAmount(String(Math.round(total * 0.25)));
        setDescription('Pembayaran Termin II 25% Seting Di Lokasi');
        break;
      case 'pelunasan':
        setStageName('Termin III (Pelunasan)');
        setAmount(String(balance));
        setDescription('Pembayaran Pelunasan Pekerjaan Selesai');
        break;
      case 'custom':
        setStageName('Pembayaran Termin Kustom');
        setDescription('Pembayaran termin');
        break;
    }
  };

  // Handler Pick Image Bukti Transfer
  const handlePickProofImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedAsset(result.assets[0]);
      }
    } catch (err: any) {
      Alert.alert('Gagal Memilih Foto', err?.message || 'Terjadi kesalahan.');
    }
  };

  // Nilai numeric dan terbilang rupiah
  const numericAmount = Number(amount || 0);
  const terbilangText = useMemo(() => {
    return terbilang(numericAmount);
  }, [numericAmount]);

  // Handler Submit Pembayaran
  const handleSubmit = async () => {
    if (!invoice) return;

    if (!numericAmount || numericAmount <= 0) {
      setErrorMessage('Nominal pembayaran harus lebih besar dari 0.');
      return;
    }

    if (numericAmount > (invoice.balance_due || 0)) {
      setErrorMessage(
        `Nominal bayar (${formatRupiah(numericAmount)}) melebihi sisa tagihan (${formatRupiah(
          invoice.balance_due
        )}).`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let proofUrl: string | null = null;

      // Upload bukti transfer jika ada foto yang dipilih
      if (selectedAsset) {
        console.log('[PaymentRecordModal] Uploading payment proof...');
        const isOnline = await checkIsOnline();
        if (isOnline) {
          try {
            proofUrl = await invoiceService.uploadPaymentProof(invoice.id, {
              uri: selectedAsset.uri,
              mimeType: selectedAsset.mimeType || 'image/jpeg',
              fileName: selectedAsset.fileName || `proof_${Date.now()}.jpg`,
            });
            console.log('[PaymentRecordModal] Proof uploaded, url:', proofUrl);
          } catch (uploadErr) {
            console.warn('[PaymentRecordModal] Upload proof gagal, fallback ke local uri:', uploadErr);
            proofUrl = selectedAsset.uri;
          }
        } else {
          // Saat offline, gunakan URI lokal agar kwitansi tetap dapat menampilkan foto bukti
          proofUrl = selectedAsset.uri;
        }
      }

      console.log('[PaymentRecordModal] Dispatching recordPayment...');
      await dispatch(
        recordPayment({
          invoice_id: invoice.id,
          billing_ref: invoice.invoice_no,
          stage_name: stageName.trim(),
          amount: numericAmount,
          payment_date: paymentDate,
          payment_method: paymentMethod.trim(),
          description: description.trim() || undefined,
          amount_words: terbilang(numericAmount),
          proof_url: proofUrl,
          received_by: receivedBy.trim(),
        })
      ).unwrap();

      Alert.alert('Berhasil', 'Catatan pembayaran dan kwitansi berhasil disimpan.');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('[PaymentRecordModal] handleSubmit error:', err);
      const msg =
        typeof err === 'string'
          ? err
          : err?.message ||
            (err?.toString && err.toString() !== '[object Object]' ? err.toString() : null) ||
            (typeof err === 'object' ? JSON.stringify(err) : 'Gagal menyimpan catatan pembayaran.');
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!invoice) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-center items-center p-3 md:p-6">
        <View className="bg-[#F8F6F1] border border-[#DDD6C8] w-full max-w-xl max-h-[92%] rounded-[4px] overflow-hidden shadow-2xl flex-col">
          {/* Header Modal */}
          <View className="flex-row items-center justify-between px-5 py-3.5 border-b border-[#E3DDCF] bg-white">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-[3px] bg-[#FAF8F5] border border-[#DDD6C8] items-center justify-center mr-2.5">
                <CreditCard size={16} color="#968363" />
              </View>
              <View>
                <Text className="text-[#1B2225] font-bold text-sm tracking-wide">
                  Catat Mutasi Pembayaran
                </Text>
                <Text className="text-[#70787C] text-[11px] font-mono mt-0.5">
                  {invoice.invoice_no} • {invoice.client_name}
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

          {/* Error Banner */}
          {errorMessage && (
            <View className="bg-rose-50 border-b border-rose-200 px-5 py-2.5 flex-row items-center justify-between">
              <Text className="text-rose-800 text-xs flex-1">{errorMessage}</Text>
              <Pressable onPress={() => setErrorMessage(null)}>
                <X size={14} color="#9E2A2B" />
              </Pressable>
            </View>
          )}

          {/* Form Scrollable */}
          <ScrollView className="flex-1 p-4 md:p-5" showsVerticalScrollIndicator={false}>
            {/* KARTU STATUS SALDO INVOICE */}
            <View className="mb-4 bg-white border border-[#E3DDCF] p-3.5 rounded-[3px] flex-row justify-between items-center shadow-xs">
              <View>
                <Text className="text-[#8A9296] text-[10px] font-bold uppercase tracking-wider">
                  Total Tagihan
                </Text>
                <Text className="text-[#1B2225] font-mono font-bold text-sm mt-0.5">
                  {formatRupiah(invoice.total)}
                </Text>
              </View>

              <View>
                <Text className="text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                  Sudah Terbayar
                </Text>
                <Text className="text-emerald-700 font-mono font-bold text-sm mt-0.5">
                  {formatRupiah(invoice.paid_amount)}
                </Text>
              </View>

              <View>
                <Text className="text-rose-700 text-[10px] font-bold uppercase tracking-wider">
                  Sisa Tagihan
                </Text>
                <Text className="text-rose-700 font-mono font-black text-sm mt-0.5">
                  {formatRupiah(invoice.balance_due)}
                </Text>
              </View>
            </View>

            {/* PRESET CHIPS TAHAPAN TERMIN */}
            <View className="mb-4 bg-white border border-[#E3DDCF] p-3.5 rounded-[3px]">
              <Text className="text-[#1B2225] text-xs font-bold uppercase tracking-wider mb-2">
                Pilih Tahapan Termin / Skema Cepat:
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <Pressable
                  onPress={() => handleSelectPresetTerm('dp50')}
                  className={`px-3 py-1.5 rounded-[3px] border ${
                    stageName.includes('DP 50%')
                      ? 'bg-[#1B2225] border-[#1B2225]'
                      : 'bg-[#FAF8F5] border-[#DDD6C8] hover:bg-[#F2ECE1]'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      stageName.includes('DP 50%') ? 'text-white' : 'text-[#70787C]'
                    }`}
                  >
                    DP 50% ({formatRupiah(Math.round(invoice.total * 0.5))})
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleSelectPresetTerm('term25')}
                  className={`px-3 py-1.5 rounded-[3px] border ${
                    stageName.includes('Termin II')
                      ? 'bg-[#1B2225] border-[#1B2225]'
                      : 'bg-[#FAF8F5] border-[#DDD6C8] hover:bg-[#F2ECE1]'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      stageName.includes('Termin II') ? 'text-white' : 'text-[#70787C]'
                    }`}
                  >
                    Termin II 25% ({formatRupiah(Math.round(invoice.total * 0.25))})
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleSelectPresetTerm('pelunasan')}
                  className={`px-3 py-1.5 rounded-[3px] border ${
                    stageName.includes('Pelunasan')
                      ? 'bg-emerald-800 border-emerald-800'
                      : 'bg-[#FAF8F5] border-[#DDD6C8] hover:bg-[#F2ECE1]'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      stageName.includes('Pelunasan') ? 'text-white' : 'text-[#70787C]'
                    }`}
                  >
                    Pelunasan ({formatRupiah(invoice.balance_due)})
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* FORM DETAIL PEMBAYARAN */}
            <View className="mb-4 bg-white border border-[#E3DDCF] p-3.5 rounded-[3px]">
              {/* INPUT DETAIL PEMBAYARAN */}
              <View className="mb-3.5">
                <Text className="text-[#70787C] text-xs font-semibold mb-1">
                  Label Tahapan Termin <Text className="text-rose-500">*</Text>
                </Text>
                <TextInput
                  value={stageName}
                  onChangeText={setStageName}
                  className="bg-[#FAF8F5] border border-[#DDD6C8] text-[#1B2225] p-2.5 rounded-[3px] text-xs"
                  placeholder="Contoh: Termin I (DP 50%)"
                  placeholderTextColor="#8A9296"
                />
              </View>

              {/* NOMINAL BAYAR & TERBILANG */}
              <View className="mb-3.5">
                <Text className="text-[#70787C] text-xs font-semibold mb-1">
                  Nominal Pembayaran (Rp) <Text className="text-rose-500">*</Text>
                </Text>
                <TextInput
                  value={amount}
                  onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  className="bg-[#FAF8F5] border border-[#DDD6C8] text-emerald-800 p-2.5 rounded-[3px] text-sm font-mono font-bold"
                  placeholder="0"
                  placeholderTextColor="#8A9296"
                />
                {numericAmount > 0 && (
                  <Text className="text-[#70787C] text-xs italic mt-1.5 bg-[#FAF8F5] p-2 rounded-[3px] border border-[#EDE7DC]">
                    "{terbilangText}"
                  </Text>
                )}
              </View>

              {/* TANGGAL & METODE */}
              <View className="flex-row flex-wrap -mx-1.5 mb-1">
                <View className="w-full md:w-1/2 px-1.5 mb-3">
                  <DatePickerField
                    label="Tanggal Pembayaran"
                    required
                    value={paymentDate}
                    onChange={setPaymentDate}
                    placeholder="Pilih tanggal pembayaran..."
                  />
                </View>

                <View className="w-full md:w-1/2 px-1.5 mb-3">
                  <Text className="text-[#70787C] text-xs font-semibold mb-1">
                    Metode Pembayaran
                  </Text>
                  <Text className="bg-[#FAF8F5] border border-[#DDD6C8] text-[#1B2225] p-2.5 rounded-[3px] text-xs">
                    {paymentMethod}
                  </Text>
                </View>
              </View>

              {/* KETERANGAN */}
              <View className="mb-3.5">
                <Text className="text-[#70787C] text-xs font-semibold mb-1">
                  Keterangan / Catatan Transaksi
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  className="bg-[#FAF8F5] border border-[#DDD6C8] text-[#1B2225] p-2.5 rounded-[3px] text-xs"
                  placeholder="Catatan mutasi, referensi transfer bank, dsb."
                  placeholderTextColor="#8A9296"
                />
              </View>

              {/* UPLOAD BUKTI TRANSFER */}
              <View className="mb-3.5">
                <Text className="text-[#70787C] text-xs font-semibold mb-1.5">
                  Bukti Pembayaran / Struk Transfer (Opsional)
                </Text>

                {selectedAsset ? (
                  <View className="relative bg-[#FAF8F5] p-2.5 rounded-[3px] border border-[#DDD6C8] flex-row items-center">
                    <Image
                      source={{ uri: selectedAsset.uri }}
                      className="w-16 h-16 rounded-[2px] bg-[#EDE7DC]"
                      resizeMode="cover"
                    />
                    <View className="flex-1 ml-3">
                      <Text className="text-[#1B2225] text-xs font-medium" numberOfLines={1}>
                        {selectedAsset.fileName || 'Bukti Transfer'}
                      </Text>
                      <Text className="text-emerald-700 text-[10px] font-mono mt-0.5">
                        ✓ Foto siap diunggah
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setSelectedAsset(null)}
                      className="p-2 rounded-[3px] bg-rose-50 border border-rose-200"
                    >
                      <Trash2 size={14} color="#9E2A2B" />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={handlePickProofImage}
                    className="border border-dashed border-[#DDD6C8] hover:border-[#968363] rounded-[3px] p-4 items-center justify-center bg-[#FAF8F5]"
                  >
                    <Upload size={18} color="#968363" />
                    <Text className="text-[#1B2225] text-xs font-semibold mt-1.5">
                      Pilih / Ambil Foto Bukti Transfer
                    </Text>
                    <Text className="text-[#8A9296] text-[10px] mt-0.5">
                      Format JPG, PNG (Maks 5MB)
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* DITERIMA / DISAHKAN OLEH */}
              <View>
                <Text className="text-[#70787C] text-xs font-semibold mb-1">
                  Diterima / Disahkan Oleh
                </Text>
                <Text className="bg-[#FAF8F5] border border-[#DDD6C8] text-[#1B2225] p-2.5 rounded-[3px] text-xs font-medium">
                  {receivedBy}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer Modal Action Buttons */}
          <View className="flex-row items-center justify-end px-5 py-3 border-t border-[#E3DDCF] bg-white">
            <Pressable
              onPress={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-[3px] bg-[#FAF8F5] border border-[#DDD6C8] mr-2 hover:bg-[#F2ECE1]"
            >
              <Text className="text-[#70787C] font-semibold text-xs">Batal</Text>
            </Pressable>

            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              className="flex-row items-center px-4 py-2 rounded-[3px] bg-[#1B2225] hover:bg-[#2C3539] active:bg-[#2C3539]"
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text className="text-white font-bold text-xs ml-2">Menyimpan...</Text>
                </>
              ) : (
                <Text className="text-white font-bold text-xs">Simpan Pembayaran</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
