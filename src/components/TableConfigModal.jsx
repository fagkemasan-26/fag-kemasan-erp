'use client';

import React, { useState } from 'react';
import {
  X,
  Sliders,
  Check,
  RotateCcw,
  Eye,
  Filter,
  ListFilter,
  Columns,
  Maximize2,
  Save,
  HelpCircle,
  Tag,
  Calendar,
  DollarSign,
  Users,
} from 'lucide-react';

/**
 * DEFAULT TABLE CONFIGURATION PER SUB-MODULE
 */
export const DEFAULT_TABLE_CONFIGS = {
  so: {
    // 1. Filter bars yang aktif di toolbar
    activeFilters: {
      statusBayar: true,
      statusKirim: true,
      dateRange: true,
      customer: true,
      totalRange: false,
    },
    // 2. Default dropdown value saat dibuka pertama kali
    defaultFilterValues: {
      statusBayar: 'ALL',
      statusKirim: 'ALL',
      dateRange: 'ALL',
      customer: 'ALL',
    },
    // 3. Kolom yang ditampilkan di tabel
    visibleColumns: {
      no: true,
      noPesanan: true,
      tanggal: true,
      pelanggan: true,
      catatan: true,
      total: true,
      statusBayar: true,
      statusKirim: true,
      aksiLanjutan: false, // User requested: HILANGKAN AKSI KARENA SUDAH BISA KLIK BARIS
    },
    // 4. Kerapatan dan tata letak
    density: 'normal', // 'compact' | 'normal' | 'spacious'
    sortBy: 'date_desc', // 'date_desc' | 'date_asc' | 'total_desc' | 'total_asc'
    rowClickAction: 'open_form', // 'open_form' | 'print_preview'
  },
  quotation: {
    activeFilters: {
      status: true,
      dateRange: true,
      customer: true,
      totalRange: false,
    },
    defaultFilterValues: {
      status: 'ALL',
      dateRange: 'ALL',
      customer: 'ALL',
    },
    visibleColumns: {
      no: true,
      noPenawaran: true,
      tanggal: true,
      pelanggan: true,
      catatan: true,
      total: true,
      status: true,
      aksiLanjutan: false,
    },
    density: 'normal',
    sortBy: 'date_desc',
    rowClickAction: 'open_form',
  },
  do: {
    activeFilters: {
      status: true,
      dateRange: true,
      customer: true,
      totalRange: false,
    },
    defaultFilterValues: {
      status: 'ALL',
      dateRange: 'ALL',
      customer: 'ALL',
    },
    visibleColumns: {
      no: true,
      noPengiriman: true,
      tanggal: true,
      noPesananRef: true,
      pelanggan: true,
      alamatKirim: true,
      status: true,
      aksiLanjutan: false,
    },
    density: 'normal',
    sortBy: 'date_desc',
    rowClickAction: 'open_form',
  },
  si: {
    activeFilters: {
      statusBayar: true,
      dateRange: true,
      customer: true,
      totalRange: false,
    },
    defaultFilterValues: {
      statusBayar: 'ALL',
      dateRange: 'ALL',
      customer: 'ALL',
    },
    visibleColumns: {
      no: true,
      noInvoice: true,
      tanggal: true,
      jatuhTempo: true,
      pelanggan: true,
      total: true,
      sisaTagihan: true,
      statusBayar: true,
      aksiLanjutan: false,
    },
    density: 'normal',
    sortBy: 'date_desc',
    rowClickAction: 'open_form',
  },
  payment: {
    activeFilters: {
      dateRange: true,
      customer: true,
      bankAkun: true,
    },
    defaultFilterValues: {
      dateRange: 'ALL',
      customer: 'ALL',
      bankAkun: 'ALL',
    },
    visibleColumns: {
      no: true,
      noBukti: true,
      tanggal: true,
      pelanggan: true,
      bankAkun: true,
      nominal: true,
      aksiLanjutan: false,
    },
    density: 'normal',
    sortBy: 'date_desc',
    rowClickAction: 'open_form',
  },
  po_beli: {
    activeFilters: {
      status: true,
      dateRange: true,
      supplier: true,
    },
    defaultFilterValues: {
      status: 'ALL',
      dateRange: 'ALL',
      supplier: 'ALL',
    },
    visibleColumns: {
      no: true,
      noPesanan: true,
      tanggal: true,
      supplier: true,
      catatan: true,
      total: true,
      status: true,
      aksiLanjutan: false,
    },
    density: 'normal',
    sortBy: 'date_desc',
    rowClickAction: 'open_form',
  },
  ri_beli: {
    activeFilters: {
      dateRange: true,
      supplier: true,
    },
    defaultFilterValues: {
      dateRange: 'ALL',
      supplier: 'ALL',
    },
    visibleColumns: {
      no: true,
      noPenerimaan: true,
      tanggal: true,
      supplier: true,
      noSJSupplier: true,
      refPO: true,
      catatan: true,
      aksiLanjutan: false,
    },
    density: 'normal',
    sortBy: 'date_desc',
    rowClickAction: 'open_form',
  },
  pi_beli: {
    activeFilters: {
      statusBayar: true,
      dateRange: true,
      supplier: true,
    },
    defaultFilterValues: {
      statusBayar: 'ALL',
      dateRange: 'ALL',
      supplier: 'ALL',
    },
    visibleColumns: {
      no: true,
      noFaktur: true,
      tanggal: true,
      supplier: true,
      syaratBayar: true,
      total: true,
      statusBayar: true,
      aksiLanjutan: false,
    },
    density: 'normal',
    sortBy: 'date_desc',
    rowClickAction: 'open_form',
  },
  pp_beli: {
    activeFilters: {
      dateRange: true,
      supplier: true,
      bankAkun: true,
    },
    defaultFilterValues: {
      dateRange: 'ALL',
      supplier: 'ALL',
      bankAkun: 'ALL',
    },
    visibleColumns: {
      no: true,
      noBukti: true,
      tanggal: true,
      supplier: true,
      bankAkun: true,
      nominal: true,
      aksiLanjutan: false,
    },
    density: 'normal',
    sortBy: 'date_desc',
    rowClickAction: 'open_form',
  },
  items: {
    activeFilters: {
      category: true,
      stockStatus: true,
    },
    defaultFilterValues: {
      category: 'ALL',
      stockStatus: 'ALL',
    },
    visibleColumns: {
      kodeSku: true,
      nama: true,
      satuan: true,
      stok: true,
      hargaBeli: true,
      hargaJual: true,
      totalValuasi: true,
      aksiLanjutan: false,
    },
    density: 'normal',
    sortBy: 'sku_asc',
    rowClickAction: 'open_card',
  },
  mutation: {
    activeFilters: {
      product: true,
      mutationType: true,
      dateRange: true,
    },
    defaultFilterValues: {
      product: 'ALL',
      mutationType: 'ALL',
      dateRange: 'ALL',
    },
    visibleColumns: {
      tanggal: true,
      kodeSku: true,
      nama: true,
      tipe: true,
      noRef: true,
      masuk: true,
      keluar: true,
      saldoAkhir: true,
      keterangan: true,
    },
    density: 'normal',
    sortBy: 'date_desc',
    rowClickAction: 'open_form',
  },
  opname: {
    activeFilters: {
      dateRange: true,
    },
    defaultFilterValues: {
      dateRange: 'ALL',
    },
    visibleColumns: {
      noPenyesuaian: true,
      tanggal: true,
      tipe: true,
      catatan: true,
      rincianBarang: true,
      totalNilai: true,
    },
    density: 'normal',
    sortBy: 'date_desc',
    rowClickAction: 'open_form',
  },
};

