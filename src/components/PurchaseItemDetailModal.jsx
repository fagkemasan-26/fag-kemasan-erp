'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Boxes,
  Trash2,
  ChevronDown,
} from 'lucide-react';

export default function PurchaseItemDetailModal({
  isOpen,
  onClose,
  item,
  onSave,
  onDelete,
  formType = 'PO', // 'PO' | 'RI' | 'FB'
  supplierName = '',
}) {
  const [qty, setQty] = useState(1);
  const [qtyInput, setQtyInput] = useState('1');
  const [satuan, setSatuan] = useState('Pcs');
  const [hargaBeli, setHargaBeli] = useState(0);
  const [hargaInput, setHargaInput] = useState('0');
  const [diskonType, setDiskonType] = useState('rp'); // 'rp' | 'persen'
  const [diskonPersen, setDiskonPersen] = useState(0);
  const [diskonRp, setDiskonRp] = useState(0);
  const [diskonRpInput, setDiskonRpInput] = useState('0');
  const [catatan, setCatatan] = useState('');

  // Built-in Calculator State
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcFormula, setCalcFormula] = useState('');
  const [calcPrevVal, setCalcPrevVal] = useState(null);
  const [calcOp, setCalcOp] = useState(null);
  const [calcTarget, setCalcTarget] = useState('qty'); // 'qty' | 'harga'

  useEffect(() => {
    if (isOpen && item) {
      const q = Math.max(1, Number(item.qty || 1));
      setQty(q);
      setQtyInput(Number(q).toLocaleString('id-ID'));
      setSatuan(item.satuan || 'Pcs');

      const h = Number(item.harga_beli ?? item.harga ?? 0);
      setHargaBeli(h);
      setHargaInput(Number(h).toLocaleString('id-ID'));

      if (item.diskonRp && Number(item.diskonRp) > 0) {
        setDiskonType('rp');
        setDiskonRp(Number(item.diskonRp));
        setDiskonRpInput(Number(item.diskonRp).toLocaleString('id-ID'));
        setDiskonPersen(0);
      } else if (item.diskonPersen && Number(item.diskonPersen) > 0) {
        setDiskonType('persen');
        setDiskonPersen(Number(item.diskonPersen));
        setDiskonRp(0);
        setDiskonRpInput('0');
      } else {
        setDiskonType('rp');
        setDiskonPersen(0);
        setDiskonRp(0);
        setDiskonRpInput('0');
      }

      setCatatan(item.catatan || '');
      setCalcDisplay('0');
      setCalcFormula('');
      setCalcPrevVal(null);
      setCalcOp(null);
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  // Real-time subtotal calculation
  const subtotal = qty * hargaBeli;
  const effectiveDiskon =
    diskonType === 'persen'
      ? (subtotal * Math.min(100, Math.max(0, diskonPersen))) / 100
      : Math.min(subtotal, Math.max(0, diskonRp));
  const totalNetto = Math.max(0, subtotal - effectiveDiskon);

  // Parse formatted input
  const parseNumber = (val) => {
    const clean = String(val).replace(/[^0-9]/g, '');
    return clean ? parseInt(clean, 10) : 0;
  };

  const handleQtyChange = (e) => {
    const num = parseNumber(e.target.value);
    setQty(num);
    setQtyInput(num === 0 ? '' : num.toLocaleString('id-ID'));
  };

  const handleHargaChange = (e) => {
    const num = parseNumber(e.target.value);
    setHargaBeli(num);
    setHargaInput(num === 0 ? '' : num.toLocaleString('id-ID'));
  };

  const handleDiskonRpChange = (e) => {
    const num = parseNumber(e.target.value);
    setDiskonRp(num);
    setDiskonRpInput(num === 0 ? '' : num.toLocaleString('id-ID'));
  };

  // Calculator Functions
  const handleCalcNumber = (digit) => {
    setCalcDisplay((prev) => (prev === '0' ? String(digit) : prev + digit));
  };

  const handleCalcOp = (op) => {
    const curr = parseFloat(calcDisplay);
    setCalcPrevVal(curr);
    setCalcOp(op);
    setCalcFormula(`${curr} ${op}`);
    setCalcDisplay('0');
  };

  const handleCalcEqual = () => {
    if (calcPrevVal === null || !calcOp) return;
    const curr = parseFloat(calcDisplay);
    let res = 0;
    if (calcOp === '+') res = calcPrevVal + curr;
    if (calcOp === '-') res = calcPrevVal - curr;
    if (calcOp === '×' || calcOp === '*') res = calcPrevVal * curr;
    if (calcOp === '÷' || calcOp === '/') res = curr !== 0 ? calcPrevVal / curr : 0;

    const finalRes = Math.round(res);
    setCalcDisplay(String(finalRes));
    setCalcFormula('');
    setCalcPrevVal(null);
    setCalcOp(null);

    // Apply to target
    if (calcTarget === 'qty') {
      const q = Math.max(1, finalRes);
      setQty(q);
      setQtyInput(q.toLocaleString('id-ID'));
    } else {
      const h = Math.max(0, finalRes);
      setHargaBeli(h);
      setHargaInput(h.toLocaleString('id-ID'));
    }
  };

  const handleCalcClear = () => {
    setCalcDisplay('0');
    setCalcFormula('');
    setCalcPrevVal(null);
    setCalcOp(null);
  };

  const handleSave = () => {
    const finalQty = Math.max(1, qty);
    const updated = {
      ...item,
      qty: finalQty,
      satuan,
      harga_beli: hargaBeli,
      harga: hargaBeli,
      diskonPersen: diskonType === 'persen' ? diskonPersen : 0,
      diskonRp: diskonType === 'rp' ? diskonRp : effectiveDiskon,
      catatan,
      total: totalNetto,
    };
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-150">
      <div className="apple-card w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-900 to-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-800/80 flex items-center justify-center shadow-2xs">
              <Boxes className="w-4 h-4 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold tracking-wide">
                Rincian Barang Pembelian ({formType})
              </h3>
              <p className="text-[11px] text-emerald-200/80 font-medium truncate max-w-sm">
                [{item.kode_sku}] {item.nama}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-300 hover:text-white hover:bg-emerald-800/50 rounded-xl transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Card Info Produk */}
          <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex items-center justify-between text-xs">
            <div>
              <span className="font-mono font-bold text-emerald-950 text-xs block">
                {item.kode_sku}
              </span>
              <span className="font-extrabold text-slate-900 text-sm block">
                {item.nama}
              </span>
              <span className="text-[11px] text-slate-500">
                Pemasok: <strong>{supplierName || 'Pemasok Terpilih'}</strong>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Stok Saat Ini</span>
              <span className="font-mono font-extrabold text-emerald-900 text-sm">
                {Number(item.stok || 0).toLocaleString('id-ID')} {item.satuan || 'Pcs'}
              </span>
            </div>
          </div>

          {/* Form Fields: Kuantitas, Satuan, Harga Beli */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Kuantitas */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 text-xs flex items-center space-x-1">
                  <span>Kuantitas Beli</span>
                  <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setCalcTarget('qty');
                    setCalcDisplay(String(qty));
                    setIsCalcOpen(true);
                  }}
                  className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center space-x-1"
                >
                  <Calculator className="w-3 h-3" />
                  <span>Kalkulator</span>
                </button>
              </div>

              <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-700/20 focus-within:border-emerald-700">
                <button
                  type="button"
                  onClick={() => {
                    const q = Math.max(1, qty - 1);
                    setQty(q);
                    setQtyInput(q.toLocaleString('id-ID'));
                  }}
                  className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold border-r border-slate-200"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="text"
                  value={qtyInput}
                  onChange={handleQtyChange}
                  className="w-full text-center py-2 font-mono font-extrabold text-sm text-slate-900 outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const q = qty + 1;
                    setQty(q);
                    setQtyInput(q.toLocaleString('id-ID'));
                  }}
                  className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold border-l border-slate-200"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Satuan */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 text-xs block">
                Satuan Kemasan
              </label>
              <select
                value={satuan}
                onChange={(e) => setSatuan(e.target.value)}
                className="w-full py-2.5 px-3 border border-slate-300 rounded-xl bg-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
              >
                <option value="Pcs">Pcs (Satuan)</option>
                <option value="Pack">Pack</option>
                <option value="Roll">Roll</option>
                <option value="Box">Box / Dus</option>
                <option value="Ikat">Ikat</option>
                <option value="Kg">Kg</option>
                <option value="Meter">Meter</option>
              </select>
            </div>

            {/* Harga Beli Satuan */}
            <div className="space-y-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 text-xs flex items-center space-x-1">
                  <span>Harga Beli Pokok Satuan (Rp)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setCalcTarget('harga');
                    setCalcDisplay(String(hargaBeli));
                    setIsCalcOpen(true);
                  }}
                  className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center space-x-1"
                >
                  <Calculator className="w-3 h-3" />
                  <span>Kalkulator</span>
                </button>
              </div>

              <div className="relative flex items-center border border-slate-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-700/20 focus-within:border-emerald-700">
                <span className="pl-3.5 pr-1 font-mono font-bold text-slate-400 text-xs">Rp</span>
                <input
                  type="text"
                  value={hargaInput}
                  onChange={handleHargaChange}
                  className="w-full py-2 pr-3 font-mono font-extrabold text-sm text-slate-900 outline-none"
                />
              </div>
            </div>

            {/* Diskon Item */}
            <div className="space-y-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 text-xs">
                  Potongan Diskon Item (Opsional)
                </label>
                <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setDiskonType('rp')}
                    className={`px-2 py-0.5 rounded ${
                      diskonType === 'rp' ? 'bg-white text-emerald-950 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Nominal (Rp)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiskonType('persen')}
                    className={`px-2 py-0.5 rounded ${
                      diskonType === 'persen' ? 'bg-white text-emerald-950 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Persen (%)
                  </button>
                </div>
              </div>

              {diskonType === 'rp' ? (
                <div className="relative flex items-center border border-slate-300 rounded-xl overflow-hidden">
                  <span className="pl-3.5 pr-1 font-mono font-bold text-slate-400 text-xs">Rp</span>
                  <input
                    type="text"
                    value={diskonRpInput}
                    onChange={handleDiskonRpChange}
                    placeholder="0"
                    className="w-full py-2 pr-3 font-mono font-semibold text-xs text-slate-900 outline-none"
                  />
                </div>
              ) : (
                <div className="relative flex items-center border border-slate-300 rounded-xl overflow-hidden">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={diskonPersen || ''}
                    onChange={(e) => setDiskonPersen(Math.min(100, Math.max(0, Number(e.target.value))))}
                    placeholder="0"
                    className="w-full py-2 pl-3.5 pr-8 font-mono font-semibold text-xs text-slate-900 outline-none"
                  />
                  <span className="absolute right-3 font-bold text-slate-400 text-xs">%</span>
                </div>
              )}
            </div>

            {/* Catatan Item */}
            <div className="space-y-1 sm:col-span-2">
              <label className="font-bold text-slate-700 text-xs">
                Catatan Khusus Barang (Ukuran, Flute, Gramasi, Supplier Ref)
              </label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: Kualitas super tebal, double wall, cetak logo FAG"
                className="w-full py-2 px-3 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
              />
            </div>
          </div>

          {/* Calculator Popup Drawer */}
          {isCalcOpen && (
            <div className="p-3.5 bg-slate-900 text-white rounded-2xl space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1">
                  <Calculator className="w-3 h-3" />
                  <span>Kalkulator Bawaan ({calcTarget === 'qty' ? 'Kuantitas' : 'Harga Beli'})</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsCalcOpen(false)}
                  className="text-slate-400 hover:text-white text-xs font-bold"
                >
                  Tutup &times;
                </button>
              </div>

              <div className="bg-slate-800 p-2.5 rounded-xl text-right">
                <div className="text-[10px] text-slate-400 font-mono h-4">{calcFormula}</div>
                <div className="text-xl font-mono font-bold text-emerald-300">{calcDisplay}</div>
              </div>

              <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                {['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', 'C', '0', '=', '+'].map((btn) => (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => {
                      if (btn === 'C') handleCalcClear();
                      else if (btn === '=') handleCalcEqual();
                      else if (['+', '-', '×', '÷'].includes(btn)) handleCalcOp(btn);
                      else handleCalcNumber(btn);
                    }}
                    className={`py-2 rounded-lg transition active:scale-95 ${
                      btn === '='
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white col-span-1 font-black'
                        : btn === 'C'
                        ? 'bg-rose-900/60 hover:bg-rose-800 text-rose-200'
                        : ['+', '-', '×', '÷'].includes(btn)
                        ? 'bg-slate-700 hover:bg-slate-600 text-emerald-300'
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                  >
                    {btn}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subtotal & Netto Summary Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Subtotal Kotor ({qty.toLocaleString('id-ID')} {satuan} &times; Rp {hargaBeli.toLocaleString('id-ID')}):</span>
              <span className="font-mono font-bold text-slate-800">
                Rp {subtotal.toLocaleString('id-ID')}
              </span>
            </div>
            {effectiveDiskon > 0 && (
              <div className="flex justify-between text-xs text-rose-600 font-medium">
                <span>Diskon Pembelian:</span>
                <span className="font-mono font-bold">- Rp {effectiveDiskon.toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
              <span className="font-extrabold text-xs text-slate-900">Total Nilai Bersih:</span>
              <span className="font-mono font-black text-base text-emerald-950">
                Rp {totalNetto.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
          <div>
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Hapus barang ${item.nama} dari daftar rincian?`)) {
                    onDelete();
                    onClose();
                  }
                }}
                className="apple-btn-secondary px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border-rose-200 flex items-center space-x-1"
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
              className="apple-btn-subtle px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="apple-btn-primary px-5 py-2 text-xs font-bold flex items-center space-x-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Simpan Rincian</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
