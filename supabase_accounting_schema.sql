-- ====================================================================
-- SKEMA AKUNTANSI LENGKAP ALA ACCURATE ONLINE (COA & JURNAL BERPASANGAN)
-- ====================================================================

-- 1. TABEL CHART OF ACCOUNTS (AKUN PERKIRAAN)
CREATE TABLE IF NOT EXISTS public.akun (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode_akun VARCHAR(30) NOT NULL UNIQUE,
    nama_akun VARCHAR(100) NOT NULL,
    tipe_akun VARCHAR(50) NOT NULL, -- Kas & Bank, Piutang, Persediaan, Hutang Lancar, Ekuitas, Pendapatan, HPP, Beban
    saldo_normal VARCHAR(10) NOT NULL CHECK (saldo_normal IN ('DEBIT', 'KREDIT')),
    saldo_awal NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL JURNAL UMUM (HEADER)
CREATE TABLE IF NOT EXISTS public.jurnal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    no_jurnal VARCHAR(50) NOT NULL UNIQUE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    tipe_transaksi VARCHAR(50) NOT NULL, -- PENJUALAN, PEMBELIAN, KAS_MASUK, KAS_KELUAR, PENYESUAIAN
    no_referensi VARCHAR(50),
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL JURNAL UMUM DETAIL (DEBIT & KREDIT)
CREATE TABLE IF NOT EXISTS public.jurnal_detail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jurnal_id UUID NOT NULL REFERENCES public.jurnal(id) ON DELETE CASCADE,
    akun_id UUID NOT NULL REFERENCES public.akun(id) ON DELETE RESTRICT,
    debit NUMERIC(15, 2) NOT NULL DEFAULT 0,
    kredit NUMERIC(15, 2) NOT NULL DEFAULT 0,
    catatan VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- UPDATE TABEL PENJUALAN UNTUK MENDUKUNG TERMIN & ACCURATE INVOICING
ALTER TABLE public.penjualan 
ADD COLUMN IF NOT EXISTS syarat_bayar VARCHAR(30) DEFAULT 'COD',
ADD COLUMN IF NOT EXISTS tgl_jatuh_tempo DATE,
ADD COLUMN IF NOT EXISTS ppn_persen NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ppn_nominal NUMERIC(15,2) DEFAULT 0;

ALTER TABLE public.pembelian 
ADD COLUMN IF NOT EXISTS syarat_bayar VARCHAR(30) DEFAULT 'COD',
ADD COLUMN IF NOT EXISTS tgl_jatuh_tempo DATE;

-- HAK AKSES RLS
ALTER TABLE public.akun ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurnal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurnal_detail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Akses publik akun" ON public.akun FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik jurnal" ON public.jurnal FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik jurnal_detail" ON public.jurnal_detail FOR ALL USING (true) WITH CHECK (true);

-- 4. DAFTAR AKUN (COA) STANDAR AKUNTANSI ACCURATE INDONESIA
INSERT INTO public.akun (kode_akun, nama_akun, tipe_akun, saldo_normal, saldo_awal) VALUES
('1101-01', 'Kas Toko Kasir', 'Kas & Bank', 'DEBIT', 1000000),
('1102-01', 'Bank Transfer (BCA / Mandiri)', 'Kas & Bank', 'DEBIT', 5000000),
('1103-01', 'Piutang Usaha', 'Piutang', 'DEBIT', 0),
('1104-01', 'Persediaan Barang Dagang (Kemasan)', 'Persediaan', 'DEBIT', 0),
('2101-01', 'Hutang Usaha Supplier', 'Hutang Lancar', 'KREDIT', 0),
('3101-01', 'Modal Pemilik', 'Ekuitas', 'KREDIT', 6000000),
('4101-01', 'Pendapatan Penjualan Barang', 'Pendapatan', 'KREDIT', 0),
('4102-01', 'Potongan / Diskon Penjualan', 'Pendapatan', 'DEBIT', 0),
('5101-01', 'Beban Pokok Penjualan (HPP)', 'HPP', 'DEBIT', 0),
('6101-01', 'Beban Listrik, Air & Internet', 'Beban', 'DEBIT', 0),
('6101-02', 'Beban Gaji & Upah Karyawan', 'Beban', 'DEBIT', 0),
('6101-03', 'Beban Operasional & Pengemasan', 'Beban', 'DEBIT', 0)
ON CONFLICT (kode_akun) DO UPDATE SET 
    nama_akun = EXCLUDED.nama_akun,
    tipe_akun = EXCLUDED.tipe_akun,
    saldo_normal = EXCLUDED.saldo_normal;
