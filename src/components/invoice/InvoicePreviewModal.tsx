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
      <View className="flex-1 bg-black/80 items-center justify-center p-3 md:p-6">
        <View className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl h-[92%] flex-col overflow-hidden shadow-2xl">
          {/* Header Modal */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950">
            <View>
              <Text className="text-white font-bold text-base">
                Preview Dokumen Invoice
              </Text>
              <Text className="text-slate-400 text-xs">
                {invoice.invoice_no} • {invoice.client_name}
              </Text>
            </View>

            <View className="flex-row items-center space-x-2">
              {/* Tombol Cetak */}
              <Pressable
                onPress={handlePrint}
                disabled={loading}
                className="flex-row items-center bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-700 mr-2"
              >
                <Printer size={15} color="#38BDF8" />
                <Text className="text-sky-300 text-xs font-semibold ml-1.5">
                  Cetak / Print
                </Text>
              </Pressable>

              {/* Tombol Simpan / Share PDF */}
              <Pressable
                onPress={handleShare}
                disabled={loading}
                className="flex-row items-center bg-sky-500 hover:bg-sky-600 px-4 py-2 rounded-xl mr-3 shadow-lg shadow-sky-500/20"
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Share2 size={15} color="#FFFFFF" />
                    <Text className="text-white text-xs font-bold ml-1.5">
                      {Platform.OS === 'web' ? 'Simpan PDF' : 'Kirim PDF'}
                    </Text>
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={onClose}
                className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center"
              >
                <X size={16} color="#94A3B8" />
              </Pressable>
            </View>
          </View>

          {/* Body Preview Document */}
          <View className="flex-1 bg-slate-950 p-2 md:p-4 items-center justify-center">
            {Platform.OS === 'web' ? (
              <iframe
                id="invoice-preview-iframe"
                ref={iframeRef}
                srcDoc={htmlContent}
                title={pdfFilename}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: 8,
                  backgroundColor: '#ffffff',
                }}
              />
            ) : (
              <ScrollView className="w-full flex-1 p-4 bg-white rounded-xl">
                <Text className="text-slate-800 text-xs">
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
