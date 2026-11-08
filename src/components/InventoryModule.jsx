'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  FileText,
  Calendar,
  AlertTriangle,
  History,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Pencil,
  ExternalLink,
  ChevronRight,
  Tag,
  DollarSign,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getNextDocNumber, createJournalEntry } from '../lib/accounting';
import QuickAddProductModal from './QuickAddProductModal';
import { TableSkeleton, MetricCardsSkeleton, FormSkeleton } from './SkeletonShimmer';
import TableFilterToolbar from './TableFilterToolbar';
import TableConfigModal, { DEFAULT_TABLE_CONFIGS } from './TableConfigModal';

export default function InventoryModule({
  activeTab = 'items', // 'items' | 'adjustment' | 'mutation'
  onTabChange,
  products = [],
  accounts = [],
  categories = [],
  satuanList = [],
  companySettings = {},
  onRefresh = () => {},
  onOpenNewProductModal = () => {},
  onCategoryCreated = () => {},
  onSatuanCreated = () => {},
  showToast = null,
}) {
  const [activeSubTab, setActiveSubTab] = useState(activeTab);

  useEffect(() => {
    if (activeTab) {
      setActiveSubTab(activeTab);
      if (activeTab === 'adjustment') loadAdjustments();
      if (activeTab === 'mutation') loadMutationHistory();
    }
  }, [activeTab]);

  const [selectedProductForCard, setSelectedProductForCard] = useState('ALL');

  // Table Configuration (Columns, Filters, Density) per Sub-Module
  const [tableConfigs, setTableConfigs] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('fag_inventory_table_configs_v1');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading inventory table configs:', e);
      }
    }
    return DEFAULT_TABLE_CONFIGS;
  });

  const [activeConfigModal, setActiveConfigModal] = useState(null); // 'items' | 'mutation' | 'opname' | null

  const handleSaveTableConfig = (moduleKey, newCfg) => {
    setTableConfigs((prev) => {
      const updated = { ...prev, [moduleKey]: newCfg };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('fag_inventory_table_configs_v1', JSON.stringify(updated));
        } catch (e) {
          console.error('Error saving inventory table configs:', e);
        }
      }
      return updated;
    });
  };

  // Modular Advanced Filters
  const [advancedFilters, setAdvancedFilters] = useState({
    items: {
      category: 'ALL',
      stockStatus: 'ALL',
    },
    mutation: {
      product: 'ALL',
      mutationType: 'ALL',
      dateRange: 'ALL',
      customStartDate: '',
      customEndDate: '',
    },
    opname: {
      dateRange: 'ALL',
      customStartDate: '',
      customEndDate: '',
    },
  });

  const [searchQueries, setSearchQueries] = useState({
    items: '',
    mutation: '',
    opname: '',
  });

  const handleFilterChange = (modKey, filterName, value) => {
    setAdvancedFilters((prev) => ({
      ...prev,
      [modKey]: {
        ...prev[modKey],
        [filterName]: value,
      },
    }));
  };

  const handleResetFilters = (modKey) => {
    setAdvancedFilters((prev) => ({
      ...prev,
      [modKey]: DEFAULT_TABLE_CONFIGS[modKey]?.defaultFilterValues || {},
    }));
    setSearchQueries((prev) => ({
      ...prev,
      [modKey]: '',
    }));
  };

  // Helper date filter
  const matchDateRange = (docDate, range, customStart, customEnd) => {
    if (!range || range === 'ALL') return true;
    const today = new Date().toISOString().split('T')[0];
    if (range === 'TODAY') return docDate === today;
    if (range === '7DAYS') {
      const d7 = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      return docDate >= d7 && docDate <= today;
    }
    if (range === 'THIS_MONTH') {
      const ym = today.slice(0, 7);
      return docDate?.startsWith(ym);
    }
    if (range === 'CUSTOM') {
      if (customStart && docDate < customStart) return false;
      if (customEnd && docDate > customEnd) return false;
    }
    return true;
  };

  // Modal State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [cascadeDelete, setCascadeDelete] = useState(true);
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      setIsDeleting(true);
      setDeleteError('');

      // Jika cascadeDelete aktif (default), bersihkan seluruh detail transaksi terkait terlebih dahulu
      if (cascadeDelete) {
        await supabase.from('penyesuaian_persediaan_detail').delete().eq('produk_id', productToDelete.id);
        await supabase.from('riwayat_stok').delete().eq('produk_id', productToDelete.id);
        await supabase.from('pesanan_penjualan_detail').delete().eq('produk_id', productToDelete.id);
        await supabase.from('penawaran_penjualan_detail').delete().eq('produk_id', productToDelete.id);
        await supabase.from('pengiriman_pesanan_detail').delete().eq('produk_id', productToDelete.id);
        await supabase.from('penjualan_detail').delete().eq('produk_id', productToDelete.id);
        await supabase.from('pesanan_pembelian_detail').delete().eq('produk_id', productToDelete.id);
        await supabase.from('penerimaan_barang_detail').delete().eq('produk_id', productToDelete.id);
        await supabase.from('pembelian_detail').delete().eq('produk_id', productToDelete.id);
      }

      // Hapus produk dari database
      const { error } = await supabase.from('produk').delete().eq('id', productToDelete.id);
      if (error) {
        if (error.code === '23503') {
          setDeleteError('Kemasan ini masih terhubung dengan transaksi. Pastikan opsi "Hapus seluruh riwayat data terkait" dicentang lalu klik Hapus lagi.');
          return;
        }
        throw error;
      }

      setIsDeleteModalOpen(false);
      setProductToDelete(null);
      setCascadeDelete(true);
      setDeleteError('');
      if (showToast) {
        showToast('Master kemasan berhasil dihapus dari sistem.', 'success', 'Kemasan Dihapus');
      }
      if (onRefresh) await onRefresh();
    } catch (err) {
      setDeleteError('Terjadi kesalahan saat menghapus kemasan: ' + (err.message || 'Error'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Stock Mutation Data
  const [mutationHistory, setMutationHistory] = useState([]);
  const [loadingMutations, setLoadingMutations] = useState(false);

  // Adjustment State
  const [adjustmentsList, setAdjustmentsList] = useState([]);
  const [loadingAdjustments, setLoadingAdjustments] = useState(false);
  const [adjustmentView, setAdjustmentView] = useState('list'); // 'list' | 'form'
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);

  // Adjustment Form State
  const [adjForm, setAdjForm] = useState({
    no_penyesuaian: '',
    tanggal: new Date().toISOString().split('T')[0],
    tipe: 'OPNAME', // 'OPNAME' | 'TAMBAH' | 'KURANG'
    akun_id: '',
    catatan: '',
    items: [],
  });

  // Load stock mutations
  const loadMutationHistory = async () => {
    try {
      setLoadingMutations(true);
      const { data, error } = await supabase
        .from('riwayat_stok')
        .select(`
          id,
          produk_id,
          tanggal,
          tipe,
          qty,
          stok_akhir,
          keterangan,
          no_referensi,
          created_at,
          produk:produk_id (id, kode_sku, nama, satuan, harga_beli, harga_jual)
        `)
        .order('created_at', { ascending: false })
        .limit(300);

      if (error) {
        console.error('Error loading mutation history:', error);
      } else {
        setMutationHistory(data || []);
      }
    } catch (err) {
      console.error('Catch load mutations:', err);
    } finally {
      setLoadingMutations(false);
    }
  };

  // Load adjustment documents
  const loadAdjustments = async () => {
    try {
      setLoadingAdjustments(true);
      const { data, error } = await supabase
        .from('penyesuaian_persediaan')
        .select(`
          id,
          no_penyesuaian,
          tanggal,
          tipe,
          akun_id,
          total_nilai,
          catatan,
          created_at,
          details:penyesuaian_persediaan_detail (
            id,
            produk_id,
            qty,
            harga_satuan,
            subtotal,
            catatan,
            produk:produk_id (kode_sku, nama, satuan)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading adjustments:', error);
      } else {
        setAdjustmentsList(data || []);
      }
    } catch (err) {
      console.error('Catch load adjustments:', err);
    } finally {
      setLoadingAdjustments(false);
    }
  };

  useEffect(() => {
    loadMutationHistory();
    loadAdjustments();
  }, []);

  // Initialize new adjustment form
  const initNewAdjustment = async (preselectedProduct = null) => {
    try {
      const nextNo = await getNextDocNumber('IA', 'penyesuaian_persediaan', 'no_penyesuaian');
      
      // Default adjustment account: Beban Selisih Persediaan (6101-03) or COGS (5101-01)
      const defaultAccount = accounts.find(
        (a) => (a.kode_akun || a.kode) === '6101-03' || (a.kode_akun || a.kode)?.startsWith('6101') || (a.kode_akun || a.kode)?.startsWith('5101')
      ) || accounts[0];

      let initialItems = [];
      if (preselectedProduct) {
        initialItems = [
          {
            produk_id: preselectedProduct.id,
            produk_nama: preselectedProduct.nama,
            kode_sku: preselectedProduct.kode_sku,
            stok_sistem: Number(preselectedProduct.stok || 0),
            tipe_item: 'TAMBAH',
            qty_selisih: 1,
            harga_satuan: Number(preselectedProduct.harga_beli || preselectedProduct.harga_jual || 0),
            catatan_item: 'Penyesuaian stok fisik',
          },
        ];
      }

      setAdjForm({
        no_penyesuaian: nextNo,
        tanggal: new Date().toISOString().split('T')[0],
        tipe: 'OPNAME',
        akun_id: defaultAccount ? defaultAccount.id : '',
        catatan: 'Stock Opname Penyesuaian Persediaan Kemasan',
        items: initialItems,
      });

      setAdjustmentView('form');
    } catch (err) {
      console.error('Failed to init adjustment form:', err);
    }
  };

  // Add Item to Adjustment Form
  const handleAddItemToAdj = () => {
    if (!products.length) return;
    const defaultProd = products[0];
    setAdjForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          produk_id: defaultProd.id,
          produk_nama: defaultProd.nama,
          kode_sku: defaultProd.kode_sku,
          stok_sistem: Number(defaultProd.stok || 0),
          tipe_item: 'TAMBAH',
          qty_selisih: 1,
          harga_satuan: Number(defaultProd.harga_beli || defaultProd.harga_jual || 0),
          catatan_item: '',
        },
      ],
    }));
  };

  const handleUpdateAdjItem = (index, field, value) => {
    setAdjForm((prev) => {
      const updated = [...prev.items];
      if (field === 'produk_id') {
        const prod = products.find((p) => p.id === value);
        if (prod) {
          updated[index] = {
            ...updated[index],
            produk_id: prod.id,
            produk_nama: prod.nama,
            kode_sku: prod.kode_sku,
            stok_sistem: Number(prod.stok || 0),
            harga_satuan: Number(prod.harga_beli || prod.harga_jual || 0),
          };
        }
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return { ...prev, items: updated };
    });
  };

  const handleRemoveAdjItem = (index) => {
    setAdjForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Submit Adjustment
  const handleSubmitAdjustment = async (e) => {
    e.preventDefault();
    if (!adjForm.items.length) {
      if (showToast) showToast('Harap masukkan minimal 1 barang untuk disesuaikan!', 'warning', 'Validasi');
      else alert('Harap masukkan minimal 1 barang untuk disesuaikan!');
      return;
    }

    try {
      setSubmittingAdjustment(true);

      // 1. Calculate total value
      let totalNilai = 0;
      adjForm.items.forEach((item) => {
        const qty = Number(item.qty_selisih || 0);
        const harga = Number(item.harga_satuan || 0);
        const sub = qty * harga;
        if (item.tipe_item === 'TAMBAH') {
          totalNilai += sub;
        } else {
          totalNilai -= sub;
        }
      });

      // 2. Insert into penyesuaian_persediaan
      const { data: adjDoc, error: adjErr } = await supabase
        .from('penyesuaian_persediaan')
        .insert({
          no_penyesuaian: adjForm.no_penyesuaian,
          tanggal: adjForm.tanggal,
          tipe: adjForm.tipe,
          akun_id: adjForm.akun_id || null,
          total_nilai: Math.abs(totalNilai),
          catatan: adjForm.catatan,
        })
        .select()
        .single();

      if (adjErr) throw adjErr;

      // 3. Process each item: insert detail, update product stock, insert riwayat_stok
      for (const item of adjForm.items) {
        const qty = Number(item.qty_selisih || 0);
        const harga = Number(item.harga_satuan || 0);
        const subtotal = qty * harga;

        // Insert detail
        await supabase.from('penyesuaian_persediaan_detail').insert({
          penyesuaian_id: adjDoc.id,
          produk_id: item.produk_id,
          qty: qty,
          harga_satuan: harga,
          subtotal: subtotal,
          catatan: `${item.tipe_item === 'TAMBAH' ? '(+) Tambah' : '(-) Kurang'} - ${item.catatan_item || ''}`,
        });

        // Compute stock change
        const currentProd = products.find((p) => p.id === item.produk_id);
        const currentStock = Number(currentProd?.stok || 0);
        const newStock = item.tipe_item === 'TAMBAH' ? currentStock + qty : Math.max(0, currentStock - qty);

        // Update product stock
        await supabase
          .from('produk')
          .update({ stok: newStock, updated_at: new Date().toISOString() })
          .eq('id', item.produk_id);

        // Insert riwayat_stok
        await supabase.from('riwayat_stok').insert({
          produk_id: item.produk_id,
          tanggal: new Date().toISOString(),
          tipe: 'PENYESUAIAN_STOK',
          qty: item.tipe_item === 'TAMBAH' ? qty : -qty,
          stok_akhir: newStock,
          keterangan: `Penyesuaian [${adjForm.no_penyesuaian}]: ${item.tipe_item === 'TAMBAH' ? 'Tambah Stok' : 'Pengurangan Stok'} (${item.catatan_item || adjForm.catatan})`,
          no_referensi: adjForm.no_penyesuaian,
        });
      }

      // 4. Post Double-Entry Journal
      // Persediaan Barang Kemasan: 1104-01
      // Beban Penyesuaian / Selisih: 6101-03 (or selected akun_id)
      const absValue = Math.abs(totalNilai);
      if (absValue > 0) {
        const inventoryAccount = accounts.find((a) => (a.kode_akun || a.kode) === '1104-01') || accounts.find((a) => (a.kode_akun || a.kode)?.startsWith('1104'));
        const expenseAccount = accounts.find((a) => a.id === adjForm.akun_id) || accounts.find((a) => (a.kode_akun || a.kode) === '6101-03') || accounts.find((a) => (a.kode_akun || a.kode)?.startsWith('6101'));

        if (inventoryAccount && expenseAccount) {
          if (totalNilai >= 0) {
            // Net Tambah: Debit Persediaan, Kredit Beban Selisih / Pendapatan Penyesuaian
            await createJournalEntry({
              noJurnal: `JU.${adjForm.no_penyesuaian}`,
              tanggal: adjForm.tanggal,
              tipeTransaksi: 'PENYESUAIAN_STOK',
              noReferensi: adjForm.no_penyesuaian,
              keterangan: `Penyesuaian Persediaan (Tambah Stok) No. ${adjForm.no_penyesuaian}`,
              details: [
                { kodeAkun: inventoryAccount.kode_akun || '1104-01', debit: absValue, kredit: 0, catatan: 'Penambahan Aset Persediaan Fisik' },
                { kodeAkun: expenseAccount.kode_akun || '6101-03', debit: 0, kredit: absValue, catatan: 'Kredit Penyeimbang Opname' },
              ],
            });
          } else {
            // Net Kurang: Debit Beban Selisih Persediaan, Kredit Persediaan
            await createJournalEntry({
              noJurnal: `JU.${adjForm.no_penyesuaian}`,
              tanggal: adjForm.tanggal,
              tipeTransaksi: 'PENYESUAIAN_STOK',
              noReferensi: adjForm.no_penyesuaian,
              keterangan: `Penyesuaian Persediaan (Pengurangan Stok / Reject) No. ${adjForm.no_penyesuaian}`,
              details: [
                { kodeAkun: expenseAccount.kode_akun || '6101-03', debit: absValue, kredit: 0, catatan: 'Beban Kerusakan / Selisih Opname' },
                { kodeAkun: inventoryAccount.kode_akun || '1104-01', debit: 0, kredit: absValue, catatan: 'Pengurangan Aset Persediaan Fisik' },
              ],
            });
          }
        }
      }

      if (showToast) {
        showToast(`Penyesuaian Persediaan ${adjForm.no_penyesuaian} berhasil disimpan & jurnal otomatis terbentuk!`, 'success', 'Penyesuaian Berhasil');
      } else {
        alert(`Penyesuaian Persediaan ${adjForm.no_penyesuaian} berhasil disimpan & jurnal otomatis terbentuk!`);
      }
      setAdjustmentView('list');
      await loadAdjustments();
      await loadMutationHistory();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error saving adjustment:', err);
      if (showToast) {
        showToast('Gagal menyimpan penyesuaian: ' + err.message, 'error', 'Gagal');
      } else {
        alert('Gagal menyimpan penyesuaian: ' + err.message);
      }
    } finally {
      setSubmittingAdjustment(false);
    }
  };

  // Metrics Calculations
  const totalSKU = products.length;
  const totalFisik = products.reduce((acc, p) => acc + Number(p.stok || 0), 0);
  const totalValuasi = products.reduce((acc, p) => acc + (Number(p.stok || 0) * Number(p.harga_beli || 0)), 0);
  const lowStockCount = products.filter((p) => Number(p.stok || 0) <= Number(p.min_stok || 5)).length;

  // Unique / registered categories for filter toolbar
  const categoryFilterList = useMemo(() => {
    if (Array.isArray(categories) && categories.length > 0) return categories;
    return Array.from(new Set(products.map((p) => p.kategori?.nama).filter(Boolean)));
  }, [categories, products]);

  // Filtered & Sorted products (Items)
  const itemsCfg = tableConfigs?.items || DEFAULT_TABLE_CONFIGS.items;
  const filteredProducts = products
    .filter((p) => {
      const q = (searchQueries.items || '').toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.kode_sku || '').toLowerCase().includes(q) ||
        (p.nama || '').toLowerCase().includes(q) ||
        (p.satuan || '').toLowerCase().includes(q);

      const catFlt = advancedFilters.items?.category;
      const matchCat =
        !catFlt ||
        catFlt === 'ALL' ||
        p.kategori?.nama === catFlt ||
        p.kategori_id === catFlt;

      const stokNum = Number(p.stok || 0);
      const minStok = Number(p.min_stok || 5);
      const isLow = stokNum <= minStok;

      const stockFlt = advancedFilters.items?.stockStatus;
      let matchStock = true;
      if (stockFlt === 'LOW') matchStock = isLow;
      if (stockFlt === 'SAFE') matchStock = !isLow;

      return matchSearch && matchCat && matchStock;
    })
    .sort((a, b) => {
      const sort = itemsCfg.sortBy || 'sku_asc';
      if (sort === 'sku_asc') return (a.kode_sku || '').localeCompare(b.kode_sku || '');
      if (sort === 'name_asc') return (a.nama || '').localeCompare(b.nama || '');
      if (sort === 'stock_desc') return Number(b.stok || 0) - Number(a.stok || 0);
      if (sort === 'stock_asc') return Number(a.stok || 0) - Number(b.stok || 0);
      if (sort === 'val_desc') {
        const valB = Number(b.stok || 0) * Number(b.harga_beli || 0);
        const valA = Number(a.stok || 0) * Number(a.harga_beli || 0);
        return valB - valA;
      }
      return 0;
    });

  // Filtered & Sorted Adjustments (Stock Opname)
  const opnameCfg = tableConfigs?.opname || DEFAULT_TABLE_CONFIGS.opname;
  const filteredAdjustments = adjustmentsList
    .filter((adj) => {
      const q = (searchQueries.opname || '').toLowerCase().trim();
      const matchSearch =
        !q ||
        (adj.no_penyesuaian || '').toLowerCase().includes(q) ||
        (adj.catatan || '').toLowerCase().includes(q);

      const dateFlt = advancedFilters.opname?.dateRange;
      const matchDate = matchDateRange(
        adj.tanggal,
        dateFlt,
        advancedFilters.opname?.customStartDate,
        advancedFilters.opname?.customEndDate
      );

      return matchSearch && matchDate;
    })
    .sort((a, b) => {
      return new Date(b.tanggal || 0) - new Date(a.tanggal || 0);
    });

  // Filtered & Sorted Stock Mutations
  const mutationCfg = tableConfigs?.mutation || DEFAULT_TABLE_CONFIGS.mutation;
  const filteredMutations = mutationHistory
    .filter((m) => {
      const q = (searchQueries.mutation || '').toLowerCase().trim();
      const matchSearch =
        !q ||
        (m.produk?.kode_sku || '').toLowerCase().includes(q) ||
        (m.produk?.nama || '').toLowerCase().includes(q) ||
        (m.no_referensi || '').toLowerCase().includes(q) ||
        (m.catatan || '').toLowerCase().includes(q);

      const prodFlt = advancedFilters.mutation?.product;
      const matchProd = !prodFlt || prodFlt === 'ALL' || m.produk_id === prodFlt;

      const typeFlt = advancedFilters.mutation?.mutationType;
      const matchType = !typeFlt || typeFlt === 'ALL' || m.tipe === typeFlt;

      const dateFlt = advancedFilters.mutation?.dateRange;
      const mDate = (m.created_at || m.tanggal || '').slice(0, 10);
      const matchDate = matchDateRange(
        mDate,
        dateFlt,
        advancedFilters.mutation?.customStartDate,
        advancedFilters.mutation?.customEndDate
      );

      return matchSearch && matchProd && matchType && matchDate;
    })
    .sort((a, b) => {
      return new Date(b.created_at || b.tanggal || 0) - new Date(a.created_at || a.tanggal || 0);
    });

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 space-y-3">
      {/* 1. Sub-Header Toolbar (Accurate Online Clean View Indicator) */}
      <div className="apple-card px-4 py-2.5 rounded-2xl flex items-center justify-between flex-wrap gap-2.5">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100/80 text-emerald-950 flex items-center justify-center">
            {activeSubTab === 'items' ? (
              <Package className="w-4 h-4 text-emerald-800" />
            ) : activeSubTab === 'adjustment' ? (
              <SlidersHorizontal className="w-4 h-4 text-emerald-800" />
            ) : (
              <History className="w-4 h-4 text-emerald-800" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                {activeSubTab === 'items'
                  ? 'Master Barang & Kemasan'
                  : activeSubTab === 'adjustment'
                  ? 'Penyesuaian Persediaan (Stok Opname)'
                  : 'Kartu Stok & Riwayat Mutasi'}
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                {activeSubTab === 'items'
                  ? `${products.length} SKU Kemasan Aktif`
                  : activeSubTab === 'adjustment'
                  ? 'Audit & Koreksi Stok'
                  : 'Kronologis In / Out'}
              </span>
            </div>
          </div>
        </div>

        {/* Global Action (Apple Tactile Buttons) */}
        <div className="flex items-center space-x-2">
          {activeSubTab === 'items' && (
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="apple-btn-primary px-3.5 py-1.5 text-xs font-bold flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ Tambah Master Kemasan</span>
            </button>
          )}

          {activeSubTab === 'adjustment' && adjustmentView === 'list' && (
            <button
              onClick={() => initNewAdjustment()}
              className="apple-btn-primary px-4 py-2 text-xs font-bold flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ Input Penyesuaian Baru</span>
            </button>
          )}

          <button
            onClick={() => {
              if (onRefresh) onRefresh();
              loadMutationHistory();
              loadAdjustments();
            }}
            className="apple-btn-secondary p-2 rounded-xl text-slate-600 hover:text-slate-900"
            title="Muat Ulang Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. TAB CONTENT: BARANG & JASA (MASTER KEMASAN) */}
      {activeSubTab === 'items' && (
        <div className="flex-1 flex flex-col min-h-0 space-y-3">
          {/* Summary Metric Cards with Apple Card Hover Physics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="apple-card-interactive p-4 group">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Jenis Kemasan (SKU)
              </span>
              <div className="flex items-baseline space-x-2 mt-1.5">
                <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">{totalSKU}</span>
                <span className="text-xs text-slate-500 font-medium">Item Aktif</span>
              </div>
            </div>

            <div className="apple-card-interactive p-4 group">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Kuantitas Fisik
              </span>
              <div className="flex items-baseline space-x-2 mt-1.5">
                <span className="text-2xl font-black text-emerald-800 font-mono tracking-tight">
                  {totalFisik.toLocaleString('id-ID')}
                </span>
                <span className="text-xs text-slate-500 font-medium">Unit di Gudang</span>
              </div>
            </div>

            <div className="apple-card-interactive p-4 group">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Valuasi Persediaan (Nilai Aset)
              </span>
              <div className="flex items-baseline space-x-1 mt-1.5">
                <span className="text-2xl font-black text-emerald-950 font-mono tracking-tight">
                  Rp {totalValuasi.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div className="apple-card-interactive p-4 group">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Perhatian Stok Rendah
              </span>
              <div className="flex items-baseline space-x-2 mt-1.5">
                <span className={`text-2xl font-black font-mono tracking-tight ${lowStockCount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {lowStockCount}
                </span>
                <span className="text-xs text-slate-500 font-medium">Perlu Pengadaan</span>
              </div>
            </div>
          </div>

          {/* Modular Table Filter Toolbar with Category, Stock Status & Config Modal */}
          <TableFilterToolbar
            searchQuery={searchQueries.items}
            onSearchChange={(val) => setSearchQueries((prev) => ({ ...prev, items: val }))}
            searchPlaceholder="Cari kode SKU (00000), nama kemasan, satuan..."
            filters={advancedFilters.items}
            onFilterChange={(f, v) => handleFilterChange('items', f, v)}
            onResetFilters={() => handleResetFilters('items')}
            categories={categoryFilterList}
            config={itemsCfg}
            onOpenConfig={() => setActiveConfigModal('items')}
            totalCount={filteredProducts.length}
            totalAmount={filteredProducts.reduce((acc, p) => acc + (Number(p.stok || 0) * Number(p.harga_beli || 0)), 0)}
            moduleType="items"
          />

          {/* Product Master Table (Apple High-Density Data Table) */}
          <div className="flex-1 flex flex-col min-h-0 apple-card overflow-hidden rounded-2xl">
            <div className="flex-1 overflow-auto">
              {(() => {
                const cols = itemsCfg.visibleColumns || {
                  kodeSku: true,
                  nama: true,
                  satuan: true,
                  stok: true,
                  hargaBeli: true,
                  hargaJual: true,
                  totalValuasi: true,
                  aksiLanjutan: false,
                };
                const py = itemsCfg.density === 'compact' ? 'py-1.5 px-3' : itemsCfg.density === 'spacious' ? 'py-3.5 px-4' : 'py-2.5 px-3.5';

                return (
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50/90 backdrop-blur-sm text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        {cols.kodeSku !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Kode SKU</th>}
                        {cols.nama !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Nama Barang Kemasan</th>}
                        {cols.satuan !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Satuan</th>}
                        {cols.stok !== false && <th className="py-3 px-3.5 text-center border-r border-slate-200/60">Stok Gudang</th>}
                        {cols.hargaBeli !== false && <th className="py-3 px-3.5 text-right border-r border-slate-200/60">Harga Beli Pokok</th>}
                        {cols.hargaJual !== false && <th className="py-3 px-3.5 text-right border-r border-slate-200/60">Harga Jual</th>}
                        {cols.totalValuasi !== false && <th className="py-3 px-3.5 text-right border-r border-slate-200/60">Valuasi Total (Rp)</th>}
                        <th className="py-3 px-3.5 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="py-12 text-center text-slate-400">
                            Tidak ada data kemasan yang sesuai pencarian.
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((p) => {
                          const stokNum = Number(p.stok || 0);
                          const minStok = Number(p.min_stok || 5);
                          const isLow = stokNum <= minStok;
                          const hargaBeli = Number(p.harga_beli || 0);
                          const hargaJual = Number(p.harga_jual || 0);
                          const totalVal = stokNum * hargaBeli;

                          return (
                            <tr
                              key={p.id}
                              onClick={() => {
                                if (itemsCfg.rowClickAction === 'open_card') {
                                  setSelectedProductForCard(p.id);
                                  setActiveSubTab('mutation');
                                  onTabChange?.('mutation');
                                } else {
                                  initNewAdjustment(p);
                                  setActiveSubTab('adjustment');
                                  onTabChange?.('adjustment');
                                }
                              }}
                              className="hover:bg-emerald-50/40 cursor-pointer transition-colors group"
                            >
                              {cols.kodeSku !== false && (
                                <td className={`${py} font-mono font-bold text-emerald-950 border-r border-slate-100/80`}>
                                  {p.kode_sku}
                                </td>
                              )}
                              {cols.nama !== false && (
                                <td className={`${py} border-r border-slate-100/80`}>
                                  <div className="font-semibold text-slate-900 group-hover:text-emerald-950">{p.nama}</div>
                                  {p.kategori?.nama && (
                                    <span className="text-[10px] text-slate-400">{p.kategori.nama}</span>
                                  )}
                                </td>
                              )}
                              {cols.satuan !== false && (
                                <td className={`${py} text-slate-600 border-r border-slate-100/80 font-medium`}>
                                  {p.satuan || 'Pcs'}
                                </td>
                              )}
                              {cols.stok !== false && (
                                <td className={`${py} text-center border-r border-slate-100/80`}>
                                  <span
                                    className={`inline-block px-3 py-1 rounded-full font-bold font-mono text-[11px] ${
                                      isLow
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    }`}
                                  >
                                    {stokNum.toLocaleString('id-ID')} {p.satuan}
                                  </span>
                                </td>
                              )}
                              {cols.hargaBeli !== false && (
                                <td className={`${py} text-right font-mono text-slate-600 border-r border-slate-100/80`}>
                                  {hargaBeli > 0 ? `Rp ${hargaBeli.toLocaleString('id-ID')}` : <span className="text-slate-400 font-normal italic text-[11px]">-</span>}
                                </td>
                              )}
                              {cols.hargaJual !== false && (
                                <td className={`${py} text-right font-mono font-bold text-slate-900 border-r border-slate-100/80`}>
                                  {hargaJual > 0 ? (
                                    `Rp ${hargaJual.toLocaleString('id-ID')}`
                                  ) : (
                                    <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded text-[11px] font-semibold">
                                      Fleksibel
                                    </span>
                                  )}
                                </td>
                              )}
                              {cols.totalValuasi !== false && (
                                <td className={`${py} text-right font-mono font-black text-emerald-950 border-r border-slate-100/80`}>
                                  Rp {totalVal.toLocaleString('id-ID')}
                                </td>
                              )}
                              <td className={`${py} text-center`} onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center space-x-1.5">
                                  <button
                                    onClick={() => {
                                      setEditingProduct(p);
                                      setIsQuickAddOpen(true);
                                    }}
                                    className="apple-btn px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100/80 rounded-lg border border-emerald-200/80 shadow-2xs flex items-center space-x-1 transition"
                                    title="Ubah data kemasan ini"
                                  >
                                    <Pencil className="w-3 h-3 text-emerald-700" />
                                    <span>Ubah</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setProductToDelete(p);
                                      setIsDeleteModalOpen(true);
                                    }}
                                    className="apple-btn px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100/80 rounded-lg border border-rose-200 shadow-2xs flex items-center space-x-1 transition"
                                    title="Hapus kemasan ini"
                                  >
                                    <Trash2 className="w-3 h-3 text-rose-600" />
                                    <span>Hapus</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            <div className="h-9 bg-slate-50/80 border-t border-slate-200/80 px-4 flex items-center justify-between text-[11px] text-slate-500 font-medium select-none">
              <span>
                Total Item: <strong>{filteredProducts.length}</strong> SKU ditampilkan
              </span>
              <span className="text-emerald-800 font-bold flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Terhubung Real-time dengan Supabase &amp; POS</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB CONTENT: PENYESUAIAN PERSEDIAAN (STOCK ADJUSTMENT / OPNAME) */}
      {activeSubTab === 'adjustment' && (
        <div className="flex-1 flex flex-col min-h-0 space-y-3">
          {loadingAdjustments ? (
            <TableSkeleton rows={5} cols={6} />
          ) : adjustmentView === 'list' ? (
            /* Sub-View: Daftar Dokumen Penyesuaian */
            <div className="flex-1 flex flex-col min-h-0 space-y-2.5">
              {/* Modular Table Filter Toolbar for Stock Opname */}
              <TableFilterToolbar
                searchQuery={searchQueries.opname}
                onSearchChange={(val) => setSearchQueries((prev) => ({ ...prev, opname: val }))}
                searchPlaceholder="Cari nomor penyesuaian, catatan..."
                filters={advancedFilters.opname}
                onFilterChange={(f, v) => handleFilterChange('opname', f, v)}
                onResetFilters={() => handleResetFilters('opname')}
                config={opnameCfg}
                onOpenConfig={() => setActiveConfigModal('opname')}
                totalCount={filteredAdjustments.length}
                totalAmount={filteredAdjustments.reduce((acc, a) => acc + Number(a.total_nilai || 0), 0)}
                moduleType="opname"
              />

              <div className="flex-1 flex flex-col min-h-0 apple-card overflow-hidden rounded-2xl">
                <div className="flex-1 overflow-auto">
                  {(() => {
                    const cols = opnameCfg.visibleColumns || {
                      noPenyesuaian: true,
                      tanggal: true,
                      tipe: true,
                      catatan: true,
                      rincianBarang: true,
                      totalNilai: true,
                    };
                    const py = opnameCfg.density === 'compact' ? 'py-1.5 px-3' : opnameCfg.density === 'spacious' ? 'py-3.5 px-4' : 'py-2.5 px-3.5';

                    return (
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-50/90 backdrop-blur-sm text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                          <tr>
                            {cols.noPenyesuaian !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">No. Penyesuaian</th>}
                            {cols.tanggal !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Tanggal</th>}
                            {cols.tipe !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Jenis Dokumen</th>}
                            {cols.catatan !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Keterangan / Catatan</th>}
                            {cols.rincianBarang !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Rincian Barang</th>}
                            {cols.totalNilai !== false && <th className="py-3 px-3.5 text-right">Nilai Finansial (Rp)</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredAdjustments.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="py-12 text-center text-slate-400">
                                Belum ada catatan penyesuaian persediaan. Klik tombol <strong>+ Input Penyesuaian Baru</strong> di atas untuk membuat stock opname.
                              </td>
                            </tr>
                          ) : (
                            filteredAdjustments.map((adj) => (
                              <tr key={adj.id} className="hover:bg-emerald-50/40 cursor-pointer transition-colors group">
                                {cols.noPenyesuaian !== false && (
                                  <td className={`${py} font-mono font-bold text-emerald-950 border-r border-slate-100/80`}>
                                    {adj.no_penyesuaian}
                                  </td>
                                )}
                                {cols.tanggal !== false && (
                                  <td className={`${py} border-r border-slate-100/80 text-slate-700 font-medium`}>
                                    {adj.tanggal}
                                  </td>
                                )}
                                {cols.tipe !== false && (
                                  <td className={`${py} border-r border-slate-100/80`}>
                                    <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-full text-[10px] font-bold">
                                      {adj.tipe || 'OPNAME'}
                                    </span>
                                  </td>
                                )}
                                {cols.catatan !== false && (
                                  <td className={`${py} border-r border-slate-100/80 text-slate-700 max-w-xs truncate`}>
                                    {adj.catatan || '-'}
                                  </td>
                                )}
                                {cols.rincianBarang !== false && (
                                  <td className={`${py} border-r border-slate-100/80 text-slate-600 font-medium`}>
                                    {adj.details?.length || 0} item barang disesuaikan
                                  </td>
                                )}
                                {cols.totalNilai !== false && (
                                  <td className={`${py} text-right font-mono font-black text-emerald-950`}>
                                    Rp {Number(adj.total_nilai || 0).toLocaleString('id-ID')}
                                  </td>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : (
            /* Sub-View: Form Input Penyesuaian Baru */
            <form onSubmit={handleSubmitAdjustment} className="flex-1 flex flex-col min-h-0 apple-card rounded-2xl overflow-hidden shadow-xs">
              <div className="p-3.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-800" />
                  <span className="font-extrabold text-xs uppercase tracking-wide text-slate-900">
                    Formulir Penyesuaian Persediaan (Stok Opname)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAdjustmentView('list')}
                  className="apple-btn-secondary px-3.5 py-1.5 text-xs font-bold"
                >
                  &larr; Kembali ke Daftar
                </button>
              </div>

              <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                {/* Header Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      No. Penyesuaian (Auto)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={adjForm.no_penyesuaian}
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-100 border border-slate-300 rounded-md text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Tanggal Dokumen *
                    </label>
                    <input
                      type="date"
                      required
                      value={adjForm.tanggal}
                      onChange={(e) => setAdjForm({ ...adjForm, tanggal: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Akun Penyesuaian / Selisih (COA) *
                    </label>
                    <select
                      value={adjForm.akun_id}
                      onChange={(e) => setAdjForm({ ...adjForm, akun_id: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white font-medium"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.kode_akun || a.kode} - {a.nama_akun || a.nama}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Keterangan / Alasan Stock Opname
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Stock opname berkala bulan ini / Selisih hitung fisik / Barang reject"
                      value={adjForm.catatan}
                      onChange={(e) => setAdjForm({ ...adjForm, catatan: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white font-medium"
                    />
                  </div>
                </div>

                {/* Items Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Rincian Barang yang Disesuaikan ({adjForm.items.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddItemToAdj}
                      className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded text-[11px] font-bold flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                      <span>+ Tambah Baris Barang</span>
                    </button>
                  </div>

                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Pilih Barang Kemasan</th>
                        <th className="py-2 px-3 text-center">Stok Sistem</th>
                        <th className="py-2 px-3 text-center">Tipe Penyesuaian</th>
                        <th className="py-2 px-3 text-center">Qty Selisih</th>
                        <th className="py-2 px-3 text-right">Biaya Satuan (Rp)</th>
                        <th className="py-2 px-3 text-right">Total Nilai (Rp)</th>
                        <th className="py-2 px-3">Catatan Khusus</th>
                        <th className="py-2 px-2 text-center">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {adjForm.items.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="py-6 text-center text-slate-400">
                            Belum ada barang dimasukkan. Klik <strong>+ Tambah Baris Barang</strong> di atas.
                          </td>
                        </tr>
                      ) : (
                        adjForm.items.map((row, idx) => {
                          const subtotal = Number(row.qty_selisih || 0) * Number(row.harga_satuan || 0);
                          const newExpected =
                            row.tipe_item === 'TAMBAH'
                              ? Number(row.stok_sistem) + Number(row.qty_selisih || 0)
                              : Math.max(0, Number(row.stok_sistem) - Number(row.qty_selisih || 0));

                          return (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2 px-3 min-w-[200px]">
                                <select
                                  value={row.produk_id}
                                  onChange={(e) => handleUpdateAdjItem(idx, 'produk_id', e.target.value)}
                                  className="w-full py-1 px-2 border border-slate-300 rounded text-xs bg-white"
                                >
                                  {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      [{p.kode_sku}] {p.nama} (Stok: {p.stok} {p.satuan})
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2 px-3 text-center font-mono font-bold text-slate-700">
                                {row.stok_sistem}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <select
                                  value={row.tipe_item}
                                  onChange={(e) => handleUpdateAdjItem(idx, 'tipe_item', e.target.value)}
                                  className={`py-1 px-2 text-xs font-bold rounded border ${
                                    row.tipe_item === 'TAMBAH'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : 'bg-rose-50 text-rose-800 border-rose-300'
                                  }`}
                                >
                                  <option value="TAMBAH">(+) TAMBAH (Fisik Lebih Banyak)</option>
                                  <option value="KURANG">(-) KURANG (Fisik Hilang/Rusak)</option>
                                </select>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  value={row.qty_selisih}
                                  onChange={(e) => handleUpdateAdjItem(idx, 'qty_selisih', Number(e.target.value))}
                                  className="w-20 text-center py-1 px-2 border border-slate-300 rounded text-xs font-mono font-bold bg-white"
                                />
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  Hasil: <strong>{newExpected}</strong>
                                </div>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  value={row.harga_satuan}
                                  onChange={(e) => handleUpdateAdjItem(idx, 'harga_satuan', Number(e.target.value))}
                                  className="w-28 text-right py-1 px-2 border border-slate-300 rounded text-xs font-mono bg-white"
                                />
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                Rp {subtotal.toLocaleString('id-ID')}
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  placeholder="Alasan..."
                                  value={row.catatan_item}
                                  onChange={(e) => handleUpdateAdjItem(idx, 'catatan_item', e.target.value)}
                                  className="w-full py-1 px-2 border border-slate-300 rounded text-xs bg-white"
                                />
                              </td>
                              <td className="py-2 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAdjItem(idx)}
                                  className="p-1 text-slate-400 hover:text-rose-600 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-slate-600">
                  <Info className="w-4 h-4 text-emerald-700" />
                  <span>
                    Menyimpan penyesuaian akan <strong>memperbarui kuantitas stok di Supabase</strong>, mencatat ke <strong>Kartu Stok</strong>, dan membuat <strong>Jurnal Penyesuaian Otomatis</strong>.
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentView('list')}
                    className="px-3.5 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-md text-xs font-bold transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAdjustment}
                    className="px-4 py-1.5 bg-[#0A3828] hover:bg-[#07291D] text-white rounded-md text-xs font-bold transition flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{submittingAdjustment ? 'Menyimpan...' : 'Simpan Penyesuaian Persediaan'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 4. TAB CONTENT: RIWAYAT MUTASI (KARTU STOK / STOCK CARD) */}
      {activeSubTab === 'mutation' && (
        <div className="flex-1 flex flex-col min-h-0 space-y-3">
          {/* Modular Table Filter Toolbar for Mutation */}
          <TableFilterToolbar
            searchQuery={searchQueries.mutation}
            onSearchChange={(val) => setSearchQueries((prev) => ({ ...prev, mutation: val }))}
            searchPlaceholder="Cari kode SKU, nama barang, no. ref, keterangan..."
            filters={advancedFilters.mutation}
            onFilterChange={(f, v) => handleFilterChange('mutation', f, v)}
            onResetFilters={() => handleResetFilters('mutation')}
            products={products}
            config={mutationCfg}
            onOpenConfig={() => setActiveConfigModal('mutation')}
            totalCount={filteredMutations.length}
            moduleType="mutation"
          />

          {/* Mutation Ledger Table */}
          {loadingMutations ? (
            <TableSkeleton rows={6} cols={9} />
          ) : (
            <div className="flex-1 flex flex-col min-h-0 apple-card overflow-hidden rounded-2xl">
              <div className="flex-1 overflow-auto">
                {(() => {
                  const cols = mutationCfg.visibleColumns || {
                    tanggal: true,
                    kodeSku: true,
                    nama: true,
                    tipe: true,
                    noRef: true,
                    masuk: true,
                    keluar: true,
                    saldoAkhir: true,
                    keterangan: true,
                  };
                  const py = mutationCfg.density === 'compact' ? 'py-1.5 px-3' : mutationCfg.density === 'spacious' ? 'py-3.5 px-4' : 'py-2.5 px-3.5';

                  return (
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-50/90 backdrop-blur-sm text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          {cols.tanggal !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Waktu / Tanggal</th>}
                          {cols.kodeSku !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Kode SKU</th>}
                          {cols.nama !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Nama Barang Kemasan</th>}
                          {cols.tipe !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Jenis Mutasi</th>}
                          {cols.noRef !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">No. Dokumen Ref</th>}
                          {cols.masuk !== false && <th className="py-3 px-3.5 text-center border-r border-slate-200/60">Masuk (+ In)</th>}
                          {cols.keluar !== false && <th className="py-3 px-3.5 text-center border-r border-slate-200/60">Keluar (- Out)</th>}
                          {cols.saldoAkhir !== false && <th className="py-3 px-3.5 text-center border-r border-slate-200/60">Sisa Stok Akhir</th>}
                          {cols.keterangan !== false && <th className="py-3 px-3.5">Keterangan Transaksi</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredMutations.length === 0 ? (
                          <tr>
                            <td colSpan="9" className="py-12 text-center text-slate-400">
                              Tidak ada riwayat mutasi stok yang sesuai kriteria filter.
                            </td>
                          </tr>
                        ) : (
                          filteredMutations.map((item) => {
                            const qtyNum = Number(item.qty || 0);
                            const isPositive = qtyNum > 0;
                            const tipeBadge = (() => {
                              if (item.tipe === 'PEMBELIAN') {
                                return <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold text-[10px]">PEMBELIAN</span>;
                              }
                              if (item.tipe === 'PENGIRIMAN_DO') {
                                return <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-full font-bold text-[10px]">PENGIRIMAN DO</span>;
                              }
                              if (item.tipe === 'PENYESUAIAN_STOK') {
                                return <span className="px-2.5 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded-full font-bold text-[10px]">PENYESUAIAN</span>;
                              }
                              return <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded-full font-bold text-[10px]">{item.tipe}</span>;
                            })();

                            return (
                              <tr key={item.id} className="hover:bg-emerald-50/40 transition-colors">
                                {cols.tanggal !== false && (
                                  <td className={`${py} font-mono text-slate-500 border-r border-slate-100/80 text-[11px]`}>
                                    {new Date(item.created_at || item.tanggal).toLocaleString('id-ID', {
                                      dateStyle: 'short',
                                      timeStyle: 'short',
                                    })}
                                  </td>
                                )}
                                {cols.kodeSku !== false && (
                                  <td className={`${py} font-mono font-bold text-emerald-950 border-r border-slate-100/80`}>
                                    {item.produk?.kode_sku || '-'}
                                  </td>
                                )}
                                {cols.nama !== false && (
                                  <td className={`${py} font-semibold text-slate-800 border-r border-slate-100/80`}>
                                    {item.produk?.nama || '-'}
                                  </td>
                                )}
                                {cols.tipe !== false && (
                                  <td className={`${py} border-r border-slate-100/80`}>
                                    {tipeBadge}
                                  </td>
                                )}
                                {cols.noRef !== false && (
                                  <td className={`${py} font-mono font-bold text-slate-700 border-r border-slate-100/80`}>
                                    {item.no_referensi || '-'}
                                  </td>
                                )}
                                {cols.masuk !== false && (
                                  <td className={`${py} text-center border-r border-slate-100/80 font-mono font-bold`}>
                                    {isPositive ? (
                                      <span className="text-emerald-700 font-extrabold">+{qtyNum} {item.produk?.satuan || 'Pcs'}</span>
                                    ) : (
                                      '-'
                                    )}
                                  </td>
                                )}
                                {cols.keluar !== false && (
                                  <td className={`${py} text-center border-r border-slate-100/80 font-mono font-bold`}>
                                    {!isPositive ? (
                                      <span className="text-rose-600 font-extrabold">{qtyNum} {item.produk?.satuan || 'Pcs'}</span>
                                    ) : (
                                      '-'
                                    )}
                                  </td>
                                )}
                                {cols.saldoAkhir !== false && (
                                  <td className={`${py} text-center border-r border-slate-100/80 font-mono font-black text-slate-900`}>
                                    {Number(item.stok_akhir || 0).toLocaleString('id-ID')}
                                  </td>
                                )}
                                {cols.keterangan !== false && (
                                  <td className={`${py} text-slate-600 text-[11px] max-w-xs truncate`}>
                                    {item.keterangan || '-'}
                                  </td>
                                )}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              <div className="h-9 bg-slate-50/80 border-t border-slate-200/80 px-4 flex items-center justify-between text-[11px] text-slate-500 font-medium select-none">
                <span>Kartu Stok Mutasi Persediaan Fisik (FIFO / Perpetual)</span>
                <span className="text-emerald-800 font-bold">Akuntansi Persediaan Terintegrasi Supabase</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Add / Edit Product Modal with 00000 format */}
      <QuickAddProductModal
        isOpen={isQuickAddOpen}
        editingProduct={editingProduct}
        existingProducts={products}
        categories={categories}
        satuanList={satuanList}
        onCategoryCreated={onCategoryCreated}
        onSatuanCreated={onSatuanCreated}
        onClose={() => {
          setIsQuickAddOpen(false);
          setEditingProduct(null);
        }}
        onProductCreated={async (newProd) => {
          if (showToast && newProd) {
            showToast(`Master kemasan "${newProd.nama}" (${newProd.kode_sku}) berhasil ditambahkan!`, 'success', 'Produk Ditambahkan');
          }
          if (onRefresh) await onRefresh();
          setIsQuickAddOpen(false);
          setEditingProduct(null);
        }}
        onProductUpdated={async () => {
          if (showToast) {
            showToast('Data master kemasan berhasil diperbarui.', 'success', 'Produk Diperbarui');
          }
          if (onRefresh) await onRefresh();
          setIsQuickAddOpen(false);
          setEditingProduct(null);
        }}
      />

      {/* Modal Konfirmasi Hapus Produk Modern (Dengan Opsi Centang Cascade) */}
      {isDeleteModalOpen && productToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-center border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-xs">
              <Trash2 className="w-7 h-7 stroke-[2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Hapus Master Kemasan?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus <strong className="text-slate-800">{productToDelete.nama}</strong> ({productToDelete.kode_sku})?
              </p>
            </div>

            {/* Checkbox Centang Hapus Seluruh Riwayat & Data Terkait */}
            <label className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-left cursor-pointer hover:bg-slate-100/70 transition select-none">
              <input
                type="checkbox"
                checked={cascadeDelete}
                onChange={(e) => setCascadeDelete(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
              />
              <div className="text-[11px]">
                <span className="font-bold text-slate-800 block">
                  Hapus permanen beserta seluruh riwayat transaksi &amp; detail terkait
                </span>
                <span className="text-slate-500 text-[10px]">
                  Centang opsi ini agar barang dapat langsung dihapus bersih dari sistem tanpa error relasi.
                </span>
              </div>
            </label>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 text-left font-medium">
                {deleteError}
              </div>
            )}

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setProductToDelete(null);
                  setDeleteError('');
                  setCascadeDelete(true);
                }}
                className="flex-1 py-2.5 border border-slate-300 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteProduct}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Menghapus...' : 'Hapus Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Configuration Modal for Persediaan (Items, Mutation, Opname) */}
      {activeConfigModal && (
        <TableConfigModal
          isOpen={Boolean(activeConfigModal)}
          onClose={() => setActiveConfigModal(null)}
          moduleKey={activeConfigModal}
          moduleTitle={
            activeConfigModal === 'items'
              ? 'Master Barang Kemasan'
              : activeConfigModal === 'mutation'
              ? 'Kartu Stok (Riwayat Mutasi)'
              : 'Penyesuaian Persediaan (Opname)'
          }
          config={tableConfigs[activeConfigModal]}
          onSaveConfig={(newCfg) => handleSaveTableConfig(activeConfigModal, newCfg)}
        />
      )}
    </div>
  );
}
