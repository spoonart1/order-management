import { Image as RNImage, Platform } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';
import { AttachmentItem } from '@/store/slices/boardSlice';

export interface AttachmentAsset {
  uri: string;
  mimeType?: string;
  fileName?: string | null;
  fileSize?: number;
  file?: any;
}

export type ImageAsset = AttachmentAsset;

/**
 * Batas maksimal ukuran dokumen PDF: 10 MB
 */
export const MAX_PDF_SIZE_MB = 10;
export const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;

/**
 * Batas target ukuran gambar terkompresi: di bawah 600 KB
 */
export const TARGET_IMAGE_MAX_KB = 600;
export const TARGET_IMAGE_MAX_BYTES = TARGET_IMAGE_MAX_KB * 1024;

const getImageDimensions = (uri: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    RNImage.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve({ width: 0, height: 0 })
    );
  });
};

/**
 * Kompresi gambar secara bertahap / progresif agar ukurannya di bawah 600 KB
 */
export async function compressImageUnder600KB(
  uri: string,
  targetBytes = TARGET_IMAGE_MAX_BYTES
): Promise<{ uri: string; size: number }> {
  let currentUri = uri;
  let currentSize = 0;

  try {
    const res = await fetch(currentUri);
    const blob = await res.blob();
    currentSize = blob.size;
  } catch (e) {}

  // Jika ukuran awal sudah di bawah target dan sudah bertipe JPEG
  if (currentSize > 0 && currentSize <= targetBytes && currentUri.toLowerCase().endsWith('.jpg')) {
    return { uri: currentUri, size: currentSize };
  }

  const { width: origWidth } = await getImageDimensions(currentUri);

  // Tahap 1: Batasi lebar maks 1600px dan kualitas kompresi 0.8
  const actions1: any[] = [];
  if (origWidth > 1600) {
    actions1.push({ resize: { width: 1600 } });
  }
  let result = await manipulateAsync(currentUri, actions1, {
    compress: 0.8,
    format: SaveFormat.JPEG,
  });

  try {
    const blob1 = await (await fetch(result.uri)).blob();
    currentSize = blob1.size;
    currentUri = result.uri;
  } catch (e) {}

  if (currentSize > 0 && currentSize <= targetBytes) {
    return { uri: currentUri, size: currentSize };
  }

  // Tahap 2: Turunkan resolusi ke lebar 1280px dan kompresi 0.65
  const actions2: any[] = [];
  if (origWidth > 1280 || origWidth === 0) {
    actions2.push({ resize: { width: 1280 } });
  }
  result = await manipulateAsync(currentUri, actions2, {
    compress: 0.65,
    format: SaveFormat.JPEG,
  });

  try {
    const blob2 = await (await fetch(result.uri)).blob();
    currentSize = blob2.size;
    currentUri = result.uri;
  } catch (e) {}

  if (currentSize > 0 && currentSize <= targetBytes) {
    return { uri: currentUri, size: currentSize };
  }

  // Tahap 3: Turunkan ke lebar 1024px dan kompresi 0.5
  result = await manipulateAsync(currentUri, [{ resize: { width: 1024 } }], {
    compress: 0.5,
    format: SaveFormat.JPEG,
  });

  try {
    const blob3 = await (await fetch(result.uri)).blob();
    currentSize = blob3.size;
    currentUri = result.uri;
  } catch (e) {}

  if (currentSize > 0 && currentSize <= targetBytes) {
    return { uri: currentUri, size: currentSize };
  }

  // Tahap 4: Fallback pamungkas ke lebar 800px dan kompresi 0.38
  result = await manipulateAsync(currentUri, [{ resize: { width: 800 } }], {
    compress: 0.38,
    format: SaveFormat.JPEG,
  });

  try {
    const blob4 = await (await fetch(result.uri)).blob();
    currentSize = blob4.size;
    currentUri = result.uri;
  } catch (e) {}

  return { uri: currentUri, size: currentSize };
}

/**
 * Network / Data Layer untuk Card Attachments
 * Memisahkan pemanggilan Supabase API dari komponen UI
 */
