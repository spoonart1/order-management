import AsyncStorage from '@react-native-async-storage/async-storage';
import { BoardData } from '@/store/slices/boardSlice';

const CACHE_PREFIX = '@alora_board_cache_';
const CACHE_TIMESTAMP_PREFIX = '@alora_board_cache_time_';

/**
 * Service Layer untuk Local Persistent Cache Modul Board (Offline-First)
 */
export const boardCacheService = {
  /**
   * Menyimpan snapshot data board ke storage lokal perangkat
   */
  async saveBoardCache(boardType: string, data: BoardData): Promise<void> {
    try {
      const key = `${CACHE_PREFIX}${boardType}`;
      const timeKey = `${CACHE_TIMESTAMP_PREFIX}${boardType}`;

      await Promise.all([
        AsyncStorage.setItem(key, JSON.stringify(data)),
        AsyncStorage.setItem(timeKey, String(Date.now())),
      ]);
    } catch (err) {
      console.warn(`[boardCacheService] Gagal menyimpan cache board '${boardType}':`, err);
    }
  },

  /**
   * Mengambil snapshot data board dari storage lokal
   */
  async getBoardCache(boardType: string): Promise<BoardData | null> {
    try {
      const key = `${CACHE_PREFIX}${boardType}`;
      const json = await AsyncStorage.getItem(key);
      if (!json) return null;
      return JSON.parse(json) as BoardData;
    } catch (err) {
      console.warn(`[boardCacheService] Gagal membaca cache board '${boardType}':`, err);
      return null;
    }
  },

  /**
   * Mengambil timestamp terakhir kali cache board disimpan
   */
  async getCacheTimestamp(boardType: string): Promise<number | null> {
    try {
      const timeKey = `${CACHE_TIMESTAMP_PREFIX}${boardType}`;
      const timeStr = await AsyncStorage.getItem(timeKey);
      return timeStr ? Number(timeStr) : null;
    } catch {
      return null;
    }
  },

  /**
   * Menghapus cache board tertentu atau seluruhnya
   */
  async clearBoardCache(boardType?: string): Promise<void> {
    try {
      if (boardType) {
        await AsyncStorage.multiRemove([
          `${CACHE_PREFIX}${boardType}`,
          `${CACHE_TIMESTAMP_PREFIX}${boardType}`,
        ]);
      } else {
        const allKeys = await AsyncStorage.getAllKeys();
        const boardKeys = allKeys.filter(
          (k) => k.startsWith(CACHE_PREFIX) || k.startsWith(CACHE_TIMESTAMP_PREFIX)
        );
        if (boardKeys.length > 0) {
          await AsyncStorage.multiRemove(boardKeys);
        }
      }
    } catch (err) {
      console.warn('[boardCacheService] Gagal menghapus cache:', err);
    }
  },
};
