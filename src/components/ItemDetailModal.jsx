'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Calculator,
  Package,
  Plus,
  Minus,
  Check,
  Percent,
  DollarSign,
  Tag,
  ArrowRight,
  Boxes,
  Delete,
  Trash2,
  History,
  ShieldCheck,
  UserCheck,
  Receipt,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

/**
 * ItemDetailModal: Accurate Online style Line Item Detail & Calculator Dialog
 * Allows cashier/admin to specify Qty, Unit, Unit Price, Line Discount,
 * and calculate bulk/tiered packaging prices effortlessly using a built-in calculator.
 * Includes complete Price History (Master, HPP, Customer's last price, and recent sales).
 */
export default function ItemDetailModal({
  isOpen,
  onClose,
  item,
  onSave,
  onDelete,
  formType = 'PO', // 'QUOTE' | 'PO' | 'DO' | 'SI'
  customerId = null,
  customerName = '',
  salesOrders = [],
  quotations = [],
  salesInvoices = [],
  satuanList = [],
  onAddSatuan = null,
}) {
  // Line Item States with Real-Time Thousand Separator (Titik .)
  const [qty, setQty] = useState(0);
  const [qtyInput, setQtyInput] = useState('0');
  const [satuan, setSatuan] = useState('Pcs');
  const [isAddingSatuan, setIsAddingSatuan] = useState(false);
  const [newSatuanName, setNewSatuanName] = useState('');
  const [hargaSatuan, setHargaSatuan] = useState(0);
  const [hargaInput, setHargaInput] = useState('0');
  const [diskonType, setDiskonType] = useState('persen'); // 'persen' | 'rp'
  const [diskonPersen, setDiskonPersen] = useState(0);
  const [diskonRp, setDiskonRp] = useState(0);
  const [diskonRpInput, setDiskonRpInput] = useState('0');
  const [catatan, setCatatan] = useState('');
  const [showHistoryDetail, setShowHistoryDetail] = useState(false);
  const [qtyError, setQtyError] = useState('');

  // Interactive Mini Calculator States
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcFormula, setCalcFormula] = useState('');
  const [calcPrevVal, setCalcPrevVal] = useState(null);
  const [calcOp, setCalcOp] = useState(null);
  const [calcWaitingForOperand, setCalcWaitingForOperand] = useState(false);
  const isSavingRef = useRef(false);

  // Initialize modal state when opened or item changed
  useEffect(() => {
    if (item && isOpen) {
      setQtyError('');
      setShowHistoryDetail(false);

      if (item.isNew) {
        // Initial new item addition: USER REQUEST -> Start with Qty = 0 and Harga = 0!
        setQty(0);
        setQtyInput('0');
        setSatuan(item.satuan || 'Pcs');
        setHargaSatuan(0);
        setHargaInput('0');
        setDiskonType('persen');
        setDiskonPersen(0);
        setDiskonRp(0);
        setDiskonRpInput('0');
        setCatatan('');
        setCalcDisplay('0');
      } else {
        // Existing line item editing: preserve row values
        const q = Number(item.qty || 0);
        setQty(q);
        setQtyInput(Number(q).toLocaleString('id-ID'));
        setSatuan(item.satuan || 'Pcs');

        const h = Number(item.harga_jual ?? item.harga ?? 0);
        setHargaSatuan(h);
        setHargaInput(Number(h).toLocaleString('id-ID'));

        if (item.diskonRp && item.diskonRp > 0) {
          setDiskonType('rp');
          setDiskonRp(item.diskonRp);
          setDiskonRpInput(Number(item.diskonRp).toLocaleString('id-ID'));
          setDiskonPersen(0);
        } else {
          setDiskonType('persen');
          setDiskonPersen(item.diskonPersen || 0);
          setDiskonRp(0);
          setDiskonRpInput('0');
        }

        setCatatan(item.catatan || '');
        setCalcDisplay(String(h || q || 0));
      }

      setCalcFormula('');
      setCalcPrevVal(null);
      setCalcOp(null);
    }
  }, [item, isOpen]);

  // Calculate Comprehensive Price History for this specific item & customer
  const priceHistory = useMemo(() => {
    if (!item?.id) return { lastCustomerPrice: null, lastGeneralPrice: null, recentTransactions: [] };

    let lastCustomerPrice = null;
    let lastCustomerDate = null;
    let lastGeneralPrice = null;
    let lastGeneralDate = null;
    const recentTransactions = [];

    const checkTx = (txList, typeLabel, getNo) => {
      for (const tx of txList || []) {
        const details =
          tx.pesanan_penjualan_detail ||
          tx.penawaran_penjualan_detail ||
          tx.faktur_penjualan_detail ||
          [];
        for (const d of details) {
          if (d.produk_id === item.id && Number(d.harga_jual || 0) > 0) {
            const price = Number(d.harga_jual);
            const date = tx.tanggal || tx.created_at || '';
            const docNo = getNo(tx);

            if (!lastGeneralPrice) {
              lastGeneralPrice = price;
              lastGeneralDate = date;
            }

            if (customerId && tx.customer_id === customerId && !lastCustomerPrice) {
              lastCustomerPrice = price;
              lastCustomerDate = date;
            }

            if (recentTransactions.length < 5) {
              recentTransactions.push({
                type: typeLabel,
                noDoc: docNo,
                date: typeof date === 'string' ? date.split('T')[0] : date,
                customer: tx.customer?.nama || (tx.customer_id === customerId ? 'Pelanggan Ini' : 'Pelanggan Lain'),
                isCurrentCustomer: tx.customer_id === customerId,
                qty: d.qty,
                price,
              });
            }
          }
        }
      }
    };

    checkTx(salesInvoices, 'Faktur (SI)', (t) => t.no_faktur);
    checkTx(salesOrders, 'Pesanan (PO)', (t) => t.no_pesanan);
    checkTx(quotations, 'Penawaran (SQ)', (t) => t.no_penawaran);

    return {
      lastCustomerPrice,
      lastCustomerDate,
      lastGeneralPrice,
      lastGeneralDate,
      recentTransactions,
    };
  }, [item?.id, customerId, salesOrders, quotations, salesInvoices]);

  // Master product benchmark prices
  const masterJual = Number(item?.master_harga_jual ?? item?.harga_jual ?? 0);
  const masterBeli = Number(item?.master_harga_beli ?? item?.harga_beli ?? 0);

  // Real-time Number Formatting Handlers (Auto Pemisah Titik)
  const handleQtyChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      setQtyInput('');
      setQty(0);
      return;
    }
    const num = parseInt(raw, 10);
    setQty(num);
    setQtyInput(num.toLocaleString('id-ID'));
    if (qtyError) setQtyError('');
  };

  const handleQtyBlur = () => {
    if (!qtyInput) {
      setQty(0);
      setQtyInput('0');
    }
  };

  const incrementQty = (delta) => {
    const next = Math.max(0, (Number(qty) || 0) + delta);
    setQty(next);
    setQtyInput(next.toLocaleString('id-ID'));
    if (qtyError) setQtyError('');
  };

  const addQuickQty = (amount) => {
    const next = Math.max(0, (Number(qty) || 0) + amount);
    setQty(next);
    setQtyInput(next.toLocaleString('id-ID'));
    if (qtyError) setQtyError('');
  };

  const applyPrice = (price) => {
    const p = Math.max(0, Number(price || 0));
    setHargaSatuan(p);
    setHargaInput(p.toLocaleString('id-ID'));
  };

  const handleHargaChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      setHargaInput('');
      setHargaSatuan(0);
      return;
    }
    const num = parseInt(raw, 10);
    setHargaSatuan(num);
    setHargaInput(num.toLocaleString('id-ID'));
  };

  const handleHargaBlur = () => {
    if (!hargaInput) {
      setHargaSatuan(0);
      setHargaInput('0');
    }
  };

  const handleDiskonRpChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      setDiskonRpInput('');
      setDiskonRp(0);
      return;
    }
    const num = parseInt(raw, 10);
    setDiskonRp(num);
    setDiskonRpInput(num.toLocaleString('id-ID'));
  };

  const handleDiskonRpBlur = () => {
    if (!diskonRpInput) {
      setDiskonRp(0);
      setDiskonRpInput('0');
    }
  };

  if (!isOpen || !item) return null;

  // Real-time calculations
  const rawSubtotal = qty * (formType === 'DO' ? 0 : hargaSatuan);
  const calculatedDiscount =
    diskonType === 'persen'
      ? (rawSubtotal * (Number(diskonPersen) || 0)) / 100
      : Number(diskonRp) || 0;
  const netTotal = Math.max(0, rawSubtotal - calculatedDiscount);

  // LCD Calculator Format helper
  const formatCalcDisplay = (val) => {
    if (!val || val === '0') return '0';
    if (val.includes('.')) {
      const parts = val.split('.');
      return `${Number(parts[0] || 0).toLocaleString('id-ID')}.${parts[1]}`;
    }
    const num = Number(val);
    return isNaN(num) ? val : num.toLocaleString('id-ID');
  };

  // Calculator logic
  const handleCalcDigit = (digit) => {
    if (calcWaitingForOperand) {
      setCalcDisplay(String(digit));
      setCalcWaitingForOperand(false);
    } else {
      setCalcDisplay(calcDisplay === '0' ? String(digit) : calcDisplay + digit);
    }
  };

  const handleCalcDot = () => {
    if (calcWaitingForOperand) {
      setCalcDisplay('0.');
      setCalcWaitingForOperand(false);
      return;
    }
    if (!calcDisplay.includes('.')) {
      setCalcDisplay(calcDisplay + '.');
    }
  };

  const handleCalcClear = () => {
    setCalcDisplay('0');
    setCalcFormula('');
    setCalcPrevVal(null);
    setCalcOp(null);
    setCalcWaitingForOperand(false);
  };

  const handleCalcBackspace = () => {
    if (calcDisplay.length <= 1) {
      setCalcDisplay('0');
    } else {
      setCalcDisplay(calcDisplay.slice(0, -1));
    }
  };

  const performCalculation = (op, nextOp = null) => {
    const inputValue = parseFloat(calcDisplay);

    if (calcPrevVal === null) {
      setCalcPrevVal(inputValue);
      setCalcFormula(`${inputValue} ${op}`);
    } else if (calcOp) {
      const currentValue = calcPrevVal || 0;
      let newValue = currentValue;

      if (calcOp === '+') newValue = currentValue + inputValue;
      else if (calcOp === '-') newValue = currentValue - inputValue;
      else if (calcOp === '*') newValue = currentValue * inputValue;
      else if (calcOp === '/') newValue = inputValue !== 0 ? currentValue / inputValue : 0;

      // Round to 4 decimal places max to avoid floating point weirdness
      newValue = Math.round(newValue * 10000) / 10000;

      setCalcDisplay(String(newValue));
      setCalcPrevVal(newValue);
      setCalcFormula(nextOp ? `${newValue} ${nextOp}` : `${currentValue} ${calcOp} ${inputValue} =`);
    }

    setCalcWaitingForOperand(true);
    setCalcOp(nextOp);
  };

  const handleCalcOp = (op) => {
    performCalculation(op, op);
  };

  const handleCalcEquals = () => {
    if (!calcOp) return;
    performCalculation(calcOp, null);
  };

  // Transfer calculator result
  const transferToQty = () => {
    const val = Math.max(1, Math.round(parseFloat(calcDisplay) || 1));
    setQty(val);
    setQtyInput(val.toLocaleString('id-ID'));
  };

  const transferToPrice = () => {
    const val = Math.max(0, Math.round(parseFloat(calcDisplay) || 0));
    setHargaSatuan(val);
    setHargaInput(val.toLocaleString('id-ID'));
  };

  const transferToDiscount = () => {
    const val = Math.max(0, Math.round(parseFloat(calcDisplay) || 0));
    setDiskonType('rp');
    setDiskonRp(val);
    setDiskonRpInput(val.toLocaleString('id-ID'));
    setDiskonPersen(0);
  };

  // Submit back to parent (Guaranteed Single Execution)
  const handleSave = () => {
    if (isSavingRef.current) return;

    if (Number(qty) <= 0) {
      setQtyError('Kuantitas (Qty) harus diisi minimal 1 untuk dimasukkan ke dokumen');
      return;
    }

    isSavingRef.current = true;
    setTimeout(() => {
      isSavingRef.current = false;
    }, 400);

    const updated = {
      ...item,
      qty: Number(qty) || 1,
      satuan: satuan || item.satuan || 'Pcs',
      harga_jual: formType === 'DO' ? 0 : Number(hargaSatuan) || 0,
      diskonPersen: diskonType === 'persen' ? Number(diskonPersen) || 0 : 0,
      diskonRp: diskonType === 'rp' ? Number(diskonRp) || 0 : 0,
      catatan: catatan.trim(),
      total: formType === 'DO' ? 0 : netTotal,
      isNew: false,
    };
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#0A3828] to-[#0D4A35] text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <Boxes className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm sm:text-base leading-tight">
                  Rincian Barang Kemasan
                </h3>
                <span className="bg-emerald-500/20 text-emerald-200 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-400/30 font-bold">
                  {item.kode_sku}
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 truncate max-w-md">
                {item.nama}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-emerald-800/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body - 2 Columns (Form Left, Calculator Right) */}
        <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-50/50">
          {/* LEFT: Item Form Specification (7 Cols) */}
          <div className="md:col-span-7 space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3.5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>Spesifikasi &amp; Jumlah Pesanan</span>
                <span className="text-[11px] font-semibold text-slate-400">
                  Stok Gudang: <strong className="text-emerald-800">{item.stok ?? 250} {satuan}</strong>
                </span>
              </h4>

              {/* Kuantitas & Satuan */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Kuantitas (Qty) *
                    </label>
                    <div className="flex items-center border-2 border-emerald-600 rounded-lg overflow-hidden bg-white shadow-2xs">
                      <button
                        type="button"
                        onClick={() => incrementQty(-1)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={qtyInput}
                        onChange={handleQtyChange}
                        onBlur={handleQtyBlur}
                        placeholder="0"
                        className="w-full text-center py-1.5 font-extrabold text-sm text-slate-900 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => incrementQty(1)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700">
                        Satuan Kemasan
                      </label>
                      {onAddSatuan && (
                        <button
                          type="button"
                          onClick={() => setIsAddingSatuan(!isAddingSatuan)}
                          className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center space-x-0.5"
                          title="Tambah master satuan baru ke Supabase"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Satuan</span>
                        </button>
                      )}
                    </div>

                    {isAddingSatuan ? (
                      <div className="flex items-center space-x-1 p-1 bg-emerald-50 rounded-lg border border-emerald-300 animate-in fade-in">
                        <input
                          type="text"
                          value={newSatuanName}
                          onChange={(e) => setNewSatuanName(e.target.value)}
                          placeholder="Nama satuan (Bal, Jerigen)..."
                          className="flex-1 px-2 py-1 bg-white border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-emerald-700"
                          autoFocus
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newSatuanName.trim()) {
                                const added = await onAddSatuan(newSatuanName.trim());
                                if (added) setSatuan(added.nama);
                                setNewSatuanName('');
                                setIsAddingSatuan(false);
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (newSatuanName.trim()) {
                              const added = await onAddSatuan(newSatuanName.trim());
                              if (added) setSatuan(added.nama);
                              setNewSatuanName('');
                              setIsAddingSatuan(false);
                            }
                          }}
                          className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[10px] font-bold"
                        >
                          Simpan
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewSatuanName('');
                            setIsAddingSatuan(false);
                          }}
                          className="px-1.5 py-1 text-slate-500 hover:text-slate-800 text-[10px]"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <select
                        value={satuan}
                        onChange={(e) => setSatuan(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white focus:ring-1 focus:ring-emerald-700 outline-none"
                      >
                        {satuanList && satuanList.length > 0 ? (
                          satuanList.map((s) => (
                            <option key={s.id || s.nama} value={s.nama}>
                              {s.nama}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="Pcs">Pcs</option>
                            <option value="Pack">Pack</option>
                            <option value="Roll">Roll</option>
                            <option value="Dus">Dus</option>
                            <option value="Lembar">Lembar</option>
                            <option value="Ikat">Ikat</option>
                            <option value="Box">Box</option>
                          </>
                        )}
                      </select>
                    )}
                  </div>
                </div>

                {/* Quick Packaging Qty Presets (+10, +50, +100, +500, +1.000) */}
                <div className="flex items-center space-x-1.5 pt-0.5">
                  <span className="text-[10px] text-slate-400 font-medium">Tambah Cepat:</span>
                  {[10, 50, 100, 500, 1000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => addQuickQty(preset)}
                      className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 rounded border border-slate-200 transition"
                    >
                      +{preset >= 1000 ? '1.000' : preset}
                    </button>
                  ))}
                </div>

                {qtyError && (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1 animate-in fade-in">
                    ⚠️ {qtyError}
                  </p>
                )}
              </div>

              {/* Harga Satuan & Comprehensive Price History (Hidden for DO) */}
              {formType !== 'DO' && (
                <div className="pt-2 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 text-xs">
                      Harga Satuan (Rp) *
                    </label>
                    {masterJual > 0 && (
                      <button
                        type="button"
                        onClick={() => applyPrice(masterJual)}
                        className="text-[10px] text-emerald-700 hover:underline font-semibold"
                      >
                        Pakai Standar Master: Rp {masterJual.toLocaleString('id-ID')}
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={hargaInput}
                      onChange={handleHargaChange}
                      onBlur={handleHargaBlur}
                      placeholder="0"
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>

                  {/* Riwayat & Referensi Harga Cepat (1-Klik Pakai) */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-slate-700 font-bold text-[11px]">
                        <History className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Riwayat &amp; Referensi Harga (Klik untuk Pakai)</span>
                      </div>
                      {priceHistory.recentTransactions?.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowHistoryDetail(!showHistoryDetail)}
                          className="text-[10px] text-emerald-700 hover:text-emerald-900 font-semibold flex items-center space-x-0.5"
                        >
                          <span>{showHistoryDetail ? 'Tutup Rincian' : 'Lihat Transaksi'}</span>
                          {showHistoryDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>

                    {/* Quick Price Option Chips */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                      {/* 1. Standar Master Jual */}
                      <button
                        type="button"
                        onClick={() => applyPrice(masterJual)}
                        className={`p-2 rounded-lg border text-left transition flex flex-col justify-between ${
                          hargaSatuan === masterJual && masterJual > 0
                            ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                            : 'bg-white border-slate-200 hover:border-emerald-400 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span className="font-semibold flex items-center space-x-1">
                            <Tag className="w-3 h-3 text-emerald-600" />
                            <span>Master Jual</span>
                          </span>
                          {hargaSatuan === masterJual && masterJual > 0 && (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">Aktif</span>
                          )}
                        </div>
                        <div className="text-xs font-black text-slate-900 mt-1 font-mono">
                          Rp {masterJual.toLocaleString('id-ID')}
                        </div>
                      </button>

                      {/* 2. Harga Modal / HPP Beli */}
                      <button
                        type="button"
                        onClick={() => applyPrice(masterBeli)}
                        className={`p-2 rounded-lg border text-left transition flex flex-col justify-between ${
                          hargaSatuan === masterBeli && masterBeli > 0
                            ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20'
                            : 'bg-white border-slate-200 hover:border-amber-400 hover:bg-slate-50'
                        }`}
                        title="Biaya Modal Beli (HPP) barang ini dari supplier"
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span className="font-semibold flex items-center space-x-1">
                            <ShieldCheck className="w-3 h-3 text-amber-600" />
                            <span>HPP Modal Beli</span>
                          </span>
                          {hargaSatuan === masterBeli && masterBeli > 0 && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 rounded">Aktif</span>
                          )}
                        </div>
                        <div className="text-xs font-black text-amber-900 mt-1 font-mono">
                          Rp {masterBeli.toLocaleString('id-ID')}
                        </div>
                      </button>

                      {/* 3. Terakhir ke Pelanggan Ini */}
                      <button
                        type="button"
                        disabled={!priceHistory.lastCustomerPrice}
                        onClick={() => priceHistory.lastCustomerPrice && applyPrice(priceHistory.lastCustomerPrice)}
                        className={`p-2 rounded-lg border text-left transition flex flex-col justify-between ${
                          !priceHistory.lastCustomerPrice
                            ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                            : hargaSatuan === priceHistory.lastCustomerPrice
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200 hover:border-blue-400 hover:bg-slate-50'
                        }`}
                        title={priceHistory.lastCustomerPrice ? `Harga saat ${customerName || 'pelanggan ini'} beli sebelumnya` : 'Pelanggan ini belum pernah membeli item ini'}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span className="font-semibold flex items-center space-x-1">
                            <UserCheck className="w-3 h-3 text-blue-600" />
                            <span className="truncate max-w-[80px]">Pelanggan Ini</span>
                          </span>
                          {priceHistory.lastCustomerPrice && hargaSatuan === priceHistory.lastCustomerPrice && (
                            <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1 rounded">Aktif</span>
                          )}
                        </div>
                        <div className="text-xs font-black text-slate-900 mt-1 font-mono">
                          {priceHistory.lastCustomerPrice ? (
                            `Rp ${priceHistory.lastCustomerPrice.toLocaleString('id-ID')}`
                          ) : (
                            <span className="text-[10px] font-normal text-slate-400">Belum ada</span>
                          )}
                        </div>
                      </button>

                      {/* 4. Terakhir Terjual Umum */}
                      {priceHistory.lastGeneralPrice && priceHistory.lastGeneralPrice !== masterJual && (
                        <button
                          type="button"
                          onClick={() => applyPrice(priceHistory.lastGeneralPrice)}
                          className={`p-2 rounded-lg border text-left transition flex flex-col justify-between ${
                            hargaSatuan === priceHistory.lastGeneralPrice
                              ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500/20'
                              : 'bg-white border-slate-200 hover:border-purple-400 hover:bg-slate-50'
                          }`}
                          title="Harga jual pada transaksi terakhir di sistem"
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span className="font-semibold flex items-center space-x-1">
                              <Receipt className="w-3 h-3 text-purple-600" />
                              <span>Terakhir Jual</span>
                            </span>
                            {hargaSatuan === priceHistory.lastGeneralPrice && (
                              <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1 rounded">Aktif</span>
                            )}
                          </div>
                          <div className="text-xs font-black text-purple-950 mt-1 font-mono">
                            Rp {priceHistory.lastGeneralPrice.toLocaleString('id-ID')}
                          </div>
                        </button>
                      )}

                      {/* 5. Grosir 5% */}
                      {masterJual > 0 && (
                        <button
                          type="button"
                          onClick={() => applyPrice(Math.round(masterJual * 0.95))}
                          className={`p-2 rounded-lg border text-left transition flex flex-col justify-between ${
                            hargaSatuan === Math.round(masterJual * 0.95)
                              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                              : 'bg-white border-slate-200 hover:border-emerald-400 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span className="font-semibold text-emerald-800">Grosir (-5%)</span>
                          </div>
                          <div className="text-xs font-bold text-slate-800 mt-1 font-mono">
                            Rp {Math.round(masterJual * 0.95).toLocaleString('id-ID')}
                          </div>
                        </button>
                      )}

                      {/* 6. Partai 10% */}
                      {masterJual > 0 && (
                        <button
                          type="button"
                          onClick={() => applyPrice(Math.round(masterJual * 0.9))}
                          className={`p-2 rounded-lg border text-left transition flex flex-col justify-between ${
                            hargaSatuan === Math.round(masterJual * 0.9)
                              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                              : 'bg-white border-slate-200 hover:border-emerald-400 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span className="font-semibold text-emerald-800">Partai (-10%)</span>
                          </div>
                          <div className="text-xs font-bold text-slate-800 mt-1 font-mono">
                            Rp {Math.round(masterJual * 0.9).toLocaleString('id-ID')}
                          </div>
                        </button>
                      )}
                    </div>

                    {/* Expandable Recent Transaction Table */}
                    {showHistoryDetail && priceHistory.recentTransactions?.length > 0 && (
                      <div className="mt-2 border-t border-slate-200 pt-2 animate-in fade-in duration-150">
                        <div className="text-[10px] font-bold text-slate-600 mb-1">
                          Rincian Transaksi Terakhir Produk Ini:
                        </div>
                        <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg">
                          <table className="w-full text-[10px] text-left border-collapse bg-white">
                            <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                              <tr>
                                <th className="py-1 px-2 border-b">No. Transaksi</th>
                                <th className="py-1 px-2 border-b">Tanggal</th>
                                <th className="py-1 px-2 border-b">Pelanggan</th>
                                <th className="py-1 px-2 border-b text-center">Qty</th>
                                <th className="py-1 px-2 border-b text-right">Harga Satuan</th>
                                <th className="py-1 px-2 border-b text-center">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {priceHistory.recentTransactions.map((tx, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="py-1 px-2 font-mono font-bold text-emerald-800">{tx.noDoc}</td>
                                  <td className="py-1 px-2 text-slate-500">{tx.date}</td>
                                  <td className="py-1 px-2 text-slate-700 font-medium truncate max-w-[100px]">{tx.customer}</td>
                                  <td className="py-1 px-2 text-center font-mono">{Number(tx.qty || 0).toLocaleString('id-ID')}</td>
                                  <td className="py-1 px-2 text-right font-mono font-bold">Rp {Number(tx.price || 0).toLocaleString('id-ID')}</td>
                                  <td className="py-1 px-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => applyPrice(tx.price)}
                                      className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[9px] transition"
                                    >
                                      Pakai
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Diskon Baris (Hidden for DO) */}
              {formType !== 'DO' && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-slate-700 text-xs">
                      Potongan Diskon Barang
                    </label>
                    <div className="flex items-center bg-slate-100 p-0.5 rounded text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setDiskonType('persen')}
                        className={`px-2 py-0.5 rounded transition ${
                          diskonType === 'persen'
                            ? 'bg-emerald-800 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Persen (%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiskonType('rp')}
                        className={`px-2 py-0.5 rounded transition ${
                          diskonType === 'rp'
                            ? 'bg-emerald-800 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Nominal (Rp)
                      </button>
                    </div>
                  </div>

                  {diskonType === 'persen' ? (
                    <div className="flex items-center space-x-2">
                      <div className="relative w-32">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={diskonPersen}
                          onChange={(e) => setDiskonPersen(Math.min(100, Math.max(0, Number(e.target.value))))}
                          className="w-full pr-7 pl-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-center outline-none focus:ring-1 focus:ring-emerald-700"
                        />
                        <span className="absolute right-2.5 top-2 text-xs font-bold text-slate-400">
                          %
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">
                        = Potongan: <strong className="text-rose-600">Rp {calculatedDiscount.toLocaleString('id-ID')}</strong>
                      </span>
                    </div>
                  ) : (
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={diskonRpInput}
                        onChange={handleDiskonRpChange}
                        onBlur={handleDiskonRpBlur}
                        placeholder="0"
                        className="w-full pl-10 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-1 focus:ring-emerald-700"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Catatan Baris */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block font-bold text-slate-700 text-xs mb-1">
                  Catatan / Keterangan Khusus Baris Kemasan
                </label>
                <input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Contoh: Cetak sablon 1 sisi warna hijau, packing per 50 pcs..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>
            </div>

            {/* Subtotal Box */}
            {formType !== 'DO' && (
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[11px] text-emerald-800 font-bold block uppercase tracking-wide">
                    Total Nilai Baris:
                  </span>
                  <span className="text-[10px] text-emerald-600">
                    ({Number(qty || 0).toLocaleString('id-ID')} {satuan} × Rp {Number(hargaSatuan || 0).toLocaleString('id-ID')}) - Potongan Rp {calculatedDiscount.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base sm:text-lg font-black font-mono text-emerald-950">
                    Rp {netTotal.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Quick Calculator Assistant (5 Cols) */}
          <div className="md:col-span-5 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                <div className="flex items-center space-x-1.5 text-slate-800 font-bold text-xs">
                  <Calculator className="w-3.5 h-3.5 text-emerald-800" />
                  <span>Kalkulator Hitung Cepat</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">ERP ASSIST</span>
              </div>

              {/* LCD Display */}
              <div className="bg-slate-900 rounded-lg p-3 text-right font-mono text-white shadow-inner mb-3">
                <div className="text-[10px] text-slate-400 h-4 truncate">
                  {calcFormula || '\u00A0'}
                </div>
                <div className="text-lg sm:text-xl font-bold tracking-wider text-emerald-400 truncate">
                  {formatCalcDisplay(calcDisplay)}
                </div>
              </div>

              {/* Transfer Buttons: Copy calc result directly to input! */}
              <div className="grid grid-cols-2 gap-1.5 mb-3 text-[11px]">
                <button
                  type="button"
                  onClick={transferToQty}
                  className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded font-bold transition flex items-center justify-center space-x-1"
                  title="Salin hasil hitung ke Kuantitas"
                >
                  <ArrowRight className="w-3 h-3" />
                  <span>Gunakan sbg Qty</span>
                </button>
                {formType !== 'DO' && (
                  <button
                    type="button"
                    onClick={transferToPrice}
                    className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded font-bold transition flex items-center justify-center space-x-1"
                    title="Salin hasil hitung ke Harga Satuan"
                  >
                    <ArrowRight className="w-3 h-3" />
                    <span>Gunakan sbg Harga</span>
                  </button>
                )}
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-4 gap-1.5 text-xs font-bold text-slate-800">
                <button
                  type="button"
                  onClick={handleCalcClear}
                  className="py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded border border-rose-200 transition"
                >
                  C
                </button>
                <button
                  type="button"
                  onClick={handleCalcBackspace}
                  className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition"
                >
                  ⌫
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const current = parseFloat(calcDisplay) || 0;
                    setCalcDisplay(String(current / 100));
                  }}
                  className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition"
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => handleCalcOp('/')}
                  className="py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded border border-emerald-200 transition"
                >
                  ÷
                </button>

                <button
                  type="button"
                  onClick={() => handleCalcDigit(7)}
                  className="py-2 bg-white hover:bg-slate-100 rounded border border-slate-200 transition"
                >
                  7
                </button>
                <button
                  type="button"
                  onClick={() => handleCalcDigit(8)}
                  className="py-2 bg-white hover:bg-slate-100 rounded border border-slate-200 transition"
                >
                  8
                </button>
                <button
                  type="button"
                  onClick={() => handleCalcDigit(9)}
                  className="py-2 bg-white hover:bg-slate-100 rounded border border-slate-200 transition"
                >
                  9
                </button>
                <button
                  type="button"
                  onClick={() => handleCalcOp('*')}
                  className="py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded border border-emerald-200 transition"
                >
                  ×
                </button>

                <button
                  type="button"
                  onClick={() => handleCalcDigit(4)}
                  className="py-2 bg-white hover:bg-slate-100 rounded border border-slate-200 transition"
                >
                  4
                </button>
                <button
                  type="button"
                  onClick={() => handleCalcDigit(5)}
                  className="py-2 bg-white hover:bg-slate-100 rounded border border-slate-200 transition"
                >
                  5
                </button>
                <button
                  type="button"
                  onClick={() => handleCalcDigit(6)}
                  className="py-2 bg-white hover:bg-slate-100 rounded border border-slate-200 transition"
                >
                  6
                </button>
                <button
                  type="button"
                  onClick={() => handleCalcOp('-')}
                  className="py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded border border-emerald-200 transition"
                >
                  -
                </button>

                <button
                  type="button"
                  onClick={() => handleCalcDigit(1)}
                  className="py-2 bg-white hover:bg-slate-100 rounded border border-slate-200 transition"
                >
                  1
                </button>
                <button
                  type="button"
                  onClick={() => handleCalcDigit(2)}
                  className="py-2 bg-white hover:bg-slate-100 rounded border border-slate-200 transition"
                >
                  2
                </button>
                <button
                  type="button"
                  onClick={() => handleCalcDigit(3)}
                  className="py-2 bg-white hover:bg-slate-100 rounded border border-slate-200 transition"
                >
                  3
                </button>
                <button
                  type="button"
                  onClick={() => handleCalcOp('+')}
                  className="py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded border border-emerald-200 transition"
                >
                  +
                </button>

                <button
                  type="button"
                  onClick={() => handleCalcDigit(0)}
                  className="py-2 bg-white hover:bg-slate-100 rounded border border-slate-200 transition"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (calcWaitingForOperand) {
                      setCalcDisplay('00');
                      setCalcWaitingForOperand(false);
                    } else if (calcDisplay !== '0') {
                      setCalcDisplay(calcDisplay + '00');
                    }
                  }}
                  className="py-2 bg-white hover:bg-slate-100 rounded border border-slate-200 transition"
                >
                  00
                </button>
                <button
                  type="button"
                  onClick={handleCalcDot}
                  className="py-2 bg-white hover:bg-slate-100 rounded border border-slate-200 transition"
                >
                  .
                </button>
                <button
                  type="button"
                  onClick={handleCalcEquals}
                  className="py-2 bg-[#0A3828] hover:bg-[#072B1F] text-white rounded font-extrabold transition shadow-xs"
                >
                  =
                </button>
              </div>
            </div>

            {/* Quick Math Shortcuts */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
              <span className="font-semibold">Preset Grosir:</span>
              <div className="space-x-1">
                <button
                  type="button"
                  onClick={() => {
                    const cur = parseFloat(calcDisplay) || 1;
                    setCalcDisplay(String(cur * 100));
                  }}
                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-mono"
                >
                  ×100
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cur = parseFloat(calcDisplay) || 1;
                    setCalcDisplay(String(cur * 500));
                  }}
                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-mono"
                >
                  ×500
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cur = parseFloat(calcDisplay) || 1;
                    setCalcDisplay(String(cur * 1000));
                  }}
                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-mono"
                >
                  ×1000
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition"
            >
              Batal
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="px-3.5 py-2 text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-300 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs"
                title="Hapus baris barang ini dari transaksi"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Baris</span>
              </button>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-[#0A3828] hover:bg-[#06281D] text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Terapkan ke Baris Dokumen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
