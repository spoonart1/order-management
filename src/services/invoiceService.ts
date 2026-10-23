import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { terbilang } from '@/utils/terbilang';
import { Quotation } from './quotationService';

export interface InvoiceTerm {
  title: string;
  pct: number;
  desc: string;
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  item_no: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
}

export interface PaymentReceipt {
  id: string;
  invoice_id: string;
  receipt_no: string;
  billing_ref: string;
  stage_name: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  description?: string | null;
  amount_words?: string | null;
  proof_url?: string | null;
  received_by?: string;
  created_at?: string;
}

export interface Invoice {
  id: string;
  quotation_id?: string | null;
  card_id?: string | null;
  invoice_no: string;
  client_name: string;
  client_phone?: string | null;
  client_address?: string | null;
  issue_date: string;
  due_date?: string | null;
  subtotal: number;
  total: number;
  paid_amount: number;
  balance_due: number;
  status: 'unpaid' | 'partial' | 'paid' | 'cancelled';
  bank_name: string;
  bank_account_no: string;
  bank_account_holder: string;
  authorized_by: string;
  signature_url?: string | null;
  notes?: string | null;
  terms?: InvoiceTerm[];
  created_at?: string;
  updated_at?: string;
  invoice_items?: InvoiceItem[];
  payments?: PaymentReceipt[];
}

export interface SaveInvoicePayload {
  quotation_id?: string | null;
  card_id?: string | null;
  invoice_no: string;
  client_name: string;
  client_phone?: string | null;
  client_address?: string | null;
  issue_date?: string;
  due_date?: string | null;
  bank_name?: string;
  bank_account_no?: string;
  bank_account_holder?: string;
  authorized_by?: string;
  signature_url?: string | null;
  notes?: string | null;
  terms?: InvoiceTerm[];
  items: Omit<InvoiceItem, 'id' | 'invoice_id'>[];
}

export interface RecordPaymentPayload {
  invoice_id: string;
  receipt_no?: string;
  billing_ref: string;
  stage_name: string;
  amount: number;
  payment_date?: string;
  payment_method?: string;
  description?: string;
  amount_words?: string;
  proof_url?: string | null;
  received_by?: string;
}

export const DEFAULT_INVOICE_TERMS: InvoiceTerm[] = [
  { title: 'Termin I', pct: 50, desc: 'DP Mulai Pekerjaan' },
  { title: 'Termin II', pct: 25, desc: 'Seting Di Lokasi' },
  { title: 'Termin III', pct: 25, desc: 'Pekerjaan Selesai' },
];

/**
 * Service Layer untuk Invoice, Multi-Termin & Kwitansi Alora Studio
 */
