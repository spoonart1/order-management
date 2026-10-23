import AsyncStorage from '@react-native-async-storage/async-storage';

export type MutationType =
  | 'MOVE_CARD'
  | 'UPDATE_CARD'
  | 'CREATE_CARD'
  | 'DELETE_CARD'
  | 'UPDATE_QUOTATION_STATUS'
  | 'DELETE_QUOTATION'
  | 'CREATE_QUOTATION'
  | 'UPDATE_QUOTATION';

export interface OfflineMutation {
  id: string;
  type: MutationType;
  payload: any;
  timestamp: number;
  retryCount: number;
}

const QUEUE_STORAGE_KEY = '@alora_offline_mutations_queue';

/**
 * Service untuk mengelola antrean mutasi offline (Outbox Pattern)
 * Menyimpan aksi-aksi saat offline agar dapat dieksekusi ke Supabase saat online kembali
 */
export const offlineQueueService = {
  /**
   * Menambahkan mutasi baru ke dalam antrean offline
   */
  async enqueue(type: MutationType, payload: any): Promise<OfflineMutation> {
    const queue = await this.getAll();
    const mutation: OfflineMutation = {
      id: `mut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
    };

    queue.push(mutation);
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    console.log(`[offlineQueue] Enqueued mutation ${mutation.type} (Total queue: ${queue.length})`);
    return mutation;
  },

  /**
   * Mengambil semua mutasi yang tertunda dalam antrean
   */
  async getAll(): Promise<OfflineMutation[]> {
    try {
      const json = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (!json) return [];
      return JSON.parse(json) as OfflineMutation[];
    } catch (e) {
      console.warn('[offlineQueue] Error reading queue:', e);
      return [];
    }
  },

  /**
   * Mengambil jumlah mutasi yang masih tertunda
   */
  async getCount(): Promise<number> {
    const queue = await this.getAll();
    return queue.length;
  },

  /**
   * Menghapus mutasi yang sudah berhasil dieksekusi
   */
  async remove(id: string): Promise<void> {
    const queue = await this.getAll();
    const filtered = queue.filter((m) => m.id !== id);
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(filtered));
  },

  /**
   * Menghapus seluruh antrean
   */
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
  },
};
