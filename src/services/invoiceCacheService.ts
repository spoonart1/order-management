import AsyncStorage from '@react-native-async-storage/async-storage';
import { Invoice, PaymentReceipt } from '@/services/invoiceService';

const CACHE_INVOICES_KEY = '@alora_invoices_cache';
const CACHE_TIMESTAMP_KEY = '@alora_invoices_cache_time';

/**
 * Service Layer untuk Local Persistent Cache Modul Invoice & Tagihan (Offline-First)
 */
export const invoiceCacheService = {
  /**
   * Menyimpan snapshot daftar invoice ke storage lokal perangkat
   */
  async saveInvoicesCache(invoices: Invoice[]): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(CACHE_INVOICES_KEY, JSON.stringify(invoices)),
        AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now())),
      ]);
    } catch (err) {
      console.warn('[invoiceCacheService] Gagal menyimpan cache invoices:', err);
    }
  },

  /**
   * Mengambil snapshot daftar invoice dari storage lokal
   */
  async getInvoicesCache(): Promise<Invoice[] | null> {
    try {
      const json = await AsyncStorage.getItem(CACHE_INVOICES_KEY);
      if (!json) return null;
      return JSON.parse(json) as Invoice[];
    } catch (err) {
      console.warn('[invoiceCacheService] Gagal membaca cache invoices:', err);
      return null;
    }
  },

  /**
   * Mengambil timestamp terakhir kali cache invoice diperbarui
   */
  async getCacheTimestamp(): Promise<number | null> {
    try {
      const timeStr = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
      return timeStr ? Number(timeStr) : null;
    } catch {
      return null;
    }
  },

  /**
   * Menghapus cache invoice lokal
   */
  async clearInvoicesCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([CACHE_INVOICES_KEY, CACHE_TIMESTAMP_KEY]);
    } catch (err) {
      console.warn('[invoiceCacheService] Gagal menghapus cache invoices:', err);
    }
  },

  /**
   * Menambah atau memperbarui invoice di dalam cache lokal
   */
  async upsertInvoiceInCache(invoice: Invoice): Promise<void> {
    try {
      const list = (await this.getInvoicesCache()) || [];
      const idx = list.findIndex((inv) => inv.id === invoice.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...invoice };
      } else {
        list.unshift(invoice);
      }
      await this.saveInvoicesCache(list);
    } catch (err) {
      console.warn('[invoiceCacheService] Gagal upsert invoice di cache:', err);
    }
  },

  /**
   * Memperbarui status invoice di cache lokal
   */
  async updateInvoiceStatusInCache(id: string, status: Invoice['status']): Promise<void> {
    try {
      const list = (await this.getInvoicesCache()) || [];
      const idx = list.findIndex((inv) => inv.id === id);
      if (idx !== -1) {
        list[idx].status = status;
        list[idx].updated_at = new Date().toISOString();
        await this.saveInvoicesCache(list);
      }
    } catch (err) {
      console.warn('[invoiceCacheService] Gagal update status invoice di cache:', err);
    }
  },

  /**
   * Menghapus invoice dari cache lokal
   */
  async removeInvoiceFromCache(id: string): Promise<void> {
    try {
      const list = (await this.getInvoicesCache()) || [];
      const filtered = list.filter((inv) => inv.id !== id);
      await this.saveInvoicesCache(filtered);
    } catch (err) {
      console.warn('[invoiceCacheService] Gagal remove invoice dari cache:', err);
    }
  },

  /**
   * Menambahkan mutasi pembayaran baru ke invoice di cache lokal dan merekonsiliasi saldo
   */
  async addPaymentToInvoiceInCache(payment: PaymentReceipt): Promise<void> {
    try {
      const list = (await this.getInvoicesCache()) || [];
      const invoice = list.find((inv) => inv.id === payment.invoice_id);
      if (!invoice) return;

      if (!invoice.payments) invoice.payments = [];
      invoice.payments.unshift(payment);

      const totalPaid = invoice.payments.reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0
      );
      invoice.paid_amount = totalPaid;
      invoice.balance_due = Math.max(0, Number(invoice.total || 0) - totalPaid);
      invoice.status =
        totalPaid >= invoice.total && invoice.total > 0
          ? 'paid'
          : totalPaid > 0
          ? 'partial'
          : 'unpaid';
      invoice.updated_at = new Date().toISOString();

      await this.saveInvoicesCache(list);
    } catch (err) {
      console.warn('[invoiceCacheService] Gagal menambah pembayaran di cache:', err);
    }
  },

  /**
   * Menghapus mutasi pembayaran dari invoice di cache lokal dan merekonsiliasi saldo
   */
  async removePaymentFromInvoiceInCache(paymentId: string, invoiceId: string): Promise<void> {
    try {
      const list = (await this.getInvoicesCache()) || [];
      const invoice = list.find((inv) => inv.id === invoiceId);
      if (!invoice || !invoice.payments) return;

      invoice.payments = invoice.payments.filter((p) => p.id !== paymentId);

      const totalPaid = invoice.payments.reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0
      );
      invoice.paid_amount = totalPaid;
      invoice.balance_due = Math.max(0, Number(invoice.total || 0) - totalPaid);
      invoice.status =
        totalPaid >= invoice.total && invoice.total > 0
          ? 'paid'
          : totalPaid > 0
          ? 'partial'
          : 'unpaid';
      invoice.updated_at = new Date().toISOString();

      await this.saveInvoicesCache(list);
    } catch (err) {
      console.warn('[invoiceCacheService] Gagal menghapus pembayaran di cache:', err);
    }
  },
};
