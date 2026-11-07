-- ====================================================================
-- SKEMA LENGKAP MODUL PENJUALAN ACCURATE ONLINE (FAG KEMASAN)
-- 1. Penawaran Penjualan (Sales Quotation)
-- 2. Pesanan Penjualan (Sales Order - SO)
-- 3. Pengiriman Pesanan / Surat Jalan (Delivery Order - DO)
-- 4. Faktur Penjualan (Sales Invoice - SI)
-- 5. Penerimaan Penjualan (Sales Receipt / Pelunasan Piutang)
-- ====================================================================

-- 1. PESANAN PENJUALAN (SALES ORDER - SO)
CREATE TABLE IF NOT EXISTS public.pesanan_penjualan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    no_pesanan VARCHAR(50) NOT NULL UNIQUE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_id UUID REFERENCES public.kontak(id) ON DELETE SET NULL,
    total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'MENUNGGU_PENGIRIMAN' CHECK (status IN ('DRAFT', 'MENUNGGU_PENGIRIMAN', 'SEBAGIAN_TERKIRIM', 'SELESAI', 'BATAL')),
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pesanan_penjualan_detail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pesanan_id UUID NOT NULL REFERENCES public.pesanan_penjualan(id) ON DELETE CASCADE,
    produk_id UUID NOT NULL REFERENCES public.produk(id) ON DELETE RESTRICT,
    qty NUMERIC(12, 2) NOT NULL CHECK (qty > 0),
    harga_jual NUMERIC(15, 2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PENGIRIMAN PESANAN / SURAT JALAN (DELIVERY ORDER - DO)
CREATE TABLE IF NOT EXISTS public.pengiriman_pesanan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    no_surat_jalan VARCHAR(50) NOT NULL UNIQUE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_id UUID REFERENCES public.kontak(id) ON DELETE SET NULL,
    pesanan_id UUID REFERENCES public.pesanan_penjualan(id) ON DELETE SET NULL,
    ekspedisi VARCHAR(100),
    no_resi VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'TERKIRIM' CHECK (status IN ('DIPROSES', 'TERKIRIM', 'DITERIMA')),
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pengiriman_pesanan_detail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pengiriman_id UUID NOT NULL REFERENCES public.pengiriman_pesanan(id) ON DELETE CASCADE,
    produk_id UUID NOT NULL REFERENCES public.produk(id) ON DELETE RESTRICT,
    qty NUMERIC(12, 2) NOT NULL CHECK (qty > 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PENERIMAAN PENJUALAN (PELUNASAN PIUTANG / SALES PAYMENT)
CREATE TABLE IF NOT EXISTS public.penerimaan_penjualan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    no_bukti VARCHAR(50) NOT NULL UNIQUE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_id UUID REFERENCES public.kontak(id) ON DELETE SET NULL,
    faktur_id UUID REFERENCES public.penjualan(id) ON DELETE SET NULL,
    akun_kas_id UUID REFERENCES public.akun(id) ON DELETE RESTRICT,
    total_bayar NUMERIC(15, 2) NOT NULL CHECK (total_bayar > 0),
    metode_bayar VARCHAR(30) NOT NULL DEFAULT 'TRANSFER',
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HAK AKSES RLS
ALTER TABLE public.pesanan_penjualan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pesanan_penjualan_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengiriman_pesanan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengiriman_pesanan_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penerimaan_penjualan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Akses publik pesanan_penjualan" ON public.pesanan_penjualan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik pesanan_penjualan_detail" ON public.pesanan_penjualan_detail FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik pengiriman_pesanan" ON public.pengiriman_pesanan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik pengiriman_pesanan_detail" ON public.pengiriman_pesanan_detail FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik penerimaan_penjualan" ON public.penerimaan_penjualan FOR ALL USING (true) WITH CHECK (true);
