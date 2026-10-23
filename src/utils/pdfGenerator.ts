import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/**
 * Utilitas untuk mencetak dan mengekspor dokumen PDF Surat Penawaran
 * Kompatibel dengan Web, iOS, dan Android.
 */
export const pdfGenerator = {
  /**
   * Menampilkan dialog cetak langsung sistem (Print Dialog / Simpan sebagai PDF)
   */
  async print(html: string, title?: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        const oldTitle = typeof document !== 'undefined' ? document.title : '';
        if (typeof document !== 'undefined' && title) {
          document.title = title;
        }
        await Print.printAsync({ html });
        if (typeof document !== 'undefined' && title) {
          setTimeout(() => {
            document.title = oldTitle;
          }, 1500);
        }
      } else {
        await Print.printAsync({ html });
      }
    } catch (error) {
      console.error('Error printing document:', error);
      throw error;
    }
  },

  /**
   * Mengenerate file PDF dan membuka menu Share (WhatsApp, Email, Files, dll.)
   * Di Web, fungsi ini memicu print window atau membuka dokumen di tab baru.
   */
  async exportAndShare(html: string, filename = 'Surat_Penawaran.pdf'): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Pada Web, Print.printAsync membuka dialog cetak bawaan browser
        // Pengguna dapat langsung memilih "Save as PDF" dengan nama file otomatis
        const oldTitle = typeof document !== 'undefined' ? document.title : '';
        const cleanName = filename.replace(/\.pdf$/i, '');
        if (typeof document !== 'undefined') {
          document.title = cleanName;
        }
        await Print.printAsync({ html });
        if (typeof document !== 'undefined') {
          setTimeout(() => {
            document.title = oldTitle;
          }, 1500);
        }
        return;
      }

      // Pada iOS / Android: Buat file PDF di storage lokal aplikasi
      const { uri } = await Print.printToFileAsync({
        html,
        margins: {
          left: 30,
          top: 30,
          right: 30,
          bottom: 30,
        },
      });

      // Bagikan jika didukung oleh platform
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `Kirim ${filename}`,
        });
      } else {
        // Fallback jika sharing tidak tersedia
        await Print.printAsync({ uri });
      }
    } catch (error) {
      console.error('Error generating or sharing PDF:', error);
      throw error;
    }
  },
};
