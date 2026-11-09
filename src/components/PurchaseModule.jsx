'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  FileText,
  Calendar,
  DollarSign,
  Trash2,
  Edit,
  Save,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Building2,
  Coins,
  Package,
  Layers,
  FileCheck,
  AlertCircle,
  AlertTriangle,
  Download,
  X,
  Eye,
  Check,
  ExternalLink,
  Camera,
  Workflow,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getNextDocNumber, peekNextDocNumber, createJournalEntry } from '../lib/accounting';
import QuickAddSupplierModal from './QuickAddSupplierModal';
import { TableSkeleton, MetricCardsSkeleton, FormSkeleton } from './SkeletonShimmer';
import TableFilterToolbar from './TableFilterToolbar';
import TableConfigModal, { DEFAULT_TABLE_CONFIGS } from './TableConfigModal';
import GoogleLiveSupplierSearch from './GoogleLiveSupplierSearch';
import PurchaseItemDetailModal from './PurchaseItemDetailModal';
import FileUploadBukti from './FileUploadBukti';
import ImageLightboxModal from './ImageLightboxModal';
import { DEFAULT_PAYMENT_TERMS, calculateDueDate } from '../lib/paymentTerms';
import {
  formatDisplayDecimal,
  formatRupiah,
  formatLiveInput,
  parseNumberId,
} from '../lib/numberFormat';

