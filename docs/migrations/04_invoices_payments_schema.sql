-- ==============================================================================
-- MIGRATION: 04_invoices_payments_schema.sql
-- Modul Invoice Resmi, Multi-Termin Payment Tracking & Kwitansi Alora Studio
-- ==============================================================================

-- 1. Tabel invoices (Invoice Penagihan Resmi)
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
  card_id UUID REFERENCES public.board_cards(id) ON DELETE SET NULL,
  invoice_no TEXT UNIQUE NOT NULL, -- Format: INV-015 atau INV-2026-001
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_address TEXT,
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  balance_due NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid', 'cancelled')),
  bank_name TEXT DEFAULT 'Bank Mandiri',
  bank_account_no TEXT DEFAULT '1370026994893',
  bank_account_holder TEXT DEFAULT 'M.LAFRAN PANE',
  authorized_by TEXT DEFAULT 'M Lafran Pane',
  signature_url TEXT,
  notes TEXT,
  terms JSONB DEFAULT '[
    {"title": "Termin I", "pct": 50, "desc": "DP Mulai Pekerjaan"},
    {"title": "Termin II", "pct": 25, "desc": "Seting Di Lokasi"},
    {"title": "Termin III", "pct": 25, "desc": "Pekerjaan Selesai"}
  ]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel invoice_items (Rincian Item Penagihan)
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  item_no INT NOT NULL DEFAULT 1,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'SET',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel payments (Pencatatan Mutasi Pembayaran & Kwitansi Resmi)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  receipt_no TEXT UNIQUE NOT NULL, -- e.g. RCP-2610-001 atau 1791353657810
  billing_ref TEXT NOT NULL, -- e.g. INV-015
  stage_name TEXT NOT NULL DEFAULT 'Termin I (DP 50%)',
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'Bank Transfer',
  description TEXT,
  amount_words TEXT, -- Terbilang Rupiah Bahasa Indonesia
  proof_url TEXT,
  received_by TEXT DEFAULT 'M Lafran Pane',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan kolom amount_words ada jika tabel sudah dibuat sebelumnya
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS amount_words TEXT;

-- 4. Indeks untuk Query Cepat
CREATE INDEX IF NOT EXISTS idx_invoices_quotation_id ON public.invoices(quotation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_card_id ON public.invoices(card_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);

-- 5. Trigger Sinkronisasi Otomatis paid_amount, balance_due, & status pada invoices
CREATE OR REPLACE FUNCTION public.sync_invoice_payment_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_total_paid NUMERIC;
  v_invoice_total NUMERIC;
  v_balance_due NUMERIC;
  v_new_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM public.payments
  WHERE invoice_id = v_invoice_id;

  SELECT total INTO v_invoice_total
  FROM public.invoices
  WHERE id = v_invoice_id;

  IF v_invoice_total IS NOT NULL THEN
    v_balance_due := GREATEST(0, v_invoice_total - v_total_paid);
    
    IF v_total_paid >= v_invoice_total AND v_invoice_total > 0 THEN
      v_new_status := 'paid';
    ELSIF v_total_paid > 0 THEN
      v_new_status := 'partial';
    ELSE
      v_new_status := 'unpaid';
    END IF;

    UPDATE public.invoices
    SET paid_amount = v_total_paid,
        balance_due = v_balance_due,
        status = v_new_status,
        updated_at = NOW()
    WHERE id = v_invoice_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_invoice_payments ON public.payments;
CREATE TRIGGER trigger_sync_invoice_payments
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_payment_totals();

-- 6. Aktifkan Row Level Security (RLS)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 7. Kebijakan Akses (RLS Policies)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'Allow auth access invoices') THEN
    CREATE POLICY "Allow auth access invoices" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoice_items' AND policyname = 'Allow auth access invoice_items') THEN
    CREATE POLICY "Allow auth access invoice_items" ON public.invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Allow auth access payments') THEN
    CREATE POLICY "Allow auth access payments" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
