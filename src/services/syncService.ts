import { checkIsOnline } from '@/lib/network';
import { supabase } from '@/lib/supabase';
import { invoiceService } from '@/services/invoiceService';
import { offlineQueueService } from '@/services/offlineQueueService';
import { quotationService } from '@/services/quotationService';

let isSyncRunning = false;

/**
 * Service untuk memproses dan menyinkronkan antrean mutasi offline ke Supabase
 */
export const syncService = {
  /**
   * Menjalankan sinkronisasi seluruh antrean mutasi ke Supabase
   */
  async processQueue(onProgress?: (pendingCount: number) => void): Promise<{
    processed: number;
    failed: number;
  }> {
    if (isSyncRunning) {
      console.log('[syncService] Sinkronisasi sedang berjalan, lewati panggilan ganda');
      return { processed: 0, failed: 0 };
    }

    const isOnline = await checkIsOnline();
    if (!isOnline) {
      console.log('[syncService] Masih offline, sinkronisasi ditunda');
      return { processed: 0, failed: 0 };
    }

    const queue = await offlineQueueService.getAll();
    if (queue.length === 0) {
      onProgress?.(0);
      return { processed: 0, failed: 0 };
    }

    isSyncRunning = true;
    console.log(`[syncService] Memulai sinkronisasi ${queue.length} mutasi offline...`);

    let processed = 0;
    let failed = 0;

    for (const mutation of queue) {
      try {
        await this.executeMutation(mutation);
        await offlineQueueService.remove(mutation.id);
        processed++;
        const remaining = await offlineQueueService.getCount();
        onProgress?.(remaining);
      } catch (err) {
        console.warn(`[syncService] Gagal memproses mutasi ${mutation.type} (${mutation.id}):`, err);
        failed++;
        // Jika gagal karena network terputus kembali, hentikan loop
        const stillOnline = await checkIsOnline();
        if (!stillOnline) {
          console.log('[syncService] Koneksi terputus di tengah proses sinkronisasi, hentikan loop');
          break;
        }
      }
    }

    isSyncRunning = false;
    console.log(`[syncService] Sinkronisasi selesai: ${processed} sukses, ${failed} gagal.`);
    return { processed, failed };
  },

  /**
   * Eksekusi satu mutasi ke Supabase Database
   */
  async executeMutation(mutation: any): Promise<void> {
    const { type, payload } = mutation;

    switch (type) {
      case 'MOVE_CARD': {
        const { error } = await supabase
          .from('board_cards')
          .update({
            column_id: payload.targetColumnId,
            position: payload.newPosition,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payload.cardId);

        if (error) throw error;
        break;
      }

      case 'UPDATE_CARD': {
        const { error } = await supabase
          .from('board_cards')
          .update({
            title: payload.title,
            client_name: payload.client_name,
            client_phone: payload.client_phone || null,
            estimated_value: Number(payload.estimated_value || 0),
            column_id: payload.column_id,
            assigned_to: payload.assigned_to || null,
            notes: payload.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payload.cardId);

        if (error) throw error;
        break;
      }

      case 'DELETE_CARD': {
        const { error } = await supabase
          .from('board_cards')
          .delete()
          .eq('id', payload.cardId);

        if (error) throw error;
        break;
      }

      case 'UPDATE_QUOTATION_STATUS': {
        const { error } = await supabase
          .from('quotations')
          .update({ status: payload.status, updated_at: new Date().toISOString() })
          .eq('id', payload.id);

        if (error) throw error;
        break;
      }

      case 'DELETE_QUOTATION': {
        await quotationService.deleteQuotation(payload.id);
        break;
      }

      case 'CREATE_QUOTATION': {
        await quotationService.createQuotation(payload.payload);
        break;
      }

      case 'UPDATE_QUOTATION': {
        await quotationService.updateQuotation(payload.id, payload.payload);
        break;
      }

      case 'CREATE_INVOICE': {
        await invoiceService.createInvoice(payload.payload);
        break;
      }

      case 'UPDATE_INVOICE': {
        await invoiceService.updateInvoice(payload.id, payload.payload);
        break;
      }

      case 'UPDATE_INVOICE_STATUS': {
        await invoiceService.updateStatus(payload.id, payload.status);
        break;
      }

      case 'DELETE_INVOICE': {
        await invoiceService.deleteInvoice(payload.id);
        break;
      }

      case 'RECORD_PAYMENT': {
        const paymentPayload = { ...payload.payload };
        if (
          paymentPayload.proof_url &&
          (paymentPayload.proof_url.startsWith('file:') ||
            paymentPayload.proof_url.startsWith('blob:') ||
            paymentPayload.proof_url.startsWith('data:'))
        ) {
          try {
            paymentPayload.proof_url = await invoiceService.uploadPaymentProof(
              paymentPayload.invoice_id,
              { uri: paymentPayload.proof_url }
            );
          } catch (uploadErr) {
            console.warn('[syncService] Gagal upload proof saat background sync:', uploadErr);
          }
        }
        await invoiceService.recordPayment(paymentPayload);
        break;
      }

      case 'DELETE_PAYMENT': {
        await invoiceService.deletePayment(payload.paymentId, payload.invoiceId);
        break;
      }

      default:
        console.warn(`[syncService] Tipe mutasi tidak dikenali: ${type}`);
    }
  },
};