export default function TableConfigModal({
  isOpen,
  onClose,
  moduleKey = 'so',
  moduleTitle = 'Pesanan Penjualan (PO)',
  config,
  onSaveConfig,
}) {
  const [activeTab, setActiveTab] = useState('filters'); // 'filters' | 'columns' | 'options' | 'layout'
  const [localConfig, setLocalConfig] = useState(() => {
    return config || DEFAULT_TABLE_CONFIGS[moduleKey] || DEFAULT_TABLE_CONFIGS.so;
  });

  if (!isOpen) return null;

  const handleToggleFilter = (key) => {
    setLocalConfig((prev) => ({
      ...prev,
      activeFilters: {
        ...prev.activeFilters,
        [key]: !prev.activeFilters?.[key],
      },
    }));
  };

  const handleToggleColumn = (key) => {
    setLocalConfig((prev) => ({
      ...prev,
      visibleColumns: {
        ...prev.visibleColumns,
        [key]: !prev.visibleColumns?.[key],
      },
    }));
  };

  const handleResetToDefault = () => {
    if (confirm('Kembalikan pengaturan filter & kolom ke setelan bawaan sistem?')) {
      const def = DEFAULT_TABLE_CONFIGS[moduleKey] || DEFAULT_TABLE_CONFIGS.so;
      setLocalConfig(def);
      onSaveConfig(def);
      onClose();
    }
  };

  const handleSave = () => {
    onSaveConfig(localConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="apple-card w-full max-w-2xl bg-white/95 rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200/80 bg-slate-50/80 backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-2xs">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Pengaturan Filter &amp; Tampilan Data
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Kustomisasi filter aktif, visibilitas kolom, dan tata letak untuk {moduleTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="apple-btn-subtle p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Apple Segmented Tab Header */}
        <div className="px-5 pt-3 pb-2 bg-slate-50/40 border-b border-slate-200/60 flex items-center justify-between">
          <div className="flex items-center space-x-1 bg-slate-200/60 p-1 rounded-xl backdrop-blur-sm border border-slate-200/80 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('filters')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'filters'
                  ? 'bg-white text-emerald-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>1. Filter Aktif</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('columns')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'columns'
                  ? 'bg-white text-emerald-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>2. Kolom Tabel</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('layout')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'layout'
                  ? 'bg-white text-emerald-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>3. Kerapatan &amp; Klik</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetToDefault}
            className="apple-btn-secondary px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600 flex items-center space-x-1"
            title="Kembalikan semua ke default"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Bawaan</span>
          </button>
        </div>

        {/* Modal Body / Tab Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {/* TAB 1: PILIHAN FILTER AKTIF */}
          {activeTab === 'filters' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 flex items-start space-x-2 text-emerald-900 text-xs">
                <HelpCircle className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                <span>
                  Centang tombol/dropdown filter yang ingin dimunculkan pada toolbar pencarian. Filter yang tidak dicentang akan disembunyikan agar tampilan lebih ringkas.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {moduleKey === 'so' && (
                  <>
                    <label className="apple-card-interactive p-3.5 flex items-center justify-between cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block text-xs">
                            Filter Status Pembayaran / DP
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Semua, Belum Bayar, Sebagian DP, Lunas
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(localConfig.activeFilters?.statusBayar)}
                        onChange={() => handleToggleFilter('statusBayar')}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                    </label>

                    <label className="apple-card-interactive p-3.5 flex items-center justify-between cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                          <Tag className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block text-xs">
                            Filter Status Pengiriman
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Semua, Menunggu Kirim, Selesai Terkirim
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(localConfig.activeFilters?.statusKirim)}
                        onChange={() => handleToggleFilter('statusKirim')}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                    </label>
                  </>
                )}

                {(moduleKey === 'quotation' || moduleKey === 'do') && (
                  <label className="apple-card-interactive p-3.5 flex items-center justify-between cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 block text-xs">
                          Filter Status Dokumen
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Saring data berdasarkan status dokumen
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(localConfig.activeFilters?.status)}
                      onChange={() => handleToggleFilter('status')}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                  </label>
                )}

                {moduleKey === 'si' && (
                  <label className="apple-card-interactive p-3.5 flex items-center justify-between cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 block text-xs">
                          Filter Status Pelunasan Invoice
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Belum Lunas (Piutang) &amp; Lunas
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(localConfig.activeFilters?.statusBayar)}
                      onChange={() => handleToggleFilter('statusBayar')}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                  </label>
                )}

                <label className="apple-card-interactive p-3.5 flex items-center justify-between cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">
                        Filter Periode / Tanggal
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Hari ini, 7 hari, bulan ini, rentang kustom
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(localConfig.activeFilters?.dateRange)}
                    onChange={() => handleToggleFilter('dateRange')}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                </label>

                {/* Filter Supplier untuk Pembelian */}
                {(moduleKey.includes('beli') || localConfig.activeFilters?.supplier !== undefined) && (
                  <label className="apple-card-interactive p-3.5 flex items-center justify-between cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 block text-xs">
                          Filter Nama Pemasok / Supplier
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Dropdown pilihan spesifik per supplier
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(localConfig.activeFilters?.supplier)}
                      onChange={() => handleToggleFilter('supplier')}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                  </label>
                )}

                {/* Filter Kas / Bank */}
                {(moduleKey === 'payment' || moduleKey === 'pp_beli' || localConfig.activeFilters?.bankAkun !== undefined) && (
                  <label className="apple-card-interactive p-3.5 flex items-center justify-between cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 block text-xs">
                          Filter Akun Kas / Bank
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Dropdown pilihan rekening penampung / sumber
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(localConfig.activeFilters?.bankAkun)}
                      onChange={() => handleToggleFilter('bankAkun')}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                  </label>
                )}

                {!moduleKey.includes('beli') && moduleKey !== 'items' && moduleKey !== 'mutation' && moduleKey !== 'opname' && (
                  <label className="apple-card-interactive p-3.5 flex items-center justify-between cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 block text-xs">
                          Filter Nama Pelanggan
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Dropdown pilihan spesifik per pelanggan
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(localConfig.activeFilters?.customer)}
                      onChange={() => handleToggleFilter('customer')}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                  </label>
                )}

                {/* Filter Persediaan: Kategori Barang */}
                {localConfig.activeFilters?.category !== undefined && (
                  <label className="apple-card-interactive p-3.5 flex items-center justify-between cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 block text-xs">
                          Filter Kategori Barang
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Saring barang berdasarkan kelompok kategori
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(localConfig.activeFilters?.category)}
                      onChange={() => handleToggleFilter('category')}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                  </label>
                )}

                {/* Filter Persediaan: Status Ketersediaan Stok */}
                {localConfig.activeFilters?.stockStatus !== undefined && (
                  <label className="apple-card-interactive p-3.5 flex items-center justify-between cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 block text-xs">
                          Filter Status Ketersediaan Stok
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Stok menipis (&le; batas minimum) atau stok aman
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(localConfig.activeFilters?.stockStatus)}
                      onChange={() => handleToggleFilter('stockStatus')}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                  </label>
                )}

                {/* Filter Mutasi: Jenis Mutasi */}
                {localConfig.activeFilters?.mutationType !== undefined && (
                  <label className="apple-card-interactive p-3.5 flex items-center justify-between cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 block text-xs">
                          Filter Jenis Mutasi
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Pembelian Masuk, Pengiriman DO, Opname, dsb
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(localConfig.activeFilters?.mutationType)}
                      onChange={() => handleToggleFilter('mutationType')}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                  </label>
                )}

                {/* Filter Mutasi: Pilihan Produk */}
                {localConfig.activeFilters?.product !== undefined && (
                  <label className="apple-card-interactive p-3.5 flex items-center justify-between cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 block text-xs">
                          Filter Pilihan Barang Spesifik
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Fokuskan kartu stok pada produk tertentu
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(localConfig.activeFilters?.product)}
                      onChange={() => handleToggleFilter('product')}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: VISIBILITAS KOLOM TABEL */}
          {activeTab === 'columns' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-slate-600 text-xs">
                <span>
                  Pilih kolom data yang ingin ditampilkan pada tabel. Untuk kenyamanan pengguna, kolom <strong>Aksi Lanjutan</strong> dinonaktifkan secara bawaan karena dokumen dapat langsung dibuka dengan <strong>klik pada baris tabel mana saja</strong>.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Object.entries(localConfig.visibleColumns || {}).map(([colKey, isVisible]) => {
                  const labels = {
                    no: 'No. Urut Baris',
                    noPesanan: 'Nomor Pesanan (PO)',
                    noPenawaran: 'Nomor Penawaran (PI)',
                    noPengiriman: 'Nomor Surat Jalan (DO)',
                    noInvoice: 'Nomor Faktur (SI)',
                    noFaktur: 'Nomor Faktur Pembelian (FB)',
                    noPenerimaan: 'Nomor Penerimaan Barang (RI)',
                    noBukti: 'Nomor Bukti Kas (CR / PP)',
                    noSJSupplier: 'No. Surat Jalan Pemasok',
                    noPesananRef: 'Referensi Nomor Pesanan',
                    refPO: 'Ref. Pesanan Pembelian (PO)',
                    tanggal: 'Tanggal Dokumen',
                    jatuhTempo: 'Tanggal Jatuh Tempo',
                    pelanggan: 'Nama Pelanggan',
                    supplier: 'Nama Pemasok / Supplier',
                    alamatKirim: 'Alamat / Ekspedisi Pengiriman',
                    catatan: 'Keterangan / Catatan',
                    total: 'Total Nilai (Rp)',
                    nominal: 'Nominal Kas (Rp)',
                    sisaTagihan: 'Sisa Piutang (Rp)',
                    statusBayar: 'Status Pembayaran / DP / Pelunasan',
                    statusKirim: 'Status Pengiriman',
                    status: 'Status Dokumen',
                    syaratBayar: 'Syarat Bayar / Termin',
                    bankAkun: 'Akun Kas / Bank',
                    kodeSku: 'Kode SKU Barang',
                    nama: 'Nama Barang Kemasan',
                    kategori: 'Kategori Barang',
                    satuan: 'Satuan Kemasan',
                    stok: 'Stok Gudang',
                    hargaBeli: 'Harga Beli Pokok (HPP)',
                    hargaJual: 'Harga Jual Satuan',
                    totalValuasi: 'Total Valuasi Nilai Stok',
                    tipe: 'Jenis / Tipe Mutasi',
                    noRef: 'Nomor Referensi Dokumen',
                    masuk: 'Kuantitas Masuk (+ In)',
                    keluar: 'Kuantitas Keluar (- Out)',
                    saldoAkhir: 'Saldo Akhir Stok',
                    noPenyesuaian: 'Nomor Penyesuaian (Opname)',
                    rincianBarang: 'Rincian Jumlah Barang',
                    totalNilai: 'Total Nilai Finansial (Rp)',
                    aksiLanjutan: 'Kolom Tombol Aksi (Opsional)',
                  };

                  return (
                    <label
                      key={colKey}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        isVisible
                          ? 'bg-white border-emerald-300 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${isVisible ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="font-semibold text-slate-800 text-xs">
                          {labels[colKey] || colKey}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(isVisible)}
                        onChange={() => handleToggleColumn(colKey)}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: KERAPATAN & AKSI KLIK */}
          {activeTab === 'layout' && (
            <div className="space-y-4">
              {/* Density Setting */}
              <div className="space-y-2">
                <label className="font-bold text-slate-800 block text-xs">
                  Kerapatan Baris Tabel (Display Density):
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'compact', label: 'Ringkas (Compact)', desc: 'Baris rapat, muat banyak data' },
                    { id: 'normal', label: 'Standar (Normal)', desc: 'Tampilan Apple ERP ideal' },
                    { id: 'spacious', label: 'Lapang (Spacious)', desc: 'Padding lega untuk layar sentuh' },
                  ].map((d) => (
                    <div
                      key={d.id}
                      onClick={() => setLocalConfig({ ...localConfig, density: d.id })}
                      className={`apple-card-interactive p-3 cursor-pointer text-center ${
                        localConfig.density === d.id
                          ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20'
                          : ''
                      }`}
                    >
                      <span className="font-bold text-slate-900 block text-xs">{d.label}</span>
                      <span className="text-[10px] text-slate-400 block mt-1">{d.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sorting Default */}
              <div className="space-y-2 pt-2 border-t border-slate-200/80">
                <label className="font-bold text-slate-800 block text-xs">
                  Urutan Bawaan Data (Default Sorting):
                </label>
                <select
                  value={localConfig.sortBy || 'date_desc'}
                  onChange={(e) => setLocalConfig({ ...localConfig, sortBy: e.target.value })}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl bg-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                >
                  <option value="date_desc">Tanggal Terbaru &rarr; Terlama</option>
                  <option value="date_asc">Tanggal Terlama &rarr; Terbaru</option>
                  <option value="total_desc">Total Nilai Tertinggi &rarr; Terendah</option>
                  <option value="total_asc">Total Nilai Terendah &rarr; Tertinggi</option>
                </select>
              </div>

              {/* Row Click Action */}
              <div className="space-y-2 pt-2 border-t border-slate-200/80">
                <label className="font-bold text-slate-800 block text-xs">
                  Aksi Saat Baris Tabel Diklik:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setLocalConfig({ ...localConfig, rowClickAction: 'open_form' })}
                    className={`apple-card-interactive p-3 cursor-pointer ${
                      localConfig.rowClickAction !== 'print_preview'
                        ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20'
                        : ''
                    }`}
                  >
                    <span className="font-bold text-slate-900 block text-xs">Buka Formulir / Detail</span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Membuka rincian pesanan untuk diedit, diproses atau dicetak
                    </span>
                  </div>

                  <div
                    onClick={() => setLocalConfig({ ...localConfig, rowClickAction: 'print_preview' })}
                    className={`apple-card-interactive p-3 cursor-pointer ${
                      localConfig.rowClickAction === 'print_preview'
                        ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20'
                        : ''
                    }`}
                  >
                    <span className="font-bold text-slate-900 block text-xs">Pratinjau Cetak / PDF</span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Langsung membuka dialog cetak / ekspor PDF dokumen
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium">
            Pengaturan tersimpan otomatis di peramban Anda.
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="apple-btn-secondary px-4 py-2 text-xs font-semibold"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="apple-btn-primary px-5 py-2 text-xs font-bold flex items-center space-x-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan &amp; Terapkan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