export const cardAttachmentService = {
  /**
   * Upload foto atau dokumen (PDF/Image) ke Supabase Storage & catat metadata ke tabel card_attachments
   */
  async uploadAttachment(cardId: string, asset: AttachmentAsset): Promise<AttachmentItem> {
    // 1. Ekstrak ekstensi & tentukan tipe file
    let fileExt = 'jpg';
    if (asset.fileName && asset.fileName.includes('.')) {
      fileExt = asset.fileName.split('.').pop()?.toLowerCase() || 'jpg';
    } else if (asset.uri && asset.uri.includes('.')) {
      const cleanUri = asset.uri.split('?')[0];
      fileExt = cleanUri.split('.').pop()?.toLowerCase() || 'jpg';
    } else if (asset.mimeType === 'application/pdf') {
      fileExt = 'pdf';
    }

    const isPdf = fileExt === 'pdf' || asset.mimeType === 'application/pdf';

    let uploadUri = asset.uri;
    let uploadSize = asset.fileSize || 0;
    let contentType = isPdf ? 'application/pdf' : 'image/jpeg';

    if (isPdf) {
      // Validasi batas maksimal dokumen PDF 10 MB
      if (asset.fileSize && asset.fileSize > MAX_PDF_SIZE_BYTES) {
        throw new Error(
          `Ukuran file PDF terlalu besar (${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB). Batas maksimal dokumen PDF adalah ${MAX_PDF_SIZE_MB} MB.`
        );
      }
    } else {
      // Kompresi otomatis gambar sebelum di-upload agar berada di bawah 600 KB
      try {
        const compressed = await compressImageUnder600KB(asset.uri);
        uploadUri = compressed.uri;
        uploadSize = compressed.size;
        fileExt = 'jpg';
        contentType = 'image/jpeg';
      } catch (err) {
        console.warn('[cardAttachmentService] Kompresi gambar gagal, menggunakan file asli:', err);
      }
    }

    const filePath = `${cardId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    let fileBody: any;
    if (Platform.OS === 'web') {
      const response = await fetch(uploadUri);
      fileBody = await response.blob();
    } else {
      const formData = new FormData();
      formData.append('file', {
        uri: uploadUri,
        name: asset.fileName || (isPdf ? `dokumen_${Date.now()}.pdf` : `upload.${fileExt}`),
        type: contentType,
      } as any);
      fileBody = formData;
    }

    // 1. Upload ke Storage
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(filePath, fileBody, {
        contentType,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // 2. Dapatkan URL Publik
    const { data: urlData } = supabase.storage
      .from('attachments')
      .getPublicUrl(filePath);

    // 3. Simpan ke database
    const defaultName = isPdf
      ? `dokumen_${Date.now()}.pdf`
      : `foto_${Date.now()}.${fileExt}`;

    const { data: insertedData, error: dbError } = await supabase
      .from('card_attachments')
      .insert({
        card_id: cardId,
        file_name: asset.fileName || defaultName,
        file_url: urlData.publicUrl,
        file_type: isPdf ? 'pdf' : 'image',
        file_size: uploadSize,
      })
      .select()
      .single();

    if (dbError) throw dbError;
    return insertedData as AttachmentItem;
  },

  /**
   * Hapus file dari Storage & hapus row dari tabel card_attachments
   */
  async deleteAttachment(attachment: AttachmentItem): Promise<void> {
    const urlParts = attachment.file_url.split('/attachments/');
    const storagePath = urlParts.length > 1 ? urlParts[1] : '';

    if (storagePath) {
      await supabase.storage.from('attachments').remove([storagePath]);
    }

    const { error } = await supabase
      .from('card_attachments')
      .delete()
      .eq('id', attachment.id);

    if (error) throw error;
  },

  /**
   * Hapus lampiran berdasarkan ID dan path storage
   */
  async deleteAttachmentById(attachmentId: string, filePath?: string): Promise<void> {
    if (filePath) {
      await supabase.storage.from('attachments').remove([filePath]);
    }

    const { error } = await supabase
      .from('card_attachments')
      .delete()
      .eq('id', attachmentId);

    if (error) throw error;
  },
};
