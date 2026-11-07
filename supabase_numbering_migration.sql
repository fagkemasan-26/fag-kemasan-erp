-- ====================================================================
-- AUTO NUMBERING GENERATOR SESUAI STANDAR ACCURATE & FAG KEMASAN
-- Format: [PREFIX].[YYYY].[MM].[DD].[SEQ 4 DIGIT]
-- Contoh:
-- Penawaran: SQ.2026.11.05.0001
-- Pesanan:   PO.2026.11.05.0001
-- Pengiriman:DO.2026.11.05.0001
-- Faktur:    SI.2026.11.05.0001
-- Pelunasan: CR.2026.11.05.0001
-- ====================================================================

-- 1. TABEL COUNTER SEQUENCE NOMOR DOKUMEN
CREATE TABLE IF NOT EXISTS public.nomor_dokumen_counter (
    prefix VARCHAR(10) NOT NULL,
    tanggal DATE NOT NULL,
    last_seq INT NOT NULL DEFAULT 0,
    PRIMARY KEY (prefix, tanggal)
);

ALTER TABLE public.nomor_dokumen_counter ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Akses publik counter" ON public.nomor_dokumen_counter;
CREATE POLICY "Akses publik counter" ON public.nomor_dokumen_counter FOR ALL USING (true) WITH CHECK (true);

-- 2. FUNCTION UNTUK GENERATE NOMOR URUT PERSISTENT
CREATE OR REPLACE FUNCTION get_next_doc_number(p_prefix VARCHAR, p_date DATE DEFAULT CURRENT_DATE)
RETURNS VARCHAR AS $$
DECLARE
    v_seq INT;
    v_year VARCHAR;
    v_month VARCHAR;
    v_day VARCHAR;
    v_result VARCHAR;
BEGIN
    v_year := TO_CHAR(p_date, 'YYYY');
    v_month := TO_CHAR(p_date, 'MM');
    v_day := TO_CHAR(p_date, 'DD');

    INSERT INTO public.nomor_dokumen_counter (prefix, tanggal, last_seq)
    VALUES (p_prefix, p_date, 1)
    ON CONFLICT (prefix, tanggal)
    DO UPDATE SET last_seq = public.nomor_dokumen_counter.last_seq + 1
    RETURNING last_seq INTO v_seq;

    v_result := p_prefix || '.' || v_year || '.' || v_month || '.' || v_day || '.' || LPAD(v_seq::TEXT, 4, '0');
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 3. TABEL PENAWARAN PENJUALAN (SALES QUOTATION - SQ)
CREATE TABLE IF NOT EXISTS public.penawaran_penjualan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    no_penawaran VARCHAR(50) NOT NULL UNIQUE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    customer_id UUID REFERENCES public.kontak(id) ON DELETE SET NULL,
    total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.penawaran_penjualan_detail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    penawaran_id UUID NOT NULL REFERENCES public.penawaran_penjualan(id) ON DELETE CASCADE,
    produk_id UUID NOT NULL REFERENCES public.produk(id) ON DELETE RESTRICT,
    qty NUMERIC(12, 2) NOT NULL CHECK (qty > 0),
    harga_jual NUMERIC(15, 2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.penawaran_penjualan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penawaran_penjualan_detail ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses publik penawaran" ON public.penawaran_penjualan;
DROP POLICY IF EXISTS "Akses publik penawaran_detail" ON public.penawaran_penjualan_detail;
CREATE POLICY "Akses publik penawaran" ON public.penawaran_penjualan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik penawaran_detail" ON public.penawaran_penjualan_detail FOR ALL USING (true) WITH CHECK (true);
