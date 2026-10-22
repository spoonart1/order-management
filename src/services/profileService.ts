import { supabase } from '@/lib/supabase';
import { Profile } from '@/store/slices/boardSlice';

/**
 * Service / Data Layer untuk Profiles
 * Memisahkan query database Supabase dari komponen UI dan layar
 */
export const profileService = {
  /**
   * Mengambil daftar profil (karyawan / user) untuk keperluan dropdown PIC / assignees
   */
  async getProfiles(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Error fetching profiles:', error);
      throw error;
    }

    return (data || []) as Profile[];
  },
};
