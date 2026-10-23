-- ==============================================================================
-- MIGRATION: 03_quotations_schema.sql
-- Modul Surat Penawaran Resmi & Rincian Spesifikasi Furniture Alora Studio
-- ==============================================================================

-- 1. Pastikan kolom client_phone ada di board_cards
ALTER TABLE public.board_cards ADD COLUMN IF NOT EXISTS client_phone TEXT;

-- 2. Tabel quotations (Surat Penawaran)
CREATE TABLE IF NOT EXISTS public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES public.board_cards(id) ON DELETE SET NULL,
  quotation_no TEXT UNIQUE NOT NULL, -- Format: 053b/SP/APK/10/26
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_city TEXT NOT NULL DEFAULT 'Yogyakarta',
  project_title TEXT NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  terbilang TEXT NOT NULL DEFAULT '',
  work_duration_days INT DEFAULT 20,
  validity_days INT DEFAULT 20,
  marketing_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  marketing_name TEXT DEFAULT 'Marketing Alora',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected')),
  terms JSONB DEFAULT '[
    {"title": "Termin I", "pct": 50, "desc": "DP Mulai Pekerjaan"},
    {"title": "Termin II", "pct": 25, "desc": "Seting Di Lokasi"},
    {"title": "Termin III", "pct": 25, "desc": "Pekerjaan Selesai"}
  ]'::jsonb,
  issued_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel quotation_items (Rincian Item Spesifikasi Furniture)
CREATE TABLE IF NOT EXISTS public.quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE CASCADE,
  item_no INT NOT NULL DEFAULT 1,
  description TEXT NOT NULL,
  material TEXT,
  accessories TEXT,
  finishing TEXT,
  dimensions TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'SET',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Aktifkan Row Level Security (RLS)
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

-- 5. Kebijakan Akses (RLS Policies)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quotations' AND policyname = 'Allow auth access quotations') THEN
    CREATE POLICY "Allow auth access quotations" ON public.quotations FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quotation_items' AND policyname = 'Allow auth access quotation_items') THEN
    CREATE POLICY "Allow auth access quotation_items" ON public.quotation_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
