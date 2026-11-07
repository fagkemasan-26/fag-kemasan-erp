-- ====================================================================
-- SKEMA DATABASE: SISTEM KASIR & PENCATATAN FAG KEMASAN
-- (Mini Accurate Online: Master, Stok, Pembelian, Penjualan & Kas)
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABEL KATEGORI PRODUK
CREATE TABLE IF NOT EXISTS public.kategori (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(100) NOT NULL UNIQUE,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL SATUAN
CREATE TABLE IF NOT EXISTS public.satuan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL KONTAK (Pelanggan & Supplier)
CREATE TABLE IF NOT EXISTS public.kontak (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(150) NOT NULL,
    tipe VARCHAR(20) NOT NULL CHECK (tipe IN ('pelanggan', 'supplier', 'keduanya')),
    telepon VARCHAR(30),
    email VARCHAR(100),
    alamat TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL MASTER PRODUK / BARANG
CREATE TABLE IF NOT EXISTS public.produk (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode_sku VARCHAR(50) NOT NULL UNIQUE,
    nama VARCHAR(200) NOT NULL,
    kategori_id UUID REFERENCES public.kategori(id) ON DELETE SET NULL,
    satuan VARCHAR(30) DEFAULT 'Pcs',
    harga_beli NUMERIC(15, 2) NOT NULL DEFAULT 0, -- HPP Modal
    harga_jual NUMERIC(15, 2) NOT NULL DEFAULT 0, -- Harga Jual Kasir
    stok NUMERIC(12, 2) NOT NULL DEFAULT 0,
    min_stok NUMERIC(12, 2) NOT NULL DEFAULT 5,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL PEMBELIAN (Penerimaan Barang / Faktur Beli dari Supplier)
CREATE TABLE IF NOT EXISTS public.pembelian (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    no_faktur VARCHAR(50) NOT NULL UNIQUE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier_id UUID REFERENCES public.kontak(id) ON DELETE SET NULL,
    total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status_bayar VARCHAR(20) NOT NULL DEFAULT 'LUNAS' CHECK (status_bayar IN ('LUNAS', 'HUTANG')),
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. DETAIL PEMBELIAN
CREATE TABLE IF NOT EXISTS public.pembelian_detail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pembelian_id UUID NOT NULL REFERENCES public.pembelian(id) ON DELETE CASCADE,
    produk_id UUID NOT NULL REFERENCES public.produk(id) ON DELETE RESTRICT,
    qty NUMERIC(12, 2) NOT NULL CHECK (qty > 0),
    harga_beli NUMERIC(15, 2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABEL PENJUALAN (Kasir / POS / Faktur Jual)
CREATE TABLE IF NOT EXISTS public.penjualan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    no_invoice VARCHAR(50) NOT NULL UNIQUE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_id UUID REFERENCES public.kontak(id) ON DELETE SET NULL,
    total_bruto NUMERIC(15, 2) NOT NULL DEFAULT 0,
    diskon NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_akhir NUMERIC(15, 2) NOT NULL DEFAULT 0,
    bayar NUMERIC(15, 2) NOT NULL DEFAULT 0,
    kembali NUMERIC(15, 2) NOT NULL DEFAULT 0,
    metode_bayar VARCHAR(30) NOT NULL DEFAULT 'TUNAI' CHECK (metode_bayar IN ('TUNAI', 'TRANSFER', 'QRIS', 'PIUTANG')),
    status VARCHAR(20) NOT NULL DEFAULT 'LUNAS' CHECK (status IN ('LUNAS', 'PIUTANG')),
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. DETAIL PENJUALAN
CREATE TABLE IF NOT EXISTS public.penjualan_detail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    penjualan_id UUID NOT NULL REFERENCES public.penjualan(id) ON DELETE CASCADE,
    produk_id UUID NOT NULL REFERENCES public.produk(id) ON DELETE RESTRICT,
    qty NUMERIC(12, 2) NOT NULL CHECK (qty > 0),
    harga_jual NUMERIC(15, 2) NOT NULL DEFAULT 0,
    hpp NUMERIC(15, 2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. KARTU RIWAYAT STOK (Mutasi Stok Akurat)
CREATE TABLE IF NOT EXISTS public.riwayat_stok (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produk_id UUID NOT NULL REFERENCES public.produk(id) ON DELETE CASCADE,
    tanggal TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tipe VARCHAR(30) NOT NULL CHECK (tipe IN ('PEMBELIAN', 'PENJUALAN', 'PENYESUAIAN_MASUK', 'PENYESUAIAN_KELUAR')),
    qty NUMERIC(12, 2) NOT NULL,
    stok_akhir NUMERIC(12, 2) NOT NULL,
    keterangan TEXT,
    no_referensi VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. BUKU KAS & BANK (Accounting Ringkas: Arus Kas & Biaya)
CREATE TABLE IF NOT EXISTS public.kas_transaksi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    tipe VARCHAR(10) NOT NULL CHECK (tipe IN ('MASUK', 'KELUAR')),
    kategori VARCHAR(50) NOT NULL CHECK (kategori IN ('PENJUALAN', 'PEMBELIAN', 'OPERASIONAL', 'GAJI', 'SEWA', 'LAINNYA')),
    nominal NUMERIC(15, 2) NOT NULL CHECK (nominal > 0),
    keterangan TEXT,
    no_referensi VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- AUTOMATIC TRIGGERS (Stok otomatis bertambah/berkurang)
-- ====================================================================

-- Trigger Pembelian: Menambah stok produk dan mencatat ke riwayat_stok
CREATE OR REPLACE FUNCTION tr_tambah_stok_pembelian()
RETURNS TRIGGER AS $$
DECLARE
    v_stok_sekarang NUMERIC;
    v_no_faktur VARCHAR;
BEGIN
    SELECT no_faktur INTO v_no_faktur FROM public.pembelian WHERE id = NEW.pembelian_id;
    
    UPDATE public.produk
    SET stok = stok + NEW.qty,
        harga_beli = NEW.harga_beli,
        updated_at = NOW()
    WHERE id = NEW.produk_id
    RETURNING stok INTO v_stok_sekarang;

    INSERT INTO public.riwayat_stok (produk_id, tipe, qty, stok_akhir, keterangan, no_referensi)
    VALUES (NEW.produk_id, 'PEMBELIAN', NEW.qty, v_stok_sekarang, 'Stok masuk dari pembelian', v_no_faktur);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pembelian_tambah_stok ON public.pembelian_detail;
CREATE TRIGGER trg_pembelian_tambah_stok
AFTER INSERT ON public.pembelian_detail
FOR EACH ROW EXECUTE FUNCTION tr_tambah_stok_pembelian();


-- Trigger Penjualan: Mengurangi stok produk dan mencatat ke riwayat_stok
CREATE OR REPLACE FUNCTION tr_kurang_stok_penjualan()
RETURNS TRIGGER AS $$
DECLARE
    v_stok_sekarang NUMERIC;
    v_no_inv VARCHAR;
BEGIN
    SELECT no_invoice INTO v_no_inv FROM public.penjualan WHERE id = NEW.penjualan_id;

    UPDATE public.produk
    SET stok = stok - NEW.qty,
        updated_at = NOW()
    WHERE id = NEW.produk_id
    RETURNING stok INTO v_stok_sekarang;

    INSERT INTO public.riwayat_stok (produk_id, tipe, qty, stok_akhir, keterangan, no_referensi)
    VALUES (NEW.produk_id, 'PENJUALAN', -NEW.qty, v_stok_sekarang, 'Stok keluar dari penjualan kasir', v_no_inv);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_penjualan_kurang_stok ON public.penjualan_detail;
CREATE TRIGGER trg_penjualan_kurang_stok
AFTER INSERT ON public.penjualan_detail
FOR EACH ROW EXECUTE FUNCTION tr_kurang_stok_penjualan();

-- ====================================================================
-- RLS POLICIES (Bypass RLS untuk Local App agar mudah diakses)
-- ====================================================================
ALTER TABLE public.kategori ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satuan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kontak ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pembelian ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pembelian_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penjualan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penjualan_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riwayat_stok ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_transaksi ENABLE ROW LEVEL SECURITY;

-- Izinkan akses penuh (SELECT, INSERT, UPDATE, DELETE) untuk anon/authenticated
CREATE POLICY "Akses publik kategori" ON public.kategori FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik satuan" ON public.satuan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik kontak" ON public.kontak FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik produk" ON public.produk FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik pembelian" ON public.pembelian FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik pembelian_detail" ON public.pembelian_detail FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik penjualan" ON public.penjualan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik penjualan_detail" ON public.penjualan_detail FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik riwayat_stok" ON public.riwayat_stok FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik kas_transaksi" ON public.kas_transaksi FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- DATA AWAL CONTOH (FAG KEMASAN)
-- ====================================================================
INSERT INTO public.kategori (nama, keterangan) VALUES
('Box & Dus Karton', 'Dus kemasan, kardus die cut, packaging box'),
('Standing Pouch', 'Kemasan klip standing pouch aluminium & transparan'),
('Botol & Toples', 'Botol plastik almond, toples kue, jar'),
('Plastik & Kresek', 'Kantong kresek HD, bubble wrap, stretch film'),
('Lakban & Aksesoris', 'Lakban fragile, opp tape, stiker segel')
ON CONFLICT (nama) DO NOTHING;

INSERT INTO public.satuan (nama) VALUES
('Pcs'), ('Pack'), ('Dus'), ('Roll'), ('Rim')
ON CONFLICT (nama) DO NOTHING;

INSERT INTO public.kontak (nama, tipe, telepon, alamat) VALUES
('Pelanggan Umum', 'pelanggan', '081234567890', 'Walk-in Customer'),
('Supplier Utama Pabrik Box', 'supplier', '081987654321', 'Kawasan Industri Cikarang')
ON CONFLICT DO NOTHING;

INSERT INTO public.produk (kode_sku, nama, kategori_id, satuan, harga_beli, harga_jual, stok, min_stok)
SELECT 'BOX-001', 'Kardus Die Cut 20x20x5 cm', id, 'Pcs', 1800, 2500, 250, 20
FROM public.kategori WHERE nama = 'Box & Dus Karton' LIMIT 1;

INSERT INTO public.produk (kode_sku, nama, kategori_id, satuan, harga_beli, harga_jual, stok, min_stok)
SELECT 'SPOUCH-01', 'Standing Pouch 14x22 cm Klip Transparan', id, 'Pack', 22000, 30000, 80, 10
FROM public.kategori WHERE nama = 'Standing Pouch' LIMIT 1;

INSERT INTO public.produk (kode_sku, nama, kategori_id, satuan, harga_beli, harga_jual, stok, min_stok)
SELECT 'BW-001', 'Bubble Wrap Roll 1.25m x 50m Hitam', id, 'Roll', 85000, 110000, 15, 3
FROM public.kategori WHERE nama = 'Plastik & Kresek' LIMIT 1;
