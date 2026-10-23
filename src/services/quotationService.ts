import { supabase } from '@/lib/supabase';
import { getRomanMonth, terbilang } from '@/utils/terbilang';

export interface QuotationTerm {
  title: string;
  pct: number;
  desc: string;
}

export interface QuotationItem {
  id?: string;
  quotation_id?: string;
  item_no: number;
  description: string;
  material?: string | null;
  accessories?: string | null;
  finishing?: string | null;
  dimensions?: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
}

export interface Quotation {
  id: string;
  card_id?: string | null;
  quotation_no: string;
  client_name: string;
  client_phone?: string | null;
  client_city: string;
  project_title: string;
  total_amount: number;
  terbilang: string;
  work_duration_days: number;
  validity_days: number;
  marketing_id?: string | null;
  marketing_name: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  terms: QuotationTerm[];
  issued_date: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  quotation_items?: QuotationItem[];
}

export interface SaveQuotationPayload {
  card_id?: string | null;
  quotation_no: string;
  client_name: string;
  client_phone?: string | null;
  client_city?: string;
  project_title: string;
  work_duration_days?: number;
  validity_days?: number;
  marketing_id?: string | null;
  marketing_name?: string;
  status?: 'draft' | 'sent' | 'approved' | 'rejected';
  terms?: QuotationTerm[];
  issued_date?: string;
  notes?: string | null;
  items: Omit<QuotationItem, 'id' | 'quotation_id'>[];
}

/**
 * Service Layer untuk Surat Penawaran Resmi Alora Studio
 */
