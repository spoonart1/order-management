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
import { Printer, Share2, X } from 'lucide-react-native';
import { Invoice } from '@/services/invoiceService';
import { pdfGenerator } from '@/utils/pdfGenerator';
import {
  generateInvoiceHtml,
  getInvoicePdfFilename,
} from '@/utils/invoicePdfTemplate';

interface InvoicePreviewModalProps {
  visible: boolean;
  invoice: Invoice | null;
  onClose: () => void;
}

export function InvoicePreviewModal({
  visible,
  invoice,
  onClose,
}: InvoicePreviewModalProps) {
  const [loading, setLoading] = useState(false);
  const iframeRef = useRef<any>(null);

  if (!invoice) return null;

  const htmlContent = generateInvoiceHtml(invoice);
  const pdfFilename = getInvoicePdfFilename(invoice);

  const getTargetIframe = () => {
    if (iframeRef.current) return iframeRef.current;
    if (typeof document !== 'undefined') {
      return document.getElementById(
        'invoice-preview-iframe'
      ) as HTMLIFrameElement | null;
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
      await pdfGenerator.exportAndShare(
        htmlContent,
        `${pdfFilename}.pdf`,
        getTargetIframe()
      );
    } catch (err: any) {
      Alert.alert(
        'Gagal Membagikan',
        err.message || 'Terjadi kesalahan saat membagikan PDF.'
      );
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
        <View className="bg-[#F8F6F1] border border-[#DDD6C8] rounded-[4px] w-full max-w-4xl h-[92%] flex-col overflow-hidden shadow-2xl">
          {/* Header Modal */}
          <View className="flex-row items-center justify-between px-5 py-3.5 border-b border-[#E3DDCF] bg-white">
            <View>
              <Text className="text-[#1B2225] font-bold font-mono text-base">
                Preview Dokumen Invoice
              </Text>
              <Text className="text-[#70787C] text-xs">
                {invoice.invoice_no} • {invoice.client_name}
              </Text>
            </View>

            <View className="flex-row items-center space-x-2">
              {/* Tombol Cetak */}
              <Pressable
                onPress={handlePrint}
                disabled={loading}
                className="flex-row items-center bg-[#FAF8F5] px-3 py-1.5 rounded-[3px] border border-[#DDD6C8] mr-2"
              >
                <Printer size={13} color="#968363" />
                <Text className="text-[#1B2225] text-xs font-semibold ml-1.5">
                  Cetak / Print
                </Text>
              </Pressable>

              {/* Tombol Simpan / Share PDF */}
              <Pressable
                onPress={handleShare}
                disabled={loading}
                className="flex-row items-center bg-[#1B2225] hover:bg-[#2C373C] px-3.5 py-1.5 rounded-[3px] mr-2 shadow-xs"
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Share2 size={13} color="#FFFFFF" />
                    <Text className="text-white text-xs font-semibold ml-1.5">
                      {Platform.OS === 'web' ? 'Simpan PDF' : 'Kirim PDF'}
                    </Text>
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={onClose}
                className="w-7 h-7 rounded-[3px] bg-[#FAF8F5] border border-[#DDD6C8] items-center justify-center"
              >
                <X size={15} color="#1B2225" />
              </Pressable>
            </View>
          </View>

          {/* Body Preview Document */}
          <View className="flex-1 bg-[#F8F6F1] p-3 md:p-4 items-center justify-center">
            {Platform.OS === 'web' ? (
              <iframe
                id="invoice-preview-iframe"
                ref={iframeRef}
                srcDoc={htmlContent}
                title={pdfFilename}
                style={{
                  width: '100%',
                  height: '100%',
                  border: '1px solid #DDD6C8',
                  borderRadius: 3,
                  backgroundColor: '#ffffff',
                }}
              />
            ) : (
              <ScrollView className="w-full flex-1 p-4 bg-white rounded-[4px] border border-[#DDD6C8]">
                <Text className="text-[#70787C] text-xs">
                  Pratinjau mobile aktif. Gunakan tombol "Cetak / Print" atau "Kirim PDF" di atas untuk melihat tampilan dokumen secara utuh.
                </Text>
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
