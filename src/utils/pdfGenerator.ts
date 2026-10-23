import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/**
 * Mencetak HTML secara terisolasi via iframe tersembunyi pada Web
 * Memastikan HANYA dokumen A4 yang dicetak (bukan seluruh window aplikasi / modal)
 */
function printHtmlInIsolatedIframe(html: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      resolve();
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    const invokePrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Error invoking isolated print:', err);
      }
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {}
        resolve();
      }, 1500);
    };

    // Beri waktu agar render style & font di dalam iframe selesai
    setTimeout(invokePrint, 300);
  });
}

/**
 * Utilitas untuk mencetak dan mengekspor dokumen PDF Surat Penawaran
 * Kompatibel dengan Web, iOS, dan Android.
 */
export const pdfGenerator = {
  /**
   * Menampilkan dialog cetak langsung sistem (Print Dialog / Simpan sebagai PDF)
   */
  async print(html: string, title?: string, iframeElement?: any): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Jika iframe preview sudah ada di DOM, gunakan contentWindow miliknya
        if (iframeElement && iframeElement.contentWindow) {
          iframeElement.contentWindow.focus();
          iframeElement.contentWindow.print();
          return;
        }

        // Jika tidak ada iframe ref, buat iframe terisolasi
        await printHtmlInIsolatedIframe(html);
        return;
      }

      // iOS & Android Native
      await Print.printAsync({ html });
    } catch (error) {
      console.error('Error printing document:', error);
      throw error;
    }
  },

  /**
   * Mengenerate file PDF dan membuka menu Share (WhatsApp, Email, Files, dll.)
   * Di Web, fungsi ini memicu print dialog pada iframe terisolasi (bisa langsung Save as PDF).
   */
  async exportAndShare(
    html: string,
    filename = 'Surat_Penawaran.pdf',
    iframeElement?: any
  ): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Di Web, cetak secara terisolasi sehingga browser menawarkan "Save as PDF"
        // dengan nama file sesuai <title> dokumen di dalam HTML
        await this.print(html, filename.replace(/\.pdf$/i, ''), iframeElement);
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
