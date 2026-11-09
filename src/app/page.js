'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  createJournalEntry,
  deleteJournalEntry,
  resetAllTransactions,
  peekNextDocNumber,
  getNextDocNumber,
} from '../lib/accounting';
import ManualTransactionModal from '../components/ManualTransactionModal';
import GoogleLiveProductSearch from '../components/GoogleLiveProductSearch';
import GoogleLiveCustomerSearch from '../components/GoogleLiveCustomerSearch';
import ItemSpreadsheetGrid from '../components/ItemSpreadsheetGrid';
import QuickAddCustomerModal from '../components/QuickAddCustomerModal';
import QuickAddProductModal from '../components/QuickAddProductModal';
import QuickAddSupplierModal from '../components/QuickAddSupplierModal';
import PurchaseModule from '../components/PurchaseModule';
import { TableSkeleton, MetricCardsSkeleton, FormSkeleton } from '../components/SkeletonShimmer';
import InventoryModule from '../components/InventoryModule';
import ModernDatePicker from '../components/ModernDatePicker';
import CustomerInlineTable from '../components/CustomerInlineTable';
import DocumentPrintModal, { DEFAULT_PRINT_SETTINGS_PER_DOC } from '../components/DocumentPrintModal';
import DigitalSignaturePad from '../components/DigitalSignaturePad';
import AccountFormModal from '../components/AccountFormModal';
import CashVoucherPrintModal from '../components/CashVoucherPrintModal';
import LoginPage from '../components/LoginPage';
import UserManagementModal from '../components/UserManagementModal';
import ToastNotification from '../components/ToastNotification';
import FileUploadBukti from '../components/FileUploadBukti';
import ImageLightboxModal from '../components/ImageLightboxModal';
import DownPaymentModal from '../components/DownPaymentModal';
import TableFilterToolbar from '../components/TableFilterToolbar';
import TableConfigModal, { DEFAULT_TABLE_CONFIGS } from '../components/TableConfigModal';
import { DEFAULT_PAYMENT_TERMS, calculateDueDate } from '../lib/paymentTerms';
import {
  formatDisplayDecimal,
  formatLiveInput,
  parseNumberId,
  formatRupiah,
} from '../lib/numberFormat';
import {
  LayoutDashboard,
  ShoppingCart,
  Truck,
  FileText,
  CreditCard,
  Users,
  Package,
  BookOpen,
  TrendingUp,
  Boxes,
  Plus,
  Search,
  Printer,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  X,
  Layers,
  Calendar,
  Building,
  RefreshCw,
  Download,
  FileSpreadsheet,
  Check,
  ArrowRight,
  HelpCircle,
  Menu,
  ChevronDown,
  Building2,
  DollarSign,
  Info,
  Tag,
  Clock,
  Send,
  Eye,
  SlidersHorizontal,
  ExternalLink,
  Phone,
  History,
  ArrowUpRight,
  Workflow,
  Sparkles,
  List,
  Settings,
  Coins,
  CheckCheck,
  Undo2,
  Database,
  ShieldCheck,
  Store,
  Edit,
  Receipt,
  Wallet,
  Percent,
  ArrowDownLeft,
  BarChart3,
  Camera,
  LogOut,
} from 'lucide-react';

export default function EternalPackagingERPWorkspace() {
  // Sidebar State & Flyout Drawer
  const [activeMenu, setActiveMenu] = useState('penjualan');
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  // Modul Tab sets matching Accurate Online
  const MODULE_TAB_SETS = {
    penjualan: [
      { id: 'so', title: 'Pesanan Penjualan (PO)', type: 'so', closable: false },
      { id: 'quotation', title: 'Proforma Invoice (PI)', type: 'quotation', closable: true },
      { id: 'dp', title: 'Uang Muka (DP)', type: 'dp', closable: true },
      { id: 'do', title: 'Pengiriman (DO)', type: 'do', closable: true },
      { id: 'si', title: 'Invoice', type: 'si', closable: true },
      { id: 'payment', title: 'Pembayaran (CR)', type: 'payment', closable: true },
      { id: 'customers', title: 'Daftar Pelanggan', type: 'customers', closable: true },
      { id: 'settings', title: 'Pengaturan Usaha', type: 'settings', closable: true },
    ],
    pembelian: [
      { id: 'po_beli', title: 'Pesanan Pembelian (PO)', type: 'po_beli', closable: false },
      { id: 'ri_beli', title: 'Penerimaan Barang (RI)', type: 'ri_beli', closable: true },
      { id: 'pi_beli', title: 'Faktur Pembelian (FB)', type: 'pi_beli', closable: true },
      { id: 'pp_beli', title: 'Pembayaran Pembelian (PP)', type: 'pp_beli', closable: true },
      { id: 'suppliers', title: 'Daftar Pemasok', type: 'suppliers', closable: true },
      { id: 'settings', title: 'Pengaturan Usaha', type: 'settings', closable: true },
    ],
    persediaan: [
      { id: 'items', title: 'Barang & Jasa (Master Kemasan)', type: 'items', closable: false },
      { id: 'stock_opname', title: 'Penyesuaian Persediaan (Opname)', type: 'stock_opname', closable: true },
      { id: 'stock_mutation', title: 'Riwayat Mutasi (Kartu Stok)', type: 'stock_mutation', closable: true },
    ],
    buku_besar: [
      { id: 'coa', title: 'Akun Perkiraan (COA)', type: 'coa', closable: false },
      { id: 'journals', title: 'Buku Jurnal Umum', type: 'journals', closable: true },
    ],
    laporan: [
      { id: 'income_statement', title: 'Laporan Laba Rugi', type: 'income_statement', closable: false },
    ],
    dashboard: [
      { id: 'dashboard', title: 'Ringkasan ERP', type: 'dashboard', closable: false },
    ],
  };

  const [purchases, setPurchases] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);

  // Multi-Tab System (Accurate Online Signature Tabs)
  const [openTabs, setOpenTabs] = useState([
    { id: 'so', title: 'Pesanan Penjualan (PO)', type: 'so', closable: false },
    { id: 'quotation', title: 'Proforma Invoice (PI)', type: 'quotation', closable: true },
    { id: 'dp', title: 'Uang Muka (DP)', type: 'dp', closable: true },
    { id: 'do', title: 'Pengiriman (DO)', type: 'do', closable: true },
    { id: 'si', title: 'Invoice', type: 'si', closable: true },
    { id: 'payment', title: 'Pembayaran (CR)', type: 'payment', closable: true },
    { id: 'settings', title: 'Pengaturan Usaha', type: 'settings', closable: true },
  ]);
  const [activeTabId, setActiveTabId] = useState('so');

  // Module Switching Handler (Accurate Online Multi-Tab Structure)
  const switchModule = (moduleId, targetTabId = null) => {
    setActiveMenu(moduleId);
    const tabSet = MODULE_TAB_SETS[moduleId] || MODULE_TAB_SETS.penjualan;
    setOpenTabs(tabSet);
    const activeId = targetTabId || tabSet[0].id;
    setActiveTabId(activeId);
    setFlyoutOpen(false);
  };

  // Support direct tab opening via hash (e.g. #settings, #po_beli, #pembelian)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleHashChange = () => {
        const hash = window.location.hash.replace('#', '');
        if (!hash) return;
        if (hash === 'pembelian' || hash === 'po_beli') {
          switchModule('pembelian', 'po_beli');
        } else if (hash === 'ri_beli' || hash === 'pi_beli' || hash === 'pp_beli' || hash === 'suppliers') {
          switchModule('pembelian', hash);
        } else if (hash === 'persediaan' || hash === 'items' || hash === 'stock_opname' || hash === 'stock_mutation') {
          switchModule('persediaan', hash === 'persediaan' ? 'items' : hash);
        } else if (['so', 'quotation', 'dp', 'do', 'si', 'payment', 'settings', 'customers'].includes(hash)) {
          switchModule('penjualan', hash);
        } else if (hash === 'coa' || hash === 'journals') {
          switchModule('buku_besar', hash);
          setCoaSubTab(hash === 'journals' ? 'jurnal' : 'coa');
        } else if (hash === 'income_statement' || hash === 'laporan') {
          switchModule('laporan', 'income_statement');
        } else if (hash === 'dashboard') {
          switchModule('dashboard', 'dashboard');
        }
      };
      handleHashChange();
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }
  }, []);

  // Keep browser URL hash synchronized with activeTabId
  useEffect(() => {
    if (typeof window !== 'undefined' && activeTabId) {
      window.history.replaceState(null, '', `#${activeTabId}`);
    }
  }, [activeTabId]);

  // VIEW MODE ACCURATE ONLINE: 'list' (Daftar) vs 'form' (Buat Baru)
  const [viewModes, setViewModes] = useState({
    so: 'list',
    quotation: 'list',
    do: 'list',
    si: 'list',
    payment: 'list',
  });

  // Table Search Filters
  const [tableSearch, setTableSearch] = useState({
    so: '',
    quotation: '',
    dp: '',
    do: '',
    si: '',
    payment: '',
    items: '',
    coa: '',
  });

  const [coaSubTab, setCoaSubTab] = useState('jurnal'); // 'jurnal' | 'coa'

  // Interactive Sub-Module List Status Filters (Legacy & Advanced Unified)
  const [listFilters, setListFilters] = useState({
    so: 'ALL', // 'ALL' | 'MENUNGGU_KIRIM' | 'SELESAI'
    quotation: 'ALL', // 'ALL' | 'AKTIF' | 'TERIMA'
    do: 'ALL', // 'ALL' | 'PROSES' | 'TERKIRIM'
    si: 'ALL', // 'ALL' | 'PIUTANG' | 'LUNAS'
  });

  // Table Configuration (Columns, Filters, Density) per Module
  const [tableConfigs, setTableConfigs] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('fag_table_configs_v1');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading table configs:', e);
      }
    }
    return DEFAULT_TABLE_CONFIGS;
  });

  const [activeConfigModal, setActiveConfigModal] = useState(null); // null | 'so' | 'quotation' | 'do' | 'si'

  // Advanced Dedicated Filters State (Status Pembayaran, Pengiriman, Tanggal, Pelanggan)
  const [advancedFilters, setAdvancedFilters] = useState({
    so: {
      statusBayar: 'ALL',
      statusKirim: 'ALL',
      dateRange: 'ALL',
      customStartDate: '',
      customEndDate: '',
      customer: 'ALL',
    },
    quotation: {
      status: 'ALL',
      dateRange: 'ALL',
      customStartDate: '',
      customEndDate: '',
      customer: 'ALL',
    },
    do: {
      status: 'ALL',
      dateRange: 'ALL',
      customStartDate: '',
      customEndDate: '',
      customer: 'ALL',
    },
    si: {
      statusBayar: 'ALL',
      dateRange: 'ALL',
      customStartDate: '',
      customEndDate: '',
      customer: 'ALL',
    },
    payment: {
      dateRange: 'ALL',
      customStartDate: '',
      customEndDate: '',
      customer: 'ALL',
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
    setTableSearch((prev) => ({ ...prev, [moduleKey]: '' }));
    setAdvancedFilters((prev) => ({
      ...prev,
      [moduleKey]: {
        statusBayar: 'ALL',
        statusKirim: 'ALL',
        status: 'ALL',
        dateRange: 'ALL',
        customStartDate: '',
        customEndDate: '',
        customer: 'ALL',
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
          localStorage.setItem('fag_table_configs_v1', JSON.stringify(updated));
        } catch (e) {
          console.error('Error saving table configs:', e);
        }
      }
      return updated;
    });
  };

  // Master Data State
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [accounts, setAccounts] = useState([]);

  // Transaction Lists (Accurate Complete Pipeline)
  const [quotations, setQuotations] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [salesInvoices, setSalesInvoices] = useState([]);
  const [salesPayments, setSalesPayments] = useState([]);
  const [journals, setJournals] = useState([]);
  const [allJournalDetails, setAllJournalDetails] = useState([]);

  // Manual Cash Transaction & General Journal Modal State (Buku Besar Accurate)
  const [isManualTxModalOpen, setIsManualTxModalOpen] = useState(false);
  const [manualTxModalMode, setManualTxModalMode] = useState('KAS_MASUK');
  const [manualTxInitialAccountId, setManualTxInitialAccountId] = useState(null);

  // Account Form Modal (COA Setting: Tipe Akun, Nama Akun, Debit/Kredit, Saldo Awal)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  // Cash Voucher Print Modal (Bukti Kas Keluar / Kas Masuk / Slip Gaji PDF)
  const [isCashVoucherOpen, setIsCashVoucherOpen] = useState(false);
  const [currentCashVoucher, setCurrentCashVoucher] = useState(null);

  // User Authentication & Session States
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  // Filter Akun Kas & Bank untuk Pelunasan (Payment CR)
  const kasAccounts = useMemo(() => {
    return (accounts || []).filter(
      (a) =>
        a.tipe_akun === 'KAS' ||
        a.tipe_akun === 'Kas & Bank' ||
        a.kode_akun?.startsWith('1101') ||
        a.kode_akun?.startsWith('1102')
    );
  }, [accounts]);

  // Realtime Running Balances per Account (Double-Entry PSAK Accurate)
  const accountBalances = useMemo(() => {
    const balances = {};
    accounts.forEach((a) => {
      balances[a.id] = {
        totalDebit: 0,
        totalKredit: 0,
        saldoAwal: Number(a.saldo_awal || 0),
        saldoAkhir: Number(a.saldo_awal || 0),
      };
    });

    allJournalDetails.forEach((d) => {
      if (d.akun_id && balances[d.akun_id]) {
        balances[d.akun_id].totalDebit += Number(d.debit || 0);
        balances[d.akun_id].totalKredit += Number(d.kredit || 0);
      }
    });

    accounts.forEach((a) => {
      const b = balances[a.id];
      if (b) {
        if (a.saldo_normal === 'DEBIT') {
          b.saldoAkhir = b.saldoAwal + b.totalDebit - b.totalKredit;
        } else {
          b.saldoAkhir = b.saldoAwal + b.totalKredit - b.totalDebit;
        }
      }
    });

    return balances;
  }, [accounts, allJournalDetails]);

  // ============================================================
  // EXECUTIVE FINANCIAL & BUSINESS METRICS (ACCURATE REALTIME)
  // ============================================================
  const totalOmzetPenjualan = useMemo(() => {
    return salesInvoices.reduce((sum, inv) => sum + Number(inv.total_akhir || 0), 0);
  }, [salesInvoices]);

  const totalKasBank = useMemo(() => {
    return accounts
      .filter((a) => a.tipe_akun === 'Kas & Bank')
      .reduce((sum, a) => sum + (accountBalances[a.id]?.saldoAkhir || 0), 0);
  }, [accounts, accountBalances]);

  const totalAsetPersediaan = useMemo(() => {
    const fromProducts = products.reduce((sum, p) => sum + (Number(p.stok || 0) * Number(p.harga_beli || 0)), 0);
    const fromAccount = accounts.find((a) => a.kode_akun === '1104-01');
    const accBal = fromAccount ? (accountBalances[fromAccount.id]?.saldoAkhir || 0) : 0;
    return accBal > 0 ? accBal : fromProducts;
  }, [products, accounts, accountBalances]);

  const totalHPP = useMemo(() => {
    const hppAccount = accounts.find((a) => a.kode_akun === '5101-01');
    const accHpp = hppAccount ? (accountBalances[hppAccount.id]?.saldoAkhir || 0) : 0;
    if (accHpp > 0) return accHpp;
    return Math.round(totalOmzetPenjualan * 0.6);
  }, [accounts, accountBalances, totalOmzetPenjualan]);

  const totalLabaKotor = useMemo(() => {
    return Math.max(0, totalOmzetPenjualan - totalHPP);
  }, [totalOmzetPenjualan, totalHPP]);

  const bebanAccounts = useMemo(() => {
    return accounts.filter((a) => a.tipe_akun === 'Beban' || a.tipe_akun === 'Beban Lainnya');
  }, [accounts]);

  const totalBebanOperasional = useMemo(() => {
    return bebanAccounts.reduce((sum, a) => {
      const bal = accountBalances[a.id]?.saldoAkhir || 0;
      return sum + (bal > 0 ? bal : 0);
    }, 0);
  }, [bebanAccounts, accountBalances]);

  const totalLabaBersih = useMemo(() => {
    return totalLabaKotor - totalBebanOperasional;
  }, [totalLabaKotor, totalBebanOperasional]);

  const totalPiutang = useMemo(() => {
    const piutangAccount = accounts.find((a) => a.kode_akun === '1103-01');
    const accBal = piutangAccount ? (accountBalances[piutangAccount.id]?.saldoAkhir || 0) : 0;
    const fromInvoices = salesInvoices
      .filter((i) => i.status === 'PIUTANG' || i.status === 'BELUM_LUNAS')
      .reduce((sum, i) => sum + Number(i.total_akhir || 0), 0);
    return Math.max(accBal, fromInvoices);
  }, [accounts, accountBalances, salesInvoices]);

  const totalHutang = useMemo(() => {
    const hutangAccount = accounts.find((a) => a.kode_akun === '2101-01');
    const accBal = hutangAccount ? (accountBalances[hutangAccount.id]?.saldoAkhir || 0) : 0;
    const fromPurchases = purchases
      .filter((p) => p.status_bayar === 'HUTANG' || p.status_bayar === 'BELUM_LUNAS')
      .reduce((sum, p) => sum + Number(p.total_akhir || p.total || 0), 0);
    return Math.max(accBal, fromPurchases);
  }, [accounts, accountBalances, purchases]);

  const grossProfitMargin = useMemo(() => {
    return totalOmzetPenjualan > 0 ? ((totalLabaKotor / totalOmzetPenjualan) * 100).toFixed(1) : '0.0';
  }, [totalLabaKotor, totalOmzetPenjualan]);

  const netProfitMargin = useMemo(() => {
    return totalOmzetPenjualan > 0 ? ((totalLabaBersih / totalOmzetPenjualan) * 100).toFixed(1) : '0.0';
  }, [totalLabaBersih, totalOmzetPenjualan]);

  // Master Satuan & Kategori Kemasan (Supabase Live)
  const [satuanList, setSatuanList] = useState([]);
  const [newSatuanInput, setNewSatuanInput] = useState('');
  const [newKategoriInput, setNewKategoriInput] = useState('');
  const [newKategoriDescInput, setNewKategoriDescInput] = useState('');

  // Down Payment (Uang Muka) Modal State (Accurate Online Alur)
  const [isDpModalOpen, setIsDpModalOpen] = useState(false);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState(null);
  const [selectedDpOrder, setSelectedDpOrder] = useState(null);
  const [selectedDpSource, setSelectedDpSource] = useState('PO');
  const [soFlowDropdownOpen, setSoFlowDropdownOpen] = useState(false);
  const [sqFlowDropdownOpen, setSqFlowDropdownOpen] = useState(false);
  const [doFlowDropdownOpen, setDoFlowDropdownOpen] = useState(false);
  const [siFlowDropdownOpen, setSiFlowDropdownOpen] = useState(false);
  const [payFlowDropdownOpen, setPayFlowDropdownOpen] = useState(false);
  const [soGetFromModalOpen, setSoGetFromModalOpen] = useState(false);
  const [piSearchQuery, setPiSearchQuery] = useState('');
  const [doGetFromModalOpen, setDoGetFromModalOpen] = useState(false);
  const [doSearchQuery, setDoSearchQuery] = useState('');
  const [siGetFromModalOpen, setSiGetFromModalOpen] = useState(false);
  const [siSearchQuery, setSiSearchQuery] = useState('');
  const [siTakeTab, setSiTakeTab] = useState('DO'); // 'DO' or 'PO'
  const [settingsSubTab, setSettingsSubTab] = useState('profil');
  const [activePrintDocTab, setActivePrintDocTab] = useState('SQ');
  const [newBankInput, setNewBankInput] = useState({
    bankName: 'BCA',
    accountNumber: '',
    accountHolder: 'PT Eternal Packaging Indonesia',
    branch: '',
  });

  // Modals & UI Controls
  const [printDoc, setPrintDoc] = useState(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetIncludeProducts, setResetIncludeProducts] = useState(true);
  const [resetIncludeContacts, setResetIncludeContacts] = useState(true);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);

  // Company Profile Settings State (Saved in LocalStorage / State)
  const [companySettings, setCompanySettings] = useState({
    namaPerusahaan: 'PT Eternal Packaging Indonesia',
    merkDagang: 'FAG Kemasan',
    alamat: 'Jl. Raya Industri Kemasan No. 88, Kawasan Pergudangan, Yogyakarta / Jakarta',
    telepon: '0812-3456-7890',
    email: 'sales@fagkemasan.com',
    npwp: '01.234.567.8-901.000',
    rekeningBCA: 'BCA 123-456-7890 a.n. PT Eternal Packaging Indonesia',
    rekeningMandiri: 'Mandiri 987-654-3210 a.n. PT Eternal Packaging Indonesia',
    tandaTanganDigital: null,
    namaPenandatanganDefault: 'Fauzan Ghani',
    jabatanPenandatanganDefault: 'Direktur Utama',
    bankAccounts: [
      { id: 'bank-1', bankName: 'BCA', accountNumber: '123-456-7890', accountHolder: 'PT Eternal Packaging Indonesia', branch: 'KCU Jakarta' },
      { id: 'bank-2', bankName: 'Bank Mandiri', accountNumber: '987-654-3210', accountHolder: 'PT Eternal Packaging Indonesia', branch: 'Cabang Utama' },
    ],
    syaratBayarList: DEFAULT_PAYMENT_TERMS,
    ppnPersen: 11,
    ppnAktifDefault: false,
    printSettingsPerDoc: DEFAULT_PRINT_SETTINGS_PER_DOC,
  });

  // Load saved company settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem('FAG_COMPANY_SETTINGS');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.bankAccounts || parsed.bankAccounts.length === 0) {
          parsed.bankAccounts = [
            { id: 'bank-1', bankName: 'BCA', accountNumber: '123-456-7890', accountHolder: parsed.namaPerusahaan || 'PT Eternal Packaging Indonesia', branch: 'KCU Jakarta' },
            { id: 'bank-2', bankName: 'Bank Mandiri', accountNumber: '987-654-3210', accountHolder: parsed.namaPerusahaan || 'PT Eternal Packaging Indonesia', branch: 'Cabang Utama' },
          ];
        }
        if (!parsed.syaratBayarList || parsed.syaratBayarList.length === 0) {
          parsed.syaratBayarList = DEFAULT_PAYMENT_TERMS;
        }
        if (!parsed.printSettingsPerDoc) {
          parsed.printSettingsPerDoc = DEFAULT_PRINT_SETTINGS_PER_DOC;
        }
        setCompanySettings(parsed);
      }
    } catch (e) {}
  }, []);

  // State untuk form tambah Syarat Bayar / Termin baru di Pengaturan
  const [newTermInput, setNewTermInput] = useState({
    nama: '',
    hariJatuhTempo: 30,
    deskripsi: '',
  });

  const handleAddSyaratBayar = (e) => {
    e?.preventDefault();
    if (!newTermInput.nama.trim()) {
      showToast('Nama syarat bayar / termin tidak boleh kosong!', 'warning', 'Perhatian');
      return;
    }
    const currentList = companySettings.syaratBayarList || DEFAULT_PAYMENT_TERMS;
    const exists = currentList.some((t) => t.nama.toLowerCase() === newTermInput.nama.trim().toLowerCase());
    if (exists) {
      showToast(`Syarat bayar "${newTermInput.nama}" sudah ada!`, 'warning', 'Duplikat');
      return;
    }
    const newTerm = {
      id: 'term-' + Date.now(),
      nama: newTermInput.nama.trim(),
      hariJatuhTempo: Math.max(0, parseInt(newTermInput.hariJatuhTempo, 10) || 0),
      deskripsi: newTermInput.deskripsi.trim() || `Jatuh tempo ${newTermInput.hariJatuhTempo} hari kalender`,
      isDefault: false,
    };
    const updated = {
      ...companySettings,
      syaratBayarList: [...currentList, newTerm],
    };
    saveCompanySettings(updated);
    setNewTermInput({ nama: '', hariJatuhTempo: 30, deskripsi: '' });
    showToast(`Syarat bayar "${newTerm.nama}" berhasil ditambahkan! Berlaku untuk Penjualan & Pembelian.`, 'success', 'Pengaturan Tersimpan');
  };

  const handleDeleteSyaratBayar = (termId, termName) => {
    const currentList = companySettings.syaratBayarList || DEFAULT_PAYMENT_TERMS;
    if (currentList.length <= 1) {
      showToast('Minimal harus ada 1 syarat bayar aktif di sistem!', 'warning', 'Tidak Bisa Dihapus');
      return;
    }
    const updated = {
      ...companySettings,
      syaratBayarList: currentList.filter((t) => t.id !== termId),
    };
    saveCompanySettings(updated);
    showToast(`Syarat bayar "${termName}" berhasil dihapus.`, 'info', 'Dihapus');
  };

  const handleSetDefaultSyaratBayar = (termId, termName) => {
    const currentList = companySettings.syaratBayarList || DEFAULT_PAYMENT_TERMS;
    const updated = {
      ...companySettings,
      syaratBayarList: currentList.map((t) => ({ ...t, isDefault: t.id === termId })),
    };
    saveCompanySettings(updated);
    showToast(`"${termName}" disetel sebagai termin pembayaran default.`, 'success', 'Termin Default Diperbarui');
  };

  // Toast Notification System (Replacing native browser alert)
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success', title = '') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const saveCompanySettings = async (updated) => {
    setCompanySettings(updated);
    try {
      localStorage.setItem('FAG_COMPANY_SETTINGS', JSON.stringify(updated));
      const { error } = await supabase.from('pengaturan_perusahaan').upsert({
        id: 'default',
        nama_perusahaan: updated.namaPerusahaan || updated.nama_perusahaan || '',
        merk_dagang: updated.merkDagang || updated.merk_dagang || '',
        alamat: updated.alamat || '',
        telepon: updated.telepon || '',
        email: updated.email || '',
        npwp: updated.npwp || '',
        rekening_bca: updated.bankAccounts?.[0] ? `${updated.bankAccounts[0].bankName} ${updated.bankAccounts[0].accountNumber} a.n. ${updated.bankAccounts[0].accountHolder}` : (updated.rekeningBCA || ''),
        rekening_mandiri: updated.bankAccounts?.[1] ? `${updated.bankAccounts[1].bankName} ${updated.bankAccounts[1].accountNumber} a.n. ${updated.bankAccounts[1].accountHolder}` : (updated.rekeningMandiri || ''),
        ppn_persen: Number(updated.ppnPersen ?? updated.ppn_persen ?? 11),
        ppn_aktif_default: Boolean(updated.ppnAktifDefault ?? updated.ppn_aktif_default ?? false),
        updated_at: new Date().toISOString(),
      });
      if (error) console.warn('Supabase settings warning:', error.message);
      showToast('Pengaturan usaha & rekening berhasil disimpan!', 'success', 'Pengaturan Tersimpan');
    } catch (e) {
      console.error('Save settings error:', e);
      showToast('Pengaturan tersimpan lokal: ' + e.message, 'warning');
    }
  };

  const handleAddBankAccount = () => {
    if (!newBankInput.bankName.trim() || !newBankInput.accountNumber.trim()) {
      showToast('Nama bank dan nomor rekening wajib diisi!', 'warning');
      return;
    }
    const newAcc = {
      id: 'bank-' + Date.now(),
      bankName: newBankInput.bankName.trim(),
      accountNumber: newBankInput.accountNumber.trim(),
      accountHolder: newBankInput.accountHolder.trim() || companySettings.namaPerusahaan,
      branch: newBankInput.branch.trim(),
    };
    const updatedAccounts = [...(companySettings.bankAccounts || []), newAcc];
    const updatedSettings = { ...companySettings, bankAccounts: updatedAccounts };
    saveCompanySettings(updatedSettings);
    setNewBankInput({
      bankName: 'BCA',
      accountNumber: '',
      accountHolder: companySettings.namaPerusahaan,
      branch: '',
    });
    showToast(`Rekening ${newAcc.bankName} (${newAcc.accountNumber}) berhasil ditambahkan!`, 'success', 'Rekening Ditambahkan');
  };

  const handleDeleteBankAccount = (id, name) => {
    const updatedAccounts = (companySettings.bankAccounts || []).filter((b) => b.id !== id);
    const updatedSettings = { ...companySettings, bankAccounts: updatedAccounts };
    saveCompanySettings(updatedSettings);
    showToast(`Rekening ${name} berhasil dihapus dari daftar pembayaran.`, 'info', 'Rekening Dihapus');
  };

  // ========================================================
  // FORM STATES (FORMAT: [PREFIX].[YYYY].[MM].[DD].[0001])
  // ========================================================

  // Lightbox Modal for Photo Proofs
  const [lightboxImage, setLightboxImage] = useState(null);

  // 1. Order Masuk / Pesanan Penjualan (PO)
  const [soForm, setSoForm] = useState({
    editingId: null,
    soNo: `PO.${new Date().getFullYear()}.${(new Date().getMonth() + 1).toString().padStart(2, '0')}.${new Date().getDate().toString().padStart(2, '0')}.0001`,
    date: new Date().toISOString().split('T')[0],
    customerId: '',
    poCustomer: '',
    items: [],
    discountAmount: 0,
    ppnActive: false,
    catatan: '',
    lampiran_url: '',
    uangMuka: 0,
    statusBayar: 'BELUM_BAYAR',
    status: 'MENUNGGU_PENGIRIMAN',
  });

  // 2. Proforma Invoice (PI)
  const [quoteForm, setQuoteForm] = useState({
    editingId: null,
    quoteNo: `SQ.${new Date().getFullYear()}.${(new Date().getMonth() + 1).toString().padStart(2, '0')}.${new Date().getDate().toString().padStart(2, '0')}.0001`,
    date: new Date().toISOString().split('T')[0],
    customerId: '',
    items: [],
    discountAmount: 0,
    ppnActive: false,
    catatan: '',
    lampiran_url: '',
    status: 'DISETUJUI',
  });

  // 3. Pengiriman Pesanan (DO)
  const [doForm, setDoForm] = useState({
    editingId: null,
    doNo: `DO.${new Date().getFullYear()}.${(new Date().getMonth() + 1).toString().padStart(2, '0')}.${new Date().getDate().toString().padStart(2, '0')}.0001`,
    date: new Date().toISOString().split('T')[0],
    customerId: '',
    soId: '',
    ekspedisi: 'Armada Pengiriman FAG Kemasan',
    noResi: '',
    items: [],
    catatan: '',
    lampiran_url: '',
    status: 'TERKIRIM',
  });

  // 4. Invoice (SI)
  const [siForm, setSiForm] = useState({
    editingId: null,
    invoiceNo: `SI.${new Date().getFullYear()}.${(new Date().getMonth() + 1).toString().padStart(2, '0')}.${new Date().getDate().toString().padStart(2, '0')}.0001`,
    date: new Date().toISOString().split('T')[0],
    customerId: '',
    soId: null,
    doId: null,
    termin: 'Net 30',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [],
    discountAmount: 0,
    ppnActive: false,
    uangMuka: 0,
    catatan: '',
    lampiran_url: '',
    status: 'PIUTANG',
  });

  // 5. Penerimaan Penjualan (CR)
  const [payForm, setPayForm] = useState({
    editingId: null,
    receiptNo: `CR.${new Date().getFullYear()}.${(new Date().getMonth() + 1).toString().padStart(2, '0')}.${new Date().getDate().toString().padStart(2, '0')}.0001`,
    date: new Date().toISOString().split('T')[0],
    customerId: '',
    invoiceId: '',
    bankAccountId: '',
    amount: 0,
    catatan: '',
    lampiran_url: '',
  });

  // Refresh Sequential Numbers from PostgreSQL
  const refreshDocNumbers = async (dateOverride) => {
    try {
      const today = dateOverride || new Date().toISOString().split('T')[0];
      const [nextPO, nextSQ, nextDO, nextSI, nextCR] = await Promise.all([
        peekNextDocNumber('PO', today),
        peekNextDocNumber('SQ', today),
        peekNextDocNumber('DO', today),
        peekNextDocNumber('SI', today),
        peekNextDocNumber('CR', today),
      ]);
      if (nextPO) setSoForm((p) => ({ ...p, soNo: nextPO }));
      if (nextSQ) setQuoteForm((p) => ({ ...p, quoteNo: nextSQ }));
      if (nextDO) setDoForm((p) => ({ ...p, doNo: nextDO }));
      if (nextSI) setSiForm((p) => ({ ...p, invoiceNo: nextSI }));
      if (nextCR) setPayForm((p) => ({ ...p, receiptNo: nextCR }));
    } catch (e) {
      console.error('Gagal peek nomor dokumen:', e);
    }
  };

  // Load Data from Supabase
  const loadData = async () => {
    setLoading(true);
    try {
      const [
        { data: prodData },
        { data: catData },
        { data: contData },
        { data: accData },
        { data: quoteData },
        { data: soData },
        { data: doData },
        { data: siData },
        { data: payData },
        { data: jData },
        { data: jdAllData },
        { data: satData },
        { data: cfgData },
        { data: pData },
        { data: poData },
      ] = await Promise.all([
        supabase.from('produk').select('*, kategori:kategori_id(nama)').order('nama'),
        supabase.from('kategori').select('*').order('nama'),
        supabase.from('kontak').select('*').order('nama'),
        supabase.from('akun').select('*').order('kode_akun'),
        supabase
          .from('penawaran_penjualan')
          .select('*, customer:customer_id(nama, alamat, telepon), penawaran_penjualan_detail(*, produk:produk_id(nama, satuan, kode_sku))')
          .order('created_at', { ascending: false }),
        supabase
          .from('pesanan_penjualan')
          .select('*, customer:customer_id(nama, alamat, telepon), pesanan_penjualan_detail(*, produk:produk_id(nama, satuan, kode_sku))')
          .order('created_at', { ascending: false }),
        supabase
          .from('pengiriman_pesanan')
          .select('*, customer:customer_id(nama, alamat, telepon), pengiriman_pesanan_detail(*, produk:produk_id(nama, satuan, kode_sku))')
          .order('created_at', { ascending: false }),
        supabase
          .from('penjualan')
          .select('*, customer:customer_id(nama, alamat, telepon), penjualan_detail(*, produk:produk_id(nama, satuan, kode_sku))')
          .order('created_at', { ascending: false }),
        supabase
          .from('penerimaan_penjualan')
          .select('*, customer:customer_id(nama, alamat, telepon), pesanan:pesanan_id(no_pesanan, total, uang_muka, status_bayar), faktur:faktur_id(no_invoice, total_akhir), akun:akun_kas_id(nama_akun, kode_akun)')
          .order('created_at', { ascending: false }),
        supabase
          .from('jurnal')
          .select('*, jurnal_detail(*, akun:akun_id(kode_akun, nama_akun))')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('jurnal_detail').select('akun_id, debit, kredit'),
        supabase.from('satuan').select('*').order('nama'),
        supabase.from('pengaturan_perusahaan').select('*').eq('id', 'default').maybeSingle(),
        supabase.from('pembelian').select('*').order('created_at', { ascending: false }),
        supabase.from('pesanan_pembelian').select('*').order('created_at', { ascending: false }),
      ]);

      setProducts(prodData || []);
      setCategories(catData || []);
      setContacts(contData || []);
      setAccounts(accData || []);
      setQuotations(quoteData || []);
      setSalesOrders(soData || []);
      setDeliveryOrders(doData || []);
      setSalesInvoices(siData || []);
      setSalesPayments(payData || []);
      setJournals(jData || []);
      setAllJournalDetails(jdAllData || []);
      setSatuanList(satData || []);
      setPurchases(pData || []);
      setPurchaseOrders(poData || []);

      if (cfgData) {
        setCompanySettings((prev) => ({
          ...prev,
          namaPerusahaan: cfgData.nama_perusahaan || prev.namaPerusahaan,
          merkDagang: cfgData.merk_dagang || prev.merkDagang,
          alamat: cfgData.alamat || prev.alamat,
          telepon: cfgData.telepon || prev.telepon,
          email: cfgData.email || prev.email,
          npwp: cfgData.npwp || prev.npwp,
          rekeningBCA: cfgData.rekening_bca || prev.rekeningBCA,
          rekeningMandiri: cfgData.rekening_mandiri || prev.rekeningMandiri,
          ppnPersen: Number(cfgData.ppn_persen ?? prev.ppnPersen),
          ppnAktifDefault: Boolean(cfgData.ppn_aktif_default ?? prev.ppnAktifDefault),
        }));
      }

      const defBank = accData?.find((a) => a.kode_akun === '1102-01') || accData?.[0];
      if (defBank) setPayForm((p) => ({ ...p, bankAccountId: defBank.id }));

      await refreshDocNumbers();
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Supabase Auth Session & Realtime Listener with Fresh Server User Sync
  useEffect(() => {
    const syncFreshUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
        } else {
          const { data: { session } } = await supabase.auth.getSession();
          setCurrentUser(session?.user ?? null);
        }
      } catch (err) {
        console.warn('Sync fresh user error:', err);
      } finally {
        setIsAuthLoading(false);
      }
    };

    syncFreshUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          setCurrentUser(user || session.user);
        } catch {
          setCurrentUser(session.user);
        }
      } else {
        setCurrentUser(null);
      }
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setIsUserDropdownOpen(false);
      showToast('Anda telah keluar dari sesi kerja.', 'info', 'Logout Berhasil');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Hapus Akun Perkiraan (COA) Langsung dari Tabel Buku Besar
  const handleDeleteAccountDirect = async (acc) => {
    if (!acc || !acc.id) return;
    try {
      // 1. Cek apakah akun sudah digunakan dalam transaksi jurnal umum
      const { data: usageData, error: usageErr } = await supabase
        .from('jurnal_detail')
        .select('id')
        .eq('akun_id', acc.id)
        .limit(5);

      if (usageErr) throw usageErr;

      if (usageData && usageData.length > 0) {
        alert(
          `Akun "${acc.kode_akun} - ${acc.nama_akun}" sudah memiliki ${usageData.length}+ transaksi di Jurnal Umum.\n\nAkun yang memiliki riwayat transaksi tidak dapat dihapus agar laporan keuangan tetap akurat dan seimbang. Anda dapat mengubah nama atau kodenya melalui menu Setting Akun.`
        );
        return;
      }

      // 2. Konfirmasi penghapusan
      const confirmDelete = window.confirm(
        `Apakah Anda yakin ingin menghapus akun perkiraan ini?\n\nKode: ${acc.kode_akun}\nNama: ${acc.nama_akun}\n\nAkun ini akan dihapus dari daftar Buku Besar.`
      );
      if (!confirmDelete) return;

      // 3. Hapus dari Supabase
      const { error: delErr } = await supabase
        .from('akun')
        .delete()
        .eq('id', acc.id);

      if (delErr) throw delErr;

      showToast(
        `Akun ${acc.kode_akun} - ${acc.nama_akun} berhasil dihapus dari Buku Besar!`,
        'success',
        'Akun Dihapus'
      );
      await loadData();
    } catch (err) {
      console.error('Error deleting account:', err);
      alert(err.message || 'Gagal menghapus akun.');
    }
  };

  // Multi-Tab Handlers
  const openTab = (id, title, type, defaultView = 'list') => {
    // Check if the tab belongs to another module
    let targetModule = activeMenu;
    for (const [mod, tabs] of Object.entries(MODULE_TAB_SETS)) {
      if (tabs.some((t) => t.id === id)) {
        targetModule = mod;
        break;
      }
    }

    if (targetModule !== activeMenu) {
      setActiveMenu(targetModule);
      const tabSet = MODULE_TAB_SETS[targetModule];
      if (!tabSet.some((t) => t.id === id)) {
        setOpenTabs([...tabSet, { id, title, type, closable: true }]);
      } else {
        setOpenTabs(tabSet);
      }
    } else {
      if (!openTabs.some((t) => t.id === id)) {
        setOpenTabs([...openTabs, { id, title, type, closable: true }]);
      }
    }
    setActiveTabId(id);
    if (viewModes[id]) {
      setViewModes((prev) => ({ ...prev, [id]: defaultView }));
    }
    setFlyoutOpen(false);
  };

  const closeTab = (id, e) => {
    e.stopPropagation();
    const remaining = openTabs.filter((t) => t.id !== id);
    setOpenTabs(remaining);
    if (activeTabId === id) {
      setActiveTabId(remaining[0]?.id || 'so');
    }
  };

  // Helper Add Item to Form
  const addItemToForm = (formType, product) => {
    const newItem = {
      id: product.id,
      kode_sku: product.kode_sku,
      nama: product.nama,
      satuan: product.satuan,
      qty: 1,
      harga_jual: product.harga_jual,
      harga_beli: product.harga_beli,
      diskonPersen: 0,
      total: product.harga_jual,
    };

    if (formType === 'SO') {
      setSoForm((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    } else if (formType === 'QUOTE') {
      setQuoteForm((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    } else if (formType === 'DO') {
      setDoForm((prev) => ({
        ...prev,
        items: [
          ...prev.items,
          {
            id: product.id,
            kode_sku: product.kode_sku,
            nama: product.nama,
            satuan: product.satuan,
            qty: 1,
          },
        ],
      }));
    } else if (formType === 'SI') {
      setSiForm((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    }
  };

  // Calculations
  const calculateTotals = (items, discountAmount, ppnActive, ppnRateOverride) => {
    const subtotal = items.reduce((acc, i) => acc + (i.total || i.qty * i.harga_jual || 0), 0);
    const rate = Number(ppnRateOverride ?? companySettings?.ppnPersen ?? 11) / 100;
    const ppn = ppnActive ? Math.round(subtotal * rate) : 0;
    const grandTotal = Math.max(0, subtotal - Number(discountAmount || 0) + ppn);
    const totalHPP = items.reduce((acc, i) => acc + i.qty * (i.harga_beli || 0), 0);
    return { subtotal, ppn, grandTotal, totalHPP };
  };

  // ========================================================
  // ACCURATE ONLINE: SAVE TRANSACTIONS (CREATE & UPDATE SUPABASE)
  // ========================================================

  // 1. SIMPAN ATAU PERBARUI PESANAN PENJUALAN (PO)
  const handleSaveSO = async () => {
    if (!soForm.customerId) return showToast('Silakan pilih pelanggan kemasan terlebih dahulu!', 'warning');
    if (soForm.items.length === 0) return showToast('Tambahkan minimal 1 barang kemasan ke dalam pesanan!', 'warning');

    try {
      setLoading(true);
      const { grandTotal } = calculateTotals(soForm.items, soForm.discountAmount, soForm.ppnActive);

      // JIKA SEDANG MENGEDIT DOKUMEN YANG SUDAH ADA
      if (soForm.editingId) {
        const { error: updErr } = await supabase
          .from('pesanan_penjualan')
          .update({
            tanggal: soForm.date,
            customer_id: soForm.customerId,
            total: grandTotal,
            catatan: soForm.catatan,
            lampiran_url: soForm.lampiran_url || null,
          })
          .eq('id', soForm.editingId);
        if (updErr) throw updErr;

        // Refresh detail barang
        await supabase.from('pesanan_penjualan_detail').delete().eq('pesanan_id', soForm.editingId);
        const details = soForm.items.map((i) => ({
          pesanan_id: soForm.editingId,
          produk_id: i.id,
          qty: i.qty,
          harga_jual: i.harga_jual,
          subtotal: i.total || i.qty * i.harga_jual,
        }));
        await supabase.from('pesanan_penjualan_detail').insert(details);

        showToast(`Pesanan Penjualan ${soForm.soNo} berhasil diperbarui di Supabase!`, 'success', 'PO Diperbarui');
        await handleResetToNewSO();
        await loadData();
        setViewModes((prev) => ({ ...prev, so: 'list' }));
        return;
      }

      // JIKA MEMBUAT PESANAN BARU
      const docNo = await getNextDocNumber('PO', soForm.date);
      const { data: soH, error: hError } = await supabase
        .from('pesanan_penjualan')
        .insert({
          no_pesanan: docNo,
          tanggal: soForm.date,
          customer_id: soForm.customerId,
          total: grandTotal,
          status: 'MENUNGGU_PENGIRIMAN',
          status_bayar: 'BELUM_BAYAR',
          uang_muka: 0,
          catatan: soForm.catatan,
          lampiran_url: soForm.lampiran_url || null,
        })
        .select()
        .single();
      if (hError) throw hError;

      const details = soForm.items.map((i) => ({
        pesanan_id: soH.id,
        produk_id: i.id,
        qty: i.qty,
        harga_jual: i.harga_jual,
        subtotal: i.total || i.qty * i.harga_jual,
      }));
      await supabase.from('pesanan_penjualan_detail').insert(details);

      showToast(`Pesanan Penjualan ${docNo} berhasil disimpan!`, 'success', 'PO Berhasil Disimpan');
      await handleResetToNewSO();
      await loadData();
      setViewModes((prev) => ({ ...prev, so: 'list' }));
    } catch (e) {
      showToast('Gagal simpan PO: ' + e.message, 'error', 'Gagal Simpan PO');
    } finally {
      setLoading(false);
    }
  };

  // 2. SIMPAN ATAU PERBARUI PENAWARAN PENJUALAN (SQ)
  const handleSaveQuotation = async () => {
    if (!quoteForm.customerId) return showToast('Silakan pilih calon pelanggan terlebih dahulu!', 'warning');
    if (quoteForm.items.length === 0) return showToast('Tambahkan minimal 1 barang kemasan ke penawaran!', 'warning');

    try {
      setLoading(true);
      const { grandTotal } = calculateTotals(quoteForm.items, quoteForm.discountAmount, quoteForm.ppnActive);

      if (quoteForm.editingId) {
        const { error: qErr } = await supabase
          .from('penawaran_penjualan')
          .update({
            tanggal: quoteForm.date,
            customer_id: quoteForm.customerId,
            total: grandTotal,
            catatan: quoteForm.catatan,
            lampiran_url: quoteForm.lampiran_url || null,
          })
          .eq('id', quoteForm.editingId);
        if (qErr) throw qErr;

        await supabase.from('penawaran_penjualan_detail').delete().eq('penawaran_id', quoteForm.editingId);
        const details = quoteForm.items.map((i) => ({
          penawaran_id: quoteForm.editingId,
          produk_id: i.id,
          qty: i.qty,
          harga_jual: i.harga_jual,
          subtotal: i.total || i.qty * i.harga_jual,
        }));
        await supabase.from('penawaran_penjualan_detail').insert(details);

        showToast(`Proforma Invoice ${quoteForm.quoteNo} berhasil diperbarui!`, 'success', 'Proforma Invoice Diperbarui');
        await handleResetToNewQuote();
        await loadData();
        setViewModes((prev) => ({ ...prev, quotation: 'list' }));
        return;
      }

      const docNo = await getNextDocNumber('SQ', quoteForm.date);
      const { data: qH, error: qErr } = await supabase
        .from('penawaran_penjualan')
        .insert({
          no_penawaran: docNo,
          tanggal: quoteForm.date,
          customer_id: quoteForm.customerId,
          total: grandTotal,
          status: 'DISETUJUI',
          catatan: quoteForm.catatan,
          lampiran_url: quoteForm.lampiran_url || null,
        })
        .select()
        .single();
      if (qErr) throw qErr;

      const details = quoteForm.items.map((i) => ({
        penawaran_id: qH.id,
        produk_id: i.id,
        qty: i.qty,
        harga_jual: i.harga_jual,
        subtotal: i.total || i.qty * i.harga_jual,
      }));
      await supabase.from('penawaran_penjualan_detail').insert(details);

      showToast(`Proforma Invoice ${docNo} berhasil disimpan!`, 'success', 'Proforma Invoice Tersimpan');
      await handleResetToNewQuote();
      await loadData();
      setViewModes((prev) => ({ ...prev, quotation: 'list' }));
    } catch (e) {
      showToast('Gagal simpan Proforma Invoice: ' + e.message, 'error', 'Gagal Simpan PI');
    } finally {
      setLoading(false);
    }
  };

  // 3. SIMPAN ATAU PERBARUI PENGIRIMAN PESANAN (DO)
  const handleSaveDO = async () => {
    if (!doForm.customerId) return showToast('Silakan pilih pelanggan pengiriman!', 'warning');
    if (doForm.items.length === 0) return showToast('Tambahkan minimal 1 barang kemasan untuk dikirim!', 'warning');

    try {
      setLoading(true);

      if (doForm.editingId) {
        const { error: hError } = await supabase
          .from('pengiriman_pesanan')
          .update({
            tanggal: doForm.date,
            customer_id: doForm.customerId,
            pesanan_id: doForm.soId || null,
            ekspedisi: doForm.ekspedisi,
            no_resi: doForm.noResi,
            catatan: doForm.catatan,
            lampiran_url: doForm.lampiran_url || null,
          })
          .eq('id', doForm.editingId);
        if (hError) throw hError;

        await supabase.from('pengiriman_pesanan_detail').delete().eq('pengiriman_id', doForm.editingId);
        const details = doForm.items.map((i) => ({
          pengiriman_id: doForm.editingId,
          produk_id: i.id,
          qty: i.qty,
        }));
        await supabase.from('pengiriman_pesanan_detail').insert(details);

        showToast(`Surat Jalan ${doForm.doNo} berhasil diperbarui!`, 'success', 'Surat Jalan Diperbarui');
        await handleResetToNewDO();
        await loadData();
        setViewModes((prev) => ({ ...prev, do: 'list' }));
        return;
      }

      const docNo = await getNextDocNumber('DO', doForm.date);
      const { data: doH, error: hError } = await supabase
        .from('pengiriman_pesanan')
        .insert({
          no_surat_jalan: docNo,
          tanggal: doForm.date,
          customer_id: doForm.customerId,
          pesanan_id: doForm.soId || null,
          ekspedisi: doForm.ekspedisi,
          no_resi: doForm.noResi,
          status: 'TERKIRIM',
          catatan: doForm.catatan,
          lampiran_url: doForm.lampiran_url || null,
        })
        .select()
        .single();
      if (hError) throw hError;

      const details = doForm.items.map((i) => ({
        pengiriman_id: doH.id,
        produk_id: i.id,
        qty: i.qty,
      }));
      await supabase.from('pengiriman_pesanan_detail').insert(details);

      // Potong stok produk di gudang secara realtime dan catat di riwayat_stok
      for (const item of doForm.items) {
        const prod = products.find((p) => p.id === item.id);
        const currentStok = Number(prod?.stok || 0);
        const newStok = Math.max(0, currentStok - Number(item.qty || 0));
        await supabase
          .from('produk')
          .update({ stok: newStok, updated_at: new Date().toISOString() })
          .eq('id', item.id);

        await supabase.from('riwayat_stok').insert({
          produk_id: item.id,
          tipe: 'PENGIRIMAN_DO',
          qty: -Number(item.qty || 0),
          stok_akhir: newStok,
          keterangan: `Pengiriman via ${doForm.ekspedisi || 'Armada FAG'} (Surat Jalan ${docNo})`,
          no_referensi: docNo,
        });
      }

      if (doForm.soId) {
        await supabase.from('pesanan_penjualan').update({ status: 'SELESAI' }).eq('id', doForm.soId);
      }

      showToast(`Surat Jalan ${docNo} berhasil diterbitkan!`, 'success', 'Surat Jalan Terbit');
      await handleResetToNewDO();
      await loadData();
      setViewModes((prev) => ({ ...prev, do: 'list' }));
    } catch (e) {
      showToast('Gagal simpan DO: ' + e.message, 'error', 'Gagal Simpan DO');
    } finally {
      setLoading(false);
    }
  };

  // 4. SIMPAN ATAU PERBARUI FAKTUR PENJUALAN (SI)
  const handleSaveSalesInvoice = async () => {
    if (!siForm.customerId) return showToast('Silakan pilih pelanggan faktur!', 'warning');
    if (siForm.items.length === 0) return showToast('Pilih minimal 1 barang kemasan untuk difakturkan!', 'warning');

    try {
      setLoading(true);
      const { subtotal, ppn, grandTotal, totalHPP } = calculateTotals(
        siForm.items,
        siForm.discountAmount,
        siForm.ppnActive
      );
      const isCOD = siForm.termin === 'COD';

      if (siForm.editingId) {
        const { error: hError } = await supabase
          .from('penjualan')
          .update({
            tanggal: siForm.date,
            customer_id: siForm.customerId,
            total_bruto: subtotal,
            diskon: Number(siForm.discountAmount || 0),
            ppn_nominal: ppn,
            total_akhir: grandTotal,
            syarat_bayar: siForm.termin,
            tgl_jatuh_tempo: siForm.dueDate,
            catatan: siForm.catatan,
            lampiran_url: siForm.lampiran_url || null,
          })
          .eq('id', siForm.editingId);
        if (hError) throw hError;

        await supabase.from('penjualan_detail').delete().eq('penjualan_id', siForm.editingId);
        const details = siForm.items.map((i) => ({
          penjualan_id: siForm.editingId,
          produk_id: i.id,
          qty: i.qty,
          harga_jual: i.harga_jual,
          hpp: i.harga_beli,
          subtotal: i.total || i.qty * i.harga_jual,
        }));
        await supabase.from('penjualan_detail').insert(details);

        showToast(`Invoice ${siForm.invoiceNo} berhasil diperbarui!`, 'success', 'Invoice Diperbarui');
        await handleResetToNewSI();
        await loadData();
        setViewModes((prev) => ({ ...prev, si: 'list' }));
        return;
      }

      const dpAmount = Number(siForm.uangMuka || 0);
      const sisaPiutang = isCOD ? 0 : Math.max(0, grandTotal - dpAmount);
      const isLunas = isCOD || sisaPiutang === 0;

      const docNo = await getNextDocNumber('SI', siForm.date);
      const { data: siH, error: hError } = await supabase
        .from('penjualan')
        .insert({
          no_invoice: docNo,
          tanggal: siForm.date,
          customer_id: siForm.customerId,
          pesanan_id: siForm.soId || null,
          total_bruto: subtotal,
          diskon: Number(siForm.discountAmount || 0),
          ppn_nominal: ppn,
          total_akhir: grandTotal,
          bayar: isCOD ? grandTotal : dpAmount,
          kembali: 0,
          metode_bayar: isCOD ? 'TUNAI' : 'PIUTANG',
          status: isLunas ? 'LUNAS' : 'PIUTANG',
          syarat_bayar: siForm.termin,
          tgl_jatuh_tempo: siForm.dueDate,
          uang_muka_digunakan: dpAmount,
          catatan: siForm.catatan,
          lampiran_url: siForm.lampiran_url || null,
        })
        .select()
        .single();
      if (hError) throw hError;

      const details = siForm.items.map((i) => ({
        penjualan_id: siH.id,
        produk_id: i.id,
        qty: i.qty,
        harga_jual: i.harga_jual,
        hpp: i.harga_beli,
        subtotal: i.total || i.qty * i.harga_jual,
      }));
      await supabase.from('penjualan_detail').insert(details);

      // ACCURATE ONLINE / GAAP PARITY UNTUK STOK PENJUALAN:
      // Catatan: Trigger PostgreSQL `trg_penjualan_kurang_stok` otomatis memotong stok saat penjualan_detail di-insert.
      // - Kasus A: Jika Faktur Penjualan (SI) dibuat DARI Surat Jalan (DO), stok fisik SUDAH keluar dari gudang saat DO terbit!
      //   Maka potongan otomatis dari trigger harus kita kembalikan (revert) agar tidak dobel potong!
      // - Kasus B: Jika Faktur Penjualan (SI) dibuat LANGSUNG (tanpa DO / kasir langsung), trigger database sudah otomatis memotong stok dan mencatat riwayat_stok.
      if (siForm.doId) {
        for (const item of siForm.items) {
          const { data: curProd } = await supabase.from('produk').select('stok').eq('id', item.id).single();
          const restoredStok = Number(curProd?.stok || 0) + Number(item.qty || 0);
          await supabase
            .from('produk')
            .update({ stok: restoredStok, updated_at: new Date().toISOString() })
            .eq('id', item.id);

          // Hapus baris duplikasi mutasi dari trigger untuk no_invoice ini
          await supabase.from('riwayat_stok').delete().eq('no_referensi', docNo).eq('produk_id', item.id);
        }
      }

      // 2. Update status referensi pesanan / pengiriman (Accurate Parity)
      if (siForm.soId) {
        await supabase
          .from('pesanan_penjualan')
          .update({ status: 'SELESAI' })
          .eq('id', siForm.soId);
      }
      if (siForm.doId) {
        await supabase
          .from('pengiriman_pesanan')
          .update({ status: 'SELESAI' })
          .eq('id', siForm.doId);
      }

      // Post Balanced Journal Entry (GAAP / PSAK Accounting)
      const lines = [];
      if (isCOD) {
        lines.push({
          kodeAkun: '1101-01',
          debit: grandTotal,
          kredit: 0,
          catatan: 'Kas Penjualan (COD)',
        });
      } else {
        if (sisaPiutang > 0) {
          lines.push({
            kodeAkun: '1103-01',
            debit: sisaPiutang,
            kredit: 0,
            catatan: 'Piutang Usaha (Sisa Tagihan Invoice)',
          });
        }
        if (dpAmount > 0) {
          lines.push({
            kodeAkun: '2103-01',
            debit: dpAmount,
            kredit: 0,
            catatan: 'Alokasi / Pemotongan Uang Muka Penjualan (DP)',
          });
        }
      }

      if (Number(siForm.discountAmount) > 0) {
        lines.push({
          kodeAkun: '4102-01',
          debit: Number(siForm.discountAmount),
          kredit: 0,
          catatan: 'Potongan Penjualan',
        });
      }
      lines.push({
        kodeAkun: '4101-01',
        debit: 0,
        kredit: subtotal,
        catatan: 'Pendapatan Penjualan Kemasan',
      });
      if (ppn > 0) {
        lines.push({
          kodeAkun: '2102-01', // Hutang PPN (PPN Keluaran)
          debit: 0,
          kredit: ppn,
          catatan: 'Hutang PPN Keluaran',
        });
      }
      if (totalHPP > 0) {
        lines.push({
          kodeAkun: '5101-01',
          debit: totalHPP,
          kredit: 0,
          catatan: 'Beban Pokok Penjualan (HPP)',
        });
        lines.push({
          kodeAkun: '1104-01',
          debit: 0,
          kredit: totalHPP,
          catatan: 'Persediaan Barang Dagang (Kemasan)',
        });
      }

      await createJournalEntry({
        noJurnal: `JU.${docNo}`,
        tanggal: siForm.date,
        tipeTransaksi: 'PENJUALAN',
        noReferensi: docNo,
        keterangan: `Invoice No. ${docNo}`,
        details: lines,
      });

      showToast(`Invoice ${docNo} berhasil diterbitkan!`, 'success', 'Invoice Terbit');
      await handleResetToNewSI();
      await loadData();
      setViewModes((prev) => ({ ...prev, si: 'list' }));
    } catch (e) {
      showToast('Gagal simpan Invoice: ' + e.message, 'error', 'Gagal Simpan Invoice');
    } finally {
      setLoading(false);
    }
  };

  // 5. SIMPAN PELUNASAN PIUTANG (CR)
  const handleSavePayment = async () => {
    if (!payForm.customerId || !payForm.invoiceId || Number(payForm.amount) <= 0) {
      return showToast('Lengkapi data pelanggan, faktur piutang, dan nominal pelunasan!', 'warning');
    }
    try {
      setLoading(true);

      if (payForm.editingId) {
        await supabase
          .from('penerimaan_penjualan')
          .update({
            tanggal: payForm.date,
            customer_id: payForm.customerId,
            faktur_id: payForm.invoiceId,
            akun_kas_id: payForm.bankAccountId,
            total_bayar: Number(payForm.amount),
            catatan: payForm.catatan,
            lampiran_url: payForm.lampiran_url || null,
          })
          .eq('id', payForm.editingId);

        showToast(`Penerimaan Pembayaran ${payForm.receiptNo} berhasil diperbarui!`, 'success', 'Perubahan Tersimpan');
        await handleResetToNewPayment();
        await loadData();
        setViewModes((prev) => ({ ...prev, payment: 'list' }));
        return;
      }
      const docNo = await getNextDocNumber('CR', payForm.date);

      await supabase.from('penerimaan_penjualan').insert({
        no_bukti: docNo,
        tanggal: payForm.date,
        customer_id: payForm.customerId,
        faktur_id: payForm.invoiceId,
        akun_kas_id: payForm.bankAccountId,
        total_bayar: Number(payForm.amount),
        metode_bayar: 'TRANSFER',
        tipe_penerimaan: 'PELUNASAN_FAKTUR',
        catatan: payForm.catatan,
        lampiran_url: payForm.lampiran_url || null,
      });

      const currentInv = salesInvoices.find((i) => i.id === payForm.invoiceId);
      const newBayar = Number(currentInv?.bayar || 0) + Number(payForm.amount);
      const totalAkhir = Number(currentInv?.total_akhir || 0);
      const isLunasNow = newBayar >= totalAkhir;

      await supabase
        .from('penjualan')
        .update({
          status: isLunasNow ? 'LUNAS' : 'PIUTANG',
          bayar: newBayar,
        })
        .eq('id', payForm.invoiceId);

      // Post Balanced Journal Entry (Debit: Kas/Bank, Kredit: Piutang Usaha)
      const targetAccount = accounts.find((a) => a.id === payForm.bankAccountId);
      const debitAccountCode = targetAccount?.kode_akun || '1102-01';
      const refDoc = currentInv?.no_invoice || docNo;

      await createJournalEntry({
        noJurnal: `JU.${docNo}`,
        tanggal: payForm.date,
        tipeTransaksi: 'PENERIMAAN_PENJUALAN',
        noReferensi: refDoc,
        keterangan: `Pelunasan Invoice ${refDoc} via ${targetAccount?.nama_akun || 'Bank/Kas'}`,
        details: [
          {
            kodeAkun: debitAccountCode,
            debit: Number(payForm.amount),
            kredit: 0,
            catatan: `Penerimaan Kas/Bank via ${targetAccount?.nama_akun || 'Bank/Kas'}`,
          },
          {
            kodeAkun: '1103-01',
            debit: 0,
            kredit: Number(payForm.amount),
            catatan: `Pelunasan Piutang Invoice ${refDoc}`,
          },
        ],
      });

      showToast(`Pelunasan Invoice ${docNo} berhasil dicatat & diposting ke Buku Besar!`, 'success', 'Pelunasan Kas Berhasil');
      setPayForm((prev) => ({
        ...prev,
        invoiceId: '',
        amount: 0,
        catatan: '',
        customerId: '',
      }));
      await loadData();
      setViewModes((prev) => ({ ...prev, payment: 'list' }));
    } catch (e) {
      showToast('Gagal simpan Pelunasan: ' + e.message, 'error', 'Gagal Simpan Pelunasan');
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // MASTER SATUAN KEMASAN (SUPABASE LIVE MANAGEMENT)
  // ========================================================
  const handleAddSatuan = async (namaSatuan) => {
    if (!namaSatuan || !namaSatuan.trim()) return;
    const clean = namaSatuan.trim();
    try {
      const { data, error } = await supabase.from('satuan').insert({ nama: clean }).select().single();
      if (error) {
        if (error.code === '23505') {
          showToast(`Satuan "${clean}" sudah terdaftar sebelumnya.`, 'info');
          return;
        }
        throw error;
      }
      setSatuanList((prev) => [...prev, data].sort((a, b) => a.nama.localeCompare(b.nama)));
      showToast(`Satuan "${clean}" berhasil ditambahkan ke Supabase!`, 'success');
      setNewSatuanInput('');
    } catch (err) {
      console.error('Gagal tambah satuan:', err);
      showToast('Gagal tambah satuan: ' + err.message, 'error');
    }
  };

  const handleDeleteSatuan = async (id, nama) => {
    try {
      const { error } = await supabase.from('satuan').delete().eq('id', id);
      if (error) throw error;
      setSatuanList((prev) => prev.filter((s) => s.id !== id));
      showToast(`Satuan "${nama}" dihapus dari Supabase.`, 'success');
    } catch (err) {
      console.error('Gagal hapus satuan:', err);
      showToast('Gagal hapus satuan: ' + err.message, 'error');
    }
  };

  // ========================================================
  // MASTER KATEGORI KEMASAN (SUPABASE LIVE MANAGEMENT)
  // ========================================================
  const handleAddKategori = async (namaKategori, deskripsi = '') => {
    if (!namaKategori || !namaKategori.trim()) {
      showToast('Nama kategori wajib diisi!', 'warning', 'Validasi');
      return;
    }
    const clean = namaKategori.trim();
    try {
      const { data, error } = await supabase
        .from('kategori')
        .insert({ nama: clean, keterangan: deskripsi?.trim() || null })
        .select()
        .single();
      if (error) {
        if (error.code === '23505') {
          showToast(`Kategori "${clean}" sudah terdaftar sebelumnya.`, 'info', 'Kategori Ada');
          return;
        }
        throw error;
      }
      setCategories((prev) => [...prev, data].sort((a, b) => a.nama.localeCompare(b.nama)));
      showToast(`Kategori "${clean}" berhasil ditambahkan ke database!`, 'success', 'Kategori Baru');
      setNewKategoriInput('');
      setNewKategoriDescInput('');
    } catch (err) {
      console.error('Gagal tambah kategori:', err);
      showToast('Gagal tambah kategori: ' + err.message, 'error', 'Error');
    }
  };

  const handleDeleteKategori = async (kategoriId, namaKategori) => {
    try {
      // Periksa apakah kategori ini sedang digunakan oleh produk kemasan
      const usedInProducts = (products || []).filter(
        (p) => p.kategori_id === kategoriId || p.kategori?.nama === namaKategori
      );
      if (usedInProducts.length > 0) {
        showToast(
          `Kategori "${namaKategori}" masih digunakan oleh ${usedInProducts.length} barang kemasan. Silakan ubah kategori produk terkait sebelum menghapus.`,
          'warning',
          'Tidak Dapat Dihapus'
        );
        return;
      }

      const { error } = await supabase.from('kategori').delete().eq('id', kategoriId);
      if (error) throw error;
      setCategories((prev) => prev.filter((c) => c.id !== kategoriId));
      showToast(`Kategori "${namaKategori}" berhasil dihapus dari database.`, 'info', 'Kategori Dihapus');
    } catch (err) {
      console.error('Gagal hapus kategori:', err);
      showToast('Gagal hapus kategori: ' + err.message, 'error', 'Error');
    }
  };

  // ========================================================
  // ACCURATE ONLINE: UANG MUKA / DOWN PAYMENT (PO & FAKTUR)
  // ========================================================
  const handleSubmitDownPayment = async (payload) => {
    const {
      sourceType,
      customerId,
      orderId,
      noPesanan,
      invoiceId,
      noFaktur,
      manualRef,
      amount,
      date,
      accountId,
      paymentMethod,
      isTaxable,
      taxAmount,
      catatan,
    } = payload;
    setLoading(true);
    try {
      const docNo = await getNextDocNumber('DP', date);
      let tipePenerimaan = 'UANG_MUKA_PESANAN';
      if (sourceType === 'SI') tipePenerimaan = 'UANG_MUKA_FAKTUR';
      if (sourceType === 'DEPOSIT') tipePenerimaan = 'DEPOSIT_PELANGGAN';

      // 1. Simpan ke penerimaan_penjualan
      const { error: pError } = await supabase.from('penerimaan_penjualan').insert({
        no_bukti: docNo,
        tanggal: date,
        customer_id: customerId,
        pesanan_id: sourceType === 'PO' ? orderId : null,
        faktur_id: sourceType === 'SI' ? invoiceId : null,
        tipe_penerimaan: tipePenerimaan,
        akun_kas_id: accountId,
        total_bayar: Number(amount),
        metode_bayar: paymentMethod || 'TRANSFER',
        lampiran_url: payload.lampiran_url || null,
        catatan:
          catatan ||
          `Uang muka ${
            sourceType === 'PO'
              ? `pesanan ${noPesanan}`
              : sourceType === 'SI'
              ? `faktur ${noFaktur}`
              : manualRef || 'deposit pelanggan'
          }`,
      });
      if (pError) throw pError;

      // 2. Update pesanan_penjualan atau penjualan (faktur)
      if (sourceType === 'PO' && orderId) {
        const currentOrder = salesOrders.find((o) => o.id === orderId);
        const newTotalDP = Number(currentOrder?.uang_muka || 0) + Number(amount);
        const totalOrder = Number(currentOrder?.total || 0);
        const statusBayar = newTotalDP >= totalOrder ? 'LUNAS' : 'SEBAGIAN_DP';

        const { error: soUpdErr } = await supabase
          .from('pesanan_penjualan')
          .update({
            uang_muka: newTotalDP,
            status_bayar: statusBayar,
          })
          .eq('id', orderId);
        if (soUpdErr) throw soUpdErr;

        setSoForm((prev) =>
          prev.editingId === orderId
            ? {
                ...prev,
                uangMuka: newTotalDP,
                statusBayar: newTotalDP >= totalOrder ? 'LUNAS' : 'SEBAGIAN_DP',
              }
            : prev
        );
      } else if (sourceType === 'SI' && invoiceId) {
        const currentInvoice = salesInvoices.find((i) => i.id === invoiceId);
        const newBayar = Number(currentInvoice?.bayar || 0) + Number(amount);
        const totalInv = Number(currentInvoice?.total_akhir || 0);
        const statusInv = newBayar >= totalInv ? 'LUNAS' : 'BELUM_LUNAS';

        const { error: siUpdErr } = await supabase
          .from('penjualan')
          .update({
            bayar: newBayar,
            status: statusInv,
          })
          .eq('id', invoiceId);
        if (siUpdErr) throw siUpdErr;

        if (statusInv === 'LUNAS' && currentInvoice?.pesanan_id) {
          await supabase
            .from('pesanan_penjualan')
            .update({ status_bayar: 'LUNAS' })
            .eq('id', currentInvoice.pesanan_id);
        }
      }

      // 3. Jurnal Finansial Otomatis (GAAP/PSAK):
      // Debit: Kas/Bank (1101-01 / 1102-01)
      // Kredit: 2103-01 (Uang Muka Penjualan) atau 1103-01 (Piutang Usaha jika SI)
      const targetAccount = accounts.find((a) => a.id === accountId);
      const debitAccountCode = targetAccount?.kode_akun || '1102-01';
      const creditAccountCode = sourceType === 'SI' ? '1103-01' : '2103-01';

      const journalDetails = [
        {
          kodeAkun: debitAccountCode,
          debit: Number(amount),
          kredit: 0,
          catatan: `Kas/Bank Uang Muka via ${targetAccount?.nama_akun || 'Bank/Kas'}`,
        },
        {
          kodeAkun: creditAccountCode,
          debit: 0,
          kredit: Number(amount),
          catatan: `${
            sourceType === 'SI'
              ? 'Pembayaran Piutang Faktur ' + noFaktur
              : 'Uang Muka Penjualan ' + (noPesanan || manualRef || docNo)
          }`,
        },
      ];

      if (isTaxable && Number(taxAmount) > 0) {
        journalDetails.push({
          kodeAkun: '2102-01',
          debit: 0,
          kredit: Number(taxAmount),
          catatan: `Hutang PPN Uang Muka (${docNo})`,
        });
      }

      await createJournalEntry({
        noJurnal: `JU.${docNo}`,
        tanggal: date,
        tipeTransaksi: 'PENERIMAAN_DP',
        noReferensi: noPesanan || noFaktur || docNo,
        keterangan: `Penerimaan Uang Muka (${sourceType}) No. ${docNo}`,
        details: journalDetails,
      });

      showToast(
        `Uang Muka Rp ${Number(amount).toLocaleString('id-ID')} (${docNo}) berhasil dicatat & diposting ke Buku Besar!`,
        'success',
        'Uang Muka Diterima'
      );
      await loadData();
    } catch (err) {
      console.error('Error submitting down payment:', err);
      showToast('Gagal memproses uang muka: ' + err.message, 'error', 'Error Uang Muka');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDPModal = (doc = null, defaultSource = 'PO') => {
    setSelectedDpOrder(doc);
    setSelectedDpSource(defaultSource || 'PO');
    setIsDpModalOpen(true);
  };

  // ========================================================
  // ACCURATE ONLINE: DELETE TRANSACTIONS (CASCADING SUPABASE)
  // ========================================================
  const handleDeleteDP = async (id, noBukti, pesananId, amount, fakturId) => {
    setLoading(true);
    try {
      await supabase.from('penerimaan_penjualan').delete().eq('id', id);

      if (pesananId) {
        const order = salesOrders.find((o) => o.id === pesananId);
        if (order) {
          const newUangMuka = Math.max(0, Number(order.uang_muka || 0) - Number(amount || 0));
          const statusBayar =
            newUangMuka >= order.total ? 'LUNAS' : newUangMuka > 0 ? 'SEBAGIAN_DP' : 'BELUM_BAYAR';
          await supabase
            .from('pesanan_penjualan')
            .update({
              uang_muka: newUangMuka,
              status_bayar: statusBayar,
            })
            .eq('id', pesananId);
        }
      }

      if (fakturId) {
        const inv = salesInvoices.find((i) => i.id === fakturId);
        if (inv) {
          const newBayar = Math.max(0, Number(inv.bayar || 0) - Number(amount || 0));
          const statusInv = newBayar >= inv.total_akhir ? 'LUNAS' : 'BELUM_LUNAS';
          await supabase
            .from('penjualan')
            .update({
              bayar: newBayar,
              status: statusInv,
            })
            .eq('id', fakturId);
        }
      }

      showToast(`Uang Muka ${noBukti} berhasil dihapus permanen dari Supabase!`, 'success', 'DP Dihapus');
      setDeleteConfirmDoc(null);
      await loadData();
    } catch (err) {
      console.error('Error delete DP:', err);
      showToast('Gagal menghapus uang muka: ' + err.message, 'error', 'Gagal Hapus');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePO = async (id, noDoc) => {
    setLoading(true);
    try {
      await supabase.from('pesanan_penjualan_detail').delete().eq('pesanan_id', id);
      await supabase.from('penerimaan_penjualan').delete().eq('pesanan_id', id);
      const { error } = await supabase.from('pesanan_penjualan').delete().eq('id', id);
      if (error) throw error;

      showToast(`Pesanan Penjualan ${noDoc} berhasil dihapus permanen dari Supabase!`, 'success', 'PO Terhapus');
      setDeleteConfirmDoc(null);
      await handleResetToNewSO();
      await loadData();
      setViewModes((prev) => ({ ...prev, so: 'list' }));
    } catch (err) {
      console.error('Error delete PO:', err);
      showToast('Gagal menghapus pesanan: ' + err.message, 'error', 'Gagal Hapus');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuote = async (id, noDoc) => {
    setLoading(true);
    try {
      await supabase.from('penawaran_penjualan_detail').delete().eq('penawaran_id', id);
      const { error } = await supabase.from('penawaran_penjualan').delete().eq('id', id);
      if (error) throw error;

      showToast(`Proforma Invoice ${noDoc} berhasil dihapus dari Supabase!`, 'success', 'PI Terhapus');
      setDeleteConfirmDoc(null);
      await handleResetToNewQuote();
      await loadData();
      setViewModes((prev) => ({ ...prev, quotation: 'list' }));
    } catch (err) {
      console.error('Error delete SQ:', err);
      showToast('Gagal menghapus Proforma Invoice: ' + err.message, 'error', 'Gagal Hapus');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDO = async (id, noDoc) => {
    setLoading(true);
    try {
      await supabase.from('pengiriman_pesanan_detail').delete().eq('pengiriman_id', id);
      const { error } = await supabase.from('pengiriman_pesanan').delete().eq('id', id);
      if (error) throw error;

      showToast(`Surat Jalan ${noDoc} berhasil dihapus dari Supabase!`, 'success', 'DO Terhapus');
      setDeleteConfirmDoc(null);
      await handleResetToNewDO();
      await loadData();
      setViewModes((prev) => ({ ...prev, do: 'list' }));
    } catch (err) {
      console.error('Error delete DO:', err);
      showToast('Gagal menghapus surat jalan: ' + err.message, 'error', 'Gagal Hapus');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSI = async (id, noDoc) => {
    setLoading(true);
    try {
      await supabase.from('penjualan_detail').delete().eq('penjualan_id', id);
      await supabase.from('penerimaan_penjualan').delete().eq('faktur_id', id);
      const { error } = await supabase.from('penjualan').delete().eq('id', id);
      if (error) throw error;

      showToast(`Invoice ${noDoc} berhasil dihapus dari Supabase!`, 'success', 'Invoice Terhapus');
      setDeleteConfirmDoc(null);
      await handleResetToNewSI();
      await loadData();
      setViewModes((prev) => ({ ...prev, si: 'list' }));
    } catch (err) {
      console.error('Error delete SI:', err);
      showToast('Gagal menghapus Invoice: ' + err.message, 'error', 'Gagal Hapus');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteManualJournal = async (journalId, noJurnal) => {
    if (!window.confirm(`Hapus jurnal transaksi ${noJurnal}? Saldo akun kas & bank akan otomatis dikembalikan ke posisi semula.`)) return;
    setLoading(true);
    try {
      await deleteJournalEntry(journalId);
      showToast(`Jurnal ${noJurnal} berhasil dihapus! Saldo kas & bank telah disesuaikan kembali.`, 'success', 'Jurnal Dihapus');
      await loadData();
    } catch (err) {
      console.error('Error delete journal:', err);
      showToast('Gagal menghapus jurnal: ' + err.message, 'error', 'Gagal Hapus');
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // CLICK-TO-EDIT & RESET FORM HANDLERS (ALL SUB-MODULES)
  // ========================================================

  // 1. PO: Buka untuk Edit vs Form Baru
  const handleOpenSO = (order) => {
    setSoForm({
      editingId: order.id,
      soNo: order.no_pesanan,
      date: order.tanggal,
      customerId: order.customer_id,
      poCustomer: order.no_po_customer || '',
      items: (order.pesanan_penjualan_detail || []).map((d) => ({
        id: d.produk_id,
        kode_sku: d.produk?.kode_sku || '',
        nama: d.produk?.nama || '',
        satuan: d.satuan || d.produk?.satuan || 'Pcs',
        qty: Number(d.qty || 0),
        harga_jual: Number(d.harga_jual || 0),
        harga_beli: Number(d.hpp || d.produk?.harga_beli || 0),
        diskonPersen: Number(d.diskon_persen || 0),
        total: Number(d.subtotal || (d.qty * d.harga_jual) || 0),
      })),
      discountAmount: Number(order.diskon || 0),
      ppnActive: Boolean(order.ppn_nominal && Number(order.ppn_nominal) > 0),
      catatan: order.catatan || '',
      lampiran_url: order.lampiran_url || '',
      uangMuka: Number(order.uang_muka || 0),
      statusBayar: order.status_bayar || 'BELUM_BAYAR',
      status: order.status,
    });
    setViewModes((p) => ({ ...p, so: 'form' }));
  };

  const handleResetToNewSO = async () => {
    const today = new Date().toISOString().split('T')[0];
    const nextNo = await peekNextDocNumber('PO', today);
    setSoForm({
      editingId: null,
      soNo: nextNo || `PO.${new Date().getFullYear()}.${(new Date().getMonth() + 1).toString().padStart(2, '0')}.${new Date().getDate().toString().padStart(2, '0')}.0001`,
      date: today,
      customerId: '',
      poCustomer: '',
      items: [],
      discountAmount: 0,
      ppnActive: Boolean(companySettings.ppnAktifDefault),
      catatan: '',
      lampiran_url: '',
      uangMuka: 0,
      statusBayar: 'BELUM_BAYAR',
      status: 'MENUNGGU_PENGIRIMAN',
    });
    setViewModes((p) => ({ ...p, so: 'form' }));
  };

  // 2. SQ: Buka untuk Edit vs Form Baru
  const handleOpenQuote = (quote) => {
    setQuoteForm({
      editingId: quote.id,
      quoteNo: quote.no_penawaran,
      date: quote.tanggal,
      customerId: quote.customer_id,
      items: (quote.penawaran_penjualan_detail || []).map((d) => ({
        id: d.produk_id,
        kode_sku: d.produk?.kode_sku || '',
        nama: d.produk?.nama || '',
        satuan: d.satuan || d.produk?.satuan || 'Pcs',
        qty: Number(d.qty || 0),
        harga_jual: Number(d.harga_jual || 0),
        harga_beli: Number(d.hpp || d.produk?.harga_beli || 0),
        diskonPersen: Number(d.diskon_persen || 0),
        total: Number(d.subtotal || (d.qty * d.harga_jual) || 0),
      })),
      discountAmount: Number(quote.diskon || 0),
      ppnActive: Boolean(quote.ppn_nominal && Number(quote.ppn_nominal) > 0),
      catatan: quote.catatan || '',
      lampiran_url: quote.lampiran_url || '',
      status: quote.status,
    });
    setViewModes((p) => ({ ...p, quotation: 'form' }));
  };

  const handleResetToNewQuote = async () => {
    const today = new Date().toISOString().split('T')[0];
    const nextNo = await peekNextDocNumber('SQ', today);
    setQuoteForm({
      editingId: null,
      quoteNo: nextNo || `SQ.${new Date().getFullYear()}.${(new Date().getMonth() + 1).toString().padStart(2, '0')}.${new Date().getDate().toString().padStart(2, '0')}.0001`,
      date: today,
      customerId: '',
      items: [],
      discountAmount: 0,
      ppnActive: Boolean(companySettings.ppnAktifDefault),
      catatan: '',
      lampiran_url: '',
      status: 'DISETUJUI',
    });
    setViewModes((p) => ({ ...p, quotation: 'form' }));
  };

  // 3. DO: Buka untuk Edit vs Form Baru
  const handleOpenDO = (doItem) => {
    setDoForm({
      editingId: doItem.id,
      doNo: doItem.no_surat_jalan,
      date: doItem.tanggal,
      customerId: doItem.customer_id,
      soId: doItem.pesanan_id || '',
      ekspedisi: doItem.ekspedisi || 'Armada Pengiriman FAG Kemasan',
      noResi: doItem.no_resi || '',
      items: (doItem.pengiriman_pesanan_detail || []).map((d) => ({
        id: d.produk_id,
        kode_sku: d.produk?.kode_sku || '',
        nama: d.produk?.nama || '',
        satuan: d.satuan || d.produk?.satuan || 'Pcs',
        qty: Number(d.qty || 0),
      })),
      catatan: doItem.catatan || '',
      lampiran_url: doItem.lampiran_url || '',
      status: doItem.status,
    });
    setViewModes((p) => ({ ...p, do: 'form' }));
  };

  const handleResetToNewDO = async () => {
    const today = new Date().toISOString().split('T')[0];
    const nextNo = await peekNextDocNumber('DO', today);
    setDoForm({
      editingId: null,
      doNo: nextNo || `DO.${new Date().getFullYear()}.${(new Date().getMonth() + 1).toString().padStart(2, '0')}.${new Date().getDate().toString().padStart(2, '0')}.0001`,
      date: today,
      customerId: '',
      soId: '',
      ekspedisi: 'Armada Pengiriman FAG Kemasan',
      noResi: '',
      items: [],
      catatan: '',
      lampiran_url: '',
      status: 'TERKIRIM',
    });
    setViewModes((p) => ({ ...p, do: 'form' }));
  };

  // 4. SI: Buka untuk Edit vs Form Baru
  const handleOpenSI = (invoice) => {
    setSiForm({
      editingId: invoice.id,
      invoiceNo: invoice.no_invoice,
      date: invoice.tanggal,
      customerId: invoice.customer_id,
      soId: invoice.pesanan_id || null,
      doId: null,
      termin: invoice.syarat_bayar || 'Net 30',
      dueDate: invoice.tgl_jatuh_tempo || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: (invoice.penjualan_detail || []).map((d) => ({
        id: d.produk_id,
        kode_sku: d.produk?.kode_sku || '',
        nama: d.produk?.nama || '',
        satuan: d.satuan || d.produk?.satuan || 'Pcs',
        qty: Number(d.qty || 0),
        harga_jual: Number(d.harga_jual || 0),
        harga_beli: Number(d.hpp || d.produk?.harga_beli || 0),
        diskonPersen: Number(d.diskon_persen || 0),
        total: Number(d.subtotal || (d.qty * d.harga_jual) || 0),
      })),
      discountAmount: Number(invoice.diskon || 0),
      ppnActive: Boolean(invoice.ppn_nominal && Number(invoice.ppn_nominal) > 0),
      uangMuka: Number(invoice.uang_muka || 0),
      catatan: invoice.catatan || '',
      lampiran_url: invoice.lampiran_url || '',
      status: invoice.status,
    });
    setViewModes((p) => ({ ...p, si: 'form' }));
  };

  const handleResetToNewSI = async () => {
    const today = new Date().toISOString().split('T')[0];
    const nextNo = await peekNextDocNumber('SI', today);
    setSiForm({
      editingId: null,
      invoiceNo: nextNo || `SI.${new Date().getFullYear()}.${(new Date().getMonth() + 1).toString().padStart(2, '0')}.${new Date().getDate().toString().padStart(2, '0')}.0001`,
      date: today,
      customerId: '',
      soId: null,
      doId: null,
      termin: 'Net 30',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [],
      discountAmount: 0,
      ppnActive: Boolean(companySettings.ppnAktifDefault),
      uangMuka: 0,
      catatan: '',
      lampiran_url: '',
      status: 'PIUTANG',
    });
    setViewModes((p) => ({ ...p, si: 'form' }));
  };

  // 5. CR: Form Baru & Edit Penerimaan Kas
  const handleResetToNewPayment = async () => {
    const today = new Date().toISOString().split('T')[0];
    const nextNo = await peekNextDocNumber('CR', today);
    setPayForm({
      editingId: null,
      receiptNo: nextNo || `CR.${new Date().getFullYear()}.${(new Date().getMonth() + 1).toString().padStart(2, '0')}.${new Date().getDate().toString().padStart(2, '0')}.0001`,
      date: today,
      customerId: '',
      invoiceId: '',
      bankAccountId: accounts?.find((a) => a.kode_akun === '1102-01')?.id || accounts?.[0]?.id || '',
      amount: 0,
      catatan: '',
      lampiran_url: '',
    });
    setViewModes((p) => ({ ...p, payment: 'form' }));
  };

  const handleOpenPayment = (p) => {
    setPayForm({
      editingId: p.id,
      receiptNo: p.no_bukti,
      date: p.tanggal,
      customerId: p.customer_id,
      invoiceId: p.faktur_id,
      bankAccountId: p.akun_kas_id || accounts?.find((a) => a.kode_akun === '1102-01')?.id || accounts?.[0]?.id || '',
      amount: Number(p.total_bayar || 0),
      catatan: p.catatan || '',
      lampiran_url: p.lampiran_url || '',
    });
    setViewModes((prev) => ({ ...prev, payment: 'form' }));
  };

  const handleDeletePayment = async (id, noDoc, fakturId, amount) => {
    setLoading(true);
    try {
      const { error: pErr } = await supabase.from('penerimaan_penjualan').delete().eq('id', id);
      if (pErr) throw pErr;

      if (fakturId) {
        const inv = salesInvoices.find((i) => i.id === fakturId);
        if (inv) {
          const newBayar = Math.max(0, Number(inv.bayar || 0) - Number(amount || 0));
          const totalAkhir = Number(inv.total_akhir || 0);
          const statusInv = newBayar >= totalAkhir ? 'LUNAS' : 'PIUTANG';
          await supabase
            .from('penjualan')
            .update({
              bayar: newBayar,
              status: statusInv,
            })
            .eq('id', fakturId);
        }
      }

      try {
        await deleteJournalEntry('PENERIMAAN_PENJUALAN', noDoc);
      } catch (jErr) {
        console.warn('Skip delete journal:', jErr);
      }

      showToast(`Penerimaan Pembayaran ${noDoc} berhasil dihapus dari Supabase!`, 'success', 'Pelunasan Terhapus');
      setDeleteConfirmDoc(null);
      await handleResetToNewPayment();
      await loadData();
      setViewModes((prev) => ({ ...prev, payment: 'list' }));
    } catch (err) {
      console.error('Error delete payment:', err);
      showToast('Gagal menghapus penerimaan: ' + err.message, 'error', 'Gagal Hapus');
    } finally {
      setLoading(false);
    }
  };

  // Workflow Handlers: Complete Accurate Pipeline (PI -> PO -> DO/DP -> INV -> CR)
  const flowSQtoPO = async (sq) => {
    const today = new Date().toISOString().split('T')[0];
    const nextNo = await peekNextDocNumber('PO', today);
    setSoForm((prev) => ({
      ...prev,
      editingId: null,
      soNo: nextNo,
      date: today,
      customerId: sq.customer_id,
      poCustomer: `Ref PI: ${sq.no_penawaran}`,
      catatan: `Pesanan dibuat otomatis dari Proforma Invoice ${sq.no_penawaran}`,
      items:
        sq.penawaran_penjualan_detail?.map((d) => ({
          id: d.produk_id,
          kode_sku: d.produk?.kode_sku || products.find((p) => p.id === d.produk_id)?.kode_sku || '',
          nama: d.produk?.nama || products.find((p) => p.id === d.produk_id)?.nama || '',
          satuan: d.satuan || d.produk?.satuan || products.find((p) => p.id === d.produk_id)?.satuan || 'Pcs',
          qty: d.qty || 1,
          harga_jual: Number(d.harga_jual || d.harga_satuan || products.find((p) => p.id === d.produk_id)?.harga_jual || 0),
          harga_beli: Number(d.produk?.harga_beli || products.find((p) => p.id === d.produk_id)?.harga_beli || 0),
          diskonPersen: Number(d.diskon_persen || 0),
          diskonRp: 0,
          total: Number(d.subtotal || 0),
        })) || [],
    }));
    openTab('so', 'Pesanan Penjualan (PO)', 'so', 'form');
    showToast(`Proforma Invoice ${sq.no_penawaran} berhasil dialirkan ke Pesanan Penjualan (${nextNo})!`, 'success', 'Alur Diproses');
  };

  const flowPOtoDO = async (po) => {
    const today = new Date().toISOString().split('T')[0];
    const nextNo = await peekNextDocNumber('DO', today);
    setDoForm((prev) => ({
      ...prev,
      editingId: null,
      doNo: nextNo,
      date: today,
      customerId: po.customer_id,
      soId: po.id,
      catatan: `Pengiriman untuk Pesanan PO: ${po.no_pesanan}`,
      items:
        po.pesanan_penjualan_detail?.map((d) => ({
          id: d.produk_id,
          kode_sku: d.produk?.kode_sku || products.find((p) => p.id === d.produk_id)?.kode_sku || '',
          nama: d.produk?.nama || products.find((p) => p.id === d.produk_id)?.nama || '',
          satuan: d.satuan || d.produk?.satuan || products.find((p) => p.id === d.produk_id)?.satuan || 'Pcs',
          qty: d.qty || 1,
        })) || [],
    }));
    openTab('do', 'Pengiriman (DO)', 'do', 'form');
    showToast(`Pesanan ${po.no_pesanan} berhasil dialirkan ke Pengiriman Surat Jalan (${nextNo})!`, 'success', 'Alur Diproses');
  };

  const flowPOtoSI = async (po) => {
    const today = new Date().toISOString().split('T')[0];
    const nextNo = await peekNextDocNumber('SI', today);
    const defaultTerm = (companySettings.syaratBayarList || DEFAULT_PAYMENT_TERMS).find((t) => t.isDefault)?.nama || 'Net 30';
    const dueDate = calculateDueDate(today, defaultTerm, companySettings.syaratBayarList);

    setSiForm((prev) => ({
      ...prev,
      editingId: null,
      invoiceNo: nextNo,
      date: today,
      customerId: po.customer_id,
      soId: po.id,
      doId: null,
      termin: defaultTerm,
      dueDate: dueDate,
      uangMuka: Number(po.uang_muka || 0),
      catatan: `Penagihan atas Pesanan: ${po.no_pesanan}${po.uang_muka > 0 ? ` (Sudah DP: Rp ${Number(po.uang_muka).toLocaleString('id-ID')})` : ''}`,
      items:
        po.pesanan_penjualan_detail?.map((d) => {
          const prod = products.find((p) => p.id === d.produk_id);
          const hj = Number(d.harga_jual || d.harga_satuan || prod?.harga_jual || 0);
          const qty = Number(d.qty || 1);
          return {
            id: d.produk_id,
            kode_sku: d.produk?.kode_sku || prod?.kode_sku || '',
            nama: d.produk?.nama || prod?.nama || '',
            satuan: d.satuan || d.produk?.satuan || prod?.satuan || 'Pcs',
            qty: qty,
            harga_jual: hj,
            harga_beli: Number(d.produk?.harga_beli || prod?.harga_beli || 0),
            diskonPersen: Number(d.diskon_persen || 0),
            diskonRp: 0,
            total: Number(d.subtotal || qty * hj),
          };
        }) || [],
    }));
    openTab('si', 'Invoice', 'si', 'form');
    showToast(`Pesanan ${po.no_pesanan} berhasil dialirkan ke Invoice Penjualan (${nextNo})!`, 'success', 'Alur Diproses');
  };

  const flowDOtoSI = async (doo) => {
    const today = new Date().toISOString().split('T')[0];
    const nextNo = await peekNextDocNumber('SI', today);
    const defaultTerm = (companySettings.syaratBayarList || DEFAULT_PAYMENT_TERMS).find((t) => t.isDefault)?.nama || 'Net 30';
    const dueDate = calculateDueDate(today, defaultTerm, companySettings.syaratBayarList);

    setSiForm((prev) => ({
      ...prev,
      editingId: null,
      invoiceNo: nextNo,
      date: today,
      customerId: doo.customer_id,
      doId: doo.id,
      soId: doo.pesanan_id || null,
      termin: defaultTerm,
      dueDate: dueDate,
      uangMuka: 0,
      catatan: `Penagihan atas Surat Jalan: ${doo.no_surat_jalan}`,
      items:
        doo.pengiriman_pesanan_detail?.map((d) => {
          const prod = products.find((p) => p.id === d.produk_id);
          const hj = Number(prod?.harga_jual || 0);
          const qty = Number(d.qty || 1);
          return {
            id: d.produk_id,
            kode_sku: prod?.kode_sku || '',
            nama: prod?.nama || '',
            satuan: prod?.satuan || 'Pcs',
            qty: qty,
            harga_jual: hj,
            harga_beli: Number(prod?.harga_beli || 0),
            diskonPersen: 0,
            total: qty * hj,
          };
        }) || [],
    }));
    openTab('si', 'Invoice', 'si', 'form');
    showToast(`Surat Jalan ${doo.no_surat_jalan} berhasil dialirkan ke Invoice (${nextNo})!`, 'success', 'Alur Diproses');
  };

  const flowSItoPayment = async (si) => {
    const today = new Date().toISOString().split('T')[0];
    const nextNo = await peekNextDocNumber('CR', today);
    const remaining = Math.max(0, Number(si.total_akhir || si.total || 0) - Number(si.bayar || 0));

    setPayForm((prev) => ({
      ...prev,
      editingId: null,
      receiptNo: nextNo,
      date: today,
      customerId: si.customer_id,
      invoiceId: si.id,
      amount: remaining,
      catatan: `Pelunasan Invoice No. ${si.no_invoice}`,
    }));
    openTab('payment', 'Penerimaan (CR)', 'payment', 'form');
    showToast(`Invoice ${si.no_invoice} berhasil dialirkan ke Pembayaran Pelunasan (${nextNo})!`, 'success', 'Alur Diproses');
  };

  const createPOForCustomer = (cust) => {
    setSoForm((prev) => ({
      ...prev,
      editingId: null,
      customerId: cust.id,
      catatan: `Pengiriman ke: ${cust.alamat || cust.nama}`,
    }));
    openTab('so', 'Pesanan Penjualan (PO)', 'so', 'form');
  };

  const createQuoteForCustomer = (cust) => {
    setQuoteForm((prev) => ({
      ...prev,
      customerId: cust.id,
      catatan: `Proforma Invoice kemasan untuk ${cust.nama}`,
    }));
    openTab('quotation', 'Proforma Invoice (PI)', 'quotation', 'form');
  };

  // Loading Screen
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#07291D] flex flex-col items-center justify-center text-white space-y-3 select-none">
        <div className="w-16 h-16 bg-white rounded-2xl p-1 shadow-2xl flex items-center justify-center animate-pulse border-2 border-emerald-500/40 overflow-hidden">
          <img
            src="/logo-fag.png"
            alt="FAG Kemasan"
            className="w-full h-full object-contain rounded-xl"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
            }}
          />
          <div style={{ display: 'none' }} className="w-full h-full rounded-xl bg-[#07291D] text-emerald-400 font-black text-sm items-center justify-center font-mono">
            FAG
          </div>
        </div>
        <p className="text-xs font-bold tracking-wider text-emerald-300 font-mono animate-pulse">
          MEMUAT SISTEM FAG KEMASAN...
        </p>
      </div>
    );
  }

  // Not Logged In -> Show LoginPage
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          showToast(`Selamat datang, ${user.user_metadata?.full_name || 'Admin'}!`, 'success', 'Login Berhasil');
          loadData();
        }}
      />
    );
  }

  return (
    <div
      onClick={() => {
        if (isUserDropdownOpen) setIsUserDropdownOpen(false);
      }}
      className="min-h-screen flex bg-[#F4F6F8] text-slate-900 antialiased font-sans select-none"
    >
      {/* ============================================================ */}
      {/* 1. SLIM ICON RAIL (ACCURATE 1:1)                             */}
      {/* ============================================================ */}
      <aside className="w-[58px] bg-[#07291D] text-slate-200 flex flex-col items-center py-3.5 border-r border-[#041F16] z-30 flex-shrink-0 shadow-lg">
        <div
          onClick={() => openTab('so', 'Pesanan Penjualan (PO)', 'so', 'list')}
          className="w-10 h-10 rounded-2xl bg-white p-0.5 shadow-md cursor-pointer apple-btn hover:scale-105 active:scale-95 transition-all duration-200 mb-5 flex items-center justify-center border border-emerald-400/40 overflow-hidden"
          title="FAG Kemasan - Sistem Kasir & Pencatatan"
        >
          <img
            src="/logo-fag.png"
            alt="Logo FAG"
            className="w-full h-full object-contain rounded-xl"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
            }}
          />
          <div style={{ display: 'none' }} className="w-full h-full rounded-xl bg-[#07291D] text-emerald-400 font-black text-[11px] items-center justify-center font-mono">
            FK
          </div>
        </div>

        <nav className="flex-1 space-y-2 w-full px-1.5">
          {[
            { id: 'penjualan', label: 'Penjualan', icon: ShoppingCart, defaultTab: 'so', defaultTitle: 'Pesanan Penjualan (PO)' },
            { id: 'pembelian', label: 'Pembelian', icon: Truck, defaultTab: 'po_beli', defaultTitle: 'Pesanan Pembelian (PO)' },
            { id: 'persediaan', label: 'Kemasan', icon: Package, defaultTab: 'items', defaultTitle: 'Persediaan Kemasan' },
            { id: 'buku_besar', label: 'Buku Besar', icon: BookOpen, defaultTab: 'coa', defaultTitle: 'Akun Perkiraan (COA)' },
            { id: 'laporan', label: 'Laporan', icon: TrendingUp, defaultTab: 'income_statement', defaultTitle: 'Laporan Laba Rugi' },
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, defaultTab: 'dashboard', defaultTitle: 'Ringkasan ERP' },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (activeMenu === item.id && flyoutOpen) {
                    setFlyoutOpen(false);
                  } else {
                    switchModule(item.id, item.defaultTab);
                    setFlyoutOpen(true);
                  }
                }}
                className={`w-full h-12 rounded-xl flex flex-col items-center justify-center transition-all duration-200 active:scale-95 ${
                  isSelected
                    ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/40 border border-emerald-400/30'
                    : 'text-emerald-100/60 hover:bg-emerald-800/50 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[8px] mt-0.5 tracking-tight font-semibold truncate max-w-[48px]">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Settings Gear Button */}
        <button
          onClick={() => openTab('settings', 'Pengaturan Usaha', 'settings')}
          className="w-10 h-10 rounded-xl hover:bg-emerald-800/50 text-emerald-200 flex items-center justify-center apple-btn active:scale-95 transition-all mb-2"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Reset Demo Button */}
        <button
          onClick={() => setIsResetModalOpen(true)}
          className="w-10 h-10 rounded-xl hover:bg-rose-900/40 text-rose-300 flex items-center justify-center apple-btn active:scale-95 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </aside>

      {/* ============================================================ */}
      {/* 2. ACCURATE FLYOUT SLIDE DRAWER                              */}
      {/* ============================================================ */}
      {flyoutOpen && (
        <div
          className="w-76 apple-glass bg-white/95 backdrop-blur-2xl border-r border-slate-200/80 shadow-2xl z-20 flex flex-col h-screen py-4 px-3.5 transition-all duration-200 ease-out animate-in slide-in-from-left-2 overflow-y-auto"
          onMouseLeave={() => setFlyoutOpen(false)}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-2.5">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span className="font-bold text-[11px] uppercase tracking-wider text-emerald-950">
                Modul {activeMenu}
              </span>
            </div>
            <button onClick={() => setFlyoutOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 apple-btn active:scale-90 rounded-lg">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1 text-xs">
            {activeMenu === 'penjualan' && (
              <>
                {/* 1. Pesanan Penjualan (PO) */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openTab('so', 'Pesanan Penjualan (PO)', 'so', 'list')}
                    className="flex-1 text-left px-3 py-2 rounded-xl hover:bg-emerald-50 text-slate-800 font-semibold flex items-center justify-between transition-all duration-150 active:scale-[0.98]"
                  >
                    <span className="flex items-center">
                      <span className="w-6 h-4 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded flex items-center justify-center mr-2">
                        PO
                      </span>
                      Pesanan Penjualan (PO)
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      openTab('so', 'Pesanan Penjualan (PO)', 'so', 'form');
                      handleResetToNewSO();
                    }}
                    className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg apple-btn active:scale-90"
                    title="Buat PO Baru Langsung (Form Kosong)"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>

                {/* 2. Proforma Invoice (PI) */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openTab('quotation', 'Proforma Invoice (PI)', 'quotation', 'list')}
                    className="flex-1 text-left px-3 py-2 rounded-xl hover:bg-emerald-50 text-slate-800 font-semibold flex items-center justify-between transition-all duration-150 active:scale-[0.98]"
                  >
                    <span className="flex items-center">
                      <span className="w-6 h-4 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[9px] font-bold rounded flex items-center justify-center mr-2">
                        PI
                      </span>
                      Proforma Invoice (PI)
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      openTab('quotation', 'Proforma Invoice (PI)', 'quotation', 'form');
                      handleResetToNewQuote();
                    }}
                    className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg apple-btn active:scale-90"
                    title="Buat Proforma Invoice Baru (Form Kosong)"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>

                {/* 3. Uang Muka Penjualan (DP) - Accurate Standard */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openTab('dp', 'Uang Muka (DP)', 'dp', 'list')}
                    className="flex-1 text-left px-3 py-2 rounded-xl hover:bg-emerald-50 text-slate-800 font-semibold flex items-center justify-between transition-all duration-150 active:scale-[0.98]"
                  >
                    <span className="flex items-center">
                      <span className="w-6 h-4 bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-bold rounded flex items-center justify-center mr-2">
                        DP
                      </span>
                      Uang Muka Penjualan (DP)
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      openTab('dp', 'Uang Muka (DP)', 'dp', 'list');
                      handleOpenDPModal(null, 'PO');
                    }}
                    className="p-1.5 text-amber-700 hover:bg-amber-100 rounded-md"
                    title="Catat Uang Muka Baru"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>

                {/* 3. Pengiriman Pesanan (DO) */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openTab('do', 'Pengiriman (DO)', 'do', 'list')}
                    className="flex-1 text-left px-3 py-2 rounded-lg hover:bg-emerald-50 text-slate-800 font-semibold flex items-center justify-between transition"
                  >
                    <span className="flex items-center">
                      <span className="w-6 h-4 bg-slate-100 text-slate-700 text-[9px] font-bold rounded flex items-center justify-center mr-2">
                        DO
                      </span>
                      Pengiriman Pesanan (DO)
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      openTab('do', 'Pengiriman (DO)', 'do', 'form');
                      handleResetToNewDO();
                    }}
                    className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-md"
                    title="Terbitkan Surat Jalan Baru (Form Kosong)"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>

                {/* 4. Invoice */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openTab('si', 'Invoice', 'si', 'list')}
                    className="flex-1 text-left px-3 py-2 rounded-lg hover:bg-emerald-50 text-slate-800 font-semibold flex items-center justify-between transition"
                  >
                    <span className="flex items-center">
                      <span className="w-6 h-4 bg-blue-100 text-blue-900 border border-blue-300 text-[9px] font-bold rounded flex items-center justify-center mr-2">
                        INV
                      </span>
                      Invoice
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      openTab('si', 'Invoice', 'si', 'form');
                      handleResetToNewSI();
                    }}
                    className="p-1.5 text-blue-700 hover:bg-blue-100 rounded-md"
                    title="Buat Invoice Baru (Form Kosong)"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>

                {/* 5. Penerimaan Penjualan (CR) */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openTab('payment', 'Penerimaan (CR)', 'payment', 'list')}
                    className="flex-1 text-left px-3 py-2 rounded-lg hover:bg-emerald-50 text-slate-800 font-semibold flex items-center justify-between transition"
                  >
                    <span className="flex items-center">
                      <span className="w-6 h-4 bg-slate-100 text-slate-700 text-[9px] font-bold rounded flex items-center justify-center mr-2">
                        CR
                      </span>
                      Penerimaan Penjualan (CR)
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      openTab('payment', 'Penerimaan (CR)', 'payment', 'form');
                      handleResetToNewPayment();
                    }}
                    className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-md"
                    title="Catat Pelunasan Baru (Form Kosong)"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>

                {/* 6. Daftar Pelanggan */}
                <button
                  onClick={() => openTab('customers', 'Daftar Pelanggan', 'customers')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 font-medium flex items-center justify-between transition"
                >
                  <span className="flex items-center">
                    <Users className="w-3.5 h-3.5 text-slate-400 mr-2" />
                    6. Daftar Pelanggan
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </button>
              </>
            )}

            {activeMenu === 'pembelian' && (
              <>
                {/* 1. Pesanan Pembelian (PO) */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      switchModule('pembelian', 'po_beli');
                      setViewModes((p) => ({ ...p, po_beli: 'list' }));
                    }}
                    className="flex-1 text-left px-3 py-2 rounded-lg hover:bg-emerald-50 text-slate-800 font-semibold flex items-center justify-between transition"
                  >
                    <span className="flex items-center">
                      <span className="w-6 h-4 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded flex items-center justify-center mr-2">
                        PO
                      </span>
                      Pesanan Pembelian (PO)
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      switchModule('pembelian', 'po_beli');
                      setViewModes((p) => ({ ...p, po_beli: 'form' }));
                    }}
                    className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-md"
                    title="Buat PO Pembelian Baru (Form Kosong)"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>

                {/* 2. Penerimaan Barang (RI) */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      switchModule('pembelian', 'ri_beli');
                      setViewModes((p) => ({ ...p, ri_beli: 'list' }));
                    }}
                    className="flex-1 text-left px-3 py-2 rounded-lg hover:bg-emerald-50 text-slate-800 font-semibold flex items-center justify-between transition"
                  >
                    <span className="flex items-center">
                      <span className="w-6 h-4 bg-slate-100 text-slate-700 text-[9px] font-bold rounded flex items-center justify-center mr-2">
                        RI
                      </span>
                      Penerimaan Barang (RI)
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      switchModule('pembelian', 'ri_beli');
                      setViewModes((p) => ({ ...p, ri_beli: 'form' }));
                    }}
                    className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-md"
                    title="Catat Penerimaan Barang Baru"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>

                {/* 3. Faktur Pembelian (FB) */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      switchModule('pembelian', 'pi_beli');
                      setViewModes((p) => ({ ...p, pi_beli: 'list' }));
                    }}
                    className="flex-1 text-left px-3 py-2 rounded-lg hover:bg-emerald-50 text-slate-800 font-semibold flex items-center justify-between transition"
                  >
                    <span className="flex items-center">
                      <span className="w-6 h-4 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[9px] font-bold rounded flex items-center justify-center mr-2">
                        FB
                      </span>
                      Faktur Pembelian
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      switchModule('pembelian', 'pi_beli');
                      setViewModes((p) => ({ ...p, pi_beli: 'form' }));
                    }}
                    className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-md"
                    title="Buat Faktur Pembelian Baru"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>

                {/* 4. Pembayaran Pembelian (PP) */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      switchModule('pembelian', 'pp_beli');
                      setViewModes((p) => ({ ...p, pp_beli: 'list' }));
                    }}
                    className="flex-1 text-left px-3 py-2 rounded-lg hover:bg-emerald-50 text-slate-800 font-semibold flex items-center justify-between transition"
                  >
                    <span className="flex items-center">
                      <span className="w-6 h-4 bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-bold rounded flex items-center justify-center mr-2">
                        PP
                      </span>
                      Pembayaran Pembelian (PP)
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      switchModule('pembelian', 'pp_beli');
                      setViewModes((p) => ({ ...p, pp_beli: 'form' }));
                    }}
                    className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-md"
                    title="Bayar Hutang Supplier Baru"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>

                {/* 5. Daftar Pemasok */}
                <button
                  onClick={() => switchModule('pembelian', 'suppliers')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 font-medium flex items-center justify-between transition"
                >
                  <span className="flex items-center">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 mr-2" />
                    5. Daftar Pemasok (Supplier)
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </button>
              </>
            )}

            {activeMenu === 'persediaan' && (
              <>
                <button
                  onClick={() => switchModule('persediaan', 'items')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 text-slate-800 font-semibold flex items-center justify-between transition"
                >
                  <span className="flex items-center">
                    <Package className="w-3.5 h-3.5 text-emerald-700 mr-2" />
                    Barang &amp; Jasa (Master Kemasan)
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </button>

                <button
                  onClick={() => switchModule('persediaan', 'stock_opname')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 text-slate-800 font-semibold flex items-center justify-between transition"
                >
                  <span className="flex items-center">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-700 mr-2" />
                    Penyesuaian Persediaan (Opname)
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </button>

                <button
                  onClick={() => switchModule('persediaan', 'stock_mutation')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 text-slate-800 font-semibold flex items-center justify-between transition"
                >
                  <span className="flex items-center">
                    <History className="w-3.5 h-3.5 text-emerald-700 mr-2" />
                    Riwayat Mutasi (Kartu Stok)
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </button>
              </>
            )}

            {activeMenu === 'buku_besar' && (
              <button
                onClick={() => switchModule('buku_besar', 'coa')}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-800 font-semibold transition"
              >
                Daftar Akun (COA Standar)
              </button>
            )}

            {activeMenu === 'laporan' && (
              <button
                onClick={() => switchModule('laporan', 'income_statement')}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-800 font-semibold transition"
              >
                Laporan Laba Rugi
              </button>
            )}

            {activeMenu === 'dashboard' && (
              <button
                onClick={() => switchModule('dashboard', 'dashboard')}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-800 font-semibold transition"
              >
                Executive Summary
              </button>
            )}
          </div>

          {/* Real-time Order / Inventory Summary Card (Apple Deep-Emerald Card) */}
          <div className="mt-4">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2 tracking-wider">
              {activeMenu === 'pembelian'
                ? 'Status Pembelian FAG'
                : activeMenu === 'persediaan'
                ? 'Status Persediaan FAG'
                : 'Status Order FAG'}
            </span>
            <div className="bg-gradient-to-br from-[#0A3828] to-[#07291D] text-slate-100 p-3.5 rounded-2xl shadow-md border border-emerald-800/40 text-xs space-y-2">
              {activeMenu === 'pembelian' ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">PO Menunggu Terima:</span>
                    <span className="font-bold text-white">
                      {purchaseOrders.filter((p) => p.status === 'MENUNGGU_PENERIMAAN').length} Order
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Faktur Belum Lunas:</span>
                    <span className="font-bold text-amber-300">
                      {purchases.filter((p) => p.status_bayar === 'HUTANG').length} Faktur
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-emerald-800/60 pt-1.5">
                    <span className="text-slate-300">Total Hutang Usaha:</span>
                    <span className="font-bold text-amber-300 font-mono">
                      Rp{' '}
                      {purchases
                        .filter((p) => p.status_bayar === 'HUTANG')
                        .reduce((a, b) => a + (Number(b.total_akhir || b.total || 0) - Number(b.bayar || 0)), 0)
                        .toLocaleString('id-ID')}
                    </span>
                  </div>
                </>
              ) : activeMenu === 'persediaan' ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Total SKU Kemasan:</span>
                    <span className="font-bold text-white">{products.length} SKU</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Stok Menipis:</span>
                    <span className="font-bold text-amber-300">
                      {products.filter((p) => Number(p.stok || 0) <= Number(p.min_stok || 20)).length} SKU
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-emerald-800/60 pt-1.5">
                    <span className="text-slate-300">Nilai Aset Persediaan:</span>
                    <span className="font-bold text-emerald-300 font-mono">
                      Rp{' '}
                      {products
                        .reduce((a, b) => a + Number(b.stok || 0) * Number(b.harga_beli || 0), 0)
                        .toLocaleString('id-ID')}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Pesanan (PO):</span>
                    <span className="font-bold text-white">{salesOrders.length} Order</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Menunggu Kirim:</span>
                    <span className="font-bold text-amber-300">
                      {salesOrders.filter((s) => s.status === 'MENUNGGU_PENGIRIMAN').length} Order
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-emerald-800/60 pt-1.5">
                    <span className="text-slate-300">Piutang Aktif:</span>
                    <span className="font-bold text-emerald-300">
                      Rp{' '}
                      {salesInvoices
                        .filter((i) => i.status === 'PIUTANG')
                        .reduce((a, b) => a + Number(b.total_akhir || 0), 0)
                        .toLocaleString('id-ID')}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer Card */}
          <div className="mt-auto pt-3 border-t border-slate-200">
            <button
              onClick={() => {
                setFlyoutOpen(false);
                openTab('settings', 'Pengaturan Usaha', 'settings');
              }}
              className="w-full py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold flex items-center justify-between mb-2 transition"
            >
              <span className="flex items-center">
                <Settings className="w-3.5 h-3.5 text-slate-600 mr-1.5" />
                Pengaturan Usaha
              </span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </button>
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 mb-2">
              <p className="text-[11px] font-bold text-slate-800">{companySettings.namaPerusahaan}</p>
              <p className="text-[9px] text-emerald-700 font-semibold flex items-center mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1 animate-pulse"></span>
                Supabase PostgreSQL Live
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. MAIN WORKSPACE WITH ACCURATE TABS & VIEWS                 */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-5 z-50 relative">
          <div className="flex items-center space-x-3">
            <span className="font-extrabold text-xs text-slate-900 tracking-wider uppercase">
              {companySettings.namaPerusahaan}
            </span>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5 animate-pulse"></span>
              Supabase Terhubung
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => loadData()}
              className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center space-x-1"
              title="Sinkronisasi Data Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-700' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>
            <button
              onClick={() => openTab('settings', 'Pengaturan Usaha', 'settings')}
              className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50"
              title="Pengaturan"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            {/* User Profile Pill & Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center space-x-2 py-1 px-2 rounded-xl hover:bg-slate-100 transition active:scale-95 border border-slate-200"
              >
                <div className="w-7 h-7 rounded-full bg-[#07291D] text-emerald-300 border border-emerald-600/50 flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                  {(() => {
                    const name = currentUser?.user_metadata?.full_name;
                    if (!name) return currentUser?.email ? currentUser.email.substring(0, 2).toUpperCase() : 'FK';
                    const parts = name.trim().split(/\s+/);
                    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
                  })()}
                </div>
                <div className="hidden sm:block text-left">
                  <span className="block text-xs font-extrabold text-slate-800 leading-tight truncate max-w-[140px]">
                    {currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'FAG KEMASAN'}
                  </span>
                  <span className="block text-[10px] text-emerald-800 font-bold uppercase tracking-wider leading-none">
                    {currentUser?.user_metadata?.role || 'OWNER'}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Profile Dropdown Menu */}
              {isUserDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-2.5 z-[100] animate-in fade-in zoom-in-95 duration-100 ring-1 ring-slate-900/10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {currentUser?.user_metadata?.full_name || 'FAG KEMASAN'}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 truncate">
                      {currentUser?.email || 'fagkemasan@gmail.com'}
                    </p>
                    <span className="mt-1 inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                      {currentUser?.user_metadata?.role_label || (currentUser?.user_metadata?.role === 'OWNER' ? 'Pemilik & Super Admin' : 'Staf')}
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        setIsUserManagementOpen(true);
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 font-medium flex items-center space-x-2 transition"
                    >
                      <Users className="w-4 h-4 text-emerald-700" />
                      <span>Manajemen Staf &amp; Pengguna</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        openTab('settings', 'Pengaturan Usaha', 'settings');
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 font-medium flex items-center space-x-2 transition"
                    >
                      <Settings className="w-4 h-4 text-slate-500" />
                      <span>Pengaturan Usaha</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-xs text-rose-700 hover:bg-rose-50 font-bold flex items-center space-x-2 transition"
                    >
                      <LogOut className="w-4 h-4 text-rose-600" />
                      <span>Keluar (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Tab Bar */}
        <div className="flex items-center bg-[#E5E9EE] border-b border-slate-300 px-3 pt-1.5 space-x-1 overflow-x-auto">
          {openTabs.map((tab) => {
            const isActive = activeTabId === tab.id;
            return (
              <div
                key={tab.id}
                onClick={() => {
                  setActiveTabId(tab.id);
                  if (typeof window !== 'undefined') {
                    window.history.replaceState(null, '', `#${tab.id}`);
                  }
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-t-lg text-xs font-bold cursor-pointer transition-all border-t border-x ${
                  isActive
                    ? 'bg-white text-emerald-950 border-slate-300 shadow-2xs -mb-[1px] pb-2'
                    : 'bg-slate-200/80 text-slate-600 border-transparent hover:bg-slate-200'
                }`}
              >
                <span>{tab.title}</span>
                {tab.closable && (
                  <button
                    onClick={(e) => closeTab(tab.id, e)}
                    className="p-0.5 text-slate-400 hover:text-slate-700 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Canvas Body - Full Width & Tight Enterprise ERP Density */}
        <div className="flex-1 overflow-y-auto bg-slate-100/90 p-1.5 sm:p-2 flex flex-col min-h-0">
          {/* ======================================================== */}
          {/* 1. MODULE: PESANAN PENJUALAN (PO)                        */}
          {/* ======================================================== */}
          {activeTabId === 'so' && (
            <div className="w-full flex-1 flex flex-col space-y-2">
              {/* ACCURATE TOOLBAR: COMPACT FULL-WIDTH CONTROL BAR */}
              <div className="flex items-center justify-between px-3.5 py-2 bg-white rounded-lg border border-slate-300 shadow-2xs">
                <div className="flex items-center space-x-2.5">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-300">
                    <button
                      type="button"
                      onClick={() => setViewModes((p) => ({ ...p, so: 'list' }))}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 ${
                        viewModes.so === 'list'
                          ? 'bg-[#0A3828] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                      title="Lihat Daftar Pesanan Masuk"
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Daftar Pesanan (PO)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToNewSO}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 ${
                        viewModes.so === 'form'
                          ? 'bg-[#0A3828] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                      title="Buka Formulir Input Pesanan Baru (Form Kosong)"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Input Pesanan Baru</span>
                    </button>
                  </div>

                  <div className="hidden sm:flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-200 text-[10px] font-mono font-bold rounded">
                      SALES ORDER
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {viewModes.so === 'form' ? (
                    <>
                      <button
                        type="button"
                        onClick={handleResetToNewSO}
                        className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Form Baru</span>
                      </button>

                      {/* ACCURATE ONLINE: AMBIL DARI PROFORMA INVOICE (PI) */}
                      <button
                        type="button"
                        onClick={() => {
                          setPiSearchQuery('');
                          setSoGetFromModalOpen(true);
                        }}
                        className="px-3 py-1.5 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition shadow-2xs"
                        title="Ambil data dari Proforma Invoice (PI) yang sudah disetujui"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Ambil (PI) ▾</span>
                      </button>

                      {/* ACCURATE ONLINE: PROSES ALUR TRANSAKSI DROPDOWN (ELEGANT & COMPACT) */}
                      {soForm.editingId && (
                        <>
                          {/* ACCURATE ONLINE: PROSES ALUR TRANSAKSI DROPDOWN */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setSoFlowDropdownOpen(!soFlowDropdownOpen)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5 transition"
                            >
                              <Workflow className="w-3.5 h-3.5 text-emerald-300" />
                              <span>Proses Alur ▾</span>
                            </button>
                            {soFlowDropdownOpen && (
                              <>
                                {/* Transparent Backdrop to safely close on outside click */}
                                <div
                                  className="fixed inset-0 z-20 cursor-default"
                                  onClick={() => setSoFlowDropdownOpen(false)}
                                />
                                <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-30 text-xs text-left animate-in fade-in duration-100">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSoFlowDropdownOpen(false);
                                      const po = salesOrders.find((o) => o.id === soForm.editingId) || {
                                        id: soForm.editingId,
                                        no_pesanan: soForm.soNo,
                                        total: calculateTotals(soForm.items, soForm.discountAmount, soForm.ppnActive).grandTotal,
                                        uang_muka: soForm.uangMuka || 0,
                                        customer: contacts.find((c) => c.id === soForm.customerId) || { nama: 'Pelanggan' },
                                        customer_id: soForm.customerId,
                                      };
                                      handleOpenDPModal(po);
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-amber-50 text-slate-800 flex items-center space-x-2 font-semibold"
                                  >
                                    <Coins className="w-4 h-4 text-amber-600" />
                                    <div>
                                      <div className="font-bold text-amber-950">+ Terima Uang Muka (DP)</div>
                                      <div className="text-[10px] text-slate-500">Bayar DP sebelum kirim</div>
                                    </div>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSoFlowDropdownOpen(false);
                                      const po = salesOrders.find((o) => o.id === soForm.editingId) || {
                                        id: soForm.editingId,
                                        no_pesanan: soForm.soNo,
                                        customer_id: soForm.customerId,
                                        termin: soForm.termin,
                                        pesanan_penjualan_detail: soForm.items.map((i) => ({
                                          produk_id: i.id,
                                          qty: i.qty,
                                          harga_jual: i.harga_jual,
                                          produk: i,
                                        })),
                                      };
                                      flowPOtoDO(po);
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-emerald-50 text-slate-800 flex items-center space-x-2 font-semibold border-t border-slate-100"
                                  >
                                    <Truck className="w-4 h-4 text-emerald-600" />
                                    <div>
                                      <div className="font-bold text-emerald-950">+ Kirim Pesanan (DO)</div>
                                      <div className="text-[10px] text-slate-500">Terbitkan surat jalan</div>
                                    </div>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSoFlowDropdownOpen(false);
                                      const po = salesOrders.find((o) => o.id === soForm.editingId) || {
                                        id: soForm.editingId,
                                        no_pesanan: soForm.soNo,
                                        customer_id: soForm.customerId,
                                        uang_muka: soForm.uangMuka,
                                        termin: soForm.termin,
                                        pesanan_penjualan_detail: soForm.items.map((i) => ({
                                          produk_id: i.id,
                                          qty: i.qty,
                                          harga_jual: i.harga_jual,
                                          produk: i,
                                        })),
                                      };
                                      flowPOtoSI(po);
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-blue-50 text-slate-800 flex items-center space-x-2 font-semibold border-t border-slate-100"
                                  >
                                    <FileText className="w-4 h-4 text-blue-600" />
                                    <div>
                                      <div className="font-bold text-blue-950">+ Terbitkan Invoice</div>
                                      <div className="text-[10px] text-slate-500">Fakturkan & potong DP</div>
                                    </div>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSoFlowDropdownOpen(false);
                                      const s = salesOrders.find((o) => o.id === soForm.editingId);
                                      if (s) {
                                        setPrintDoc({
                                          type: 'PO',
                                          title: 'SURAT PESANAN PENJUALAN',
                                          noDoc: s.no_pesanan,
                                          date: s.tanggal,
                                          customer: s.customer,
                                          items: s.pesanan_penjualan_detail || [],
                                          total: s.total,
                                          uangMuka: s.uang_muka || 0,
                                          statusBayar: s.status_bayar || 'BELUM_BAYAR',
                                          catatan: s.catatan,
                                          companySettings,
                                        });
                                      }
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

                          {/* Tombol Hapus Dokumen PO Permanen dari Supabase */}
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteConfirmDoc({
                                type: 'PO',
                                id: soForm.editingId,
                                noDoc: soForm.soNo,
                              })
                            }
                            className="px-3 py-1.5 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                            title="Hapus pesanan ini secara permanen dari Supabase"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Hapus PO</span>
                          </button>
                        </>
                      )}

                      <button
                        onClick={handleSaveSO}
                        disabled={loading}
                        className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5 transition"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{soForm.editingId ? 'SIMPAN PERUBAHAN (PO)' : 'SIMPAN PESANAN (PO)'}</span>
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              {/* VIEW: DAFTAR PESANAN TABLE (FLUSH EDGE-TO-EDGE WITH DEDICATED ADVANCED FILTERS) */}
              {viewModes.so === 'list' && (loading ? <TableSkeleton rows={5} cols={8} /> : (() => {
                const soConfig = tableConfigs.so || DEFAULT_TABLE_CONFIGS.so;
                const soFilter = advancedFilters.so;

                const displayedSalesOrders = salesOrders
                  // 1. Search Query
                  .filter((s) => {
                    const q = (tableSearch.so || '').toLowerCase().trim();
                    if (!q) return true;
                    return (
                      s.no_pesanan?.toLowerCase().includes(q) ||
                      s.customer?.nama?.toLowerCase().includes(q) ||
                      (s.catatan && s.catatan.toLowerCase().includes(q))
                    );
                  })
                  // 2. Status Bayar
                  .filter((s) => {
                    if (soFilter.statusBayar === 'ALL') return true;
                    const dp = Number(s.uang_muka || 0);
                    const total = Number(s.total || 0);
                    const linkedInv = salesInvoices.find((i) => i.pesanan_id === s.id);
                    const isInvoiceLunas = linkedInv && (linkedInv.status === 'LUNAS' || Number(linkedInv.bayar || 0) >= Number(linkedInv.total_akhir || 0));
                    const isLunas = s.status_bayar === 'LUNAS' || isInvoiceLunas || (dp >= total && total > 0);
                    const isPartial = (dp > 0 && dp < total) || (linkedInv && Number(linkedInv.bayar || 0) > 0 && !isInvoiceLunas);

                    if (soFilter.statusBayar === 'BELUM_BAYAR') return !isLunas && !isPartial;
                    if (soFilter.statusBayar === 'SEBAGIAN_DP') return isPartial;
                    if (soFilter.statusBayar === 'LUNAS') return isLunas;
                    return true;
                  })
                  // 3. Status Kirim
                  .filter((s) => {
                    if (soFilter.statusKirim === 'ALL') return true;
                    if (soFilter.statusKirim === 'MENUNGGU_KIRIM') return s.status !== 'SELESAI';
                    if (soFilter.statusKirim === 'SELESAI') return s.status === 'SELESAI';
                    return true;
                  })
                  // 4. Customer
                  .filter((s) => {
                    if (soFilter.customer === 'ALL') return true;
                    return s.customer_id === soFilter.customer;
                  })
                  // 5. Date Range
                  .filter((s) => {
                    if (soFilter.dateRange === 'ALL') return true;
                    const docDate = s.tanggal;
                    const today = new Date().toISOString().split('T')[0];
                    if (soFilter.dateRange === 'TODAY') return docDate === today;
                    if (soFilter.dateRange === '7DAYS') {
                      const d7 = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
                      return docDate >= d7 && docDate <= today;
                    }
                    if (soFilter.dateRange === 'THIS_MONTH') {
                      const ym = today.slice(0, 7);
                      return docDate?.startsWith(ym);
                    }
                    if (soFilter.dateRange === 'CUSTOM') {
                      if (soFilter.customStartDate && docDate < soFilter.customStartDate) return false;
                      if (soFilter.customEndDate && docDate > soFilter.customEndDate) return false;
                    }
                    return true;
                  })
                  // 6. Sorting based on soConfig.sortBy
                  .sort((a, b) => {
                    if (soConfig.sortBy === 'date_asc') return (a.tanggal || '').localeCompare(b.tanggal || '');
                    if (soConfig.sortBy === 'total_desc') return Number(b.total || 0) - Number(a.total || 0);
                    if (soConfig.sortBy === 'total_asc') return Number(a.total || 0) - Number(b.total || 0);
                    return (b.tanggal || '').localeCompare(a.tanggal || '');
                  });

                const densityClass =
                  soConfig.density === 'compact'
                    ? 'py-2 px-3 text-xs'
                    : soConfig.density === 'spacious'
                    ? 'py-4 px-4 text-xs'
                    : 'py-2.5 px-3.5 text-xs';

                const cols = soConfig.visibleColumns || DEFAULT_TABLE_CONFIGS.so.visibleColumns;

                return (
                  <div className="flex-1 flex flex-col min-h-0 space-y-2">
                    {/* Advanced Separated Filter Toolbar */}
                    <TableFilterToolbar
                      searchQuery={tableSearch.so}
                      onSearchChange={(val) => setTableSearch((p) => ({ ...p, so: val }))}
                      searchPlaceholder="Cari no. PO, nama pelanggan, keterangan..."
                      filters={soFilter}
                      onFilterChange={(k, v) => handleUpdateAdvancedFilter('so', k, v)}
                      onResetFilters={() => handleResetAdvancedFilters('so')}
                      contacts={contacts}
                      config={soConfig}
                      onOpenConfig={() => setActiveConfigModal('so')}
                      totalCount={displayedSalesOrders.length}
                      totalAmount={displayedSalesOrders.reduce((acc, s) => acc + Number(s.total || 0), 0)}
                      moduleType="so"
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
                              {cols.pelanggan !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Pelanggan</th>}
                              {cols.catatan !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Keterangan / Catatan</th>}
                              {cols.total !== false && <th className="py-3 px-3.5 text-right border-r border-slate-200/60">Total Nilai (Rp)</th>}
                              {cols.statusBayar !== false && <th className="py-3 px-3.5 text-center border-r border-slate-200/60">Status Pembayaran / DP</th>}
                              {cols.statusKirim !== false && <th className="py-3 px-3.5 text-center border-r border-slate-200/60">Status Kirim</th>}
                              {cols.aksiLanjutan === true && <th className="py-3 px-3.5 text-center">Aksi Cepat</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {salesOrders.length === 0 ? (
                              <tr>
                                <td colSpan={10} className="py-20 text-center text-slate-400 bg-white">
                                  <Boxes className="w-10 h-10 mx-auto mb-2 text-emerald-800/40 stroke-[1.5]" />
                                  <p className="font-bold text-sm text-slate-700">Belum ada pesanan penjualan (PO)</p>
                                  <p className="text-xs text-slate-400 mt-0.5 mb-3">
                                    Klik tombol di bawah untuk mencatat pesanan penjualan kemasan baru.
                                  </p>
                                  <button
                                    onClick={handleResetToNewSO}
                                    className="apple-btn-primary px-4 py-2 text-xs font-bold flex items-center space-x-1.5 mx-auto"
                                  >
                                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                    <span>Buat Pesanan Sekarang</span>
                                  </button>
                                </td>
                              </tr>
                            ) : displayedSalesOrders.length === 0 ? (
                              <tr>
                                <td colSpan={10} className="py-14 text-center text-slate-400 bg-white">
                                  <p className="font-semibold text-slate-600 text-xs">
                                    Tidak ada data pesanan yang sesuai dengan filter yang aktif.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => handleResetAdvancedFilters('so')}
                                    className="apple-btn-secondary mt-2 px-3 py-1.5 text-xs font-bold"
                                  >
                                    Reset Semua Filter
                                  </button>
                                </td>
                              </tr>
                            ) : (
                              displayedSalesOrders.map((s, idx) => (
                                <tr
                                  key={s.id}
                                  onClick={() => {
                                    if (soConfig.rowClickAction === 'print_preview') {
                                      setPrintDoc({
                                        type: 'PO',
                                        title: 'SURAT PESANAN PENJUALAN',
                                        noDoc: s.no_pesanan,
                                        date: s.tanggal,
                                        customer: s.customer,
                                        items: s.pesanan_penjualan_detail || [],
                                        total: s.total,
                                        uangMuka: s.uang_muka || 0,
                                        statusBayar: s.status_bayar || 'BELUM_BAYAR',
                                        catatan: s.catatan,
                                        companySettings,
                                      });
                                    } else {
                                      handleOpenSO(s);
                                    }
                                  }}
                                  className="hover:bg-emerald-50/50 transition-colors cursor-pointer group active:scale-[0.999]"
                                  title="Klik baris untuk membuka rincian pesanan"
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
                                          <span className="group-hover:underline">{s.no_pesanan}</span>
                                          {s.lampiran_url && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setLightboxImage({ url: s.lampiran_url, title: `Bukti Pesanan - ${s.no_pesanan}` });
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
                                              setDeleteConfirmDoc({ type: 'PO', id: s.id, noDoc: s.no_pesanan });
                                            }}
                                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Hapus Pesanan Penjualan"
                                          >
                                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                          </button>
                                          <Edit className="w-3 h-3 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                                        </div>
                                      </div>
                                    </td>
                                  )}
                                  {cols.tanggal !== false && (
                                    <td className={`${densityClass} text-slate-600 border-r border-slate-100/80 font-medium`}>
                                      {s.tanggal}
                                    </td>
                                  )}
                                  {cols.pelanggan !== false && (
                                    <td className={`${densityClass} font-semibold text-slate-900 border-r border-slate-100/80`}>
                                      {s.customer?.nama || '-'}
                                    </td>
                                  )}
                                  {cols.catatan !== false && (
                                    <td className={`${densityClass} text-slate-500 border-r border-slate-100/80 max-w-xs truncate`}>
                                      {s.catatan || '-'}
                                    </td>
                                  )}
                                  {cols.total !== false && (
                                    <td className={`${densityClass} text-right font-black text-slate-900 font-mono border-r border-slate-100/80`}>
                                      Rp {Number(s.total || 0).toLocaleString('id-ID')}
                                    </td>
                                  )}
                                  {cols.statusBayar !== false && (() => {
                                    const dp = Number(s.uang_muka || 0);
                                    const total = Number(s.total || 0);
                                    const linkedInv = salesInvoices.find((i) => i.pesanan_id === s.id);
                                    const isInvoiceLunas = linkedInv && (linkedInv.status === 'LUNAS' || Number(linkedInv.bayar || 0) >= Number(linkedInv.total_akhir || 0));
                                    const isDpLunas = dp >= total && total > 0;
                                    const isLunas = s.status_bayar === 'LUNAS' || isInvoiceLunas || isDpLunas;

                                    if (isLunas) {
                                      return (
                                        <td className={`${densityClass} text-center border-r border-slate-100/80`}>
                                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-800 border-emerald-300">
                                            LUNAS
                                          </span>
                                        </td>
                                      );
                                    }
                                    if (dp > 0) {
                                      return (
                                        <td className={`${densityClass} text-center border-r border-slate-100/80`}>
                                          <div className="flex flex-col items-center">
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-amber-50 text-amber-900 border-amber-300">
                                              SEBAGIAN DP
                                            </span>
                                            <span className="text-[10px] font-mono font-bold text-emerald-950 mt-0.5">
                                              DP: Rp {dp.toLocaleString('id-ID')}
                                            </span>
                                            <span className="text-[9px] text-slate-400 font-mono">
                                              Sisa: Rp {Math.max(0, total - dp).toLocaleString('id-ID')}
                                            </span>
                                          </div>
                                        </td>
                                      );
                                    }
                                    if (linkedInv && Number(linkedInv.bayar || 0) > 0) {
                                      const paid = Number(linkedInv.bayar || 0);
                                      return (
                                        <td className={`${densityClass} text-center border-r border-slate-100/80`}>
                                          <div className="flex flex-col items-center">
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-amber-50 text-amber-900 border-amber-300">
                                              SEBAGIAN BAYAR
                                            </span>
                                            <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                                              Dibayar: Rp {paid.toLocaleString('id-ID')}
                                            </span>
                                          </div>
                                        </td>
                                      );
                                    }
                                    return (
                                      <td className={`${densityClass} text-center border-r border-slate-100/80`}>
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-slate-100 text-slate-600 border-slate-200">
                                          BELUM BAYAR
                                        </span>
                                      </td>
                                    );
                                  })()}
                                  {cols.statusKirim !== false && (
                                    <td className={`${densityClass} text-center border-r border-slate-100/80`}>
                                      <span
                                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                          s.status === 'SELESAI'
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                            : 'bg-amber-50 text-amber-800 border-amber-200'
                                        }`}
                                      >
                                        {s.status}
                                      </span>
                                    </td>
                                  )}
                                  {cols.aksiLanjutan === true && (
                                    <td className={`${densityClass} text-center space-x-1`}>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenSO(s);
                                        }}
                                        className="apple-btn-secondary px-2 py-1 text-[11px]"
                                      >
                                        Edit
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Accurate Bottom Status Bar */}
                      <div className="h-8 bg-slate-50/80 border-t border-slate-200/80 px-4 flex items-center justify-between text-[11px] text-slate-500 font-medium select-none">
                        <div className="flex items-center space-x-2">
                          <span>Ditampilkan: <strong>{displayedSalesOrders.length}</strong> dari <strong>{salesOrders.length}</strong> pesanan</span>
                          <span>•</span>
                          <span>Menunggu Kirim: <strong>{salesOrders.filter((s) => s.status !== 'SELESAI').length}</strong></span>
                          <span>•</span>
                          <span>Selesai: <strong>{salesOrders.filter((s) => s.status === 'SELESAI').length}</strong></span>
                        </div>
                        <div className="font-mono text-emerald-950 font-bold text-xs">
                          Total Akumulasi: Rp {displayedSalesOrders.reduce((acc, s) => acc + Number(s.total || 0), 0).toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })())}

              {/* VIEW: FORM INPUT PESANAN BARU (COMPACT FULL-WIDTH) */}
              {viewModes.so === 'form' && (
                <div className="bg-white rounded-lg border border-slate-300 shadow-2xs p-4 sm:p-5 space-y-4 flex-1 flex flex-col">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs bg-slate-50/80 p-4 rounded-lg border border-slate-200">
                    <div className="sm:col-span-4">
                      <label className="block font-bold text-slate-700 mb-1">
                        Pelanggan Kemasan <span className="text-rose-500">*</span>
                      </label>
                      <GoogleLiveCustomerSearch
                        contacts={contacts}
                        selectedCustomerId={soForm.customerId}
                        onSelectCustomer={(id) => setSoForm({ ...soForm, customerId: id })}
                        placeholder="Cari pelanggan kemasan... (Nama, No. WA, Alamat)"
                        onOpenNewCustomerModal={() => setIsNewCustomerModalOpen(true)}
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block font-bold text-slate-700 mb-1">No. Pesanan (Auto-Sequence)</label>
                      <input
                        type="text"
                        value={soForm.soNo}
                        readOnly
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 font-mono font-bold text-emerald-900 cursor-not-allowed"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <ModernDatePicker
                        label="Tanggal Pesanan"
                        value={soForm.date}
                        onChange={async (val) => {
                          let nextNo = soForm.soNo;
                          if (!soForm.editingId) {
                            nextNo = (await peekNextDocNumber('PO', val)) || nextNo;
                          }
                          setSoForm((prev) => ({ ...prev, date: val, soNo: nextNo }));
                        }}
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block font-bold text-slate-700 mb-1">Syarat Bayar / Termin</label>
                      <select
                        value={soForm.termin || 'Net 30'}
                        onChange={(e) => setSoForm({ ...soForm, termin: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-xs focus:ring-1 focus:ring-emerald-700"
                      >
                        {(companySettings.syaratBayarList || DEFAULT_PAYMENT_TERMS).map((term) => (
                          <option key={term.id || term.nama} value={term.nama}>
                            {term.nama} {term.deskripsi ? `(${term.deskripsi})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <ItemSpreadsheetGrid
                    formType="PO"
                    items={soForm.items}
                    setItems={(items) => setSoForm({ ...soForm, items })}
                    products={products}
                    customerId={soForm.customerId}
                    customerName={contacts.find((c) => c.id === soForm.customerId)?.nama || ''}
                    salesOrders={salesOrders}
                    quotations={quotations}
                    salesInvoices={salesInvoices}
                    satuanList={satuanList}
                      onAddSatuan={handleAddSatuan}
                    />

                  <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-3 border-t border-slate-200 text-xs">
                    <div className="w-full sm:w-1/2 space-y-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Catatan Pesanan &amp; Alamat Pengiriman Spesifik
                        </label>
                        <textarea
                          rows="2"
                          value={soForm.catatan}
                          onChange={(e) => setSoForm({ ...soForm, catatan: e.target.value })}
                          placeholder="Contoh: Kirim via Lalamove / Truk Box, wajib lakban fragile..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>

                      <FileUploadBukti
                        label="Lampiran Bukti PO Fisik / Mockup Desain Cetak"
                        value={soForm.lampiran_url}
                        onChange={(url) => setSoForm({ ...soForm, lampiran_url: url })}
                        docType="po"
                        helpText="Upload foto surat PO customer atau mockup desain cetak kemasan."
                      />
                    </div>

                    <div className="w-full sm:w-72 space-y-2">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal:</span>
                        <span className="font-semibold text-slate-800">
                          Rp {calculateTotals(soForm.items, 0, false).subtotal.toLocaleString('id-ID')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600">
                        <span>Potongan Diskon:</span>
                        <div className="flex items-center space-x-1">
                          <span className="text-slate-400">Rp</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={soForm.discountAmount ? formatDisplayDecimal(soForm.discountAmount) : ''}
                            placeholder="0"
                            onChange={(e) => {
                              const { num } = formatLiveInput(e.target.value);
                              setSoForm({ ...soForm, discountAmount: num });
                            }}
                            className="w-28 px-2 py-0.5 text-right border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700 bg-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-slate-600">
                        <label className="flex items-center space-x-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={soForm.ppnActive}
                            onChange={(e) => setSoForm({ ...soForm, ppnActive: e.target.checked })}
                            className="rounded text-emerald-700 focus:ring-emerald-700"
                          />
                          <span>Kenakan PPN (11%)</span>
                        </label>
                        <span className="font-semibold text-slate-800">
                          Rp{' '}
                          {calculateTotals(
                            soForm.items,
                            soForm.discountAmount,
                            soForm.ppnActive
                          ).ppn.toLocaleString('id-ID')}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-sm font-extrabold pt-2 border-t border-slate-300 text-slate-900">
                        <span>TOTAL PESANAN:</span>
                        <span className="text-emerald-900 text-base">
                          Rp{' '}
                          {calculateTotals(
                            soForm.items,
                            soForm.discountAmount,
                            soForm.ppnActive
                          ).grandTotal.toLocaleString('id-ID')}
                        </span>
                      </div>

                      {Number(soForm.uangMuka || 0) > 0 && (
                        <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-xs">
                          <div className="flex justify-between text-amber-800 font-bold">
                            <span>Uang Muka (DP) Terbayar:</span>
                            <span>- Rp {Number(soForm.uangMuka).toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex justify-between text-emerald-950 font-extrabold text-sm">
                            <span>Sisa Tagihan Pelunasan:</span>
                            <span>
                              Rp{' '}
                              {Math.max(
                                0,
                                calculateTotals(soForm.items, soForm.discountAmount, soForm.ppnActive).grandTotal -
                                  Number(soForm.uangMuka || 0)
                              ).toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. MODULE: PENAWARAN PENJUALAN (SQ)                      */}
          {/* ======================================================== */}
          {activeTabId === 'quotation' && (
            <div className="w-full flex-1 flex flex-col space-y-2">
              <div className="flex items-center justify-between px-3.5 py-2 bg-white rounded-lg border border-slate-300 shadow-2xs">
                <div className="flex items-center space-x-2.5">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-300">
                    <button
                      type="button"
                      onClick={() => setViewModes((p) => ({ ...p, quotation: 'list' }))}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 ${
                        viewModes.quotation === 'list'
                          ? 'bg-[#0A3828] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                      title="Lihat Daftar Proforma Invoice"
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Daftar Proforma Invoice (PI)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToNewQuote}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 ${
                        viewModes.quotation === 'form'
                          ? 'bg-[#0A3828] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                      title="Buka Formulir Input Proforma Invoice Baru (Form Kosong)"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Input Proforma Invoice Baru</span>
                    </button>
                  </div>

                  <div className="hidden sm:flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-200 text-[10px] font-mono font-bold rounded">
                      PROFORMA INVOICE
                    </span>
                  </div>
                </div>

                {viewModes.quotation === 'form' ? (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleResetToNewQuote}
                      className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Form Baru</span>
                    </button>
                    {quoteForm.editingId && (
                      <>
                        {/* ACCURATE ONLINE: PROSES ALUR PROFORMA INVOICE (PI -> PO, PDF) */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setSqFlowDropdownOpen(!sqFlowDropdownOpen)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5 transition"
                          >
                            <Workflow className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Proses Alur ▾</span>
                          </button>
                          {sqFlowDropdownOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-20 cursor-default"
                                onClick={() => setSqFlowDropdownOpen(false)}
                              />
                              <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-30 text-xs text-left animate-in fade-in duration-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSqFlowDropdownOpen(false);
                                    const currentQuote = quotations.find((q) => q.id === quoteForm.editingId) || {
                                      id: quoteForm.editingId,
                                      no_penawaran: quoteForm.quoteNo,
                                      customer_id: quoteForm.customerId,
                                      penawaran_penjualan_detail: quoteForm.items.map((i) => ({
                                        produk_id: i.id,
                                        qty: i.qty,
                                        harga_jual: i.harga_jual,
                                        subtotal: i.total || i.qty * i.harga_jual,
                                        produk: { kode_sku: i.kode_sku, nama: i.nama, satuan: i.satuan, harga_beli: i.harga_beli },
                                      })),
                                    };
                                    flowSQtoPO(currentQuote);
                                    showToast(`Proforma Invoice ${quoteForm.quoteNo} berhasil dialirkan ke Pesanan Penjualan (PO)!`, 'success', 'Alur Diproses');
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-emerald-50 text-slate-800 flex items-center space-x-2 font-semibold"
                                >
                                  <ShoppingCart className="w-4 h-4 text-emerald-600" />
                                  <div>
                                    <div className="font-bold text-emerald-950">+ Buat Pesanan (PO)</div>
                                    <div className="text-[10px] text-slate-500">Konversi penawaran ke pesanan</div>
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSqFlowDropdownOpen(false);
                                    const q = quotations.find((x) => x.id === quoteForm.editingId);
                                    setPrintDoc({
                                      type: 'SQ',
                                      title: 'PROFORMA INVOICE',
                                      noDoc: quoteForm.quoteNo,
                                      date: quoteForm.date,
                                      validUntil: quoteForm.validUntil,
                                      customer: q?.customer || contacts.find((c) => c.id === quoteForm.customerId),
                                      items: q?.penawaran_penjualan_detail || quoteForm.items.map((i) => ({
                                        produk_id: i.id,
                                        qty: i.qty,
                                        harga_jual: i.harga_jual,
                                        subtotal: i.total || i.qty * i.harga_jual,
                                        produk: { kode_sku: i.kode_sku, nama: i.nama, satuan: i.satuan },
                                      })),
                                      total: q?.total || calculateTotals(quoteForm.items, quoteForm.discountAmount, quoteForm.ppnActive).grandTotal,
                                      catatan: quoteForm.catatan,
                                      companySettings,
                                    });
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-800 flex items-center space-x-2 font-semibold border-t border-slate-100"
                                >
                                  <Printer className="w-4 h-4 text-slate-600" />
                                  <div>
                                    <div className="font-bold text-slate-900">Cetak Dokumen PDF</div>
                                    <div className="text-[10px] text-slate-500">Pratinjau Proforma Invoice</div>
                                  </div>
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setDeleteConfirmDoc({
                              type: 'SQ',
                              id: quoteForm.editingId,
                              noDoc: quoteForm.quoteNo,
                            })
                          }
                          className="px-3 py-1.5 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                          title="Hapus Proforma Invoice ini dari Supabase"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Hapus PI</span>
                        </button>
                      </>
                    )}
                    <button
                      onClick={handleSaveQuotation}
                      disabled={loading}
                      className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{quoteForm.editingId ? 'SIMPAN PERUBAHAN (PI)' : 'SIMPAN PROFORMA INVOICE'}</span>
                    </button>
                  </div>
                ) : null}
              </div>

              {/* VIEW: DAFTAR PROFORMA INVOICE (PI) */}
              {viewModes.quotation === 'list' && (loading ? <TableSkeleton rows={5} cols={7} /> : (() => {
                const quoteConfig = tableConfigs.quotation || DEFAULT_TABLE_CONFIGS.quotation;
                const quoteFilter = advancedFilters.quotation;

                const displayedQuotations = quotations
                  // 1. Search Query
                  .filter((q) => {
                    const s = (tableSearch.quotation || '').toLowerCase().trim();
                    if (!s) return true;
                    return (
                      (q.no_penawaran || '').toLowerCase().includes(s) ||
                      (q.customer?.nama || '').toLowerCase().includes(s) ||
                      (q.catatan && q.catatan.toLowerCase().includes(s))
                    );
                  })
                  // 2. Status
                  .filter((q) => {
                    if (quoteFilter.status === 'ALL') return true;
                    if (quoteFilter.status === 'DRAFT') return q.status === 'DRAFT';
                    if (quoteFilter.status === 'DIKIRIM') return q.status === 'DIKIRIM';
                    if (quoteFilter.status === 'TERIMA') return q.status === 'TERIMA';
                    return true;
                  })
                  // 3. Customer
                  .filter((q) => {
                    if (quoteFilter.customer === 'ALL') return true;
                    return q.customer_id === quoteFilter.customer;
                  })
                  // 4. Date Range
                  .filter((q) => {
                    if (quoteFilter.dateRange === 'ALL') return true;
                    const docDate = q.tanggal;
                    const today = new Date().toISOString().split('T')[0];
                    if (quoteFilter.dateRange === 'TODAY') return docDate === today;
                    if (quoteFilter.dateRange === '7DAYS') {
                      const d7 = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
                      return docDate >= d7 && docDate <= today;
                    }
                    if (quoteFilter.dateRange === 'THIS_MONTH') {
                      const ym = today.slice(0, 7);
                      return docDate?.startsWith(ym);
                    }
                    if (quoteFilter.dateRange === 'CUSTOM') {
                      if (quoteFilter.customStartDate && docDate < quoteFilter.customStartDate) return false;
                      if (quoteFilter.customEndDate && docDate > quoteFilter.customEndDate) return false;
                    }
                    return true;
                  })
                  // 5. Sorting
                  .sort((a, b) => {
                    if (quoteConfig.sortBy === 'date_asc') return (a.tanggal || '').localeCompare(b.tanggal || '');
                    if (quoteConfig.sortBy === 'total_desc') return Number(b.total || 0) - Number(a.total || 0);
                    if (quoteConfig.sortBy === 'total_asc') return Number(a.total || 0) - Number(b.total || 0);
                    return (b.tanggal || '').localeCompare(a.tanggal || '');
                  });

                const densityClass =
                  quoteConfig.density === 'compact'
                    ? 'py-2 px-3 text-xs'
                    : quoteConfig.density === 'spacious'
                    ? 'py-4 px-4 text-xs'
                    : 'py-2.5 px-3.5 text-xs';

                const cols = quoteConfig.visibleColumns || DEFAULT_TABLE_CONFIGS.quotation.visibleColumns;

                return (
                  <div className="flex-1 flex flex-col min-h-0 space-y-2">
                    {/* Advanced Separated Filter Toolbar */}
                    <TableFilterToolbar
                      searchQuery={tableSearch.quotation}
                      onSearchChange={(val) => setTableSearch((p) => ({ ...p, quotation: val }))}
                      searchPlaceholder="Cari no. PI, calon pelanggan, catatan..."
                      filters={quoteFilter}
                      onFilterChange={(k, v) => handleUpdateAdvancedFilter('quotation', k, v)}
                      onResetFilters={() => handleResetAdvancedFilters('quotation')}
                      contacts={contacts}
                      config={quoteConfig}
                      onOpenConfig={() => setActiveConfigModal('quotation')}
                      totalCount={displayedQuotations.length}
                      totalAmount={displayedQuotations.reduce((acc, q) => acc + Number(q.total || 0), 0)}
                      moduleType="quotation"
                    />

                    {/* Table View (Direct Click to Open, Clean) */}
                    <div className="apple-card flex-1 flex flex-col overflow-hidden rounded-2xl shadow-xs">
                      <div className="overflow-x-auto flex-1">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead className="bg-slate-50/90 backdrop-blur-sm text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                              {cols.no !== false && <th className="py-3 px-3 w-10 text-center border-r border-slate-200/60">No.</th>}
                              {cols.noPenawaran !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">No. Proforma Invoice</th>}
                              {cols.tanggal !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Tanggal</th>}
                              {cols.pelanggan !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Calon Pelanggan</th>}
                              {cols.catatan !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Keterangan / Catatan</th>}
                              {cols.total !== false && <th className="py-3 px-3.5 text-right border-r border-slate-200/60">Total Nilai (Rp)</th>}
                              {cols.status !== false && <th className="py-3 px-3.5 text-center border-r border-slate-200/60">Status</th>}
                              {cols.aksiLanjutan === true && <th className="py-3 px-3.5 text-center">Aksi Cepat</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {quotations.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-20 text-center text-slate-400 bg-white">
                                  <FileText className="w-10 h-10 mx-auto mb-2 text-emerald-800/40 stroke-[1.5]" />
                                  <p className="font-bold text-sm text-slate-700">Belum ada Proforma Invoice (PI)</p>
                                  <p className="text-xs text-slate-400 mt-0.5 mb-3">
                                    Terbitkan Proforma Invoice untuk calon pelanggan Anda sebelum pemesanan resmi.
                                  </p>
                                  <button
                                    onClick={handleResetToNewQuote}
                                    className="apple-btn-primary px-4 py-2 text-xs font-bold flex items-center space-x-1.5 mx-auto"
                                  >
                                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                    <span>Buat Proforma Invoice Sekarang</span>
                                  </button>
                                </td>
                              </tr>
                            ) : displayedQuotations.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-14 text-center text-slate-400 bg-white">
                                  <p className="font-semibold text-slate-600 text-xs">
                                    Tidak ada data Proforma Invoice yang sesuai filter yang aktif.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => handleResetAdvancedFilters('quotation')}
                                    className="apple-btn-secondary mt-2 px-3 py-1.5 text-xs font-bold"
                                  >
                                    Reset Semua Filter
                                  </button>
                                </td>
                              </tr>
                            ) : (
                              displayedQuotations.map((q, idx) => (
                                <tr
                                  key={q.id}
                                  onClick={() => {
                                    if (quoteConfig.rowClickAction === 'print_preview') {
                                      setPrintDoc({
                                        type: 'SQ',
                                        title: 'PROFORMA INVOICE',
                                        noDoc: q.no_penawaran,
                                        date: q.tanggal,
                                        validUntil: q.valid_until,
                                        customer: q.customer,
                                        items: q.penawaran_penjualan_detail || [],
                                        total: q.total,
                                        catatan: q.catatan,
                                        companySettings,
                                      });
                                    } else {
                                      handleOpenQuote(q);
                                    }
                                  }}
                                  className="hover:bg-emerald-50/50 transition-colors cursor-pointer group active:scale-[0.999]"
                                  title="Klik baris untuk membuka rincian Proforma Invoice"
                                >
                                  {cols.no !== false && (
                                    <td className={`${densityClass} text-center text-slate-400 font-mono border-r border-slate-100/80`}>
                                      {idx + 1}
                                    </td>
                                  )}
                                  {cols.noPenawaran !== false && (
                                    <td className={`${densityClass} font-mono font-bold text-emerald-950 border-r border-slate-100/80`}>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <span className="group-hover:underline">{q.no_penawaran}</span>
                                          {q.lampiran_url && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setLightboxImage({ url: q.lampiran_url, title: `Bukti Penawaran / PI - ${q.no_penawaran}` });
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
                                              setDeleteConfirmDoc({ type: 'SQ', id: q.id, noDoc: q.no_penawaran });
                                            }}
                                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Hapus Proforma Invoice"
                                          >
                                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                          </button>
                                          <Edit className="w-3 h-3 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                                        </div>
                                      </div>
                                    </td>
                                  )}
                                  {cols.tanggal !== false && (
                                    <td className={`${densityClass} text-slate-600 border-r border-slate-100/80 font-medium`}>
                                      {q.tanggal}
                                    </td>
                                  )}
                                  {cols.pelanggan !== false && (
                                    <td className={`${densityClass} font-semibold text-slate-900 border-r border-slate-100/80`}>
                                      {q.customer?.nama || '-'}
                                    </td>
                                  )}
                                  {cols.catatan !== false && (
                                    <td className={`${densityClass} text-slate-500 border-r border-slate-100/80 max-w-xs truncate`}>
                                      {q.catatan || '-'}
                                    </td>
                                  )}
                                  {cols.total !== false && (
                                    <td className={`${densityClass} text-right font-black text-slate-900 font-mono border-r border-slate-100/80`}>
                                      Rp {Number(q.total || 0).toLocaleString('id-ID')}
                                    </td>
                                  )}
                                  {cols.status !== false && (
                                    <td className={`${densityClass} text-center border-r border-slate-100/80`}>
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-800 border-emerald-200">
                                        {q.status}
                                      </span>
                                    </td>
                                  )}
                                  {cols.aksiLanjutan === true && (
                                    <td className={`${densityClass} text-center space-x-1`}>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenQuote(q);
                                        }}
                                        className="apple-btn-secondary px-2 py-1 text-[11px]"
                                      >
                                        Edit
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Bottom Status Bar */}
                      <div className="h-8 bg-slate-50/80 border-t border-slate-200/80 px-4 flex items-center justify-between text-[11px] text-slate-500 font-medium select-none">
                        <div className="flex items-center space-x-2">
                          <span>Ditampilkan: <strong>{displayedQuotations.length}</strong> dari <strong>{quotations.length}</strong> PI</span>
                          <span>•</span>
                          <span>Aktif: <strong>{quotations.filter((q) => q.status !== 'TERIMA').length}</strong></span>
                          <span>•</span>
                          <span>Diproses ke PO: <strong>{quotations.filter((q) => q.status === 'TERIMA').length}</strong></span>
                        </div>
                        <div className="font-mono text-emerald-950 font-bold text-xs">
                          Total Akumulasi: Rp {displayedQuotations.reduce((acc, q) => acc + Number(q.total || 0), 0).toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })())}

              {viewModes.quotation === 'form' && (
                <div className="bg-white rounded-lg border border-slate-300 shadow-2xs p-4 sm:p-5 space-y-4 flex-1 flex flex-col">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-slate-50/80 p-4 rounded-lg border">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Calon Pelanggan</label>
                      <GoogleLiveCustomerSearch
                        contacts={contacts}
                        selectedCustomerId={quoteForm.customerId}
                        onSelectCustomer={(id) => setQuoteForm({ ...quoteForm, customerId: id })}
                        placeholder="Pilih pelanggan..."
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">No. Proforma Invoice (Auto-Sequence)</label>
                      <input
                        type="text"
                        value={quoteForm.quoteNo}
                        readOnly
                        className="w-full px-3 py-2 border rounded-lg bg-slate-100 font-mono font-bold text-emerald-900 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <ModernDatePicker
                        label="Tanggal Proforma Invoice"
                        value={quoteForm.date}
                        onChange={async (val) => {
                          let nextNo = quoteForm.quoteNo;
                          if (!quoteForm.editingId) {
                            nextNo = (await peekNextDocNumber('SQ', val)) || nextNo;
                          }
                          setQuoteForm((prev) => ({ ...prev, date: val, quoteNo: nextNo }));
                        }}
                      />
                    </div>
                  </div>

                  <ItemSpreadsheetGrid
                    formType="QUOTE"
                    items={quoteForm.items}
                    setItems={(items) => setQuoteForm({ ...quoteForm, items })}
                    products={products}
                    customerId={quoteForm.customerId}
                    customerName={contacts.find((c) => c.id === quoteForm.customerId)?.nama || ''}
                    salesOrders={salesOrders}
                    quotations={quotations}
                    salesInvoices={salesInvoices}
                    satuanList={satuanList}
                    onAddSatuan={handleAddSatuan}
                  />

                  {/* Summary & Totals Footer for Proforma Invoice */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-3 border-t border-slate-200 text-xs">
                    <div className="w-full sm:w-1/2 space-y-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Catatan &amp; Syarat Ketentuan Proforma Invoice
                        </label>
                        <textarea
                          rows="2"
                          value={quoteForm.catatan}
                          onChange={(e) => setQuoteForm({ ...quoteForm, catatan: e.target.value })}
                          placeholder="Contoh: Harga belum termasuk ongkos kirim luar kota, estimasi produksi 3-5 hari kerja..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>

                      <FileUploadBukti
                        label="Lampiran Penawaran / Spek Kemasan"
                        value={quoteForm.lampiran_url}
                        onChange={(url) => setQuoteForm({ ...quoteForm, lampiran_url: url })}
                        docType="pi"
                        helpText="Upload dokumen penawaran atau spek khusus kemasan."
                      />
                    </div>

                    <div className="w-full sm:w-72 space-y-2">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal:</span>
                        <span className="font-semibold text-slate-800">
                          Rp {calculateTotals(quoteForm.items, 0, false).subtotal.toLocaleString('id-ID')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600">
                        <span>Potongan Diskon:</span>
                        <div className="flex items-center space-x-1">
                          <span className="text-slate-400">Rp</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={quoteForm.discountAmount ? formatDisplayDecimal(quoteForm.discountAmount) : ''}
                            placeholder="0"
                            onChange={(e) => {
                              const { num } = formatLiveInput(e.target.value);
                              setQuoteForm({ ...quoteForm, discountAmount: num });
                            }}
                            className="w-28 px-2 py-0.5 text-right border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700 bg-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-slate-600">
                        <label className="flex items-center space-x-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={quoteForm.ppnActive}
                            onChange={(e) => setQuoteForm({ ...quoteForm, ppnActive: e.target.checked })}
                            className="rounded text-emerald-700 focus:ring-emerald-700"
                          />
                          <span>Kenakan PPN (11%)</span>
                        </label>
                        <span className="font-semibold text-slate-800">
                          Rp{' '}
                          {calculateTotals(
                            quoteForm.items,
                            quoteForm.discountAmount,
                            quoteForm.ppnActive
                          ).ppn.toLocaleString('id-ID')}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-sm font-extrabold pt-2 border-t border-slate-300 text-slate-900">
                        <span>TOTAL PROFORMA INVOICE:</span>
                        <span className="text-emerald-900 text-base">
                          Rp{' '}
                          {calculateTotals(
                            quoteForm.items,
                            quoteForm.discountAmount,
                            quoteForm.ppnActive
                          ).grandTotal.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

                    {/* ======================================================== */}
          {/* 3. MODULE: UANG MUKA PENJUALAN (SALES DOWN PAYMENT / DP) */}
          {/* ======================================================== */}
          {activeTabId === 'dp' && (
            <div className="w-full flex-1 flex flex-col space-y-2">
              {/* ACCURATE TOOLBAR */}
              <div className="flex items-center justify-between px-3.5 py-2 bg-white rounded-lg border border-slate-300 shadow-2xs">
                <div className="flex items-center space-x-2.5">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-300">
                    <span className="px-3 py-1.5 rounded-md text-xs font-bold bg-[#0A3828] text-white shadow-xs flex items-center space-x-1.5">
                      <Coins className="w-3.5 h-3.5 text-amber-300" />
                      <span>Daftar Uang Muka (DP)</span>
                    </span>
                  </div>

                  <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-mono font-bold rounded">
                    SALES DOWN PAYMENT
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari no. DP, no. PO, atau pelanggan..."
                      value={tableSearch.dp || ''}
                      onChange={(e) => setTableSearch((p) => ({ ...p, dp: e.target.value }))}
                      className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs w-64 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenDPModal(null, 'PO')}
                    className="px-3.5 py-1.5 bg-[#0A3828] hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Catat Uang Muka Baru</span>
                  </button>
                </div>
              </div>

              {/* TABLE DAFTAR UANG MUKA PENJUALAN */}
              <div className="bg-white rounded-lg border border-slate-300 shadow-2xs flex-1 flex flex-col overflow-hidden">
                {/* KPI Sub-toolbar */}
                <div className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  {(() => {
                    const dpList = salesPayments.filter(
                      (p) => p.tipe_penerimaan?.startsWith('UANG_MUKA') || p.tipe_penerimaan === 'DEPOSIT_PELANGGAN'
                    );
                    const totalDP = dpList.reduce((acc, p) => acc + Number(p.total_bayar || 0), 0);
                    return (
                      <>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-600 text-[11px]">Total Transaksi:</span>
                          <span className="px-2.5 py-0.5 bg-amber-700 text-white font-bold rounded text-[11px]">
                            {dpList.length} Penerimaan DP
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium flex items-center space-x-1.5">
                          <span>Total Akumulasi Uang Muka Masuk:</span>
                          <strong className="text-emerald-950 font-mono font-bold text-xs">
                            Rp {totalDP.toLocaleString('id-ID')}
                          </strong>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-300">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center border-r border-slate-200">No.</th>
                        <th className="py-2.5 px-3 border-r border-slate-200">No. Bukti DP</th>
                        <th className="py-2.5 px-3 border-r border-slate-200">Tanggal</th>
                        <th className="py-2.5 px-3 border-r border-slate-200">Pelanggan</th>
                        <th className="py-2.5 px-3 border-r border-slate-200">Sumber & Dokumen Ref</th>
                        <th className="py-2.5 px-3 border-r border-slate-200">Disetor ke Kas / Bank</th>
                        <th className="py-2.5 px-3 text-right border-r border-slate-200">Nominal DP (Rp)</th>
                        <th className="py-2.5 px-3 text-center border-r border-slate-200">Status</th>
                        <th className="py-2.5 px-3 border-r border-slate-200">Catatan</th>
                        <th className="py-2.5 px-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(() => {
                        const dpList = salesPayments
                          .filter(
                            (p) =>
                              p.tipe_penerimaan?.startsWith('UANG_MUKA') ||
                              p.tipe_penerimaan === 'DEPOSIT_PELANGGAN'
                          )
                          .filter((p) => {
                            const q = (tableSearch.dp || '').toLowerCase();
                            return (
                              q === '' ||
                              (p.no_bukti || '').toLowerCase().includes(q) ||
                              (p.pesanan?.no_pesanan || '').toLowerCase().includes(q) ||
                              (p.faktur?.no_invoice || '').toLowerCase().includes(q) ||
                              (p.customer?.nama || '').toLowerCase().includes(q)
                            );
                          });

                        if (dpList.length === 0) {
                          return (
                            <tr>
                              <td colSpan={10} className="py-20 text-center text-slate-400 bg-white">
                                <Coins className="w-10 h-10 mx-auto mb-2 text-amber-600/40 stroke-[1.5]" />
                                <p className="font-bold text-sm text-slate-700">Belum ada penerimaan uang muka (DP)</p>
                                <p className="text-xs text-slate-400 mt-0.5 mb-3">
                                  Catat uang muka dari Pesanan Penjualan (PO), Invoice, atau Deposit Pelanggan.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDPModal(null, 'PO')}
                                  className="px-4 py-2 bg-[#0A3828] hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition inline-flex items-center space-x-1.5 shadow-xs"
                                >
                                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>Catat Uang Muka Sekarang</span>
                                </button>
                              </td>
                            </tr>
                          );
                        }

                        return dpList.map((dp, idx) => (
                          <tr key={dp.id} className="hover:bg-amber-50/50 transition-colors">
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono border-r border-slate-100">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-900 border-r border-slate-100">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span>{dp.no_bukti}</span>
                                  {dp.lampiran_url && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxImage({ url: dp.lampiran_url, title: `Bukti Uang Muka / Transfer - ${dp.no_bukti}` });
                                      }}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 transition-colors shadow-xs"
                                      title="Lihat Bukti Foto / Transfer"
                                    >
                                      <Camera className="w-3 h-3 text-emerald-700" />
                                      <span>Foto</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 border-r border-slate-100">{dp.tanggal}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-100">
                              {dp.customer?.nama || '-'}
                            </td>
                            <td className="py-2.5 px-3 border-r border-slate-100">
                              {dp.pesanan ? (
                                <div>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    PO
                                  </span>
                                  <span className="font-mono font-bold text-slate-800 ml-1.5">
                                    {dp.pesanan.no_pesanan}
                                  </span>
                                  {dp.pesanan.total && (
                                    <span className="text-[10px] text-slate-400 font-mono block">
                                      Total PO: Rp {Number(dp.pesanan.total).toLocaleString('id-ID')}
                                    </span>
                                  )}
                                </div>
                              ) : dp.faktur ? (
                                <div>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                    Faktur
                                  </span>
                                  <span className="font-mono font-bold text-slate-800 ml-1.5">
                                    {dp.faktur.no_invoice}
                                  </span>
                                  {dp.faktur.total_akhir && (
                                    <span className="text-[10px] text-slate-400 font-mono block">
                                      Total Faktur: Rp {Number(dp.faktur.total_akhir).toLocaleString('id-ID')}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    Deposit
                                  </span>
                                  <span className="text-slate-600 text-xs ml-1.5">Bebas / Langsung</span>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 border-r border-slate-100 font-medium">
                              {dp.akun?.nama_akun || 'Bank Transfer'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-950 font-mono border-r border-slate-100">
                              Rp {Number(dp.total_bayar || 0).toLocaleString('id-ID')}
                            </td>
                            <td className="py-2.5 px-3 text-center border-r border-slate-100">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-amber-50 text-amber-900 border-amber-300">
                                DP AKTIF
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 border-r border-slate-100">{dp.catatan || '-'}</td>
                            <td className="py-2.5 px-3 text-center space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() =>
                                  setPrintDoc({
                                    type: 'DP',
                                    title: 'BUKTI PENERIMAAN UANG MUKA (DP)',
                                    noDoc: dp.no_bukti,
                                    date: dp.tanggal,
                                    customer: dp.customer,
                                    poNo: dp.pesanan?.no_pesanan || dp.faktur?.no_invoice || 'Deposit',
                                    totalPO: dp.pesanan?.total || dp.faktur?.total_akhir,
                                    total: dp.total_bayar,
                                    akunKas: dp.akun?.nama_akun,
                                    catatan: dp.catatan,
                                    companySettings,
                                  })
                                }
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-[11px] font-semibold inline-flex items-center space-x-1 transition"
                                title="Cetak Kuitansi Uang Muka"
                              >
                                <Printer className="w-3 h-3" />
                                <span>PDF</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteConfirmDoc({
                                    type: 'DP',
                                    id: dp.id,
                                    noDoc: dp.no_bukti,
                                    pesananId: dp.pesanan_id,
                                    fakturId: dp.faktur_id,
                                    amount: dp.total_bayar,
                                  })
                                }
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                title="Batalkan / Hapus Uang Muka ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Accurate Bottom Status Bar */}
                <div className="h-7 bg-slate-50 border-t border-slate-200 px-3 flex items-center justify-between text-[11px] text-slate-500 font-medium select-none">
                  {(() => {
                    const dpList = salesPayments.filter((p) => p.tipe_penerimaan === 'UANG_MUKA_PESANAN');
                    const totalDP = dpList.reduce((acc, p) => acc + Number(p.total_bayar || 0), 0);
                    return (
                      <>
                        <span>Total: <strong>{dpList.length}</strong> transaksi penerimaan uang muka</span>
                        <div className="font-mono text-emerald-900 font-bold text-xs">
                          Total DP Terkumpul: Rp {totalDP.toLocaleString('id-ID')}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. MODULE: PENGIRIMAN PESANAN (DO)                       */}
          {/* ======================================================== */}
          {activeTabId === 'do' && (
            <div className="w-full flex-1 flex flex-col space-y-2">
              <div className="flex items-center justify-between px-3.5 py-2 bg-white rounded-lg border border-slate-300 shadow-2xs">
                <div className="flex items-center space-x-2.5">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-300">
                    <button
                      type="button"
                      onClick={() => setViewModes((p) => ({ ...p, do: 'list' }))}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 ${
                        viewModes.do === 'list'
                          ? 'bg-[#0A3828] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                      title="Lihat Daftar Surat Jalan"
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Daftar Surat Jalan (DO)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToNewDO}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 ${
                        viewModes.do === 'form'
                          ? 'bg-[#0A3828] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                      title="Buka Formulir Buat Surat Jalan Baru (Form Kosong)"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Input Surat Jalan Baru</span>
                    </button>
                  </div>

                  <div className="hidden sm:flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-200 text-[10px] font-mono font-bold rounded">
                      DELIVERY ORDER
                    </span>
                  </div>
                </div>

                {viewModes.do === 'form' ? (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        const cust = contacts.find((c) => c.id === doForm.customerId);
                        setPrintDoc({
                          type: 'DO',
                          title: 'SURAT JALAN PENGIRIMAN',
                          noDoc: doForm.doNo,
                          date: doForm.date,
                          customer: cust,
                          items: doForm.items,
                          ekspedisi: doForm.ekspedisi,
                          noResi: doForm.noResi,
                          catatan: doForm.catatan,
                          companySettings,
                        });
                      }}
                      className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 flex items-center space-x-1"
                      title="Cetak Surat Jalan / Pratinjau PDF"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      <span>Cetak Surat Jalan</span>
                    </button>
                    {doForm.editingId && (
                      <>
                        {/* PROSES ALUR DROPDOWN */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setDoFlowDropdownOpen(!doFlowDropdownOpen)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5 transition"
                          >
                            <Workflow className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Proses Alur ▾</span>
                          </button>
                          {doFlowDropdownOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-20 cursor-default"
                                onClick={() => setDoFlowDropdownOpen(false)}
                              />
                              <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-30 text-xs text-left animate-in fade-in duration-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDoFlowDropdownOpen(false);
                                    const currentDO = deliveryOrders.find((d) => d.id === doForm.editingId) || {
                                      id: doForm.editingId,
                                      no_surat_jalan: doForm.doNo,
                                      customer_id: doForm.customerId,
                                      pengiriman_pesanan_detail: doForm.items.map((i) => ({
                                        produk_id: i.id,
                                        qty: i.qty,
                                        produk: i,
                                      })),
                                    };
                                    flowDOtoSI(currentDO);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-blue-50 text-slate-800 flex items-center space-x-2 font-semibold"
                                >
                                  <FileText className="w-4 h-4 text-blue-600" />
                                  <div>
                                    <div className="font-bold text-blue-950">+ Terbitkan Invoice (SI)</div>
                                    <div className="text-[10px] text-slate-500">Alirkan ke Faktur Penjualan</div>
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDoFlowDropdownOpen(false);
                                    const d = deliveryOrders.find((x) => x.id === doForm.editingId);
                                    if (d) {
                                      setPrintDoc({
                                        type: 'DO',
                                        title: 'SURAT JALAN PENGIRIMAN',
                                        noDoc: d.no_surat_jalan,
                                        date: d.tanggal,
                                        customer: d.customer,
                                        items: d.pengiriman_pesanan_detail || [],
                                        ekspedisi: d.ekspedisi,
                                        catatan: d.catatan,
                                        companySettings,
                                      });
                                    }
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-800 flex items-center space-x-2 font-semibold border-t border-slate-100"
                                >
                                  <Printer className="w-4 h-4 text-slate-600" />
                                  <span>Cetak Surat Jalan PDF</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        {/* TOMBOL HAPUS DO */}
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteConfirmDoc({
                              type: 'DO',
                              id: doForm.editingId,
                              noDoc: doForm.doNo,
                            })
                          }
                          className="px-3 py-1.5 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                          title="Hapus surat jalan ini dari Supabase"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Hapus DO</span>
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setDoSearchQuery('');
                        setDoGetFromModalOpen(true);
                      }}
                      className="px-3 py-1.5 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition shadow-2xs"
                      title="Ambil data dari Pesanan Penjualan (PO) yang belum dikirim"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Ambil (PO) ▾</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToNewDO}
                      className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Form Baru</span>
                    </button>
                    <button
                      onClick={handleSaveDO}
                      disabled={loading}
                      className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{doForm.editingId ? 'SIMPAN PERUBAHAN (DO)' : 'TERBITKAN SURAT JALAN (DO)'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      placeholder="Cari no. DO atau pelanggan..."
                      value={tableSearch.do || ''}
                      onChange={(e) => setTableSearch((p) => ({ ...p, do: e.target.value }))}
                      className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs w-64 bg-white outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>
                )}
              </div>

              {viewModes.do === 'list' && (loading ? <TableSkeleton rows={5} cols={7} /> : (() => {
                const doConfig = tableConfigs.do || DEFAULT_TABLE_CONFIGS.do;
                const doFilter = advancedFilters.do || { status: 'ALL', dateRange: 'ALL', customer: 'ALL' };

                const displayedDeliveryOrders = deliveryOrders
                  // 1. Search Query
                  .filter((d) => {
                    const q = (tableSearch.do || '').toLowerCase().trim();
                    if (!q) return true;
                    return (
                      (d.no_surat_jalan || '').toLowerCase().includes(q) ||
                      (d.customer?.nama || '').toLowerCase().includes(q) ||
                      (d.ekspedisi || '').toLowerCase().includes(q) ||
                      (d.catatan && d.catatan.toLowerCase().includes(q))
                    );
                  })
                  // 2. Status
                  .filter((d) => {
                    if (doFilter.status === 'ALL') return true;
                    if (doFilter.status === 'TERKIRIM') return d.status === 'TERKIRIM';
                    if (doFilter.status === 'PROSES' || doFilter.status === 'MENUNGGU_KIRIM') return d.status !== 'TERKIRIM';
                    return true;
                  })
                  // 3. Customer
                  .filter((d) => {
                    if (doFilter.customer === 'ALL') return true;
                    return d.customer_id === doFilter.customer;
                  })
                  // 4. Date Range
                  .filter((d) => {
                    if (doFilter.dateRange === 'ALL') return true;
                    const docDate = d.tanggal;
                    const today = new Date().toISOString().split('T')[0];
                    if (doFilter.dateRange === 'TODAY') return docDate === today;
                    if (doFilter.dateRange === '7DAYS') {
                      const d7 = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
                      return docDate >= d7 && docDate <= today;
                    }
                    if (doFilter.dateRange === 'THIS_MONTH') {
                      const ym = today.slice(0, 7);
                      return docDate?.startsWith(ym);
                    }
                    if (doFilter.dateRange === 'CUSTOM') {
                      if (doFilter.customStartDate && docDate < doFilter.customStartDate) return false;
                      if (doFilter.customEndDate && docDate > doFilter.customEndDate) return false;
                    }
                    return true;
                  })
                  // 5. Sorting
                  .sort((a, b) => {
                    if (doConfig.sortBy === 'date_asc') return (a.tanggal || '').localeCompare(b.tanggal || '');
                    return (b.tanggal || '').localeCompare(a.tanggal || '');
                  });

                const densityClass =
                  doConfig.density === 'compact'
                    ? 'py-2 px-3 text-xs'
                    : doConfig.density === 'spacious'
                    ? 'py-4 px-4 text-xs'
                    : 'py-2.5 px-3.5 text-xs';

                const cols = doConfig.visibleColumns || DEFAULT_TABLE_CONFIGS.do.visibleColumns;

                return (
                  <div className="flex-1 flex flex-col min-h-0 space-y-2">
                    {/* Advanced Separated Filter Toolbar */}
                    <TableFilterToolbar
                      searchQuery={tableSearch.do}
                      onSearchChange={(val) => setTableSearch((p) => ({ ...p, do: val }))}
                      searchPlaceholder="Cari no. surat jalan, pelanggan, ekspedisi..."
                      filters={doFilter}
                      onFilterChange={(k, v) => handleUpdateAdvancedFilter('do', k, v)}
                      onResetFilters={() => handleResetAdvancedFilters('do')}
                      contacts={contacts}
                      config={doConfig}
                      onOpenConfig={() => setActiveConfigModal('do')}
                      totalCount={displayedDeliveryOrders.length}
                      moduleType="do"
                    />

                    {/* Table View (Clean, No Clutter, Direct Row Click) */}
                    <div className="apple-card flex-1 flex flex-col overflow-hidden rounded-2xl shadow-xs">
                      <div className="overflow-x-auto flex-1">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead className="bg-slate-50/90 backdrop-blur-sm text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                              {cols.no !== false && <th className="py-3 px-3 w-10 text-center border-r border-slate-200/60">No.</th>}
                              {cols.noPengiriman !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">No. Surat Jalan</th>}
                              {cols.tanggal !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Tanggal</th>}
                              {cols.pelanggan !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Pelanggan</th>}
                              {cols.alamatKirim !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Armada / Kurir</th>}
                              {cols.status !== false && <th className="py-3 px-3.5 text-center border-r border-slate-200/60">Status</th>}
                              {cols.aksiLanjutan === true && <th className="py-3 px-3.5 text-center">Aksi Cepat</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {deliveryOrders.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-20 text-center text-slate-400 bg-white">
                                  <Truck className="w-10 h-10 mx-auto mb-2 text-emerald-800/40 stroke-[1.5]" />
                                  <p className="font-bold text-sm text-slate-700">Belum ada surat jalan pengiriman (DO)</p>
                                  <p className="text-xs text-slate-400 mt-0.5 mb-3">
                                    Terbitkan surat jalan saat barang kemasan dikirimkan ke pelanggan.
                                  </p>
                                  <button
                                    onClick={handleResetToNewDO}
                                    className="apple-btn-primary px-4 py-2 text-xs font-bold flex items-center space-x-1.5 mx-auto"
                                  >
                                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                    <span>Buat Surat Jalan Sekarang</span>
                                  </button>
                                </td>
                              </tr>
                            ) : displayedDeliveryOrders.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-14 text-center text-slate-400 bg-white">
                                  <p className="font-semibold text-slate-600 text-xs">
                                    Tidak ada data surat jalan yang sesuai dengan filter yang aktif.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => handleResetAdvancedFilters('do')}
                                    className="apple-btn-secondary mt-2 px-3 py-1.5 text-xs font-bold"
                                  >
                                    Reset Semua Filter
                                  </button>
                                </td>
                              </tr>
                            ) : (
                              displayedDeliveryOrders.map((d, idx) => (
                                <tr
                                  key={d.id}
                                  onClick={() => {
                                    if (doConfig.rowClickAction === 'print_preview') {
                                      setPrintDoc({
                                        type: 'DO',
                                        title: 'SURAT JALAN PENGIRIMAN',
                                        noDoc: d.no_surat_jalan,
                                        date: d.tanggal,
                                        customer: d.customer,
                                        items: d.pengiriman_pesanan_detail || [],
                                        ekspedisi: d.ekspedisi,
                                        noResi: d.no_resi,
                                        catatan: d.catatan,
                                        companySettings,
                                      });
                                    } else {
                                      handleOpenDO(d);
                                    }
                                  }}
                                  className="hover:bg-emerald-50/50 transition-colors cursor-pointer group active:scale-[0.999]"
                                  title="Klik baris untuk membuka rincian surat jalan"
                                >
                                  {cols.no !== false && (
                                    <td className={`${densityClass} text-center text-slate-400 font-mono border-r border-slate-100/80`}>
                                      {idx + 1}
                                    </td>
                                  )}
                                  {cols.noPengiriman !== false && (
                                    <td className={`${densityClass} font-mono font-bold text-emerald-950 border-r border-slate-100/80`}>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <span className="group-hover:underline">{d.no_surat_jalan}</span>
                                          {d.lampiran_url && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setLightboxImage({ url: d.lampiran_url, title: `Bukti Surat Jalan / Pengiriman - ${d.no_surat_jalan}` });
                                              }}
                                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 transition-colors shadow-xs"
                                              title="Lihat Bukti Foto Surat Jalan / Terima Barang"
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
                                              setDeleteConfirmDoc({ type: 'DO', id: d.id, noDoc: d.no_surat_jalan });
                                            }}
                                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Hapus Surat Jalan"
                                          >
                                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                          </button>
                                          <Edit className="w-3 h-3 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                                        </div>
                                      </div>
                                    </td>
                                  )}
                                  {cols.tanggal !== false && (
                                    <td className={`${densityClass} text-slate-600 border-r border-slate-100/80`}>
                                      {d.tanggal}
                                    </td>
                                  )}
                                  {cols.pelanggan !== false && (
                                    <td className={`${densityClass} font-bold text-slate-900 border-r border-slate-100/80`}>
                                      {d.customer?.nama || '-'}
                                    </td>
                                  )}
                                  {cols.alamatKirim !== false && (
                                    <td className={`${densityClass} text-slate-600 border-r border-slate-100/80`}>
                                      {d.ekspedisi || 'Armada FAG'}
                                    </td>
                                  )}
                                  {cols.status !== false && (
                                    <td className={`${densityClass} text-center border-r border-slate-100/80`}>
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                          d.status === 'TERKIRIM'
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                            : 'bg-amber-50 text-amber-800 border-amber-300'
                                        }`}
                                      >
                                        {d.status === 'TERKIRIM' ? 'Terkirim Selesai' : 'Dalam Perjalanan'}
                                      </span>
                                    </td>
                                  )}
                                  {cols.aksiLanjutan === true && (
                                    <td className={`${densityClass} text-center space-x-1 whitespace-nowrap`}>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          flowDOtoSI(d);
                                        }}
                                        className="apple-btn-secondary px-2 py-1 text-[11px] font-bold text-emerald-900"
                                      >
                                        + Invoice
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
                          <span>Ditampilkan: <strong className="text-slate-800">{displayedDeliveryOrders.length}</strong> dari <strong className="text-slate-800">{deliveryOrders.length}</strong> surat jalan</span>
                          <span>•</span>
                          <span>Terkirim: <strong className="text-emerald-700">{deliveryOrders.filter((d) => d.status === 'TERKIRIM').length}</strong></span>
                          <span>•</span>
                          <span>Dalam Perjalanan: <strong className="text-amber-700">{deliveryOrders.filter((d) => d.status !== 'TERKIRIM').length}</strong></span>
                        </div>
                        <div className="text-emerald-800 font-bold text-xs flex items-center space-x-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Status Logistik: Siap Kirim</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })())}

              {viewModes.do === 'form' && (
                <div className="bg-white rounded-lg border border-slate-300 shadow-2xs p-4 sm:p-5 space-y-4 flex-1 flex flex-col">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs bg-slate-50/80 p-4 rounded-lg border">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Pelanggan Kemasan</label>
                      <GoogleLiveCustomerSearch
                        contacts={contacts}
                        selectedCustomerId={doForm.customerId}
                        onSelectCustomer={(id) => setDoForm({ ...doForm, customerId: id })}
                        placeholder="Pilih pelanggan..."
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">No. Surat Jalan (Auto)</label>
                      <input
                        type="text"
                        value={doForm.doNo}
                        readOnly
                        className="w-full px-3 py-2 border rounded-lg bg-slate-100 font-mono font-bold text-emerald-900"
                      />
                    </div>
                    <div>
                      <ModernDatePicker
                        label="Tanggal Pengiriman"
                        value={doForm.date}
                        onChange={(val) => setDoForm({ ...doForm, date: val })}
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Armada / Kurir</label>
                      <input
                        type="text"
                        value={doForm.ekspedisi}
                        onChange={(e) => setDoForm({ ...doForm, ekspedisi: e.target.value })}
                        placeholder="Contoh: Truk Box / Lalamove"
                        className="w-full px-3 py-2 border rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  <ItemSpreadsheetGrid
                    formType="DO"
                    items={doForm.items}
                    setItems={(items) => setDoForm({ ...doForm, items })}
                    products={products}
                    customerId={doForm.customerId}
                    customerName={contacts.find((c) => c.id === doForm.customerId)?.nama || ''}
                    salesOrders={salesOrders}
                    quotations={quotations}
                    salesInvoices={salesInvoices}
                    satuanList={satuanList}
                    onAddSatuan={handleAddSatuan}
                  />

                  {/* Summary & Metrics Footer for Delivery Order */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-3 border-t border-slate-200 text-xs">
                    <div className="w-full sm:w-1/2 space-y-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Catatan Pengiriman &amp; Instruksi Khusus Driver
                        </label>
                        <textarea
                          rows="2"
                          value={doForm.catatan}
                          onChange={(e) => setDoForm({ ...doForm, catatan: e.target.value })}
                          placeholder="Contoh: Diterima oleh Pak Slamet / Masuk pintu barat gerbang gudang..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>

                      <FileUploadBukti
                        label="Foto Bukti Pengiriman / Resi / Serah Terima Barang"
                        value={doForm.lampiran_url}
                        onChange={(url) => setDoForm({ ...doForm, lampiran_url: url })}
                        docType="do"
                        helpText="Upload foto barang di armada pengiriman, resi ekspedisi, atau paraf penerima."
                      />
                    </div>

                    <div className="w-full sm:w-72 space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="flex justify-between text-slate-600">
                        <span>Total Macam Barang (SKU):</span>
                        <span className="font-bold text-slate-800">{doForm.items.length} Macam SKU</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-extrabold pt-2 border-t border-slate-200 text-slate-900">
                        <span>TOTAL KUANTITAS TERKIRIM:</span>
                        <span className="text-emerald-900 text-base">
                          {doForm.items.reduce((acc, i) => acc + Number(i.qty || 0), 0).toLocaleString('id-ID')} Pcs / Unit
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* 4. MODULE: FAKTUR PENJUALAN (SI)                         */}
          {/* ======================================================== */}
          {activeTabId === 'si' && (
            <div className="w-full flex-1 flex flex-col space-y-2">
              <div className="flex items-center justify-between px-3.5 py-2 bg-white rounded-lg border border-slate-300 shadow-2xs">
                <div className="flex items-center space-x-2.5">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-300">
                    <button
                      type="button"
                      onClick={() => setViewModes((p) => ({ ...p, si: 'list' }))}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 ${
                        viewModes.si === 'list'
                          ? 'bg-[#0A3828] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                      title="Lihat Daftar Invoice Tagihan"
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Daftar Invoice</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToNewSI}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 ${
                        viewModes.si === 'form'
                          ? 'bg-[#0A3828] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                      title="Buka Formulir Input Invoice Baru (Form Kosong)"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Input Invoice Baru</span>
                    </button>
                  </div>

                  <div className="hidden sm:flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-200 text-[10px] font-mono font-bold rounded">
                      INVOICE
                    </span>
                  </div>
                </div>

                {viewModes.si === 'form' ? (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        const cust = contacts.find((c) => c.id === siForm.customerId);
                        const totals = calculateTotals(siForm.items, siForm.diskon || 0, siForm.isPpn);
                        setPrintDoc({
                          type: 'SI',
                          title: 'FAKTUR / INVOICE PENJUALAN',
                          noDoc: siForm.invoiceNo,
                          date: siForm.date,
                          dueDate: siForm.dueDate,
                          customer: cust,
                          items: siForm.items,
                          total: totals.total,
                          subtotal: totals.subtotal,
                          diskon: totals.diskon,
                          ppn: totals.ppn,
                          uangMuka: siForm.uangMuka || 0,
                          catatan: siForm.catatan,
                          companySettings,
                        });
                      }}
                      className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 flex items-center space-x-1"
                      title="Cetak Invoice / Pratinjau PDF"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      <span>Cetak Invoice</span>
                    </button>
                    {siForm.editingId && (
                      <>
                        {/* PROSES ALUR DROPDOWN */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setSiFlowDropdownOpen(!siFlowDropdownOpen)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5 transition"
                          >
                            <Workflow className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Proses Alur ▾</span>
                          </button>
                          {siFlowDropdownOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-20 cursor-default"
                                onClick={() => setSiFlowDropdownOpen(false)}
                              />
                              <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-30 text-xs text-left animate-in fade-in duration-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSiFlowDropdownOpen(false);
                                    const currentSI = salesInvoices.find((i) => i.id === siForm.editingId) || {
                                      id: siForm.editingId,
                                      no_faktur: siForm.invoiceNo,
                                      customer_id: siForm.customerId,
                                      total_akhir: calculateTotals(siForm.items, siForm.discountAmount, siForm.ppnActive).grandTotal,
                                      bayar: siForm.uangMuka || 0,
                                    };
                                    flowSItoPayment(currentSI);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-emerald-50 text-slate-800 flex items-center space-x-2 font-semibold"
                                >
                                  <Coins className="w-4 h-4 text-emerald-600" />
                                  <div>
                                    <div className="font-bold text-emerald-950">+ Terima Pembayaran (CR)</div>
                                    <div className="text-[10px] text-slate-500">Catat pelunasan piutang pelanggan</div>
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSiFlowDropdownOpen(false);
                                    const inv = salesInvoices.find((x) => x.id === siForm.editingId);
                                    const cust = contacts.find((c) => c.id === siForm.customerId);
                                    const totals = calculateTotals(siForm.items, siForm.discountAmount, siForm.ppnActive);
                                    setPrintDoc({
                                      type: 'SI',
                                      title: 'FAKTUR PENJUALAN',
                                      noDoc: siForm.invoiceNo,
                                      date: siForm.date,
                                      customer: cust,
                                      items: inv?.penjualan_detail || siForm.items,
                                      total: totals.grandTotal,
                                      subtotal: totals.subtotal,
                                      diskon: totals.diskon,
                                      ppn: totals.ppn,
                                      uangMuka: siForm.uangMuka || 0,
                                      catatan: siForm.catatan,
                                      companySettings,
                                    });
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-800 flex items-center space-x-2 font-semibold border-t border-slate-100"
                                >
                                  <Printer className="w-4 h-4 text-slate-600" />
                                  <span>Cetak Invoice PDF</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        {/* TOMBOL HAPUS INVOICE */}
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteConfirmDoc({
                              type: 'SI',
                              id: siForm.editingId,
                              noDoc: siForm.invoiceNo,
                            })
                          }
                          className="px-3 py-1.5 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                          title="Hapus Faktur Penjualan ini dari Supabase"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Hapus Invoice</span>
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSiSearchQuery('');
                        setSiTakeTab('DO');
                        setSiGetFromModalOpen(true);
                      }}
                      className="px-3 py-1.5 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition shadow-2xs"
                      title="Ambil data dari Surat Jalan (DO) atau Pesanan Penjualan (PO)"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Ambil (DO / PO) ▾</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToNewSI}
                      className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Form Baru</span>
                    </button>
                    <button
                      onClick={handleSaveSalesInvoice}
                      disabled={loading}
                      className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{siForm.editingId ? 'SIMPAN PERUBAHAN INVOICE' : 'TERBITKAN INVOICE'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      placeholder="Cari no. invoice atau pelanggan..."
                      value={tableSearch.si || ''}
                      onChange={(e) => setTableSearch((p) => ({ ...p, si: e.target.value }))}
                      className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs w-64 bg-white outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>
                )}
              </div>

              {viewModes.si === 'list' && (loading ? <TableSkeleton rows={5} cols={8} /> : (() => {
                const siConfig = tableConfigs.si || DEFAULT_TABLE_CONFIGS.si;
                const siFilter = advancedFilters.si || { statusBayar: 'ALL', dateRange: 'ALL', customer: 'ALL' };

                const displayedSalesInvoices = salesInvoices
                  // 1. Search Query
                  .filter((i) => {
                    const q = (tableSearch.si || '').toLowerCase().trim();
                    if (!q) return true;
                    return (
                      (i.no_invoice || '').toLowerCase().includes(q) ||
                      (i.customer?.nama || '').toLowerCase().includes(q) ||
                      (i.catatan && i.catatan.toLowerCase().includes(q))
                    );
                  })
                  // 2. Status Bayar
                  .filter((i) => {
                    if (siFilter.statusBayar === 'ALL') return true;
                    if (siFilter.statusBayar === 'PIUTANG') return i.status === 'PIUTANG';
                    if (siFilter.statusBayar === 'LUNAS') return i.status === 'LUNAS';
                    return true;
                  })
                  // 3. Customer
                  .filter((i) => {
                    if (siFilter.customer === 'ALL') return true;
                    return i.customer_id === siFilter.customer;
                  })
                  // 4. Date Range
                  .filter((i) => {
                    if (siFilter.dateRange === 'ALL') return true;
                    const docDate = i.tanggal;
                    const today = new Date().toISOString().split('T')[0];
                    if (siFilter.dateRange === 'TODAY') return docDate === today;
                    if (siFilter.dateRange === '7DAYS') {
                      const d7 = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
                      return docDate >= d7 && docDate <= today;
                    }
                    if (siFilter.dateRange === 'THIS_MONTH') {
                      const ym = today.slice(0, 7);
                      return docDate?.startsWith(ym);
                    }
                    if (siFilter.dateRange === 'CUSTOM') {
                      if (siFilter.customStartDate && docDate < siFilter.customStartDate) return false;
                      if (siFilter.customEndDate && docDate > siFilter.customEndDate) return false;
                    }
                    return true;
                  })
                  // 5. Sorting
                  .sort((a, b) => {
                    if (siConfig.sortBy === 'date_asc') return (a.tanggal || '').localeCompare(b.tanggal || '');
                    if (siConfig.sortBy === 'total_desc') return Number(b.total_akhir || 0) - Number(a.total_akhir || 0);
                    if (siConfig.sortBy === 'total_asc') return Number(a.total_akhir || 0) - Number(b.total_akhir || 0);
                    return (b.tanggal || '').localeCompare(a.tanggal || '');
                  });

                const densityClass =
                  siConfig.density === 'compact'
                    ? 'py-2 px-3 text-xs'
                    : siConfig.density === 'spacious'
                    ? 'py-4 px-4 text-xs'
                    : 'py-2.5 px-3.5 text-xs';

                const cols = siConfig.visibleColumns || DEFAULT_TABLE_CONFIGS.si.visibleColumns;

                return (
                  <div className="flex-1 flex flex-col min-h-0 space-y-2">
                    {/* Advanced Separated Filter Toolbar */}
                    <TableFilterToolbar
                      searchQuery={tableSearch.si}
                      onSearchChange={(val) => setTableSearch((p) => ({ ...p, si: val }))}
                      searchPlaceholder="Cari no. invoice, pelanggan, catatan..."
                      filters={siFilter}
                      onFilterChange={(k, v) => handleUpdateAdvancedFilter('si', k, v)}
                      onResetFilters={() => handleResetAdvancedFilters('si')}
                      contacts={contacts}
                      config={siConfig}
                      onOpenConfig={() => setActiveConfigModal('si')}
                      totalCount={displayedSalesInvoices.length}
                      totalAmount={displayedSalesInvoices.reduce((acc, i) => acc + Number(i.total_akhir || 0), 0)}
                      moduleType="si"
                    />

                    {/* Table View (Clean, No Clutter, Direct Row Click) */}
                    <div className="apple-card flex-1 flex flex-col overflow-hidden rounded-2xl shadow-xs">
                      <div className="overflow-x-auto flex-1">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead className="bg-slate-50/90 backdrop-blur-sm text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                              {cols.no !== false && <th className="py-3 px-3 w-10 text-center border-r border-slate-200/60">No.</th>}
                              {cols.noInvoice !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">No. Invoice</th>}
                              {cols.tanggal !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Tanggal</th>}
                              {cols.pelanggan !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Pelanggan</th>}
                              {cols.jatuhTempo !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Termin / Jatuh Tempo</th>}
                              {cols.total !== false && <th className="py-3 px-3.5 text-right border-r border-slate-200/60">Total Tagihan (Rp)</th>}
                              {cols.statusBayar !== false && <th className="py-3 px-3.5 text-center border-r border-slate-200/60">Status</th>}
                              {cols.aksiLanjutan === true && <th className="py-3 px-3.5 text-center">Aksi Cepat</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {salesInvoices.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-20 text-center text-slate-400 bg-white">
                                  <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-emerald-800/40 stroke-[1.5]" />
                                  <p className="font-bold text-sm text-slate-700">Belum ada invoice tagihan</p>
                                  <p className="text-xs text-slate-400 mt-0.5 mb-3">
                                    Terbitkan tagihan invoice atas pesanan kemasan pelanggan.
                                  </p>
                                  <button
                                    onClick={handleResetToNewSI}
                                    className="apple-btn-primary px-4 py-2 text-xs font-bold flex items-center space-x-1.5 mx-auto"
                                  >
                                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                    <span>Buat Invoice Sekarang</span>
                                  </button>
                                </td>
                              </tr>
                            ) : displayedSalesInvoices.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-14 text-center text-slate-400 bg-white">
                                  <p className="font-semibold text-slate-600 text-xs">
                                    Tidak ada data invoice yang sesuai dengan filter yang aktif.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => handleResetAdvancedFilters('si')}
                                    className="apple-btn-secondary mt-2 px-3 py-1.5 text-xs font-bold"
                                  >
                                    Reset Semua Filter
                                  </button>
                                </td>
                              </tr>
                            ) : (
                              displayedSalesInvoices.map((i, idx) => (
                                <tr
                                  key={i.id}
                                  onClick={() => {
                                    if (siConfig.rowClickAction === 'print_preview') {
                                      setPrintDoc({
                                        type: 'SI',
                                        title: 'INVOICE',
                                        noDoc: i.no_invoice,
                                        date: i.tanggal,
                                        dueDate: i.tgl_jatuh_tempo || i.syarat_bayar,
                                        customer: i.customer,
                                        items: i.penjualan_detail || [],
                                        subtotal: i.total_bruto,
                                        diskon: i.diskon || 0,
                                        ppn: i.ppn_nominal || 0,
                                        total: i.total_akhir,
                                        uangMuka: i.uang_muka || 0,
                                        catatan: i.catatan,
                                        companySettings,
                                      });
                                    } else {
                                      handleOpenSI(i);
                                    }
                                  }}
                                  className="hover:bg-emerald-50/50 transition-colors cursor-pointer group active:scale-[0.999]"
                                  title="Klik baris untuk membuka rincian invoice"
                                >
                                  {cols.no !== false && (
                                    <td className={`${densityClass} text-center text-slate-400 font-mono border-r border-slate-100/80`}>
                                      {idx + 1}
                                    </td>
                                  )}
                                  {cols.noInvoice !== false && (
                                    <td className={`${densityClass} font-mono font-bold text-emerald-950 border-r border-slate-100/80`}>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <span className="group-hover:underline">{i.no_invoice}</span>
                                          {i.lampiran_url && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setLightboxImage({ url: i.lampiran_url, title: `Bukti Invoice / Faktur Penjualan - ${i.no_invoice}` });
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
                                              setDeleteConfirmDoc({ type: 'SI', id: i.id, noDoc: i.no_invoice });
                                            }}
                                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Hapus Invoice"
                                          >
                                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                          </button>
                                          <Edit className="w-3 h-3 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                                        </div>
                                      </div>
                                    </td>
                                  )}
                                  {cols.tanggal !== false && (
                                    <td className={`${densityClass} text-slate-600 border-r border-slate-100/80`}>
                                      {i.tanggal}
                                    </td>
                                  )}
                                  {cols.pelanggan !== false && (
                                    <td className={`${densityClass} font-bold text-slate-900 border-r border-slate-100/80`}>
                                      {i.customer?.nama || '-'}
                                    </td>
                                  )}
                                  {cols.jatuhTempo !== false && (
                                    <td className={`${densityClass} text-slate-500 border-r border-slate-100/80`}>
                                      {i.syarat_bayar || 'Net 30'}
                                    </td>
                                  )}
                                  {cols.total !== false && (
                                    <td className={`${densityClass} text-right font-bold text-slate-900 font-mono border-r border-slate-100/80`}>
                                      Rp {Number(i.total_akhir || 0).toLocaleString('id-ID')}
                                    </td>
                                  )}
                                  {cols.statusBayar !== false && (
                                    <td className={`${densityClass} text-center border-r border-slate-100/80`}>
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                          i.status === 'LUNAS'
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                            : 'bg-rose-50 text-rose-800 border-rose-300'
                                        }`}
                                      >
                                        {i.status === 'LUNAS' ? 'Lunas Penuh' : 'Belum Lunas (Piutang)'}
                                      </span>
                                    </td>
                                  )}
                                  {cols.aksiLanjutan === true && (
                                    <td className={`${densityClass} text-center space-x-1 whitespace-nowrap`}>
                                      {i.status === 'PIUTANG' && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            flowSItoPayment(i);
                                          }}
                                          className="apple-btn-secondary px-2 py-1 text-[11px] font-bold text-emerald-900"
                                        >
                                          + Pelunasan
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
                          <span>Ditampilkan: <strong className="text-slate-800">{displayedSalesInvoices.length}</strong> dari <strong className="text-slate-800">{salesInvoices.length}</strong> invoice</span>
                          <span>•</span>
                          <span>Piutang: <strong className="text-rose-700">{salesInvoices.filter((i) => i.status === 'PIUTANG').length}</strong></span>
                          <span>•</span>
                          <span>Lunas: <strong className="text-emerald-700">{salesInvoices.filter((i) => i.status === 'LUNAS').length}</strong></span>
                        </div>
                        <div className="font-mono text-emerald-950 font-bold text-xs">
                          Akumulasi Nilai: Rp {displayedSalesInvoices.reduce((acc, i) => acc + Number(i.total_akhir || 0), 0).toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })())}

              {viewModes.si === 'form' && (
                <div className="bg-white rounded-lg border border-slate-300 shadow-2xs p-4 sm:p-5 space-y-4 flex-1 flex flex-col">
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5 text-xs bg-slate-50/80 p-4 rounded-lg border">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Pelanggan</label>
                      <GoogleLiveCustomerSearch
                        contacts={contacts}
                        selectedCustomerId={siForm.customerId}
                        onSelectCustomer={(id) => setSiForm({ ...siForm, customerId: id })}
                        placeholder="Pilih pelanggan..."
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">No. Invoice (Auto-Sequence)</label>
                      <input
                        type="text"
                        value={siForm.invoiceNo}
                        readOnly
                        className="w-full px-3 py-2 border rounded-lg bg-slate-100 font-mono font-bold text-emerald-900 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <ModernDatePicker
                        label="Tanggal Invoice"
                        value={siForm.date}
                        onChange={async (val) => {
                          const newDueDate = calculateDueDate(val, siForm.termin, companySettings.syaratBayarList);
                          let nextNo = siForm.invoiceNo;
                          if (!siForm.editingId) {
                            nextNo = (await peekNextDocNumber('SI', val)) || nextNo;
                          }
                          setSiForm((prev) => ({ ...prev, date: val, dueDate: newDueDate, invoiceNo: nextNo }));
                        }}
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Syarat Bayar / Termin</label>
                      <select
                        value={siForm.termin}
                        onChange={(e) => {
                          const newTerm = e.target.value;
                          const newDueDate = calculateDueDate(siForm.date, newTerm, companySettings.syaratBayarList);
                          setSiForm((prev) => ({ ...prev, termin: newTerm, dueDate: newDueDate }));
                        }}
                        className="w-full px-3 py-2 border rounded-lg bg-white font-medium text-xs focus:ring-1 focus:ring-emerald-700"
                      >
                        {(companySettings.syaratBayarList || DEFAULT_PAYMENT_TERMS).map((term) => (
                          <option key={term.id || term.nama} value={term.nama}>
                            {term.nama} {term.deskripsi ? `(${term.deskripsi})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <ModernDatePicker
                        label="Jatuh Tempo"
                        value={siForm.dueDate}
                        onChange={(val) => setSiForm({ ...siForm, dueDate: val })}
                      />
                    </div>
                  </div>

                  <ItemSpreadsheetGrid
                    formType="SI"
                    items={siForm.items}
                    setItems={(items) => setSiForm({ ...siForm, items })}
                    products={products}
                    customerId={siForm.customerId}
                    customerName={contacts.find((c) => c.id === siForm.customerId)?.nama || ''}
                    salesOrders={salesOrders}
                    quotations={quotations}
                    salesInvoices={salesInvoices}
                    satuanList={satuanList}
                    onAddSatuan={handleAddSatuan}
                  />

                  {/* Summary & Totals Footer for Sales Invoice */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-3 border-t border-slate-200 text-xs">
                    <div className="w-full sm:w-1/2 space-y-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Catatan Invoice &amp; Rekening Transfer Pembayaran
                        </label>
                        <textarea
                          rows="2"
                          value={siForm.catatan}
                          onChange={(e) => setSiForm({ ...siForm, catatan: e.target.value })}
                          placeholder="Contoh: Pembayaran transfer ke Bank BCA 123-456-7890 a.n. PT Eternal Packaging Indonesia..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>

                      <FileUploadBukti
                        label="Lampiran Faktur / Berita Acara Tagihan"
                        value={siForm.lampiran_url}
                        onChange={(url) => setSiForm({ ...siForm, lampiran_url: url })}
                        docType="si"
                        helpText="Upload dokumen penagihan fisik, faktur pajak, atau berita acara."
                      />
                    </div>

                    <div className="w-full sm:w-72 space-y-2">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal:</span>
                        <span className="font-semibold text-slate-800">
                          Rp {calculateTotals(siForm.items, 0, false).subtotal.toLocaleString('id-ID')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600">
                        <span>Potongan Diskon:</span>
                        <div className="flex items-center space-x-1">
                          <span className="text-slate-400">Rp</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={siForm.discountAmount ? formatDisplayDecimal(siForm.discountAmount) : ''}
                            placeholder="0"
                            onChange={(e) => {
                              const { num } = formatLiveInput(e.target.value);
                              setSiForm({ ...siForm, discountAmount: num });
                            }}
                            className="w-28 px-2 py-0.5 text-right border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700 bg-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-slate-600">
                        <label className="flex items-center space-x-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={siForm.ppnActive}
                            onChange={(e) => setSiForm({ ...siForm, ppnActive: e.target.checked })}
                            className="rounded text-emerald-700 focus:ring-emerald-700"
                          />
                          <span>Kenakan PPN (11%)</span>
                        </label>
                        <span className="font-semibold text-slate-800">
                          Rp{' '}
                          {calculateTotals(
                            siForm.items,
                            siForm.discountAmount,
                            siForm.ppnActive
                          ).ppn.toLocaleString('id-ID')}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-sm font-extrabold pt-2 border-t border-slate-300 text-slate-900">
                        <span>TOTAL INVOICE:</span>
                        <span className="text-emerald-900 text-base">
                          Rp{' '}
                          {calculateTotals(
                            siForm.items,
                            siForm.discountAmount,
                            siForm.ppnActive
                          ).grandTotal.toLocaleString('id-ID')}
                        </span>
                      </div>

                      {Number(siForm.uangMuka || 0) > 0 && (
                        <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-xs">
                          <div className="flex justify-between text-amber-800 font-bold">
                            <span>Potongan Uang Muka (DP):</span>
                            <span>- Rp {Number(siForm.uangMuka).toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex justify-between text-emerald-950 font-extrabold text-sm">
                            <span>Sisa Tagihan Pelunasan:</span>
                            <span>
                              Rp{' '}
                              {Math.max(
                                0,
                                calculateTotals(siForm.items, siForm.discountAmount, siForm.ppnActive).grandTotal -
                                  Number(siForm.uangMuka || 0)
                              ).toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* 5. MODULE: PENERIMAAN PENJUALAN (CR)                     */}
          {/* ======================================================== */}
          {activeTabId === 'payment' && (
            <div className="w-full flex-1 flex flex-col space-y-2">
              <div className="flex items-center justify-between px-3.5 py-2 bg-white rounded-lg border border-slate-300 shadow-2xs">
                <div className="flex items-center space-x-2.5">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-300">
                    <button
                      type="button"
                      onClick={() => setViewModes((p) => ({ ...p, payment: 'list' }))}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 ${
                        viewModes.payment === 'list'
                          ? 'bg-[#0A3828] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                      title="Lihat Riwayat Penerimaan Kas"
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Daftar Pelunasan (CR)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToNewPayment}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 ${
                        viewModes.payment === 'form'
                          ? 'bg-[#0A3828] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                      title="Buka Formulir Catat Penerimaan Baru (Form Kosong)"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Catat Penerimaan Baru</span>
                    </button>
                  </div>

                  <div className="hidden sm:flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-200 text-[10px] font-mono font-bold rounded">
                      CUSTOMER RECEIPT
                    </span>
                  </div>
                </div>

                {viewModes.payment === 'form' ? (
                  <div className="flex items-center space-x-2">
                    {/* PROSES ALUR DROPDOWN */}
                    {payForm.editingId && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setPayFlowDropdownOpen(!payFlowDropdownOpen)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5 transition"
                        >
                          <Workflow className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Proses Alur ▾</span>
                        </button>
                        {payFlowDropdownOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-20 cursor-default"
                              onClick={() => setPayFlowDropdownOpen(false)}
                            />
                            <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-30 text-xs text-left animate-in fade-in duration-100">
                              <button
                                type="button"
                                onClick={() => {
                                  setPayFlowDropdownOpen(false);
                                  const p = salesPayments.find((x) => x.id === payForm.editingId);
                                  if (p) {
                                    setPrintDoc({
                                      type: 'CR',
                                      title: 'BUKTI PENERIMAAN KAS / KUITANSI',
                                      noDoc: p.no_bukti,
                                      date: p.tanggal,
                                      customer: p.customer,
                                      items: [
                                        {
                                          nama: `Pelunasan Faktur ${p.faktur?.no_invoice || ''}`,
                                          qty: 1,
                                          satuan: 'Transaksi',
                                          harga_jual: Number(p.total_bayar || 0),
                                          total: Number(p.total_bayar || 0),
                                        },
                                      ],
                                      total: p.total_bayar,
                                      catatan: `Diterima melalui rekening ${p.akun?.nama_akun || 'Bank'}`,
                                      companySettings,
                                    });
                                  }
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-800 flex items-center space-x-2 font-semibold"
                              >
                                <Printer className="w-4 h-4 text-slate-600" />
                                <span>Cetak Kuitansi / Bukti Kas PDF</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* TOMBOL HAPUS PENERIMAAN (CR) */}
                    {payForm.editingId && (
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteConfirmDoc({
                            type: 'CR',
                            id: payForm.editingId,
                            noDoc: payForm.receiptNo,
                            fakturId: payForm.invoiceId,
                            amount: payForm.amount,
                          })
                        }
                        className="px-3 py-1.5 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                        title="Hapus penerimaan pembayaran ini secara permanen dari Supabase"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Hapus Penerimaan</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleResetToNewPayment}
                      className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Form Baru</span>
                    </button>
                    <button
                      onClick={handleSavePayment}
                      disabled={loading}
                      className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{payForm.editingId ? 'SIMPAN PERUBAHAN (CR)' : 'SIMPAN PELUNASAN (CR)'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                      <input
                        type="text"
                        placeholder="Cari no. bukti, pelanggan, bank..."
                        value={tableSearch.payment || ''}
                        onChange={(e) => setTableSearch((p) => ({ ...p, payment: e.target.value }))}
                        className="pl-8 pr-3 py-1 text-xs border border-slate-300 rounded-md w-48 sm:w-64 focus:outline-none focus:ring-1 focus:ring-emerald-700 bg-white"
                      />
                    </div>
                    <div className="text-xs text-slate-500 font-medium hidden md:block">
                      Total Kas Masuk: <strong className="font-mono text-emerald-900 font-bold">Rp {salesPayments.reduce((acc, p) => acc + Number(p.total_bayar || 0), 0).toLocaleString('id-ID')}</strong>
                    </div>
                  </div>
                )}

              </div>

              {viewModes.payment === 'list' && (loading ? <TableSkeleton rows={5} cols={6} /> : (() => {
                const payConfig = tableConfigs.payment || DEFAULT_TABLE_CONFIGS.payment;
                const payFilter = advancedFilters.payment || { dateRange: 'ALL', customer: 'ALL', bankAkun: 'ALL' };

                const displayedPayments = salesPayments
                  // 1. Search Query
                  .filter((p) => {
                    const q = (tableSearch.payment || '').toLowerCase().trim();
                    if (!q) return true;
                    return (
                      (p.no_bukti || '').toLowerCase().includes(q) ||
                      (p.customer?.nama || '').toLowerCase().includes(q) ||
                      (p.akun?.nama_akun || '').toLowerCase().includes(q) ||
                      (p.faktur?.no_invoice || '').toLowerCase().includes(q)
                    );
                  })
                  // 2. Customer
                  .filter((p) => {
                    if (payFilter.customer === 'ALL') return true;
                    return p.customer_id === payFilter.customer;
                  })
                  // 3. Bank / Akun
                  .filter((p) => {
                    if (payFilter.bankAkun === 'ALL') return true;
                    return p.akun_kas_id === payFilter.bankAkun || p.akun?.id === payFilter.bankAkun;
                  })
                  // 4. Date Range
                  .filter((p) => {
                    if (payFilter.dateRange === 'ALL') return true;
                    const docDate = p.tanggal;
                    const today = new Date().toISOString().split('T')[0];
                    if (payFilter.dateRange === 'TODAY') return docDate === today;
                    if (payFilter.dateRange === '7DAYS') {
                      const d7 = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
                      return docDate >= d7 && docDate <= today;
                    }
                    if (payFilter.dateRange === 'THIS_MONTH') {
                      const ym = today.slice(0, 7);
                      return docDate?.startsWith(ym);
                    }
                    if (payFilter.dateRange === 'CUSTOM') {
                      if (payFilter.customStartDate && docDate < payFilter.customStartDate) return false;
                      if (payFilter.customEndDate && docDate > payFilter.customEndDate) return false;
                    }
                    return true;
                  })
                  // 5. Sorting
                  .sort((a, b) => {
                    if (payConfig.sortBy === 'date_asc') return (a.tanggal || '').localeCompare(b.tanggal || '');
                    if (payConfig.sortBy === 'total_desc') return Number(b.total_bayar || 0) - Number(a.total_bayar || 0);
                    if (payConfig.sortBy === 'total_asc') return Number(a.total_bayar || 0) - Number(b.total_bayar || 0);
                    return (b.tanggal || '').localeCompare(a.tanggal || '');
                  });

                const densityClass =
                  payConfig.density === 'compact'
                    ? 'py-2 px-3 text-xs'
                    : payConfig.density === 'spacious'
                    ? 'py-4 px-4 text-xs'
                    : 'py-2.5 px-3.5 text-xs';

                const cols = payConfig.visibleColumns || DEFAULT_TABLE_CONFIGS.payment.visibleColumns;

                return (
                  <div className="flex-1 flex flex-col min-h-0 space-y-2">
                    {/* Advanced Separated Filter Toolbar */}
                    <TableFilterToolbar
                      searchQuery={tableSearch.payment}
                      onSearchChange={(val) => setTableSearch((p) => ({ ...p, payment: val }))}
                      searchPlaceholder="Cari no. bukti, pelanggan, rekening bank..."
                      filters={payFilter}
                      onFilterChange={(k, v) => handleUpdateAdvancedFilter('payment', k, v)}
                      onResetFilters={() => handleResetAdvancedFilters('payment')}
                      contacts={contacts}
                      bankAccounts={kasAccounts}
                      config={payConfig}
                      onOpenConfig={() => setActiveConfigModal('payment')}
                      totalCount={displayedPayments.length}
                      totalAmount={displayedPayments.reduce((acc, p) => acc + Number(p.total_bayar || 0), 0)}
                      moduleType="payment"
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
                              {cols.pelanggan !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Pelanggan</th>}
                              {cols.bankAkun !== false && <th className="py-3 px-3.5 border-r border-slate-200/60">Bank / Kas Penerima</th>}
                              {cols.nominal !== false && <th className="py-3 px-3.5 text-right border-r border-slate-200/60">Nominal Diterima (Rp)</th>}
                              {cols.aksiLanjutan === true && <th className="py-3 px-3.5 text-center">Aksi Cepat</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {salesPayments.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-20 text-center text-slate-400 bg-white">
                                  <Receipt className="w-10 h-10 mx-auto mb-2 text-emerald-800/40 stroke-[1.5]" />
                                  <p className="font-bold text-sm text-slate-700">Belum ada penerimaan pembayaran (CR)</p>
                                  <p className="text-xs text-slate-400 mt-0.5 mb-3">
                                    Catat pelunasan faktur atau uang muka dari pelanggan Anda.
                                  </p>
                                  <button
                                    onClick={handleResetToNewPayment}
                                    className="apple-btn-primary px-4 py-2 text-xs font-bold flex items-center space-x-1.5 mx-auto"
                                  >
                                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                    <span>Catat Penerimaan Sekarang</span>
                                  </button>
                                </td>
                              </tr>
                            ) : displayedPayments.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-14 text-center text-slate-400 bg-white">
                                  <p className="font-semibold text-slate-600 text-xs">
                                    Tidak ada bukti kas yang sesuai dengan filter yang aktif.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => handleResetAdvancedFilters('payment')}
                                    className="apple-btn-secondary mt-2 px-3 py-1.5 text-xs font-bold"
                                  >
                                    Reset Semua Filter
                                  </button>
                                </td>
                              </tr>
                            ) : (
                              displayedPayments.map((p, idx) => (
                                <tr
                                  key={p.id}
                                  onClick={() => handleOpenPayment(p)}
                                  className="hover:bg-emerald-50/50 transition-colors cursor-pointer group active:scale-[0.999]"
                                  title="Klik baris untuk mencetak kuitansi / bukti penerimaan kas"
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
                                          <span className="group-hover:underline">{p.no_bukti}</span>
                                          {p.lampiran_url && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setLightboxImage({ url: p.lampiran_url, title: `Bukti Pelunasan / Transfer - ${p.no_bukti}` });
                                              }}
                                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 transition-colors shadow-xs"
                                              title="Lihat Bukti Foto Bukti Bayar / Slip Transfer"
                                            >
                                              <Camera className="w-3 h-3 text-emerald-700" />
                                              <span>Foto</span>
                                            </button>
                                          )}
                                        </div>
                                        <Printer className="w-3 h-3 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                                      </div>
                                    </td>
                                  )}
                                  {cols.tanggal !== false && (
                                    <td className={`${densityClass} text-slate-600 border-r border-slate-100/80`}>
                                      {p.tanggal}
                                    </td>
                                  )}
                                  {cols.pelanggan !== false && (
                                    <td className={`${densityClass} font-bold text-slate-900 border-r border-slate-100/80`}>
                                      {p.customer?.nama || '-'}
                                    </td>
                                  )}
                                  {cols.bankAkun !== false && (
                                    <td className={`${densityClass} text-slate-600 border-r border-slate-100/80`}>
                                      {p.akun?.nama_akun || 'Bank BCA'}
                                    </td>
                                  )}
                                  {cols.nominal !== false && (
                                    <td className={`${densityClass} text-right font-bold text-emerald-950 font-mono border-r border-slate-100/80`}>
                                      Rp {Number(p.total_bayar || 0).toLocaleString('id-ID')}
                                    </td>
                                  )}
                                  {cols.aksiLanjutan === true && (
                                    <td className={`${densityClass} text-center space-x-1 whitespace-nowrap`}>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPrintDoc({
                                            type: 'CR',
                                            title: 'BUKTI PENERIMAAN KAS / KUITANSI',
                                            noDoc: p.no_bukti,
                                            date: p.tanggal,
                                            customer: p.customer,
                                            items: [
                                              {
                                                nama: `Pelunasan Faktur ${p.faktur?.no_invoice || ''}`,
                                                qty: 1,
                                                satuan: 'Transaksi',
                                                harga_jual: Number(p.total_bayar || 0),
                                                total: Number(p.total_bayar || 0),
                                              },
                                            ],
                                            total: p.total_bayar,
                                            catatan: `Diterima melalui rekening ${p.akun?.nama_akun || 'Bank'}`,
                                            companySettings,
                                          });
                                        }}
                                        className="apple-btn-secondary px-2 py-1 text-[11px] font-bold text-emerald-900"
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
                          <span>Total: <strong className="text-slate-800">{displayedPayments.length}</strong> transaksi pelunasan</span>
                        </div>
                        <div className="font-mono text-emerald-950 font-bold text-xs">
                          Total Kas Masuk: Rp {displayedPayments.reduce((acc, p) => acc + Number(p.total_bayar || 0), 0).toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })())}

              {viewModes.payment === 'form' && (
                <div className="bg-white rounded-lg border border-slate-300 shadow-2xs p-4 sm:p-5 space-y-4 flex-1 flex flex-col">
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5 text-xs bg-slate-50/80 p-4 rounded-lg border border-slate-200">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Pelanggan</label>
                      <GoogleLiveCustomerSearch
                        contacts={contacts}
                        selectedCustomerId={payForm.customerId}
                        onSelectCustomer={(id) => setPayForm({ ...payForm, customerId: id })}
                        placeholder="Pilih pelanggan..."
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">No. Bukti Kas Masuk (Auto-Sequence)</label>
                      <input
                        type="text"
                        value={payForm.receiptNo}
                        readOnly
                        className="w-full px-3 py-2 border rounded-lg bg-slate-100 font-mono font-bold text-emerald-900 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <ModernDatePicker
                        label="Tanggal Penerimaan"
                        value={payForm.date}
                        onChange={async (val) => {
                          const nextNo = (await peekNextDocNumber('CR', val)) || payForm.receiptNo;
                          setPayForm((prev) => ({ ...prev, date: val, receiptNo: nextNo }));
                        }}
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Faktur yang Dilunasi</label>
                      <select
                        value={payForm.invoiceId}
                        onChange={(e) => {
                          const inv = salesInvoices.find((i) => i.id === e.target.value);
                          setPayForm({
                            ...payForm,
                            invoiceId: e.target.value,
                            amount: inv ? Number(inv.total_akhir) : 0,
                            customerId: inv?.customer_id || payForm.customerId,
                          });
                        }}
                        className="w-full px-3 py-2 border rounded-lg bg-white"
                      >
                        <option value="">Pilih Faktur Piutang...</option>
                        {salesInvoices
                          .filter((i) => i.status === 'PIUTANG')
                          .map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.no_invoice} ({i.customer?.nama}) — Rp {Number(i.total_akhir).toLocaleString('id-ID')}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-slate-700">Nominal Diterima (Rp)</label>
                        {Number(payForm.amount || 0) > 0 && (
                          <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Rp {formatDisplayDecimal(payForm.amount)}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={payForm.amount ? formatDisplayDecimal(payForm.amount) : ''}
                          onChange={(e) => {
                            const { num } = formatLiveInput(e.target.value);
                            setPayForm({ ...payForm, amount: num });
                          }}
                          placeholder="0"
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-700 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Catatan & Upload Bukti Transfer Pelanggan */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Catatan Kuitansi / Referensi Transfer</label>
                      <input
                        type="text"
                        value={payForm.catatan || ''}
                        onChange={(e) => setPayForm({ ...payForm, catatan: e.target.value })}
                        placeholder="Contoh: Pelunasan via Transfer BCA a.n. Fauzan..."
                        className="w-full px-3 py-2 border rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <FileUploadBukti
                        label="Foto Bukti Transfer Pembayaran Pelanggan"
                        value={payForm.lampiran_url}
                        onChange={(url) => setPayForm({ ...payForm, lampiran_url: url })}
                        docType="cr"
                        compact={true}
                        helpText="Upload foto struk transfer / m-banking."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* 6. SETTINGS: PENGATURAN DATA USAHA & DATABASE SUPABASE    */}
          {/* ======================================================== */}
          {activeTabId === 'settings' && (
            <div className="w-full flex-1 flex flex-col min-h-0 overflow-y-auto space-y-3">
              <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-300 shadow-2xs space-y-4">
                <div className="pb-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center space-x-1.5">
                      <Settings className="w-4 h-4 text-emerald-800" />
                      <span>Pengaturan Usaha &amp; Sistem ERP</span>
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Konfigurasi profil perusahaan, rekening bank pembayaran, PPN, master satuan, dan penomoran dokumen
                    </p>
                  </div>
                  <button
                    onClick={() => saveCompanySettings(companySettings)}
                    className="px-4 py-1.5 bg-[#0A3828] hover:bg-[#07291D] text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center space-x-1.5 self-start sm:self-auto"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Pengaturan</span>
                  </button>
                </div>

                {/* ACCURATE ENTERPRISE: SUB-MODUL TAB NAVIGATOR */}
                <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSettingsSubTab('profil')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 ${
                      settingsSubTab === 'profil'
                        ? 'bg-[#0A3828] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>1. Profil &amp; Brand</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsSubTab('rekening')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 ${
                      settingsSubTab === 'rekening'
                        ? 'bg-[#0A3828] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>2. Rekening Bank Pembayaran</span>
                    <span className="ml-1 px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                      {companySettings.bankAccounts?.length || 0}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsSubTab('ppn')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 ${
                      settingsSubTab === 'ppn'
                        ? 'bg-[#0A3828] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>3. Pajak (PPN)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsSubTab('satuan')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 ${
                      settingsSubTab === 'satuan'
                        ? 'bg-[#0A3828] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>4. Master Kategori &amp; Satuan</span>
                    <span className="ml-1 px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                      {categories.length} Kat / {satuanList.length} Sat
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsSubTab('nomor')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 ${
                      settingsSubTab === 'nomor'
                        ? 'bg-[#0A3828] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>5. Penomoran Dokumen</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsSubTab('database')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 ${
                      settingsSubTab === 'database'
                        ? 'bg-[#0A3828] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>6. Database &amp; Reset</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsSubTab('cetak')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 ${
                      settingsSubTab === 'cetak'
                        ? 'bg-[#0A3828] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>7. Desain &amp; Cetak PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsSubTab('termin')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 ${
                      settingsSubTab === 'termin'
                        ? 'bg-[#0A3828] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>8. Syarat Bayar / Termin</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsUserManagementOpen(true)}
                    className="px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100"
                  >
                    <Users className="w-3.5 h-3.5 text-emerald-700" />
                    <span>9. Manajemen Staf &amp; Pengguna</span>
                  </button>
                </div>

                {/* SUB-MODUL 1: PROFIL PERUSAHAAN & BRAND */}
                {settingsSubTab === 'profil' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center">
                        <Store className="w-4 h-4 mr-1.5 text-emerald-800" />
                        Profil Resmi Usaha &amp; Merk Dagang
                      </h3>
                      <span className="text-[10px] text-slate-500 italic">
                        Kop surat otomatis pada seluruh cetakan PDF
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Nama Resmi Perusahaan (PT/CV) *</label>
                        <input
                          type="text"
                          value={companySettings.namaPerusahaan}
                          onChange={(e) =>
                            setCompanySettings({ ...companySettings, namaPerusahaan: e.target.value })
                          }
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-1 focus:ring-emerald-700"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Nama badan usaha legal perusahaan.</p>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Merk Dagang / Brand</label>
                        <input
                          type="text"
                          value={companySettings.merkDagang}
                          onChange={(e) => setCompanySettings({ ...companySettings, merkDagang: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-emerald-900 focus:ring-1 focus:ring-emerald-700"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Nama brand komersial yang dikenal pelanggan.</p>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Nomor Pokok Wajib Pajak (NPWP)</label>
                        <input
                          type="text"
                          value={companySettings.npwp || ''}
                          onChange={(e) => setCompanySettings({ ...companySettings, npwp: e.target.value })}
                          placeholder="01.234.567.8-901.000"
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-emerald-700"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">WhatsApp / Telepon Layanan</label>
                        <input
                          type="text"
                          value={companySettings.telepon}
                          onChange={(e) => setCompanySettings({ ...companySettings, telepon: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-700"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Email Resmi Bisnis</label>
                        <input
                          type="email"
                          value={companySettings.email}
                          onChange={(e) => setCompanySettings({ ...companySettings, email: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-700"
                        />
                      </div>

                      <div className="sm:col-span-2 lg:col-span-3">
                        <label className="block font-bold text-slate-700 mb-1">Alamat Kantor &amp; Pergudangan</label>
                        <textarea
                          rows="2"
                          value={companySettings.alamat}
                          onChange={(e) => setCompanySettings({ ...companySettings, alamat: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-700"
                        />
                      </div>
                    </div>
                  </div>
                )}


                {/* SUB-MODUL 2: PENGATURAN REKENING BANK PEMBAYARAN */}
                {settingsSubTab === 'rekening' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center">
                          <CreditCard className="w-4 h-4 mr-1.5 text-emerald-800" />
                          Kelola Rekening Bank Pembayaran Pelanggan
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Daftar rekening bank resmi yang akan tercantum pada bagian <strong>Informasi Pembayaran Bank</strong> di kuitansi, faktur (SI), pesanan (PO), dan penawaran (SQ).
                        </p>
                      </div>
                    </div>

                    {/* Form Tambah Rekening Bank */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                        <Plus className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Tambah Rekening Bank Baru</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Nama Bank *</label>
                          <select
                            value={newBankInput.bankName}
                            onChange={(e) => setNewBankInput({ ...newBankInput, bankName: e.target.value })}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900"
                          >
                            <option value="BCA">BCA (Bank Central Asia)</option>
                            <option value="Bank Mandiri">Bank Mandiri</option>
                            <option value="BRI">BRI (Bank Rakyat Indonesia)</option>
                            <option value="BNI">BNI (Bank Negara Indonesia)</option>
                            <option value="BSI">BSI (Bank Syariah Indonesia)</option>
                            <option value="CIMB Niaga">CIMB Niaga</option>
                            <option value="Bank Permata">Bank Permata</option>
                            <option value="Bank Danamon">Bank Danamon</option>
                            <option value="Bank Jago">Bank Jago</option>
                            <option value="Blu (BCA Digital)">Blu by BCA Digital</option>
                            <option value="SeaBank">SeaBank</option>
                            <option value="Bank Lainnya">Bank Lainnya</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Nomor Rekening *</label>
                          <input
                            type="text"
                            placeholder="Contoh: 123-456-7890"
                            value={newBankInput.accountNumber}
                            onChange={(e) => setNewBankInput({ ...newBankInput, accountNumber: e.target.value })}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Atas Nama (A/N) *</label>
                          <input
                            type="text"
                            placeholder="Nama pemilik rekening"
                            value={newBankInput.accountHolder}
                            onChange={(e) => setNewBankInput({ ...newBankInput, accountHolder: e.target.value })}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Cabang / Catatan (Opsional)</label>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              placeholder="KCU Jakarta / Rekening Utama"
                              value={newBankInput.branch}
                              onChange={(e) => setNewBankInput({ ...newBankInput, branch: e.target.value })}
                              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700"
                            />
                            <button
                              type="button"
                              onClick={handleAddBankAccount}
                              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-xs transition whitespace-nowrap"
                            >
                              + Simpan
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Daftar Rekening Tersimpan */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                        Daftar Rekening Bank Aktif ({companySettings.bankAccounts?.length || 0}):
                      </span>

                      {(!companySettings.bankAccounts || companySettings.bankAccounts.length === 0) ? (
                        <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-400 text-xs">
                          <CreditCard className="w-8 h-8 mx-auto mb-1 opacity-40" />
                          <p>Belum ada rekening bank yang didaftarkan. Tambahkan rekening di atas.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {companySettings.bankAccounts.map((b, idx) => (
                            <div
                              key={b.id || idx}
                              className="p-3.5 bg-white border border-slate-300 hover:border-emerald-600 rounded-xl shadow-2xs space-y-2 relative transition group"
                            >
                              <div className="flex items-center justify-between">
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded text-[11px] font-black uppercase font-mono">
                                  {b.bankName}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBankAccount(b.id, `${b.bankName} ${b.accountNumber}`)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                  title="Hapus rekening ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div>
                                <p className="font-mono font-black text-sm text-slate-900 tracking-wider">
                                  {b.accountNumber}
                                </p>
                                <p className="text-xs font-bold text-slate-700 mt-0.5">
                                  a.n. {b.accountHolder}
                                </p>
                                {b.branch && (
                                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                    Cabang: {b.branch}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Preview Box for PDF Print */}
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs space-y-1.5">
                      <span className="font-bold text-emerald-950 uppercase tracking-wider block text-[10px]">
                        Pratinjau Footer Cetakan Kuitansi &amp; Faktur:
                      </span>
                      <div className="p-2.5 bg-white rounded-lg border border-emerald-200 font-mono text-[11px] text-slate-800 space-y-0.5">
                        <span className="font-bold text-emerald-900 uppercase block text-[10px] mb-1 font-sans">
                          Informasi Pembayaran Bank:
                        </span>
                        {companySettings.bankAccounts?.map((b, idx) => (
                          <p key={idx}>
                            • <strong>{b.bankName}</strong> {b.accountNumber} a.n. {b.accountHolder} {b.branch ? `(${b.branch})` : ''}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}


                {/* SUB-MODUL 3: PENGATURAN PPN */}
                {settingsSubTab === 'ppn' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center">
                          <Tag className="w-4 h-4 mr-1.5 text-emerald-800" />
                          Pengaturan Pajak Pertambahan Nilai (PPN)
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Sinkronisasi otomatis dengan akun 2102-01 (Hutang PPN Keluaran) di Buku Besar
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Supabase: pengaturan_perusahaan
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Tarif PPN Standar (%)
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={companySettings.ppnPersen ?? 11}
                            onChange={(e) =>
                              setCompanySettings({ ...companySettings, ppnPersen: Number(e.target.value) })
                            }
                            className="w-32 px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                          />
                          <span className="font-bold text-slate-600">% (Persen)</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Tarif PPN standar resmi saat ini 11% (atau 12% sesuai regulasi pemerintah).
                        </p>
                      </div>

                      <div className="flex flex-col justify-center">
                        <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-800">
                          <input
                            type="checkbox"
                            checked={Boolean(companySettings.ppnAktifDefault)}
                            onChange={(e) =>
                              setCompanySettings({ ...companySettings, ppnAktifDefault: e.target.checked })
                            }
                            className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-700"
                          />
                          <span>Otomatis Aktifkan Centang PPN di Setiap Formulir Baru</span>
                        </label>
                        <p className="text-[10px] text-slate-500 mt-1 ml-6">
                          Jika dicentang, setiap membuka formulir PO, SQ, atau Faktur baru, opsi kenakan PPN akan langsung aktif secara otomatis.
                        </p>
                      </div>
                    </div>
                  </div>
                )}


                {/* SUB-MODUL 4: MASTER KATEGORI & SATUAN KEMASAN */}
                {settingsSubTab === 'satuan' && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center">
                          <Layers className="w-4 h-4 mr-1.5 text-emerald-800" />
                          Master Kategori &amp; Satuan Kemasan (Supabase Real-Time)
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Kelola kelompok kategori produk dan unit satuan kemasan yang digunakan di master produk, POS, dan formulir transaksi (PO, SQ, DO, SI).
                        </p>
                      </div>
                    </div>

                    {/* BAGIAN 1: MASTER KATEGORI KEMASAN */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                      <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                            <Tag className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                              1. Master Kategori Kemasan
                            </h4>
                            <p className="text-[11px] text-slate-500">
                              Tabel Supabase: <code className="font-bold text-emerald-900 font-mono">kategori</code> ({categories.length} Kategori Terdaftar)
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 space-y-4">
                        {/* Form Tambah Kategori */}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleAddKategori(newKategoriInput, newKategoriDescInput);
                          }}
                          className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200/80 space-y-2.5"
                        >
                          <span className="text-[11px] font-bold text-emerald-950 block">
                            + Tambah Kategori Kemasan Baru
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                            <input
                              type="text"
                              required
                              placeholder="Nama Kategori (contoh: Paper Cup & Bag, Box Dus, Plastik Kresek)..."
                              value={newKategoriInput}
                              onChange={(e) => setNewKategoriInput(e.target.value)}
                              className="sm:col-span-6 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 font-medium"
                            />
                            <input
                              type="text"
                              placeholder="Keterangan singkat (opsional)..."
                              value={newKategoriDescInput}
                              onChange={(e) => setNewKategoriDescInput(e.target.value)}
                              className="sm:col-span-4 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 text-slate-600"
                            />
                            <button
                              type="submit"
                              className="sm:col-span-2 px-3 py-1.5 bg-[#0A3828] hover:bg-[#07291D] text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center space-x-1 transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Simpan</span>
                            </button>
                          </div>
                        </form>

                        {/* Daftar Kategori Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {categories.map((cat) => {
                            const count = (products || []).filter(
                              (p) => p.kategori_id === cat.id || p.kategori?.nama === cat.nama
                            ).length;
                            return (
                              <div
                                key={cat.id}
                                className="p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:shadow-xs transition flex flex-col justify-between space-y-2 group"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="space-y-0.5">
                                    <h5 className="font-bold text-xs text-slate-900 group-hover:text-emerald-900 transition">
                                      {cat.nama}
                                    </h5>
                                    {cat.keterangan && (
                                      <p className="text-[10px] text-slate-500 line-clamp-1">
                                        {cat.keterangan}
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteKategori(cat.id, cat.nama)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                    title={`Hapus kategori ${cat.nama}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                                  <span>{count} SKU barang aktif</span>
                                  <span className="font-mono text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                                    Aktif
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          {categories.length === 0 && (
                            <div className="col-span-full p-4 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                              Belum ada kategori. Silakan tambahkan kategori kemasan pertama di atas.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* BAGIAN 2: MASTER SATUAN KEMASAN */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                      <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                            <Package className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                              2. Master Satuan Kemasan
                            </h4>
                            <p className="text-[11px] text-slate-500">
                              Tabel Supabase: <code className="font-bold text-emerald-900 font-mono">satuan</code> ({satuanList.length} Satuan Terdaftar)
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        {/* Add Satuan Input */}
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            placeholder="Ketik nama satuan baru (contoh: Pouch, Roll, Rim, Bal, Dus)..."
                            value={newSatuanInput}
                            onChange={(e) => setNewSatuanInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSatuan(newSatuanInput);
                              }
                            }}
                            className="flex-1 max-w-md px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddSatuan(newSatuanInput)}
                            className="px-3.5 py-1.5 bg-[#0A3828] hover:bg-[#07291D] text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1 transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Tambah Satuan</span>
                          </button>
                        </div>

                        {/* Satuan List Chips */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                          {satuanList.map((sat) => (
                            <div
                              key={sat.id}
                              className="flex items-center space-x-1.5 px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs hover:border-emerald-600 transition"
                            >
                              <Package className="w-3 h-3 text-emerald-700" />
                              <span>{sat.nama}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteSatuan(sat.id, sat.nama)}
                                className="p-0.5 text-slate-400 hover:text-rose-600 rounded transition ml-1"
                                title={`Hapus satuan ${sat.nama}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          {satuanList.length === 0 && (
                            <span className="text-xs text-slate-400 italic">Memuat daftar satuan dari Supabase...</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}


                {/* SUB-MODUL 5: FORMAT PENOMORAN DOKUMEN */}
                {settingsSubTab === 'nomor' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center">
                          <FileText className="w-4 h-4 mr-1.5 text-emerald-800" />
                          Format Nomor Urut Dokumen (Auto-Sequence Supabase)
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Format penomoran standar dokumen: [PREFIX].[YYYY].[MM].[DD].[COUNTER]
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-500 text-[11px] block">Proforma Invoice (PI):</span>
                        <p className="font-mono font-black text-emerald-900 mt-1">SQ.YYYY.MM.DD.0001</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-500 text-[11px] block">Pesanan (PO):</span>
                        <p className="font-mono font-black text-emerald-900 mt-1">PO.YYYY.MM.DD.0001</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-500 text-[11px] block">Uang Muka (DP):</span>
                        <p className="font-mono font-black text-emerald-900 mt-1">DP.YYYY.MM.DD.0001</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-500 text-[11px] block">Pengiriman (DO):</span>
                        <p className="font-mono font-black text-emerald-900 mt-1">DO.YYYY.MM.DD.0001</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-500 text-[11px] block">Invoice:</span>
                        <p className="font-mono font-black text-emerald-900 mt-1">SI.YYYY.MM.DD.0001</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-500 text-[11px] block">Penerimaan (CR):</span>
                        <p className="font-mono font-black text-emerald-900 mt-1">CR.YYYY.MM.DD.0001</p>
                      </div>
                    </div>
                  </div>
                )}


                {/* SUB-MODUL 6: DATABASE & RESET TRANSAKSI */}
                {settingsSubTab === 'database' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center">
                          <Database className="w-4 h-4 mr-1.5 text-emerald-800" />
                          Integrasi Database Supabase &amp; Reset Toko Baru
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Koneksi real-time cloud PostgreSQL Supabase
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-emerald-900 font-bold">Endpoint Supabase:</span>
                        <span className="font-mono text-emerald-800 font-semibold">https://wkkyxccfelbdslbbezrj.supabase.co</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-emerald-900 font-bold">Status Server Cloud:</span>
                        <span className="text-emerald-700 font-bold flex items-center">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 mr-2 animate-pulse"></span>
                          Terkoneksi &amp; Aktif (Region Oceania Sydney)
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      <button
                        onClick={() => setIsResetModalOpen(true)}
                        className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center space-x-2 transition shadow-xs"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Bersihkan Seluruh Transaksi Demo (Siap Rilis Buka Toko Nyata)</span>
                      </button>
                      <p className="text-[10px] text-slate-500 mt-1.5">
                        Menghapus bersih seluruh transaksi uji coba (PO, SQ, DO, SI, DP, Jurnal) dan mengembalikan counter nomor kembali ke 0001.
                      </p>
                    </div>
                  </div>
                )}

                {/* SUB-MODUL 7: DESAIN & TAMPILAN CETAK PDF PER SUB-PENJUALAN */}
                {settingsSubTab === 'cetak' && (() => {
                  const currentPerDoc = companySettings.printSettingsPerDoc || DEFAULT_PRINT_SETTINGS_PER_DOC;
                  const activeConfig = currentPerDoc[activePrintDocTab] || DEFAULT_PRINT_SETTINGS_PER_DOC[activePrintDocTab] || DEFAULT_PRINT_SETTINGS_PER_DOC.PO;

                  const updateCurrentDocSettings = (updates) => {
                    const updatedPerDoc = {
                      ...currentPerDoc,
                      [activePrintDocTab]: {
                        ...activeConfig,
                        ...updates,
                      },
                    };
                    const updatedSettings = {
                      ...companySettings,
                      printSettingsPerDoc: updatedPerDoc,
                    };
                    setCompanySettings(updatedSettings);
                  };

                  return (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center">
                            <Printer className="w-4 h-4 mr-1.5 text-emerald-800" />
                            Pengaturan Tata Letak Cetak PDF Per Sub-Penjualan
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Atur tampilan, judul catatan, catatan bawaan, dan tanda tangan secara spesifik untuk masing-masing dokumen
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => saveCompanySettings(companySettings)}
                          className="px-3.5 py-1.5 bg-[#0A3828] hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-xs self-start sm:self-auto"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Simpan Pengaturan Cetak</span>
                        </button>
                      </div>

                      {/* TANDA TANGAN DIGITAL TERPUSAT (USER REQUEST: BEBAS BOLPOINT) */}
                      <DigitalSignaturePad
                        currentSignature={companySettings.tandaTanganDigital}
                        onSave={(sigDataUrl) => {
                          const updated = {
                            ...companySettings,
                            tandaTanganDigital: sigDataUrl,
                          };
                          saveCompanySettings(updated);
                        }}
                        onRemove={() => {
                          const updated = {
                            ...companySettings,
                            tandaTanganDigital: null,
                          };
                          saveCompanySettings(updated);
                        }}
                        signatoryName={companySettings.namaPenandatanganDefault || 'Fauzan Ghani'}
                        onChangeSignatoryName={(name) => {
                          const updated = {
                            ...companySettings,
                            namaPenandatanganDefault: name,
                          };
                          saveCompanySettings(updated);
                        }}
                        signatoryTitle={companySettings.jabatanPenandatanganDefault || 'Direktur Utama'}
                        onChangeSignatoryTitle={(title) => {
                          const updated = {
                            ...companySettings,
                            jabatanPenandatanganDefault: title,
                          };
                          saveCompanySettings(updated);
                        }}
                      />

                      <div className="pt-2 border-t border-slate-200">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                          Tata Letak &amp; Rincian Dokumen Spesifik Per Sub-Penjualan
                        </h4>
                        <p className="text-[11px] text-slate-500 mb-2">
                          Pilih jenis dokumen untuk mengatur tampilan kop, catatan, rekening, dan kolom penandatangan
                        </p>
                      </div>

                      {/* Sub-Penjualan Selector Tabs */}
                      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
                        {[
                          { id: 'SQ', label: '1. Proforma Invoice (PI)', badge: 'PI' },
                          { id: 'PO', label: '2. Pesanan Penjualan (PO)', badge: 'PO' },
                          { id: 'DO', label: '3. Surat Jalan (DO)', badge: 'DO' },
                          { id: 'SI', label: '4. Faktur / Invoice (SI)', badge: 'SI' },
                          { id: 'DP', label: '5. Uang Muka & Kas (DP/CR)', badge: 'DP' },
                        ].map((sub) => {
                          const isSelected = activePrintDocTab === sub.id;
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => setActivePrintDocTab(sub.id)}
                              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 ${
                                isSelected
                                  ? 'bg-[#0A3828] text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                              }`}
                            >
                              <span>{sub.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Settings Card for Selected Sub-Penjualan */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 text-xs">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <span className="font-bold text-slate-800">
                            Konfigurasi untuk: <strong className="text-emerald-950 font-extrabold">{activeConfig.label}</strong>
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono text-[10px] font-bold rounded">
                            {activeConfig.badge}
                          </span>
                        </div>

                        {/* Toggles */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                          <label className="flex items-center space-x-2 bg-white p-2.5 rounded-lg border border-slate-300 cursor-pointer hover:bg-emerald-50/50">
                            <input
                              type="checkbox"
                              checked={activeConfig.showLogo}
                              onChange={(e) => updateCurrentDocSettings({ showLogo: e.target.checked })}
                              className="rounded text-emerald-700 focus:ring-emerald-700"
                            />
                            <span className="font-bold text-slate-800">Logo Kop</span>
                          </label>

                          <label className="flex items-center space-x-2 bg-white p-2.5 rounded-lg border border-slate-300 cursor-pointer hover:bg-emerald-50/50">
                            <input
                              type="checkbox"
                              checked={activeConfig.showKopAlamat}
                              onChange={(e) => updateCurrentDocSettings({ showKopAlamat: e.target.checked })}
                              className="rounded text-emerald-700 focus:ring-emerald-700"
                            />
                            <span className="font-bold text-slate-800">Alamat Kop</span>
                          </label>

                          <label className="flex items-center space-x-2 bg-white p-2.5 rounded-lg border border-slate-300 cursor-pointer hover:bg-emerald-50/50">
                            <input
                              type="checkbox"
                              checked={activeConfig.showRekening}
                              onChange={(e) => updateCurrentDocSettings({ showRekening: e.target.checked })}
                              className="rounded text-emerald-700 focus:ring-emerald-700"
                            />
                            <span className="font-bold text-slate-800">Rekening Bank</span>
                          </label>

                          <label className="flex items-center space-x-2 bg-white p-2.5 rounded-lg border border-slate-300 cursor-pointer hover:bg-emerald-50/50">
                            <input
                              type="checkbox"
                              checked={activeConfig.showCatatan}
                              onChange={(e) => updateCurrentDocSettings({ showCatatan: e.target.checked })}
                              className="rounded text-emerald-700 focus:ring-emerald-700"
                            />
                            <span className="font-bold text-slate-800">Kotak Catatan</span>
                          </label>

                          <label className="flex items-center space-x-2 bg-white p-2.5 rounded-lg border border-slate-300 cursor-pointer hover:bg-emerald-50/50">
                            <input
                              type="checkbox"
                              checked={activeConfig.showTerbilang}
                              onChange={(e) => updateCurrentDocSettings({ showTerbilang: e.target.checked })}
                              className="rounded text-emerald-700 focus:ring-emerald-700"
                            />
                            <span className="font-bold text-slate-800">Ejaan Terbilang</span>
                          </label>

                          <label className="flex items-center space-x-2 bg-white p-2.5 rounded-lg border border-slate-300 cursor-pointer hover:bg-emerald-50/50">
                            <input
                              type="checkbox"
                              checked={activeConfig.showTandaTangan}
                              onChange={(e) => updateCurrentDocSettings({ showTandaTangan: e.target.checked })}
                              className="rounded text-emerald-700 focus:ring-emerald-700"
                            />
                            <span className="font-bold text-slate-800">Tanda Tangan</span>
                          </label>
                        </div>

                        {/* Custom Notes Section */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">
                              Judul Kotak Catatan ({activeConfig.label}):
                            </label>
                            <input
                              type="text"
                              value={activeConfig.judulCatatan || ''}
                              onChange={(e) => updateCurrentDocSettings({ judulCatatan: e.target.value })}
                              placeholder="Contoh: Syarat & Ketentuan Penawaran / Keterangan Pengiriman"
                              className="w-full px-3 py-2 border rounded-lg bg-white"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1">
                              Catatan Standar Bawaan (Jika Form Kosong):
                            </label>
                            <input
                              type="text"
                              value={activeConfig.defaultCatatan || ''}
                              onChange={(e) => updateCurrentDocSettings({ defaultCatatan: e.target.value })}
                              placeholder="Teks keterangan default..."
                              className="w-full px-3 py-2 border rounded-lg bg-white"
                            />
                          </div>
                        </div>

                        {/* Signatures - USER REQUEST: Jabatan dihilangkan untuk non-DO, hanya aktif di Pengiriman (DO) */}
                        <div className="pt-2 border-t border-slate-200">
                          {activePrintDocTab === 'DO' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Penandatangan 1 (Nama):</label>
                                  <input
                                    type="text"
                                    value={activeConfig.namaPenandatangan1 || ''}
                                    onChange={(e) => updateCurrentDocSettings({ namaPenandatangan1: e.target.value })}
                                    placeholder="Pengemudi / Sopir"
                                    className="w-full px-3 py-1.5 border rounded-lg bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Jabatan 1:</label>
                                  <input
                                    type="text"
                                    value={activeConfig.jabatanPenandatangan1 || ''}
                                    onChange={(e) => updateCurrentDocSettings({ jabatanPenandatangan1: e.target.value })}
                                    placeholder="Pengirim / Ekspedisi"
                                    className="w-full px-3 py-1.5 border rounded-lg bg-white"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Penandatangan 2 (Nama):</label>
                                  <input
                                    type="text"
                                    value={activeConfig.namaPenandatangan2 || ''}
                                    onChange={(e) => updateCurrentDocSettings({ namaPenandatangan2: e.target.value })}
                                    placeholder="Penerima Barang"
                                    className="w-full px-3 py-1.5 border rounded-lg bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Jabatan 2:</label>
                                  <input
                                    type="text"
                                    value={activeConfig.jabatanPenandatangan2 || ''}
                                    onChange={(e) => updateCurrentDocSettings({ jabatanPenandatangan2: e.target.value })}
                                    placeholder="Penerima / Pelanggan"
                                    className="w-full px-3 py-1.5 border rounded-lg bg-white"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Nama Penandatangan (Hormat Kami):
                                </label>
                                <input
                                  type="text"
                                  value={activeConfig.namaPenandatangan1 || ''}
                                  onChange={(e) => updateCurrentDocSettings({ namaPenandatangan1: e.target.value })}
                                  placeholder="Contoh: FAG Kemasan / Admin Penjualan"
                                  className="w-full px-3 py-1.5 border rounded-lg bg-white"
                                />
                                <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
                                  ✓ Kolom Jabatan dinonaktifkan (format invoice resmi bersih).
                                </span>
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Nama Pihak Kedua / Pelanggan (Opsional):
                                </label>
                                <input
                                  type="text"
                                  value={activeConfig.namaPenandatangan2 || ''}
                                  onChange={(e) => updateCurrentDocSettings({ namaPenandatangan2: e.target.value })}
                                  placeholder="Contoh: Pelanggan (kosongkan jika 1 tanda tangan)"
                                  className="w-full px-3 py-1.5 border rounded-lg bg-white"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Footer message */}
                        <div className="pt-2 border-t border-slate-200">
                          <label className="block font-bold text-slate-700 mb-1">Pesan Footer Dokumen Cetak:</label>
                          <input
                            type="text"
                            value={activeConfig.pesanFooter || ''}
                            onChange={(e) => updateCurrentDocSettings({ pesanFooter: e.target.value })}
                            placeholder="Contoh: Terima kasih atas kepercayaan Anda bermitra dengan FAG Kemasan."
                            className="w-full px-3 py-2 border rounded-lg bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* SUB-MODUL 8: SYARAT BAYAR / TERMIN (PENJUALAN & PEMBELIAN) */}
                {settingsSubTab === 'termin' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center">
                          <Clock className="w-4 h-4 mr-1.5 text-emerald-800" />
                          Pengaturan Syarat Bayar / Termin (Penjualan &amp; Pembelian)
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Konfigurasi daftar syarat bayar (termin). Opsi ini berlaku seragam dan sinkron pada modul Penjualan (SO, Faktur) dan Pembelian (PO, Faktur Beli).
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-full border border-emerald-300 w-fit">
                        Standar Bisnis FAG
                      </span>
                    </div>

                    {/* Form Tambah Termin Baru */}
                    <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200">
                      <h4 className="text-xs font-bold text-emerald-950 mb-3 flex items-center space-x-1.5">
                        <Plus className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Tambah Syarat Bayar / Termin Baru</span>
                      </h4>
                      <form onSubmit={handleAddSyaratBayar} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end text-xs">
                        <div className="sm:col-span-3">
                          <label className="block font-bold text-slate-700 mb-1">
                            Nama Termin <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Net 45"
                            value={newTermInput.nama}
                            onChange={(e) => setNewTermInput({ ...newTermInput, nama: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold text-slate-900 focus:ring-1 focus:ring-emerald-700"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="block font-bold text-slate-700 mb-1">
                            Hari Jatuh Tempo <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="365"
                              required
                              placeholder="0 untuk COD / Tunai"
                              value={newTermInput.hariJatuhTempo}
                              onChange={(e) => setNewTermInput({ ...newTermInput, hariJatuhTempo: e.target.value })}
                              className="w-full px-3 py-2 pr-12 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:ring-1 focus:ring-emerald-700"
                            />
                            <span className="absolute right-3 top-2 text-slate-400 font-medium text-[11px]">Hari</span>
                          </div>
                        </div>
                        <div className="sm:col-span-4">
                          <label className="block font-bold text-slate-700 mb-1">
                            Keterangan / Deskripsi
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: Jatuh tempo 45 hari kalender"
                            value={newTermInput.deskripsi}
                            onChange={(e) => setNewTermInput({ ...newTermInput, deskripsi: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-emerald-700"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <button
                            type="submit"
                            className="w-full py-2 px-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg font-bold text-xs shadow-xs transition active:scale-[0.98] flex items-center justify-center space-x-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah</span>
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Tabel Daftar Syarat Bayar Aktif */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800">
                          Daftar Syarat Bayar Aktif ({companySettings.syaratBayarList?.length || 0})
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Termin yang aktif akan otomatis muncul pada dropdown Penjualan &amp; Pembelian
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                              <th className="py-2.5 px-3 w-12 text-center">No</th>
                              <th className="py-2.5 px-3">Nama Termin</th>
                              <th className="py-2.5 px-3">Hari Tempo</th>
                              <th className="py-2.5 px-3">Keterangan</th>
                              <th className="py-2.5 px-3 text-center">Status Default</th>
                              <th className="py-2.5 px-3 text-center w-28">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {(companySettings.syaratBayarList || DEFAULT_PAYMENT_TERMS).map((term, idx) => (
                              <tr key={term.id || term.nama} className="hover:bg-slate-50/70 transition">
                                <td className="py-2.5 px-3 text-center text-slate-400 font-mono font-medium">
                                  {idx + 1}
                                </td>
                                <td className="py-2.5 px-3 font-bold text-slate-900 font-mono">
                                  {term.nama}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 font-mono">
                                    {term.hariJatuhTempo === 0 ? 'Tunai (0 Hari)' : `${term.hariJatuhTempo} Hari`}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-600">
                                  {term.deskripsi || '-'}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {term.isDefault ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                      <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-700" />
                                      Default Sistem
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleSetDefaultSyaratBayar(term.id, term.nama)}
                                      className="text-[10px] text-slate-500 hover:text-emerald-800 font-semibold hover:underline"
                                    >
                                      Jadikan Default
                                    </button>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSyaratBayar(term.id, term.nama)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                    title={`Hapus syarat bayar ${term.nama}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 7. DAFTAR PELANGGAN (CLICK-TO-EDIT & LIVE SYNC)         */}
          {/* ======================================================== */}
          {activeTabId === 'customers' && (
            <div className="w-full flex-1 flex flex-col min-h-0 space-y-1.5">
              <CustomerInlineTable
                contacts={contacts}
                setContacts={setContacts}
                onAddNew={() => setIsNewCustomerModalOpen(true)}
                onCreatePOForCustomer={createPOForCustomer}
                onCreateQuoteForCustomer={createQuoteForCustomer}
                onToast={showToast}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* 8. SUB-MODUL PERSEDIAAN & MASTER KEMASAN (ACCURATE)      */}
          {/* ======================================================== */}
          {(activeTabId === 'items' ||
            activeTabId === 'inventory' ||
            activeTabId === 'stock_card' ||
            activeTabId === 'inventory_adjustment' ||
            activeTabId === 'stock_opname' ||
            activeTabId === 'stock_mutation') && (
            <InventoryModule
              activeTab={
                activeTabId === 'stock_opname' || activeTabId === 'inventory_adjustment'
                  ? 'adjustment'
                  : activeTabId === 'stock_mutation' || activeTabId === 'stock_card'
                  ? 'mutation'
                  : 'items'
              }
              onTabChange={(tabKey) => {
                const targetId =
                  tabKey === 'adjustment'
                    ? 'stock_opname'
                    : tabKey === 'mutation'
                    ? 'stock_mutation'
                    : 'items';
                setActiveTabId(targetId);
                if (typeof window !== 'undefined') {
                  window.history.replaceState(null, '', `#${targetId}`);
                }
              }}
              products={products}
              accounts={accounts}
              categories={categories}
              satuanList={satuanList}
              companySettings={companySettings}
              onRefresh={loadData}
              onCategoryCreated={(newCat) => {
                setCategories((prev) => [...prev, newCat].sort((a, b) => a.nama.localeCompare(b.nama)));
              }}
              onSatuanCreated={(newSat) => {
                setSatuanList((prev) => [...prev, newSat]);
              }}
              onOpenNewProductModal={() => setIsNewProductModalOpen(true)}
              showToast={showToast}
            />
          )}

          {/* ======================================================== */}
          {/* SUB-MODUL PEMBELIAN (PURCHASING ACCURATE ONLINE)         */}
          {/* ======================================================== */}
          {(activeTabId === 'po_beli' ||
            activeTabId === 'ri_beli' ||
            activeTabId === 'pi_beli' ||
            activeTabId === 'pp_beli' ||
            activeTabId === 'suppliers' ||
            activeTabId === 'purchase_invoice' ||
            activeTabId === 'purchase_payment') && (
            <PurchaseModule
              activeTab={
                activeTabId === 'purchase_invoice'
                  ? 'pi_beli'
                  : activeTabId === 'purchase_payment'
                  ? 'pp_beli'
                  : activeTabId
              }
              onTabChange={(tabId) => {
                setActiveTabId(tabId);
                if (typeof window !== 'undefined') {
                  window.history.replaceState(null, '', `#${tabId}`);
                }
              }}
              products={products}
              accounts={accounts}
              companySettings={companySettings}
              onRefresh={loadData}
              onToast={showToast}
            />
          )}

          {/* ======================================================== */}
          {/* 9. DASHBOARD SUMMARY (LUXURY EXECUTIVE ERP)              */}
          {/* ======================================================== */}
          {activeTabId === 'dashboard' && (
            <div className="w-full flex-1 flex flex-col min-h-0 space-y-2.5 overflow-y-auto pb-6">
              {/* Executive Welcome & Action Header Bar */}
              <div className="bg-white px-4 py-3 rounded-xl border border-slate-300 shadow-2xs flex items-center justify-between flex-wrap gap-2.5">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-[#07291D] text-emerald-300 flex items-center justify-center shadow-xs border border-emerald-700/40">
                    <Boxes className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                        {companySettings?.namaPerusahaan || 'PT ETERNAL PACKAGING INDONESIA'}
                      </h2>
                      <span className="bg-[#07291D] text-emerald-200 border border-emerald-600/50 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                        Executive Dashboard
                      </span>
                      <span className="bg-emerald-50 text-emerald-900 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded font-mono hidden sm:inline-block">
                        Live Supabase
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Pusat Kendali Bisnis Kemasan, Arus Kas &amp; Rantai Pasok Penjualan-Pembelian
                    </p>
                  </div>
                </div>

                {/* Quick Action Shortcut Pills (Pekat Mewah) */}
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <button
                    onClick={() => {
                      openTab('so', 'Pesanan Penjualan (PO)', 'so', 'form');
                      handleResetToNewSO();
                    }}
                    className="px-2.5 py-1.5 bg-[#0A3828] hover:bg-[#07291D] text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-xs active:scale-95"
                    title="Buat Pesanan Penjualan Baru"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>+ Order (PO)</span>
                  </button>

                  <button
                    onClick={() => {
                      openTab('do', 'Pengiriman (DO)', 'do', 'form');
                      handleResetToNewDO();
                    }}
                    className="px-2.5 py-1.5 bg-[#78350f] hover:bg-[#5f290c] text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-xs active:scale-95"
                    title="Buat Surat Jalan Pengiriman Baru"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>+ Kirim (DO)</span>
                  </button>

                  <button
                    onClick={() => {
                      openTab('pi_beli', 'Faktur Pembelian (FB)', 'pi_beli', 'form');
                    }}
                    className="px-2.5 py-1.5 bg-[#1e3a5f] hover:bg-[#152943] text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-xs active:scale-95"
                    title="Input Faktur Beli dari Supplier"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>+ Faktur Beli (FB)</span>
                  </button>

                  <button
                    onClick={() => {
                      setManualTxModalMode('KAS_MASUK');
                      setManualTxInitialAccountId(null);
                      setIsManualTxModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 bg-[#064e3b] hover:bg-[#043427] text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-xs active:scale-95"
                    title="Catat Transaksi Kas Masuk / Kas Keluar"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>+ Kas Masuk/Keluar</span>
                  </button>

                  <button
                    onClick={() => openTab('income_statement', 'Laporan Laba Rugi', 'income_statement', 'list')}
                    className="px-2.5 py-1.5 bg-[#1e293b] hover:bg-[#0f172a] text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-xs active:scale-95"
                    title="Buka Laporan Laba Rugi"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Laba Rugi</span>
                  </button>
                </div>
              </div>

              {/* Row 1: The 6 Pillar KPI Cards (Pekat, Mewah, Berkelas) */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
                {/* 1. Omzet Penjualan */}
                <div
                  onClick={() => openTab('si', 'Invoice', 'si', 'list')}
                  className="bg-white p-3 rounded-xl border border-slate-300 hover:border-[#0A3828] cursor-pointer shadow-2xs hover:shadow-xs transition group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      Omzet Penjualan
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-[#0A3828] text-emerald-200 flex items-center justify-center">
                      <DollarSign className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  </div>
                  <div className="mt-1.5">
                    <span className="text-lg sm:text-xl font-black text-slate-900 font-mono tracking-tight group-hover:text-emerald-900 block truncate">
                      Rp {totalOmzetPenjualan.toLocaleString('id-ID')}
                    </span>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                      <span>Faktur Bersih</span>
                      <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        {salesInvoices.length} SI
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Kas & Bank Likuid */}
                <div
                  onClick={() => openTab('coa', 'Akun Perkiraan (COA)', 'coa', 'list')}
                  className="bg-white p-3 rounded-xl border border-slate-300 hover:border-[#064e3b] cursor-pointer shadow-2xs hover:shadow-xs transition group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      Kas &amp; Bank Likuid
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-[#064e3b] text-emerald-200 flex items-center justify-center">
                      <Wallet className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  </div>
                  <div className="mt-1.5">
                    <span className="text-lg sm:text-xl font-black text-slate-900 font-mono tracking-tight group-hover:text-emerald-900 block truncate">
                      Rp {totalKasBank.toLocaleString('id-ID')}
                    </span>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                      <span>Dana Tersedia</span>
                      <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        Live Saldo
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Aset Persediaan Kemasan */}
                <div
                  onClick={() => openTab('items', 'Barang & Jasa (Master Kemasan)', 'items', 'list')}
                  className="bg-white p-3 rounded-xl border border-slate-300 hover:border-[#0f766e] cursor-pointer shadow-2xs hover:shadow-xs transition group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      Aset Persediaan
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-[#0f766e] text-teal-200 flex items-center justify-center">
                      <Package className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  </div>
                  <div className="mt-1.5">
                    <span className="text-lg sm:text-xl font-black text-slate-900 font-mono tracking-tight group-hover:text-teal-900 block truncate">
                      Rp {totalAsetPersediaan.toLocaleString('id-ID')}
                    </span>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                      <span>Valuasi Gudang</span>
                      <span className="font-bold text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                        {products.length} SKU
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Laba Bersih Berjalan */}
                <div
                  onClick={() => openTab('income_statement', 'Laporan Laba Rugi', 'income_statement', 'list')}
                  className="bg-white p-3 rounded-xl border border-slate-300 hover:border-[#14532d] cursor-pointer shadow-2xs hover:shadow-xs transition group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      Laba Bersih
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-[#14532d] text-emerald-200 flex items-center justify-center">
                      <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  </div>
                  <div className="mt-1.5">
                    <span className="text-lg sm:text-xl font-black text-slate-900 font-mono tracking-tight group-hover:text-emerald-900 block truncate">
                      Rp {totalLabaBersih.toLocaleString('id-ID')}
                    </span>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                      <span>Margin: {netProfitMargin}%</span>
                      <span className="font-bold text-emerald-900 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300">
                        Profit Live
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. Piutang Usaha Pelanggan */}
                <div
                  onClick={() => openTab('si', 'Invoice', 'si', 'list')}
                  className="bg-white p-3 rounded-xl border border-slate-300 hover:border-[#1e3a5f] cursor-pointer shadow-2xs hover:shadow-xs transition group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      Piutang Pelanggan
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-[#1e3a5f] text-blue-200 flex items-center justify-center">
                      <CreditCard className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  </div>
                  <div className="mt-1.5">
                    <span className="text-lg sm:text-xl font-black text-slate-900 font-mono tracking-tight group-hover:text-blue-900 block truncate">
                      Rp {totalPiutang.toLocaleString('id-ID')}
                    </span>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                      <span>Tagihan Belum Bayar</span>
                      <span className="font-bold text-blue-900 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                        {salesInvoices.filter((i) => i.status === 'PIUTANG').length} Invoice
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6. Hutang Usaha Supplier */}
                <div
                  onClick={() => openTab('pi_beli', 'Faktur Pembelian (FB)', 'pi_beli', 'list')}
                  className="bg-white p-3 rounded-xl border border-slate-300 hover:border-[#881337] cursor-pointer shadow-2xs hover:shadow-xs transition group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      Hutang Supplier
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-[#881337] text-rose-200 flex items-center justify-center">
                      <Receipt className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  </div>
                  <div className="mt-1.5">
                    <span className="text-lg sm:text-xl font-black text-slate-900 font-mono tracking-tight group-hover:text-rose-900 block truncate">
                      Rp {totalHutang.toLocaleString('id-ID')}
                    </span>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                      <span>Kewajiban Pabrik</span>
                      <span className="font-bold text-rose-900 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                        {purchases.filter((p) => p.status_bayar === 'HUTANG').length} Faktur
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Pipeline Transaksi Terintegrasi Accurate Online */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-300 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <Workflow className="w-4 h-4 text-[#0A3828]" />
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      Pipeline Transaksi Usaha Kemasan
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 font-bold">
                    Realtime Sequence Tracking
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {/* Pipeline A: Penjualan */}
                  <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-700">
                      <span className="flex items-center space-x-1.5 text-emerald-950 font-black">
                        <ShoppingCart className="w-3.5 h-3.5 text-[#0A3828]" />
                        <span>Siklus Penjualan (Pelanggan)</span>
                      </span>
                      <span className="text-slate-500 text-[10px]">5 Tahap Terintegrasi</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1 text-center">
                      <div
                        onClick={() => openTab('quotation', 'Proforma Invoice (PI)', 'quotation', 'list')}
                        className="p-1.5 bg-white rounded border border-slate-200 hover:border-emerald-600 cursor-pointer transition shadow-2xs"
                      >
                        <span className="text-[9px] font-bold text-slate-500 block truncate">1. PI</span>
                        <span className="text-xs font-black text-slate-900 font-mono">{quotations.length}</span>
                        <span className="text-[8px] text-slate-400 block">Penawaran</span>
                      </div>
                      <div
                        onClick={() => openTab('so', 'Pesanan Penjualan (PO)', 'so', 'list')}
                        className="p-1.5 bg-white rounded border border-emerald-300 hover:border-emerald-600 cursor-pointer transition shadow-2xs"
                      >
                        <span className="text-[9px] font-bold text-emerald-900 block truncate">2. PO</span>
                        <span className="text-xs font-black text-emerald-950 font-mono">{salesOrders.length}</span>
                        <span className="text-[8px] text-emerald-700 block">Pesanan</span>
                      </div>
                      <div
                        onClick={() => openTab('do', 'Pengiriman (DO)', 'do', 'list')}
                        className="p-1.5 bg-white rounded border border-slate-200 hover:border-amber-600 cursor-pointer transition shadow-2xs"
                      >
                        <span className="text-[9px] font-bold text-amber-900 block truncate">3. DO</span>
                        <span className="text-xs font-black text-slate-900 font-mono">{deliveryOrders.length}</span>
                        <span className="text-[8px] text-slate-400 block">Surat Jalan</span>
                      </div>
                      <div
                        onClick={() => openTab('si', 'Invoice', 'si', 'list')}
                        className="p-1.5 bg-white rounded border border-slate-200 hover:border-blue-600 cursor-pointer transition shadow-2xs"
                      >
                        <span className="text-[9px] font-bold text-blue-900 block truncate">4. SI</span>
                        <span className="text-xs font-black text-slate-900 font-mono">{salesInvoices.length}</span>
                        <span className="text-[8px] text-slate-400 block">Invoice</span>
                      </div>
                      <div
                        onClick={() => openTab('payment', 'Penerimaan (CR)', 'payment', 'list')}
                        className="p-1.5 bg-white rounded border border-emerald-300 hover:border-emerald-600 cursor-pointer transition shadow-2xs"
                      >
                        <span className="text-[9px] font-bold text-emerald-900 block truncate">5. CR</span>
                        <span className="text-xs font-black text-emerald-950 font-mono">{salesPayments.length}</span>
                        <span className="text-[8px] text-emerald-700 block">Kas Masuk</span>
                      </div>
                    </div>
                  </div>

                  {/* Pipeline B: Pembelian */}
                  <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-700">
                      <span className="flex items-center space-x-1.5 text-slate-900 font-black">
                        <Truck className="w-3.5 h-3.5 text-[#1e3a5f]" />
                        <span>Siklus Pembelian (Supplier Pabrik Box)</span>
                      </span>
                      <span className="text-slate-500 text-[10px]">4 Tahap Terintegrasi</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-center">
                      <div
                        onClick={() => openTab('po_beli', 'Pesanan Pembelian (PO)', 'po_beli', 'list')}
                        className="p-1.5 bg-white rounded border border-slate-200 hover:border-blue-600 cursor-pointer transition shadow-2xs"
                      >
                        <span className="text-[9px] font-bold text-slate-500 block truncate">1. PO Beli</span>
                        <span className="text-xs font-black text-slate-900 font-mono">{purchaseOrders.length}</span>
                        <span className="text-[8px] text-slate-400 block">Pesan Pabrik</span>
                      </div>
                      <div
                        onClick={() => openTab('ri_beli', 'Penerimaan Barang (RI)', 'ri_beli', 'list')}
                        className="p-1.5 bg-white rounded border border-slate-200 hover:border-emerald-600 cursor-pointer transition shadow-2xs"
                      >
                        <span className="text-[9px] font-bold text-emerald-900 block truncate">2. RI Gudang</span>
                        <span className="text-xs font-black text-emerald-950 font-mono">
                          {purchases.filter((p) => p.status_penerimaan === 'DITERIMA').length || 1}
                        </span>
                        <span className="text-[8px] text-slate-400 block">Stok Masuk</span>
                      </div>
                      <div
                        onClick={() => openTab('pi_beli', 'Faktur Pembelian (FB)', 'pi_beli', 'list')}
                        className="p-1.5 bg-white rounded border border-slate-200 hover:border-rose-600 cursor-pointer transition shadow-2xs"
                      >
                        <span className="text-[9px] font-bold text-rose-900 block truncate">3. FB Faktur</span>
                        <span className="text-xs font-black text-slate-900 font-mono">{purchases.length}</span>
                        <span className="text-[8px] text-slate-400 block">Hutang Usaha</span>
                      </div>
                      <div
                        onClick={() => openTab('pp_beli', 'Pembayaran Pembelian (PP)', 'pp_beli', 'list')}
                        className="p-1.5 bg-white rounded border border-emerald-300 hover:border-emerald-600 cursor-pointer transition shadow-2xs"
                      >
                        <span className="text-[9px] font-bold text-emerald-900 block truncate">4. PP Bayar</span>
                        <span className="text-xs font-black text-emerald-950 font-mono">
                          {purchases.filter((p) => p.status_bayar === 'LUNAS').length}
                        </span>
                        <span className="text-[8px] text-emerald-700 block">Lunas Pabrik</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: Main Operations Grid (Tabel Pesanan, Likuiditas Kas/Bank, & Stok Kemasan) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 flex-1 min-h-0">
                {/* Left (7 Cols): Pesanan Penjualan Terbaru */}
                <div className="lg:col-span-7 bg-white rounded-xl border border-slate-300 shadow-2xs flex flex-col overflow-hidden">
                  <div className="px-3.5 py-2.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-[#0A3828]"></span>
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                        Pesanan Penjualan Terkini (PO)
                      </span>
                    </div>
                    <button
                      onClick={() => openTab('so', 'Pesanan Penjualan (PO)', 'so', 'list')}
                      className="text-[11px] text-[#0A3828] font-bold hover:underline flex items-center space-x-1"
                    >
                      <span>Lihat Semua ({salesOrders.length})</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-100 font-bold border-b border-slate-200 text-slate-700">
                        <tr>
                          <th className="py-2 px-3 border-r border-slate-200">No. PO</th>
                          <th className="py-2 px-3 border-r border-slate-200">Pelanggan</th>
                          <th className="py-2 px-3 text-right border-r border-slate-200">Nilai (Rp)</th>
                          <th className="py-2 px-2.5 text-center border-r border-slate-200">Bayar</th>
                          <th className="py-2 px-2.5 text-center">Kirim</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {salesOrders.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-slate-400">
                              <ShoppingCart className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                              <p className="font-bold text-slate-600">Belum ada pesanan penjualan terdaftar</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">Klik + Order (PO) di atas untuk membuat pesanan baru.</p>
                            </td>
                          </tr>
                        ) : (
                          salesOrders.slice(0, 5).map((s) => (
                            <tr
                              key={s.id}
                              onClick={() => {
                                handleOpenSO(s);
                                openTab('so', 'Pesanan Penjualan (PO)', 'so', 'form');
                              }}
                              className="hover:bg-emerald-50/40 cursor-pointer transition-colors"
                            >
                              <td className="py-2 px-3 font-mono font-bold text-emerald-950 border-r border-slate-100">
                                {s.no_pesanan}
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-100 truncate max-w-[150px]">
                                {s.customer?.nama || '-'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 border-r border-slate-100">
                                Rp {Number(s.total || 0).toLocaleString('id-ID')}
                              </td>
                              <td className="py-2 px-2 text-center border-r border-slate-100">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                    s.status_bayar === 'LUNAS'
                                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                      : s.status_bayar === 'SEBAGIAN_DP'
                                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                                      : 'bg-rose-50 text-rose-900 border-rose-300'
                                  }`}
                                >
                                  {s.status_bayar || 'BELUM BAYAR'}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-center">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                    s.status === 'SELESAI'
                                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                      : 'bg-amber-50 text-amber-900 border-amber-300'
                                  }`}
                                >
                                  {s.status || 'MENUNGGU'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right (5 Cols): Likuiditas Kas/Bank & Monitoring Stok */}
                <div className="lg:col-span-5 flex flex-col space-y-2.5">
                  {/* Card Likuiditas Kas & Bank Realtime */}
                  <div className="bg-white rounded-xl border border-slate-300 shadow-2xs p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Wallet className="w-4 h-4 text-[#064e3b]" />
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                          Kesehatan Kas &amp; Bank Realtime
                        </span>
                      </div>
                      <span className="font-mono font-bold text-xs text-emerald-950">
                        Rp {totalKasBank.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase">
                          <span>Bank BCA Transfer</span>
                          <span className="text-emerald-800">1102-01</span>
                        </div>
                        <span className="text-sm font-black font-mono text-slate-900 block mt-1">
                          Rp {accounts.find((a) => a.kode_akun === '1102-01')
                            ? (accountBalances[accounts.find((a) => a.kode_akun === '1102-01').id]?.saldoAkhir || 0).toLocaleString('id-ID')
                            : '0'}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block truncate">
                          Rekening Utama FAG
                        </span>
                      </div>

                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase">
                          <span>Kas Toko Kasir</span>
                          <span className="text-emerald-800">1101-01</span>
                        </div>
                        <span className="text-sm font-black font-mono text-slate-900 block mt-1">
                          Rp {accounts.find((a) => a.kode_akun === '1101-01')
                            ? (accountBalances[accounts.find((a) => a.kode_akun === '1101-01').id]?.saldoAkhir || 0).toLocaleString('id-ID')
                            : '0'}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block truncate">
                          Kasir Fisik Toko
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setManualTxModalMode('KAS_MASUK');
                          setManualTxInitialAccountId(null);
                          setIsManualTxModalOpen(true);
                        }}
                        className="flex-1 py-1.5 bg-[#0A3828] hover:bg-[#07291D] text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 shadow-2xs active:scale-95"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-300" />
                        <span>+ Kas Masuk</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setManualTxModalMode('KAS_KELUAR');
                          setManualTxInitialAccountId(null);
                          setIsManualTxModalOpen(true);
                        }}
                        className="flex-1 py-1.5 bg-[#881337] hover:bg-[#5e0c25] text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 shadow-2xs active:scale-95"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5 text-rose-300" />
                        <span>- Potong Saldo</span>
                      </button>
                    </div>
                  </div>

                  {/* Card Status Persediaan Kemasan Gudang */}
                  <div className="bg-white rounded-xl border border-slate-300 shadow-2xs p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-[#0f766e]" />
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                          Status Stok Kemasan Kritis
                        </span>
                      </div>
                      <button
                        onClick={() => openTab('items', 'Barang & Jasa (Master Kemasan)', 'items', 'list')}
                        className="text-[10px] text-teal-800 font-bold hover:underline"
                      >
                        Buka Gudang →
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 text-xs">
                      {products.slice(0, 3).map((p) => {
                        const stock = Number(p.stok || 0);
                        const isCritical = stock <= 10;
                        const isLow = stock <= 30;

                        return (
                          <div key={p.id} className="py-1.5 flex items-center justify-between">
                            <div>
                              <p className="font-bold text-slate-900 leading-tight truncate max-w-[160px]">{p.nama}</p>
                              <span className="text-[10px] font-mono text-slate-500">SKU: {p.kode_sku}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-black text-slate-900 block">
                                {stock} {p.satuan || 'Pcs'}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                  isCritical
                                    ? 'bg-rose-50 text-rose-900 border-rose-300'
                                    : isLow
                                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                                    : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                }`}
                              >
                                {isCritical ? 'KRITIS' : isLow ? 'MENIPIS' : 'AMAN'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 10. BUKU BESAR & JURNAL UMUM (COA ACCURATE ONLINE)       */}
          {/* ======================================================== */}
          {(activeTabId === 'coa' || activeTabId === 'journals') && (
            <div className="w-full flex-1 flex flex-col min-h-0 space-y-1.5">
              <div className="bg-white px-3.5 py-2 rounded-lg border border-slate-300 shadow-2xs flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                    Buku Besar &amp; Jurnal Umum
                  </h2>
                  <span className="bg-emerald-50 text-emerald-900 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                    Supabase Terhubung Live
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Sub-tab switcher */}
                  <div className="bg-slate-100 p-0.5 rounded-lg flex space-x-1 border border-slate-300">
                    <button
                      type="button"
                      onClick={() => {
                        setCoaSubTab('jurnal');
                        setActiveTabId('journals');
                        if (typeof window !== 'undefined') {
                          window.history.replaceState(null, '', '#journals');
                        }
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                        (coaSubTab === 'jurnal' || activeTabId === 'journals')
                          ? 'bg-[#0A3828] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Riwayat Jurnal Umum ({journals.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCoaSubTab('coa');
                        setActiveTabId('coa');
                        if (typeof window !== 'undefined') {
                          window.history.replaceState(null, '', '#coa');
                        }
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                        (coaSubTab === 'coa' && activeTabId !== 'journals')
                          ? 'bg-[#0A3828] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Daftar Akun COA ({accounts.length})
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      placeholder={coaSubTab === 'jurnal' ? 'Cari no jurnal, referensi...' : 'Cari kode, nama akun...'}
                      value={tableSearch.coa || ''}
                      onChange={(e) => setTableSearch((p) => ({ ...p, coa: e.target.value }))}
                      className="pl-8 pr-3 py-1 text-xs border border-slate-300 rounded-md w-48 sm:w-60 focus:outline-none focus:ring-1 focus:ring-emerald-700 bg-white"
                    />
                  </div>

                  {coaSubTab === 'coa' && activeTabId !== 'journals' && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAccount(null);
                        setIsAccountModalOpen(true);
                      }}
                      className="px-3 py-1.5 text-xs font-bold bg-[#07291D] hover:bg-[#0A3828] text-emerald-300 border border-emerald-600/50 rounded-lg shadow-xs flex items-center space-x-1.5 transition active:scale-98"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Tambah Akun Baru</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setManualTxModalMode('KAS_MASUK');
                      setManualTxInitialAccountId(null);
                      setIsManualTxModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-bold bg-[#0A3828] hover:bg-[#07271c] text-white rounded-lg shadow-xs flex items-center space-x-1.5 transition active:scale-98"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Transaksi Kas / Jurnal Manual</span>
                  </button>
                </div>
              </div>

              {/* View 1: Jurnal Umum Supabase */}
              {(coaSubTab === 'jurnal' || activeTabId === 'journals') && (
                <div className="flex-1 flex flex-col min-h-0 bg-white rounded-lg border border-slate-300 overflow-hidden shadow-2xs">
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3 border-r border-slate-200 w-32">Tanggal</th>
                          <th className="py-2.5 px-3 border-r border-slate-200 w-36">No. Jurnal</th>
                          <th className="py-2.5 px-3 border-r border-slate-200 w-28">Tipe</th>
                          <th className="py-2.5 px-3 border-r border-slate-200 w-36">No. Referensi</th>
                          <th className="py-2.5 px-3 border-r border-slate-200">Rincian Akun &amp; Keterangan</th>
                          <th className="py-2.5 px-3 text-right border-r border-slate-200 w-28">Debit (Rp)</th>
                          <th className="py-2.5 px-3 text-right border-r border-slate-200 w-28">Kredit (Rp)</th>
                          <th className="py-2.5 px-3 text-center w-24 border-r border-slate-200">Status</th>
                          <th className="py-2.5 px-3 text-center w-16">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {journals.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-16 text-center text-slate-400">
                              <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                              <p className="font-bold text-slate-700">Belum ada jurnal transaksi terdaftar</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Jurnal akan terposting otomatis dari transaksi Uang Muka (DP), Invoice (SI), dan Pelunasan (CR), atau manual via tombol di atas.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          journals
                            .filter((j) => {
                              const s = (tableSearch.coa || '').toLowerCase();
                              return (
                                (j.no_jurnal || '').toLowerCase().includes(s) ||
                                (j.no_referensi || '').toLowerCase().includes(s) ||
                                (j.keterangan || '').toLowerCase().includes(s)
                              );
                            })
                            .map((j) => {
                              const totalDebit = (j.jurnal_detail || []).reduce((acc, d) => acc + Number(d.debit || 0), 0);
                              const totalKredit = (j.jurnal_detail || []).reduce((acc, d) => acc + Number(d.kredit || 0), 0);
                              const isBalanced = Math.abs(totalDebit - totalKredit) < 0.01;

                              return (
                                <tr key={j.id} className="hover:bg-slate-50 transition-colors align-top">
                                  <td className="py-2 px-3 text-slate-600 font-mono border-r border-slate-100">{j.tanggal}</td>
                                  <td className="py-2 px-3 font-mono font-bold text-emerald-900 border-r border-slate-100">{j.no_jurnal}</td>
                                  <td className="py-2 px-3 border-r border-slate-100">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                                      {j.tipe_transaksi}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 font-mono font-semibold text-slate-800 border-r border-slate-100">
                                    {j.no_referensi || '-'}
                                  </td>
                                  <td className="py-2 px-3 border-r border-slate-100">
                                    <p className="font-medium text-slate-900 mb-1">{j.keterangan}</p>
                                    <div className="space-y-1">
                                      {(j.jurnal_detail || []).map((d, dIdx) => (
                                        <div key={d.id || dIdx} className="flex items-center justify-between text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                          <span className="font-mono text-slate-700">
                                            <strong className="text-emerald-900">{d.akun?.kode_akun || d.kodeAkun}</strong> - {d.akun?.nama_akun || d.catatan}
                                          </span>
                                          <span className="font-mono text-slate-600">
                                            {Number(d.debit) > 0 ? `D: Rp ${Number(d.debit).toLocaleString('id-ID')}` : `K: Rp ${Number(d.kredit).toLocaleString('id-ID')}`}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 border-r border-slate-100">
                                    Rp {totalDebit.toLocaleString('id-ID')}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 border-r border-slate-100">
                                    Rp {totalKredit.toLocaleString('id-ID')}
                                  </td>
                                  <td className="py-2 px-3 text-center border-r border-slate-100">
                                    {isBalanced ? (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                        ✓ Seimbang
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-300">
                                        Selisih
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <div className="flex items-center justify-center space-x-1">
                                      {['PENERIMAAN_KAS', 'PENGELUARAN_KAS'].includes(j.tipe_transaksi) && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const isKK = j.tipe_transaksi === 'PENGELUARAN_KAS';
                                            const details = allJournalDetails.filter((d) => d.jurnal_id === j.id);
                                            const debitLine = details.find((d) => Number(d.debit) > 0);
                                            const kreditLine = details.find((d) => Number(d.kredit) > 0);
                                            const sourceAcc = isKK ? kreditLine?.akun?.nama_akun : debitLine?.akun?.nama_akun;
                                            const targetAcc = isKK ? debitLine?.akun?.nama_akun : kreditLine?.akun?.nama_akun;

                                            setCurrentCashVoucher({
                                              docNo: j.no_referensi || j.no_jurnal?.replace('JU.', ''),
                                              date: j.tanggal,
                                              type: isKK ? 'KAS_KELUAR' : 'KAS_MASUK',
                                              amount: totalDebit || totalKredit,
                                              sourceAccountName: sourceAcc || 'Kas & Bank',
                                              targetAccountName: targetAcc || 'Beban / Keperluan',
                                              description: j.keterangan || (isKK ? 'Pengeluaran Kas' : 'Penerimaan Kas'),
                                              recipientName: j.keterangan || (isKK ? 'Karyawan / Penerima' : 'FAG Kemasan'),
                                            });
                                            setIsCashVoucherOpen(true);
                                          }}
                                          title="Cetak Bukti PDF / Slip Pembayaran"
                                          className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded transition active:scale-95 flex items-center space-x-0.5"
                                        >
                                          <Printer className="w-3 h-3 text-emerald-700" />
                                          <span>PDF</span>
                                        </button>
                                      )}
                                      {['PENERIMAAN_KAS', 'PENGELUARAN_KAS', 'TRANSFER_KAS', 'JURNAL_UMUM'].includes(j.tipe_transaksi) ? (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteManualJournal(j.id, j.no_jurnal)}
                                          title="Hapus Transaksi Jurnal Manual (Saldo dikembalikan)"
                                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      ) : (
                                        <span className="text-slate-300 select-none">-</span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="h-8 bg-slate-50 border-t border-slate-200 px-3 flex items-center justify-between text-[11px] text-slate-500 font-medium select-none">
                    <span>Total Jurnal Terdaftar: <strong>{journals.length}</strong> entri</span>
                    <span className="text-emerald-800 font-bold">Sistem Pembukuan Berpasangan (Double-Entry)</span>
                  </div>
                </div>
              )}

              {/* View 2: Daftar Akun (COA) */}
              {(coaSubTab === 'coa' && activeTabId !== 'journals') && (
                <div className="flex-1 flex flex-col min-h-0 bg-white rounded-lg border border-slate-300 overflow-hidden shadow-2xs">
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3 border-r border-slate-200 w-28">Kode Akun</th>
                          <th className="py-2.5 px-3 border-r border-slate-200">Nama Akun Perkiraan</th>
                          <th className="py-2.5 px-3 border-r border-slate-200 w-36">Tipe Akun</th>
                          <th className="py-2.5 px-3 text-center border-r border-slate-200 w-24">Posisi Normal</th>
                          <th className="py-2.5 px-3 text-right border-r border-slate-200 w-28">Saldo Awal (Rp)</th>
                          <th className="py-2.5 px-3 text-right border-r border-slate-200 w-28">Total Debit (Rp)</th>
                          <th className="py-2.5 px-3 text-right border-r border-slate-200 w-28">Total Kredit (Rp)</th>
                          <th className="py-2.5 px-3 text-right w-36">Saldo Saat Ini (Rp)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {accounts
                          .filter((a) => {
                            const s = (tableSearch.coa || '').toLowerCase();
                            return (
                              (a.kode_akun || '').toLowerCase().includes(s) ||
                              (a.nama_akun || '').toLowerCase().includes(s) ||
                              (a.tipe_akun || '').toLowerCase().includes(s)
                            );
                          })
                          .map((a) => {
                            const bal = accountBalances[a.id] || {
                              totalDebit: 0,
                              totalKredit: 0,
                              saldoAwal: Number(a.saldo_awal || 0),
                              saldoAkhir: Number(a.saldo_awal || 0),
                            };
                            const isKasBank = a.tipe_akun === 'Kas & Bank';

                            return (
                              <tr
                                key={a.id}
                                onClick={() => {
                                  setEditingAccount(a);
                                  setIsAccountModalOpen(true);
                                }}
                                className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                                title="Klik untuk edit / setting akun perkiraan ini"
                              >
                                <td className="py-2 px-3 font-mono font-bold text-emerald-900 border-r border-slate-100 flex items-center justify-between">
                                  <span>{a.kode_akun}</span>
                                  <span className="text-[9px] text-slate-400 group-hover:text-emerald-700 font-sans">✎</span>
                                </td>
                                <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-100">{a.nama_akun}</td>
                                <td className="py-2 px-3 text-slate-600 border-r border-slate-100">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                    isKasBank ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-slate-100 text-slate-800 border-slate-200'
                                  }`}>
                                    {a.tipe_akun}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-center font-bold text-slate-700 border-r border-slate-100">
                                  {a.saldo_normal}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-slate-600 border-r border-slate-100">
                                  Rp {bal.saldoAwal.toLocaleString('id-ID')}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-emerald-900 font-medium border-r border-slate-100">
                                  {bal.totalDebit > 0 ? `Rp ${bal.totalDebit.toLocaleString('id-ID')}` : '-'}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-rose-900 font-medium border-r border-slate-100">
                                  {bal.totalKredit > 0 ? `Rp ${bal.totalKredit.toLocaleString('id-ID')}` : '-'}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold">
                                  {isKasBank ? (
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold inline-block border ${
                                      bal.saldoAkhir >= 0
                                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-2xs'
                                        : 'bg-rose-50 text-rose-900 border-rose-300'
                                    }`}>
                                      Rp {bal.saldoAkhir.toLocaleString('id-ID')}
                                    </span>
                                  ) : (
                                    <span className="text-slate-900">
                                      Rp {bal.saldoAkhir.toLocaleString('id-ID')}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  <div className="h-8 bg-slate-50 border-t border-slate-200 px-3 flex items-center justify-between text-[11px] text-slate-500 font-medium select-none">
                    <span>Total Chart of Accounts: <strong>{accounts.length}</strong> akun</span>
                    <span className="text-emerald-800 font-bold">
                      Total Saldo Kas &amp; Bank: Rp{' '}
                      {accounts
                        .filter((a) => a.tipe_akun === 'Kas & Bank')
                        .reduce((sum, a) => sum + (accountBalances[a.id]?.saldoAkhir || 0), 0)
                        .toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* 11. LAPORAN LABA RUGI (ACCURATE ONLINE STANDARD)         */}
          {/* ======================================================== */}
          {activeTabId === 'income_statement' && (
            <div className="w-full flex-1 flex flex-col min-h-0 space-y-2.5 overflow-y-auto pb-8">
              {/* Executive Header */}
              <div className="bg-white px-4 py-3 rounded-xl border border-slate-300 shadow-2xs flex items-center justify-between flex-wrap gap-2.5">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-[#07291D] text-emerald-300 flex items-center justify-center shadow-xs border border-emerald-700/40">
                    <TrendingUp className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                      Laporan Laba Rugi (Income Statement)
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {companySettings?.namaPerusahaan || 'PT ETERNAL PACKAGING INDONESIA'} &bull; Periode Berjalan (Buku Besar Realtime Supabase)
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => loadData()}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center space-x-1 border border-slate-300 active:scale-95"
                    title="Refresh Perhitungan dari Buku Besar"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sinkron Buku Besar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-[#0A3828] hover:bg-[#07291D] text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-xs active:scale-95"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak Laporan</span>
                  </button>
                </div>
              </div>

              {/* 5 Quick Executive Summary Cards (Pekat Mewah) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pendapatan Bersih</span>
                  <span className="text-base sm:text-lg font-black text-slate-900 font-mono block mt-0.5">
                    Rp {totalOmzetPenjualan.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[10px] text-emerald-800 font-semibold mt-0.5 block">{salesInvoices.length} Faktur Penjualan</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">HPP Persediaan (FIFO)</span>
                  <span className="text-base sm:text-lg font-black text-slate-900 font-mono block mt-0.5">
                    Rp {totalHPP.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">Beban Pokok Box Terjual</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-300 shadow-2xs">
                  <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">Laba Kotor</span>
                  <span className="text-base sm:text-lg font-black text-emerald-950 font-mono block mt-0.5">
                    Rp {totalLabaKotor.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[10px] text-emerald-800 font-bold mt-0.5 block">Margin: {grossProfitMargin}%</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-rose-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-rose-900 uppercase tracking-wider block">Beban Operasional</span>
                  <span className="text-base sm:text-lg font-black text-rose-950 font-mono block mt-0.5">
                    Rp {totalBebanOperasional.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[10px] text-rose-800 font-semibold mt-0.5 block">Biaya Usaha &amp; Toko</span>
                </div>

                <div className="bg-[#07291D] p-3 rounded-xl border border-emerald-700/60 shadow-xs col-span-2 sm:col-span-1 text-white">
                  <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">Laba Bersih Usaha</span>
                  <span className="text-base sm:text-lg font-black text-white font-mono block mt-0.5">
                    Rp {totalLabaBersih.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[10px] text-emerald-300 font-bold mt-0.5 block">Net Margin: {netProfitMargin}%</span>
                </div>
              </div>

              {/* Main Statement Sheet (Accurate Online Layout) */}
              <div className="bg-white rounded-xl border border-slate-300 shadow-2xs p-5 max-w-4xl mx-auto w-full space-y-5">
                {/* Statement Header / Kop */}
                <div className="border-b border-slate-300 pb-3 flex justify-between items-end">
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
                      LAPORAN LABA RUGI KOMPREHENSIF
                    </h3>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      Periode Berjalan &bull; Perhitungan Realtime Buku Besar
                    </p>
                  </div>
                  <div className="text-right text-[11px] text-slate-500 font-mono">
                    Mata Uang: IDR (Rp)
                  </div>
                </div>

                {/* Bagian 1: PENDAPATAN OPERASIONAL */}
                <div className="space-y-1.5">
                  <div className="bg-slate-100/80 px-3 py-1.5 rounded-lg flex justify-between items-center font-black text-xs text-slate-900 border border-slate-200">
                    <span className="uppercase tracking-wider">1. Pendapatan Penjualan Kemasan</span>
                    <span className="font-mono text-emerald-950 text-sm">
                      Rp {totalOmzetPenjualan.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="px-3 divide-y divide-slate-100 text-xs">
                    <div className="flex justify-between py-2 text-slate-700">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[11px] text-slate-400">4101-01</span>
                        <span>Penjualan Bersih Produk Kemasan (Faktur SI Terbit)</span>
                      </div>
                      <span className="font-mono font-semibold">Rp {totalOmzetPenjualan.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>

                {/* Bagian 2: HARGA POKOK PENJUALAN (HPP) */}
                <div className="space-y-1.5">
                  <div className="bg-slate-100/80 px-3 py-1.5 rounded-lg flex justify-between items-center font-black text-xs text-slate-900 border border-slate-200">
                    <span className="uppercase tracking-wider">2. Beban Pokok Penjualan (HPP Persediaan)</span>
                    <span className="font-mono text-slate-900 text-sm">
                      (Rp {totalHPP.toLocaleString('id-ID')})
                    </span>
                  </div>
                  <div className="px-3 divide-y divide-slate-100 text-xs">
                    <div className="flex justify-between py-2 text-slate-700">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[11px] text-slate-400">5101-01</span>
                        <span>Harga Pokok Penjualan Kemasan (Berdasarkan Nilai Modal FIFO Stok)</span>
                      </div>
                      <span className="font-mono font-semibold text-slate-800">
                        (Rp {totalHPP.toLocaleString('id-ID')})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subtotal: LABA KOTOR */}
                <div className="bg-emerald-50/70 border-2 border-emerald-500/50 rounded-xl px-4 py-2.5 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-black text-emerald-950 uppercase tracking-wide block">
                      LABA KOTOR USAHA (GROSS PROFIT)
                    </span>
                    <span className="text-[10px] text-emerald-800 font-semibold">
                      Pendapatan Penjualan dikurangi Beban Pokok Modal Kemasan &bull; Margin Kotor: {grossProfitMargin}%
                    </span>
                  </div>
                  <span className="text-base sm:text-lg font-black font-mono text-emerald-950">
                    Rp {totalLabaKotor.toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Bagian 3: BEBAN OPERASIONAL */}
                <div className="space-y-1.5">
                  <div className="bg-slate-100/80 px-3 py-1.5 rounded-lg flex justify-between items-center font-black text-xs text-slate-900 border border-slate-200">
                    <span className="uppercase tracking-wider">3. Beban Operasional &amp; Usaha Toko</span>
                    <span className="font-mono text-rose-900 text-sm">
                      (Rp {totalBebanOperasional.toLocaleString('id-ID')})
                    </span>
                  </div>
                  <div className="px-3 divide-y divide-slate-100 text-xs">
                    {bebanAccounts.length === 0 ? (
                      <div className="py-2 text-slate-400 text-center">Belum ada akun beban operasional terdaftar</div>
                    ) : (
                      bebanAccounts.map((a) => {
                        const bal = accountBalances[a.id]?.saldoAkhir || 0;
                        return (
                          <div key={a.id} className="flex justify-between py-1.5 text-slate-700 hover:bg-slate-50/60 px-1 rounded">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-[11px] text-slate-400">{a.kode_akun}</span>
                              <span className={bal > 0 ? 'font-semibold text-slate-900' : 'text-slate-500'}>
                                {a.nama_akun}
                              </span>
                            </div>
                            <span className={`font-mono ${bal > 0 ? 'font-bold text-rose-950' : 'text-slate-400'}`}>
                              {bal > 0 ? `Rp ${bal.toLocaleString('id-ID')}` : 'Rp 0'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Hasil Akhir: LABA BERSIH USAHA (Pekat Mewah) */}
                <div className="bg-[#07291D] text-white rounded-xl p-4 flex justify-between items-center shadow-sm border border-emerald-700/60">
                  <div>
                    <span className="uppercase tracking-wider text-xs font-black block text-emerald-300">
                      LABA BERSIH USAHA BERJALAN (NET PROFIT)
                    </span>
                    <span className="text-[11px] text-emerald-200 mt-0.5 block">
                      Hasil keuntungan bersih riil setelah HPP &amp; seluruh beban operasional tercatat &bull; Net Margin: {netProfitMargin}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xl sm:text-2xl font-black text-white block">
                      Rp {totalLabaBersih.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] text-emerald-300 font-mono uppercase tracking-wider">
                      {totalLabaBersih >= 0 ? '✓ PROFIT SURPLUS' : '⚠ DEFISIT'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

            {/* ============================================================ */}
      {/* ACCURATE ONLINE: DOWN PAYMENT (UANG MUKA) MODAL               */}
      {/* ============================================================ */}
      <DownPaymentModal
        isOpen={isDpModalOpen}
        onClose={() => {
          setIsDpModalOpen(false);
          setSelectedDpOrder(null);
        }}
        initialDoc={selectedDpOrder}
        initialSource={selectedDpSource || 'PO'}
        customers={contacts.filter((c) => !c.tipe || c.tipe.toLowerCase() === 'pelanggan')}
        salesOrders={salesOrders}
        salesInvoices={salesInvoices}
        accounts={accounts}
        companySettings={companySettings}
        onSubmitPayment={handleSubmitDownPayment}
      />

      {/* ============================================================ */}
      {/* 4. MODAL PRINT DOKUMEN RESMI (PO, SQ, DO, SI, CR) / PDF     */}
      {/* ============================================================ */}
      <DocumentPrintModal
        isOpen={!!printDoc}
        onClose={() => setPrintDoc(null)}
        doc={printDoc}
        onSavePrintSettings={(newPrintConfigs, extraUpdates = {}) => {
          const updated = {
            ...companySettings,
            printSettingsPerDoc: newPrintConfigs,
            ...extraUpdates,
          };
          saveCompanySettings(updated);
        }}
      />

      {/* ============================================================ */}
      {/* 4.1 MODAL PENGATURAN FILTER & KOLOM TABEL (APPLE HIG CONFIG) */}
      {/* ============================================================ */}
      <TableConfigModal
        isOpen={!!activeConfigModal}
        onClose={() => setActiveConfigModal(null)}
        moduleKey={activeConfigModal || 'so'}
        moduleTitle={
          activeConfigModal === 'so'
            ? 'Pesanan Penjualan (PO)'
            : activeConfigModal === 'quotation'
            ? 'Proforma Invoice (PI)'
            : activeConfigModal === 'do'
            ? 'Pengiriman Pesanan (DO)'
            : activeConfigModal === 'si'
            ? 'Faktur Penjualan (SI)'
            : activeConfigModal === 'payment'
            ? 'Penerimaan Pembayaran (CR)'
            : 'Tabel Data'
        }
        config={tableConfigs[activeConfigModal] || DEFAULT_TABLE_CONFIGS[activeConfigModal]}
        onSaveConfig={(newCfg) => handleSaveTableConfig(activeConfigModal, newCfg)}
      />

      {/* ============================================================ */}
      {/* 5. MODAL RESET & BERSIHKAN DATA DEMO (FRESH START BUKA TOKO) */}
      {/* ============================================================ */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-center border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-xs">
              <RotateCcw className="w-7 h-7 stroke-[2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Bersihkan &amp; Reset Semua Data</h3>
              <p className="text-xs text-slate-500 mt-1">
                Kembalikan sistem ke kondisi awal 100% bersih agar Anda dapat menginput katalog produk dan data asli FAG Kemasan dari awal.
              </p>
            </div>

            {/* Checkbox Options */}
            <div className="space-y-2 text-left">
              <label className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition select-none">
                <input
                  type="checkbox"
                  checked={resetIncludeProducts}
                  onChange={(e) => setResetIncludeProducts(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                />
                <div className="text-[11px]">
                  <span className="font-bold text-slate-800 block">
                    Kosongkan Master Barang &amp; Kemasan (Mulai dari 0 SKU)
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    Hapus seluruh contoh produk demo agar Anda bisa menginput data produk kemasan yang asli.
                  </span>
                </div>
              </label>

              <label className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition select-none">
                <input
                  type="checkbox"
                  checked={resetIncludeContacts}
                  onChange={(e) => setResetIncludeContacts(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                />
                <div className="text-[11px]">
                  <span className="font-bold text-slate-800 block">
                    Kosongkan Kontak Pelanggan &amp; Supplier Contoh
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    Hapus seluruh kontak pelanggan/supplier contoh agar daftar kontak Anda bersih.
                  </span>
                </div>
              </label>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-800 leading-relaxed">
                <strong>Data yang tetap aman:</strong> 49 Akun COA PSAK Standar, Pengaturan Profil Usaha FAG Kemasan, dan Akun Admin Login <code className="bg-emerald-100/80 px-1 py-0.5 rounded font-mono">fagkemasan@gmail.com</code> tetap tersimpan aman.
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="flex-1 py-2.5 border border-slate-300 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    setLoading(true);
                    await resetAllTransactions({
                      resetProducts: resetIncludeProducts,
                      resetContacts: resetIncludeContacts,
                    });
                    showToast(
                      'Semua data berhasil dibersihkan! Anda kini siap memasukkan master produk & data asli dari awal.',
                      'success',
                      'Sistem Bersih 100%'
                    );
                    setIsResetModalOpen(false);
                    await loadData();
                  } catch (e) {
                    showToast('Gagal reset: ' + e.message, 'error', 'Reset Gagal');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>BERSIHKAN SEMUA DATA</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACCURATE ONLINE: MODAL AMBIL DARI PROFORMA INVOICE (PI) KE PESANAN (PO) */}
      {soGetFromModalOpen && (() => {
        const qLower = (piSearchQuery || '').toLowerCase().trim();
        const filteredPIs = quotations.filter((q) => {
          if (!qLower) return true;
          const no = (q.no_penawaran || '').toLowerCase();
          const cust = (q.customer?.nama || '').toLowerCase();
          const tgl = (q.tanggal || '').toLowerCase();
          const tot = String(q.total || '');
          const items = (q.penawaran_penjualan_detail || [])
            .map((d) => d.produk?.nama || '')
            .join(' ')
            .toLowerCase();
          return (
            no.includes(qLower) ||
            cust.includes(qLower) ||
            tgl.includes(qLower) ||
            tot.includes(qLower) ||
            items.includes(qLower)
          );
        });

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-5 space-y-3.5 border border-slate-200 animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-black text-xs border border-emerald-300 shadow-2xs">
                    PI
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                        Ambil dari Proforma Invoice (PI)
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold rounded-full border border-emerald-200">
                        {quotations.length} Dokumen Tersedia
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Pilih Proforma Invoice yang telah disetujui pelanggan untuk ditarik otomatis ke formulir Pesanan Penjualan (PO)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSoGetFromModalOpen(false);
                    setPiSearchQuery('');
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Live Search & Counter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={piSearchQuery}
                    onChange={(e) => setPiSearchQuery(e.target.value)}
                    placeholder="Cari nomor PI, nama pelanggan, tanggal, rincian barang kemasan..."
                    className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 outline-none focus:ring-1 focus:ring-emerald-700 focus:border-emerald-700"
                    autoFocus
                  />
                  {piSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPiSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="text-right flex items-center justify-between sm:justify-end space-x-2 text-[11px] text-slate-500 px-1">
                  <span>
                    Menampilkan <strong>{filteredPIs.length}</strong> dari <strong>{quotations.length}</strong> Proforma Invoice
                  </span>
                </div>
              </div>

              {/* Scalable List Container (Handles 10, 20, 50, 100+ documents effortlessly) */}
              <div className="flex-1 overflow-y-auto max-h-[55vh] border border-slate-200 rounded-lg bg-slate-50/50 divide-y divide-slate-200">
                {quotations.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 bg-white">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-800" />
                    <p className="text-xs font-bold text-slate-700">Belum Ada Proforma Invoice (PI)</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                      Buat Proforma Invoice baru terlebih dahulu di menu Proforma Invoice (PI).
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSoGetFromModalOpen(false);
                        openTab('quotation', 'Proforma Invoice (PI)', 'quotation', 'form');
                      }}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition inline-flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Buat Proforma Invoice Sekarang</span>
                    </button>
                  </div>
                ) : filteredPIs.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 bg-white">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                    <p className="text-xs font-bold text-slate-700">Tidak ada Proforma Invoice yang cocok</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                      Tidak ditemukan hasil untuk pencarian &quot;{piSearchQuery}&quot;
                    </p>
                    <button
                      type="button"
                      onClick={() => setPiSearchQuery('')}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold"
                    >
                      Bersihkan Pencarian
                    </button>
                  </div>
                ) : (
                  filteredPIs.map((q) => {
                    const detailList = q.penawaran_penjualan_detail || [];
                    const itemCount = detailList.length;
                    const itemsSummary = detailList
                      .map((d) => `${d.produk?.nama || 'Barang'} (${d.qty || 1} ${d.satuan || d.produk?.satuan || 'Pcs'})`)
                      .join(', ');

                    return (
                      <div
                        key={q.id}
                        onClick={() => {
                          flowSQtoPO(q);
                          setSoGetFromModalOpen(false);
                          setPiSearchQuery('');
                          showToast(
                            `Data Proforma Invoice ${q.no_penawaran} berhasil ditarik ke formulir pesanan!`,
                            'success',
                            'Ambil Proforma Invoice'
                          );
                        }}
                        className="p-3 bg-white hover:bg-emerald-50/80 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="font-mono font-black text-xs text-emerald-950 group-hover:text-emerald-700">
                              {q.no_penawaran}
                            </span>
                            <span className="text-[10px] px-2 py-0.2 bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold rounded">
                              {q.status || 'DISETUJUI'}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              • Tanggal: {q.tanggal}
                            </span>
                          </div>

                          <div className="mt-1 flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-900">
                              {q.customer?.nama || 'Pelanggan Umum'}
                            </span>
                            {q.customer?.telepon && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                ({q.customer.telepon})
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-500 truncate mt-0.5" title={itemsSummary}>
                            <span className="font-semibold text-slate-600">{itemCount} Rincian Barang:</span>{' '}
                            {itemsSummary || 'Tidak ada rincian barang'}
                          </p>
                        </div>

                        <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 flex-shrink-0">
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                              Total Nilai
                            </span>
                            <span className="font-mono font-black text-sm text-slate-900">
                              Rp {Number(q.total || 0).toLocaleString('id-ID')}
                            </span>
                          </div>

                          <button
                            type="button"
                            className="mt-1.5 px-3 py-1 bg-emerald-700 group-hover:bg-emerald-800 text-white rounded-md text-xs font-bold inline-flex items-center space-x-1 shadow-2xs transition"
                          >
                            <span>Tarik ke PO</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  💡 Tip: Menarik Proforma Invoice akan otomatis mengisi pelanggan, barang, qty, dan harga ke PO.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSoGetFromModalOpen(false);
                    setPiSearchQuery('');
                  }}
                  className="px-4 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-100 transition ml-auto"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ACCURATE ONLINE: MODAL AMBIL DARI PESANAN (PO) KE SURAT JALAN (DO) */}
      {doGetFromModalOpen && (() => {
        const qLower = (doSearchQuery || '').toLowerCase().trim();
        const filteredPOs = salesOrders.filter((po) => {
          if (!qLower) return true;
          const no = (po.no_pesanan || '').toLowerCase();
          const cust = (po.customer?.nama || '').toLowerCase();
          const tgl = (po.tanggal || '').toLowerCase();
          const tot = String(po.total || '');
          const items = (po.pesanan_penjualan_detail || [])
            .map((d) => d.produk?.nama || '')
            .join(' ')
            .toLowerCase();
          return (
            no.includes(qLower) ||
            cust.includes(qLower) ||
            tgl.includes(qLower) ||
            tot.includes(qLower) ||
            items.includes(qLower)
          );
        });

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-5 space-y-3.5 border border-slate-200 animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-black text-xs border border-emerald-300 shadow-2xs">
                    DO
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                        Ambil dari Pesanan Penjualan (PO)
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold rounded-full border border-emerald-200">
                        {salesOrders.length} Pesanan Tersedia
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Pilih Pesanan Penjualan yang siap dikirim untuk ditarik otomatis ke Surat Jalan (DO)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDoGetFromModalOpen(false);
                    setDoSearchQuery('');
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={doSearchQuery}
                    onChange={(e) => setDoSearchQuery(e.target.value)}
                    placeholder="Cari nomor pesanan, nama pelanggan, barang kemasan..."
                    className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 outline-none focus:ring-1 focus:ring-emerald-700 focus:border-emerald-700"
                    autoFocus
                  />
                  {doSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setDoSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="text-right flex items-center justify-between sm:justify-end space-x-2 text-[11px] text-slate-500 px-1">
                  <span>
                    Menampilkan <strong>{filteredPOs.length}</strong> dari <strong>{salesOrders.length}</strong> Pesanan
                  </span>
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto max-h-[55vh] border border-slate-200 rounded-lg bg-slate-50/50 divide-y divide-slate-200">
                {salesOrders.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 bg-white">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-800" />
                    <p className="text-xs font-bold text-slate-700">Belum Ada Pesanan Penjualan</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Buat Pesanan Penjualan (PO) terlebih dahulu di modul Penjualan.
                    </p>
                  </div>
                ) : filteredPOs.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 bg-white">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                    <p className="text-xs font-bold text-slate-700">Tidak ada Pesanan yang cocok</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                      Tidak ditemukan hasil untuk pencarian &quot;{doSearchQuery}&quot;
                    </p>
                    <button
                      type="button"
                      onClick={() => setDoSearchQuery('')}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold"
                    >
                      Bersihkan Pencarian
                    </button>
                  </div>
                ) : (
                  filteredPOs.map((po) => {
                    const detailList = po.pesanan_penjualan_detail || [];
                    const itemCount = detailList.length;
                    const itemsSummary = detailList
                      .map((d) => `${d.produk?.nama || 'Barang'} (${d.qty || 1} ${d.satuan || d.produk?.satuan || 'Pcs'})`)
                      .join(', ');

                    return (
                      <div
                        key={po.id}
                        onClick={() => {
                          flowPOtoDO(po);
                          setDoGetFromModalOpen(false);
                          setDoSearchQuery('');
                        }}
                        className="p-3 bg-white hover:bg-emerald-50/80 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="font-mono font-black text-xs text-emerald-950 group-hover:text-emerald-700">
                              {po.no_pesanan}
                            </span>
                            <span className="text-[10px] px-2 py-0.2 bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold rounded">
                              {po.status || 'MENUNGGU_PENGIRIMAN'}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              • Tanggal: {po.tanggal}
                            </span>
                          </div>

                          <div className="mt-1 flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-900">
                              {po.customer?.nama || 'Pelanggan Umum'}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 truncate mt-0.5" title={itemsSummary}>
                            <span className="font-semibold text-slate-600">{itemCount} Rincian Barang:</span>{' '}
                            {itemsSummary || 'Tidak ada rincian barang'}
                          </p>
                        </div>

                        <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 flex-shrink-0">
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                              Total Nilai
                            </span>
                            <span className="font-mono font-black text-sm text-slate-900">
                              Rp {Number(po.total || 0).toLocaleString('id-ID')}
                            </span>
                          </div>

                          <button
                            type="button"
                            className="mt-1.5 px-3 py-1 bg-emerald-700 group-hover:bg-emerald-800 text-white rounded-md text-xs font-bold inline-flex items-center space-x-1 shadow-2xs transition"
                          >
                            <span>Tarik ke DO</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  💡 Tip: Menarik pesanan akan mengisi data pelanggan dan barang ke formulir Surat Jalan.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDoGetFromModalOpen(false);
                    setDoSearchQuery('');
                  }}
                  className="px-4 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-100 transition ml-auto"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ACCURATE ONLINE: MODAL AMBIL DARI DO / PO KE INVOICE (SI) */}
      {siGetFromModalOpen && (() => {
        const qLower = (siSearchQuery || '').toLowerCase().trim();

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-5 space-y-3.5 border border-slate-200 animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-black text-xs border border-emerald-300 shadow-2xs">
                    SI
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                        Ambil Data Faktur Penjualan (SI)
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Tarik data penagihan dari Surat Jalan (DO) yang sudah dikirim atau langsung dari Pesanan (PO)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSiGetFromModalOpen(false);
                    setSiSearchQuery('');
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tab Selector: DO vs PO */}
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setSiTakeTab('DO')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                    siTakeTab === 'DO'
                      ? 'bg-emerald-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>1. Dari Pengiriman (DO)</span>
                  <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                    {deliveryOrders.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSiTakeTab('PO')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                    siTakeTab === 'PO'
                      ? 'bg-emerald-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>2. Langsung Dari Pesanan (PO)</span>
                  <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                    {salesOrders.length}
                  </span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={siSearchQuery}
                    onChange={(e) => setSiSearchQuery(e.target.value)}
                    placeholder={
                      siTakeTab === 'DO'
                        ? 'Cari nomor surat jalan, pelanggan, ekspedisi...'
                        : 'Cari nomor pesanan, pelanggan, barang...'
                    }
                    className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 outline-none focus:ring-1 focus:ring-emerald-700 focus:border-emerald-700"
                    autoFocus
                  />
                  {siSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setSiSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* List Container */}
              <div className="flex-1 overflow-y-auto max-h-[55vh] border border-slate-200 rounded-lg bg-slate-50/50 divide-y divide-slate-200">
                {siTakeTab === 'DO' ? (
                  (() => {
                    const filteredDOs = deliveryOrders.filter((doo) => {
                      if (!qLower) return true;
                      const no = (doo.no_surat_jalan || '').toLowerCase();
                      const cust = (doo.customer?.nama || '').toLowerCase();
                      const tgl = (doo.tanggal || '').toLowerCase();
                      const eksp = (doo.ekspedisi || '').toLowerCase();
                      return no.includes(qLower) || cust.includes(qLower) || tgl.includes(qLower) || eksp.includes(qLower);
                    });

                    if (deliveryOrders.length === 0) {
                      return (
                        <div className="text-center py-12 text-slate-400 bg-white">
                          <Truck className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-800" />
                          <p className="text-xs font-bold text-slate-700">Belum Ada Surat Jalan (DO)</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Terbitkan Surat Jalan terlebih dahulu di menu Pengiriman (DO).
                          </p>
                        </div>
                      );
                    }
                    if (filteredDOs.length === 0) {
                      return (
                        <div className="text-center py-10 text-slate-400 bg-white">
                          <p className="text-xs font-bold text-slate-700">Tidak ada Surat Jalan yang cocok</p>
                        </div>
                      );
                    }
                    return filteredDOs.map((doo) => {
                      const detailList = doo.pengiriman_pesanan_detail || [];
                      const itemCount = detailList.length;
                      const itemsSummary = detailList
                        .map((d) => `${d.produk?.nama || 'Barang'} (${d.qty || 1} Pcs)`)
                        .join(', ');

                      return (
                        <div
                          key={doo.id}
                          onClick={() => {
                            flowDOtoSI(doo);
                            setSiGetFromModalOpen(false);
                            setSiSearchQuery('');
                          }}
                          className="p-3 bg-white hover:bg-emerald-50/80 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <span className="font-mono font-black text-xs text-emerald-950 group-hover:text-emerald-700">
                                {doo.no_surat_jalan}
                              </span>
                              <span className="text-[10px] px-2 py-0.2 bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold rounded">
                                {doo.status || 'TERKIRIM'}
                              </span>
                              <span className="text-[11px] text-slate-400 font-medium">
                                • Tanggal: {doo.tanggal}
                              </span>
                            </div>

                            <div className="mt-1 flex items-center space-x-2">
                              <span className="text-xs font-bold text-slate-900">
                                {doo.customer?.nama || 'Pelanggan Umum'}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                via {doo.ekspedisi || 'Armada FAG'}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-500 truncate mt-0.5" title={itemsSummary}>
                              <span className="font-semibold text-slate-600">{itemCount} Barang:</span>{' '}
                              {itemsSummary || 'Tidak ada rincian barang'}
                            </p>
                          </div>

                          <button
                            type="button"
                            className="mt-1.5 px-3 py-1 bg-emerald-700 group-hover:bg-emerald-800 text-white rounded-md text-xs font-bold inline-flex items-center space-x-1 shadow-2xs transition"
                          >
                            <span>Fakturkan DO</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    });
                  })()
                ) : (
                  (() => {
                    const filteredPOs = salesOrders.filter((po) => {
                      if (!qLower) return true;
                      const no = (po.no_pesanan || '').toLowerCase();
                      const cust = (po.customer?.nama || '').toLowerCase();
                      const tgl = (po.tanggal || '').toLowerCase();
                      return no.includes(qLower) || cust.includes(qLower) || tgl.includes(qLower);
                    });

                    if (salesOrders.length === 0) {
                      return (
                        <div className="text-center py-12 text-slate-400 bg-white">
                          <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-800" />
                          <p className="text-xs font-bold text-slate-700">Belum Ada Pesanan Penjualan</p>
                        </div>
                      );
                    }
                    if (filteredPOs.length === 0) {
                      return (
                        <div className="text-center py-10 text-slate-400 bg-white">
                          <p className="text-xs font-bold text-slate-700">Tidak ada Pesanan yang cocok</p>
                        </div>
                      );
                    }
                    return filteredPOs.map((po) => {
                      const detailList = po.pesanan_penjualan_detail || [];
                      const itemCount = detailList.length;
                      const itemsSummary = detailList
                        .map((d) => `${d.produk?.nama || 'Barang'} (${d.qty || 1} Pcs)`)
                        .join(', ');

                      return (
                        <div
                          key={po.id}
                          onClick={() => {
                            flowPOtoSI(po);
                            setSiGetFromModalOpen(false);
                            setSiSearchQuery('');
                          }}
                          className="p-3 bg-white hover:bg-emerald-50/80 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <span className="font-mono font-black text-xs text-emerald-950 group-hover:text-emerald-700">
                                {po.no_pesanan}
                              </span>
                              <span className="text-[10px] px-2 py-0.2 bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold rounded">
                                {po.status || 'MENUNGGU_PENGIRIMAN'}
                              </span>
                              <span className="text-[11px] text-slate-400 font-medium">
                                • Tanggal: {po.tanggal}
                              </span>
                            </div>

                            <div className="mt-1 flex items-center space-x-2">
                              <span className="text-xs font-bold text-slate-900">
                                {po.customer?.nama || 'Pelanggan Umum'}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-500 truncate mt-0.5" title={itemsSummary}>
                              <span className="font-semibold text-slate-600">{itemCount} Barang:</span>{' '}
                              {itemsSummary || 'Tidak ada rincian barang'}
                            </p>
                          </div>

                          <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 flex-shrink-0">
                            <div className="text-left sm:text-right">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                                Total Nilai
                              </span>
                              <span className="font-mono font-black text-sm text-slate-900">
                                Rp {Number(po.total || 0).toLocaleString('id-ID')}
                              </span>
                            </div>

                            <button
                              type="button"
                              className="mt-1.5 px-3 py-1 bg-emerald-700 group-hover:bg-emerald-800 text-white rounded-md text-xs font-bold inline-flex items-center space-x-1 shadow-2xs transition"
                            >
                              <span>Fakturkan Langsung</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()
                )}
              </div>

              {/* Footer */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  💡 Tip: Jika menagih Surat Jalan (DO), stok fisik tidak dipotong ulang karena telah terpotong saat pengiriman.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSiGetFromModalOpen(false);
                    setSiSearchQuery('');
                  }}
                  className="px-4 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-100 transition ml-auto"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Quick Add Modals */}
      <QuickAddCustomerModal
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        onCustomerCreated={(newCust) => {
          setContacts((prev) => [...prev, newCust]);
          setSoForm((prev) => ({ ...prev, customerId: newCust.id }));
          setQuoteForm((prev) => ({ ...prev, customerId: newCust.id }));
          showToast(`Pelanggan baru "${newCust.nama}" berhasil ditambahkan!`, 'success', 'Pelanggan Terdaftar');
        }}
      />

      <QuickAddProductModal
        isOpen={isNewProductModalOpen}
        categories={categories}
        satuanList={satuanList}
        existingProducts={products}
        onClose={() => setIsNewProductModalOpen(false)}
        onCategoryCreated={(newCat) => {
          setCategories((prev) => [...prev, newCat].sort((a, b) => a.nama.localeCompare(b.nama)));
        }}
        onSatuanCreated={(newSat) => {
          setSatuanList((prev) => [...prev, newSat]);
        }}
        onProductCreated={(newProd) => {
          setProducts((prev) => [...prev, newProd]);
          showToast(`Master kemasan "${newProd.nama}" (${newProd.kode_sku}) berhasil ditambahkan!`, 'success', 'Produk Ditambahkan');
        }}
      />

      <QuickAddSupplierModal
        isOpen={isNewSupplierModalOpen}
        onClose={() => setIsNewSupplierModalOpen(false)}
        onSupplierCreated={(newSup) => {
          setContacts((prev) => [...prev, newSup]);
          showToast(`Pemasok "${newSup.nama}" berhasil didaftarkan!`, 'success', 'Pemasok Ditambahkan');
        }}
      />

            {/* ============================================================ */}
      {/* MODAL KONFIRMASI HAPUS DOKUMEN SUPABASE (PO, SQ, DO, SI)      */}
      {/* ============================================================ */}
      {deleteConfirmDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 space-y-3.5 text-center border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                Hapus {deleteConfirmDoc.type === 'PO' ? 'Pesanan Penjualan' : deleteConfirmDoc.type === 'DP' ? 'Uang Muka Penjualan' : deleteConfirmDoc.type === 'SQ' ? 'Proforma Invoice' : deleteConfirmDoc.type === 'DO' ? 'Surat Jalan' : deleteConfirmDoc.type === 'CR' ? 'Penerimaan Pembayaran' : 'Invoice'}?
              </h3>
              <p className="text-xs font-mono font-bold text-rose-800 mt-1 bg-rose-50 py-0.5 rounded border border-rose-200">
                {deleteConfirmDoc.noDoc}
              </p>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Dokumen ini beserta seluruh rincian barangnya akan dihapus permanen dari database Supabase. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmDoc(null)}
                className="flex-1 py-2 border border-slate-300 hover:bg-slate-50 rounded-lg font-bold text-xs text-slate-700 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirmDoc.type === 'PO') handleDeletePO(deleteConfirmDoc.id, deleteConfirmDoc.noDoc);
                  else if (deleteConfirmDoc.type === 'DP') handleDeleteDP(deleteConfirmDoc.id, deleteConfirmDoc.noDoc, deleteConfirmDoc.pesananId, deleteConfirmDoc.amount, deleteConfirmDoc.fakturId);
                  else if (deleteConfirmDoc.type === 'SQ') handleDeleteQuote(deleteConfirmDoc.id, deleteConfirmDoc.noDoc);
                  else if (deleteConfirmDoc.type === 'DO') handleDeleteDO(deleteConfirmDoc.id, deleteConfirmDoc.noDoc);
                  else if (deleteConfirmDoc.type === 'SI') handleDeleteSI(deleteConfirmDoc.id, deleteConfirmDoc.noDoc);
                  else if (deleteConfirmDoc.type === 'CR') handleDeletePayment(deleteConfirmDoc.id, deleteConfirmDoc.noDoc, deleteConfirmDoc.fakturId, deleteConfirmDoc.amount);
                }}
                disabled={loading}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs transition shadow-xs flex items-center justify-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accurate Online: Modal Catat Transaksi Kas & Jurnal Manual */}
      <ManualTransactionModal
        isOpen={isManualTxModalOpen}
        onClose={() => setIsManualTxModalOpen(false)}
        accounts={accounts}
        accountBalances={accountBalances}
        initialMode={manualTxModalMode}
        initialAccountId={manualTxInitialAccountId}
        onTransactionSaved={async (tx) => {
          showToast(
            `Transaksi ${tx.type === 'KAS_MASUK' ? 'Kas Masuk' : tx.type === 'KAS_KELUAR' ? 'Kas Keluar (Potong Saldo)' : tx.type === 'TRANSFER' ? 'Transfer Kas' : 'Jurnal Umum'} (${tx.docNo}) senilai Rp ${Number(tx.amount || 0).toLocaleString('id-ID')} berhasil dicatat di Buku Besar!`,
            'success',
            'Buku Besar Terupdate'
          );
          await loadData();
          if (tx.printVoucher) {
            setCurrentCashVoucher(tx);
            setIsCashVoucherOpen(true);
          }
        }}
      />

      {/* Pengaturan Akun Perkiraan (COA): Edit / Tambah Akun Baru */}
      <AccountFormModal
        isOpen={isAccountModalOpen}
        onClose={() => {
          setIsAccountModalOpen(false);
          setEditingAccount(null);
        }}
        account={editingAccount}
        onSaved={async (savedAcc) => {
          showToast(
            `Akun ${savedAcc.kode_akun} - ${savedAcc.nama_akun} berhasil ${editingAccount ? 'diperbarui' : 'ditambahkan'}!`,
            'success',
            'Buku Besar Terupdate'
          );
          await loadData();
        }}
        onDeleted={async (deletedAcc) => {
          showToast(
            `Akun ${deletedAcc.kode_akun} - ${deletedAcc.nama_akun} berhasil dihapus dari Buku Besar!`,
            'success',
            'Akun Dihapus'
          );
          await loadData();
        }}
      />

      {/* Cetak Bukti Transaksi Kas / Slip Gaji PDF */}
      <CashVoucherPrintModal
        isOpen={isCashVoucherOpen}
        onClose={() => {
          setIsCashVoucherOpen(false);
          setCurrentCashVoucher(null);
        }}
        voucherData={currentCashVoucher}
        companySettings={companySettings}
      />

      {/* Manajemen Pengguna & Reset Password Staf Modal */}
      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        currentUser={currentUser}
        onUserUpdated={(updatedUser) => setCurrentUser(updatedUser)}
      />

      {/* Lightbox Preview Modal for Bukti Transaksi */}
      <ImageLightboxModal
        isOpen={!!lightboxImage}
        imageUrl={lightboxImage?.url}
        title={lightboxImage?.title || 'Bukti Transaksi'}
        onClose={() => setLightboxImage(null)}
      />

      {/* Enterprise Toast Notification Banner (Floating Top Right) */}
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}