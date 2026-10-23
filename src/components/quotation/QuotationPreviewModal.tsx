import { Quotation } from '@/services/quotationService';
import { pdfGenerator } from '@/utils/pdfGenerator';
import { generateQuotationHtml } from '@/utils/quotationPdfTemplate';
import { formatIndonesianDate, formatRupiah } from '@/utils/terbilang';
import { Printer, Share2, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

interface QuotationPreviewModalProps {
  visible: boolean;
  quotation: Quotation | null;
  onClose: () => void;
}

export function QuotationPreviewModal({
  visible,
  quotation,
  onClose,
}: QuotationPreviewModalProps) {
  const [loading, setLoading] = useState(false);

  if (!quotation) return null;

  const htmlContent = generateQuotationHtml(quotation);

  const handlePrint = async () => {
    try {
      setLoading(true);
      await pdfGenerator.print(htmlContent);
    } catch (err: any) {
      Alert.alert('Gagal Mencetak', err.message || 'Terjadi kesalahan saat mencetak.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      setLoading(true);
      const safeNo = quotation.quotation_no.replace(/[/\\?%*:|"<>]/g, '_');
      await pdfGenerator.exportAndShare(htmlContent, `Surat_Penawaran_${safeNo}.pdf`);
    } catch (err: any) {
      Alert.alert('Gagal Membagikan', err.message || 'Terjadi kesalahan saat membagikan PDF.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/80 items-center justify-center p-3 md:p-6">
        <View className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl h-[90%] flex-col overflow-hidden shadow-2xl">
          {/* Header Modal */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950">
            <View>
              <Text className="text-white font-bold text-base">
                Preview Surat Penawaran
              </Text>
              <Text className="text-slate-400 text-xs">
                No: {quotation.quotation_no} • {quotation.project_title}
              </Text>
            </View>

            <View className="flex-row items-center space-x-2">
              {/* Tombol Cetak */}
              <Pressable
                onPress={handlePrint}
                disabled={loading}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                className="flex-row items-center bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-700 mr-2"
              >
                <Printer size={15} color="#38BDF8" />
                <Text className="text-sky-300 text-xs font-semibold ml-1.5">
                  Cetak / Print
                </Text>
              </Pressable>

              {/* Tombol Bagikan / Simpan PDF */}
              <Pressable
                onPress={handleShare}
                disabled={loading}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                className="flex-row items-center bg-blue-600 px-3.5 py-2 rounded-xl shadow-md mr-2"
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Share2 size={15} color="#FFFFFF" />
                    <Text className="text-white text-xs font-semibold ml-1.5">
                      {Platform.OS === 'web' ? 'Simpan PDF' : 'Bagikan PDF'}
                    </Text>
                  </>
                )}
              </Pressable>

              {/* Tombol Tutup */}
              <Pressable
                onPress={onClose}
                className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center"
              >
                <X size={18} color="#94A3B8" />
              </Pressable>
            </View>
          </View>

          {/* Body Konten */}
          <View className="flex-1 bg-slate-950/60 p-4">
            {Platform.OS === 'web' ? (
              // Di Web: render iframe interaktif dengan A4 styling
              <View className="w-full h-full bg-white rounded-xl overflow-hidden shadow-inner">
                {React.createElement('iframe', {
                  srcDoc: htmlContent,
                  style: {
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    backgroundColor: '#ffffff',
                  },
                })}
              </View>
            ) : (
              // Di Native (Mobile): ringkasan dokumen informatif & tombol aksi cepat
              <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View className="bg-slate-900 border border-slate-800 p-5 rounded-xl mb-4">
                  <View className="flex-row justify-between items-center mb-3 pb-2 border-b border-slate-800">
                    <Text className="text-amber-400 font-bold text-xs uppercase tracking-wider">
                      ALORA STUDIO INDONESIA
                    </Text>
                    <Text className="text-slate-400 text-xs">
                      {formatIndonesianDate(quotation.issued_date)}
                    </Text>
                  </View>

                  <Text className="text-white font-bold text-lg mb-1">
                    {quotation.project_title}
                  </Text>
                  <Text className="text-slate-300 text-xs mb-3">
                    Klien: {quotation.client_name} ({quotation.client_city})
                  </Text>

                  <View className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 mb-4">
                    <Text className="text-slate-400 text-xs">Total Penawaran:</Text>
                    <Text className="text-emerald-400 font-black text-xl mt-0.5">
                      {formatRupiah(quotation.total_amount)}
                    </Text>
                    <Text className="text-slate-400 text-[11px] italic mt-1">
                      "{quotation.terbilang}"
                    </Text>
                  </View>

                  <Text className="text-slate-400 text-xs font-semibold mb-2">
                    Rincian Item ({quotation.quotation_items?.length || 0} item):
                  </Text>
                  {quotation.quotation_items?.map((it, idx) => (
                    <View
                      key={it.id || idx}
                      className="py-2.5 border-b border-slate-800/80 flex-row justify-between items-center"
                    >
                      <View className="flex-1 mr-3">
                        <Text className="text-white text-xs font-medium">
                          {idx + 1}. {it.description}
                        </Text>
                        <Text className="text-slate-400 text-[10px]">
                          {it.quantity} {it.unit} @ {formatRupiah(it.unit_price)}
                        </Text>
                      </View>
                      <Text className="text-slate-200 font-semibold text-xs">
                        {formatRupiah(it.amount)}
                      </Text>
                    </View>
                  ))}

                  <View className="mt-4 pt-3 border-t border-slate-800 flex-row justify-between items-center">
                    <Text className="text-slate-400 text-xs">Marketing PIC:</Text>
                    <Text className="text-sky-400 font-semibold text-xs">
                      {quotation.marketing_name || 'Marketing Alora'}
                    </Text>
                  </View>
                </View>

                <View className="bg-blue-950/40 border border-blue-900/60 p-4 rounded-xl flex-row items-center mb-6">
                  <Text className="text-blue-300 text-xs flex-1">
                    💡 Dokumen siap dicetak dalam format resmi 2 Halaman A4 standar Alora Studio. Gunakan tombol Cetak atau Bagikan di atas.
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