export const quotationService = {
  /**
   * Menghasilkan nomor surat penawaran unik otomatis
   * Format: [No Urut]/SP/APK/[Bulan Romawi]/[YY]
   * Contoh: 054/SP/APK/10/26
   */
  async generateNextQuotationNumber(): Promise<string> {
    const now = new Date();
    const romanMonth = getRomanMonth(now.getMonth() + 1);
    const shortYear = String(now.getFullYear()).slice(-2);

    try {
      // Hitung jumlah penawaran yang sudah terdaftar
      const { count, error } = await supabase
        .from('quotations')
        .select('id', { count: 'exact', head: true });

      const nextNumber = ((count || 0) + 1).toString().padStart(3, '0');
      return `${nextNumber}/SP/APK/${romanMonth}/${shortYear}`;
    } catch {
      const fallbackNumber = Math.floor(100 + Math.random() * 900);
      return `${fallbackNumber}/SP/APK/${romanMonth}/${shortYear}`;
    }
  },

  /**
   * Mengambil semua daftar surat penawaran
   */
  async getQuotations(): Promise<Quotation[]> {
    const { data, error } = await supabase
      .from('quotations')
      .select(`
        *,
        quotation_items (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quotations:', error);
      throw error;
    }

    return (data || []) as Quotation[];
  },

  /**
   * Mengambil surat penawaran berdasarkan ID lengkap dengan rincian item
   */
  async getQuotationById(id: string): Promise<Quotation | null> {
    const { data, error } = await supabase
      .from('quotations')
      .select(`
        *,
        quotation_items (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching quotation by id:', error);
      throw error;
    }

    if (data && data.quotation_items) {
      data.quotation_items.sort((a: QuotationItem, b: QuotationItem) => a.item_no - b.item_no);
    }

    return data as Quotation;
  },

  /**
   * Mengambil surat penawaran yang terhubung ke kartu kanban tertentu
   */
  async getQuotationByCardId(cardId: string): Promise<Quotation | null> {
    const { data, error } = await supabase
      .from('quotations')
      .select(`
        *,
        quotation_items (*)
      `)
      .eq('card_id', cardId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching quotation by card_id:', error);
      throw error;
    }

    if (data && data.quotation_items) {
      data.quotation_items.sort((a: QuotationItem, b: QuotationItem) => a.item_no - b.item_no);
    }

    return data as Quotation | null;
  },

  /**
   * Membuat surat penawaran baru beserta rincian item spesifikasi furniture
   */
  async createQuotation(payload: SaveQuotationPayload): Promise<Quotation> {
    // 1. Hitung total_amount dari rincian item
    const totalAmount = payload.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const terbilangText = terbilang(totalAmount);

    // 2. Simpan header penawaran
    const { data: newQuotation, error: qError } = await supabase
      .from('quotations')
      .insert({
        card_id: payload.card_id || null,
        quotation_no: payload.quotation_no,
        client_name: payload.client_name,
        client_phone: payload.client_phone || null,
        client_city: payload.client_city || 'Yogyakarta',
        project_title: payload.project_title,
        total_amount: totalAmount,
        terbilang: terbilangText,
        work_duration_days: payload.work_duration_days ?? 20,
        validity_days: payload.validity_days ?? 20,
        marketing_id: payload.marketing_id || null,
        marketing_name: payload.marketing_name || 'Marketing Alora',
        status: payload.status || 'draft',
        terms: payload.terms || [
          { title: 'Termin I', pct: 50, desc: 'DP Mulai Pekerjaan' },
          { title: 'Termin II', pct: 25, desc: 'Seting Di Lokasi' },
          { title: 'Termin III', pct: 25, desc: 'Pekerjaan Selesai' },
        ],
        issued_date: payload.issued_date || new Date().toISOString().split('T')[0],
        notes: payload.notes || null,
      })
      .select()
      .single();

    if (qError) {
      console.error('Error inserting quotation:', qError);
      throw qError;
    }

    // 3. Simpan rincian item
    if (payload.items.length > 0) {
      const itemsToInsert = payload.items.map((item, index) => ({
        quotation_id: newQuotation.id,
        item_no: item.item_no || index + 1,
        description: item.description,
        material: item.material || null,
        accessories: item.accessories || null,
        finishing: item.finishing || null,
        dimensions: item.dimensions || null,
        quantity: Number(item.quantity) || 1,
        unit: item.unit || 'SET',
        unit_price: Number(item.unit_price) || 0,
        amount: Number(item.amount) || 0,
      }));

      const { error: itemsError } = await supabase
        .from('quotation_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error inserting quotation items:', itemsError);
        throw itemsError;
      }
    }

    // 4. Sinkronkan nilai estimasi ke kartu Kanban jika terhubung
    if (payload.card_id && totalAmount > 0) {
      await supabase
        .from('board_cards')
        .update({
          estimated_value: totalAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.card_id);
    }

    return await this.getQuotationById(newQuotation.id) as Quotation;
  },

  /**
   * Mengubah surat penawaran dan memperbarui rincian item
   */
  async updateQuotation(id: string, payload: SaveQuotationPayload): Promise<Quotation> {
    const totalAmount = payload.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const terbilangText = terbilang(totalAmount);

    // 1. Update header penawaran
    const { error: qError } = await supabase
      .from('quotations')
      .update({
        card_id: payload.card_id || null,
        quotation_no: payload.quotation_no,
        client_name: payload.client_name,
        client_phone: payload.client_phone || null,
        client_city: payload.client_city || 'Yogyakarta',
        project_title: payload.project_title,
        total_amount: totalAmount,
        terbilang: terbilangText,
        work_duration_days: payload.work_duration_days ?? 20,
        validity_days: payload.validity_days ?? 20,
        marketing_id: payload.marketing_id || null,
        marketing_name: payload.marketing_name || 'Marketing Alora',
        status: payload.status || 'draft',
        terms: payload.terms,
        issued_date: payload.issued_date,
        notes: payload.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (qError) {
      console.error('Error updating quotation:', qError);
      throw qError;
    }

    // 2. Hapus item lama dan ganti dengan item baru
    await supabase.from('quotation_items').delete().eq('quotation_id', id);

    if (payload.items.length > 0) {
      const itemsToInsert = payload.items.map((item, index) => ({
        quotation_id: id,
        item_no: item.item_no || index + 1,
        description: item.description,
        material: item.material || null,
        accessories: item.accessories || null,
        finishing: item.finishing || null,
        dimensions: item.dimensions || null,
        quantity: Number(item.quantity) || 1,
        unit: item.unit || 'SET',
        unit_price: Number(item.unit_price) || 0,
        amount: Number(item.amount) || 0,
      }));

      const { error: itemsError } = await supabase
        .from('quotation_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    // 3. Sinkronkan nilai estimasi ke kartu Kanban jika terhubung
    if (payload.card_id && totalAmount > 0) {
      await supabase
        .from('board_cards')
        .update({
          estimated_value: totalAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.card_id);
    }

    return await this.getQuotationById(id) as Quotation;
  },

  /**
   * Mengubah status surat penawaran (draft / sent / approved / rejected)
   */
  async updateStatus(id: string, status: 'draft' | 'sent' | 'approved' | 'rejected'): Promise<void> {
    const { error } = await supabase
      .from('quotations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating quotation status:', error);
      throw error;
    }
  },

  /**
   * Menghapus surat penawaran
   */
  async deleteQuotation(id: string): Promise<void> {
    const { error } = await supabase.from('quotations').delete().eq('id', id);
    if (error) {
      console.error('Error deleting quotation:', error);
      throw error;
    }
  },
};
