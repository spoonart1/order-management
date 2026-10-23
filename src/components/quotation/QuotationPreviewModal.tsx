import { Quotation } from '@/services/quotationService';
import { pdfGenerator } from '@/utils/pdfGenerator';
import { generateQuotationHtml, getQuotationPdfFilename } from '@/utils/quotationPdfTemplate';
import { formatIndonesianDate, formatRupiah } from '@/utils/terbilang';
import { Printer, Share2, X } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
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
  const iframeRef = useRef<any>(null);

  if (!quotation) return null;

  const htmlContent = generateQuotationHtml(quotation);
  const pdfFilename = getQuotationPdfFilename(quotation);

  const getTargetIframe = () => {
    if (iframeRef.current) return iframeRef.current;
    if (typeof document !== 'undefined') {
      return document.getElementById('quotation-preview-iframe') as HTMLIFrameElement | null;
    }
    return null;
  };

  const handlePrint = async () => {
    try {
      setLoading(true);
      await pdfGenerator.print(htmlContent, pdfFilename, getTargetIframe());
    } catch (err: any) {
      Alert.alert('Gagal Mencetak', err.message || 'Terjadi kesalahan saat mencetak.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      setLoading(true);
      await pdfGenerator.exportAndShare(htmlContent, `${pdfFilename}.pdf`, getTargetIframe());
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
      <View className="flex-1 bg-black/60 items-center justify-center p-3 md:p-6">
        <View className="bg-[#F8F6F1] border border-[#DDD6C8] rounded-[4px] w-full max-w-4xl h-[90%] flex-col overflow-hidden shadow-2xl">
          {/* Header Modal */}
          <View className="flex-row items-center justify-between px-5 py-3.5 border-b border-[#E3DDCF] bg-white">
            <View>
              <Text className="text-[#1B2225] font-bold font-mono text-base">
                Preview Surat Penawaran
              </Text>
              <Text className="text-[#70787C] text-xs">
                No: {quotation.quotation_no} • {quotation.project_title}
              </Text>
            </View>

            <View className="flex-row items-center space-x-2">
              {/* Tombol Cetak */}
              <Pressable
                onPress={handlePrint}
                disabled={loading}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                className="flex-row items-center bg-[#FAF8F5] px-3 py-1.5 rounded-[3px] border border-[#DDD6C8] mr-2"
              >
                <Printer size={13} color="#968363" />
                <Text className="text-[#1B2225] text-xs font-semibold ml-1.5">
                  Cetak / Print
                </Text>
              </Pressable>

              {/* Tombol Bagikan / Simpan PDF */}
              <Pressable
                onPress={handleShare}
                disabled={loading}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                className="flex-row items-center bg-[#1B2225] hover:bg-[#2C373C] px-3.5 py-1.5 rounded-[3px] shadow-xs mr-2"
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Share2 size={13} color="#FFFFFF" />
                    <Text className="text-white text-xs font-semibold ml-1.5">
                      {Platform.OS === 'web' ? 'Simpan PDF' : 'Bagikan PDF'}
                    </Text>
                  </>
                )}
              </Pressable>

              {/* Tombol Tutup */}
              <Pressable
                onPress={onClose}
                className="w-7 h-7 rounded-[3px] bg-[#FAF8F5] border border-[#DDD6C8] items-center justify-center"
              >
                <X size={15} color="#1B2225" />
              </Pressable>
            </View>
          </View>

          {/* Body Konten */}
          <View className="flex-1 bg-[#F8F6F1] p-3 md:p-4">
            {Platform.OS === 'web' ? (
              // Di Web: render iframe interaktif dengan A4 styling
              <View className="w-full h-full bg-white rounded-[3px] overflow-hidden border border-[#DDD6C8] shadow-sm">
                {React.createElement('iframe', {
                  ref: iframeRef,
                  id: 'quotation-preview-iframe',
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
                <View className="bg-white border border-[#E3DDCF] p-4 rounded-[4px] mb-3 shadow-xs">
                  <View className="flex-row justify-between items-center mb-2.5 pb-2 border-b border-[#F0EBE1]">
                    <Text className="text-[#968363] font-bold text-xs uppercase font-mono tracking-wider">
                      ALORA STUDIO INDONESIA
                    </Text>
                    <Text className="text-[#70787C] text-xs">
                      {formatIndonesianDate(quotation.issued_date)}
                    </Text>
                  </View>

                  <Text className="text-[#1B2225] font-bold text-base mb-0.5">
                    {quotation.project_title}
                  </Text>
                  <Text className="text-[#70787C] text-xs mb-3">
                    Klien: {quotation.client_name} ({quotation.client_city})
                  </Text>

                  <View className="bg-[#FAF8F5] p-3 rounded-[3px] border border-[#EDE7DC] mb-3">
                    <Text className="text-[#70787C] text-[10px]">Total Penawaran:</Text>
                    <Text className="text-emerald-800 font-bold text-lg font-mono mt-0.5">
                      {formatRupiah(quotation.total_amount)}
                    </Text>
                    <Text className="text-[#8A9296] text-[11px] italic mt-0.5">
                      "{quotation.terbilang}"
                    </Text>
                  </View>

                  <Text className="text-[#1B2225] text-xs font-semibold mb-2">
                    Rincian Item ({quotation.quotation_items?.length || 0} item):
                  </Text>
                  {quotation.quotation_items?.map((it, idx) => (
                    <View
                      key={it.id || idx}
                      className="py-2 border-b border-[#F2EDE4] flex-row justify-between items-center"
                    >
                      <View className="flex-1 mr-3">
                        <Text className="text-[#1B2225] text-xs font-medium">
                          {idx + 1}. {it.description}
                        </Text>
                        <Text className="text-[#70787C] text-[10px]">
                          {it.quantity} {it.unit} @ {formatRupiah(it.unit_price)}
                        </Text>
                      </View>
                      <Text className="text-[#1B2225] font-semibold text-xs font-mono">
                        {formatRupiah(it.amount)}
                      </Text>
                    </View>
                  ))}

                  <View className="mt-3 pt-2.5 border-t border-[#F0EBE1] flex-row justify-between items-center">
                    <Text className="text-[#70787C] text-xs">Marketing PIC:</Text>
                    <Text className="text-[#968363] font-semibold text-xs">
                      {quotation.marketing_name || 'Marketing Alora'}
                    </Text>
                  </View>
                </View>

                <View className="bg-white border border-[#DDD6C8] p-3 rounded-[3px] flex-row items-center mb-4">
                  <Text className="text-[#70787C] text-xs flex-1">
                    💡 Dokumen siap dicetak dalam format resmi 2 Halaman A4 standar Alora Studio. Gunakan tombol Cetak atau Simpan PDF di atas.
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
