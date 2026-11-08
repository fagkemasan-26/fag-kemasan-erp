'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Calculator,
  Plus,
  Minus,
  Boxes,
  Trash2,
  ArrowRight,
  Tag,
  ShieldCheck,
  Percent,
  DollarSign,
} from 'lucide-react';
import {
  formatDisplayDecimal,
  formatRupiah,
  parseNumberId,
  formatLiveInput,
} from '../lib/numberFormat';

/**
 * PurchaseItemDetailModal: High-performance 2-Column Line Item Detail & Calculator Dialog
 * Matches the layout and responsiveness of Penjualan (ItemDetailModal).
 * Fully supports decimal prices (e.g. 1.171,17), decimal discount percentages (e.g. 18,75%),
 * and thousand dots without lag or screen jumping.
 */
export default function PurchaseItemDetailModal({
  isOpen,
  onClose,
  item,
  onSave,
  onDelete,
  formType = 'PO', // 'PO' | 'RI' | 'FB'
  supplierName = '',
}) {
  // Line Item States
  const [qty, setQty] = useState(1);
  const [qtyInput, setQtyInput] = useState('1');
  const [satuan, setSatuan] = useState('Pcs');
  const [hargaBeli, setHargaBeli] = useState(0);
  const [hargaInput, setHargaInput] = useState('0');
  const [diskonType, setDiskonType] = useState('persen'); // 'persen' | 'rp'
  const [diskonPersen, setDiskonPersen] = useState(0);
  const [diskonPersenInput, setDiskonPersenInput] = useState('0');
  const [diskonRp, setDiskonRp] = useState(0);
  const [diskonRpInput, setDiskonRpInput] = useState('0');
  const [catatan, setCatatan] = useState('');
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
      const q = Math.max(1, Number(item.qty || 1));
      setQty(q);
      setQtyInput(formatDisplayDecimal(q));
      setSatuan(item.satuan || 'Pcs');

      const h = Number(item.harga_beli ?? item.harga ?? 0);
      setHargaBeli(h);
      setHargaInput(formatDisplayDecimal(h));

      if (item.diskonRp && Number(item.diskonRp) > 0 && (!item.diskonPersen || Number(item.diskonPersen) === 0)) {
        setDiskonType('rp');
        setDiskonRp(Number(item.diskonRp));
        setDiskonRpInput(formatDisplayDecimal(item.diskonRp));
        setDiskonPersen(0);
        setDiskonPersenInput('0');
      } else if (item.diskonPersen && Number(item.diskonPersen) > 0) {
        setDiskonType('persen');
        const dp = Number(item.diskonPersen);
        setDiskonPersen(dp);
        setDiskonPersenInput(formatDisplayDecimal(dp));
        const sub = q * h;
        const discNominal = (sub * dp) / 100;
        setDiskonRp(discNominal);
        setDiskonRpInput(formatDisplayDecimal(discNominal));
      } else {
        setDiskonType('persen');
        setDiskonPersen(0);
        setDiskonPersenInput('0');
        setDiskonRp(0);
        setDiskonRpInput('0');
      }

      setCatatan(item.catatan || '');
      setCalcDisplay(String(h || q || 0));
      setCalcFormula('');
      setCalcPrevVal(null);
      setCalcOp(null);
      setCalcWaitingForOperand(false);
    }
  }, [item, isOpen]);

  // Master benchmark prices
  const masterBeli = Number(item?.master_harga_beli ?? item?.harga_beli ?? 0);
  const masterJual = Number(item?.master_harga_jual ?? item?.harga_jual ?? 0);

  // Input Handlers with Real-Time Formatting (titik pemisah & koma desimal)
  const handleQtyChange = (e) => {
    const val = e.target.value;
    if (!val) {
      setQtyInput('');
      setQty(0);
      return;
    }
    const { display, num } = formatLiveInput(val);
    setQtyInput(display);
    setQty(num);
    if (qtyError) setQtyError('');
  };

  const handleQtyBlur = () => {
    if (!qtyInput || qty <= 0) {
      setQty(1);
      setQtyInput('1');
    } else {
      setQtyInput(formatDisplayDecimal(qty));
    }
  };

  const incrementQty = (delta) => {
    const next = Math.max(1, (Number(qty) || 0) + delta);
    setQty(next);
    setQtyInput(formatDisplayDecimal(next));
    if (qtyError) setQtyError('');
  };

  const addQuickQty = (amount) => {
    const next = Math.max(1, (Number(qty) || 0) + amount);
    setQty(next);
    setQtyInput(formatDisplayDecimal(next));
    if (qtyError) setQtyError('');
  };

  const applyPrice = (price) => {
    const p = Math.max(0, Number(price || 0));
    setHargaBeli(p);
    setHargaInput(formatDisplayDecimal(p));
  };

  const handleHargaChange = (e) => {
    const val = e.target.value;
    if (!val) {
      setHargaInput('');
      setHargaBeli(0);
      return;
    }
    const { display, num } = formatLiveInput(val);
    setHargaInput(display);
    setHargaBeli(num);
  };

  const handleHargaBlur = () => {
    if (!hargaInput || hargaBeli === 0) {
      setHargaBeli(0);
      setHargaInput('0');
    } else {
      setHargaInput(formatDisplayDecimal(hargaBeli));
    }
  };

  const handleDiskonPersenChange = (e) => {
    const val = e.target.value;
    if (!val) {
      setDiskonPersenInput('');
      setDiskonPersen(0);
      return;
    }
    const { display, num } = formatLiveInput(val, 2);
    const clamped = Math.min(100, Math.max(0, num));
    setDiskonPersenInput(display);
    setDiskonPersen(clamped);
  };

  const handleDiskonPersenBlur = () => {
    if (!diskonPersenInput || diskonPersen === 0) {
      setDiskonPersen(0);
      setDiskonPersenInput('0');
    } else {
      setDiskonPersenInput(formatDisplayDecimal(diskonPersen));
    }
  };

  const handleDiskonRpChange = (e) => {
    const val = e.target.value;
    if (!val) {
      setDiskonRpInput('');
      setDiskonRp(0);
      return;
    }
    const { display, num } = formatLiveInput(val);
    setDiskonRpInput(display);
    setDiskonRp(num);
  };

  const handleDiskonRpBlur = () => {
    if (!diskonRpInput || diskonRp === 0) {
      setDiskonRp(0);
      setDiskonRpInput('0');
    } else {
      setDiskonRpInput(formatDisplayDecimal(diskonRp));
    }
  };

  if (!isOpen || !item) return null;

  // Real-time calculations
  const rawSubtotal = qty * (formType === 'RI' ? 0 : hargaBeli);
  const calculatedDiscount =
    diskonType === 'persen'
      ? (rawSubtotal * (Number(diskonPersen) || 0)) / 100
      : Number(diskonRp) || 0;
  const netTotal = Math.max(0, Math.round(rawSubtotal - calculatedDiscount));

  // LCD Calculator Format helper
  const formatCalcDisplay = (val) => {
    if (!val || val === '0') return '0';
    if (val.includes('.')) {
      const parts = val.split('.');
      return `${Number(parts[0] || 0).toLocaleString('id-ID')},${parts[1]}`;
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

      // Round to 4 decimal places max
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
    const val = Math.max(1, parseFloat(calcDisplay) || 1);
    setQty(val);
    setQtyInput(formatDisplayDecimal(val));
    if (qtyError) setQtyError('');
  };

  const transferToPrice = () => {
    const val = Math.max(0, parseFloat(calcDisplay) || 0);
    setHargaBeli(val);
    setHargaInput(formatDisplayDecimal(val));
  };

  const transferToDiscount = () => {
    const val = Math.max(0, parseFloat(calcDisplay) || 0);
    if (diskonType === 'persen') {
      const clamped = Math.min(100, val);
      setDiskonPersen(clamped);
      setDiskonPersenInput(formatDisplayDecimal(clamped));
    } else {
      setDiskonRp(val);
      setDiskonRpInput(formatDisplayDecimal(val));
    }
  };

  // Submit back to parent (Guaranteed Single Execution)
  const handleSave = () => {
    if (isSavingRef.current) return;

    if (Number(qty) <= 0) {
      setQtyError('Kuantitas (Qty) beli minimal harus 1');
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
      harga_beli: formType === 'RI' ? 0 : Number(hargaBeli) || 0,
      harga: formType === 'RI' ? 0 : Number(hargaBeli) || 0,
      diskonPersen: diskonType === 'persen' ? Number(diskonPersen) || 0 : 0,
      diskonRp: diskonType === 'rp' ? Number(diskonRp) || 0 : Math.round(calculatedDiscount),
      catatan: catatan.trim(),
      total: formType === 'RI' ? 0 : netTotal,
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
                  Rincian Barang Pembelian ({formType})
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
                <span>Spesifikasi &amp; Jumlah Pembelian</span>
                <span className="text-[11px] font-semibold text-slate-400">
                  Stok Gudang Saat Ini: <strong className="text-emerald-800">{item.stok ?? 0} {satuan}</strong>
                </span>
              </h4>

              {/* Kuantitas & Satuan */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Kuantitas Beli (Qty) *
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
                        inputMode="decimal"
                        value={qtyInput}
                        onChange={handleQtyChange}
                        onBlur={handleQtyBlur}
                        placeholder="1"
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
                    <label className="block font-bold text-slate-700 mb-1">
                      Satuan Kemasan
                    </label>
                    <select
                      value={satuan}
                      onChange={(e) => setSatuan(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white focus:ring-1 focus:ring-emerald-700 outline-none"
                    >
                      <option value="Pcs">Pcs (Satuan)</option>
                      <option value="Pack">Pack</option>
                      <option value="Roll">Roll</option>
                      <option value="Dus">Dus / Box</option>
                      <option value="Lembar">Lembar</option>
                      <option value="Ikat">Ikat</option>
                      <option value="Kg">Kg</option>
                      <option value="Meter">Meter</option>
                    </select>
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

              {/* Harga Beli Satuan (Hidden for RI) */}
              {formType !== 'RI' && (
                <div className="pt-2 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 text-xs">
                      Harga Beli Pokok Satuan (Rp) *
                    </label>
                    {masterBeli > 0 && (
                      <button
                        type="button"
                        onClick={() => applyPrice(masterBeli)}
                        className="text-[10px] text-emerald-700 hover:underline font-semibold"
                      >
                        Pakai Standar HPP: Rp {formatDisplayDecimal(masterBeli)}
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={hargaInput}
                      onChange={handleHargaChange}
                      onBlur={handleHargaBlur}
                      placeholder="0"
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>

                  {/* Benchmark Harga Cepat (Master HPP Beli & Jual) */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-slate-700 font-bold text-[11px]">
                      <span className="flex items-center space-x-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Referensi Harga Master (Klik untuk Pakai)</span>
                      </span>
                      {supplierName && (
                        <span className="text-[10px] text-slate-500 font-normal">
                          Pemasok: <strong>{supplierName}</strong>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => applyPrice(masterBeli)}
                        className={`p-2 rounded-lg border text-left transition flex flex-col justify-between ${
                          hargaBeli === masterBeli && masterBeli > 0
                            ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                            : 'bg-white border-slate-200 hover:border-emerald-400 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span className="font-semibold flex items-center space-x-1">
                            <Tag className="w-3 h-3 text-emerald-600" />
                            <span>Master HPP Beli</span>
                          </span>
                          {hargaBeli === masterBeli && masterBeli > 0 && (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">Aktif</span>
                          )}
                        </div>
                        <div className="text-xs font-black text-slate-900 mt-1 font-mono">
                          Rp {formatDisplayDecimal(masterBeli)}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyPrice(masterJual)}
                        className={`p-2 rounded-lg border text-left transition flex flex-col justify-between ${
                          hargaBeli === masterJual && masterJual > 0
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200 hover:border-blue-400 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span className="font-semibold flex items-center space-x-1">
                            <Tag className="w-3 h-3 text-blue-600" />
                            <span>Master Harga Jual</span>
                          </span>
                          {hargaBeli === masterJual && masterJual > 0 && (
                            <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1 rounded">Aktif</span>
                          )}
                        </div>
                        <div className="text-xs font-black text-blue-900 mt-1 font-mono">
                          Rp {formatDisplayDecimal(masterJual)}
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Diskon Item Pembelian (Hidden for RI) */}
              {formType !== 'RI' && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-slate-700 text-xs">
                      Potongan Diskon Pemasok
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
                      <div className="relative w-36">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={diskonPersenInput}
                          onChange={handleDiskonPersenChange}
                          onBlur={handleDiskonPersenBlur}
                          placeholder="0"
                          className="w-full pr-7 pl-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-center outline-none focus:ring-1 focus:ring-emerald-700"
                        />
                        <span className="absolute right-2.5 top-2 text-xs font-bold text-slate-400">
                          %
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium truncate">
                        = Potongan: <strong className="text-rose-600">Rp {formatDisplayDecimal(Math.round(calculatedDiscount))}</strong>
                      </span>
                    </div>
                  ) : (
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
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

              {/* Catatan Baris Pembelian */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block font-bold text-slate-700 text-xs mb-1">
                  Catatan Khusus Barang (Ukuran, Flute, Gramasi, Supplier Ref)
                </label>
                <input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Contoh: Double Wall DPE 287 DW 8 OZ, supplier invoice ref..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>
            </div>

            {/* Subtotal Box */}
            {formType !== 'RI' && (
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[11px] text-emerald-800 font-bold block uppercase tracking-wide">
                    Total Nilai Baris Pembelian:
                  </span>
                  <span className="text-[10px] text-emerald-600">
                    ({formatDisplayDecimal(qty)} {satuan} × Rp {formatDisplayDecimal(hargaBeli)}) - Potongan Rp {formatDisplayDecimal(Math.round(calculatedDiscount))}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base sm:text-lg font-black font-mono text-emerald-950">
                    Rp {formatDisplayDecimal(netTotal)}
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

              {/* Transfer Buttons: Copy calc result directly to input */}
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
                {formType !== 'RI' && (
                  <button
                    type="button"
                    onClick={transferToPrice}
                    className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded font-bold transition flex items-center justify-center space-x-1"
                    title="Salin hasil hitung ke Harga Beli"
                  >
                    <ArrowRight className="w-3 h-3" />
                    <span>Gunakan sbg Harga</span>
                  </button>
                )}
                {formType !== 'RI' && (
                  <button
                    type="button"
                    onClick={transferToDiscount}
                    className="col-span-2 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded font-bold transition flex items-center justify-center space-x-1"
                    title="Salin hasil hitung ke Diskon"
                  >
                    <ArrowRight className="w-3 h-3" />
                    <span>Gunakan sbg Diskon ({diskonType === 'persen' ? '%' : 'Rp'})</span>
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
                  ,
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

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between">
          <div>
            {onDelete && !item.isNew && (
              <button
                type="button"
                onClick={() => {
                  onDelete(item);
                  onClose();
                }}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Item</span>
              </button>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-[#0A3828] hover:bg-[#072B1F] text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
            >
              <span>Simpan Rincian</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