export const invoiceService = {
  /**
   * Menghasilkan nomor Invoice berikutnya
   * Format acuan: INV-015 (INV- dilanjutkan 3 digit sequence)
   */
  async generateNextInvoiceNumber(): Promise<string> {
    try {
      const { count, error } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true });

      const nextSeq = ((count || 0) + 1).toString().padStart(3, '0');
      return `INV-${nextSeq}`;
    } catch {
      const fallbackSeq = Math.floor(10 + Math.random() * 90).toString();
      return `INV-0${fallbackSeq}`;
    }
  },

  /**
   * Menghasilkan nomor kwitansi pembayaran unik
   * Format acuan: timestamp unik atau sequence RCP
   */
  generateReceiptNumber(): string {
    return String(Date.now());
  },

  /**
   * Mengambil semua daftar invoice beserta item dan riwayat pembayarannya
   */
  async getInvoices(): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items (*),
        payments (*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((inv: any) => ({
      ...inv,
      subtotal: Number(inv.subtotal || 0),
      total: Number(inv.total || 0),
      paid_amount: Number(inv.paid_amount || 0),
      balance_due: Number(inv.balance_due || 0),
      invoice_items: (inv.invoice_items || []).sort(
        (a: any, b: any) => (a.item_no || 0) - (b.item_no || 0)
      ),
      payments: (inv.payments || []).sort(
        (a: any, b: any) =>
          new Date(b.created_at || b.payment_date).getTime() -
          new Date(a.created_at || a.payment_date).getTime()
      ),
    }));
  },

  /**
   * Mengambil 1 invoice berdasarkan ID lengkap dengan rincian
   */
  async getInvoiceById(id: string): Promise<Invoice | null> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items (*),
        payments (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    if (!data) return null;

    return {
      ...data,
      subtotal: Number(data.subtotal || 0),
      total: Number(data.total || 0),
      paid_amount: Number(data.paid_amount || 0),
      balance_due: Number(data.balance_due || 0),
      invoice_items: (data.invoice_items || []).sort(
        (a: any, b: any) => (a.item_no || 0) - (b.item_no || 0)
      ),
      payments: (data.payments || []).sort(
        (a: any, b: any) =>
          new Date(b.created_at || b.payment_date).getTime() -
          new Date(a.created_at || a.payment_date).getTime()
      ),
    };
  },

  /**
   * Membuat invoice baru beserta rincian itemnya
   */
  async createInvoice(payload: SaveInvoicePayload): Promise<Invoice> {
    const subtotal = payload.items.reduce(
      (sum, it) => sum + Number(it.amount || 0),
      0
    );
    const total = subtotal;
    const paidAmount = 0;
    const balanceDue = total;

    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        quotation_id: payload.quotation_id || null,
        card_id: payload.card_id || null,
        invoice_no: payload.invoice_no,
        client_name: payload.client_name,
        client_phone: payload.client_phone || null,
        client_address: payload.client_address || null,
        issue_date: payload.issue_date || new Date().toISOString().split('T')[0],
        due_date: payload.due_date || null,
        subtotal,
        total,
        paid_amount: paidAmount,
        balance_due: balanceDue,
        status: 'unpaid',
        bank_name: payload.bank_name || 'Bank Mandiri',
        bank_account_no: payload.bank_account_no || '1370026994893',
        bank_account_holder: payload.bank_account_holder || 'M.LAFRAN PANE',
        authorized_by: payload.authorized_by || 'M Lafran Pane',
        signature_url: payload.signature_url || null,
        notes: payload.notes || null,
        terms: payload.terms || DEFAULT_INVOICE_TERMS,
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    if (payload.items.length > 0) {
      const itemsToInsert = payload.items.map((it, idx) => ({
        invoice_id: invoiceData.id,
        item_no: idx + 1,
        description: it.description,
        quantity: Number(it.quantity || 1),
        unit: it.unit || 'SET',
        unit_price: Number(it.unit_price || 0),
        amount: Number(it.amount || 0),
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    return (await this.getInvoiceById(invoiceData.id)) as Invoice;
  },

  /**
   * Mengedit invoice dan memperbarui rincian itemnya
   */
  async updateInvoice(id: string, payload: SaveInvoicePayload): Promise<Invoice> {
    const existing = await this.getInvoiceById(id);
    const subtotal = payload.items.reduce(
      (sum, it) => sum + Number(it.amount || 0),
      0
    );
    const total = subtotal;
    const paidAmount = existing?.paid_amount || 0;
    const balanceDue = Math.max(0, total - paidAmount);
    const status: Invoice['status'] =
      paidAmount >= total && total > 0
        ? 'paid'
        : paidAmount > 0
        ? 'partial'
        : 'unpaid';

    const { error: invoiceError } = await supabase
      .from('invoices')
      .update({
        quotation_id: payload.quotation_id || null,
        card_id: payload.card_id || null,
        invoice_no: payload.invoice_no,
        client_name: payload.client_name,
        client_phone: payload.client_phone || null,
        client_address: payload.client_address || null,
        issue_date: payload.issue_date || new Date().toISOString().split('T')[0],
        due_date: payload.due_date || null,
        subtotal,
        total,
        paid_amount: paidAmount,
        balance_due: balanceDue,
        status,
        bank_name: payload.bank_name || 'Bank Mandiri',
        bank_account_no: payload.bank_account_no || '1370026994893',
        bank_account_holder: payload.bank_account_holder || 'M.LAFRAN PANE',
        authorized_by: payload.authorized_by || 'M Lafran Pane',
        signature_url: payload.signature_url || null,
        notes: payload.notes || null,
        terms: payload.terms || DEFAULT_INVOICE_TERMS,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (invoiceError) throw invoiceError;

    // Hapus dan gantikan item baru
    await supabase.from('invoice_items').delete().eq('invoice_id', id);

    if (payload.items.length > 0) {
      const itemsToInsert = payload.items.map((it, idx) => ({
        invoice_id: id,
        item_no: idx + 1,
        description: it.description,
        quantity: Number(it.quantity || 1),
        unit: it.unit || 'SET',
        unit_price: Number(it.unit_price || 0),
        amount: Number(it.amount || 0),
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    return (await this.getInvoiceById(id)) as Invoice;
  },

  /**
   * Mengubah status invoice secara langsung
   */
  async updateStatus(id: string, status: Invoice['status']): Promise<void> {
    const { error } = await supabase
      .from('invoices')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Menghapus invoice
   */
  async deleteInvoice(id: string): Promise<void> {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw error;
  },

  /**
   * Mencatat mutasi pembayaran termin baru (Payment Receipt)
   */
  async recordPayment(payload: RecordPaymentPayload): Promise<PaymentReceipt> {
    const receiptNo = payload.receipt_no || this.generateReceiptNumber();
    const amountWords = payload.amount_words || terbilang(payload.amount);

    const { data, error } = await supabase
      .from('payments')
      .insert({
        invoice_id: payload.invoice_id,
        receipt_no: receiptNo,
        billing_ref: payload.billing_ref,
        stage_name: payload.stage_name,
        amount: Number(payload.amount || 0),
        payment_date: payload.payment_date || new Date().toISOString().split('T')[0],
        payment_method: payload.payment_method || 'Bank Transfer',
        description: payload.description || null,
        amount_words: amountWords,
        proof_url: payload.proof_url || null,
        received_by: payload.received_by || 'M Lafran Pane',
      })
      .select()
      .single();

    if (error) throw error;

    // Sinkronisasi manual cadangan (jika DB trigger belum aktif)
    await this.syncInvoicePaymentState(payload.invoice_id);

    return data as PaymentReceipt;
  },

  /**
   * Menghapus catatan mutasi pembayaran
   */
  async deletePayment(paymentId: string, invoiceId: string): Promise<void> {
    const { error } = await supabase.from('payments').delete().eq('id', paymentId);
    if (error) throw error;

    await this.syncInvoicePaymentState(invoiceId);
  },

  /**
   * Helper untuk menghitung ulang total terbayar dan sisa tagihan pada invoice
   */
  async syncInvoicePaymentState(invoiceId: string): Promise<void> {
    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('invoice_id', invoiceId);

    const totalPaid = (payments || []).reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );

    const { data: inv } = await supabase
      .from('invoices')
      .select('total')
      .eq('id', invoiceId)
      .single();

    if (inv) {
      const invTotal = Number(inv.total || 0);
      const balanceDue = Math.max(0, invTotal - totalPaid);
      const status: Invoice['status'] =
        totalPaid >= invTotal && invTotal > 0
          ? 'paid'
          : totalPaid > 0
          ? 'partial'
          : 'unpaid';

      await supabase
        .from('invoices')
        .update({
          paid_amount: totalPaid,
          balance_due: balanceDue,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);
    }
  },

  /**
   * Mengonversi Surat Penawaran (Quotation) menjadi Invoice secara instan
   */
  async createInvoiceFromQuotation(quotation: Quotation): Promise<Invoice> {
    const nextInvoiceNo = await this.generateNextInvoiceNumber();

    const items: Omit<InvoiceItem, 'id' | 'invoice_id'>[] = (
      quotation.quotation_items || []
    ).map((qItem, idx) => ({
      item_no: idx + 1,
      description: qItem.description,
      quantity: Number(qItem.quantity || 1),
      unit: qItem.unit || 'SET',
      unit_price: Number(qItem.unit_price || 0),
      amount: Number(qItem.amount || 0),
    }));

    // Konversi termin penawaran ke termin invoice jika ada
    const terms: InvoiceTerm[] =
      quotation.terms && quotation.terms.length > 0
        ? quotation.terms
        : DEFAULT_INVOICE_TERMS;

    return await this.createInvoice({
      quotation_id: quotation.id,
      card_id: quotation.card_id,
      invoice_no: nextInvoiceNo,
      client_name: quotation.client_name,
      client_phone: quotation.client_phone,
      client_address: quotation.client_city || 'Yogyakarta',
      notes: `Diterbitkan dari Surat Penawaran No. ${quotation.quotation_no}`,
      terms,
      items,
    });
  },

  /**
   * Upload bukti transfer ke Supabase Storage (bucket 'attachments')
   */
  async uploadPaymentProof(
    invoiceId: string,
    asset: { uri: string; mimeType?: string; fileName?: string }
  ): Promise<string> {
    const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
    const filePath = `payment_proofs/${invoiceId}_${Date.now()}.${fileExt}`;

    let fileBody: any;
    if (Platform.OS === 'web') {
      const response = await fetch(asset.uri);
      fileBody = await response.blob();
    } else {
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: `proof.${fileExt}`,
        type: asset.mimeType || `image/${fileExt}`,
      } as any);
      fileBody = formData;
    }

    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(filePath, fileBody, {
        contentType: asset.mimeType || `image/${fileExt}`,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('attachments')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  },
};
