'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  DollarSign,
  Check,
  AlertCircle,
  Building2,
  Calendar,
  FileText,
  Coins,
  Receipt,
  User,
  ShoppingBag,
  Percent,
} from 'lucide-react';
import ModernDatePicker from './ModernDatePicker';

/**
 * DownPaymentModal (Accurate Online Workflow Standard):
 * Supports creating Down Payment from:
 * 1. Pesanan Penjualan (PO / Sales Order)
 * 2. Faktur Penjualan (SI / Sales Invoice)
 * 3. Uang Muka Langsung / Deposit Pelanggan (Bebas)
 */
export default function DownPaymentModal({
  isOpen,
  onClose,
  initialDoc = null,
  initialSource = 'PO',
  customers = [],
  salesOrders = [],
  salesInvoices = [],
  accounts = [],
  companySettings = {},
  onSubmitPayment,
}) {
  const [sourceType, setSourceType] = useState('PO'); // 'PO' | 'SI' | 'DEPOSIT'
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [manualRef, setManualRef] = useState('');

  const [amount, setAmount] = useState(0);
  const [amountInput, setAmountInput] = useState('0');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('TRANSFER');
  const [catatan, setCatatan] = useState('');
  const [isTaxable, setIsTaxable] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Initialize or reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setDate(new Date().toISOString().split('T')[0]);

      // Default Bank BCA or first Kas/Bank account
      const bankAcc = accounts.find((a) => a.kode_akun === '1102-01') || accounts.find((a) => a.tipe_akun === 'Kas & Bank') || accounts[0];
      if (bankAcc) setAccountId(bankAcc.id);
      setPaymentMethod('TRANSFER');

      if (initialDoc) {
        // If pre-passed an existing order or invoice
        if (initialDoc.no_pesanan) {
          // It's a PO
          setSourceType('PO');
          setSelectedCustomerId(initialDoc.customer_id || '');
          setSelectedOrderId(initialDoc.id || '');
          setSelectedInvoiceId('');
          const totalOrder = Number(initialDoc.total || 0);
          const existingDP = Number(initialDoc.uang_muka || 0);
          const sisa = Math.max(0, totalOrder - existingDP);
          const defNominal = existingDP === 0 ? Math.round(totalOrder * 0.5) : sisa;
          setAmount(defNominal);
          setAmountInput(defNominal > 0 ? defNominal.toLocaleString('id-ID') : '0');
          setCatatan(`Penerimaan Uang Muka untuk Pesanan ${initialDoc.no_pesanan}`);
        } else if (initialDoc.no_invoice) {
          // It's an SI
          setSourceType('SI');
          setSelectedCustomerId(initialDoc.customer_id || '');
          setSelectedInvoiceId(initialDoc.id || '');
          setSelectedOrderId('');
          const totalSI = Number(initialDoc.total_akhir || 0);
          const paidSI = Number(initialDoc.bayar || 0);
          const sisa = Math.max(0, totalSI - paidSI);
          setAmount(sisa);
          setAmountInput(sisa > 0 ? sisa.toLocaleString('id-ID') : '0');
          setCatatan(`Pembayaran Uang Muka / Cicilan Faktur ${initialDoc.no_invoice}`);
        }
      } else {
        // Default mode from tab: pick initial source
        setSourceType(initialSource || 'PO');
        // Pick first customer if available
        if (customers.length > 0) {
          setSelectedCustomerId(customers[0].id);
        }
        setSelectedOrderId('');
        setSelectedInvoiceId('');
        setAmount(0);
        setAmountInput('0');
        setCatatan('Penerimaan Uang Muka Penjualan');
      }
    }
  }, [isOpen, initialDoc, initialSource, accounts, customers]);

  // Active customer object
  const activeCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Filtered pending POs for active customer
  const customerPOs = useMemo(() => {
    if (!selectedCustomerId) return salesOrders;
    return salesOrders.filter((o) => o.customer_id === selectedCustomerId);
  }, [salesOrders, selectedCustomerId]);

  // Filtered unpaid/partial Invoices for active customer
  const customerInvoices = useMemo(() => {
    if (!selectedCustomerId) return salesInvoices;
    return salesInvoices.filter((i) => i.customer_id === selectedCustomerId);
  }, [salesInvoices, selectedCustomerId]);

  // Active document object
  const activeOrder = useMemo(() => {
    return salesOrders.find((o) => o.id === selectedOrderId) || null;
  }, [salesOrders, selectedOrderId]);

  const activeInvoice = useMemo(() => {
    return salesInvoices.find((i) => i.id === selectedInvoiceId) || null;
  }, [salesInvoices, selectedInvoiceId]);

  // When PO changes
  const handleSelectPO = (poId) => {
    setSelectedOrderId(poId);
    setErrorMsg('');
    const po = salesOrders.find((o) => o.id === poId);
    if (po) {
      if (po.customer_id) setSelectedCustomerId(po.customer_id);
      const totalOrder = Number(po.total || 0);
      const existingDP = Number(po.uang_muka || 0);
      const sisa = Math.max(0, totalOrder - existingDP);
      const defNominal = existingDP === 0 ? Math.round(totalOrder * 0.5) : sisa;
      setAmount(defNominal);
      setAmountInput(defNominal > 0 ? defNominal.toLocaleString('id-ID') : '0');
      setCatatan(`Penerimaan Uang Muka untuk Pesanan ${po.no_pesanan}`);
    }
  };

  // When Invoice changes
  const handleSelectInvoice = (invId) => {
    setSelectedInvoiceId(invId);
    setErrorMsg('');
    const inv = salesInvoices.find((i) => i.id === invId);
    if (inv) {
      if (inv.customer_id) setSelectedCustomerId(inv.customer_id);
      const totalSI = Number(inv.total_akhir || 0);
      const paidSI = Number(inv.bayar || 0);
      const sisa = Math.max(0, totalSI - paidSI);
      setAmount(sisa);
      setAmountInput(sisa > 0 ? sisa.toLocaleString('id-ID') : '0');
      setCatatan(`Pembayaran Uang Muka / Cicilan Faktur ${inv.no_invoice}`);
    }
  };

  // When source type tab changes
  const handleSourceTypeChange = (type) => {
    setSourceType(type);
    setErrorMsg('');
    if (type === 'PO') {
      const firstPo = customerPOs[0];
      if (firstPo) handleSelectPO(firstPo.id);
    } else if (type === 'SI') {
      const firstInv = customerInvoices[0];
      if (firstInv) handleSelectInvoice(firstInv.id);
    } else {
      setSelectedOrderId('');
      setSelectedInvoiceId('');
      setCatatan(`Deposit / Uang Muka Pelanggan ${activeCustomer?.nama || ''}`);
    }
  };

  // Calculate active doc figures
  let totalDoc = 0;
  let alreadyPaid = 0;
  if (sourceType === 'PO' && activeOrder) {
    totalDoc = Number(activeOrder.total || 0);
    alreadyPaid = Number(activeOrder.uang_muka || 0);
  } else if (sourceType === 'SI' && activeInvoice) {
    totalDoc = Number(activeInvoice.total_akhir || 0);
    alreadyPaid = Number(activeInvoice.bayar || 0);
  }

  const sisaSebelumBayar = Math.max(0, totalDoc - alreadyPaid);
  const sisaSetelahBayar = Math.max(0, sisaSebelumBayar - (Number(amount) || 0));

  const handleAmountChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      setAmountInput('');
      setAmount(0);
      return;
    }
    const num = parseInt(raw, 10);
    setAmount(num);
    setAmountInput(num.toLocaleString('id-ID'));
    if (errorMsg) setErrorMsg('');
  };

  const setPresetAmount = (val) => {
    const rounded = Math.max(0, Math.round(val));
    setAmount(rounded);
    setAmountInput(rounded.toLocaleString('id-ID'));
    if (errorMsg) setErrorMsg('');
  };

  const addNominal = (val) => {
    const nextVal = (Number(amount) || 0) + val;
    setAmount(nextVal);
    setAmountInput(nextVal.toLocaleString('id-ID'));
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setErrorMsg('Nominal uang muka harus lebih dari Rp 0');
      return;
    }
    if (!selectedCustomerId) {
      setErrorMsg('Pilih pelanggan terlebih dahulu');
      return;
    }
    if (sourceType === 'PO' && !selectedOrderId) {
      setErrorMsg('Pilih Pesanan Penjualan (PO) yang akan dibayar uang mukanya');
      return;
    }
    if (sourceType === 'SI' && !selectedInvoiceId) {
      setErrorMsg('Pilih Invoice yang akan dibayar');
      return;
    }
    if (!accountId) {
      setErrorMsg('Pilih akun Kas/Bank untuk menyetor pembayaran');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitPayment({
        sourceType, // 'PO' | 'SI' | 'DEPOSIT'
        customerId: selectedCustomerId,
        customerName: activeCustomer?.nama || 'Pelanggan Umum',
        orderId: sourceType === 'PO' ? selectedOrderId : null,
        noPesanan: sourceType === 'PO' ? activeOrder?.no_pesanan : null,
        invoiceId: sourceType === 'SI' ? selectedInvoiceId : null,
        noFaktur: sourceType === 'SI' ? activeInvoice?.no_invoice : null,
        manualRef: sourceType === 'DEPOSIT' ? manualRef : null,
        amount: Number(amount),
        date,
        accountId,
        paymentMethod,
        isTaxable,
        taxAmount: isTaxable ? Math.round(Number(amount) * 0.11) : 0,
        catatan,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menyimpan pembayaran uang muka');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Header (Accurate Online Dark Green) */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#0A3828] to-[#0D4A35] text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <Coins className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                Penerimaan Uang Muka Penjualan (DP)
              </h3>
              <p className="text-xs text-emerald-200/90 font-medium">
                FAG Kemasan • Terhubung Database &amp; Jurnal Finansial
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-emerald-200 hover:text-white rounded-lg hover:bg-emerald-800/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto">
          {/* TAB PILIHAN SUMBER DP (PO vs FAKTUR vs DEPOSIT) */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wide text-[11px]">
              Pilih Sumber Transaksi Uang Muka:
            </label>
            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => handleSourceTypeChange('PO')}
                className={`py-2 px-2.5 rounded-md text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                  sourceType === 'PO'
                    ? 'bg-[#0A3828] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span className="truncate">Pesanan (PO)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSourceTypeChange('SI')}
                className={`py-2 px-2.5 rounded-md text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                  sourceType === 'SI'
                    ? 'bg-[#0A3828] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span className="truncate">Invoice</span>
              </button>

              <button
                type="button"
                onClick={() => handleSourceTypeChange('DEPOSIT')}
                className={`py-2 px-2.5 rounded-md text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                  sourceType === 'DEPOSIT'
                    ? 'bg-[#0A3828] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span className="truncate">Deposit Bebas</span>
              </button>
            </div>
          </div>

          {/* PILIH PELANGGAN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Pelanggan Kemasan *
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  setSelectedOrderId('');
                  setSelectedInvoiceId('');
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white outline-none focus:ring-1 focus:ring-emerald-700"
              >
                <option value="">-- Pilih Pelanggan --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nama} {c.telepon ? `(${c.telepon})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* DOKUMEN REFERENSI SESUAI SUMBER */}
            <div>
              {sourceType === 'PO' && (
                <>
                  <label className="block font-bold text-slate-700 mb-1">
                    Pilih Pesanan Penjualan (PO) *
                  </label>
                  <select
                    value={selectedOrderId}
                    onChange={(e) => handleSelectPO(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white outline-none focus:ring-1 focus:ring-emerald-700"
                  >
                    <option value="">-- Pilih No. Pesanan (PO) --</option>
                    {customerPOs.map((po) => {
                      const sisa = Math.max(0, Number(po.total || 0) - Number(po.uang_muka || 0));
                      return (
                        <option key={po.id} value={po.id}>
                          {po.no_pesanan} • Sisa: Rp {sisa.toLocaleString('id-ID')}
                        </option>
                      );
                    })}
                  </select>
                </>
              )}

              {sourceType === 'SI' && (
                <>
                  <label className="block font-bold text-slate-700 mb-1">
                    Pilih Invoice *
                  </label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => handleSelectInvoice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white outline-none focus:ring-1 focus:ring-emerald-700"
                  >
                    <option value="">-- Pilih Invoice --</option>
                    {customerInvoices.map((inv) => {
                      const sisa = Math.max(0, Number(inv.total_akhir || 0) - Number(inv.bayar || 0));
                      return (
                        <option key={inv.id} value={inv.id}>
                          {inv.no_invoice} • Piutang: Rp {sisa.toLocaleString('id-ID')}
                        </option>
                      );
                    })}
                  </select>
                </>
              )}

              {sourceType === 'DEPOSIT' && (
                <>
                  <label className="block font-bold text-slate-700 mb-1">
                    No. PO / Ref. Manual (Opsional)
                  </label>
                  <input
                    type="text"
                    value={manualRef}
                    onChange={(e) => setManualRef(e.target.value)}
                    placeholder="Contoh: PO-KLIEN-0812 / Deposit Proyek"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </>
              )}
            </div>
          </div>

          {/* DOKUMEN RINGKASAN NILAI JIKA TERPILIH */}
          {sourceType !== 'DEPOSIT' && totalDoc > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wide block">
                  {sourceType === 'PO' ? 'Total Pesanan' : 'Total Invoice'}
                </span>
                <span className="font-bold font-mono text-slate-900 text-xs">
                  Rp {totalDoc.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="border-x border-slate-200 px-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wide block">
                  {sourceType === 'PO' ? 'DP Terbayar' : 'Sudah Dicicil'}
                </span>
                <span className="font-bold font-mono text-emerald-700 text-xs">
                  Rp {alreadyPaid.toLocaleString('id-ID')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wide block">Sisa Belum Lunas</span>
                <span className="font-bold font-mono text-amber-900 text-xs">
                  Rp {sisaSebelumBayar.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          )}

          {/* NOMINAL UANG MUKA / BAYAR SEKARANG */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">
                Nominal Uang Muka / Bayar Sekarang (Rp) *
              </label>
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Format Titik Otomatis
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={amountInput}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full pl-10 pr-3 py-2 border-2 border-emerald-600 rounded-lg text-base font-black text-slate-900 font-mono outline-none focus:ring-2 focus:ring-emerald-500/20"
                autoFocus
              />
            </div>

            {/* QUICK PRESET BUTTONS */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] text-slate-400 font-medium">Preset:</span>
              {sourceType !== 'DEPOSIT' && sisaSebelumBayar > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setPresetAmount(sisaSebelumBayar * 0.3)}
                    className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-emerald-600 hover:text-white rounded border border-slate-200 transition"
                  >
                    30% DP
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetAmount(sisaSebelumBayar * 0.5)}
                    className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white rounded border border-emerald-200 transition"
                  >
                    50% DP
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetAmount(sisaSebelumBayar)}
                    className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-800 hover:bg-blue-600 hover:text-white rounded border border-blue-200 transition"
                  >
                    Lunas 100%
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => addNominal(500000)}
                className="px-2 py-0.5 text-[10px] font-semibold bg-slate-50 text-slate-600 hover:bg-slate-200 rounded border border-slate-200"
              >
                + 500 rb
              </button>
              <button
                type="button"
                onClick={() => addNominal(1000000)}
                className="px-2 py-0.5 text-[10px] font-semibold bg-slate-50 text-slate-600 hover:bg-slate-200 rounded border border-slate-200"
              >
                + 1 jt
              </button>
              <button
                type="button"
                onClick={() => addNominal(5000000)}
                className="px-2 py-0.5 text-[10px] font-semibold bg-slate-50 text-slate-600 hover:bg-slate-200 rounded border border-slate-200"
              >
                + 5 jt
              </button>
            </div>
          </div>

          {/* CHECKBOX PPN / TAX (ACCURATE ONLINE STYLE) */}
          <div className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <input
              type="checkbox"
              id="dpTaxCheckbox"
              checked={isTaxable}
              onChange={(e) => setIsTaxable(e.target.checked)}
              className="w-4 h-4 text-emerald-700 rounded border-slate-300 focus:ring-emerald-600 cursor-pointer"
            />
            <label htmlFor="dpTaxCheckbox" className="font-semibold text-slate-800 cursor-pointer select-none">
              Kena Pajak PPN (11%)
            </label>
            {isTaxable && (
              <span className="text-[11px] text-emerald-800 font-mono ml-auto">
                PPN: Rp {Math.round((Number(amount) || 0) * 0.11).toLocaleString('id-ID')}
              </span>
            )}
          </div>

          {/* AKUN KAS/BANK & METODE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Disetor ke Akun Kas / Bank *
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white outline-none focus:ring-1 focus:ring-emerald-700"
              >
                {accounts
                  .filter((a) => a.tipe_akun === 'Kas & Bank' || a.kode_akun?.startsWith('1101') || a.kode_akun?.startsWith('1102'))
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.kode_akun} - {acc.nama_akun}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Metode Pembayaran
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white outline-none focus:ring-1 focus:ring-emerald-700"
              >
                <option value="TRANSFER">Transfer Bank (BCA / Mandiri)</option>
                <option value="TUNAI">Tunai / Cash Kasir</option>
                <option value="QRIS">QRIS / E-Wallet</option>
                <option value="GIRO">Cek / Bilyet Giro</option>
              </select>
            </div>
          </div>

          {/* TANGGAL PEMBAYARAN */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Tanggal Penerimaan Uang Muka
            </label>
            <ModernDatePicker value={date} onChange={(val) => setDate(val)} />
          </div>

          {/* KETERANGAN PEMBAYARAN */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Catatan / Keterangan Kuitansi
            </label>
            <input
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: DP 50% pesanan kardus via transfer BCA..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          {/* PREVIEW JURNAL KEUANGAN (GAAP/PSAK ACCURATE ONLINE) */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-2.5 text-[11px] space-y-1">
            <span className="font-bold text-emerald-950 block">Otomatis Masuk Jurnal Akuntansi Supabase:</span>
            <div className="flex justify-between text-slate-600">
              <span>(Debit) Kas & Bank:</span>
              <strong className="font-mono text-emerald-900">+Rp {Number(amount || 0).toLocaleString('id-ID')}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>
                (Kredit) {sourceType === 'SI' ? 'Piutang Usaha (1103-01)' : 'Uang Muka Penjualan (2103-01)'}:
              </span>
              <strong className="font-mono text-emerald-900">-Rp {Number(amount || 0).toLocaleString('id-ID')}</strong>
            </div>
            {isTaxable && (
              <div className="flex justify-between text-slate-600">
                <span>(Kredit) Hutang Pajak PPN (2102-01):</span>
                <strong className="font-mono text-emerald-900">
                  -Rp {Math.round(Number(amount || 0) * 0.11).toLocaleString('id-ID')}
                </strong>
              </div>
            )}
            <div className="pt-1 border-t border-emerald-200/60 text-[10px] text-emerald-800">
              *Uang Muka Penjualan akan otomatis memotong tagihan saat dibuatkan Invoice.
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* FOOTER BUTTONS */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#0A3828] hover:bg-[#06281D] text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-xs disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Penerimaan Uang Muka'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
