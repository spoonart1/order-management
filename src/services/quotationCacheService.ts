import AsyncStorage from '@react-native-async-storage/async-storage';
import { Quotation } from '@/services/quotationService';

const CACHE_QUOTATIONS_KEY = '@alora_quotations_cache';
const CACHE_TIMESTAMP_KEY = '@alora_quotations_cache_time';

/**
 * Service Layer untuk Local Persistent Cache Modul Surat Penawaran (Offline-First)
 */
export const quotationCacheService = {
  /**
   * Menyimpan snapshot daftar surat penawaran ke storage lokal
   */
  async saveQuotationsCache(quotations: Quotation[]): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(CACHE_QUOTATIONS_KEY, JSON.stringify(quotations)),
        AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now())),
      ]);
    } catch (err) {
      console.warn('[quotationCacheService] Gagal menyimpan cache quotations:', err);
    }
  },

  /**
   * Mengambil snapshot daftar surat penawaran dari storage lokal
   */
  async getQuotationsCache(): Promise<Quotation[] | null> {
    try {
      const json = await AsyncStorage.getItem(CACHE_QUOTATIONS_KEY);
      if (!json) return null;
      return JSON.parse(json) as Quotation[];
    } catch (err) {
      console.warn('[quotationCacheService] Gagal membaca cache quotations:', err);
      return null;
    }
  },

  /**
   * Mengambil timestamp terakhir kali cache surat penawaran diperbarui
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
   * Menghapus cache surat penawaran
   */
  async clearQuotationsCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([CACHE_QUOTATIONS_KEY, CACHE_TIMESTAMP_KEY]);
    } catch (err) {
      console.warn('[quotationCacheService] Gagal menghapus cache quotations:', err);
    }
  },

  /**
   * Menambah atau memperbarui satu penawaran di dalam cache
   */
  async upsertQuotationInCache(quotation: Quotation): Promise<void> {
    try {
      const list = (await this.getQuotationsCache()) || [];
      const idx = list.findIndex((q) => q.id === quotation.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...quotation };
      } else {
        list.unshift(quotation);
      }
      await this.saveQuotationsCache(list);
    } catch (err) {
      console.warn('[quotationCacheService] Gagal upsert quotation di cache:', err);
    }
  },

  /**
   * Memperbarui status satu penawaran di dalam cache
   */
  async updateQuotationStatusInCache(id: string, status: Quotation['status']): Promise<void> {
    try {
      const list = (await this.getQuotationsCache()) || [];
      const idx = list.findIndex((q) => q.id === id);
      if (idx !== -1) {
        list[idx].status = status;
        list[idx].updated_at = new Date().toISOString();
        await this.saveQuotationsCache(list);
      }
    } catch (err) {
      console.warn('[quotationCacheService] Gagal update status quotation di cache:', err);
    }
  },

  /**
   * Menghapus satu penawaran dari cache
   */
  async removeQuotationFromCache(id: string): Promise<void> {
    try {
      const list = (await this.getQuotationsCache()) || [];
      const filtered = list.filter((q) => q.id !== id);
      await this.saveQuotationsCache(filtered);
    } catch (err) {
      console.warn('[quotationCacheService] Gagal remove quotation dari cache:', err);
    }
  },
};
