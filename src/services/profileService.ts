import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkIsOnline } from '@/lib/network';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/store/slices/boardSlice';

const PROFILES_CACHE_KEY = '@alora_profiles_cache';

/**
 * Service / Data Layer untuk Profiles (Offline-First Resilient)
 * Menangani query database Supabase dan penyimpanan cache lokal
 */
export const profileService = {
  /**
   * Mengambil daftar profil (karyawan / user) untuk keperluan dropdown PIC / assignees.
   * Mendukung Offline-First: memuat dari cache lokal jika offline atau saat network gagal.
   */
  async getProfiles(): Promise<Profile[]> {
    const isOnline = await checkIsOnline();

    // 1. Jika terdeteksi offline, langsung ambil dari local cache
    if (!isOnline) {
      console.log('[profileService] Offline mode: mengambil daftar profil dari local cache');
      return await this.getLocalCache();
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name', { ascending: true });

      if (error) throw error;

      const profiles = (data || []) as Profile[];

      // 2. Simpan snapshot profil terbaru ke local cache
      await AsyncStorage.setItem(PROFILES_CACHE_KEY, JSON.stringify(profiles));

      return profiles;
    } catch (error) {
      console.warn('[profileService] Fetch profiles gagal, fallback ke local cache:', error);
      return await this.getLocalCache();
    }
  },

  /**
   * Helper membaca cache lokal profiles
   */
  async getLocalCache(): Promise<Profile[]> {
    try {
      const json = await AsyncStorage.getItem(PROFILES_CACHE_KEY);
      if (!json) return [];
      return JSON.parse(json) as Profile[];
    } catch {
      return [];
    }
  },
};
