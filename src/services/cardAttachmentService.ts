import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { AttachmentItem } from '@/store/slices/boardSlice';

export interface ImageAsset {
  uri: string;
  mimeType?: string;
  fileName?: string | null;
  fileSize?: number;
}

/**
 * Network / Data Layer untuk Card Attachments
 * Memisahkan pemanggilan Supabase API dari komponen UI
 */
export const cardAttachmentService = {
  /**
   * Upload foto ke Supabase Storage & catat metadata ke tabel card_attachments
   */
  async uploadAttachment(cardId: string, asset: ImageAsset): Promise<AttachmentItem> {
    const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
    const filePath = `${cardId}/${Date.now()}.${fileExt}`;

    let fileBody: any;
    if (Platform.OS === 'web') {
      const response = await fetch(asset.uri);
      fileBody = await response.blob();
    } else {
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: `upload.${fileExt}`,
        type: asset.mimeType || `image/${fileExt}`,
      } as any);
      fileBody = formData;
    }

    // 1. Upload ke Storage
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(filePath, fileBody, {
        contentType: asset.mimeType || `image/${fileExt}`,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // 2. Dapatkan URL Publik
    const { data: urlData } = supabase.storage
      .from('attachments')
      .getPublicUrl(filePath);

    // 3. Simpan ke database
    const { data: insertedData, error: dbError } = await supabase
      .from('card_attachments')
      .insert({
        card_id: cardId,
        file_name: asset.fileName || `foto_${Date.now()}.${fileExt}`,
        file_url: urlData.publicUrl,
        file_type: 'image',
        file_size: asset.fileSize || 0,
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