export default function PurchaseModule({
  activeTab = 'po_beli', // 'po_beli' | 'ri_beli' | 'pi_beli' | 'pp_beli' | 'suppliers'
  onTabChange,
  products = [],
  accounts = [],
  companySettings = {},
  onToast,
  onRefresh,
}) {
  const syaratBayarList =
    companySettings?.syaratBayarList && companySettings.syaratBayarList.length > 0
      ? companySettings.syaratBayarList
      : DEFAULT_PAYMENT_TERMS;

  // View mode per sub-module: 'list' | 'form'
  const [viewModes, setViewModes] = useState({
    po_beli: 'list',
    ri_beli: 'list',
    pi_beli: 'list',
    pp_beli: 'list',
    suppliers: 'list',
  });

  // Data States
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [goodsReceipts, setGoodsReceipts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [purchasePayments, setPurchasePayments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [listFilters, setListFilters] = useState({
    po_beli: 'ALL',
    ri_beli: 'ALL',
    pi_beli: 'ALL',
  });

  // Table Configuration (Columns, Filters, Density) per Module
  const [tableConfigs, setTableConfigs] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('fag_purchase_table_configs_v1');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading purchase table configs:', e);
      }
    }
    return DEFAULT_TABLE_CONFIGS;
  });

  const [activeConfigModal, setActiveConfigModal] = useState(null); // null | 'po_beli' | 'ri_beli' | 'pi_beli' | 'pp_beli'

  // Advanced Dedicated Filters State for Purchasing
  const [advancedFilters, setAdvancedFilters] = useState({
    po_beli: {
      statusBayar: 'ALL',
      statusTerima: 'ALL',
      status: 'ALL',
      dateRange: 'ALL',
      customStartDate: '',
      customEndDate: '',
      supplier: 'ALL',
    },
    ri_beli: {
      dateRange: 'ALL',
      customStartDate: '',
      customEndDate: '',
      supplier: 'ALL',
    },
    pi_beli: {
      statusBayar: 'ALL',
      dateRange: 'ALL',
      customStartDate: '',
      customEndDate: '',
      supplier: 'ALL',
    },
    pp_beli: {
      dateRange: 'ALL',
      customStartDate: '',
      customEndDate: '',
      supplier: 'ALL',
      bankAkun: 'ALL',
    },
  });

  const handleUpdateAdvancedFilter = (moduleKey, filterKey, value) => {
    setAdvancedFilters((prev) => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
        [filterKey]: value,
      },
    }));
  };

  const handleResetAdvancedFilters = (moduleKey) => {
    setSearchQuery('');
    setAdvancedFilters((prev) => ({
      ...prev,
      [moduleKey]: {
        status: 'ALL',
        statusBayar: 'ALL',
        dateRange: 'ALL',
        customStartDate: '',
        customEndDate: '',
        supplier: 'ALL',
        bankAkun: 'ALL',
      },
    }));
  };

  const handleSaveTableConfig = (moduleKey, newConfig) => {
    setTableConfigs((prev) => {
      const updated = {
        ...prev,
        [moduleKey]: newConfig,
      };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('fag_purchase_table_configs_v1', JSON.stringify(updated));
        } catch (e) {
          console.error('Error saving purchase table configs:', e);
        }
      }
      return updated;
    });
  };

  // Flow dropdown states in form view
  const [poFlowDropdownOpen, setPoFlowDropdownOpen] = useState(false);
  const [riFlowDropdownOpen, setRiFlowDropdownOpen] = useState(false);
  const [fbFlowDropdownOpen, setFbFlowDropdownOpen] = useState(false);
  const [ppFlowDropdownOpen, setPpFlowDropdownOpen] = useState(false);

  // Modals & Popups
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [takeModalType, setTakeModalType] = useState(null); // 'PO_TO_RI' | 'RI_TO_FB' | 'PO_TO_FB' | null
  const [pdfModalDoc, setPdfModalDoc] = useState(null); // { type: 'PO'|'RI'|'FB'|'PP', data: {...} }
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState(null); // { type, id, noDoc, data }
  // Item Detail Pop-up Modal (Parity with Sales ItemDetailModal)
  const [purchaseItemModal, setPurchaseItemModal] = useState({
    isOpen: false,
    item: null,
    formType: 'PO', // 'PO' | 'RI' | 'FB'
    index: -1,
  });

  // -------------------------------------------------------------
  // FORM STATES FOR EACH PURCHASING SUB-MODULE
  // -------------------------------------------------------------

  // Lightbox Modal State for Bukti Foto
  const [lightboxImage, setLightboxImage] = useState(null);

  // 1. Pesanan Pembelian (PO) Form
  const [poForm, setPoForm] = useState({
    editingId: null,
    poNo: `PO.${new Date().getFullYear()}.${(new Date().getMonth() + 1).toString().padStart(2, '0')}.${new Date().getDate().toString().padStart(2, '0')}.0001`,
    date: new Date().toISOString().split('T')[0],
    supplierId: '',
    termin: 'Net 30',
    items: [],
    discountAmount: 0,
    ppnActive: false,
    catatan: '',
    lampiran_url: '',
    status: 'MENUNGGU_PENERIMAAN',
  });

  // 2. Penerimaan Barang (RI) Form
  const [riForm, setRiForm] = useState({
    editingId: null,
    riNo: `RI.${new Date().getFullYear()}.${(new Date().getMonth() + 1).toString().padStart(2, '0')}.${new Date().getDate().toString().padStart(2, '0')}.0001`,
    supplierSJNo: '',
    date: new Date().toISOString().split('T')[0],
    supplierId: '',
    poId: null,
    poNo: '',
    warehouse: 'Gudang Utama Kemasan',
    items: [],
    keterangan: '',
    lampiran_url: '',
    status: 'DITERIMA',
  });

  // 3. Faktur Pembelian (FB) Form
  const [piForm, setPiForm] = useState({
    editingId: null,
    invoiceNo: `FB.${new Date().getFullYear()}.${(new Date().getMonth() + 1).toString().padStart(2, '0')}.${new Date().getDate().toString().padStart(2, '0')}.0001`,
    supplierNo: '',
    date: new Date().toISOString().split('T')[0],
    supplierId: '',
    termin: 'Net 30',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [],
    discountAmount: 0,
    ppnActive: false,
    catatan: '',
    lampiran_url: '',
    poId: null,
    riId: null,
    statusBayar: 'HUTANG',
    bayar: 0,
  });

  // 4. Pembayaran Pembelian (PP) Form
  const [paymentForm, setPaymentForm] = useState({
    editingId: null,
    receiptNo: `PP.${new Date().getFullYear()}.${(new Date().getMonth() + 1).toString().padStart(2, '0')}.${new Date().getDate().toString().padStart(2, '0')}.0001`,
    date: new Date().toISOString().split('T')[0],
    supplierId: '',
    purchaseId: '',
    poId: null,
    poNo: '',
    accountId: '',
    amount: 0,
    catatan: '',
    lampiran_url: '',
  });

  // Live item search dropdown state
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);

  // -------------------------------------------------------------
  // DATA FETCHING & SYNCHRONIZATION
  // -------------------------------------------------------------
  const loadAllPurchaseData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Purchase Orders (PO)
      const { data: poData, error: poErr } = await supabase
        .from('pesanan_pembelian')
        .select(`
          *,
          supplier:supplier_id(id, nama, telepon, alamat, email),
          pesanan_pembelian_detail(
            id,
            produk_id,
            qty,
            harga_beli,
            subtotal,
            produk:produk_id(id, kode_sku, nama, satuan, harga_beli, stok)
          )
        `)
        .order('tanggal', { ascending: false });
      if (poErr) throw poErr;
      setPurchaseOrders(poData || []);

      // 2. Fetch Goods Receipts (RI)
      const { data: riData, error: riErr } = await supabase
        .from('penerimaan_barang')
        .select(`
          *,
          supplier:supplier_id(id, nama, telepon, alamat),
          pesanan_pembelian:pesanan_pembelian_id(id, no_pesanan),
          penerimaan_barang_detail(
            id,
            produk_id,
            qty,
            catatan,
            produk:produk_id(id, kode_sku, nama, satuan, harga_beli, stok)
          )
        `)
        .order('tanggal', { ascending: false });
      if (riErr) throw riErr;
      setGoodsReceipts(riData || []);

      // 3. Fetch Purchase Invoices (FB)
      const { data: pData, error: pErr } = await supabase
        .from('pembelian')
        .select(`
          *,
          supplier:supplier_id(id, nama, telepon, alamat, email),
          pembelian_detail(
            id,
            produk_id,
            qty,
            harga_beli,
            subtotal,
            produk:produk_id(id, kode_sku, nama, satuan, harga_beli, stok)
          )
        `)
        .order('tanggal', { ascending: false });
      if (pErr) throw pErr;
      setPurchases(pData || []);

      // 4. Fetch Purchase Payments (PP)
      const { data: payData, error: payErr } = await supabase
        .from('pembayaran_pembelian')
        .select(`
          *,
          supplier:supplier_id(id, nama),
          pembelian:pembelian_id(id, no_faktur, total_akhir, bayar),
          akun_kas:akun_kas_id(id, kode_akun, nama_akun)
        `)
        .order('tanggal', { ascending: false });
      if (payErr) throw payErr;
      setPurchasePayments(payData || []);

      // 5. Fetch Suppliers (kontak tipe = supplier)
      const { data: supData, error: supErr } = await supabase
        .from('kontak')
        .select('*')
        .eq('tipe', 'supplier')
        .order('nama', { ascending: true });
      if (supErr) throw supErr;
      setSuppliers(supData || []);
    } catch (err) {
      console.error('Error load purchase data:', err);
      onToast?.('Gagal memuat data pembelian: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const refreshPurchaseDocNumbers = async (dateOverride) => {
    try {
      const today = dateOverride || new Date().toISOString().split('T')[0];
      const [nextPO, nextRI, nextFB, nextPP] = await Promise.all([
        peekNextDocNumber('PO', today),
        peekNextDocNumber('RI', today),
        peekNextDocNumber('FB', today),
        peekNextDocNumber('PP', today),
      ]);
      if (nextPO) setPoForm((p) => (p.editingId ? p : { ...p, poNo: nextPO }));
      if (nextRI) setRiForm((p) => (p.editingId ? p : { ...p, riNo: nextRI }));
      if (nextFB) setPiForm((p) => (p.editingId ? p : { ...p, invoiceNo: nextFB }));
      if (nextPP) setPaymentForm((p) => (p.editingId ? p : { ...p, receiptNo: nextPP }));
    } catch (e) {
      console.warn('Gagal memuat auto-sequence pembelian:', e);
    }
  };

  useEffect(() => {
    loadAllPurchaseData();
    refreshPurchaseDocNumbers();
  }, []);

  const switchViewMode = (tabKey, mode) => {
    setViewModes((prev) => ({ ...prev, [tabKey]: mode }));
    setSearchQuery('');
  };

  const handleSubTabSwitch = (targetTab) => {
    if (onTabChange) {
      onTabChange(targetTab);
    }
  };

  // -------------------------------------------------------------
  // CALCULATIONS & HELPERS
  // -------------------------------------------------------------
  const calculatePOTotals = () => {
    const subtotal = poForm.items.reduce((acc, i) => {
      if (i.total !== undefined && i.total !== null) return acc + Number(i.total);
      const q = Number(i.qty || 0);
      const h = Number(i.harga_beli || 0);
      const disc = Number(i.diskonRp || 0) || ((q * h * Number(i.diskonPersen || 0)) / 100);
      return acc + (q * h - disc);
    }, 0);
    const diskonFaktur = Number(poForm.discountAmount || 0);
    const dpp = Math.max(0, subtotal - diskonFaktur);
    const ppn = poForm.ppnActive ? Math.round(dpp * 0.11) : 0;
    const grandTotal = Math.round(dpp + ppn);
    return { subtotal: Math.round(subtotal), diskonFaktur, ppn, grandTotal };
  };

  const calculateFBTotals = () => {
    const subtotal = piForm.items.reduce((acc, i) => {
      if (i.total !== undefined && i.total !== null) return acc + Number(i.total);
      const q = Number(i.qty || 0);
      const h = Number(i.harga_beli || 0);
      const disc = Number(i.diskonRp || 0) || ((q * h * Number(i.diskonPersen || 0)) / 100);
      return acc + (q * h - disc);
    }, 0);
    const diskonFaktur = Number(piForm.discountAmount || 0);
    const dpp = Math.max(0, subtotal - diskonFaktur);
    const ppn = piForm.ppnActive ? Math.round(dpp * 0.11) : 0;
    const grandTotal = Math.round(dpp + ppn);
    return { subtotal: Math.round(subtotal), diskonFaktur, ppn, grandTotal };
  };

  const handleTerminChange = (val, formType = 'FB') => {
    const baseDate = formType === 'FB' ? piForm.date : poForm.date;
    const newDueDate = calculateDueDate(baseDate, val, syaratBayarList);

    if (formType === 'FB') {
      setPiForm((prev) => ({
        ...prev,
        termin: val,
        dueDate: newDueDate,
      }));
    } else {
      setPoForm((prev) => ({
        ...prev,
        termin: val,
      }));
    }
  };

  // Add Item to current active form and immediately open Item Detail Modal
  const handleAddItemToCurrentForm = (prod) => {
    const formType = activeTab === 'po_beli' ? 'PO' : activeTab === 'ri_beli' ? 'RI' : 'FB';

    let currentItems = [];
    if (activeTab === 'po_beli') currentItems = poForm.items;
    else if (activeTab === 'ri_beli') currentItems = riForm.items;
    else if (activeTab === 'pi_beli') currentItems = piForm.items;

    const existingIndex = currentItems.findIndex((i) => i.id === prod.id);
    const existingItem = existingIndex >= 0 ? currentItems[existingIndex] : null;

    const modalItem = existingItem
      ? { ...existingItem, qty: Number(existingItem.qty || 1) + 1 }
      : {
          id: prod.id,
          kode_sku: prod.kode_sku,
          nama: prod.nama,
          satuan: prod.satuan || 'Pcs',
          qty: 1,
          harga_beli: Number(prod.harga_beli || 0),
          diskonPersen: 0,
          diskonRp: 0,
          catatan: formType === 'RI' ? 'Kondisi Baik' : '',
        };

    setPurchaseItemModal({
      isOpen: true,
      item: modalItem,
      formType,
      index: existingIndex,
    });

    setItemSearchQuery('');
    setIsItemDropdownOpen(false);
  };

  // Open modal on clicking any row in the items table
  const handleOpenItemRowModal = (item, idx, formType) => {
    setPurchaseItemModal({
      isOpen: true,
      item: { ...item },
      formType,
      index: idx,
    });
  };

  // Save changes from Item Detail Modal
  const handleSavePurchaseItemModal = (updatedItem) => {
    const { formType, index } = purchaseItemModal;
    if (formType === 'PO') {
      setPoForm((prev) => {
        let newItems = [...prev.items];
        if (index >= 0 && index < newItems.length) {
          newItems[index] = updatedItem;
        } else {
          const existIdx = newItems.findIndex((it) => it.id === updatedItem.id);
          if (existIdx >= 0) {
            newItems[existIdx] = updatedItem;
          } else {
            newItems.push(updatedItem);
          }
        }
        return { ...prev, items: newItems };
      });
    } else if (formType === 'RI') {
      setRiForm((prev) => {
        let newItems = [...prev.items];
        if (index >= 0 && index < newItems.length) {
          newItems[index] = updatedItem;
        } else {
          const existIdx = newItems.findIndex((it) => it.id === updatedItem.id);
          if (existIdx >= 0) {
            newItems[existIdx] = updatedItem;
          } else {
            newItems.push(updatedItem);
          }
        }
        return { ...prev, items: newItems };
      });
    } else if (formType === 'FB') {
      setPiForm((prev) => {
        let newItems = [...prev.items];
        if (index >= 0 && index < newItems.length) {
          newItems[index] = updatedItem;
        } else {
          const existIdx = newItems.findIndex((it) => it.id === updatedItem.id);
          if (existIdx >= 0) {
            newItems[existIdx] = updatedItem;
          } else {
            newItems.push(updatedItem);
          }
        }
        return { ...prev, items: newItems };
      });
    }
    setPurchaseItemModal((p) => ({ ...p, isOpen: false }));
  };

  // Delete item from form via Item Detail Modal
  const handleDeletePurchaseItemModal = () => {
    const { formType, index } = purchaseItemModal;
    if (index >= 0) {
      if (formType === 'PO') {
        setPoForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== index) }));
      } else if (formType === 'RI') {
        setRiForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== index) }));
      } else if (formType === 'FB') {
        setPiForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== index) }));
      }
    }
    setPurchaseItemModal((p) => ({ ...p, isOpen: false }));
  };

  // -------------------------------------------------------------
  // CLICK-TO-EDIT & RESET FORM HANDLERS (MATCHING SALES 100%)
  // -------------------------------------------------------------

  // 1. PO: Buka untuk Edit vs Form Baru
  const handleOpenPO = (po) => {
    setPoForm({
      editingId: po.id,
      poNo: po.no_pesanan,
      date: po.tanggal,
      supplierId: po.supplier_id,
      termin: po.termin || 'Net 30',
      items: (po.pesanan_pembelian_detail || []).map((d) => {
        const prod = products.find((p) => p.id === d.produk_id);
        return {
          id: d.produk_id,
          kode_sku: d.produk?.kode_sku || prod?.kode_sku || '',
          nama: d.produk?.nama || prod?.nama || '',
          satuan: d.satuan || d.produk?.satuan || prod?.satuan || 'Pcs',
          qty: Number(d.qty || 1),
          harga_beli: Number(d.harga_beli || prod?.harga_beli || 0),
          diskonRp: Number(d.diskon || 0),
          subtotal: Number(d.subtotal || (Number(d.qty) * Number(d.harga_beli))),
        };
      }),
      discountAmount: Number(po.diskon || 0),
      ppnActive: Boolean(po.ppn_nominal && Number(po.ppn_nominal) > 0),
      catatan: po.catatan || '',
      lampiran_url: po.lampiran_url || '',
      status: po.status,
    });
    switchViewMode('po_beli', 'form');
  };

  const handleResetToNewPO = async () => {
    const today = new Date().toISOString().split('T')[0];
    const nextNo = await peekNextDocNumber('PO', today);
    setPoForm({
      editingId: null,
      poNo: nextNo || `PO.${new Date().getFullYear()}.${(new Date().getMonth() + 1).toString().padStart(2, '0')}.${new Date().getDate().toString().padStart(2, '0')}.0001`,
      date: today,
      supplierId: '',
      termin: 'Net 30',
      items: [],
      discountAmount: 0,
      ppnActive: false,
      catatan: '',
      lampiran_url: '',
      status: 'MENUNGGU_PENERIMAAN',
    });
    switchViewMode('po_beli', 'form');
  };

  // 2. RI: Buka untuk Edit vs Form Baru
  const handleOpenRI = (ri) => {
    setRiForm({
      editingId: ri.id,
      riNo: ri.no_terima,
      supplierSJNo: ri.no_surat_jalan_supplier || '',
      date: ri.tanggal,
      supplierId: ri.supplier_id,
      poId: ri.pesanan_pembelian_id || null,
      poNo: ri.pesanan_pembelian?.no_pesanan || '',
      warehouse: 'Gudang Utama Kemasan',
      items: (ri.penerimaan_barang_detail || []).map((d) => {
        const prod = products.find((p) => p.id === d.produk_id);
        return {
          id: d.produk_id,
          kode_sku: d.produk?.kode_sku || prod?.kode_sku || '',
          nama: d.produk?.nama || prod?.nama || '',
          satuan: d.produk?.satuan || prod?.satuan || 'Pcs',
          qty: Number(d.qty || 1),
          catatan: d.catatan || 'Kondisi Baik',
        };
      }),
      keterangan: ri.keterangan || '',
      lampiran_url: ri.lampiran_url || '',
      status: ri.status,
    });
    switchViewMode('ri_beli', 'form');
  };

  const handleResetToNewRI = async () => {
    const today = new Date().toISOString().split('T')[0];
    const nextNo = await peekNextDocNumber('RI', today);
    setRiForm({
      editingId: null,
      riNo: nextNo || `RI.${new Date().getFullYear()}.${(new Date().getMonth() + 1).toString().padStart(2, '0')}.${new Date().getDate().toString().padStart(2, '0')}.0001`,
      supplierSJNo: '',
      date: today,
      supplierId: '',
      poId: null,
      poNo: '',
      warehouse: 'Gudang Utama Kemasan',
      items: [],
      keterangan: '',
      lampiran_url: '',
      status: 'DITERIMA',
    });
    switchViewMode('ri_beli', 'form');
  };

  // 3. FB: Buka untuk Edit vs Form Baru
  const handleOpenFB = (p) => {
    setPiForm({
      editingId: p.id,
      invoiceNo: p.no_faktur,
      supplierNo: p.no_faktur_supplier || '',
      date: p.tanggal,
      supplierId: p.supplier_id,
      termin: p.syarat_bayar || 'Net 30',
      dueDate: p.tgl_jatuh_tempo || new Date().toISOString().split('T')[0],
      items: (p.pembelian_detail || []).map((d) => {
        const prod = products.find((pr) => pr.id === d.produk_id);
        return {
          id: d.produk_id,
          kode_sku: d.produk?.kode_sku || prod?.kode_sku || '',
          nama: d.produk?.nama || prod?.nama || '',
          satuan: d.satuan || d.produk?.satuan || prod?.satuan || 'Pcs',
          qty: Number(d.qty || 1),
          harga_beli: Number(d.harga_beli || prod?.harga_beli || 0),
          diskonRp: Number(d.diskon || 0),
          subtotal: Number(d.subtotal || (Number(d.qty) * Number(d.harga_beli))),
        };
      }),
      discountAmount: Number(p.diskon || 0),
      ppnActive: Boolean(p.ppn_nominal && Number(p.ppn_nominal) > 0),
      catatan: p.catatan || '',
      lampiran_url: p.lampiran_url || '',
      poId: p.pesanan_pembelian_id || null,
      riId: p.penerimaan_barang_id || null,
      statusBayar: p.status_bayar,
      bayar: Number(p.bayar || 0),
    });
    switchViewMode('pi_beli', 'form');
  };

  const handleResetToNewFB = async () => {
    const today = new Date().toISOString().split('T')[0];
    const nextNo = await peekNextDocNumber('FB', today);
    setPiForm({
      editingId: null,
      invoiceNo: nextNo || `FB.${new Date().getFullYear()}.${(new Date().getMonth() + 1).toString().padStart(2, '0')}.${new Date().getDate().toString().padStart(2, '0')}.0001`,
      supplierNo: '',
      date: today,
      supplierId: '',
      termin: 'Net 30',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [],
      discountAmount: 0,
      ppnActive: false,
      catatan: '',
      lampiran_url: '',
      poId: null,
      riId: null,
      statusBayar: 'HUTANG',
      bayar: 0,
    });
    switchViewMode('pi_beli', 'form');
  };

  // 4. PP: Buka untuk Edit vs Form Baru
  const handleOpenPP = (pp) => {
    setPaymentForm({
      editingId: pp.id,
      receiptNo: pp.no_bukti,
      date: pp.tanggal,
      supplierId: pp.supplier_id || pp.pembelian?.supplier_id || '',
      purchaseId: pp.pembelian_id,
      poId: null,
      poNo: '',
      accountId: pp.akun_kas_id || accounts.find((a) => a.kode_akun === '1102-01')?.id || accounts[0]?.id || '',
      amount: Number(pp.total_bayar || 0),
      catatan: pp.catatan || '',
      lampiran_url: pp.lampiran_url || '',
    });
    switchViewMode('pp_beli', 'form');
  };

  const handleResetToNewPP = async () => {
    const today = new Date().toISOString().split('T')[0];
    const nextNo = await peekNextDocNumber('PP', today);
    setPaymentForm({
      editingId: null,
      receiptNo: nextNo || `PP.${new Date().getFullYear()}.${(new Date().getMonth() + 1).toString().padStart(2, '0')}.${new Date().getDate().toString().padStart(2, '0')}.0001`,
      date: today,
      supplierId: '',
      purchaseId: '',
      poId: null,
      poNo: '',
      accountId: accounts.find((a) => a.kode_akun === '1102-01')?.id || accounts[0]?.id || '',
      amount: 0,
      catatan: '',
      lampiran_url: '',
    });
    switchViewMode('pp_beli', 'form');
  };

  // 5. Pemasok Quick Edit
  const handleEditSupplier = (s) => {
    setEditingSupplier(s);
    setIsSupplierModalOpen(true);
  };

  const handleOpenNewSupplier = () => {
    setEditingSupplier(null);
    setIsSupplierModalOpen(true);
  };

  // -------------------------------------------------------------
  // DELETE HANDLERS (SUPABASE LIVE + REVERSIBLE)
  // -------------------------------------------------------------
  const handleDeletePO = async (id, noDoc) => {
    setLoading(true);
    try {
      await supabase.from('pesanan_pembelian_detail').delete().eq('pesanan_id', id);
      const { error } = await supabase.from('pesanan_pembelian').delete().eq('id', id);
      if (error) throw error;

      onToast?.(`Pesanan Pembelian ${noDoc} berhasil dihapus permanen!`, 'success');
      setDeleteConfirmDoc(null);
      await handleResetToNewPO();
      await loadAllPurchaseData();
      switchViewMode('po_beli', 'list');
      onRefresh?.();
    } catch (err) {
      console.error('Error delete PO:', err);
      onToast?.('Gagal menghapus pesanan: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRI = async (id, noDoc) => {
    setLoading(true);
    try {
      // 1. Ambil detail RI untuk mengembalikan stok persediaan
      const { data: details, error: dErr } = await supabase
        .from('penerimaan_barang_detail')
        .select('*')
        .eq('penerimaan_id', id);
      if (dErr) throw dErr;

      // 2. Kembalikan stok produk (kurangi kembali)
      if (details && details.length > 0) {
        for (const item of details) {
          const prod = products.find((p) => p.id === item.produk_id);
          const currentStok = Number(prod?.stok || 0);
          const restoredStok = Math.max(0, currentStok - Number(item.qty || 0));

          await supabase
            .from('produk')
            .update({ stok: restoredStok, updated_at: new Date().toISOString() })
            .eq('id', item.produk_id);

          await supabase.from('riwayat_stok').insert({
            produk_id: item.produk_id,
            tipe: 'PENYESUAIAN_STOK',
            qty: -Number(item.qty || 0),
            stok_akhir: restoredStok,
            keterangan: `Pembatalan / Penghapusan Penerimaan ${noDoc}`,
            no_referensi: noDoc,
          });
        }
      }

      // 3. Hapus detail dan header RI
      await supabase.from('penerimaan_barang_detail').delete().eq('penerimaan_id', id);
      const { error: hErr } = await supabase.from('penerimaan_barang').delete().eq('id', id);
      if (hErr) throw hErr;

      onToast?.(`Penerimaan Barang ${noDoc} berhasil dihapus & stok telah disesuaikan!`, 'success');
      setDeleteConfirmDoc(null);
      await handleResetToNewRI();
      await loadAllPurchaseData();
      switchViewMode('ri_beli', 'list');
      onRefresh?.();
    } catch (err) {
      console.error('Error delete RI:', err);
      onToast?.('Gagal menghapus Penerimaan: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFB = async (id, noDoc) => {
    setLoading(true);
    try {
      // 1. Hapus jurnal pembukuan terkait
      await supabase.from('jurnal_umum_detail').delete().in('jurnal_id', 
        (await supabase.from('jurnal_umum').select('id').eq('no_referensi', noDoc)).data?.map((j) => j.id) || []
      );
      await supabase.from('jurnal_umum').delete().eq('no_referensi', noDoc);

      // 2. Hapus detail dan faktur pembelian
      await supabase.from('pembayaran_pembelian').delete().eq('pembelian_id', id);
      await supabase.from('pembelian_detail').delete().eq('pembelian_id', id);
      const { error: fErr } = await supabase.from('pembelian').delete().eq('id', id);
      if (fErr) throw fErr;

      onToast?.(`Faktur Pembelian ${noDoc} berhasil dihapus dari Supabase!`, 'success');
      setDeleteConfirmDoc(null);
      await handleResetToNewFB();
      await loadAllPurchaseData();
      switchViewMode('pi_beli', 'list');
      onRefresh?.();
    } catch (err) {
      console.error('Error delete FB:', err);
      onToast?.('Gagal menghapus Faktur: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePP = async (id, noBukti) => {
    setLoading(true);
    try {
      // 1. Cari data pembayaran untuk mengembalikan sisa hutang di faktur
      const targetPay = purchasePayments.find((pp) => pp.id === id);
      if (targetPay && targetPay.pembelian_id) {
        const inv = purchases.find((p) => p.id === targetPay.pembelian_id);
        if (inv) {
          const newBayar = Math.max(0, Number(inv.bayar || 0) - Number(targetPay.total_bayar || 0));
          await supabase
            .from('pembelian')
            .update({
              bayar: newBayar,
              status_bayar: newBayar >= Number(inv.total_akhir || inv.total) ? 'LUNAS' : 'HUTANG',
            })
            .eq('id', targetPay.pembelian_id);
        }
      }

      // 2. Hapus jurnal pembayaran
      await supabase.from('jurnal_umum_detail').delete().in('jurnal_id', 
        (await supabase.from('jurnal_umum').select('id').eq('no_referensi', noBukti)).data?.map((j) => j.id) || []
      );
      await supabase.from('jurnal_umum').delete().eq('no_referensi', noBukti);

      // 3. Hapus pembayaran
      const { error: pErr } = await supabase.from('pembayaran_pembelian').delete().eq('id', id);
      if (pErr) throw pErr;

      onToast?.(`Pembayaran Hutang ${noBukti} berhasil dibatalkan!`, 'success');
      setDeleteConfirmDoc(null);
      await handleResetToNewPP();
      await loadAllPurchaseData();
      switchViewMode('pp_beli', 'list');
      onRefresh?.();
    } catch (err) {
      console.error('Error delete PP:', err);
      onToast?.('Gagal menghapus pembayaran: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSupplier = async (id, nama) => {
    // Cek apakah supplier memiliki riwayat transaksi
    const hasPO = purchaseOrders.some((po) => po.supplier_id === id);
    const hasRI = goodsReceipts.some((ri) => ri.supplier_id === id);
    const hasFB = purchases.some((p) => p.supplier_id === id);

    if (hasPO || hasRI || hasFB) {
      onToast?.(`Pemasok ${nama} tidak dapat dihapus karena memiliki riwayat transaksi!`, 'warning');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from('kontak').delete().eq('id', id);
      if (error) throw error;

      onToast?.(`Pemasok ${nama} berhasil dihapus dari database!`, 'success');
      setDeleteConfirmDoc(null);
      await loadAllPurchaseData();
    } catch (err) {
      console.error('Error delete supplier:', err);
      onToast?.('Gagal menghapus pemasok: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // SAVE HANDLERS
  // -------------------------------------------------------------

  // 1. SIMPAN PESANAN PEMBELIAN (PO)
  const handleSavePO = async () => {
    if (!poForm.supplierId) return onToast?.('Silakan pilih supplier / pemasok terlebih dahulu!', 'warning');
    if (poForm.items.length === 0) return onToast?.('Pilih minimal 1 item kemasan yang dipesan!', 'warning');

    try {
      setLoading(true);
      const { grandTotal } = calculatePOTotals();
      const docNo = poForm.editingId ? poForm.poNo : await getNextDocNumber('PO', poForm.date);

      if (poForm.editingId) {
        const { error: updErr } = await supabase
          .from('pesanan_pembelian')
          .update({
            tanggal: poForm.date,
            supplier_id: poForm.supplierId,
            total: grandTotal,
            catatan: poForm.catatan,
            lampiran_url: poForm.lampiran_url || null,
          })
          .eq('id', poForm.editingId);
        if (updErr) throw updErr;

        await supabase.from('pesanan_pembelian_detail').delete().eq('pesanan_id', poForm.editingId);
        const details = poForm.items.map((i) => ({
          pesanan_id: poForm.editingId,
          produk_id: i.id,
          qty: Number(i.qty),
          harga_beli: Number(i.harga_beli),
          subtotal: Number(i.qty) * Number(i.harga_beli) - Number(i.diskonRp || 0),
        }));
        await supabase.from('pesanan_pembelian_detail').insert(details);
        onToast?.(`Pesanan Pembelian ${docNo} berhasil diperbarui!`, 'success');
      } else {
        const { data: poHeader, error: hErr } = await supabase
          .from('pesanan_pembelian')
          .insert({
            no_pesanan: docNo,
            tanggal: poForm.date,
            supplier_id: poForm.supplierId,
            total: grandTotal,
            status: 'MENUNGGU_PENERIMAAN',
            catatan: poForm.catatan,
            lampiran_url: poForm.lampiran_url || null,
          })
          .select()
          .single();
        if (hErr) throw hErr;

        const details = poForm.items.map((i) => ({
          pesanan_id: poHeader.id,
          produk_id: i.id,
          qty: Number(i.qty),
          harga_beli: Number(i.harga_beli),
          subtotal: Number(i.qty) * Number(i.harga_beli) - Number(i.diskonRp || 0),
        }));
        await supabase.from('pesanan_pembelian_detail').insert(details);
        onToast?.(`Pesanan Pembelian ${docNo} berhasil disimpan!`, 'success');
      }

      switchViewMode('po_beli', 'list');
      await loadAllPurchaseData();
      onRefresh?.();
    } catch (err) {
      console.error('Error save PO:', err);
      onToast?.('Gagal menyimpan PO: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 2. SIMPAN PENERIMAAN BARANG (RI)
  const handleSaveRI = async () => {
    if (!riForm.supplierId) return onToast?.('Silakan pilih supplier / pemasok terlebih dahulu!', 'warning');
    if (riForm.items.length === 0) return onToast?.('Pilih minimal 1 item kemasan yang diterima!', 'warning');

    try {
      setLoading(true);
      const docNo = riForm.editingId ? riForm.riNo : await getNextDocNumber('RI', riForm.date);

      if (riForm.editingId) {
        // Ambil detail lama untuk penyesuaian selisih stok
        const { data: oldDetails } = await supabase
          .from('penerimaan_barang_detail')
          .select('*')
          .eq('penerimaan_id', riForm.editingId);

        // Update Header RI
        const { error: rErr } = await supabase
          .from('penerimaan_barang')
          .update({
            tanggal: riForm.date,
            supplier_id: riForm.supplierId,
            pesanan_pembelian_id: riForm.poId || null,
            no_surat_jalan_supplier: riForm.supplierSJNo || null,
            keterangan: riForm.keterangan,
            lampiran_url: riForm.lampiran_url || null,
          })
          .eq('id', riForm.editingId);
        if (rErr) throw rErr;

        // Sesuaikan stok persediaan berdasarkan selisih (qty baru - qty lama)
        for (const item of riForm.items) {
          const old = (oldDetails || []).find((o) => o.produk_id === item.id);
          const oldQty = Number(old?.qty || 0);
          const diff = Number(item.qty || 0) - oldQty;

          if (diff !== 0) {
            const prod = products.find((p) => p.id === item.id);
            const currentStok = Number(prod?.stok || 0);
            const newStok = Math.max(0, currentStok + diff);

            await supabase
              .from('produk')
              .update({ stok: newStok, updated_at: new Date().toISOString() })
              .eq('id', item.id);

            await supabase.from('riwayat_stok').insert({
              produk_id: item.id,
              tipe: 'PEMBELIAN',
              qty: diff,
              stok_akhir: newStok,
              keterangan: `Revisi Penerimaan Barang via ${docNo} (SJ: ${riForm.supplierSJNo || '-'})`,
              no_referensi: docNo,
            });
          }
        }

        // Simpan Detail Baru
        await supabase.from('penerimaan_barang_detail').delete().eq('penerimaan_id', riForm.editingId);
        const details = riForm.items.map((i) => ({
          penerimaan_id: riForm.editingId,
          produk_id: i.id,
          qty: Number(i.qty),
          catatan: i.catatan || 'Kondisi Baik',
        }));
        await supabase.from('penerimaan_barang_detail').insert(details);

        onToast?.(`Penerimaan Barang ${docNo} berhasil diperbarui!`, 'success');
      } else {
        // Simpan Header RI Baru
        const { data: riHeader, error: rErr } = await supabase
          .from('penerimaan_barang')
          .insert({
            no_terima: docNo,
            tanggal: riForm.date,
            supplier_id: riForm.supplierId,
            pesanan_pembelian_id: riForm.poId || null,
            no_surat_jalan_supplier: riForm.supplierSJNo || null,
            keterangan: riForm.keterangan,
            lampiran_url: riForm.lampiran_url || null,
            status: 'DITERIMA',
          })
          .select()
          .single();
        if (rErr) throw rErr;

        // Simpan Detail RI
        const details = riForm.items.map((i) => ({
          penerimaan_id: riHeader.id,
          produk_id: i.id,
          qty: Number(i.qty),
          catatan: i.catatan || 'Kondisi Baik',
        }));
        await supabase.from('penerimaan_barang_detail').insert(details);

        // Update Stok Fisik di Produk & Catat Riwayat Mutasi
        for (const item of riForm.items) {
          const prod = products.find((p) => p.id === item.id);
          const currentStok = Number(prod?.stok || 0);
          const newStok = currentStok + Number(item.qty || 0);

          await supabase
            .from('produk')
            .update({
              stok: newStok,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          await supabase.from('riwayat_stok').insert({
            produk_id: item.id,
            tipe: 'PEMBELIAN',
            qty: Number(item.qty || 0),
            stok_akhir: newStok,
            keterangan: `Penerimaan Barang Masuk via ${docNo} (SJ: ${riForm.supplierSJNo || '-'})`,
            no_referensi: docNo,
          });
        }

        // Jika dari PO, update status PO menjadi SELESAI
        if (riForm.poId) {
          await supabase
            .from('pesanan_pembelian')
            .update({ status: 'SELESAI' })
            .eq('id', riForm.poId);
        }

        onToast?.(`Penerimaan Barang ${docNo} berhasil disimpan! Stok bertambah otomatis.`, 'success');
      }

      switchViewMode('ri_beli', 'list');
      await loadAllPurchaseData();
      onRefresh?.();
    } catch (err) {
      console.error('Error save RI:', err);
      onToast?.('Gagal menyimpan Penerimaan Barang: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 3. SIMPAN FAKTUR PEMBELIAN (FB)
  const handleSavePurchaseInvoice = async () => {
    if (!piForm.supplierId) return onToast?.('Silakan pilih supplier / pemasok terlebih dahulu!', 'warning');
    if (piForm.items.length === 0) return onToast?.('Pilih minimal 1 barang kemasan yang dibeli!', 'warning');

    try {
      setLoading(true);
      const { subtotal, diskonFaktur, ppn, grandTotal } = calculateFBTotals();
      const isCOD = piForm.termin === 'COD';
      const docNo = piForm.editingId ? piForm.invoiceNo : await getNextDocNumber('FB', piForm.date);

      if (piForm.editingId) {
        const { error: updErr } = await supabase
          .from('pembelian')
          .update({
            tanggal: piForm.date,
            supplier_id: piForm.supplierId,
            total: grandTotal,
            total_akhir: grandTotal,
            diskon: diskonFaktur,
            ppn_nominal: ppn,
            syarat_bayar: piForm.termin,
            tgl_jatuh_tempo: piForm.dueDate,
            no_faktur_supplier: piForm.supplierNo || null,
            catatan: piForm.catatan,
            lampiran_url: piForm.lampiran_url || null,
          })
          .eq('id', piForm.editingId);
        if (updErr) throw updErr;

        await supabase.from('pembelian_detail').delete().eq('pembelian_id', piForm.editingId);
        const details = piForm.items.map((i) => ({
          pembelian_id: piForm.editingId,
          produk_id: i.id,
          qty: Number(i.qty),
          harga_beli: Number(i.harga_beli),
          subtotal: Number(i.qty) * Number(i.harga_beli) - Number(i.diskonRp || 0),
        }));
        await supabase.from('pembelian_detail').insert(details);

        onToast?.(`Faktur Pembelian ${docNo} berhasil diperbarui!`, 'success');
        switchViewMode('pi_beli', 'list');
        await loadAllPurchaseData();
        onRefresh?.();
        return;
      }

      // 1. Simpan Header Pembelian ke Supabase
      const { data: pHeader, error: hErr } = await supabase
        .from('pembelian')
        .insert({
          no_faktur: docNo,
          tanggal: piForm.date,
          supplier_id: piForm.supplierId,
          total: grandTotal,
          total_akhir: grandTotal,
          diskon: diskonFaktur,
          ppn_nominal: ppn,
          bayar: isCOD ? grandTotal : 0,
          status_bayar: isCOD ? 'LUNAS' : 'HUTANG',
          syarat_bayar: piForm.termin,
          tgl_jatuh_tempo: piForm.dueDate,
          no_faktur_supplier: piForm.supplierNo || null,
          pesanan_pembelian_id: piForm.poId || null,
          penerimaan_barang_id: piForm.riId || null,
          catatan: piForm.catatan,
          lampiran_url: piForm.lampiran_url || null,
        })
        .select()
        .single();
      if (hErr) throw hErr;

      // 2. Simpan Detail Barang Pembelian
      const details = piForm.items.map((i) => ({
        pembelian_id: pHeader.id,
        produk_id: i.id,
        qty: Number(i.qty),
        harga_beli: Number(i.harga_beli),
        subtotal: Number(i.qty) * Number(i.harga_beli) - Number(i.diskonRp || 0),
      }));
      await supabase.from('pembelian_detail').insert(details);

      // 3. Penyesuaian Stok (Accurate Online / ERP Parity):
      // Catatan: Supabase memiliki database trigger `trg_pembelian_tambah_stok` yang otomatis menambah stok saat pembelian_detail di-insert.
      // - Kasus A: Jika Faktur Pembelian (FB) dibuat DARI Penerimaan Barang (RI), stok SUDAH masuk ke gudang saat RI diterbitkan!
      //   Maka trigger database yang terlanjur menambah stok harus kita batalkan (revert) agar tidak dobel hitung!
      // - Kasus B: Jika Faktur Pembelian (FB) dibuat LANGSUNG (tanpa RI), trigger database sudah otomatis menambah stok dan mencatat riwayat_stok.
      if (piForm.riId) {
        for (const item of piForm.items) {
          const { data: curProd } = await supabase.from('produk').select('stok').eq('id', item.id).single();
          const revertedStok = Math.max(0, Number(curProd?.stok || 0) - Number(item.qty || 0));
          await supabase
            .from('produk')
            .update({
              stok: revertedStok,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          // Hapus baris duplikasi mutasi dari trigger untuk no_faktur ini
          await supabase.from('riwayat_stok').delete().eq('no_referensi', docNo).eq('produk_id', item.id);
        }
      } else {
        // Direct FB: update harga_beli master produk jika ada harga terbaru
        for (const item of piForm.items) {
          await supabase
            .from('produk')
            .update({
              harga_beli: Number(item.harga_beli || 0),
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id);
        }
      }

      // 4. Posting Jurnal Double-Entry (GAAP/PSAK):
      // Debit: 1104-01 (Persediaan Barang Dagang)
      // Debit: 1105-03 (PPN Masukan jika aktif)
      // Kredit: 2101-01 (Hutang Usaha Supplier) jika tempo, ATAU 1102-01 / 1101-01 jika COD
      const creditAccount = isCOD ? '1102-01' : '2101-01';
      const journalLines = [
        {
          kodeAkun: '1104-01',
          debit: subtotal,
          kredit: 0,
          catatan: `Persediaan Kemasan Masuk (${docNo})`,
        },
      ];

      if (ppn > 0) {
        journalLines.push({
          kodeAkun: '1105-03',
          debit: ppn,
          kredit: 0,
          catatan: 'PPN Masukan Pembelian (11%)',
        });
      }

      journalLines.push({
        kodeAkun: creditAccount,
        debit: 0,
        kredit: grandTotal,
        catatan: isCOD ? `Pelunasan Langsung (COD) via Kas/Bank (${docNo})` : `Hutang Usaha Supplier (${docNo})`,
      });

      await createJournalEntry({
        tanggal: piForm.date,
        tipeTransaksi: 'PEMBELIAN',
        noReferensi: docNo,
        keterangan: `Faktur Pembelian ${docNo} (${piForm.supplierNo ? 'Ref: ' + piForm.supplierNo : 'Tempo'})`,
        details: journalLines,
      });

      // Update status referensi (Accurate Parity)
      if (piForm.poId) {
        await supabase
          .from('pesanan_pembelian')
          .update({ status: 'SELESAI' })
          .eq('id', piForm.poId);
      }
      if (piForm.riId) {
        await supabase
          .from('penerimaan_barang')
          .update({ status: 'SELESAI' })
          .eq('id', piForm.riId);
      }

      onToast?.(`Faktur Pembelian ${docNo} berhasil disimpan & jurnal otomatis terposting!`, 'success');
      switchViewMode('pi_beli', 'list');
      await loadAllPurchaseData();
      onRefresh?.();
    } catch (err) {
      console.error('Error save Purchase Invoice:', err);
      onToast?.('Gagal menyimpan Faktur Pembelian: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 4. SIMPAN PEMBAYARAN PEMBELIAN (PP - PELUNASAN HUTANG / BAYAR PESANAN)
  const handleSavePayment = async () => {
    if (!paymentForm.supplierId) return onToast?.('Pilih supplier terlebih dahulu!', 'warning');
    if (!paymentForm.purchaseId && !paymentForm.poId) return onToast?.('Pilih faktur atau pesanan pembelian yang akan dibayar!', 'warning');
    if (Number(paymentForm.amount) <= 0) return onToast?.('Nominal pembayaran harus lebih dari Rp 0!', 'warning');

    try {
      setLoading(true);
      const docNo = paymentForm.editingId ? paymentForm.receiptNo : await getNextDocNumber('PP', paymentForm.date);
      const targetAccount = accounts.find((a) => a.id === paymentForm.accountId) || accounts.find((a) => a.kode_akun === '1102-01') || accounts[0];
      const creditKodeAkun = targetAccount?.kode_akun || '1102-01';

      let purchaseId = paymentForm.purchaseId;
      let refDocNo = '';
      let supplierName = suppliers.find((s) => s.id === paymentForm.supplierId)?.nama || 'Supplier';

      // KASUS 1: Bayar langsung dari Pesanan Pembelian (PO) yang belum difakturkan
      if (!purchaseId && paymentForm.poId) {
        const targetPO = purchaseOrders.find((p) => p.id === paymentForm.poId);
        refDocNo = targetPO?.no_pesanan || paymentForm.poNo || 'PO';
        supplierName = targetPO?.supplier?.nama || supplierName;
        const today = paymentForm.date;
        const newFBNo = await getNextDocNumber('FB', today);
        const totalPO = Number(targetPO?.total || paymentForm.amount || 0);
        const isFull = Number(paymentForm.amount) >= totalPO;

        // A. Terbitkan Faktur Pembelian (FB) otomatis agar tercatat resmi
        const { data: pHeader, error: hErr } = await supabase
          .from('pembelian')
          .insert({
            no_faktur: newFBNo,
            tanggal: today,
            supplier_id: paymentForm.supplierId,
            total: totalPO,
            total_akhir: totalPO,
            diskon: 0,
            ppn_nominal: 0,
            bayar: Number(paymentForm.amount),
            status_bayar: isFull ? 'LUNAS' : 'HUTANG',
            syarat_bayar: 'COD',
            tgl_jatuh_tempo: today,
            pesanan_pembelian_id: targetPO?.id || paymentForm.poId,
            catatan: `Faktur Pembelian otomatis dari ${refDocNo} via Pembayaran ${docNo}`,
          })
          .select()
          .single();
        if (hErr) throw hErr;
        purchaseId = pHeader.id;

        // B. Simpan Detail Barang Pembelian
        const poDetails = (targetPO?.pesanan_pembelian_detail || []).map((d) => ({
          pembelian_id: pHeader.id,
          produk_id: d.produk_id,
          qty: Number(d.qty || 1),
          harga_beli: Number(d.harga_beli || 0),
          subtotal: Number(d.subtotal || 0),
        }));
        if (poDetails.length > 0) {
          await supabase.from('pembelian_detail').insert(poDetails);
        }

        // C. Update status PO jadi SELESAI
        await supabase
          .from('pesanan_pembelian')
          .update({ status: 'SELESAI' })
          .eq('id', targetPO?.id || paymentForm.poId);

        // D. Stok persediaan:
        // Saat pembelian_detail di-insert di atas, trigger PostgreSQL `trg_pembelian_tambah_stok`
        // otomatis menambah stok dan mencatat riwayat_stok. Cukup update harga_beli master jika perlu.
        for (const item of poDetails) {
          await supabase
            .from('produk')
            .update({
              harga_beli: Number(item.harga_beli || 0),
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.produk_id);
        }

        // E. Catat Jurnal Akrual Pembelian Resmi (Debit Persediaan 1104-01, Kredit Hutang Usaha 2101-01)
        await createJournalEntry({
          tanggal: today,
          tipeTransaksi: 'PEMBELIAN',
          noReferensi: newFBNo,
          keterangan: `Faktur Pembelian ${newFBNo} (Otomatis dari ${refDocNo})`,
          details: [
            {
              kodeAkun: '1104-01',
              debit: totalPO,
              kredit: 0,
              catatan: `Persediaan Kemasan Masuk via ${newFBNo}`,
            },
            {
              kodeAkun: '2101-01',
              debit: 0,
              kredit: totalPO,
              catatan: `Hutang Usaha ${supplierName} (${newFBNo})`,
            },
          ],
        });
      } else {
        // KASUS 2: Bayar Faktur Pembelian (FB) yang sudah terdaftar
        const targetPurchase = purchases.find((p) => p.id === purchaseId);
        refDocNo = targetPurchase?.no_faktur || '';
        supplierName = targetPurchase?.supplier?.nama || supplierName;
        const totalInvoice = Number(targetPurchase?.total_akhir || targetPurchase?.total || 0);
        const currentPaid = Number(targetPurchase?.bayar || 0);
        const newPaid = currentPaid + Number(paymentForm.amount);
        const isFull = newPaid >= totalInvoice || Math.abs(newPaid - totalInvoice) <= 2;
        const finalBayar = isFull ? totalInvoice : newPaid;

        const { error: pUpdErr } = await supabase
          .from('pembelian')
          .update({
            bayar: finalBayar,
            status_bayar: isFull ? 'LUNAS' : 'HUTANG',
          })
          .eq('id', purchaseId);
        if (pUpdErr) throw pUpdErr;
      }

      // Simpan Header Pembayaran ke Supabase
      const { error: payErr } = await supabase.from('pembayaran_pembelian').insert({
        no_bukti: docNo,
        tanggal: paymentForm.date,
        supplier_id: paymentForm.supplierId,
        pembelian_id: purchaseId,
        akun_kas_id: targetAccount.id,
        total_bayar: Number(paymentForm.amount),
        metode_bayar: 'TRANSFER_BANK',
        catatan: paymentForm.catatan || `Pelunasan Pembelian ${refDocNo}`,
        lampiran_url: paymentForm.lampiran_url || null,
      });
      if (payErr) throw payErr;

      // Jurnal Double-Entry Standar PSAK / GAAP:
      // Debit: 2101-01 (Hutang Usaha Supplier)
      // Kredit: Akun Kas/Bank terpilih (e.g. 1102-01 Bank BCA)
      await createJournalEntry({
        tanggal: paymentForm.date,
        tipeTransaksi: 'PENGELUARAN_KAS',
        noReferensi: docNo,
        keterangan: `Pembayaran Pembelian ${refDocNo} (${docNo})`,
        details: [
          {
            kodeAkun: '2101-01',
            debit: Number(paymentForm.amount),
            kredit: 0,
            catatan: `Pelunasan Hutang Usaha ${supplierName}`,
          },
          {
            kodeAkun: creditKodeAkun,
            debit: 0,
            kredit: Number(paymentForm.amount),
            catatan: `Pengeluaran via ${targetAccount?.nama_akun || 'Kas/Bank'}`,
          },
        ],
      });

      onToast?.(`Pembayaran Pembelian ${docNo} sebesar Rp ${Number(paymentForm.amount).toLocaleString('id-ID')} berhasil dicatat & jurnal terposting!`, 'success');
      switchViewMode('pp_beli', 'list');
      await loadAllPurchaseData();
      onRefresh?.();
    } catch (err) {
      console.error('Error save Payment:', err);
      onToast?.('Gagal menyimpan pembayaran: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // TAKE (AMBIL) DATA FLOW HANDLERS (PO -> RI -> FB -> PP)
  // -------------------------------------------------------------
  const handleTakePOIntoRI = async (po) => {
    const today = new Date().toISOString().split('T')[0];
    const nextNo = await peekNextDocNumber('RI', today);
    const supplierId = po.supplierId || po.supplier_id || '';
    const poNo = po.poNo || po.no_pesanan || '';
    const poId = po.editingId || po.id || null;

    const sourceItems = (po.items && po.items.length > 0)
      ? po.items
      : (po.pesanan_pembelian_detail || []).map((d) => {
          const prod = products.find((p) => p.id === d.produk_id);
          return {
            id: d.produk_id,
            kode_sku: d.produk?.kode_sku || prod?.kode_sku || '',
            nama: d.produk?.nama || prod?.nama || '',
            satuan: d.satuan || d.produk?.satuan || prod?.satuan || 'Pcs',
            qty: Number(d.qty || 1),
            catatan: d.catatan || 'Kondisi Baik',
          };
        });

    setRiForm({
      editingId: null,
      riNo: nextNo || `RI.${today.replace(/-/g, '.')}.0001`,
      date: today,
      supplierId: supplierId,
      poId: poId,
      poNo: poNo,
      supplierSJNo: '',
      items: sourceItems.map((i) => ({
        id: i.id,
        kode_sku: i.kode_sku,
        nama: i.nama,
        satuan: i.satuan || 'Pcs',
        qty: Number(i.qty || 1),
        catatan: i.catatan || 'Kondisi Baik',
      })),
      keterangan: `Penerimaan Barang dari Pesanan Pembelian ${poNo}`,
      lampiran_url: '',
    });
    setTakeModalType(null);
    onToast?.(`Pesanan ${poNo} berhasil dialirkan ke Penerimaan Barang (${nextNo})!`, 'success', 'Alur Diproses');
  };

  const handleTakeRIIntoFB = async (ri) => {
    const today = new Date().toISOString().split('T')[0];
    const nextNo = await peekNextDocNumber('FB', today);
    const supplierId = ri.supplierId || ri.supplier_id || '';
    const riNo = ri.riNo || ri.no_terima || '';
    const riId = ri.editingId || ri.id || null;
    const poId = ri.poId || ri.pesanan_pembelian_id || null;
    const defaultTerm = (syaratBayarList.find((t) => t.isDefault) || syaratBayarList[0])?.nama || 'Net 30';
    const dueDate = calculateDueDate(today, defaultTerm, syaratBayarList);

    const sourceItems = (ri.items && ri.items.length > 0)
      ? ri.items
      : (ri.penerimaan_barang_detail || []).map((d) => {
          const prod = products.find((p) => p.id === d.produk_id);
          return {
            id: d.produk_id,
            kode_sku: d.produk?.kode_sku || prod?.kode_sku || '',
            nama: d.produk?.nama || prod?.nama || '',
            satuan: d.satuan || d.produk?.satuan || prod?.satuan || 'Pcs',
            qty: Number(d.qty || 1),
            harga_beli: Number(d.harga_beli || prod?.harga_beli || 0),
            diskonPersen: 0,
            diskonRp: 0,
          };
        });

    setPiForm({
      editingId: null,
      invoiceNo: nextNo || `FB.${today.replace(/-/g, '.')}.0001`,
      date: today,
      supplierId: supplierId,
      riId: riId,
      poId: poId,
      supplierNo: ri.supplierSJNo || ri.no_surat_jalan_supplier || '',
      termin: defaultTerm,
      dueDate: dueDate,
      discountAmount: 0,
      ppnActive: false,
      items: sourceItems.map((i) => {
        const prod = products.find((p) => p.id === i.id);
        const hb = Number(i.harga_beli || prod?.harga_beli || 0);
        return {
          id: i.id,
          kode_sku: i.kode_sku || prod?.kode_sku || '',
          nama: i.nama || prod?.nama || '',
          satuan: i.satuan || prod?.satuan || 'Pcs',
          qty: Number(i.qty || 1),
          harga_beli: hb,
          diskonPersen: Number(i.diskonPersen || 0),
          diskonRp: Number(i.diskonRp || 0),
          total: Math.round(Number(i.qty || 1) * hb),
          catatan: i.catatan || '',
        };
      }),
      catatan: `Faktur Pembelian berdasarkan Penerimaan Barang ${riNo}`,
      lampiran_url: '',
    });
    setTakeModalType(null);
    onToast?.(`Penerimaan Barang ${riNo} berhasil dialirkan ke Faktur Beli (${nextNo})!`, 'success', 'Alur Diproses');
  };

  const handleTakePOIntoFB = async (po) => {
    const today = new Date().toISOString().split('T')[0];
    const nextNo = await peekNextDocNumber('FB', today);
    const supplierId = po.supplierId || po.supplier_id || '';
    const poNo = po.poNo || po.no_pesanan || '';
    const poId = po.editingId || po.id || null;
    const poTerm = po.termin || po.syarat_bayar || (syaratBayarList.find((t) => t.isDefault) || syaratBayarList[0])?.nama || 'Net 30';
    const dueDate = calculateDueDate(today, poTerm, syaratBayarList);

    const sourceItems = (po.items && po.items.length > 0)
      ? po.items
      : (po.pesanan_pembelian_detail || []).map((d) => {
          const prod = products.find((p) => p.id === d.produk_id);
          return {
            id: d.produk_id,
            kode_sku: d.produk?.kode_sku || prod?.kode_sku || '',
            nama: d.produk?.nama || prod?.nama || '',
            satuan: d.satuan || d.produk?.satuan || prod?.satuan || 'Pcs',
            qty: Number(d.qty || 1),
            harga_beli: Number(d.harga_beli || prod?.harga_beli || 0),
            diskonPersen: Number(d.diskon_persen || d.diskonPersen || 0),
            diskonRp: Number(d.diskon_rp || d.diskonRp || 0),
            total: Number(d.subtotal || 0),
            catatan: d.catatan || '',
          };
        });

    setPiForm({
      editingId: null,
      invoiceNo: nextNo || `FB.${today.replace(/-/g, '.')}.0001`,
      date: today,
      supplierId: supplierId,
      poId: poId,
      riId: null,
      supplierNo: '',
      termin: poTerm,
      dueDate: dueDate,
      discountAmount: Number(po.discountAmount || 0),
      ppnActive: po.ppnActive !== undefined ? po.ppnActive : false,
      items: sourceItems.map((i) => ({
        id: i.id,
        kode_sku: i.kode_sku,
        nama: i.nama,
        satuan: i.satuan || 'Pcs',
        qty: Number(i.qty || 1),
        harga_beli: Number(i.harga_beli || 0),
        diskonPersen: Number(i.diskonPersen || 0),
        diskonRp: Number(i.diskonRp || 0),
        total: i.total !== undefined ? i.total : Math.round(Number(i.qty || 1) * Number(i.harga_beli || 0) - Number(i.diskonRp || 0)),
        catatan: i.catatan || '',
      })),
      catatan: `Faktur Pembelian berdasarkan Pesanan ${poNo}`,
      lampiran_url: '',
    });
    setTakeModalType(null);
    onToast?.(`Pesanan ${poNo} berhasil dialirkan ke Faktur Pembelian (${nextNo})!`, 'success', 'Alur Diproses');
  };

  const handleFlowFBtoPP = async (inv) => {
    const today = new Date().toISOString().split('T')[0];
    const nextNo = await peekNextDocNumber('PP', today);
    const invoiceNo = inv.invoiceNo || inv.no_faktur || '';
    const supplierId = inv.supplierId || inv.supplier_id || '';
    const purchaseId = inv.editingId || inv.id || null;
    const totalInv = Number(inv.total_akhir || inv.total || (inv.items ? inv.items.reduce((acc, i) => acc + (i.total || (i.qty * i.harga_beli)), 0) : 0));
    const paid = Number(inv.bayar || 0);
    const remaining = Math.max(0, totalInv - paid);

    setPaymentForm({
      editingId: null,
      receiptNo: nextNo || `PP.${today.replace(/-/g, '.')}.0001`,
      date: today,
      supplierId: supplierId,
      purchaseId: purchaseId,
      poId: null,
      poNo: '',
      accountId: accounts.find((a) => a.kode_akun === '1102-01')?.id || accounts[0]?.id || '',
      amount: remaining,
      catatan: `Pelunasan Faktur Pembelian ${invoiceNo}`,
      lampiran_url: '',
    });
    handleSubTabSwitch('pp_beli');
    switchViewMode('pp_beli', 'form');
    onToast?.(`Faktur ${invoiceNo} berhasil dialirkan ke Pembayaran Pelunasan (Sisa: Rp ${remaining.toLocaleString('id-ID')})!`, 'info', 'Alur Diproses');
  };

  const handleFlowPOtoPP = async (po) => {
    const today = new Date().toISOString().split('T')[0];
    const nextNo = await peekNextDocNumber('PP', today);
    const poNo = po.poNo || po.no_pesanan || '';
    const supplierId = po.supplierId || po.supplier_id || '';
    const poId = po.editingId || po.id || null;
    const totalPO = Number(po.total || po.total_akhir || 0);

    setPaymentForm({
      editingId: null,
      receiptNo: nextNo || `PP.${today.replace(/-/g, '.')}.0001`,
      date: today,
      supplierId: supplierId,
      purchaseId: '',
      poId: poId,
      poNo: poNo,
      accountId: accounts.find((a) => a.kode_akun === '1102-01')?.id || accounts[0]?.id || '',
      amount: totalPO,
      catatan: `Pembayaran Pelunasan Pesanan Pembelian ${poNo}`,
      lampiran_url: '',
    });
    handleSubTabSwitch('pp_beli');
    switchViewMode('pp_beli', 'form');
    onToast?.(`Pesanan ${poNo} dialirkan ke Pembayaran Pelunasan (Nominal: Rp ${totalPO.toLocaleString('id-ID')})!`, 'info', 'Alur Diproses');
  };

  // Helper filter date
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

  // Filtered lists for list views
  const filteredPOs = purchaseOrders
    .filter((po) => {
      const q = (searchQuery || '').toLowerCase().trim();
      if (!q) return true;
      return (
        (po.no_pesanan || '').toLowerCase().includes(q) ||
        (po.supplier?.nama || '').toLowerCase().includes(q) ||
        (po.catatan && po.catatan.toLowerCase().includes(q))
      );
    })
    .filter((po) => {
      const flt = advancedFilters.po_beli;
      const statusTerima = flt.statusTerima !== undefined && flt.statusTerima !== 'ALL' ? flt.statusTerima : flt.status;
      if (statusTerima === 'ALL') return true;
      if (statusTerima === 'MENUNGGU_PENERIMAAN') return po.status !== 'SELESAI';
      if (statusTerima === 'SELESAI') return po.status === 'SELESAI';
      return true;
    })
    .filter((po) => {
      const flt = advancedFilters.po_beli;
      if (!flt.statusBayar || flt.statusBayar === 'ALL') return true;
      const linkedFB = purchases.find((p) => p.pesanan_pembelian_id === po.id);
      const isLunas = po.status_bayar === 'LUNAS' || (linkedFB && (linkedFB.status_bayar === 'LUNAS' || Number(linkedFB.bayar || 0) >= Number(linkedFB.total_akhir || linkedFB.total || 0))) || po.status === 'SELESAI';
      if (flt.statusBayar === 'LUNAS') return isLunas;
      if (flt.statusBayar === 'BELUM_BAYAR') return !isLunas;
      return true;
    })
    .filter((po) => {
      const flt = advancedFilters.po_beli;
      if (flt.supplier === 'ALL') return true;
      return po.supplier_id === flt.supplier;
    })
    .filter((po) => {
      const flt = advancedFilters.po_beli;
      return matchDateRange(po.tanggal, flt.dateRange, flt.customStartDate, flt.customEndDate);
    })
    .sort((a, b) => {
      const cfg = tableConfigs.po_beli || DEFAULT_TABLE_CONFIGS.po_beli;
      if (cfg.sortBy === 'date_asc') return (a.tanggal || '').localeCompare(b.tanggal || '');
      if (cfg.sortBy === 'total_desc') return Number(b.total || 0) - Number(a.total || 0);
      if (cfg.sortBy === 'total_asc') return Number(a.total || 0) - Number(b.total || 0);
      return (b.tanggal || '').localeCompare(a.tanggal || '');
    });

  const filteredRIs = goodsReceipts
    .filter((ri) => {
      const q = (searchQuery || '').toLowerCase().trim();
      if (!q) return true;
      return (
        (ri.no_terima || '').toLowerCase().includes(q) ||
        (ri.supplier?.nama || '').toLowerCase().includes(q) ||
        (ri.no_surat_jalan_supplier || '').toLowerCase().includes(q) ||
        (ri.pesanan_pembelian?.no_pesanan || '').toLowerCase().includes(q)
      );
    })
    .filter((ri) => {
      const flt = advancedFilters.ri_beli;
      if (flt.supplier === 'ALL') return true;
      return ri.supplier_id === flt.supplier;
    })
    .filter((ri) => {
      const flt = advancedFilters.ri_beli;
      return matchDateRange(ri.tanggal, flt.dateRange, flt.customStartDate, flt.customEndDate);
    })
    .sort((a, b) => {
      const cfg = tableConfigs.ri_beli || DEFAULT_TABLE_CONFIGS.ri_beli;
      if (cfg.sortBy === 'date_asc') return (a.tanggal || '').localeCompare(b.tanggal || '');
      return (b.tanggal || '').localeCompare(a.tanggal || '');
    });

  const filteredPurchases = purchases
    .filter((p) => {
      const q = (searchQuery || '').toLowerCase().trim();
      if (!q) return true;
      return (
        (p.no_faktur || '').toLowerCase().includes(q) ||
        (p.supplier?.nama || '').toLowerCase().includes(q) ||
        (p.no_faktur_supplier || '').toLowerCase().includes(q) ||
        (p.catatan && p.catatan.toLowerCase().includes(q))
      );
    })
    .filter((p) => {
      const flt = advancedFilters.pi_beli;
      if (flt.statusBayar === 'ALL') return true;
      return p.status_bayar === flt.statusBayar;
    })
    .filter((p) => {
      const flt = advancedFilters.pi_beli;
      if (flt.supplier === 'ALL') return true;
      return p.supplier_id === flt.supplier;
    })
    .filter((p) => {
      const flt = advancedFilters.pi_beli;
      return matchDateRange(p.tanggal, flt.dateRange, flt.customStartDate, flt.customEndDate);
    })
    .sort((a, b) => {
      const cfg = tableConfigs.pi_beli || DEFAULT_TABLE_CONFIGS.pi_beli;
      if (cfg.sortBy === 'date_asc') return (a.tanggal || '').localeCompare(b.tanggal || '');
      if (cfg.sortBy === 'total_desc') return Number(b.total_akhir || 0) - Number(a.total_akhir || 0);
      if (cfg.sortBy === 'total_asc') return Number(a.total_akhir || 0) - Number(b.total_akhir || 0);
      return (b.tanggal || '').localeCompare(a.tanggal || '');
    });

  const filteredPayments = purchasePayments
    .filter((pp) => {
      const q = (searchQuery || '').toLowerCase().trim();
      if (!q) return true;
      return (
        (pp.no_bukti || '').toLowerCase().includes(q) ||
        (pp.supplier?.nama || '').toLowerCase().includes(q) ||
        (pp.pembelian?.no_faktur || '').toLowerCase().includes(q)
      );
    })
    .filter((pp) => {
      const flt = advancedFilters.pp_beli;
      if (flt.supplier === 'ALL') return true;
      return pp.supplier_id === flt.supplier;
    })
    .filter((pp) => {
      const flt = advancedFilters.pp_beli;
      if (flt.bankAkun === 'ALL') return true;
      return pp.akun_kas_id === flt.bankAkun || pp.akun?.id === flt.bankAkun;
    })
    .filter((pp) => {
      const flt = advancedFilters.pp_beli;
      return matchDateRange(pp.tanggal, flt.dateRange, flt.customStartDate, flt.customEndDate);
    })
    .sort((a, b) => {
      const cfg = tableConfigs.pp_beli || DEFAULT_TABLE_CONFIGS.pp_beli;
      if (cfg.sortBy === 'date_asc') return (a.tanggal || '').localeCompare(b.tanggal || '');
      return (b.tanggal || '').localeCompare(a.tanggal || '');
    });

  const filteredSuppliers = suppliers.filter((s) => {
    return (
      (s.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.telepon || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.alamat || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredProducts = products.filter((p) => {
    return (
      (p.nama || '').toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
      (p.kode_sku || '').toLowerCase().includes(itemSearchQuery.toLowerCase())
    );
  });

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 space-y-2">
      {/* ======================================================== */}
      {/* 1. SUB-MODUL: PESANAN PEMBELIAN (PO_BELI)                */}
      {/* ======================================================== */}
      {activeTab === 'po_beli' && (
        <div className="w-full flex-1 flex flex-col space-y-2">
          {/* TOOLBAR */}
          <div className="relative z-40 flex items-center justify-between px-3.5 py-2 bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className="flex items-center space-x-2.5">
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => switchViewMode('po_beli', 'list')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out active:scale-[0.97] flex items-center space-x-1.5 cursor-pointer ${
                    viewModes.po_beli === 'list'
                      ? 'bg-[#0A3828] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  title="Lihat Daftar Pesanan Pembelian"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Daftar Pesanan (PO)</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetToNewPO}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out active:scale-[0.97] flex items-center space-x-1.5 cursor-pointer ${
                    viewModes.po_beli === 'form'
                      ? 'bg-[#0A3828] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  title="Buka Formulir Input Pesanan Baru"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Input Pesanan Baru</span>
                </button>
              </div>

              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-300 text-[10px] font-mono font-bold rounded">
                PURCHASE ORDER (PO)
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {viewModes.po_beli === 'form' ? (
                <>
                  <button
                    type="button"
                    onClick={handleResetToNewPO}
                    className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 active:scale-[0.97] hover:-translate-y-0.5 hover:shadow-sm flex items-center space-x-1 transition-all duration-200 ease-out cursor-pointer"
                    title="Bersihkan formulir untuk pesanan baru"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Form Baru</span>
                  </button>

                  {/* PROSES ALUR TRANSAKSI (JIKA EDITING PO) */}
                  {poForm.editingId && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setPoFlowDropdownOpen(!poFlowDropdownOpen)}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 transition active:scale-[0.97] cursor-pointer"
                        title="Lanjutkan proses alur transaksi pesanan pembelian"
                      >
                        <Workflow className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Proses Alur ▾</span>
                      </button>

                      {poFlowDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40 cursor-default" onClick={() => setPoFlowDropdownOpen(false)} />
                          <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-xs text-left animate-in fade-in duration-100">
                            <button
                              type="button"
                              onClick={async () => {
                                setPoFlowDropdownOpen(false);
                                const currentPO = {
                                  ...poForm,
                                  id: poForm.editingId,
                                  no_pesanan: poForm.poNo,
                                  supplier_id: poForm.supplierId,
                                  items: poForm.items,
                                };
                                await handleTakePOIntoRI(currentPO);
                                handleSubTabSwitch('ri_beli');
                                switchViewMode('ri_beli', 'form');
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-emerald-50 text-slate-800 flex items-center space-x-2 font-semibold"
                            >
                              <Truck className="w-4 h-4 text-emerald-600" />
                              <div>
                                <div className="font-bold text-emerald-950">+ Terima Barang (RI)</div>
                                <div className="text-[10px] text-slate-500">Catat fisik barang masuk gudang</div>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                setPoFlowDropdownOpen(false);
                                const currentPO = {
                                  ...poForm,
                                  id: poForm.editingId,
                                  no_pesanan: poForm.poNo,
                                  supplier_id: poForm.supplierId,
                                  items: poForm.items,
                                  discountAmount: poForm.discountAmount,
                                  ppnActive: poForm.ppnActive,
                                };
                                await handleTakePOIntoFB(currentPO);
                                handleSubTabSwitch('pi_beli');
                                switchViewMode('pi_beli', 'form');
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-blue-50 text-slate-800 flex items-center space-x-2 font-semibold border-t border-slate-100"
                            >
                              <FileCheck className="w-4 h-4 text-blue-600" />
                              <div>
                                <div className="font-bold text-blue-950">+ Terbitkan Faktur (FB)</div>
                                <div className="text-[10px] text-slate-500">Catat tagihan hutang supplier</div>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                setPoFlowDropdownOpen(false);
                                const poTotals = calculatePOTotals();
                                const currentPO = {
                                  ...poForm,
                                  id: poForm.editingId,
                                  no_pesanan: poForm.poNo,
                                  supplier_id: poForm.supplierId,
                                  items: poForm.items,
                                  total: poTotals.grandTotal,
                                };
                                await handleFlowPOtoPP(currentPO);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-amber-50 text-slate-800 flex items-center space-x-2 font-semibold border-t border-slate-100"
                            >
                              <Coins className="w-4 h-4 text-amber-600" />
                              <div>
                                <div className="font-bold text-amber-950">+ Bayar Pembelian (PP)</div>
                                <div className="text-[10px] text-slate-500">Bayar langsung pesanan ini via Kas/Bank</div>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPoFlowDropdownOpen(false);
                                const p = purchaseOrders.find((x) => x.id === poForm.editingId) || {
                                  ...poForm,
                                  id: poForm.editingId,
                                  no_pesanan: poForm.poNo,
                                  supplier: suppliers.find((s) => s.id === poForm.supplierId),
                                  pesanan_pembelian_detail: poForm.items.map((i) => ({ ...i, produk: i, subtotal: i.total })),
                                };
                                if (p) setPdfModalDoc({ type: 'PO', data: p });
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-800 flex items-center space-x-2 font-semibold border-t border-slate-100"
                            >
                              <Printer className="w-4 h-4 text-slate-600" />
                              <span>Cetak Dokumen PDF</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* TOMBOL HAPUS PO (JIKA SEDANG EDITING) */}
                  {poForm.editingId && (
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteConfirmDoc({
                          type: 'PO',
                          id: poForm.editingId,
                          noDoc: poForm.poNo,
                        })
                      }
                      className="px-3.5 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold active:scale-[0.97] hover:-translate-y-0.5 hover:shadow-sm flex items-center space-x-1 transition-all duration-200 ease-out cursor-pointer"
                      title="Hapus pesanan ini secara permanen dari Supabase"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Hapus PO</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSavePO}
                    disabled={loading}
                    className="px-4 py-2 bg-[#0A3828] hover:bg-[#07291D] text-white rounded-xl text-xs font-bold shadow-xs shadow-emerald-950/20 active:scale-[0.97] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-950/20 flex items-center space-x-1.5 transition-all duration-200 ease-out cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{poForm.editingId ? 'SIMPAN PERUBAHAN (PO)' : 'SIMPAN PESANAN (PO)'}</span>
                  </button>
                </>
              ) : (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari no. PO atau supplier..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-200/80 rounded-xl w-56 sm:w-72 focus:outline-none focus:ring-1 focus:ring-emerald-700 bg-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* LIST VIEW PO */}
          {viewModes.po_beli === 'list' && (loading ? <TableSkeleton rows={5} cols={7} /> : (() => {
            const poConfig = tableConfigs.po_beli || DEFAULT_TABLE_CONFIGS.po_beli;
            const cols = poConfig.visibleColumns || DEFAULT_TABLE_CONFIGS.po_beli.visibleColumns;
            const densityClass =
              poConfig.density === 'compact'
                ? 'py-2 px-3 text-xs'
                : poConfig.density === 'spacious'
                ? 'py-4 px-4 text-xs'
                : 'py-2.5 px-3.5 text-xs';

            return (
              <div className="flex-1 flex flex-col min-h-0 space-y-2">
                {/* Advanced Separated Filter Toolbar */}
                <TableFilterToolbar
                  searchQuery={searchQuery}
                  onSearchChange={(val) => setSearchQuery(val)}
                  searchPlaceholder="Cari no. PO, pemasok, catatan..."
                  filters={advancedFilters.po_beli}
                  onFilterChange={(k, v) => handleUpdateAdvancedFilter('po_beli', k, v)}
                  onResetFilters={() => handleResetAdvancedFilters('po_beli')}
                  contacts={suppliers}
                  contactType="supplier"
                  config={poConfig}
                  onOpenConfig={() => setActiveConfigModal('po_beli')}
                  totalCount={filteredPOs.length}
                  totalAmount={filteredPOs.reduce((acc, p) => acc + Number(p.total || 0), 0)}
                  moduleType="po_beli"
                />

                {/* Table View (Clean, No Clutter, Direct Row Click) */}
                <div className="apple-card flex-1 flex flex-col overflow-hidden rounded-2xl shadow-xs">
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-50/90 backdrop-blur-sm text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          {cols.no !== false && <th className="py-3 px-3 w-10 text-center border-r border-slate-200/60">No.</th>}
                          {cols.noPesanan !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">No. Pesanan</th>}
                          {cols.tanggal !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Tanggal</th>}
                          {cols.supplier !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Pemasok / Supplier</th>}
                          {cols.catatan !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Keterangan / Catatan</th>}
                          {cols.total !== false && <th className="py-3 px-3.5 text-right border-r border-slate-200/60">Total Nilai (Rp)</th>}
                          {cols.statusBayar !== false && <th className="py-3 px-3.5 text-center border-r border-slate-200/60">Status Pembayaran / DP</th>}
                          {(cols.statusTerima !== false || cols.status !== false) && <th className="py-3 px-3.5 text-center border-r border-slate-200/60">Status Penerimaan</th>}
                          {cols.aksiLanjutan === true && <th className="py-3 px-3.5 text-center">Aksi Cepat</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {purchaseOrders.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-20 text-center text-slate-400 bg-white">
                              <Package className="w-10 h-10 mx-auto mb-2 text-emerald-800/40 stroke-[1.5]" />
                              <p className="font-bold text-sm text-slate-700">Belum ada pesanan pembelian (PO)</p>
                              <p className="text-xs text-slate-400 mt-0.5 mb-3">
                                Buat pesanan pembelian ke pemasok untuk memesan stok kemasan.
                              </p>
                              <button
                                type="button"
                                onClick={handleResetToNewPO}
                                className="apple-btn-primary px-4 py-2 text-xs font-bold flex items-center space-x-1.5 mx-auto"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Buat Pesanan Baru</span>
                              </button>
                            </td>
                          </tr>
                        ) : filteredPOs.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-14 text-center text-slate-400 bg-white">
                              <p className="font-semibold text-slate-600 text-xs">
                                Tidak ada data pesanan pembelian yang sesuai dengan filter yang aktif.
                              </p>
                              <button
                                type="button"
                                onClick={() => handleResetAdvancedFilters('po_beli')}
                                className="apple-btn-secondary mt-2 px-3 py-1.5 text-xs font-bold"
                              >
                                Reset Semua Filter
                              </button>
                            </td>
                          </tr>
                        ) : (
                          filteredPOs.map((po, idx) => (
                            <tr
                              key={po.id}
                              onClick={() => {
                                if (poConfig.rowClickAction === 'print_preview') {
                                  setPdfModalDoc({ type: 'PO', data: po });
                                } else {
                                  handleOpenPO(po);
                                }
                              }}
                              className="hover:bg-emerald-50/50 transition-colors cursor-pointer group active:scale-[0.999]"
                              title="Klik baris untuk membuka rincian pesanan pembelian"
                            >
                              {cols.no !== false && (
                                <td className={`${densityClass} text-center text-slate-400 font-mono border-r border-slate-100/80`}>
                                  {idx + 1}
                                </td>
                              )}
                              {cols.noPesanan !== false && (
                                <td className={`${densityClass} font-mono font-bold text-emerald-950 border-r border-slate-100/80`}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span className="group-hover:underline">{po.no_pesanan}</span>
                                      {po.lampiran_url && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setLightboxImage({ url: po.lampiran_url, title: `Bukti PO Pembelian - ${po.no_pesanan}` });
                                          }}
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 transition-colors shadow-xs"
                                          title="Lihat Bukti Foto / Dokumen"
                                        >
                                          <Camera className="w-3 h-3 text-emerald-700" />
                                          <span>Foto</span>
                                        </button>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteConfirmDoc({ type: 'PO', id: po.id, noDoc: po.no_pesanan });
                                        }}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Hapus PO Pembelian"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                      </button>
                                      <Edit className="w-3 h-3 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                                    </div>
                                  </div>
                                </td>
                              )}
                              {cols.tanggal !== false && (
                                <td className={`${densityClass} text-slate-600 border-r border-slate-100/80 font-mono`}>
                                  {po.tanggal}
                                </td>
                              )}
                              {cols.supplier !== false && (
                                <td className={`${densityClass} font-bold text-slate-900 border-r border-slate-100/80`}>
                                  {po.supplier?.nama || '-'}
                                </td>
                              )}
                              {cols.catatan !== false && (
                                <td className={`${densityClass} text-slate-500 border-r border-slate-100/80 truncate max-w-xs`}>
                                  {po.catatan || '-'}
                                </td>
                              )}
                              {cols.total !== false && (
                                <td className={`${densityClass} text-right font-mono font-bold text-slate-900 border-r border-slate-100/80`}>
                                  Rp {Number(po.total || 0).toLocaleString('id-ID')}
                                </td>
                              )}
                              {cols.statusBayar !== false && (() => {
                                const linkedFB = purchases.find((p) => p.pesanan_pembelian_id === po.id);
                                const isLunas = po.status_bayar === 'LUNAS' || (linkedFB && (linkedFB.status_bayar === 'LUNAS' || Number(linkedFB.bayar || 0) >= Number(linkedFB.total_akhir || linkedFB.total || 0))) || po.status === 'SELESAI';
                                return (
                                  <td className={`${densityClass} text-center border-r border-slate-100/80`}>
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                        isLunas
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                          : 'bg-slate-100 text-slate-600 border-slate-200'
                                      }`}
                                    >
                                      {isLunas ? 'LUNAS' : 'BELUM BAYAR'}
                                    </span>
                                  </td>
                                );
                              })()}
                              {(cols.statusTerima !== false || cols.status !== false) && (
                                <td className={`${densityClass} text-center border-r border-slate-100/80`}>
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      po.status === 'SELESAI'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                        : 'bg-amber-50 text-amber-800 border-amber-300'
                                    }`}
                                  >
                                    {po.status === 'SELESAI' ? 'SELESAI' : 'MENUNGGU PENERIMAAN'}
                                  </span>
                                </td>
                              )}
                              {cols.aksiLanjutan === true && (
                                <td className={`${densityClass} text-center space-x-1 whitespace-nowrap`}>
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await handleTakePOIntoRI(po);
                                      handleSubTabSwitch('ri_beli');
                                      switchViewMode('ri_beli', 'form');
                                    }}
                                    className="apple-btn-secondary px-2 py-1 text-[10px] font-bold text-emerald-900"
                                    title="Catat penerimaan barang masuk"
                                  >
                                    + RI
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await handleFlowPOtoPP(po);
                                    }}
                                    className="apple-btn-secondary px-2 py-1 text-[10px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200"
                                    title="Bayar langsung pesanan ini via Kas/Bank"
                                  >
                                    + Bayar
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Apple Status Footer */}
                  <div className="h-9 bg-slate-50/90 border-t border-slate-200/80 px-4 flex items-center justify-between text-[11px] text-slate-500 font-medium select-none">
                    <div className="flex items-center space-x-2">
                      <span>Ditampilkan: <strong className="text-slate-800">{filteredPOs.length}</strong> dari <strong className="text-slate-800">{purchaseOrders.length}</strong> pesanan</span>
                      <span>•</span>
                      <span>Menunggu Terima: <strong className="text-amber-700">{purchaseOrders.filter((p) => p.status !== 'SELESAI').length}</strong></span>
                      <span>•</span>
                      <span>Selesai: <strong className="text-emerald-700">{purchaseOrders.filter((p) => p.status === 'SELESAI').length}</strong></span>
                    </div>
                    <div className="font-mono text-emerald-950 font-bold text-xs">
                      Total Akumulasi: Rp {filteredPOs.reduce((acc, p) => acc + Number(p.total || 0), 0).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              </div>
            );
          })())}

          {/* FORM VIEW PO */}
          {viewModes.po_beli === 'form' && (
            <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-4 space-y-3 overflow-y-auto shadow-2xs text-xs">
              {/* HEADER FORM */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Pemasok / Supplier Kemasan <span className="text-rose-500">*</span>
                  </label>
                  <GoogleLiveSupplierSearch
                    suppliers={suppliers}
                    selectedSupplierId={poForm.supplierId}
                    onSelectSupplier={(id) => setPoForm((p) => ({ ...p, supplierId: id }))}
                    onOpenNewSupplierModal={handleOpenNewSupplier}
                    placeholder="Cari pemasok kemasan... (Nama pabrik, No. WA, Alamat)"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. Pesanan (Auto-Sequence)</label>
                  <input
                    type="text"
                    value={poForm.poNo}
                    readOnly={!poForm.editingId}
                    onChange={(e) => setPoForm((p) => ({ ...p, poNo: e.target.value }))}
                    className={`w-full px-2.5 py-2 border border-slate-200/80 rounded-xl font-mono font-bold text-emerald-950 ${
                      !poForm.editingId ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Pesanan</label>
                  <input
                    type="date"
                    value={poForm.date}
                    onChange={async (e) => {
                      const val = e.target.value;
                      let nextNo = poForm.poNo;
                      if (!poForm.editingId) {
                        nextNo = (await peekNextDocNumber('PO', val)) || nextNo;
                      }
                      setPoForm((p) => ({ ...p, date: val, poNo: nextNo }));
                    }}
                    className="w-full px-2.5 py-2 border border-slate-200/80 rounded-xl bg-white focus:ring-1 focus:ring-emerald-700 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Syarat Bayar / Termin</label>
                  <select
                    value={poForm.termin}
                    onChange={(e) => handleTerminChange(e.target.value, 'PO')}
                    className="w-full px-2.5 py-2 border border-slate-200/80 rounded-xl bg-white focus:ring-1 focus:ring-emerald-700 font-medium"
                  >
                    {syaratBayarList.map((term) => (
                      <option key={term.id || term.nama} value={term.nama}>
                        {term.nama} {term.deskripsi ? `(${term.deskripsi})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* LIVE SEARCH PRODUCT KEMASAN */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="+ Cari & Tambah Produk Kemasan (Ketik nama Kardus, Pouch, Bubble Wrap, atau SKU)..."
                  value={itemSearchQuery}
                  onFocus={() => setIsItemDropdownOpen(true)}
                  onChange={(e) => {
                    setItemSearchQuery(e.target.value);
                    setIsItemDropdownOpen(true);
                  }}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                />

                {isItemDropdownOpen && itemSearchQuery && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200/80 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {filteredProducts.length === 0 ? (
                      <div className="p-3 text-center text-slate-400">Tidak ada produk kemasan ditemukan.</div>
                    ) : (
                      filteredProducts.map((prod) => (
                        <div
                          key={prod.id}
                          onClick={() => handleAddItemToCurrentForm(prod)}
                          className="p-2.5 hover:bg-emerald-50 cursor-pointer flex justify-between items-center transition"
                        >
                          <div>
                            <span className="font-mono font-bold text-emerald-900 text-xs mr-2">{prod.kode_sku}</span>
                            <span className="font-bold text-slate-800 text-xs">{prod.nama}</span>
                            <span className="text-slate-400 text-[11px] block">
                              Satuan: {prod.satuan || 'Pcs'} | Stok saat ini: <strong>{prod.stok || 0}</strong>
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-emerald-950 text-xs block">
                              Rp {Number(prod.harga_beli || 0).toLocaleString('id-ID')}
                            </span>
                            <span className="text-[10px] text-slate-400">Harga Beli Standar</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* SPREADSHEET TABLE */}
              <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200/80">
                    <tr>
                      <th className="py-2 px-2.5 w-10 text-center border-r border-slate-200">No.</th>
                      <th className="py-2 px-2.5 w-28 border-r border-slate-200">Kode SKU</th>
                      <th className="py-2 px-2.5 border-r border-slate-200">Deskripsi Barang Kemasan</th>
                      <th className="py-2 px-2.5 w-24 text-center border-r border-slate-200">Kuantitas</th>
                      <th className="py-2 px-2.5 w-20 text-center border-r border-slate-200">Satuan</th>
                      <th className="py-2 px-2.5 w-32 text-right border-r border-slate-200">Harga Satuan (Rp)</th>
                      <th className="py-2 px-2.5 w-24 text-right border-r border-slate-200">Diskon (Rp)</th>
                      <th className="py-2 px-2.5 w-36 text-right border-r border-slate-200">Total (Rp)</th>
                      <th className="py-2 px-2.5 w-10 text-center">Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {poForm.items.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          Belum ada rincian barang dalam pesanan. Gunakan kolom pencarian di atas untuk menambahkan.
                        </td>
                      </tr>
                    ) : (
                      poForm.items.map((item, idx) => (
                        <tr
                          key={item.id}
                          onClick={() => handleOpenItemRowModal(item, idx, 'PO')}
                          className="hover:bg-emerald-50/60 cursor-pointer transition-colors group"
                        >
                          <td className="py-2.5 px-2.5 text-center text-slate-400 font-mono border-r border-slate-100">{idx + 1}</td>
                          <td className="py-2.5 px-2.5 font-mono font-bold text-emerald-900 border-r border-slate-100">{item.kode_sku}</td>
                          <td className="py-2.5 px-2.5 font-semibold text-slate-900 border-r border-slate-100">
                            <div className="flex items-center justify-between">
                              <span>{item.nama}</span>
                              <span className="opacity-0 group-hover:opacity-100 text-[10px] text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded transition">
                                Edit Detail
                              </span>
                            </div>
                            {item.catatan && (
                              <span className="text-[10px] text-slate-400 block italic">Catatan: {item.catatan}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2.5 text-center border-r border-slate-100 font-bold font-mono text-slate-800">
                            <span className="inline-block px-2 py-0.5 bg-slate-100 rounded-md group-hover:bg-emerald-100/70">
                              {formatDisplayDecimal(item.qty || 1)}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-center text-slate-600 border-r border-slate-100">{item.satuan || 'Pcs'}</td>
                          <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-800 border-r border-slate-100">
                            Rp {formatDisplayDecimal(item.harga_beli || 0)}
                          </td>
                          <td className="py-2.5 px-2.5 text-center font-mono text-slate-700 border-r border-slate-100">
                            {Number(item.diskonPersen || 0) > 0 ? (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                {formatDisplayDecimal(item.diskonPersen)}%
                              </span>
                            ) : Number(item.diskonRp || 0) > 0 ? (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                Rp {formatDisplayDecimal(item.diskonRp)}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono font-bold text-emerald-950 border-r border-slate-100">
                            Rp {formatDisplayDecimal(Math.round(item.total !== undefined ? item.total : (Number(item.qty || 1) * Number(item.harga_beli || 0) - Number(item.diskonRp || 0))))}
                          </td>
                          <td className="py-2.5 px-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                setPoForm((p) => ({
                                  ...p,
                                  items: p.items.filter((_, i) => i !== idx),
                                }));
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Hapus baris"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* FOOTER TOTALS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Catatan Pesanan Pembelian:</label>
                    <textarea
                      rows={2}
                      placeholder="Instruksi pengiriman dari pabrik, tanggal kirim, syarat kemasan..."
                      value={poForm.catatan}
                      onChange={(e) => setPoForm((p) => ({ ...p, catatan: e.target.value }))}
                      className="w-full p-2.5 border border-slate-200/80 rounded-xl focus:ring-1 focus:ring-emerald-700 bg-white"
                    />
                  </div>

                  <FileUploadBukti
                    label="Lampiran Dokumen PO / Penawaran Supplier"
                    value={poForm.lampiran_url}
                    onChange={(url) => setPoForm((p) => ({ ...p, lampiran_url: url }))}
                    docType="po-beli"
                    helpText="Upload foto surat pesanan atau berkas penawaran supplier."
                  />
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Subtotal:</span>
                    <strong className="font-mono text-slate-900">
                      Rp {calculatePOTotals().subtotal.toLocaleString('id-ID')}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Potongan Diskon (Rp):</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={poForm.discountAmount ? formatDisplayDecimal(poForm.discountAmount) : ''}
                      placeholder="0"
                      onChange={(e) => {
                        const { num } = formatLiveInput(e.target.value);
                        setPoForm((p) => ({ ...p, discountAmount: num }));
                      }}
                      className="w-32 py-1 px-2 border border-slate-200/80 rounded text-right font-mono bg-white font-bold"
                    />
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={poForm.ppnActive}
                        onChange={(e) => setPoForm((p) => ({ ...p, ppnActive: e.target.checked }))}
                        className="rounded border-slate-200/80 text-emerald-700 focus:ring-emerald-600"
                      />
                      <span className="font-semibold text-xs">Kenakan PPN Masukan (11%)</span>
                    </label>
                    <strong className="font-mono text-slate-900">
                      Rp {calculatePOTotals().ppn.toLocaleString('id-ID')}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-sm font-extrabold text-emerald-950 pt-2 border-t border-slate-200/80">
                    <span>TOTAL PESANAN (PO):</span>
                    <span className="font-mono text-base text-emerald-900">
                      Rp {calculatePOTotals().grandTotal.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. SUB-MODUL: PENERIMAAN BARANG (RI_BELI)                 */}
      {/* ======================================================== */}
      {activeTab === 'ri_beli' && (
        <div className="w-full flex-1 flex flex-col space-y-2">
          {/* TOOLBAR */}
          <div className="relative z-40 flex items-center justify-between px-3.5 py-2 bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className="flex items-center space-x-2.5">
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => switchViewMode('ri_beli', 'list')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out active:scale-[0.97] flex items-center space-x-1.5 cursor-pointer ${
                    viewModes.ri_beli === 'list'
                      ? 'bg-[#0A3828] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  title="Lihat Daftar Penerimaan Barang Masuk"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Daftar Penerimaan (RI)</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetToNewRI}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out active:scale-[0.97] flex items-center space-x-1.5 cursor-pointer ${
                    viewModes.ri_beli === 'form'
                      ? 'bg-[#0A3828] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  title="Buka Formulir Penerimaan Barang Baru"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Input Penerimaan Baru</span>
                </button>
              </div>

              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-300 text-[10px] font-mono font-bold rounded">
                RECEIVE ITEM (RI)
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {viewModes.ri_beli === 'form' ? (
                <>
                  <button
                    type="button"
                    onClick={handleResetToNewRI}
                    className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 active:scale-[0.97] hover:-translate-y-0.5 hover:shadow-sm flex items-center space-x-1 transition-all duration-200 ease-out cursor-pointer"
                    title="Formulir penerimaan baru"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Form Baru</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTakeModalType('PO_TO_RI')}
                    className="px-3 py-1.5 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow-2xs"
                    title="Salin rincian barang dari Pesanan Pembelian"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Ambil (PO) ▾</span>
                  </button>

                  {/* PROSES ALUR TRANSAKSI (JIKA EDITING RI) */}
                  {riForm.editingId && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setRiFlowDropdownOpen(!riFlowDropdownOpen)}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 transition active:scale-[0.97] cursor-pointer"
                        title="Lanjutkan proses alur transaksi penerimaan barang"
                      >
                        <Workflow className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Proses Alur ▾</span>
                      </button>

                      {riFlowDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40 cursor-default" onClick={() => setRiFlowDropdownOpen(false)} />
                          <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-xs text-left animate-in fade-in duration-100">
                            <button
                              type="button"
                              onClick={async () => {
                                setRiFlowDropdownOpen(false);
                                const currentRI = {
                                  ...riForm,
                                  id: riForm.editingId,
                                  no_terima: riForm.riNo,
                                  supplier_id: riForm.supplierId,
                                  no_surat_jalan_supplier: riForm.supplierSJNo,
                                  pesanan_pembelian_id: riForm.poId,
                                  items: riForm.items,
                                };
                                await handleTakeRIIntoFB(currentRI);
                                handleSubTabSwitch('pi_beli');
                                switchViewMode('pi_beli', 'form');
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-blue-50 text-slate-800 flex items-center space-x-2 font-semibold"
                            >
                              <FileCheck className="w-4 h-4 text-blue-600" />
                              <div>
                                <div className="font-bold text-blue-950">+ Terbitkan Faktur (FB)</div>
                                <div className="text-[10px] text-slate-500">Tagihkan barang yang sudah diterima</div>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRiFlowDropdownOpen(false);
                                const r = goodsReceipts.find((x) => x.id === riForm.editingId) || {
                                  ...riForm,
                                  id: riForm.editingId,
                                  no_terima: riForm.riNo,
                                  supplier: suppliers.find((s) => s.id === riForm.supplierId),
                                  penerimaan_barang_detail: riForm.items.map((i) => ({ ...i, produk: i })),
                                };
                                if (r) setPdfModalDoc({ type: 'RI', data: r });
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-800 flex items-center space-x-2 font-semibold border-t border-slate-100"
                            >
                              <Printer className="w-4 h-4 text-slate-600" />
                              <span>Cetak Bukti Penerimaan PDF</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* TOMBOL HAPUS RI (JIKA SEDANG EDITING) */}
                  {riForm.editingId && (
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteConfirmDoc({
                          type: 'RI',
                          id: riForm.editingId,
                          noDoc: riForm.riNo,
                        })
                      }
                      className="px-3.5 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold active:scale-[0.97] hover:-translate-y-0.5 hover:shadow-sm flex items-center space-x-1 transition-all duration-200 ease-out cursor-pointer"
                      title="Hapus penerimaan ini & sesuaikan stok gudang"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Hapus RI</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveRI}
                    disabled={loading}
                    className="px-4 py-2 bg-[#0A3828] hover:bg-[#07291D] text-white rounded-xl text-xs font-bold shadow-xs shadow-emerald-950/20 active:scale-[0.97] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-950/20 flex items-center space-x-1.5 transition-all duration-200 ease-out cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{riForm.editingId ? 'SIMPAN PERUBAHAN (RI)' : 'SIMPAN PENERIMAAN (RI)'}</span>
                  </button>
                </>
              ) : (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari no. RI, surat jalan, pemasok..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-200/80 rounded-xl w-56 sm:w-72 focus:outline-none focus:ring-1 focus:ring-emerald-700 bg-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* LIST VIEW RI */}
          {viewModes.ri_beli === 'list' && (loading ? <TableSkeleton rows={5} cols={7} /> : (() => {
            const riConfig = tableConfigs.ri_beli || DEFAULT_TABLE_CONFIGS.ri_beli;
            const cols = riConfig.visibleColumns || DEFAULT_TABLE_CONFIGS.ri_beli.visibleColumns;
            const densityClass =
              riConfig.density === 'compact'
                ? 'py-2 px-3 text-xs'
                : riConfig.density === 'spacious'
                ? 'py-4 px-4 text-xs'
                : 'py-2.5 px-3.5 text-xs';

            return (
              <div className="flex-1 flex flex-col min-h-0 space-y-2">
                {/* Advanced Separated Filter Toolbar */}
                <TableFilterToolbar
                  searchQuery={searchQuery}
                  onSearchChange={(val) => setSearchQuery(val)}
                  searchPlaceholder="Cari no. RI, surat jalan, pemasok..."
                  filters={advancedFilters.ri_beli}
                  onFilterChange={(k, v) => handleUpdateAdvancedFilter('ri_beli', k, v)}
                  onResetFilters={() => handleResetAdvancedFilters('ri_beli')}
                  contacts={suppliers}
                  contactType="supplier"
                  config={riConfig}
                  onOpenConfig={() => setActiveConfigModal('ri_beli')}
                  totalCount={filteredRIs.length}
                  moduleType="ri_beli"
                />

                {/* Table View (Clean, No Clutter, Direct Row Click) */}
                <div className="apple-card flex-1 flex flex-col overflow-hidden rounded-2xl shadow-xs">
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-50/90 backdrop-blur-sm text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          {cols.no !== false && <th className="py-3 px-3 w-10 text-center border-r border-slate-200/60">No.</th>}
                          {cols.noPenerimaan !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">No. Penerimaan (RI)</th>}
                          {cols.tanggal !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Tanggal</th>}
                          {cols.supplier !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Pemasok / Supplier</th>}
                          {cols.noSJSupplier !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">No. SJ Pemasok</th>}
                          {cols.refPO !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Ref PO</th>}
                          {cols.catatan !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Keterangan</th>}
                          {cols.aksiLanjutan === true && <th className="py-3 px-3.5 text-center">Aksi Cepat</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {goodsReceipts.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-20 text-center text-slate-400 bg-white">
                              <Truck className="w-10 h-10 mx-auto mb-2 text-emerald-800/40 stroke-[1.5]" />
                              <p className="font-bold text-sm text-slate-700">Belum ada penerimaan barang (RI)</p>
                              <p className="text-xs text-slate-400 mt-0.5 mb-3">
                                Catat fisik barang yang tiba di gudang untuk mengupdate stok persediaan.
                              </p>
                              <button
                                type="button"
                                onClick={handleResetToNewRI}
                                className="apple-btn-primary px-4 py-2 text-xs font-bold flex items-center space-x-1.5 mx-auto"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Input Penerimaan Baru</span>
                              </button>
                            </td>
                          </tr>
                        ) : filteredRIs.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-14 text-center text-slate-400 bg-white">
                              <p className="font-semibold text-slate-600 text-xs">
                                Tidak ada data penerimaan barang yang sesuai dengan filter yang aktif.
                              </p>
                              <button
                                type="button"
                                onClick={() => handleResetAdvancedFilters('ri_beli')}
                                className="apple-btn-secondary mt-2 px-3 py-1.5 text-xs font-bold"
                              >
                                Reset Semua Filter
                              </button>
                            </td>
                          </tr>
                        ) : (
                          filteredRIs.map((ri, idx) => (
                            <tr
                              key={ri.id}
                              onClick={() => {
                                if (riConfig.rowClickAction === 'print_preview') {
                                  setPdfModalDoc({ type: 'RI', data: ri });
                                } else {
                                  handleOpenRI(ri);
                                }
                              }}
                              className="hover:bg-emerald-50/50 transition-colors cursor-pointer group active:scale-[0.999]"
                              title="Klik baris untuk membuka rincian penerimaan barang"
                            >
                              {cols.no !== false && (
                                <td className={`${densityClass} text-center text-slate-400 font-mono border-r border-slate-100/80`}>
                                  {idx + 1}
                                </td>
                              )}
                              {cols.noPenerimaan !== false && (
                                <td className={`${densityClass} font-mono font-bold text-emerald-950 border-r border-slate-100/80`}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span className="group-hover:underline">{ri.no_terima}</span>
                                      {ri.lampiran_url && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setLightboxImage({ url: ri.lampiran_url, title: `Bukti Penerimaan Barang - ${ri.no_terima}` });
                                          }}
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 transition-colors shadow-xs"
                                          title="Lihat Foto Fisik Barang / Surat Jalan Supplier"
                                        >
                                          <Camera className="w-3 h-3 text-emerald-700" />
                                          <span>Foto</span>
                                        </button>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteConfirmDoc({ type: 'RI', id: ri.id, noDoc: ri.no_terima });
                                        }}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Hapus Penerimaan Barang"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                      </button>
                                      <Edit className="w-3 h-3 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                                    </div>
                                  </div>
                                </td>
                              )}
                              {cols.tanggal !== false && (
                                <td className={`${densityClass} text-slate-600 border-r border-slate-100/80 font-mono`}>
                                  {ri.tanggal}
                                </td>
                              )}
                              {cols.supplier !== false && (
                                <td className={`${densityClass} font-bold text-slate-900 border-r border-slate-100/80`}>
                                  {ri.supplier?.nama || '-'}
                                </td>
                              )}
                              {cols.noSJSupplier !== false && (
                                <td className={`${densityClass} font-mono text-slate-700 border-r border-slate-100/80`}>
                                  {ri.no_surat_jalan_supplier || '-'}
                                </td>
                              )}
                              {cols.refPO !== false && (
                                <td className={`${densityClass} font-mono text-emerald-800 border-r border-slate-100/80`}>
                                  {ri.pesanan_pembelian?.no_pesanan || '-'}
                                </td>
                              )}
                              {cols.catatan !== false && (
                                <td className={`${densityClass} text-slate-500 border-r border-slate-100/80 truncate max-w-xs`}>
                                  {ri.keterangan || '-'}
                                </td>
                              )}
                              {cols.aksiLanjutan === true && (
                                <td className={`${densityClass} text-center space-x-1 whitespace-nowrap`}>
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await handleTakeRIIntoFB(ri);
                                      handleSubTabSwitch('pi_beli');
                                      switchViewMode('pi_beli', 'form');
                                    }}
                                    className="apple-btn-secondary px-2 py-1 text-[10px] font-bold text-emerald-900"
                                  >
                                    + FB
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Apple Status Footer */}
                  <div className="h-9 bg-slate-50/90 border-t border-slate-200/80 px-4 flex items-center justify-between text-[11px] text-slate-500 font-medium select-none">
                    <div className="flex items-center space-x-2">
                      <span>Ditampilkan: <strong className="text-slate-800">{filteredRIs.length}</strong> dari <strong className="text-slate-800">{goodsReceipts.length}</strong> penerimaan</span>
                    </div>
                    <div className="text-emerald-800 font-bold text-xs flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Stok Gudang Otomatis Sinkron</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })())}

          {/* FORM VIEW RI */}
          {viewModes.ri_beli === 'form' && (
            <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-4 space-y-3 overflow-y-auto shadow-2xs text-xs">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Pemasok / Supplier Kemasan <span className="text-rose-500">*</span>
                  </label>
                  <GoogleLiveSupplierSearch
                    suppliers={suppliers}
                    selectedSupplierId={riForm.supplierId}
                    onSelectSupplier={(id) => setRiForm((p) => ({ ...p, supplierId: id }))}
                    onOpenNewSupplierModal={handleOpenNewSupplier}
                    placeholder="Cari pemasok kemasan... (Nama pabrik, No. WA, Alamat)"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. Penerimaan (Auto-Sequence)</label>
                  <input
                    type="text"
                    value={riForm.riNo}
                    readOnly={!riForm.editingId}
                    onChange={(e) => setRiForm((p) => ({ ...p, riNo: e.target.value }))}
                    className={`w-full px-2.5 py-2 border border-slate-200/80 rounded-xl font-mono font-bold text-emerald-950 ${
                      !riForm.editingId ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Terima Fisik</label>
                  <input
                    type="date"
                    value={riForm.date}
                    onChange={async (e) => {
                      const val = e.target.value;
                      let nextNo = riForm.riNo;
                      if (!riForm.editingId) {
                        nextNo = (await peekNextDocNumber('RI', val)) || nextNo;
                      }
                      setRiForm((p) => ({ ...p, date: val, riNo: nextNo }));
                    }}
                    className="w-full px-2.5 py-2 border border-slate-200/80 rounded-xl bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. Surat Jalan Pemasok</label>
                  <input
                    type="text"
                    placeholder="Contoh: SJ-2026/XI/889"
                    value={riForm.supplierSJNo}
                    onChange={(e) => setRiForm((p) => ({ ...p, supplierSJNo: e.target.value }))}
                    className="w-full px-2.5 py-2 border border-slate-200/80 rounded-xl bg-white font-mono"
                  />
                </div>
              </div>

              {/* SEARCH ITEM */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="+ Cari & Tambah Produk Kemasan yang Diterima..."
                  value={itemSearchQuery}
                  onFocus={() => setIsItemDropdownOpen(true)}
                  onChange={(e) => {
                    setItemSearchQuery(e.target.value);
                    setIsItemDropdownOpen(true);
                  }}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                />

                {isItemDropdownOpen && itemSearchQuery && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200/80 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {filteredProducts.map((prod) => (
                      <div
                        key={prod.id}
                        onClick={() => handleAddItemToCurrentForm(prod)}
                        className="p-2.5 hover:bg-emerald-50 cursor-pointer flex justify-between items-center transition"
                      >
                        <div>
                          <span className="font-mono font-bold text-emerald-900 text-xs mr-2">{prod.kode_sku}</span>
                          <span className="font-bold text-slate-800 text-xs">{prod.nama}</span>
                          <span className="text-slate-400 text-[11px] block">
                            Satuan: {prod.satuan || 'Pcs'} | Stok Gudang saat ini: <strong>{prod.stok || 0}</strong>
                          </span>
                        </div>
                        <span className="text-xs font-bold text-emerald-700">+ Tambah</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SPREADSHEET TABLE RI */}
              <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200/80">
                    <tr>
                      <th className="py-2 px-2.5 w-10 text-center border-r border-slate-200">No.</th>
                      <th className="py-2 px-2.5 w-32 border-r border-slate-200">Kode SKU</th>
                      <th className="py-2 px-2.5 border-r border-slate-200">Deskripsi Barang Kemasan</th>
                      <th className="py-2 px-2.5 w-28 text-center border-r border-slate-200">Qty Diterima</th>
                      <th className="py-2 px-2.5 w-24 text-center border-r border-slate-200">Satuan</th>
                      <th className="py-2 px-2.5 border-r border-slate-200">Catatan Kondisi Fisik</th>
                      <th className="py-2 px-2.5 w-12 text-center">Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {riForm.items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          Belum ada item barang yang diterima. Klik &quot;Ambil (PO)&quot; atau cari manual di atas.
                        </td>
                      </tr>
                    ) : (
                      riForm.items.map((item, idx) => (
                        <tr
                          key={item.id}
                          onClick={() => handleOpenItemRowModal(item, idx, 'RI')}
                          className="hover:bg-emerald-50/60 cursor-pointer transition-colors group"
                        >
                          <td className="py-2.5 px-2.5 text-center text-slate-400 font-mono border-r border-slate-100">{idx + 1}</td>
                          <td className="py-2.5 px-2.5 font-mono font-bold text-emerald-900 border-r border-slate-100">{item.kode_sku}</td>
                          <td className="py-2.5 px-2.5 font-semibold text-slate-900 border-r border-slate-100">
                            <div className="flex items-center justify-between">
                              <span>{item.nama}</span>
                              <span className="opacity-0 group-hover:opacity-100 text-[10px] text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded transition">
                                Edit Detail
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2.5 text-center border-r border-slate-100 font-bold font-mono text-slate-800">
                            <span className="inline-block px-2 py-0.5 bg-slate-100 rounded-md group-hover:bg-emerald-100/70">
                              {Number(item.qty || 1).toLocaleString('id-ID')}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-center text-slate-600 border-r border-slate-100">{item.satuan || 'Pcs'}</td>
                          <td className="py-2.5 px-2.5 border-r border-slate-100 text-slate-600">
                            {item.catatan ? (
                              <span className="italic">{item.catatan}</span>
                            ) : (
                              <span className="text-slate-400 italic">Kondisi Baik</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                setRiForm((p) => ({
                                  ...p,
                                  items: p.items.filter((_, i) => i !== idx),
                                }));
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Hapus baris"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Keterangan Penerimaan Gudang:</label>
                  <textarea
                    rows={2}
                    placeholder="Catatan pemeriksa gudang, driver, nomor plat kendaraan..."
                    value={riForm.keterangan}
                    onChange={(e) => setRiForm((p) => ({ ...p, keterangan: e.target.value }))}
                    className="w-full p-2.5 border border-slate-200/80 rounded-xl bg-white text-xs"
                  />
                </div>
                <div>
                  <FileUploadBukti
                    label="Foto Surat Jalan Supplier / Fisik Barang Masuk"
                    value={riForm.lampiran_url}
                    onChange={(url) => setRiForm((p) => ({ ...p, lampiran_url: url }))}
                    docType="ri-beli"
                    helpText="Upload foto fisik surat jalan supplier atau kondisi barang saat dibongkar."
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. SUB-MODUL: FAKTUR PEMBELIAN (PI_BELI / FB)             */}
      {/* ======================================================== */}
      {activeTab === 'pi_beli' && (
        <div className="w-full flex-1 flex flex-col space-y-2">
          {/* TOOLBAR */}
          <div className="relative z-40 flex items-center justify-between px-3.5 py-2 bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className="flex items-center space-x-2.5">
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => switchViewMode('pi_beli', 'list')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out active:scale-[0.97] flex items-center space-x-1.5 cursor-pointer ${
                    viewModes.pi_beli === 'list'
                      ? 'bg-[#0A3828] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  title="Lihat Daftar Faktur Pembelian"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Daftar Faktur Pembelian</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetToNewFB}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out active:scale-[0.97] flex items-center space-x-1.5 cursor-pointer ${
                    viewModes.pi_beli === 'form'
                      ? 'bg-[#0A3828] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  title="Buka Formulir Faktur Beli Baru"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Input Faktur Beli Baru</span>
                </button>
              </div>

              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-300 text-[10px] font-mono font-bold rounded">
                FAKTUR PEMBELIAN (FB)
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {viewModes.pi_beli === 'form' ? (
                <>
                  <button
                    type="button"
                    onClick={handleResetToNewFB}
                    className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 active:scale-[0.97] hover:-translate-y-0.5 hover:shadow-sm flex items-center space-x-1 transition-all duration-200 ease-out cursor-pointer"
                    title="Formulir faktur baru"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Form Baru</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTakeModalType('RI_TO_FB')}
                    className="px-3 py-1.5 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow-2xs"
                    title="Salin rincian barang dari Penerimaan atau PO"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Ambil (RI / PO) ▾</span>
                  </button>

                  {/* PROSES ALUR TRANSAKSI (JIKA EDITING FB) */}
                  {piForm.editingId && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setFbFlowDropdownOpen(!fbFlowDropdownOpen)}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 transition active:scale-[0.97] cursor-pointer"
                        title="Lanjutkan proses alur transaksi faktur pembelian"
                      >
                        <Workflow className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Proses Alur ▾</span>
                      </button>

                      {fbFlowDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40 cursor-default" onClick={() => setFbFlowDropdownOpen(false)} />
                          <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-xs text-left animate-in fade-in duration-100">
                            <button
                              type="button"
                              onClick={async () => {
                                setFbFlowDropdownOpen(false);
                                const currentFB = {
                                  ...piForm,
                                  id: piForm.editingId,
                                  no_faktur: piForm.invoiceNo,
                                  supplier_id: piForm.supplierId,
                                  total_akhir: calculateFBTotals().grandTotal,
                                  bayar: piForm.bayar || 0,
                                  items: piForm.items,
                                };
                                await handleFlowFBtoPP(currentFB);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-amber-50 text-slate-800 flex items-center space-x-2 font-semibold"
                            >
                              <Coins className="w-4 h-4 text-amber-600" />
                              <div>
                                <div className="font-bold text-amber-950">+ Bayar / Lunasi Hutang (PP)</div>
                                <div className="text-[10px] text-slate-500">Keluarkan kas/bank untuk bayar</div>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFbFlowDropdownOpen(false);
                                const inv = purchases.find((x) => x.id === piForm.editingId) || {
                                  ...piForm,
                                  id: piForm.editingId,
                                  no_faktur: piForm.invoiceNo,
                                  supplier: suppliers.find((s) => s.id === piForm.supplierId),
                                  faktur_pembelian_detail: piForm.items.map((i) => ({ ...i, produk: i, subtotal: i.total })),
                                };
                                if (inv) setPdfModalDoc({ type: 'FB', data: inv });
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-800 flex items-center space-x-2 font-semibold border-t border-slate-100"
                            >
                              <Printer className="w-4 h-4 text-slate-600" />
                              <span>Cetak Faktur Pembelian PDF</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* TOMBOL HAPUS FAKTUR (JIKA SEDANG EDITING) */}
                  {piForm.editingId && (
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteConfirmDoc({
                          type: 'FB',
                          id: piForm.editingId,
                          noDoc: piForm.invoiceNo,
                        })
                      }
                      className="px-3.5 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold active:scale-[0.97] hover:-translate-y-0.5 hover:shadow-sm flex items-center space-x-1 transition-all duration-200 ease-out cursor-pointer"
                      title="Hapus faktur pembelian ini secara permanen dari Supabase"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Hapus Faktur</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSavePurchaseInvoice}
                    disabled={loading}
                    className="px-4 py-2 bg-[#0A3828] hover:bg-[#07291D] text-white rounded-xl text-xs font-bold shadow-xs shadow-emerald-950/20 active:scale-[0.97] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-950/20 flex items-center space-x-1.5 transition-all duration-200 ease-out cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{piForm.editingId ? 'SIMPAN PERUBAHAN (FB)' : 'SIMPAN FAKTUR (FB)'}</span>
                  </button>
                </>
              ) : (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari no. faktur, supplier..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-200/80 rounded-xl w-56 sm:w-72 focus:outline-none focus:ring-1 focus:ring-emerald-700 bg-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* LIST VIEW FB */}
          {viewModes.pi_beli === 'list' && (loading ? <TableSkeleton rows={5} cols={8} /> : (() => {
            const piConfig = tableConfigs.pi_beli || DEFAULT_TABLE_CONFIGS.pi_beli;
            const cols = piConfig.visibleColumns || DEFAULT_TABLE_CONFIGS.pi_beli.visibleColumns;
            const densityClass =
              piConfig.density === 'compact'
                ? 'py-2 px-3 text-xs'
                : piConfig.density === 'spacious'
                ? 'py-4 px-4 text-xs'
                : 'py-2.5 px-3.5 text-xs';

            return (
              <div className="flex-1 flex flex-col min-h-0 space-y-2">
                {/* Advanced Separated Filter Toolbar */}
                <TableFilterToolbar
                  searchQuery={searchQuery}
                  onSearchChange={(val) => setSearchQuery(val)}
                  searchPlaceholder="Cari no. faktur, pemasok..."
                  filters={advancedFilters.pi_beli}
                  onFilterChange={(k, v) => handleUpdateAdvancedFilter('pi_beli', k, v)}
                  onResetFilters={() => handleResetAdvancedFilters('pi_beli')}
                  contacts={suppliers}
                  contactType="supplier"
                  config={piConfig}
                  onOpenConfig={() => setActiveConfigModal('pi_beli')}
                  totalCount={filteredPurchases.length}
                  totalAmount={filteredPurchases.reduce((acc, p) => acc + Number(p.total_akhir || p.total || 0), 0)}
                  moduleType="pi_beli"
                />

                {/* Table View (Clean, No Clutter, Direct Row Click) */}
                <div className="apple-card flex-1 flex flex-col overflow-hidden rounded-2xl shadow-xs">
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-50/90 backdrop-blur-sm text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          {cols.no !== false && <th className="py-3 px-3 w-10 text-center border-r border-slate-200/60">No.</th>}
                          {cols.noFaktur !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">No. Faktur</th>}
                          {cols.tanggal !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Tanggal</th>}
                          {cols.supplier !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Pemasok / Supplier</th>}
                          {cols.syaratBayar !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Syarat Bayar</th>}
                          {cols.total !== false && <th className="py-3 px-3.5 text-right border-r border-slate-200/60">Total Tagihan (Rp)</th>}
                          {cols.statusBayar !== false && <th className="py-3 px-3.5 text-center border-r border-slate-200/60">Status</th>}
                          {cols.aksiLanjutan === true && <th className="py-3 px-3.5 text-center">Aksi Cepat</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {purchases.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-20 text-center text-slate-400 bg-white">
                              <FileText className="w-10 h-10 mx-auto mb-2 text-emerald-800/40 stroke-[1.5]" />
                              <p className="font-bold text-sm text-slate-700">Belum ada faktur pembelian</p>
                              <p className="text-xs text-slate-400 mt-0.5 mb-3">
                                Catat tagihan dan hutang dari pemasok kemasan Anda.
                              </p>
                              <button
                                type="button"
                                onClick={handleResetToNewFB}
                                className="apple-btn-primary px-4 py-2 text-xs font-bold flex items-center space-x-1.5 mx-auto"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Input Faktur Baru</span>
                              </button>
                            </td>
                          </tr>
                        ) : filteredPurchases.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-14 text-center text-slate-400 bg-white">
                              <p className="font-semibold text-slate-600 text-xs">
                                Tidak ada data faktur pembelian yang sesuai dengan filter yang aktif.
                              </p>
                              <button
                                type="button"
                                onClick={() => handleResetAdvancedFilters('pi_beli')}
                                className="apple-btn-secondary mt-2 px-3 py-1.5 text-xs font-bold"
                              >
                                Reset Semua Filter
                              </button>
                            </td>
                          </tr>
                        ) : (
                          filteredPurchases.map((p, idx) => (
                            <tr
                              key={p.id}
                              onClick={() => {
                                if (piConfig.rowClickAction === 'print_preview') {
                                  setPdfModalDoc({ type: 'FB', data: p });
                                } else {
                                  handleOpenFB(p);
                                }
                              }}
                              className="hover:bg-emerald-50/50 transition-colors cursor-pointer group active:scale-[0.999]"
                              title="Klik baris untuk membuka rincian faktur pembelian"
                            >
                              {cols.no !== false && (
                                <td className={`${densityClass} text-center text-slate-400 font-mono border-r border-slate-100/80`}>
                                  {idx + 1}
                                </td>
                              )}
                              {cols.noFaktur !== false && (
                                <td className={`${densityClass} font-mono font-bold text-emerald-950 border-r border-slate-100/80`}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span className="group-hover:underline">{p.no_faktur}</span>
                                      {p.lampiran_url && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setLightboxImage({ url: p.lampiran_url, title: `Bukti Faktur Pembelian - ${p.no_faktur}` });
                                          }}
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 transition-colors shadow-xs"
                                          title="Lihat Bukti Foto Nota/Faktur Supplier"
                                        >
                                          <Camera className="w-3 h-3 text-emerald-700" />
                                          <span>Foto</span>
                                        </button>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteConfirmDoc({ type: 'FB', id: p.id, noDoc: p.no_faktur });
                                        }}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Hapus Faktur Pembelian"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                      </button>
                                      <Edit className="w-3 h-3 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                                    </div>
                                  </div>
                                </td>
                              )}
                              {cols.tanggal !== false && (
                                <td className={`${densityClass} text-slate-600 border-r border-slate-100/80 font-mono`}>
                                  {p.tanggal}
                                </td>
                              )}
                              {cols.supplier !== false && (
                                <td className={`${densityClass} font-bold text-slate-900 border-r border-slate-100/80`}>
                                  {p.supplier?.nama || '-'}
                                </td>
                              )}
                              {cols.syaratBayar !== false && (
                                <td className={`${densityClass} font-mono text-slate-600 border-r border-slate-100/80`}>
                                  {p.syarat_bayar || 'COD'}
                                </td>
                              )}
                              {cols.total !== false && (
                                <td className={`${densityClass} text-right font-mono font-bold text-slate-900 border-r border-slate-100/80`}>
                                  Rp {Number(p.total_akhir || p.total || 0).toLocaleString('id-ID')}
                                </td>
                              )}
                              {cols.statusBayar !== false && (
                                <td className={`${densityClass} text-center border-r border-slate-100/80`}>
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      p.status_bayar === 'LUNAS'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                        : 'bg-rose-50 text-rose-800 border-rose-300'
                                    }`}
                                  >
                                    {p.status_bayar === 'LUNAS' ? 'Lunas Penuh' : 'Hutang'}
                                  </span>
                                </td>
                              )}
                              {cols.aksiLanjutan === true && (
                                <td className={`${densityClass} text-center space-x-1 whitespace-nowrap`}>
                                      {p.status_bayar === 'HUTANG' && (
                                        <button
                                          type="button"
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            await handleFlowFBtoPP(p);
                                          }}
                                          className="apple-btn-secondary px-2 py-1 text-[10px] font-bold text-emerald-900"
                                        >
                                          + Bayar
                                        </button>
                                      )}
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Apple Status Footer */}
                  <div className="h-9 bg-slate-50/90 border-t border-slate-200/80 px-4 flex items-center justify-between text-[11px] text-slate-500 font-medium select-none">
                    <div className="flex items-center space-x-2">
                      <span>Ditampilkan: <strong className="text-slate-800">{filteredPurchases.length}</strong> dari <strong className="text-slate-800">{purchases.length}</strong> faktur</span>
                      <span>•</span>
                      <span>Hutang: <strong className="text-rose-700">{purchases.filter((p) => p.status_bayar === 'HUTANG').length}</strong></span>
                      <span>•</span>
                      <span>Lunas: <strong className="text-emerald-700">{purchases.filter((p) => p.status_bayar === 'LUNAS').length}</strong></span>
                    </div>
                    <div className="font-mono text-emerald-950 font-bold text-xs">
                      Total Tagihan: Rp {filteredPurchases.reduce((acc, p) => acc + Number(p.total_akhir || p.total || 0), 0).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              </div>
            );
          })())}

          {/* FORM VIEW FB */}
          {viewModes.pi_beli === 'form' && (
            <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-4 space-y-3 overflow-y-auto shadow-2xs text-xs">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Pemasok / Supplier Kemasan <span className="text-rose-500">*</span>
                  </label>
                  <GoogleLiveSupplierSearch
                    suppliers={suppliers}
                    selectedSupplierId={piForm.supplierId}
                    onSelectSupplier={(id) => setPiForm((p) => ({ ...p, supplierId: id }))}
                    onOpenNewSupplierModal={handleOpenNewSupplier}
                    placeholder="Cari pemasok kemasan... (Nama pabrik, No. WA, Alamat)"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. Faktur (Auto-Sequence)</label>
                  <input
                    type="text"
                    value={piForm.invoiceNo}
                    readOnly={!piForm.editingId}
                    onChange={(e) => setPiForm((p) => ({ ...p, invoiceNo: e.target.value }))}
                    className={`w-full px-2.5 py-2 border border-slate-200/80 rounded-xl font-mono font-bold text-emerald-950 ${
                      !piForm.editingId ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Faktur</label>
                  <input
                    type="date"
                    value={piForm.date}
                    onChange={async (e) => {
                      const val = e.target.value;
                      const newDueDate = calculateDueDate(val, piForm.termin, syaratBayarList);
                      let nextNo = piForm.invoiceNo;
                      if (!piForm.editingId) {
                        nextNo = (await peekNextDocNumber('FB', val)) || nextNo;
                      }
                      setPiForm((p) => ({ ...p, date: val, dueDate: newDueDate, invoiceNo: nextNo }));
                    }}
                    className="w-full px-2.5 py-2 border border-slate-200/80 rounded-xl bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Syarat Bayar / Termin</label>
                  <select
                    value={piForm.termin}
                    onChange={(e) => handleTerminChange(e.target.value, 'FB')}
                    className="w-full px-2.5 py-2 border border-slate-200/80 rounded-xl bg-white font-medium"
                  >
                    {syaratBayarList.map((term) => (
                      <option key={term.id || term.nama} value={term.nama}>
                        {term.nama} {term.deskripsi ? `(${term.deskripsi})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. Faktur Supplier</label>
                  <input
                    type="text"
                    placeholder="Contoh: INV-PABRIK-881"
                    value={piForm.supplierNo}
                    onChange={(e) => setPiForm((p) => ({ ...p, supplierNo: e.target.value }))}
                    className="w-full px-2.5 py-2 border border-slate-200/80 rounded-xl bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Jatuh Tempo</label>
                  <input
                    type="date"
                    value={piForm.dueDate}
                    onChange={(e) => setPiForm((p) => ({ ...p, dueDate: e.target.value }))}
                    className="w-full px-2.5 py-2 border border-slate-200/80 rounded-xl bg-white font-mono"
                  />
                </div>
              </div>

              {/* LIVE SEARCH PRODUCT */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="+ Cari & Tambah Produk Kemasan yang Dibeli..."
                  value={itemSearchQuery}
                  onFocus={() => setIsItemDropdownOpen(true)}
                  onChange={(e) => {
                    setItemSearchQuery(e.target.value);
                    setIsItemDropdownOpen(true);
                  }}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                />

                {isItemDropdownOpen && itemSearchQuery && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200/80 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {filteredProducts.map((prod) => (
                      <div
                        key={prod.id}
                        onClick={() => handleAddItemToCurrentForm(prod)}
                        className="p-2.5 hover:bg-emerald-50 cursor-pointer flex justify-between items-center transition"
                      >
                        <div>
                          <span className="font-mono font-bold text-emerald-900 text-xs mr-2">{prod.kode_sku}</span>
                          <span className="font-bold text-slate-800 text-xs">{prod.nama}</span>
                          <span className="text-slate-400 text-[11px] block">
                            Satuan: {prod.satuan || 'Pcs'} | Stok saat ini: <strong>{prod.stok || 0}</strong>
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-emerald-950 text-xs block">
                            Rp {Number(prod.harga_beli || 0).toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SPREADSHEET TABLE FB */}
              <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200/80">
                    <tr>
                      <th className="py-2 px-2.5 w-10 text-center border-r border-slate-200">No.</th>
                      <th className="py-2 px-2.5 w-28 border-r border-slate-200">Kode SKU</th>
                      <th className="py-2 px-2.5 border-r border-slate-200">Deskripsi Barang Kemasan</th>
                      <th className="py-2 px-2.5 w-24 text-center border-r border-slate-200">Kuantitas</th>
                      <th className="py-2 px-2.5 w-20 text-center border-r border-slate-200">Satuan</th>
                      <th className="py-2 px-2.5 w-32 text-right border-r border-slate-200">Harga Beli (Rp)</th>
                      <th className="py-2 px-2.5 w-24 text-right border-r border-slate-200">Diskon (Rp)</th>
                      <th className="py-2 px-2.5 w-36 text-right border-r border-slate-200">Total (Rp)</th>
                      <th className="py-2 px-2.5 w-10 text-center">Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {piForm.items.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          Belum ada item tagihan. Gunakan tombol &quot;Ambil (RI / PO)&quot; atau cari barang di atas.
                        </td>
                      </tr>
                    ) : (
                      piForm.items.map((item, idx) => (
                        <tr
                          key={item.id}
                          onClick={() => handleOpenItemRowModal(item, idx, 'FB')}
                          className="hover:bg-emerald-50/60 cursor-pointer transition-colors group"
                        >
                          <td className="py-2.5 px-2.5 text-center text-slate-400 font-mono border-r border-slate-100">{idx + 1}</td>
                          <td className="py-2.5 px-2.5 font-mono font-bold text-emerald-900 border-r border-slate-100">{item.kode_sku}</td>
                          <td className="py-2.5 px-2.5 font-semibold text-slate-900 border-r border-slate-100">
                            <div className="flex items-center justify-between">
                              <span>{item.nama}</span>
                              <span className="opacity-0 group-hover:opacity-100 text-[10px] text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded transition">
                                Edit Detail
                              </span>
                            </div>
                            {item.catatan && (
                              <span className="text-[10px] text-slate-400 block italic">Catatan: {item.catatan}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2.5 text-center border-r border-slate-100 font-bold font-mono text-slate-800">
                            <span className="inline-block px-2 py-0.5 bg-slate-100 rounded-md group-hover:bg-emerald-100/70">
                              {formatDisplayDecimal(item.qty || 1)}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-center text-slate-600 border-r border-slate-100">{item.satuan || 'Pcs'}</td>
                          <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-800 border-r border-slate-100">
                            Rp {formatDisplayDecimal(item.harga_beli || 0)}
                          </td>
                          <td className="py-2.5 px-2.5 text-center font-mono text-slate-700 border-r border-slate-100">
                            {Number(item.diskonPersen || 0) > 0 ? (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                {formatDisplayDecimal(item.diskonPersen)}%
                              </span>
                            ) : Number(item.diskonRp || 0) > 0 ? (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                Rp {formatDisplayDecimal(item.diskonRp)}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono font-bold text-emerald-950 border-r border-slate-100">
                            Rp {formatDisplayDecimal(Math.round(item.total !== undefined ? item.total : (Number(item.qty || 1) * Number(item.harga_beli || 0) - Number(item.diskonRp || 0))))}
                          </td>
                          <td className="py-2.5 px-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                setPiForm((p) => ({
                                  ...p,
                                  items: p.items.filter((_, i) => i !== idx),
                                }));
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Hapus baris"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* FOOTER TOTALS FB */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Catatan / Keterangan Tagihan:</label>
                    <textarea
                      rows={2}
                      placeholder="Catatan nomor rekening pabrik, instruksi transfer..."
                      value={piForm.catatan}
                      onChange={(e) => setPiForm((p) => ({ ...p, catatan: e.target.value }))}
                      className="w-full p-2.5 border border-slate-200/80 rounded-xl bg-white"
                    />
                  </div>

                  <FileUploadBukti
                    label="Foto Faktur Tagihan / Nota Fisik Supplier"
                    value={piForm.lampiran_url}
                    onChange={(url) => setPiForm((p) => ({ ...p, lampiran_url: url }))}
                    docType="fb-beli"
                    helpText="Upload foto fisik invoice, faktur pajak, atau nota dari supplier."
                  />
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Subtotal Tagihan:</span>
                    <strong className="font-mono text-slate-900">
                      Rp {calculateFBTotals().subtotal.toLocaleString('id-ID')}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Potongan Diskon (Rp):</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={piForm.discountAmount ? formatDisplayDecimal(piForm.discountAmount) : ''}
                      placeholder="0"
                      onChange={(e) => {
                        const { num } = formatLiveInput(e.target.value);
                        setPiForm((p) => ({ ...p, discountAmount: num }));
                      }}
                      className="w-32 py-1 px-2 border border-slate-200/80 rounded text-right font-mono bg-white font-bold"
                    />
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={piForm.ppnActive}
                        onChange={(e) => setPiForm((p) => ({ ...p, ppnActive: e.target.checked }))}
                        className="rounded border-slate-200/80 text-emerald-700 focus:ring-emerald-600"
                      />
                      <span className="font-semibold text-xs">Kenakan PPN Masukan (11%)</span>
                    </label>
                    <strong className="font-mono text-slate-900">
                      Rp {calculateFBTotals().ppn.toLocaleString('id-ID')}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-sm font-extrabold text-emerald-950 pt-2 border-t border-slate-200/80">
                    <span>TOTAL FAKTUR PEMBELIAN:</span>
                    <span className="font-mono text-base text-emerald-900">
                      Rp {calculateFBTotals().grandTotal.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. SUB-MODUL: PEMBAYARAN PEMBELIAN (PP_BELI)             */}
      {/* ======================================================== */}
      {activeTab === 'pp_beli' && (
        <div className="w-full flex-1 flex flex-col space-y-2">
          {/* TOOLBAR */}
          <div className="relative z-40 flex items-center justify-between px-3.5 py-2 bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className="flex items-center space-x-2.5">
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => switchViewMode('pp_beli', 'list')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out active:scale-[0.97] flex items-center space-x-1.5 cursor-pointer ${
                    viewModes.pp_beli === 'list'
                      ? 'bg-[#0A3828] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  title="Lihat Daftar Pembayaran Hutang"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Daftar Pembayaran (PP)</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetToNewPP}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out active:scale-[0.97] flex items-center space-x-1.5 cursor-pointer ${
                    viewModes.pp_beli === 'form'
                      ? 'bg-[#0A3828] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  title="Buka Formulir Pelunasan Hutang Baru"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Input Pembayaran Baru</span>
                </button>
              </div>

              <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-mono font-bold rounded">
                PURCHASE PAYMENT (PP)
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {viewModes.pp_beli === 'form' ? (
                <>
                  {/* PROSES ALUR DROPDOWN */}
                  {paymentForm.editingId && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setPpFlowDropdownOpen(!ppFlowDropdownOpen)}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 transition"
                      >
                        <Workflow className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Proses Alur ▾</span>
                      </button>
                      {ppFlowDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40 cursor-default"
                            onClick={() => setPpFlowDropdownOpen(false)}
                          />
                          <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-xs text-left animate-in fade-in duration-100">
                            <button
                              type="button"
                              onClick={() => {
                                setPpFlowDropdownOpen(false);
                                const pp = payments.find((x) => x.id === paymentForm.editingId);
                                if (pp) setPdfModalDoc({ type: 'PP', data: pp });
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-800 flex items-center space-x-2 font-semibold"
                            >
                              <Printer className="w-4 h-4 text-slate-600" />
                              <span>Cetak Bukti Pengeluaran Kas PDF</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* TOMBOL HAPUS PP */}
                  {paymentForm.editingId && (
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteConfirmDoc({
                          type: 'PP',
                          id: paymentForm.editingId,
                          noDoc: paymentForm.receiptNo,
                        })
                      }
                      className="px-3.5 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                      title="Batalkan pembayaran ini & kembalikan status hutang faktur"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Hapus PP</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleResetToNewPP}
                    className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 active:scale-[0.97] hover:-translate-y-0.5 hover:shadow-sm flex items-center space-x-1 transition-all duration-200 ease-out cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Form Baru</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePayment}
                    disabled={loading}
                    className="px-4 py-2 bg-[#0A3828] hover:bg-[#07291D] text-white rounded-xl text-xs font-bold shadow-xs shadow-emerald-950/20 active:scale-[0.97] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-950/20 flex items-center space-x-1.5 transition-all duration-200 ease-out cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{paymentForm.editingId ? 'SIMPAN PERUBAHAN (PP)' : 'SIMPAN PEMBAYARAN (PP)'}</span>
                  </button>
                </>
              ) : (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari bukti bayar, supplier..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-200/80 rounded-xl w-56 sm:w-72 focus:outline-none focus:ring-1 focus:ring-emerald-700 bg-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* LIST VIEW PP */}
          {viewModes.pp_beli === 'list' && (loading ? <TableSkeleton rows={5} cols={7} /> : (() => {
            const ppConfig = tableConfigs.pp_beli || DEFAULT_TABLE_CONFIGS.pp_beli;
            const cols = ppConfig.visibleColumns || DEFAULT_TABLE_CONFIGS.pp_beli.visibleColumns;
            const densityClass =
              ppConfig.density === 'compact'
                ? 'py-2 px-3 text-xs'
                : ppConfig.density === 'spacious'
                ? 'py-4 px-4 text-xs'
                : 'py-2.5 px-3.5 text-xs';

            return (
              <div className="flex-1 flex flex-col min-h-0 space-y-2">
                {/* Advanced Separated Filter Toolbar */}
                <TableFilterToolbar
                  searchQuery={searchQuery}
                  onSearchChange={(val) => setSearchQuery(val)}
                  searchPlaceholder="Cari no. bukti, pemasok..."
                  filters={advancedFilters.pp_beli}
                  onFilterChange={(k, v) => handleUpdateAdvancedFilter('pp_beli', k, v)}
                  onResetFilters={() => handleResetAdvancedFilters('pp_beli')}
                  contacts={suppliers}
                  contactType="supplier"
                  bankAccounts={accounts}
                  config={ppConfig}
                  onOpenConfig={() => setActiveConfigModal('pp_beli')}
                  totalCount={filteredPayments.length}
                  totalAmount={filteredPayments.reduce((acc, p) => acc + Number(p.total_bayar || 0), 0)}
                  moduleType="pp_beli"
                />

                {/* Table View (Clean, No Clutter, Direct Row Click) */}
                <div className="apple-card flex-1 flex flex-col overflow-hidden rounded-2xl shadow-xs">
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-50/90 backdrop-blur-sm text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          {cols.no !== false && <th className="py-3 px-3 w-10 text-center border-r border-slate-200/60">No.</th>}
                          {cols.noBukti !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">No. Bukti Kas</th>}
                          {cols.tanggal !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Tanggal</th>}
                          {cols.supplier !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Pemasok / Supplier</th>}
                          {cols.bankAkun !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Bank / Kas Pengeluar</th>}
                          {cols.nominal !== false && <th className="py-3 px-3.5 text-right border-r border-slate-200/60">Total Bayar (Rp)</th>}
                          {cols.aksiLanjutan === true && <th className="py-3 px-3.5 text-center">Aksi Cepat</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {purchasePayments.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-20 text-center text-slate-400 bg-white">
                              <Coins className="w-10 h-10 mx-auto mb-2 text-emerald-800/40 stroke-[1.5]" />
                              <p className="font-bold text-sm text-slate-700">Belum ada riwayat pembayaran hutang</p>
                              <p className="text-xs text-slate-400 mt-0.5 mb-3">
                                Catat pengeluaran kas atau transfer bank untuk melunasi faktur pembelian.
                              </p>
                            </td>
                          </tr>
                        ) : filteredPayments.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-14 text-center text-slate-400 bg-white">
                              <p className="font-semibold text-slate-600 text-xs">
                                Tidak ada data pembayaran yang sesuai dengan filter yang aktif.
                              </p>
                              <button
                                type="button"
                                onClick={() => handleResetAdvancedFilters('pp_beli')}
                                className="apple-btn-secondary mt-2 px-3 py-1.5 text-xs font-bold"
                              >
                                Reset Semua Filter
                              </button>
                            </td>
                          </tr>
                        ) : (
                          filteredPayments.map((pp, idx) => (
                            <tr
                              key={pp.id}
                              onClick={() => {
                                if (ppConfig.rowClickAction === 'print_preview') {
                                  setPdfModalDoc({ type: 'PP', data: pp });
                                } else {
                                  handleOpenPP(pp);
                                }
                              }}
                              className="hover:bg-emerald-50/50 transition-colors cursor-pointer group active:scale-[0.999]"
                              title="Klik baris untuk melihat rincian bukti kas keluar"
                            >
                              {cols.no !== false && (
                                <td className={`${densityClass} text-center text-slate-400 font-mono border-r border-slate-100/80`}>
                                  {idx + 1}
                                </td>
                              )}
                              {cols.noBukti !== false && (
                                <td className={`${densityClass} font-mono font-bold text-emerald-950 border-r border-slate-100/80`}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span className="group-hover:underline">{pp.no_bukti}</span>
                                      {pp.lampiran_url && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setLightboxImage({ url: pp.lampiran_url, title: `Bukti Pembayaran / Transfer - ${pp.no_bukti}` });
                                          }}
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 transition-colors shadow-xs"
                                          title="Lihat Bukti Struk / Slip Transfer Bank"
                                        >
                                          <Camera className="w-3 h-3 text-emerald-700" />
                                          <span>Foto</span>
                                        </button>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteConfirmDoc({ type: 'PP', id: pp.id, noDoc: pp.no_bukti });
                                        }}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Hapus Pembayaran Hutang"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                      </button>
                                      <Edit className="w-3 h-3 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                                    </div>
                                  </div>
                                </td>
                              )}
                              {cols.tanggal !== false && (
                                <td className={`${densityClass} text-slate-600 border-r border-slate-100/80 font-mono`}>
                                  {pp.tanggal}
                                </td>
                              )}
                              {cols.supplier !== false && (
                                <td className={`${densityClass} font-bold text-slate-900 border-r border-slate-100/80`}>
                                  {pp.supplier?.nama || '-'}
                                </td>
                              )}
                              {cols.bankAkun !== false && (
                                <td className={`${densityClass} font-semibold text-slate-700 border-r border-slate-100/80`}>
                                  {pp.akun_kas?.nama_akun || 'Bank BCA'}
                                </td>
                              )}
                              {cols.nominal !== false && (
                                <td className={`${densityClass} text-right font-mono font-bold text-emerald-950 border-r border-slate-100/80`}>
                                  Rp {Number(pp.total_bayar || 0).toLocaleString('id-ID')}
                                </td>
                              )}
                              {cols.aksiLanjutan === true && (
                                <td className={`${densityClass} text-center space-x-1 whitespace-nowrap`}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPdfModalDoc({ type: 'PP', data: pp });
                                    }}
                                    className="apple-btn-secondary px-2 py-1 text-[10px] font-bold text-emerald-900"
                                  >
                                    Cetak PDF
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Apple Status Footer */}
                  <div className="h-9 bg-slate-50/90 border-t border-slate-200/80 px-4 flex items-center justify-between text-[11px] text-slate-500 font-medium select-none">
                    <div className="flex items-center space-x-2">
                      <span>Total: <strong className="text-slate-800">{filteredPayments.length}</strong> transaksi pelunasan</span>
                    </div>
                    <div className="font-mono text-emerald-950 font-bold text-xs">
                      Total Kas Keluar: Rp {filteredPayments.reduce((acc, p) => acc + Number(p.total_bayar || 0), 0).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              </div>
            );
          })())}

          {/* FORM VIEW PP */}
          {viewModes.pp_beli === 'form' && (
            <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-4 space-y-4 overflow-y-auto shadow-2xs text-xs">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Pemasok / Supplier Kemasan <span className="text-rose-500">*</span>
                  </label>
                  <GoogleLiveSupplierSearch
                    suppliers={suppliers}
                    selectedSupplierId={paymentForm.supplierId}
                    onSelectSupplier={(id) => setPaymentForm((p) => ({ ...p, supplierId: id, purchaseId: '', poId: null, poNo: '' }))}
                    onOpenNewSupplierModal={handleOpenNewSupplier}
                    placeholder="Cari pemasok kemasan... (Nama pabrik, No. WA, Alamat)"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. Bukti Kas Keluar (Auto-Sequence)</label>
                  <input
                    type="text"
                    value={paymentForm.receiptNo}
                    readOnly={!paymentForm.editingId}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, receiptNo: e.target.value }))}
                    className={`w-full px-2.5 py-2 border border-slate-200/80 rounded-xl font-mono font-bold text-emerald-950 ${
                      !paymentForm.editingId ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Pembayaran</label>
                  <input
                    type="date"
                    value={paymentForm.date}
                    onChange={async (e) => {
                      const val = e.target.value;
                      let nextNo = paymentForm.receiptNo;
                      if (!paymentForm.editingId) {
                        nextNo = (await peekNextDocNumber('PP', val)) || nextNo;
                      }
                      setPaymentForm((p) => ({ ...p, date: val, receiptNo: nextNo }));
                    }}
                    className="w-full px-2.5 py-2 border border-slate-200/80 rounded-xl bg-white font-mono"
                  />
                </div>
              </div>

              {/* DAFTAR TAGIHAN (FAKTUR ATAU PESANAN) YANG AKAN DILUNASI */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800">
                    Pilih Faktur atau Pesanan Pembelian yang Akan Dibayar:
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Mendukung pembayaran dari Faktur (FB) maupun langsung dari Pesanan (PO)
                  </span>
                </div>
                <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200/80">
                      <tr>
                        <th className="py-2 px-2.5 w-12 text-center border-r border-slate-200">Pilih</th>
                        <th className="py-2 px-2.5 border-r border-slate-200 w-24">Tipe</th>
                        <th className="py-2 px-2.5 border-r border-slate-200">No. Dokumen</th>
                        <th className="py-2 px-2.5 border-r border-slate-200 w-28">Tanggal</th>
                        <th className="py-2 px-2.5 border-r border-slate-200 w-28">Jatuh Tempo</th>
                        <th className="py-2 px-2.5 text-right border-r border-slate-200 w-32">Total Tagihan</th>
                        <th className="py-2 px-2.5 text-right border-r border-slate-200 w-32">Sudah Dibayar</th>
                        <th className="py-2 px-2.5 text-right w-36">Sisa Hutang</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(() => {
                        const unpaidInvoices = purchases
                          .filter((p) => (!paymentForm.supplierId ? true : p.supplier_id === paymentForm.supplierId) && p.status_bayar === 'HUTANG')
                          .map((inv) => {
                            const total = Number(inv.total_akhir || inv.total || 0);
                            const paid = Number(inv.bayar || 0);
                            const remaining = Math.max(0, total - paid);
                            const isSelected = paymentForm.purchaseId === inv.id;
                            return {
                              id: `fb-${inv.id}`,
                              type: 'FB',
                              typeLabel: 'Faktur (FB)',
                              badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
                              docNo: inv.no_faktur,
                              date: inv.tanggal,
                              dueDate: inv.tgl_jatuh_tempo || '-',
                              total,
                              paid,
                              remaining,
                              isSelected,
                              onSelect: () =>
                                setPaymentForm((p) => ({
                                  ...p,
                                  supplierId: inv.supplier_id,
                                  purchaseId: inv.id,
                                  poId: null,
                                  poNo: '',
                                  amount: remaining,
                                  catatan: `Pelunasan Faktur ${inv.no_faktur}`,
                                })),
                            };
                          });

                        const openPOs = purchaseOrders
                          .filter((po) => (!paymentForm.supplierId ? true : po.supplier_id === paymentForm.supplierId) && (po.status !== 'SELESAI' || paymentForm.poId === po.id))
                          .map((po) => {
                            const total = Number(po.total || 0);
                            const paid = 0;
                            const remaining = total;
                            const isSelected = paymentForm.poId === po.id;
                            return {
                              id: `po-${po.id}`,
                              type: 'PO',
                              typeLabel: 'Pesanan (PO)',
                              badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
                              docNo: po.no_pesanan,
                              date: po.tanggal,
                              dueDate: po.tgl_jatuh_tempo || '-',
                              total,
                              paid,
                              remaining,
                              isSelected,
                              onSelect: () =>
                                setPaymentForm((p) => ({
                                  ...p,
                                  supplierId: po.supplier_id,
                                  purchaseId: '',
                                  poId: po.id,
                                  poNo: po.no_pesanan,
                                  amount: total,
                                  catatan: `Pembayaran Pesanan ${po.no_pesanan}`,
                                })),
                            };
                          });

                        const allPayableItems = [...unpaidInvoices, ...openPOs];

                        if (allPayableItems.length === 0) {
                          return (
                            <tr>
                              <td colSpan={8} className="py-8 text-center text-slate-400 bg-slate-50/50">
                                <p className="font-semibold text-xs text-slate-600">Tidak ada faktur atau pesanan terbuka untuk dibayar.</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">Pilih supplier lain atau buat Pesanan Pembelian (PO) baru terlebih dahulu.</p>
                              </td>
                            </tr>
                          );
                        }

                        return allPayableItems.map((item) => (
                          <tr
                            key={item.id}
                            onClick={item.onSelect}
                            className={`cursor-pointer transition-colors ${
                              item.isSelected ? 'bg-emerald-50/90 font-semibold' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2 px-2.5 text-center border-r border-slate-100">
                              <input
                                type="radio"
                                name="selectedPayableItem"
                                checked={item.isSelected}
                                onChange={() => {}}
                                className="text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                              />
                            </td>
                            <td className="py-2 px-2.5 border-r border-slate-100">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${item.badgeClass}`}>
                                {item.typeLabel}
                              </span>
                            </td>
                            <td className="py-2 px-2.5 font-mono font-bold text-emerald-900 border-r border-slate-100">{item.docNo}</td>
                            <td className="py-2 px-2.5 text-slate-600 border-r border-slate-100 font-mono">{item.date}</td>
                            <td className="py-2 px-2.5 text-slate-600 border-r border-slate-100 font-mono">{item.dueDate}</td>
                            <td className="py-2 px-2.5 text-right font-mono border-r border-slate-100">
                              Rp {item.total.toLocaleString('id-ID')}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono text-slate-500 border-r border-slate-100">
                              Rp {item.paid.toLocaleString('id-ID')}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-amber-800">
                              Rp {item.remaining.toLocaleString('id-ID')}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PILIHAN AKUN KAS / BANK DAN NOMINAL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Keluarkan dari Kas / Bank (Credit Account):
                  </label>
                  <select
                    value={paymentForm.accountId}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, accountId: e.target.value }))}
                    className="w-full px-2.5 py-1.5 border border-slate-200/80 rounded-xl bg-white font-medium"
                  >
                    {accounts
                      .filter((a) => a.tipe_akun === 'Kas & Bank' || a.kode_akun?.startsWith('1101') || a.kode_akun?.startsWith('1102'))
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.kode_akun} - {acc.nama_akun}
                        </option>
                      ))}
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Saldo kas/bank akan berkurang dan jurnal double-entry langsung terposting seimbang.
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">Nominal yang Dibayarkan (Rp):</label>
                    {Number(paymentForm.amount || 0) > 0 && (
                      <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Rp {formatDisplayDecimal(paymentForm.amount)}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={paymentForm.amount ? formatDisplayDecimal(paymentForm.amount) : ''}
                      onChange={(e) => {
                        const { num } = formatLiveInput(e.target.value);
                        setPaymentForm((p) => ({ ...p, amount: num }));
                      }}
                      placeholder="0"
                      className="w-full pl-10 pr-3 py-1.5 border border-slate-200/80 rounded-xl font-mono font-bold text-base text-emerald-950 bg-white"
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                    <span>Terbilang:</span>
                    <strong className="text-emerald-900 font-mono">
                      Rp {formatDisplayDecimal(paymentForm.amount || 0)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Catatan Bukti Pembayaran:</label>
                  <textarea
                    rows={2}
                    placeholder="Keterangan transfer, nomor referensi mutasi bank..."
                    value={paymentForm.catatan}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, catatan: e.target.value }))}
                    className="w-full p-2.5 border border-slate-200/80 rounded-xl bg-white text-xs"
                  />
                </div>
                <div>
                  <FileUploadBukti
                    label="Bukti Transfer Pembayaran ke Supplier"
                    value={paymentForm.lampiran_url}
                    onChange={(url) => setPaymentForm((p) => ({ ...p, lampiran_url: url }))}
                    docType="pp-beli"
                    helpText="Upload foto struk transfer / m-banking ke rekening supplier."
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. SUB-MODUL: DAFTAR PEMASOK (SUPPLIERS)                 */}
      {/* ======================================================== */}
      {activeTab === 'suppliers' && (
        <div className="w-full flex-1 flex flex-col space-y-2">
          {/* TOOLBAR */}
          <div className="relative z-40 flex items-center justify-between px-3.5 py-2 bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={handleOpenNewSupplier}
                className="px-4 py-2 bg-[#0A3828] text-white rounded-xl text-xs font-bold hover:bg-[#07291D] active:scale-[0.97] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-950/20 inline-flex items-center space-x-1.5 shadow-xs transition-all duration-200 ease-out cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ Tambah Pemasok Baru</span>
              </button>
              <span className="text-xs text-slate-500">
                Total: <strong>{filteredSuppliers.length}</strong> mitra pemasok / pabrik
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama pabrik, no. telp, alamat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200/80 rounded-xl w-56 sm:w-72 focus:outline-none focus:ring-1 focus:ring-emerald-700 bg-white"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200/80 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-200 w-12 text-center">No.</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Nama Pemasok / Pabrik</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 w-36">No. Telepon / WA</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Alamat Lengkap</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-200 w-36">Total Pembelian (Rp)</th>
                  <th className="py-2.5 px-3 text-right w-36">Hutang Aktif (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-bold text-slate-700">Belum ada pemasok terdaftar</p>
                      <p className="text-xs text-slate-400 mt-0.5 mb-3">
                        Daftarkan pemasok kemasan Anda untuk mulai membuat pesanan dan faktur.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenNewSupplier}
                        className="px-4 py-1.5 bg-[#0A3828] text-white rounded-xl text-xs font-bold hover:bg-[#07291D] inline-flex items-center space-x-1.5"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Daftarkan Sekarang</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((s, idx) => {
                    const supPurchases = purchases.filter((p) => p.supplier_id === s.id);
                    const totalPurchases = supPurchases.reduce((acc, p) => acc + Number(p.total_akhir || p.total || 0), 0);
                    const outstandingDebt = supPurchases
                      .filter((p) => p.status_bayar === 'HUTANG')
                      .reduce((acc, p) => acc + (Number(p.total_akhir || p.total || 0) - Number(p.bayar || 0)), 0);

                    return (
                      <tr
                        key={s.id}
                        onClick={() => handleEditSupplier(s)}
                        className="hover:bg-emerald-50/70 transition-colors cursor-pointer group"
                      >
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono border-r border-slate-100">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="group-hover:underline flex items-center space-x-1.5">
                              <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>{s.nama}</span>
                            </span>
                            <span className="opacity-0 group-hover:opacity-100 text-[10px] text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded transition">
                              Edit Pemasok
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700 border-r border-slate-100">{s.telepon || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-500 border-r border-slate-100 truncate max-w-sm">{s.alamat || '-'}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 border-r border-slate-100">
                          Rp {totalPurchases.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-800">
                          Rp {outstandingDebt.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: AMBIL DOKUMEN (TAKE FLOW: PO -> RI -> FB)         */}
      {/* ======================================================== */}
      {takeModalType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#0A3828] text-white">
              <h3 className="font-extrabold text-sm">
                {takeModalType === 'PO_TO_RI' && 'Ambil Barang dari Pesanan Pembelian (PO)'}
                {takeModalType === 'RI_TO_FB' && 'Ambil Barang dari Penerimaan Barang (RI)'}
                {takeModalType === 'PO_TO_FB' && 'Ambil Tagihan dari Pesanan Pembelian (PO)'}
              </h3>
              <button
                type="button"
                onClick={() => setTakeModalType(null)}
                className="text-emerald-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2.5 max-h-96 overflow-y-auto text-xs">
              {takeModalType === 'PO_TO_RI' && (
                <>
                  <p className="text-slate-500 mb-2">
                    Pilih Pesanan Pembelian (PO) yang barangnya telah tiba di gudang:
                  </p>
                  {purchaseOrders.filter((po) => po.status !== 'SELESAI').length === 0 ? (
                    <div className="py-8 text-center text-slate-400">
                      Tidak ada PO yang sedang menunggu penerimaan.
                    </div>
                  ) : (
                    purchaseOrders
                      .filter((po) => po.status !== 'SELESAI')
                      .map((po) => (
                        <div
                          key={po.id}
                          onClick={() => handleTakePOIntoRI(po)}
                          className="p-3 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 rounded-xl cursor-pointer flex justify-between items-center transition"
                        >
                          <div>
                            <span className="font-mono font-bold text-emerald-900 mr-2">{po.no_pesanan}</span>
                            <strong className="text-slate-800">{po.supplier?.nama}</strong>
                            <span className="text-slate-400 block text-[11px] mt-0.5">
                              Tgl: {po.tanggal} • {po.pesanan_pembelian_detail?.length || 0} item barang
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-slate-900 block">
                              Rp {Number(po.total || 0).toLocaleString('id-ID')}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-bold inline-flex items-center space-x-1">
                              <span>Pilih PO Ini</span>
                              <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      ))
                  )}
                </>
              )}

              {(takeModalType === 'RI_TO_FB' || takeModalType === 'PO_TO_FB') && (
                <div className="flex items-center space-x-1.5 mb-2 pb-2 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => setTakeModalType('RI_TO_FB')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      takeModalType === 'RI_TO_FB'
                        ? 'bg-emerald-800 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    1. Dari Penerimaan Barang (RI)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTakeModalType('PO_TO_FB')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      takeModalType === 'PO_TO_FB'
                        ? 'bg-emerald-800 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    2. Langsung Dari Pesanan (PO)
                  </button>
                </div>
              )}

              {takeModalType === 'RI_TO_FB' && (
                <>
                  <p className="text-slate-500 mb-2">
                    Pilih Penerimaan Barang (RI) untuk diterbitkan Faktur Pembelian:
                  </p>
                  {goodsReceipts.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">Belum ada penerimaan barang tercatat.</div>
                  ) : (
                    goodsReceipts.map((ri) => (
                      <div
                        key={ri.id}
                        onClick={() => handleTakeRIIntoFB(ri)}
                        className="p-3 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 rounded-xl cursor-pointer flex justify-between items-center transition"
                      >
                        <div>
                          <span className="font-mono font-bold text-emerald-900 mr-2">{ri.no_terima}</span>
                          <strong className="text-slate-800">{ri.supplier?.nama}</strong>
                          <span className="text-slate-400 block text-[11px] mt-0.5">
                            SJ: {ri.no_surat_jalan_supplier || '-'} • Tgl: {ri.tanggal} • {ri.penerimaan_barang_detail?.length || 0} item
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-emerald-700 font-bold inline-flex items-center space-x-1">
                            <span>Pilih RI Ini</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {takeModalType === 'PO_TO_FB' && (
                <>
                  <p className="text-slate-500 mb-2">
                    Pilih Pesanan Pembelian (PO) untuk langsung diterbitkan Faktur Pembelian:
                  </p>
                  {purchaseOrders.filter((po) => po.status !== 'SELESAI').length === 0 ? (
                    <div className="py-8 text-center text-slate-400">
                      Tidak ada pesanan pembelian (PO) aktif yang menunggu faktur.
                    </div>
                  ) : (
                    purchaseOrders
                      .filter((po) => po.status !== 'SELESAI')
                      .map((po) => (
                        <div
                          key={po.id}
                          onClick={() => handleTakePOIntoFB(po)}
                          className="p-3 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 rounded-xl cursor-pointer flex justify-between items-center transition"
                        >
                          <div>
                            <span className="font-mono font-bold text-emerald-900 mr-2">{po.no_pesanan}</span>
                            <strong className="text-slate-800">{po.supplier?.nama}</strong>
                            <span className="text-slate-400 block text-[11px] mt-0.5">
                              Tgl: {po.tanggal} • {po.pesanan_pembelian_detail?.length || 0} item barang
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-slate-900 block">
                              Rp {Number(po.total || 0).toLocaleString('id-ID')}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-bold inline-flex items-center space-x-1">
                              <span>Pilih PO Ini</span>
                              <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      ))
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: PRATINJAU / CETAK DOKUMEN PDF (ACCURATE PARITY)   */}
      {/* ======================================================== */}
      {pdfModalDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <div className="flex items-center space-x-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                <h3 className="font-extrabold text-sm">
                  Pratinjau Dokumen Cetak - {pdfModalDoc.type === 'PO' && 'Pesanan Pembelian (PO)'}
                  {pdfModalDoc.type === 'RI' && 'Surat Penerimaan Barang (RI)'}
                  {pdfModalDoc.type === 'FB' && 'Faktur Pembelian (FB)'}
                  {pdfModalDoc.type === 'PP' && 'Bukti Pengeluaran Kas/Bank (PP)'}
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center space-x-1"
                >
                  <Printer className="w-3 h-3" />
                  <span>Cetak</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPdfModalDoc(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans print:p-0">
              {/* Kop Surat */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div>
                  <h1 className="text-base font-extrabold text-slate-900 tracking-wider">
                    {companySettings.nama_usaha || 'PT ETERNAL PACKAGING INDONESIA'}
                  </h1>
                  <p className="text-[11px] text-slate-600">
                    {companySettings.alamat || 'Sentra Industri Kemasan, Jakarta - Indonesia'}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Telp: {companySettings.telepon || '0812-3456-7890'} | Email: info@fagkemasan.com
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-slate-900 text-white font-extrabold text-xs tracking-wider rounded uppercase">
                    {pdfModalDoc.type === 'PO' && 'PESANAN PEMBELIAN (PURCHASE ORDER)'}
                    {pdfModalDoc.type === 'RI' && 'SURAT PENERIMAAN BARANG (RECEIVE ITEM)'}
                    {pdfModalDoc.type === 'FB' && 'FAKTUR PEMBELIAN (PURCHASE INVOICE)'}
                    {pdfModalDoc.type === 'PP' && 'BUKTI PENGELUARAN KAS / BANK'}
                  </span>
                  <p className="font-mono font-bold text-sm text-slate-900 mt-2">
                    {pdfModalDoc.data?.no_pesanan ||
                      pdfModalDoc.data?.no_terima ||
                      pdfModalDoc.data?.no_faktur ||
                      pdfModalDoc.data?.no_bukti}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">Tanggal: {pdfModalDoc.data?.tanggal}</p>
                </div>
              </div>

              {/* Data Pemasok */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Pemasok / Supplier:</span>
                  <strong className="text-slate-900 text-xs block">{pdfModalDoc.data?.supplier?.nama || '-'}</strong>
                  <p className="text-slate-600 text-[11px] mt-0.5">{pdfModalDoc.data?.supplier?.alamat || '-'}</p>
                  <p className="text-slate-600 text-[11px]">Telp: {pdfModalDoc.data?.supplier?.telepon || '-'}</p>
                </div>
                <div className="text-right space-y-1">
                  {pdfModalDoc.data?.no_surat_jalan_supplier && (
                    <p className="text-[11px] text-slate-600">
                      No. SJ Supplier: <strong>{pdfModalDoc.data.no_surat_jalan_supplier}</strong>
                    </p>
                  )}
                  {pdfModalDoc.data?.syarat_bayar && (
                    <p className="text-[11px] text-slate-600">
                      Syarat Bayar: <strong>{pdfModalDoc.data.syarat_bayar}</strong>
                    </p>
                  )}
                  {pdfModalDoc.data?.tgl_jatuh_tempo && (
                    <p className="text-[11px] text-slate-600">
                      Jatuh Tempo: <strong>{pdfModalDoc.data.tgl_jatuh_tempo}</strong>
                    </p>
                  )}
                </div>
              </div>

              {/* Tabel Detail Barang */}
              {(pdfModalDoc.data?.pesanan_pembelian_detail ||
                pdfModalDoc.data?.penerimaan_barang_detail ||
                pdfModalDoc.data?.pembelian_detail) && (
                <table className="w-full text-xs text-left border-collapse border border-slate-200/80">
                  <thead className="bg-slate-100 font-bold border-b border-slate-200/80">
                    <tr>
                      <th className="py-2 px-2.5 w-10 text-center border-r border-slate-200/80">No.</th>
                      <th className="py-2 px-2.5 border-r border-slate-200/80">Deskripsi Barang</th>
                      <th className="py-2 px-2.5 w-20 text-center border-r border-slate-200/80">Qty</th>
                      <th className="py-2 px-2.5 w-20 text-center border-r border-slate-200/80">Satuan</th>
                      {pdfModalDoc.type !== 'RI' && (
                        <>
                          <th className="py-2 px-2.5 w-28 text-right border-r border-slate-200/80">Harga Satuan</th>
                          <th className="py-2 px-2.5 w-32 text-right">Total (Rp)</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(
                      pdfModalDoc.data?.pesanan_pembelian_detail ||
                      pdfModalDoc.data?.penerimaan_barang_detail ||
                      pdfModalDoc.data?.pembelian_detail ||
                      []
                    ).map((d, i) => (
                      <tr key={i}>
                        <td className="py-2 px-2.5 text-center font-mono border-r border-slate-200/80">{i + 1}</td>
                        <td className="py-2 px-2.5 font-semibold text-slate-900 border-r border-slate-200/80">
                          {d.produk?.nama || '-'}
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono font-bold border-r border-slate-200/80">{d.qty}</td>
                        <td className="py-2 px-2.5 text-center text-slate-600 border-r border-slate-200/80">
                          {d.produk?.satuan || 'Pcs'}
                        </td>
                        {pdfModalDoc.type !== 'RI' && (
                          <>
                            <td className="py-2 px-2.5 text-right font-mono border-r border-slate-200/80">
                              Rp {Number(d.harga_beli || 0).toLocaleString('id-ID')}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">
                              Rp {Number(d.subtotal || d.qty * d.harga_beli).toLocaleString('id-ID')}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Detail Pembayaran Kas Keluar jika PP */}
              {pdfModalDoc.type === 'PP' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-slate-600">Dibayarkan kepada:</span>
                    <strong className="text-slate-900">{pdfModalDoc.data?.supplier?.nama}</strong>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-slate-600">Untuk Pelunasan Faktur:</span>
                    <strong className="text-emerald-900 font-mono">{pdfModalDoc.data?.pembelian?.no_faktur}</strong>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-slate-600">Dikeluarkan dari Rekening / Kas:</span>
                    <strong className="text-slate-900">{pdfModalDoc.data?.akun_kas?.nama_akun || 'Bank BCA'}</strong>
                  </div>
                  <div className="flex justify-between items-center pt-1 text-sm font-extrabold text-slate-900">
                    <span>JUMLAH DIBAYARKAN:</span>
                    <span className="font-mono text-base text-emerald-900">
                      Rp {Number(pdfModalDoc.data?.total_bayar || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              )}

              {/* Tanda Tangan */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-center">
                <div>
                  <p className="text-[11px] text-slate-500 mb-12">Disiapkan Oleh:</p>
                  <p className="font-bold text-slate-900 border-t border-slate-200/80 pt-1 inline-block px-8">
                    ( Bagian Pembelian & Gudang )
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 mb-12">Disetujui Oleh:</p>
                  <p className="font-bold text-slate-900 border-t border-slate-200/80 pt-1 inline-block px-8">
                    ( Direktur / Finance )
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: KONFIRMASI HAPUS DOKUMEN (PERMANEN DI SUPABASE)   */}
      {/* ======================================================== */}
      {deleteConfirmDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 space-y-3.5 text-center border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                Hapus {deleteConfirmDoc.type === 'PO' && 'Pesanan Pembelian'}
                {deleteConfirmDoc.type === 'RI' && 'Penerimaan Barang (RI)'}
                {deleteConfirmDoc.type === 'FB' && 'Faktur Pembelian (FB)'}
                {deleteConfirmDoc.type === 'PP' && 'Pembayaran Hutang (PP)'}
                {deleteConfirmDoc.type === 'SUPPLIER' && 'Pemasok / Supplier'}?
              </h3>
              <p className="text-xs font-mono font-bold text-rose-800 mt-1 bg-rose-50 py-0.5 rounded border border-rose-200">
                {deleteConfirmDoc.noDoc}
              </p>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                {deleteConfirmDoc.type === 'RI'
                  ? 'Penerimaan barang ini akan dihapus dan jumlah fisik stok di gudang akan dikembalikan secara otomatis.'
                  : deleteConfirmDoc.type === 'FB'
                  ? 'Faktur pembelian ini beserta seluruh jurnal pembukuan terkait akan dihapus permanen dari Supabase.'
                  : deleteConfirmDoc.type === 'PP'
                  ? 'Pembayaran hutang ini akan dibatalkan, status faktur dikembalikan ke HUTANG, dan jurnal kas keluar dihapus.'
                  : 'Dokumen ini beserta seluruh rincian barangnya akan dihapus permanen dari database Supabase.'}
              </p>
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmDoc(null)}
                className="flex-1 py-2 border border-slate-200/80 hover:bg-slate-50 rounded-xl font-bold text-xs text-slate-700 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirmDoc.type === 'PO') handleDeletePO(deleteConfirmDoc.id, deleteConfirmDoc.noDoc);
                  else if (deleteConfirmDoc.type === 'RI') handleDeleteRI(deleteConfirmDoc.id, deleteConfirmDoc.noDoc);
                  else if (deleteConfirmDoc.type === 'FB') handleDeleteFB(deleteConfirmDoc.id, deleteConfirmDoc.noDoc);
                  else if (deleteConfirmDoc.type === 'PP') handleDeletePP(deleteConfirmDoc.id, deleteConfirmDoc.noDoc);
                  else if (deleteConfirmDoc.type === 'SUPPLIER') handleDeleteSupplier(deleteConfirmDoc.id, deleteConfirmDoc.noDoc);
                }}
                disabled={loading}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition shadow-xs flex items-center justify-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT PEMASOK BARU */}
      <QuickAddSupplierModal
        isOpen={isSupplierModalOpen}
        editingSupplier={editingSupplier}
        onClose={() => {
          setIsSupplierModalOpen(false);
          setEditingSupplier(null);
        }}
        onSupplierCreated={(newSup) => {
          if (editingSupplier) {
            setSuppliers((prev) => prev.map((s) => (s.id === newSup.id ? newSup : s)));
            onToast?.(`Pemasok ${newSup.nama} berhasil diperbarui!`, 'success');
          } else {
            setSuppliers((prev) => [...prev, newSup]);
            if (activeTab === 'po_beli') setPoForm((p) => ({ ...p, supplierId: newSup.id }));
            else if (activeTab === 'ri_beli') setRiForm((p) => ({ ...p, supplierId: newSup.id }));
            else if (activeTab === 'pi_beli') setPiForm((p) => ({ ...p, supplierId: newSup.id }));
            onToast?.(`Pemasok ${newSup.nama} berhasil ditambahkan!`, 'success');
          }
          loadAllPurchaseData();
        }}
      />

      {/* MODAL: RINCIAN ITEM PEMBELIAN (PARITY WITH PENJUALAN) */}
      <PurchaseItemDetailModal
        isOpen={purchaseItemModal.isOpen}
        onClose={() => setPurchaseItemModal((p) => ({ ...p, isOpen: false }))}
        item={purchaseItemModal.item}
        onSave={handleSavePurchaseItemModal}
        onDelete={handleDeletePurchaseItemModal}
        formType={purchaseItemModal.formType}
        supplierName={
          suppliers.find((s) =>
            s.id ===
            (purchaseItemModal.formType === 'PO'
              ? poForm.supplierId
              : purchaseItemModal.formType === 'RI'
              ? riForm.supplierId
              : piForm.supplierId)
          )?.nama || ''
        }
      />

      {/* MODAL: PENGATURAN FILTER & KOLOM TABEL SUB-PEMBELIAN */}
      <TableConfigModal
        isOpen={!!activeConfigModal}
        onClose={() => setActiveConfigModal(null)}
        moduleKey={activeConfigModal || 'po_beli'}
        moduleTitle={
          activeConfigModal === 'po_beli'
            ? 'Pesanan Pembelian (PO)'
            : activeConfigModal === 'ri_beli'
            ? 'Penerimaan Barang (RI)'
            : activeConfigModal === 'pi_beli'
            ? 'Faktur Pembelian (FB)'
            : activeConfigModal === 'pp_beli'
            ? 'Pembayaran Hutang Usaha (PP)'
            : 'Tabel Pembelian'
        }
        config={tableConfigs[activeConfigModal] || DEFAULT_TABLE_CONFIGS[activeConfigModal]}
        onSaveConfig={(newCfg) => handleSaveTableConfig(activeConfigModal, newCfg)}
      />
      {/* Lightbox Preview Modal for Bukti Foto Pembelian */}
      <ImageLightboxModal
        isOpen={!!lightboxImage}
        imageUrl={lightboxImage?.url}
        title={lightboxImage?.title || 'Bukti Transaksi Pembelian'}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
}
