'use client';

import React, { useState, useEffect } from 'react';
import { Printer, X, Sliders, Check, Settings2, Save, FileText, ShoppingBag, Truck, Receipt, Coins, PenTool, Sparkles } from 'lucide-react';
import DigitalSignaturePad from './DigitalSignaturePad';

/**
 * Convert number to Indonesian words (Terbilang)
 */
function angkaKeTerbilang(nilai) {
  const bilangan = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];

  const n = Math.floor(Math.abs(Number(nilai) || 0));
  if (n === 0) return 'Nol Rupiah';

  function sebut(x) {
    if (x < 12) return ' ' + bilangan[x];
    if (x < 20) return sebut(x - 10) + ' Belas';
    if (x < 100) return sebut(Math.floor(x / 10)) + ' Puluh' + sebut(x % 10);
    if (x < 200) return ' Seratus' + sebut(x - 100);
    if (x < 1000) return sebut(Math.floor(x / 100)) + ' Ratus' + sebut(x % 100);
    if (x < 2000) return ' Seribu' + sebut(x - 1000);
    if (x < 1000000) return sebut(Math.floor(x / 1000)) + ' Ribu' + sebut(x % 1000);
    if (x < 1000000000) return sebut(Math.floor(x / 1000000)) + ' Juta' + sebut(x % 1000000);
    if (x < 1000000000000) return sebut(Math.floor(x / 1000000000)) + ' Miliar' + sebut(x % 1000000000);
    return ' ' + x;
  }

  return (sebut(n).trim() + ' Rupiah').replace(/\s+/g, ' ');
}

export const DEFAULT_PRINT_SETTINGS_PER_DOC = {
  SQ: {
    label: 'Proforma Invoice (PI)',
    badge: 'PROFORMA INVOICE',
    showLogo: true,
    showKopAlamat: true,
    showRekening: true,
    showCatatan: true,
    judulCatatan: 'Syarat & Ketentuan Penawaran',
    defaultCatatan: 'Harga berlaku sesuai kuantitas tercantum. Pembayaran dapat ditransfer ke rekening bank resmi perusahaan.',
    showTerbilang: true,
    showTandaTangan: true,
    showDigitalSignature: true,
    tandaTanganDigital: null,
    namaPenandatangan1: 'Fauzan Ghani',
    jabatanPenandatangan1: '', // Non-DO tidak menggunakan jabatan
    namaPenandatangan2: '',
    jabatanPenandatangan2: '',
    pesanFooter: 'Terima kasih atas minat dan kepercayaan Anda bermitra dengan FAG Kemasan.',
  },
  PO: {
    label: 'Pesanan Penjualan (PO)',
    badge: 'SALES ORDER',
    showLogo: true,
    showKopAlamat: true,
    showRekening: true,
    showCatatan: true,
    judulCatatan: 'Catatan & Instruksi Pesanan',
    defaultCatatan: 'Pesanan kemasan akan diproduksi dan disiapkan sesuai rincian spesifikasi di atas.',
    showTerbilang: true,
    showTandaTangan: true,
    showDigitalSignature: true,
    tandaTanganDigital: null,
    namaPenandatangan1: 'Fauzan Ghani',
    jabatanPenandatangan1: '', // Non-DO tidak menggunakan jabatan
    namaPenandatangan2: 'Pelanggan / Pemesan',
    jabatanPenandatangan2: '',
    pesanFooter: 'Pesanan Anda segera kami proses dengan standar mutu dan ketepatan waktu terbaik.',
  },
  DO: {
    label: 'Surat Jalan Pengiriman (DO)',
    badge: 'DELIVERY ORDER',
    showLogo: true,
    showKopAlamat: true,
    showRekening: false, // Surat Jalan TIDAK menampilkan rekening pembayaran
    showCatatan: true,
    judulCatatan: 'Keterangan Pengiriman & Kondisi Barang',
    defaultCatatan: 'Barang kemasan telah diperiksa dan diserahkan dalam keadaan lengkap & baik.',
    showTerbilang: false, // Surat Jalan TIDAK menampilkan terbilang nominal
    showTandaTangan: true,
    showDigitalSignature: true,
    tandaTanganDigital: null,
    namaPenandatangan1: 'Pengemudi / Sopir',
    jabatanPenandatangan1: 'Pengirim / Ekspedisi',
    namaPenandatangan2: 'Penerima Barang',
    jabatanPenandatangan2: 'Penerima / Pelanggan',
    pesanFooter: 'Surat jalan ini merupakan bukti serah terima resmi barang kemasan di lokasi tujuan.',
  },
  SI: {
    label: 'Faktur / Invoice (SI)',
    badge: 'INVOICE TAGIHAN',
    showLogo: true,
    showKopAlamat: true,
    showRekening: true, // Invoice butuh rekening bank pembayaran
    showCatatan: true,
    judulCatatan: 'Instruksi Pembayaran & Rekening Bank',
    defaultCatatan: 'Pembayaran mohon ditransfer sebelum jatuh tempo. Harap cantumkan nomor invoice saat transfer.',
    showTerbilang: true,
    showTandaTangan: true,
    showDigitalSignature: true,
    tandaTanganDigital: null,
    namaPenandatangan1: 'Fauzan Ghani',
    jabatanPenandatangan1: '', // Non-DO tidak menggunakan jabatan
    namaPenandatangan2: '',
    jabatanPenandatangan2: '',
    pesanFooter: 'Terima kasih atas pembayaran dan kemitraan berkelanjutan bersama FAG Kemasan.',
  },
  DP: {
    label: 'Uang Muka & Kuitansi (DP / CR)',
    badge: 'PENERIMAAN KAS',
    showLogo: true,
    showKopAlamat: true,
    showRekening: true,
    showCatatan: true,
    judulCatatan: 'Keterangan Penerimaan Pembayaran',
    defaultCatatan: 'Uang muka / pelunasan telah diterima sah ke rekening kas perusahaan.',
    showTerbilang: true,
    showTandaTangan: true,
    showDigitalSignature: true,
    tandaTanganDigital: null,
    namaPenandatangan1: 'Fauzan Ghani',
    jabatanPenandatangan1: 'Kasir / Finance FAG',
    namaPenandatangan2: 'Pelanggan / Penyetor',
    jabatanPenandatangan2: '',
    pesanFooter: 'Kuitansi ini merupakan bukti penerimaan pembayaran yang sah.',
  },
};

