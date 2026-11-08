'use client';

import React, { useState } from 'react';
import {
  Search,
  X,
  Filter,
  Sliders,
  Calendar,
  DollarSign,
  Truck,
  Users,
  RotateCcw,
  Check,
  ChevronDown,
} from 'lucide-react';

export default function TableFilterToolbar({
  searchQuery = '',
  onSearchChange = () => {},
  searchPlaceholder = 'Cari nomor dokumen, kontak, catatan...',
  filters = {},
  onFilterChange = () => {},
  onResetFilters = () => {},
  contacts = [],
  contactType = 'customer', // 'customer' | 'supplier'
  bankAccounts = [],
  categories = [],
  products = [],
  config = {},
  onOpenConfig = () => {},
  totalCount = 0,
  totalAmount = null,
  moduleType = 'so', // 'so' | 'quotation' | 'do' | 'si' | 'payment' | 'po_beli' | 'ri_beli' | 'pi_beli' | 'pp_beli' | 'items' | 'mutation' | 'opname'
}) {
  const isPurchase = moduleType.includes('beli') || contactType === 'supplier';
  const contactLabel = isPurchase ? 'Pemasok' : 'Pelanggan';

  const activeFilters = config?.activeFilters || {
    statusBayar: true,
    statusKirim: true,
    status: true,
    dateRange: true,
    customer: !isPurchase && moduleType !== 'items' && moduleType !== 'mutation' && moduleType !== 'opname',
    supplier: isPurchase,
    bankAkun: false,
    category: moduleType === 'items',
    stockStatus: moduleType === 'items',
    mutationType: moduleType === 'mutation',
    product: moduleType === 'mutation',
  };

  // Cek apakah ada filter yang aktif (bukan 'ALL' atau ada search)
  const isFilterActive =
    (searchQuery && searchQuery.trim() !== '') ||
    (filters.statusBayar && filters.statusBayar !== 'ALL') ||
    (filters.statusKirim && filters.statusKirim !== 'ALL') ||
    (filters.status && filters.status !== 'ALL') ||
    (filters.dateRange && filters.dateRange !== 'ALL') ||
    (filters.customer && filters.customer !== 'ALL') ||
    (filters.supplier && filters.supplier !== 'ALL') ||
    (filters.bankAkun && filters.bankAkun !== 'ALL') ||
    (filters.category && filters.category !== 'ALL') ||
    (filters.stockStatus && filters.stockStatus !== 'ALL') ||
    (filters.mutationType && filters.mutationType !== 'ALL') ||
    (filters.product && filters.product !== 'ALL') ||
    Boolean(filters.customStartDate) ||
    Boolean(filters.customEndDate);

  return (
    <div className="apple-card p-3 rounded-2xl flex flex-col space-y-2.5 mb-2.5">
      {/* Baris 1: Search Box + Dropdown Filters Terpisah + Tombol Pengaturan */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Kolom Kiri: Search Box + Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[300px]">
          {/* 1. Live Search Input */}
          <div className="relative w-64 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-7 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 bg-slate-50/60 hover:bg-white transition-all font-medium text-slate-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                title="Hapus pencarian"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* 2. Filter Status Pembayaran / DP (Terpecah Khusus) */}
          {activeFilters.statusBayar && (moduleType === 'so' || moduleType === 'si' || moduleType === 'pi_beli') && (
            <div className="flex items-center space-x-1">
              <select
                value={filters.statusBayar || 'ALL'}
                onChange={(e) => onFilterChange('statusBayar', e.target.value)}
                className={`py-1.5 px-3 border rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-700/20 cursor-pointer ${
                  filters.statusBayar && filters.statusBayar !== 'ALL'
                    ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <option value="ALL">Status Bayar: Semua</option>
                {moduleType === 'so' ? (
                  <>
                    <option value="BELUM_BAYAR">Belum Bayar (Piutang)</option>
                    <option value="SEBAGIAN_DP">Uang Muka / Sebagian DP</option>
                    <option value="LUNAS">Lunas Penuh</option>
                  </>
                ) : moduleType === 'si' ? (
                  <>
                    <option value="PIUTANG">Belum Lunas (Piutang)</option>
                    <option value="LUNAS">Lunas Penuh</option>
                  </>
                ) : (
                  <>
                    <option value="HUTANG">Belum Lunas (Hutang)</option>
                    <option value="LUNAS">Lunas Penuh</option>
                  </>
                )}
              </select>
            </div>
          )}

          {/* 3. Filter Status Pengiriman / Status Pesanan (Terpecah Khusus) */}
          {activeFilters.statusKirim && moduleType === 'so' && (
            <div className="flex items-center space-x-1">
              <select
                value={filters.statusKirim || 'ALL'}
                onChange={(e) => onFilterChange('statusKirim', e.target.value)}
                className={`py-1.5 px-3 border rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-700/20 cursor-pointer ${
                  filters.statusKirim && filters.statusKirim !== 'ALL'
                    ? 'bg-blue-50 text-blue-900 border-blue-300 font-bold'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <option value="ALL">Status Kirim: Semua</option>
                <option value="MENUNGGU_KIRIM">Menunggu Pengiriman</option>
                <option value="SELESAI">Selesai / Terkirim</option>
              </select>
            </div>
          )}

          {/* Filter Status Dokumen (Quotation, DO, PO Beli) */}
          {activeFilters.status && (moduleType === 'quotation' || moduleType === 'do' || moduleType === 'po_beli') && (
            <div className="flex items-center space-x-1">
              <select
                value={filters.status || 'ALL'}
                onChange={(e) => onFilterChange('status', e.target.value)}
                className={`py-1.5 px-3 border rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-700/20 cursor-pointer ${
                  filters.status && filters.status !== 'ALL'
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <option value="ALL">Status: Semua</option>
                {moduleType === 'quotation' ? (
                  <>
                    <option value="DRAFT">Draft Penawaran</option>
                    <option value="DIKIRIM">Terkirim ke Klien</option>
                    <option value="TERIMA">Diterima / Menjadi PO</option>
                  </>
                ) : moduleType === 'do' ? (
                  <>
                    <option value="PROSES">Dalam Perjalanan / Proses</option>
                    <option value="TERKIRIM">Terkirim Selesai</option>
                  </>
                ) : (
                  <>
                    <option value="MENUNGGU_PENERIMAAN">Menunggu Penerimaan</option>
                    <option value="SELESAI">Selesai Diterima</option>
                  </>
                )}
              </select>
            </div>
          )}

          {/* 4. Filter Periode Tanggal */}
          {activeFilters.dateRange && (
            <div className="flex items-center space-x-1">
              <select
                value={filters.dateRange || 'ALL'}
                onChange={(e) => onFilterChange('dateRange', e.target.value)}
                className={`py-1.5 px-3 border rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-700/20 cursor-pointer ${
                  filters.dateRange && filters.dateRange !== 'ALL'
                    ? 'bg-purple-50 text-purple-900 border-purple-300 font-bold'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <option value="ALL">Periode: Semua Waktu</option>
                <option value="TODAY">Hari Ini</option>
                <option value="7DAYS">7 Hari Terakhir</option>
                <option value="THIS_MONTH">Bulan Ini</option>
                <option value="CUSTOM">Rentang Tanggal Kustom...</option>
              </select>
            </div>
          )}

          {/* 5. Filter Pelanggan / Supplier */}
          {(activeFilters.customer || activeFilters.supplier) && (
            <div className="flex items-center space-x-1">
              <select
                value={(isPurchase ? filters.supplier : filters.customer) || 'ALL'}
                onChange={(e) => onFilterChange(isPurchase ? 'supplier' : 'customer', e.target.value)}
                className={`py-1.5 px-3 border rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-700/20 cursor-pointer max-w-[180px] truncate ${
                  ((isPurchase ? filters.supplier : filters.customer) && (isPurchase ? filters.supplier : filters.customer) !== 'ALL')
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <option value="ALL">{contactLabel}: Semua</option>
                {contacts
                  .filter((c) => (isPurchase ? c.tipe === 'PEMASOK' || c.tipe === 'SUPPLIER' : c.tipe === 'PELANGGAN' || !c.tipe))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* 6. Filter Bank / Rekening Penerima (Payment CR / PP) */}
          {activeFilters.bankAkun && (moduleType === 'payment' || moduleType === 'pp_beli') && (
            <div className="flex items-center space-x-1">
              <select
                value={filters.bankAkun || 'ALL'}
                onChange={(e) => onFilterChange('bankAkun', e.target.value)}
                className={`py-1.5 px-3 border rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-700/20 cursor-pointer ${
                  filters.bankAkun && filters.bankAkun !== 'ALL'
                    ? 'bg-teal-50 text-teal-900 border-teal-300 font-bold'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <option value="ALL">Akun Kas/Bank: Semua</option>
                {(bankAccounts || []).map((b) => (
                  <option key={b.id || b.kode_akun} value={b.id || b.kode_akun}>
                    {b.nama_akun}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 7. Filter Kategori Barang (Persediaan Items) */}
          {activeFilters.category && (moduleType === 'items' || categories.length > 0) && (
            <div className="flex items-center space-x-1">
              <select
                value={filters.category || 'ALL'}
                onChange={(e) => onFilterChange('category', e.target.value)}
                className={`py-1.5 px-3 border rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-700/20 cursor-pointer ${
                  filters.category && filters.category !== 'ALL'
                    ? 'bg-indigo-50 text-indigo-900 border-indigo-300 font-bold'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <option value="ALL">Kategori: Semua</option>
                {categories.map((c, i) => {
                  const val = typeof c === 'string' ? c : c.nama;
                  return (
                    <option key={i} value={val}>
                      {val}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* 8. Filter Status Stok (Persediaan Items) */}
          {activeFilters.stockStatus && moduleType === 'items' && (
            <div className="flex items-center space-x-1">
              <select
                value={filters.stockStatus || 'ALL'}
                onChange={(e) => onFilterChange('stockStatus', e.target.value)}
                className={`py-1.5 px-3 border rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-700/20 cursor-pointer ${
                  filters.stockStatus && filters.stockStatus !== 'ALL'
                    ? 'bg-rose-50 text-rose-900 border-rose-300 font-bold'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <option value="ALL">Status Stok: Semua</option>
                <option value="LOW">Stok Menipis / Kritis (≤ Min)</option>
                <option value="SAFE">Stok Aman / Tersedia</option>
              </select>
            </div>
          )}

          {/* 9. Filter Jenis Mutasi (Persediaan Mutation) */}
          {activeFilters.mutationType && moduleType === 'mutation' && (
            <div className="flex items-center space-x-1">
              <select
                value={filters.mutationType || 'ALL'}
                onChange={(e) => onFilterChange('mutationType', e.target.value)}
                className={`py-1.5 px-3 border rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-700/20 cursor-pointer ${
                  filters.mutationType && filters.mutationType !== 'ALL'
                    ? 'bg-blue-50 text-blue-900 border-blue-300 font-bold'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <option value="ALL">Jenis Mutasi: Semua</option>
                <option value="PEMBELIAN">Pembelian Masuk</option>
                <option value="PENGIRIMAN_DO">Pengiriman DO Keluar</option>
                <option value="PENYESUAIAN_STOK">Penyesuaian / Opname</option>
                <option value="PENJUALAN">Penjualan Kasir</option>
              </select>
            </div>
          )}

          {/* 10. Filter Pilihan Produk (Persediaan Mutation / Opname) */}
          {activeFilters.product && (moduleType === 'mutation' || moduleType === 'opname') && (
            <div className="flex items-center space-x-1">
              <select
                value={filters.product || 'ALL'}
                onChange={(e) => onFilterChange('product', e.target.value)}
                className={`py-1.5 px-3 border rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-700/20 cursor-pointer max-w-[200px] truncate ${
                  filters.product && filters.product !== 'ALL'
                    ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <option value="ALL">Barang: Semua Kemasan</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.kode_sku}] {p.nama}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reset Filter Button */}
          {isFilterActive && (
            <button
              type="button"
              onClick={onResetFilters}
              className="apple-btn-secondary px-2.5 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 border-rose-200 flex items-center space-x-1"
              title="Reset semua filter ke default"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Kolom Kanan: Summary Count + Tombol Atur Filter & Tampilan */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          <div className="text-right text-xs">
            <span className="text-[11px] text-slate-500 font-medium block">
              Ditemukan: <strong className="text-slate-900">{totalCount}</strong> Dokumen
            </span>
            {totalAmount !== null && (
              <span className="text-xs font-bold text-emerald-950 font-mono">
                Rp {Number(totalAmount || 0).toLocaleString('id-ID')}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenConfig}
            className="apple-btn-secondary px-3 py-1.5 text-xs font-bold flex items-center space-x-1.5 shadow-2xs hover:border-emerald-600/40"
            title="Buka Pengaturan Filter, Dropdown & Kolom Tabel"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-800" />
            <span className="hidden sm:inline">Atur Filter &amp; Kolom</span>
          </button>
        </div>
      </div>

      {/* Baris 2 (Opsional): Input Rentang Tanggal Kustom jika user memilih CUSTOM */}
      {filters.dateRange === 'CUSTOM' && (
        <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-center space-x-3 text-xs animate-in fade-in duration-150">
          <span className="font-bold text-slate-700 flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5 text-purple-700" />
            <span>Pilih Rentang Tanggal:</span>
          </span>
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={filters.customStartDate || ''}
              onChange={(e) => onFilterChange('customStartDate', e.target.value)}
              className="py-1 px-2.5 border border-slate-200 rounded-lg text-xs bg-white font-medium"
            />
            <span className="text-slate-400">s/d</span>
            <input
              type="date"
              value={filters.customEndDate || ''}
              onChange={(e) => onFilterChange('customEndDate', e.target.value)}
              className="py-1 px-2.5 border border-slate-200 rounded-lg text-xs bg-white font-medium"
            />
          </div>
        </div>
      )}

      {/* Baris 3: Active Filter Chips / Pills */}
      {isFilterActive && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
          <span className="text-slate-400 font-medium">Filter Aktif:</span>

          {searchQuery && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 font-medium">
              <span>Cari: &quot;{searchQuery}&quot;</span>
              <button onClick={() => onSearchChange('')} className="hover:text-rose-600">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {filters.statusBayar && filters.statusBayar !== 'ALL' && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 font-bold">
              <span>
                Bayar:{' '}
                {filters.statusBayar === 'BELUM_BAYAR'
                  ? 'Belum Bayar'
                  : filters.statusBayar === 'SEBAGIAN_DP'
                  ? 'Sebagian DP'
                  : filters.statusBayar === 'PIUTANG'
                  ? 'Piutang'
                  : filters.statusBayar === 'HUTANG'
                  ? 'Hutang'
                  : 'Lunas'}
              </span>
              <button onClick={() => onFilterChange('statusBayar', 'ALL')} className="hover:text-rose-600">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {filters.statusKirim && filters.statusKirim !== 'ALL' && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-300 font-bold">
              <span>
                Kirim:{' '}
                {filters.statusKirim === 'MENUNGGU_KIRIM' ? 'Menunggu Kirim' : 'Selesai'}
              </span>
              <button onClick={() => onFilterChange('statusKirim', 'ALL')} className="hover:text-rose-600">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {filters.status && filters.status !== 'ALL' && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold">
              <span>
                Status:{' '}
                {filters.status === 'DRAFT'
                  ? 'Draft'
                  : filters.status === 'DIKIRIM'
                  ? 'Terkirim'
                  : filters.status === 'TERIMA'
                  ? 'Diterima'
                  : filters.status === 'PROSES'
                  ? 'Dalam Perjalanan'
                  : filters.status === 'MENUNGGU_PENERIMAAN'
                  ? 'Menunggu Penerimaan'
                  : 'Selesai'}
              </span>
              <button onClick={() => onFilterChange('status', 'ALL')} className="hover:text-rose-600">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {filters.dateRange && filters.dateRange !== 'ALL' && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-900 border border-purple-300 font-bold">
              <span>
                Periode:{' '}
                {filters.dateRange === 'TODAY'
                  ? 'Hari Ini'
                  : filters.dateRange === '7DAYS'
                  ? '7 Hari Terakhir'
                  : filters.dateRange === 'THIS_MONTH'
                  ? 'Bulan Ini'
                  : 'Kustom'}
              </span>
              <button onClick={() => onFilterChange('dateRange', 'ALL')} className="hover:text-rose-600">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {filters.customer && filters.customer !== 'ALL' && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-900 border border-teal-300 font-bold">
              <span>
                Pelanggan: {contacts.find((c) => c.id === filters.customer)?.nama || filters.customer}
              </span>
              <button onClick={() => onFilterChange('customer', 'ALL')} className="hover:text-rose-600">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {filters.supplier && filters.supplier !== 'ALL' && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-900 border border-teal-300 font-bold">
              <span>
                Pemasok: {contacts.find((c) => c.id === filters.supplier)?.nama || filters.supplier}
              </span>
              <button onClick={() => onFilterChange('supplier', 'ALL')} className="hover:text-rose-600">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {filters.bankAkun && filters.bankAkun !== 'ALL' && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-900 border border-teal-300 font-bold">
              <span>
                Akun: {bankAccounts.find((b) => (b.id || b.kode_akun) === filters.bankAkun)?.nama_akun || filters.bankAkun}
              </span>
              <button onClick={() => onFilterChange('bankAkun', 'ALL')} className="hover:text-rose-600">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {filters.category && filters.category !== 'ALL' && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-900 border border-indigo-300 font-bold">
              <span>Kategori: {filters.category}</span>
              <button onClick={() => onFilterChange('category', 'ALL')} className="hover:text-rose-600">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {filters.stockStatus && filters.stockStatus !== 'ALL' && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-900 border border-rose-300 font-bold">
              <span>Stok: {filters.stockStatus === 'LOW' ? 'Menipis (≤ Min)' : 'Aman'}</span>
              <button onClick={() => onFilterChange('stockStatus', 'ALL')} className="hover:text-rose-600">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {filters.mutationType && filters.mutationType !== 'ALL' && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-300 font-bold">
              <span>Mutasi: {filters.mutationType}</span>
              <button onClick={() => onFilterChange('mutationType', 'ALL')} className="hover:text-rose-600">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {filters.product && filters.product !== 'ALL' && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 font-bold">
              <span>Produk: {products.find((p) => p.id === filters.product)?.nama || filters.product}</span>
              <button onClick={() => onFilterChange('product', 'ALL')} className="hover:text-rose-600">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
