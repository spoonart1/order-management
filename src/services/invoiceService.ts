import { Platform } from 'react-native';
import { checkIsOnline } from '@/lib/network';
import { supabase } from '@/lib/supabase';
import { invoiceCacheService } from '@/services/invoiceCacheService';
import { offlineQueueService } from '@/services/offlineQueueService';
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
   * Mengambil semua daftar invoice beserta item dan riwayat pembayarannya (Offline-First Resilient)
   */
  async getInvoices(): Promise<Invoice[]> {
    const isOnline = await checkIsOnline();

    // 1. Jika terdeteksi offline, langsung kembalikan cache lokal tanpa menunggu timeout
    if (!isOnline) {
      console.log('[invoiceService] Offline mode: memuat invoices dari local cache');
      const cached = await invoiceCacheService.getInvoicesCache();
      if (cached) return cached;
    }

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          invoice_items (*),
          payments (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((inv: any) => ({
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

      // 2. Simpan snapshot data terbaru ke local cache
      await invoiceCacheService.saveInvoicesCache(formatted);

      return formatted;
    } catch (err) {
      console.warn('[invoiceService] Gagal fetch invoices online, fallback ke local cache:', err);
      const cached = await invoiceCacheService.getInvoicesCache();
      if (cached) return cached;
      throw err;
    }
  },

  /**
   * Mengambil 1 invoice berdasarkan ID lengkap dengan rincian
   */
  async getInvoiceById(id: string): Promise<Invoice | null> {
    const isOnline = await checkIsOnline();
    if (!isOnline) {
      const cachedList = await invoiceCacheService.getInvoicesCache();
      const found = cachedList?.find((inv) => inv.id === id);
      if (found) return found;
    }

    try {
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
    } catch (err) {
      const cachedList = await invoiceCacheService.getInvoicesCache();
      return cachedList?.find((inv) => inv.id === id) || null;
    }
  },

  /**
   * Membuat invoice baru beserta rincian itemnya (Offline-First Resilient)
   */
  async createInvoice(payload: SaveInvoicePayload): Promise<Invoice> {
    const isOnline = await checkIsOnline();
    const subtotal = payload.items.reduce(
      (sum, it) => sum + Number(it.amount || 0),
      0
    );
    const total = subtotal;
    const paidAmount = 0;
    const balanceDue = total;

    const tempId = `temp_inv_${Date.now()}`;
    const tempInvoice: Invoice = {
      id: tempId,
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      invoice_items: payload.items.map((it, idx) => ({
        id: `temp_item_${tempId}_${idx}`,
        invoice_id: tempId,
        item_no: idx + 1,
        description: it.description,
        quantity: Number(it.quantity || 1),
        unit: it.unit || 'SET',
        unit_price: Number(it.unit_price || 0),
        amount: Number(it.amount || 0),
      })),
      payments: [],
    };

    if (!isOnline) {
      console.log('[invoiceService] Offline: Menyimpan CREATE_INVOICE ke antrean');
      await offlineQueueService.enqueue('CREATE_INVOICE', { payload, tempId });
      await invoiceCacheService.upsertInvoiceInCache(tempInvoice);
      return tempInvoice;
    }

    try {
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

      const created = (await this.getInvoiceById(invoiceData.id)) as Invoice;
      if (created) {
        await invoiceCacheService.upsertInvoiceInCache(created);
      }
      return created || tempInvoice;
    } catch (err) {
      console.warn('[invoiceService] Gagal create invoice online, fallback ke antrean offline:', err);
      await offlineQueueService.enqueue('CREATE_INVOICE', { payload, tempId });
      await invoiceCacheService.upsertInvoiceInCache(tempInvoice);
      return tempInvoice;
    }
  },

  /**
   * Mengedit invoice dan memperbarui rincian itemnya (Offline-First Resilient)
   */
  async updateInvoice(id: string, payload: SaveInvoicePayload): Promise<Invoice> {
    const isOnline = await checkIsOnline();
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

    const updatedData: Invoice = {
      id,
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
      invoice_items: payload.items.map((it, idx) => ({
        id: `temp_item_${id}_${idx}`,
        invoice_id: id,
        item_no: idx + 1,
        description: it.description,
        quantity: Number(it.quantity || 1),
        unit: it.unit || 'SET',
        unit_price: Number(it.unit_price || 0),
        amount: Number(it.amount || 0),
      })),
      payments: existing?.payments || [],
    };

    if (!isOnline) {
      console.log('[invoiceService] Offline: Menyimpan UPDATE_INVOICE ke antrean');
      await offlineQueueService.enqueue('UPDATE_INVOICE', { id, payload });
      await invoiceCacheService.upsertInvoiceInCache(updatedData);
      return updatedData;
    }

    try {
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

      const updated = (await this.getInvoiceById(id)) as Invoice;
      if (updated) {
        await invoiceCacheService.upsertInvoiceInCache(updated);
      }
      return updated || updatedData;
    } catch (err) {
      console.warn('[invoiceService] Gagal update invoice online, fallback ke antrean offline:', err);
      await offlineQueueService.enqueue('UPDATE_INVOICE', { id, payload });
      await invoiceCacheService.upsertInvoiceInCache(updatedData);
      return updatedData;
    }
  },

  /**
   * Mengubah status invoice secara langsung (Offline-First Resilient)
   */
  async updateStatus(id: string, status: Invoice['status']): Promise<void> {
    const isOnline = await checkIsOnline();

    if (!isOnline) {
      console.log('[invoiceService] Offline: Menyimpan UPDATE_INVOICE_STATUS ke antrean');
      await offlineQueueService.enqueue('UPDATE_INVOICE_STATUS', { id, status });
      await invoiceCacheService.updateInvoiceStatusInCache(id, status);
      return;
    }

    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await invoiceCacheService.updateInvoiceStatusInCache(id, status);
    } catch (err) {
      console.warn('[invoiceService] Gagal update invoice status online, fallback ke antrean offline:', err);
      await offlineQueueService.enqueue('UPDATE_INVOICE_STATUS', { id, status });
      await invoiceCacheService.updateInvoiceStatusInCache(id, status);
    }
  },

  /**
   * Menghapus invoice (Offline-First Resilient)
   */
  async deleteInvoice(id: string): Promise<void> {
    const isOnline = await checkIsOnline();

    if (!isOnline) {
      console.log('[invoiceService] Offline: Menyimpan DELETE_INVOICE ke antrean');
      await offlineQueueService.enqueue('DELETE_INVOICE', { id });
      await invoiceCacheService.removeInvoiceFromCache(id);
      return;
    }

    try {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
      await invoiceCacheService.removeInvoiceFromCache(id);
    } catch (err) {
      console.warn('[invoiceService] Gagal delete invoice online, fallback ke antrean offline:', err);
      await offlineQueueService.enqueue('DELETE_INVOICE', { id });
      await invoiceCacheService.removeInvoiceFromCache(id);
    }
  },

  /**
   * Mencatat mutasi pembayaran termin baru (Payment Receipt) (Offline-First Resilient)
   */
  async recordPayment(payload: RecordPaymentPayload): Promise<PaymentReceipt> {
    const isOnline = await checkIsOnline();
    const receiptNo = payload.receipt_no || this.generateReceiptNumber();
    const amountWords = payload.amount_words || terbilang(payload.amount);

    const tempPayment: PaymentReceipt = {
      id: `temp_pmt_${Date.now()}`,
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
      created_at: new Date().toISOString(),
    };

    if (!isOnline) {
      console.log('[invoiceService] Offline: Menyimpan RECORD_PAYMENT ke antrean');
      await offlineQueueService.enqueue('RECORD_PAYMENT', {
        payload: {
          ...payload,
          receipt_no: receiptNo,
          amount_words: amountWords,
        },
      });
      await invoiceCacheService.addPaymentToInvoiceInCache(tempPayment);
      return tempPayment;
    }

    try {
      const paymentData: Record<string, any> = {
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
      };

      let { data, error } = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single();

      // Self-healing jika kolom amount_words belum ditambahkan di tabel payments Supabase
      if (error && (error.message?.includes('amount_words') || (error as any).details?.includes('amount_words'))) {
        delete paymentData.amount_words;
        const retryResult = await supabase
          .from('payments')
          .insert(paymentData)
          .select()
          .single();
        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) {
        throw new Error(error.message || (error as any).details || 'Gagal menyimpan mutasi pembayaran');
      }

      try {
        await this.syncInvoicePaymentState(payload.invoice_id);
      } catch (syncErr) {
        console.warn('[invoiceService.recordPayment] syncInvoicePaymentState warning:', syncErr);
      }

      const savedPayment = {
        ...data,
        amount_words: data.amount_words || amountWords,
      } as PaymentReceipt;

      await invoiceCacheService.addPaymentToInvoiceInCache(savedPayment);
      return savedPayment;
    } catch (err) {
      console.warn('[invoiceService] Gagal record payment online, fallback ke antrean offline:', err);
      await offlineQueueService.enqueue('RECORD_PAYMENT', {
        payload: {
          ...payload,
          receipt_no: receiptNo,
          amount_words: amountWords,
        },
      });
      await invoiceCacheService.addPaymentToInvoiceInCache(tempPayment);
      return tempPayment;
    }
  },

  /**
   * Menghapus catatan mutasi pembayaran (Offline-First Resilient)
   */
  async deletePayment(paymentId: string, invoiceId: string): Promise<void> {
    const isOnline = await checkIsOnline();

    if (!isOnline) {
      console.log('[invoiceService] Offline: Menyimpan DELETE_PAYMENT ke antrean');
      await offlineQueueService.enqueue('DELETE_PAYMENT', { paymentId, invoiceId });
      await invoiceCacheService.removePaymentFromInvoiceInCache(paymentId, invoiceId);
      return;
    }

    try {
      const { error } = await supabase.from('payments').delete().eq('id', paymentId);
      if (error) throw error;

      await this.syncInvoicePaymentState(invoiceId);
      await invoiceCacheService.removePaymentFromInvoiceInCache(paymentId, invoiceId);
    } catch (err) {
      console.warn('[invoiceService] Gagal delete payment online, fallback ke antrean offline:', err);
      await offlineQueueService.enqueue('DELETE_PAYMENT', { paymentId, invoiceId });
      await invoiceCacheService.removePaymentFromInvoiceInCache(paymentId, invoiceId);
    }
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
    try {
      const fileExt = (
        asset.fileName?.split('.').pop() ||
        asset.uri.split(';')[0]?.split('/').pop() ||
        'jpg'
      ).toLowerCase();
      const filePath = `payment_proofs/${invoiceId}_${Date.now()}.${fileExt}`;

      let fileBody: any;
      if (Platform.OS === 'web') {
        // Cek jika asset memiliki objek File/Blob bawaan dari input browser web
        if ((asset as any).file && (asset as any).file instanceof Blob) {
          fileBody = (asset as any).file;
        } else if (asset.uri.startsWith('data:')) {
          // Konversi base64 dataURI ke Blob tanpa fetch (mencegah "TypeError: Load failed" di Safari)
          const byteString = atob(asset.uri.split(',')[1]);
          const mimeString = asset.uri.split(',')[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          fileBody = new Blob([ab], { type: mimeString });
        } else {
          const response = await fetch(asset.uri);
          fileBody = await response.blob();
        }
      } else {
        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          name: asset.fileName || `proof.${fileExt}`,
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

      if (uploadError) {
        console.error('[uploadPaymentProof] Storage upload error:', uploadError);
        throw new Error(uploadError.message || 'Gagal mengunggah bukti ke Supabase Storage');
      }

      const { data: urlData } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (err: any) {
      console.error('[uploadPaymentProof] Error:', err);
      throw new Error(`Upload bukti transfer gagal: ${err?.message || err}`);
    }
  },
};