export default function DocumentPrintModal({
  isOpen,
  onClose,
  doc, // { type: 'PO'|'SQ'|'DO'|'SI'|'DP'|'CR', noDoc, date, customer, items, total, subtotal, ppn, diskon, uangMuka, catatan, companySettings }
  onSavePrintSettings,
}) {
  if (!isOpen || !doc) return null;

  const docCategory = doc.type === 'CR' ? 'DP' : (doc.type || 'PO');

  const company = doc.companySettings || {
    namaPerusahaan: 'PT Eternal Packaging Indonesia',
    merkDagang: 'FAG Kemasan',
    alamat: 'Jl. Raya Industri Kemasan No. 88, Kawasan Pergudangan, Yogyakarta / Jakarta',
    telepon: '0812-3456-7890',
    email: 'sales@fagkemasan.com',
    npwp: '01.234.567.8-901.000',
    rekeningBCA: 'BCA 123-456-7890 a.n. PT Eternal Packaging Indonesia',
    rekeningMandiri: 'Mandiri 987-654-3210 a.n. PT Eternal Packaging Indonesia',
  };

  // State: Per-Document Print Settings (Sanitized: Non-DO documents drop internal job titles)
  const [allConfigs, setAllConfigs] = useState(() => {
    const saved = company.printSettingsPerDoc || {};
    const cleanConfig = (type, def) => {
      const userVal = saved[type] || {};
      const merged = { ...def, ...userVal };
      if (type !== 'DO') {
        // Hapus jabatan lama jika pernah tersimpan di localStorage
        if (merged.jabatanPenandatangan1 === 'Dibuat Oleh' || merged.jabatanPenandatangan1 === 'Diterima Oleh') {
          merged.jabatanPenandatangan1 = '';
        }
        if (merged.jabatanPenandatangan2 === 'Disetujui Oleh' || merged.jabatanPenandatangan2 === 'Disetujui Pemesan' || merged.jabatanPenandatangan2 === 'Penyetor / Pembayar') {
          merged.jabatanPenandatangan2 = '';
        }
        if (merged.namaPenandatangan2 === 'Kepala Operasional' || merged.namaPenandatangan2 === 'Pimpinan / Keuangan') {
          merged.namaPenandatangan2 = '';
        }
      }
      return merged;
    };

    return {
      SQ: cleanConfig('SQ', DEFAULT_PRINT_SETTINGS_PER_DOC.SQ),
      PO: cleanConfig('PO', DEFAULT_PRINT_SETTINGS_PER_DOC.PO),
      DO: cleanConfig('DO', DEFAULT_PRINT_SETTINGS_PER_DOC.DO),
      SI: cleanConfig('SI', DEFAULT_PRINT_SETTINGS_PER_DOC.SI),
      DP: cleanConfig('DP', DEFAULT_PRINT_SETTINGS_PER_DOC.DP),
    };
  });

  const [drawerDocType, setDrawerDocType] = useState(docCategory);
  const [showConfig, setShowConfig] = useState(false);
  const [configSubTab, setConfigSubTab] = useState('layout'); // 'layout' | 'signature'
  const [globalSignature, setGlobalSignature] = useState(company.tandaTanganDigital || null);
  const [globalSignatoryName, setGlobalSignatoryName] = useState(company.namaPenandatanganDefault || 'Fauzan Ghani');
  const [globalSignatoryTitle, setGlobalSignatoryTitle] = useState(company.jabatanPenandatanganDefault || '');

  // Active configuration for the document being previewed
  const currentDocConfig = allConfigs[docCategory] || DEFAULT_PRINT_SETTINGS_PER_DOC[docCategory] || DEFAULT_PRINT_SETTINGS_PER_DOC.PO;
  // Config being edited in drawer
  const editingConfig = allConfigs[drawerDocType] || DEFAULT_PRINT_SETTINGS_PER_DOC[drawerDocType] || DEFAULT_PRINT_SETTINGS_PER_DOC.PO;

  const effectiveSignature = (currentDocConfig.showDigitalSignature !== false)
    ? (currentDocConfig.tandaTanganDigital || globalSignature || company.tandaTanganDigital)
    : null;

  const updateEditingConfig = (updates) => {
    setAllConfigs((prev) => ({
      ...prev,
      [drawerDocType]: {
        ...prev[drawerDocType],
        ...updates,
      },
    }));
  };

  const handleSaveSignature = (sigDataUrl) => {
    setGlobalSignature(sigDataUrl);
    const updated = {
      ...allConfigs,
      [drawerDocType]: {
        ...editingConfig,
        tandaTanganDigital: sigDataUrl,
        showDigitalSignature: true,
      },
    };
    setAllConfigs(updated);
    if (onSavePrintSettings) {
      onSavePrintSettings(updated, {
        tandaTanganDigital: sigDataUrl,
        namaPenandatanganDefault: globalSignatoryName,
        jabatanPenandatanganDefault: globalSignatoryTitle,
      });
    }
  };

  const handleRemoveSignature = () => {
    setGlobalSignature(null);
    const updated = {
      ...allConfigs,
      [drawerDocType]: {
        ...editingConfig,
        tandaTanganDigital: null,
      },
    };
    setAllConfigs(updated);
    if (onSavePrintSettings) {
      onSavePrintSettings(updated, {
        tandaTanganDigital: null,
      });
    }
  };

  const getDocTitle = () => {
    switch (doc.type) {
      case 'SQ':
        return 'PROFORMA INVOICE';
      case 'PO':
        return 'SURAT PESANAN PENJUALAN (SALES ORDER)';
      case 'DO':
        return 'SURAT JALAN PENGIRIMAN (DELIVERY ORDER)';
      case 'SI':
        return 'INVOICE';
      case 'DP':
        return 'BUKTI PENERIMAAN UANG MUKA (SALES DOWN PAYMENT)';
      case 'CR':
        return 'BUKTI PENERIMAAN KAS / OFFICIAL RECEIPT';
      default:
        return doc.title || 'DOKUMEN PENJUALAN';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const items = doc.items || [];
  
  // Financial calculation
  const rawSubtotal = doc.subtotal !== undefined
    ? Number(doc.subtotal)
    : items.reduce((acc, i) => acc + (Number(i.subtotal ?? i.total) || (Number(i.qty || 1) * Number(i.harga_jual || i.harga || 0))), 0);
  
  const discAmount = Number(doc.diskon || doc.discountAmount || 0);
  const ppnAmount = Number(doc.ppn || doc.ppn_nominal || (doc.ppnActive ? Math.round(Math.max(0, rawSubtotal - discAmount) * 0.11) : 0));
  const grandTotal = doc.total !== undefined ? Number(doc.total) : Math.max(0, rawSubtotal - discAmount + ppnAmount);
  const uangMuka = Number(doc.uangMuka || 0);
  const sisaTagihan = Math.max(0, grandTotal - uangMuka);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top Floating Control Bar (Hidden when printed) */}
        <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between print:hidden shadow-md flex-wrap gap-2">
          <div className="flex items-center space-x-2 text-xs font-semibold">
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Pratinjau Cetak / Ekspor PDF ({doc.noDoc})</span>
            <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700 rounded text-[10px] font-mono">
              {currentDocConfig.badge}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Quick button: Atur Tanda Tangan Digital Resmi */}
            <button
              type="button"
              onClick={() => {
                setDrawerDocType(docCategory);
                setConfigSubTab('signature');
                setShowConfig(true);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 border bg-[#07291D] hover:bg-[#0A3828] text-emerald-300 border-emerald-600/50 shadow-xs active:scale-95"
              title="Atur Tanda Tangan Digital Resmi (Bebas Bolpoint)"
            >
              <PenTool className="w-3.5 h-3.5 text-emerald-400" />
              <span>✍️ Tanda Tangan Digital</span>
            </button>

            {/* Tombol Atur Tampilan Cetak (User Request) */}
            <button
              type="button"
              onClick={() => {
                setDrawerDocType(docCategory);
                if (showConfig && configSubTab === 'layout') {
                  setShowConfig(false);
                } else {
                  setConfigSubTab('layout');
                  setShowConfig(true);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 border ${
                showConfig && configSubTab === 'layout'
                  ? 'bg-emerald-600 text-white border-emerald-400'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>Atur Tampilan Cetak</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-[#0A3828] hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Sekarang (Print / PDF)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Tutup Pratinjau"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Pengaturan Tampilan Cetak PDF per Sub-Penjualan & Tanda Tangan Digital */}
        {showConfig && (
          <div className="px-5 py-4 bg-slate-800 text-white border-b border-slate-700 text-xs animate-in slide-in-from-top duration-150 print:hidden space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-700">
              <div className="flex items-center space-x-2">
                <Settings2 className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-slate-100 uppercase tracking-wide">
                  Konfigurasi Cetak PDF &amp; Tanda Tangan Digital
                </h4>
              </div>

              {/* Sub-Tab Selector: Layout vs TTD Digital */}
              <div className="flex items-center space-x-1.5 bg-slate-900 p-1 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={() => setConfigSubTab('layout')}
                  className={`px-3 py-1 rounded text-xs font-bold transition flex items-center space-x-1.5 ${
                    configSubTab === 'layout'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sliders className="w-3 h-3" />
                  <span>Tata Letak Dokumen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfigSubTab('signature')}
                  className={`px-3 py-1 rounded text-xs font-bold transition flex items-center space-x-1.5 ${
                    configSubTab === 'signature'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <PenTool className="w-3 h-3 text-emerald-400" />
                  <span>✍️ Tanda Tangan Digital</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onSavePrintSettings) {
                    onSavePrintSettings(allConfigs, {
                      tandaTanganDigital: globalSignature,
                      namaPenandatanganDefault: globalSignatoryName,
                      jabatanPenandatanganDefault: globalSignatoryTitle,
                    });
                  }
                  setShowConfig(false);
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs flex items-center space-x-1.5 shadow-xs self-start sm:self-auto"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Pengaturan</span>
              </button>
            </div>

            {configSubTab === 'signature' ? (
              /* TAB 2: SIGNATURE PAD & UPLOAD */
              <div className="pt-1">
                <DigitalSignaturePad
                  currentSignature={globalSignature}
                  onSave={handleSaveSignature}
                  onRemove={handleRemoveSignature}
                  signatoryName={globalSignatoryName}
                  onChangeSignatoryName={(name) => {
                    setGlobalSignatoryName(name);
                    updateEditingConfig({ namaPenandatangan1: name });
                  }}
                  signatoryTitle={globalSignatoryTitle}
                  onChangeSignatoryTitle={(title) => {
                    setGlobalSignatoryTitle(title);
                    updateEditingConfig({ jabatanPenandatangan1: title });
                  }}
                />
              </div>
            ) : (
              /* TAB 1: DOKUMEN LAYOUT & TOGGLES */
              <div className="space-y-3.5">
                {/* Sub-Penjualan Document Selector Tabs */}
                <div className="flex flex-wrap gap-1.5 p-1 bg-slate-900 rounded-lg border border-slate-700">
                  {[
                    { id: 'SQ', label: 'Proforma Invoice (PI)', icon: FileText },
                    { id: 'PO', label: 'Pesanan Penjualan (PO)', icon: ShoppingBag },
                    { id: 'DO', label: 'Surat Jalan (DO)', icon: Truck },
                    { id: 'SI', label: 'Faktur / Invoice (SI)', icon: Receipt },
                    { id: 'DP', label: 'Uang Muka & Kas (DP/CR)', icon: Coins },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isSelected = drawerDocType === tab.id;
                    const isCurrentViewing = docCategory === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setDrawerDocType(tab.id)}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                        {isCurrentViewing && (
                          <span className="ml-1 px-1 py-0.2 bg-emerald-900 text-emerald-200 border border-emerald-500 rounded text-[9px]">
                            Sedang Dibuka
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Checkboxes: Toggle Elemen Cetak */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
                  <label className="flex items-center space-x-2 bg-slate-900/70 p-2 rounded border border-slate-700 cursor-pointer hover:bg-slate-900">
                    <input
                      type="checkbox"
                      checked={editingConfig.showLogo}
                      onChange={(e) => updateEditingConfig({ showLogo: e.target.checked })}
                      className="rounded text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-slate-200">Logo Kop</span>
                  </label>

                  <label className="flex items-center space-x-2 bg-slate-900/70 p-2 rounded border border-slate-700 cursor-pointer hover:bg-slate-900">
                    <input
                      type="checkbox"
                      checked={editingConfig.showKopAlamat}
                      onChange={(e) => updateEditingConfig({ showKopAlamat: e.target.checked })}
                      className="rounded text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-slate-200">Alamat Kop</span>
                  </label>

                  <label className="flex items-center space-x-2 bg-slate-900/70 p-2 rounded border border-slate-700 cursor-pointer hover:bg-slate-900">
                    <input
                      type="checkbox"
                      checked={editingConfig.showRekening}
                      onChange={(e) => updateEditingConfig({ showRekening: e.target.checked })}
                      className="rounded text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-slate-200">Rekening Bank</span>
                  </label>

                  <label className="flex items-center space-x-2 bg-slate-900/70 p-2 rounded border border-slate-700 cursor-pointer hover:bg-slate-900">
                    <input
                      type="checkbox"
                      checked={editingConfig.showCatatan}
                      onChange={(e) => updateEditingConfig({ showCatatan: e.target.checked })}
                      className="rounded text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-slate-200">Kotak Catatan</span>
                  </label>

                  <label className="flex items-center space-x-2 bg-slate-900/70 p-2 rounded border border-slate-700 cursor-pointer hover:bg-slate-900">
                    <input
                      type="checkbox"
                      checked={editingConfig.showTerbilang}
                      onChange={(e) => updateEditingConfig({ showTerbilang: e.target.checked })}
                      className="rounded text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-slate-200">Ejaan Terbilang</span>
                  </label>

                  <label className="flex items-center space-x-2 bg-slate-900/70 p-2 rounded border border-slate-700 cursor-pointer hover:bg-slate-900">
                    <input
                      type="checkbox"
                      checked={editingConfig.showTandaTangan}
                      onChange={(e) => updateEditingConfig({ showTandaTangan: e.target.checked })}
                      className="rounded text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-slate-200">Kolom TTD</span>
                  </label>

                  <label className="flex items-center space-x-2 bg-slate-900/70 p-2 rounded border border-emerald-600/60 cursor-pointer hover:bg-slate-900">
                    <input
                      type="checkbox"
                      checked={editingConfig.showDigitalSignature !== false}
                      onChange={(e) => updateEditingConfig({ showDigitalSignature: e.target.checked })}
                      className="rounded text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="font-bold text-emerald-300">TTD Otomatis</span>
                  </label>
                </div>

                {/* Custom Notes Title & Default Text per Document Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-700/60">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Judul Kotak Catatan ({editingConfig.label}):
                    </label>
                    <input
                      type="text"
                      value={editingConfig.judulCatatan || ''}
                      onChange={(e) => updateEditingConfig({ judulCatatan: e.target.value })}
                      placeholder="Contoh: Syarat & Ketentuan Penawaran / Keterangan Pengiriman"
                      className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Catatan Standar Bawaan (Jika Form Kosong):
                    </label>
                    <input
                      type="text"
                      value={editingConfig.defaultCatatan || ''}
                      onChange={(e) => updateEditingConfig({ defaultCatatan: e.target.value })}
                      placeholder="Teks keterangan default..."
                      className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                    />
                  </div>
                </div>

                {/* Signature Customization - USER REQUEST: Jabatan dihilangkan untuk non-DO, hanya aktif di Pengiriman (DO) */}
                {drawerDocType === 'DO' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Penandatangan 1 (Nama):</label>
                        <input
                          type="text"
                          value={editingConfig.namaPenandatangan1 || ''}
                          onChange={(e) => updateEditingConfig({ namaPenandatangan1: e.target.value })}
                          placeholder="Pengemudi / Sopir"
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Jabatan 1:</label>
                        <input
                          type="text"
                          value={editingConfig.jabatanPenandatangan1 || ''}
                          onChange={(e) => updateEditingConfig({ jabatanPenandatangan1: e.target.value })}
                          placeholder="Pengirim / Ekspedisi"
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Penandatangan 2 (Nama):</label>
                        <input
                          type="text"
                          value={editingConfig.namaPenandatangan2 || ''}
                          onChange={(e) => updateEditingConfig({ namaPenandatangan2: e.target.value })}
                          placeholder="Penerima Barang"
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Jabatan 2:</label>
                        <input
                          type="text"
                          value={editingConfig.jabatanPenandatangan2 || ''}
                          onChange={(e) => updateEditingConfig({ jabatanPenandatangan2: e.target.value })}
                          placeholder="Penerima / Pelanggan"
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">
                        Nama Penandatangan (Hormat Kami):
                      </label>
                      <input
                        type="text"
                        value={editingConfig.namaPenandatangan1 || globalSignatoryName || ''}
                        onChange={(e) => {
                          updateEditingConfig({ namaPenandatangan1: e.target.value });
                          setGlobalSignatoryName(e.target.value);
                        }}
                        placeholder="Contoh: Fauzan Ghani"
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                      />
                      <span className="text-[9px] text-emerald-400 mt-0.5 block">
                        ✓ Format resmi bersih bebas bolpoint (Otomatis tercetak tanda tangan digital).
                      </span>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">
                        Nama Pihak Kedua / Pelanggan (Opsional):
                      </label>
                      <input
                        type="text"
                        value={editingConfig.namaPenandatangan2 || ''}
                        onChange={(e) => updateEditingConfig({ namaPenandatangan2: e.target.value })}
                        placeholder="Contoh: Pelanggan (kosongkan jika 1 tanda tangan)"
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Document Footer Message */}
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Pesan Footer Dokumen Cetak:</label>
                  <input
                    type="text"
                    value={editingConfig.pesanFooter || ''}
                    onChange={(e) => updateEditingConfig({ pesanFooter: e.target.value })}
                    className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Printable Document Sheet (id="print-area") */}
        <div className="p-6 sm:p-10 overflow-y-auto bg-slate-100/70 flex justify-center">
          <div
            id="print-area"
            className="bg-white w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-10 shadow-sm border border-slate-200 text-slate-800 text-xs font-sans leading-relaxed flex flex-col justify-between"
          >
            <div>
              {/* Official Corporate Letterhead */}
              <div className="flex justify-between items-start pb-4 border-b-2 border-emerald-900 mb-5">
                <div className="flex items-center space-x-3.5">
                  {currentDocConfig.showLogo && (
                    <img
                      src="/logo-fag.png"
                      alt="Logo FAG Kemasan"
                      className="w-14 h-14 object-contain rounded-full border border-emerald-900/20 flex-shrink-0"
                    />
                  )}
                  <div>
                    <h1 className="text-base sm:text-lg font-black text-emerald-950 tracking-tight uppercase">
                      {company.namaPerusahaan}
                    </h1>
                    {company.merkDagang && company.merkDagang.trim().toLowerCase() !== company.namaPerusahaan?.trim().toLowerCase() && (
                      <p className="text-[11px] font-bold text-emerald-800">
                        Brand / Divisi: {company.merkDagang}
                      </p>
                    )}
                    {currentDocConfig.showKopAlamat && (
                      <>
                        <p className="text-[10px] text-slate-500 max-w-sm mt-0.5">
                          {company.alamat}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          WhatsApp/Telp: <strong>{company.telepon}</strong> | Email: {company.email}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-900 border border-emerald-300 font-extrabold text-[11px] rounded tracking-wide uppercase mb-1">
                    {getDocTitle()}
                  </span>
                  <p className="font-mono font-extrabold text-sm text-slate-900">{doc.noDoc}</p>
                  <p className="text-[10px] text-slate-500">
                    Tanggal: <strong className="font-mono text-slate-800">{doc.date}</strong>
                  </p>
                  {doc.type === 'SI' && (
                    <p className="text-[10px] text-rose-700 font-semibold">
                      Jatuh Tempo: <strong className="font-mono">{doc.dueDate || 'Net 30'}</strong>
                    </p>
                  )}
                  {/* Uang Muka Status di PO */}
                  {doc.type === 'PO' && uangMuka > 0 && (
                    <div className="mt-1">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                        uangMuka >= grandTotal
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}>
                        {uangMuka >= grandTotal
                          ? '✓ LUNAS (DP FULL)'
                          : `● SEBAGIAN DP (Rp ${uangMuka.toLocaleString('id-ID')})`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer & Document Information Block */}
              <div className="grid grid-cols-2 gap-6 p-3.5 bg-slate-50 border border-slate-200 rounded-lg mb-5 text-[11px]">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Kepada Yth. (Pelanggan):
                  </span>
                  <p className="font-extrabold text-xs text-slate-900">
                    {doc.customer?.nama || 'Pelanggan Umum (Walk-In)'}
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    {doc.customer?.alamat || 'Alamat tidak dicantumkan'}
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    WhatsApp/Telepon: <strong className="font-mono">{doc.customer?.telepon || '-'}</strong>
                  </p>
                </div>

                {/* USER REQUEST: Catatan & Keterangan dipisah secara benar dan spesifik per sub-penjualan! */}
                {currentDocConfig.showCatatan && (
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {currentDocConfig.judulCatatan || (doc.type === 'DO' ? 'Keterangan Pengiriman & Kondisi Barang:' : 'Catatan Dokumen:')}:
                    </span>
                    <div className="text-slate-700 leading-relaxed">
                      {doc.type === 'DO' && (
                        <div className="mb-1.5 text-[10px] text-slate-700 bg-emerald-50/70 p-2 rounded border border-emerald-200">
                          <div className="flex justify-between">
                            <span>Armada / Ekspedisi: <strong className="text-emerald-950">{doc.ekspedisi || 'Armada Toko / Driver FAG'}</strong></span>
                            <span>No. Resi / Kendaraan: <strong className="text-emerald-950 font-mono">{doc.noResi || '-'}</strong></span>
                          </div>
                        </div>
                      )}
                      <p className="whitespace-pre-line">
                        {doc.catatan && doc.catatan.trim() !== ''
                          ? doc.catatan
                          : (currentDocConfig.defaultCatatan || '-')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* JIKA DOKUMEN ADALAH BUKTI PENERIMAAN UANG MUKA (DP) */}
              {doc.type === 'DP' ? (
                <div className="border border-slate-300 rounded-lg overflow-hidden mb-4 p-5 bg-amber-50/40 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">Telah Diterima Dari:</span>
                      <p className="font-extrabold text-sm text-slate-900 mt-0.5">{doc.customer?.nama || 'Pelanggan Umum'}</p>
                      <p className="text-slate-600">{doc.customer?.telepon || '-'}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">Untuk Pembayaran (Referensi):</span>
                      <p className="font-extrabold text-xs text-emerald-950 mt-0.5">Uang Muka Pesanan No. {doc.poNo || '-'}</p>
                      {doc.totalPO && (
                        <p className="text-slate-500 text-[11px]">Total Nilai Pesanan: <strong>Rp {Number(doc.totalPO).toLocaleString('id-ID')}</strong></p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-lg border border-amber-300 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Nominal Uang Muka Diterima:</span>
                      <span className="font-mono text-xl font-black text-amber-950">Rp {Number(doc.total || 0).toLocaleString('id-ID')}</span>
                      <p className="font-serif italic text-slate-600 text-[11px] mt-0.5"># {angkaKeTerbilang(doc.total || 0)} #</p>
                    </div>
                    <div className="text-right text-[11px] text-slate-600">
                      <span>Disetor ke Rekening Kas:</span>
                      <p className="font-bold text-emerald-900">{doc.akunKas || 'Kas Utama FAG Kemasan'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Item Table for PO, SQ, DO, SI, CR */
                <div className="border border-slate-300 rounded-lg overflow-hidden mb-4">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                      <tr>
                        <th className="py-2 px-2.5 w-8 text-center border-r border-slate-200">No.</th>
                        <th className="py-2 px-2.5 w-24 border-r border-slate-200">Kode SKU</th>
                        <th className="py-2 px-2.5 border-r border-slate-200">Deskripsi Barang Kemasan</th>
                        <th className="py-2 px-2.5 w-16 text-center border-r border-slate-200">Kuantitas</th>
                        <th className="py-2 px-2.5 w-16 text-center border-r border-slate-200">Satuan</th>
                        {doc.type !== 'DO' && (
                          <th className="py-2 px-2.5 w-24 text-right border-r border-slate-200">Harga Satuan</th>
                        )}
                        {doc.type !== 'DO' && (
                          <th className="py-2 px-2.5 w-16 text-center border-r border-slate-200">Diskon</th>
                        )}
                        {doc.type !== 'DO' && (
                          <th className="py-2 px-2.5 w-28 text-right">Jumlah Total</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={doc.type === 'DO' ? 5 : 8} className="py-6 text-center text-slate-400">
                            Tidak ada rincian barang.
                          </td>
                        </tr>
                      ) : (
                        items.map((it, idx) => {
                          const sub = (it.qty || 1) * (it.harga_jual || it.harga || 0);
                          const discVal = it.diskonRp
                            ? Number(it.diskonRp)
                            : (sub * (Number(it.diskonPersen) || 0)) / 100;
                          const rowTotal = it.total !== undefined ? it.total : Math.max(0, sub - discVal);

                          return (
                            <tr key={idx}>
                              <td className="py-2 px-2.5 text-center text-slate-500 font-mono border-r border-slate-100">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-2.5 font-mono font-bold text-emerald-950 border-r border-slate-100">
                                {it.kode_sku || it.produk?.kode_sku || '-'}
                              </td>
                              <td className="py-2 px-2.5 border-r border-slate-100">
                                <span className="font-bold text-slate-900">{it.nama || it.produk?.nama}</span>
                                {it.catatan && (
                                  <p className="text-[10px] text-slate-500 italic mt-0.5">Catatan: {it.catatan}</p>
                                )}
                              </td>
                              <td className="py-2 px-2.5 text-center font-bold font-mono border-r border-slate-100">
                                {Number(it.qty || 0).toLocaleString('id-ID')}
                              </td>
                              <td className="py-2 px-2.5 text-center text-slate-600 border-r border-slate-100">
                                {it.satuan || it.produk?.satuan || 'Pcs'}
                              </td>
                              {doc.type !== 'DO' && (
                                <td className="py-2 px-2.5 text-right font-mono border-r border-slate-100">
                                  Rp {Number(it.harga_jual || it.harga || 0).toLocaleString('id-ID')}
                                </td>
                              )}
                              {doc.type !== 'DO' && (
                                <td className="py-2 px-2.5 text-center border-r border-slate-100">
                                  {it.diskonRp > 0
                                    ? `Rp ${Number(it.diskonRp).toLocaleString('id-ID')}`
                                    : it.diskonPersen > 0
                                    ? `${it.diskonPersen}%`
                                    : '-'}
                                </td>
                              )}
                              {doc.type !== 'DO' && (
                                <td className="py-2 px-2.5 text-right font-bold font-mono text-slate-900">
                                  Rp {Number(rowTotal).toLocaleString('id-ID')}
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Financial Calculation Summary (Non-DO) */}
              {doc.type !== 'DO' && (
                <div className="flex justify-between items-start pt-2 mb-6">
                  {/* Terbilang & Rekening Box */}
                  <div className="w-1/2 pr-6 space-y-2">
                    {currentDocConfig.showTerbilang && (
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px]">
                        <span className="font-bold text-slate-500 uppercase block mb-0.5">
                          Terbilang:
                        </span>
                        <p className="font-serif italic font-bold text-emerald-950">
                          # {angkaKeTerbilang(uangMuka > 0 ? sisaTagihan : grandTotal)} #
                          {uangMuka > 0 && sisaTagihan > 0 && (
                            <span className="text-[9px] text-amber-800 font-sans font-bold block mt-0.5">
                              (Sisa Pelunasan Yang Harus Dibayar)
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {currentDocConfig.showRekening && (
                      <div className="p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-lg text-[10px]">
                        <span className="font-bold text-emerald-900 uppercase block mb-1">
                          Informasi Pembayaran Bank:
                        </span>
                        {company.bankAccounts && company.bankAccounts.length > 0 ? (
                          company.bankAccounts.map((b, idx) => (
                            <p key={b.id || idx} className="font-mono text-slate-800 font-semibold leading-relaxed">
                              • <strong className="text-emerald-950">{b.bankName}</strong> {b.accountNumber} <span className="text-slate-600">a.n. {b.accountHolder}</span> {b.branch ? `(${b.branch})` : ''}
                            </p>
                          ))
                        ) : (
                          <>
                            {company.rekeningBCA && <p className="font-mono text-slate-800 font-semibold">• {company.rekeningBCA}</p>}
                            {company.rekeningMandiri && <p className="font-mono text-slate-800 font-semibold">• {company.rekeningMandiri}</p>}
                            {!company.rekeningBCA && !company.rekeningMandiri && (
                              <p className="text-slate-400 italic">Belum ada rekening pembayaran yang diatur.</p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Calculations: Subtotal, Diskon (jika ada), PPN (jika ada), Total, Uang Muka (jika ada) */}
                  <div className="w-5/12 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-mono font-bold text-slate-800">
                        Rp {rawSubtotal.toLocaleString('id-ID')}
                      </span>
                    </div>

                    {/* Diskon HANYA MUNCUL JIKA ADA DISKON */}
                    {discAmount > 0 && (
                      <div className="flex justify-between text-amber-900 font-semibold">
                        <span>Potongan Diskon:</span>
                        <span className="font-mono text-amber-950">
                          - Rp {discAmount.toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}

                    {/* PPN HANYA MUNCUL JIKA ADA PPN */}
                    {ppnAmount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>PPN (11%):</span>
                        <span className="font-mono text-slate-800">
                          Rp {ppnAmount.toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm font-black pt-2 border-t-2 border-slate-800 text-slate-900">
                      <span>{uangMuka > 0 ? (doc.type === 'PO' ? 'TOTAL PESANAN:' : 'TOTAL INVOICE:') : 'TOTAL AKHIR:'}</span>
                      <span className="font-mono text-emerald-950 text-base font-black">
                        Rp {grandTotal.toLocaleString('id-ID')}
                      </span>
                    </div>

                    {/* Uang Muka HANYA MUNCUL JIKA ADA UANG MUKA */}
                    {uangMuka > 0 && (
                      <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 bg-amber-50/70 p-2.5 rounded-lg border border-amber-200">
                        <div className="flex justify-between text-amber-900 font-bold text-xs">
                          <span>Uang Muka (DP Diterima):</span>
                          <span className="font-mono font-black text-amber-950">
                            - Rp {uangMuka.toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-black pt-1.5 border-t border-amber-200 text-emerald-950">
                          <span>SISA PEMBAYARAN:</span>
                          <span className="font-mono text-base font-black text-emerald-950">
                            Rp {sisaTagihan.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Official Signature Blocks - USER REQUEST: Bebas Bolpoint (Digital Signature Otomatis) & Stempel Bulat Dihilangkan */}
            {currentDocConfig.showTandaTangan && (
              <div className="pt-6 border-t border-slate-300">
                {doc.type === 'DO' ? (
                  /* 🚚 FORMAT RESMI SURAT JALAN PENGIRIMAN (DO): PENGIRIM & PENERIMA (BEBAS STEMPEL) */
                  <div className="grid grid-cols-2 gap-10 text-center text-[10px]">
                    <div>
                      <p className="font-bold text-slate-700 uppercase mb-2">
                        {currentDocConfig.jabatanPenandatangan1 || 'Pengirim / Ekspedisi'}
                      </p>
                      <div className="h-16 flex items-center justify-center my-1">
                        {effectiveSignature ? (
                          <img
                            src={effectiveSignature}
                            alt="Tanda Tangan Pengirim"
                            className="max-h-16 max-w-[140px] object-contain mx-auto"
                          />
                        ) : (
                          <div className="h-14"></div>
                        )}
                      </div>
                      <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block px-8">
                        ( {currentDocConfig.namaPenandatangan1 || globalSignatoryName || 'Pengemudi / Sopir'} )
                      </p>
                    </div>

                    <div>
                      <p className="font-bold text-slate-700 uppercase mb-2">
                        {currentDocConfig.jabatanPenandatangan2 || 'Penerima / Pelanggan'}
                      </p>
                      <div className="h-16 flex items-center justify-center my-1">
                        <div className="h-14"></div>
                      </div>
                      <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block px-8">
                        ( {currentDocConfig.namaPenandatangan2 || 'Penerima Barang'} )
                      </p>
                    </div>
                  </div>
                ) : (
                  /* 📄 FORMAT BERSIH KOMERSIAL (PI, PO, SI, DP, CR): BEBAS BOLPOINT, TANPA STEMPEL */
                  <div className={`grid ${currentDocConfig.namaPenandatangan2 ? 'grid-cols-2' : 'grid-cols-1 max-w-xs ml-auto'} gap-10 text-center text-[10px] items-end`}>
                    <div className="text-center">
                      <p className="font-bold text-slate-700 mb-2">Hormat Kami,</p>
                      <div className="h-16 flex items-center justify-center my-1">
                        {effectiveSignature ? (
                          <img
                            src={effectiveSignature}
                            alt="Tanda Tangan Digital Resmi"
                            className="max-h-16 max-w-[150px] object-contain mx-auto"
                          />
                        ) : (
                          <div className="h-14 flex items-center justify-center text-slate-300 text-[10px] italic print:hidden">
                            (Belum ada tanda tangan digital)
                          </div>
                        )}
                      </div>
                      <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block px-8">
                        ( {currentDocConfig.namaPenandatangan1 || globalSignatoryName || company.namaPenandatanganDefault || company.merkDagang || company.namaPerusahaan || 'Fauzan Ghani'} )
                      </p>
                      {currentDocConfig.jabatanPenandatangan1 && (
                        <p className="text-[9px] text-slate-500 mt-0.5">{currentDocConfig.jabatanPenandatangan1}</p>
                      )}
                    </div>

                    {currentDocConfig.namaPenandatangan2 && (
                      <div className="text-center">
                        <p className="font-bold text-slate-700 mb-2">
                          {doc.type === 'PO' ? 'Pemesan / Pelanggan,' : doc.type === 'DP' ? 'Penyetor / Pembayar,' : 'Tanda Terima Pelanggan,'}
                        </p>
                        <div className="h-16 flex items-center justify-center my-1">
                          <div className="h-14"></div>
                        </div>
                        <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block px-8">
                          ( {currentDocConfig.namaPenandatangan2 || doc.customer?.nama || 'Pelanggan'} )
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Footer Message */}
            <p className="text-[10px] text-slate-400 font-serif italic text-center pt-3 border-t border-slate-100 mt-4">
              {currentDocConfig.pesanFooter || 'Terima kasih atas kepercayaan Anda bermitra dengan FAG Kemasan.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
