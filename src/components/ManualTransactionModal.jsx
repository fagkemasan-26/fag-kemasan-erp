'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Wallet,
  FileText,
  Plus,
  Trash2,
  Sparkles,
  Info,
  Printer,
} from 'lucide-react';
import { peekNextDocNumber, getNextDocNumber, createJournalEntry } from '../lib/accounting';

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

const QUICK_NOMINALS = [
  { label: '50 rb', val: 50000 },
  { label: '100 rb', val: 100000 },
  { label: '500 rb', val: 500000 },
  { label: '1 jt', val: 1000000 },
  { label: '2,5 jt', val: 2500000 },
  { label: '5 jt', val: 5000000 },
  { label: '10 jt', val: 10000000 },
];

export default function ManualTransactionModal({
  isOpen,
  onClose,
  accounts = [],
  accountBalances = {},
  onTransactionSaved,
  initialMode = 'KAS_MASUK',
  initialAccountId = null,
}) {
  const [activeTab, setActiveTab] = useState(initialMode); // 'KAS_MASUK' | 'KAS_KELUAR' | 'TRANSFER' | 'JURNAL_UMUM'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for Kas Masuk / Kas Keluar / Transfer
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [docNumber, setDocNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedKasBankId, setSelectedKasBankId] = useState('');
  const [selectedContraAccountId, setSelectedContraAccountId] = useState('');
  const [transferTargetKasBankId, setTransferTargetKasBankId] = useState('');
  const [shouldPrintVoucher, setShouldPrintVoucher] = useState(false);

  // Form state for Jurnal Umum Manual (multi-line)
  const [journalLines, setJournalLines] = useState([
    { accountId: '', debit: '', kredit: '', note: '' },
    { accountId: '', debit: '', kredit: '', note: '' },
  ]);

  // Filter accounts by type
  const kasBankAccounts = useMemo(() => {
    return accounts.filter((a) => a.tipe_akun === 'Kas & Bank');
  }, [accounts]);

  const nonKasAccounts = useMemo(() => {
    return accounts.filter((a) => a.tipe_akun !== 'Kas & Bank');
  }, [accounts]);

  // Sync initial account or tab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode || 'KAS_MASUK');
      const today = new Date().toISOString().split('T')[0];
      setFormDate(today);

      // Default Kas/Bank: use initialAccountId or first available
      const defaultKas = initialAccountId || (kasBankAccounts[1]?.id || kasBankAccounts[0]?.id || '');
      setSelectedKasBankId(defaultKas);

      // Default target for transfer
      const targetKas = kasBankAccounts.find((k) => k.id !== defaultKas)?.id || '';
      setTransferTargetKasBankId(targetKas);

      // Default contra account based on mode
      if (initialMode === 'KAS_MASUK') {
        const modalAcc = accounts.find((a) => a.kode_akun === '3101-01'); // Modal Pemilik
        setSelectedContraAccountId(modalAcc?.id || nonKasAccounts[0]?.id || '');
        setDescription('Uang masuk dari Fauzan Ghani (Setoran Modal Pemilik)');
        setAmount('');
        fetchDocNumber('KM', today);
      } else if (initialMode === 'KAS_KELUAR') {
        const bebanAcc = accounts.find((a) => a.kode_akun === '6101-03'); // Beban Operasional
        setSelectedContraAccountId(bebanAcc?.id || nonKasAccounts[0]?.id || '');
        setDescription('Biaya Operasional Toko / Pengemasan');
        setAmount('');
        fetchDocNumber('KK', today);
      } else if (initialMode === 'TRANSFER') {
        setDescription('Transfer Kas dari Rekening Bank ke Kasir');
        setAmount('');
        fetchDocNumber('TR', today);
      } else {
        fetchDocNumber('JU', today);
      }
    }
  }, [isOpen, initialMode, initialAccountId, accounts, kasBankAccounts, nonKasAccounts]);

  const fetchDocNumber = async (prefix, date) => {
    try {
      const next = await peekNextDocNumber(prefix, date);
      setDocNumber(next);
    } catch {
      setDocNumber(`${prefix}.${date.replace(/-/g, '.')}.0001`);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'KAS_MASUK') {
      const modalAcc = accounts.find((a) => a.kode_akun === '3101-01');
      setSelectedContraAccountId(modalAcc?.id || nonKasAccounts[0]?.id || '');
      setDescription('Uang masuk dari Fauzan Ghani (Setoran Modal Pemilik)');
      fetchDocNumber('KM', formDate);
    } else if (tab === 'KAS_KELUAR') {
      const bebanAcc = accounts.find((a) => a.kode_akun === '6101-03');
      setSelectedContraAccountId(bebanAcc?.id || nonKasAccounts[0]?.id || '');
      setDescription('Biaya Operasional Toko / Pengemasan');
      fetchDocNumber('KK', formDate);
    } else if (tab === 'TRANSFER') {
      setDescription('Transfer dana Kas & Bank');
      fetchDocNumber('TR', formDate);
    } else if (tab === 'JURNAL_UMUM') {
      fetchDocNumber('JU', formDate);
    }
  };

  // Live account balance helper
  const getAccBalance = (accId) => {
    const b = accountBalances[accId];
    return b ? b.saldoAkhir : 0;
  };

  // Selected account objects
  const selectedKasAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedKasBankId);
  }, [accounts, selectedKasBankId]);

  const selectedContraAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedContraAccountId);
  }, [accounts, selectedContraAccountId]);

  const selectedTransferTargetAccount = useMemo(() => {
    return accounts.find((a) => a.id === transferTargetKasBankId);
  }, [accounts, transferTargetKasBankId]);

  // Numeric amount
  const numAmount = Number(amount) || 0;

  const handleAmountChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    setAmount(raw);
  };

  // Calculation for live preview balances
  const kasCurrentBalance = selectedKasAccount ? getAccBalance(selectedKasAccount.id) : 0;
  const kasProjectedBalance = useMemo(() => {
    if (activeTab === 'KAS_MASUK') return kasCurrentBalance + numAmount;
    if (activeTab === 'KAS_KELUAR') return kasCurrentBalance - numAmount;
    if (activeTab === 'TRANSFER') return kasCurrentBalance - numAmount;
    return kasCurrentBalance;
  }, [activeTab, kasCurrentBalance, numAmount]);

  const targetKasCurrentBalance = selectedTransferTargetAccount ? getAccBalance(selectedTransferTargetAccount.id) : 0;
  const targetKasProjectedBalance = targetKasCurrentBalance + numAmount;

  // Multi-line calculations for Jurnal Umum
  const totalDebitJu = useMemo(() => {
    return journalLines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  }, [journalLines]);

  const totalKreditJu = useMemo(() => {
    return journalLines.reduce((sum, line) => sum + (Number(line.kredit) || 0), 0);
  }, [journalLines]);

  const isJuBalanced = Math.abs(totalDebitJu - totalKreditJu) < 0.01 && totalDebitJu > 0;

  const handleAddJuLine = () => {
    setJournalLines((prev) => [...prev, { accountId: '', debit: '', kredit: '', note: '' }]);
  };

  const handleRemoveJuLine = (idx) => {
    if (journalLines.length <= 2) return;
    setJournalLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleJuLineChange = (idx, field, value) => {
    setJournalLines((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  // Submission handler
  const handleSubmit = async (e, forcePrint = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubmitting) return;

    const willPrint = Boolean(forcePrint || shouldPrintVoucher);

    try {
      setIsSubmitting(true);

      if (activeTab === 'KAS_MASUK') {
        if (!selectedKasAccount) throw new Error('Pilih rekening Kas & Bank tujuan.');
        if (!selectedContraAccount) throw new Error('Pilih akun sumber dana / lawan.');
        if (numAmount <= 0) throw new Error('Masukkan nominal uang masuk yang valid.');

        const realDocNo = await getNextDocNumber('KM', formDate);

        await createJournalEntry({
          noJurnal: `JU.${realDocNo}`,
          tanggal: formDate,
          tipeTransaksi: 'PENERIMAAN_KAS',
          noReferensi: realDocNo,
          keterangan: description || `Penerimaan kas ke ${selectedKasAccount.nama_akun}`,
          details: [
            {
              kodeAkun: selectedKasAccount.kode_akun,
              akunId: selectedKasAccount.id,
              debit: numAmount,
              kredit: 0,
              catatan: `Uang Masuk ke ${selectedKasAccount.nama_akun}`,
            },
            {
              kodeAkun: selectedContraAccount.kode_akun,
              akunId: selectedContraAccount.id,
              debit: 0,
              kredit: numAmount,
              catatan: `Penerimaan dari ${selectedContraAccount.nama_akun}`,
            },
          ],
        });

        if (onTransactionSaved) {
          onTransactionSaved({
            type: 'KAS_MASUK',
            docNo: realDocNo,
            date: formDate,
            amount: numAmount,
            sourceAccountName: selectedKasAccount.nama_akun,
            targetAccountName: selectedContraAccount.nama_akun,
            description: description || `Penerimaan kas ke ${selectedKasAccount.nama_akun}`,
            recipientName: 'FAG Kemasan',
            printVoucher: willPrint,
          });
        }
      } else if (activeTab === 'KAS_KELUAR') {
        if (!selectedKasAccount) throw new Error('Pilih rekening Kas & Bank yang dipotong.');
        if (!selectedContraAccount) throw new Error('Pilih akun beban / keperluan.');
        if (numAmount <= 0) throw new Error('Masukkan nominal pengeluaran yang valid.');

        const realDocNo = await getNextDocNumber('KK', formDate);

        await createJournalEntry({
          noJurnal: `JU.${realDocNo}`,
          tanggal: formDate,
          tipeTransaksi: 'PENGELUARAN_KAS',
          noReferensi: realDocNo,
          keterangan: description || `Pengeluaran kas dari ${selectedKasAccount.nama_akun}`,
          details: [
            {
              kodeAkun: selectedContraAccount.kode_akun,
              akunId: selectedContraAccount.id,
              debit: numAmount,
              kredit: 0,
              catatan: `Beban/Keperluan: ${selectedContraAccount.nama_akun}`,
            },
            {
              kodeAkun: selectedKasAccount.kode_akun,
              akunId: selectedKasAccount.id,
              debit: 0,
              kredit: numAmount,
              catatan: `Potong Saldo Kas/Bank: ${selectedKasAccount.nama_akun}`,
            },
          ],
        });

        if (onTransactionSaved) {
          onTransactionSaved({
            type: 'KAS_KELUAR',
            docNo: realDocNo,
            date: formDate,
            amount: numAmount,
            sourceAccountName: selectedKasAccount.nama_akun,
            targetAccountName: selectedContraAccount.nama_akun,
            description: description || `Pengeluaran kas dari ${selectedKasAccount.nama_akun}`,
            recipientName: description || 'Karyawan / Pihak Terkait',
            printVoucher: willPrint,
          });
        }
      } else if (activeTab === 'TRANSFER') {
        if (!selectedKasAccount) throw new Error('Pilih rekening asal transfer.');
        if (!selectedTransferTargetAccount) throw new Error('Pilih rekening tujuan transfer.');
        if (selectedKasAccount.id === selectedTransferTargetAccount.id) {
          throw new Error('Rekening asal dan tujuan tidak boleh sama.');
        }
        if (numAmount <= 0) throw new Error('Masukkan nominal transfer yang valid.');

        const realDocNo = await getNextDocNumber('TR', formDate);

        await createJournalEntry({
          noJurnal: `JU.${realDocNo}`,
          tanggal: formDate,
          tipeTransaksi: 'TRANSFER_KAS',
          noReferensi: realDocNo,
          keterangan: description || `Transfer dari ${selectedKasAccount.nama_akun} ke ${selectedTransferTargetAccount.nama_akun}`,
          details: [
            {
              kodeAkun: selectedTransferTargetAccount.kode_akun,
              akunId: selectedTransferTargetAccount.id,
              debit: numAmount,
              kredit: 0,
              catatan: `Masuk ke ${selectedTransferTargetAccount.nama_akun}`,
            },
            {
              kodeAkun: selectedKasAccount.kode_akun,
              akunId: selectedKasAccount.id,
              debit: 0,
              kredit: numAmount,
              catatan: `Potong dari ${selectedKasAccount.nama_akun}`,
            },
          ],
        });

        if (onTransactionSaved) {
          onTransactionSaved({
            type: 'TRANSFER',
            docNo: realDocNo,
            amount: numAmount,
            from: selectedKasAccount.nama_akun,
            to: selectedTransferTargetAccount.nama_akun,
          });
        }
      } else if (activeTab === 'JURNAL_UMUM') {
        if (!isJuBalanced) throw new Error('Total Debit dan Total Kredit harus seimbang dan lebih dari 0.');

        const validLines = journalLines.filter((l) => l.accountId && (Number(l.debit) > 0 || Number(l.kredit) > 0));
        if (validLines.length < 2) throw new Error('Minimal harus ada 2 baris akun yang valid.');

        const realDocNo = await getNextDocNumber('JU', formDate);

        const details = validLines.map((l) => {
          const acc = accounts.find((a) => a.id === l.accountId);
          return {
            kodeAkun: acc?.kode_akun,
            akunId: acc?.id,
            debit: Number(l.debit) || 0,
            kredit: Number(l.kredit) || 0,
            catatan: l.note || description || 'Jurnal Umum Manual',
          };
        });

        await createJournalEntry({
          noJurnal: `JU.${realDocNo}`,
          tanggal: formDate,
          tipeTransaksi: 'JURNAL_UMUM',
          noReferensi: realDocNo,
          keterangan: description || 'Jurnal Penyesuaian / Umum Manual',
          details,
        });

        if (onTransactionSaved) {
          onTransactionSaved({
            type: 'JURNAL_UMUM',
            docNo: realDocNo,
            amount: totalDebitJu,
          });
        }
      }

      onClose();
    } catch (err) {
      alert(err.message || 'Gagal menyimpan transaksi jurnal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto">
        {/* Apple Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-emerald-50/30">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0A3828] text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight flex items-center gap-1.5">
                Catat Transaksi Kas &amp; Jurnal Manual
              </h3>
              <p className="text-xs text-slate-500">
                Pencatatan kas masuk, pemotongan saldo (biaya), mutasi antar rekening, dan jurnal penyesuaian.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Mode Selector */}
        <div className="px-5 pt-3.5 pb-2 bg-slate-50/70 border-b border-slate-100">
          <div className="bg-slate-200/80 p-1 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-1">
            <button
              type="button"
              onClick={() => handleTabChange('KAS_MASUK')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                activeTab === 'KAS_MASUK'
                  ? 'bg-white text-emerald-900 shadow-xs border border-emerald-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
              <span>Kas Masuk</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('KAS_KELUAR')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                activeTab === 'KAS_KELUAR'
                  ? 'bg-white text-rose-900 shadow-xs border border-rose-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
              <span>Kas Keluar</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('TRANSFER')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                activeTab === 'TRANSFER'
                  ? 'bg-white text-blue-900 shadow-xs border border-blue-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
              <span>Transfer Kas</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('JURNAL_UMUM')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                activeTab === 'JURNAL_UMUM'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>Jurnal Umum</span>
            </button>
          </div>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Top Row: Tanggal & No Dokumen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Tanggal Transaksi
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => {
                    setFormDate(e.target.value);
                    const pfx =
                      activeTab === 'KAS_MASUK'
                        ? 'KM'
                        : activeTab === 'KAS_KELUAR'
                        ? 'KK'
                        : activeTab === 'TRANSFER'
                        ? 'TR'
                        : 'JU';
                    fetchDocNumber(pfx, e.target.value);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                No. Dokumen / Referensi
              </label>
              <div className="relative">
                <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="Auto-generated nomor..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono font-bold text-emerald-950"
                />
              </div>
            </div>
          </div>

          {/* MODE 1: KAS MASUK (TAMBAH SALDO) */}
          {activeTab === 'KAS_MASUK' && (
            <div className="space-y-3.5 animate-in fade-in duration-100">
              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 flex items-start space-x-2.5">
                <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <div className="text-xs text-emerald-950">
                  <p className="font-bold">Mode Kas Masuk (Penerimaan Kas &amp; Bank)</p>
                  <p className="text-[11px] text-emerald-800 leading-relaxed mt-0.5">
                    Gunakan untuk mencatat uang masuk (seperti setoran modal Fauzan Ghani, atau penerimaan tunai/transfer lainnya). Saldo akun Kas/Bank pilihan Anda akan <strong>langsung bertambah</strong>.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Rekening Kas Tujuan */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Rekening Kas / Bank Tujuan (Masuk) *
                  </label>
                  <select
                    value={selectedKasBankId}
                    onChange={(e) => setSelectedKasBankId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-semibold"
                  >
                    {kasBankAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.kode_akun} - {a.nama_akun} (Saldo: Rp {getAccBalance(a.id).toLocaleString('id-ID')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Akun Sumber / Lawan (Kredit) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Sumber Dana / Kategori (Akun Lawan) *
                  </label>
                  <select
                    value={selectedContraAccountId}
                    onChange={(e) => setSelectedContraAccountId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-semibold"
                  >
                    <optgroup label="Pendapatan Usaha & Penjualan">
                      {accounts
                        .filter((a) => a.tipe_akun === 'Pendapatan' || a.tipe_akun === 'Pendapatan Lainnya')
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.kode_akun} - {a.nama_akun}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Ekuitas & Modal Pemilik">
                      {accounts
                        .filter((a) => a.tipe_akun === 'Ekuitas')
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.kode_akun} - {a.nama_akun}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Pelunasan Piutang">
                      {accounts
                        .filter((a) => a.tipe_akun === 'Piutang')
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.kode_akun} - {a.nama_akun}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Akun Lainnya">
                      {accounts
                        .filter((a) => a.tipe_akun !== 'Ekuitas' && a.tipe_akun !== 'Pendapatan' && a.tipe_akun !== 'Pendapatan Lainnya' && a.tipe_akun !== 'Piutang' && a.tipe_akun !== 'Kas & Bank')
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.kode_akun} - {a.nama_akun} ({a.tipe_akun})
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Jumlah Uang Masuk */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">
                    Jumlah Uang Masuk (Rp) *
                  </label>
                  {numAmount > 0 && (
                    <span className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {amount.length} digit
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amount ? Number(amount).toLocaleString('id-ID') : ''}
                    onChange={handleAmountChange}
                    placeholder="Contoh: 5.000.000"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono font-bold text-emerald-950"
                  />
                </div>
                {/* Ejaan Terbilang */}
                {numAmount > 0 && (
                  <p className="text-[11px] font-serif italic text-emerald-900 mt-1 pl-1">
                    # {angkaKeTerbilang(numAmount)} #
                  </p>
                )}
                {/* Pilihan Cepat Nominal */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 font-semibold mr-0.5">Pilihan Cepat:</span>
                  {QUICK_NOMINALS.map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setAmount(String(preset.val))}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold border border-slate-300 transition active:scale-95"
                    >
                      {preset.label}
                    </button>
                  ))}
                  {amount && (
                    <button
                      type="button"
                      onClick={() => setAmount('')}
                      className="px-2 py-0.5 text-rose-600 hover:bg-rose-50 rounded text-[10px] font-bold transition ml-auto"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Diterima Dari &amp; Keterangan *
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Uang masuk dari Fauzan Ghani"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-medium"
                />
              </div>

              {/* Ringkasan Totalan Uang Masuk */}
              {selectedKasAccount && numAmount > 0 && (
                <div className="bg-[#07291D] text-white rounded-xl p-3.5 shadow-xs space-y-2 border border-emerald-700/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-emerald-300 uppercase tracking-wider block">
                        TOTAL UANG MASUK
                      </span>
                      <span className="font-mono text-xl font-black text-white">
                        Rp {numAmount.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="sm:text-right text-xs">
                      <span className="text-[10px] text-emerald-300 uppercase block">Disetor ke Rekening:</span>
                      <p className="font-bold text-white">
                        {selectedKasAccount.nama_akun}
                      </p>
                      <p className="text-[10px] text-emerald-200 font-mono mt-0.5">
                        Saldo: Rp {kasCurrentBalance.toLocaleString('id-ID')} ➔ <strong className="text-emerald-300 font-bold">Rp {kasProjectedBalance.toLocaleString('id-ID')}</strong>
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] font-serif italic text-emerald-200 border-t border-emerald-800/80 pt-1.5">
                    # {angkaKeTerbilang(numAmount)} #
                  </p>
                </div>
              )}
            </div>
          )}

          {/* MODE 2: KAS KELUAR (POTONG SALDO) */}
          {activeTab === 'KAS_KELUAR' && (
            <div className="space-y-3.5 animate-in fade-in duration-100">
              <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-3 flex items-start space-x-2.5">
                <div className="w-6 h-6 rounded-md bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div className="text-xs text-rose-950">
                  <p className="font-bold">Mode Kas Keluar (Langsung Potong Saldo Kas &amp; Bank)</p>
                  <p className="text-[11px] text-rose-800 leading-relaxed mt-0.5">
                    Gunakan untuk mencatat biaya/pengeluaran toko. Saldo akun Kas/Bank pilihan Anda akan <strong>langsung terpotong</strong> sejumlah nominal yang Anda masukkan.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Rekening Kas Yang Dipotong */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Rekening Kas / Bank Yang Dipotong *
                  </label>
                  <select
                    value={selectedKasBankId}
                    onChange={(e) => setSelectedKasBankId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-700/20 focus:border-rose-700 font-semibold"
                  >
                    {kasBankAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.kode_akun} - {a.nama_akun} (Saldo: Rp {getAccBalance(a.id).toLocaleString('id-ID')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Akun Beban / Keperluan (Debit) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Keperluan / Akun Beban (Akun Lawan) *
                  </label>
                  <select
                    value={selectedContraAccountId}
                    onChange={(e) => setSelectedContraAccountId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-700/20 focus:border-rose-700 font-semibold"
                  >
                    <optgroup label="Beban Operasional & Administrasi">
                      {accounts
                        .filter((a) => a.tipe_akun === 'Beban')
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.kode_akun} - {a.nama_akun}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Beban Lainnya (Admin Bank, Pajak, dll)">
                      {accounts
                        .filter((a) => a.tipe_akun === 'Beban Lainnya')
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.kode_akun} - {a.nama_akun}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="HPP & Biaya Pembelian">
                      {accounts
                        .filter((a) => a.tipe_akun === 'HPP')
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.kode_akun} - {a.nama_akun}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Penarikan Modal / Prive">
                      {accounts
                        .filter((a) => a.tipe_akun === 'Ekuitas')
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.kode_akun} - {a.nama_akun} (Prive / Penarikan)
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Pembayaran Hutang Lancar">
                      {accounts
                        .filter((a) => a.tipe_akun === 'Hutang Lancar')
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.kode_akun} - {a.nama_akun}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Akun Lainnya">
                      {accounts
                        .filter(
                          (a) =>
                            a.tipe_akun !== 'Beban' &&
                            a.tipe_akun !== 'Beban Lainnya' &&
                            a.tipe_akun !== 'HPP' &&
                            a.tipe_akun !== 'Ekuitas' &&
                            a.tipe_akun !== 'Hutang Lancar' &&
                            a.tipe_akun !== 'Kas & Bank'
                        )
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.kode_akun} - {a.nama_akun} ({a.tipe_akun})
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Jumlah Pengeluaran */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">
                    Jumlah Pengeluaran / Potong Saldo (Rp) *
                  </label>
                  {numAmount > 0 && (
                    <span className="text-[10px] font-mono text-rose-800 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      {amount.length} digit
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amount ? Number(amount).toLocaleString('id-ID') : ''}
                    onChange={handleAmountChange}
                    placeholder="Contoh: 5.000.000"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-700/20 focus:border-rose-700 font-mono font-bold text-rose-950"
                  />
                </div>
                {/* Ejaan Terbilang */}
                {numAmount > 0 && (
                  <p className="text-[11px] font-serif italic text-rose-900 mt-1 pl-1">
                    # {angkaKeTerbilang(numAmount)} #
                  </p>
                )}
                {/* Pilihan Cepat Nominal */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 font-semibold mr-0.5">Pilihan Cepat:</span>
                  {QUICK_NOMINALS.map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setAmount(String(preset.val))}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold border border-slate-300 transition active:scale-95"
                    >
                      {preset.label}
                    </button>
                  ))}
                  {amount && (
                    <button
                      type="button"
                      onClick={() => setAmount('')}
                      className="px-2 py-0.5 text-rose-600 hover:bg-rose-50 rounded text-[10px] font-bold transition ml-auto"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Dibayarkan Kepada &amp; Keterangan *
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Gaji Karyawan Bulan Ini / Biaya Operasional Toko"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-700/20 focus:border-rose-700 font-medium"
                />
              </div>

              {/* Alert Saldo Tidak Mencukupi & Saran Pindah Rekening */}
              {selectedKasAccount && kasProjectedBalance < 0 && numAmount > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start space-x-2.5 text-amber-950">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold">
                      Saldo {selectedKasAccount.nama_akun} Tidak Mencukupi!
                    </p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Saldo saat ini <strong>Rp {kasCurrentBalance.toLocaleString('id-ID')}</strong>, sedangkan nominal pengeluaran <strong>Rp {numAmount.toLocaleString('id-ID')}</strong> (kurang Rp {Math.abs(kasProjectedBalance).toLocaleString('id-ID')}).
                    </p>
                    {kasBankAccounts.find((k) => k.id !== selectedKasBankId && getAccBalance(k.id) >= numAmount) && (
                      <button
                        type="button"
                        onClick={() => {
                          const betterAcc = kasBankAccounts.find(
                            (k) => k.id !== selectedKasBankId && getAccBalance(k.id) >= numAmount
                          );
                          if (betterAcc) setSelectedKasBankId(betterAcc.id);
                        }}
                        className="mt-1 px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded text-[10px] font-bold inline-flex items-center space-x-1 shadow-2xs transition"
                      >
                        <span>Gunakan {kasBankAccounts.find((k) => k.id !== selectedKasBankId && getAccBalance(k.id) >= numAmount)?.nama_akun} (Saldo Rp {getAccBalance(kasBankAccounts.find((k) => k.id !== selectedKasBankId && getAccBalance(k.id) >= numAmount)?.id).toLocaleString('id-ID')})</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Ringkasan Totalan Pengeluaran */}
              {selectedKasAccount && numAmount > 0 && (
                <div className="bg-[#4a0d1d] text-white rounded-xl p-3.5 shadow-xs space-y-2 border border-rose-800/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-rose-200 uppercase tracking-wider block">
                        TOTAL PENGELUARAN / POTONG SALDO
                      </span>
                      <span className="font-mono text-xl font-black text-white">
                        Rp {numAmount.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="sm:text-right text-xs">
                      <span className="text-[10px] text-rose-200 uppercase block">Rekening Yang Dipotong:</span>
                      <p className="font-bold text-white">
                        {selectedKasAccount.nama_akun}
                      </p>
                      <p className="text-[10px] text-rose-100 font-mono mt-0.5">
                        Saldo: Rp {kasCurrentBalance.toLocaleString('id-ID')} ➔ <strong className={`font-bold ${kasProjectedBalance < 0 ? 'text-amber-300' : 'text-white'}`}>Rp {kasProjectedBalance.toLocaleString('id-ID')}</strong>
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] font-serif italic text-rose-200 border-t border-rose-800/80 pt-1.5">
                    # {angkaKeTerbilang(numAmount)} #
                  </p>
                </div>
              )}
            </div>
          )}

          {/* MODE 3: TRANSFER KAS & BANK */}
          {activeTab === 'TRANSFER' && (
            <div className="space-y-3.5 animate-in fade-in duration-100">
              <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3 flex items-start space-x-2.5">
                <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div className="text-xs text-blue-950">
                  <p className="font-bold">Mode Transfer Kas &amp; Bank</p>
                  <p className="text-[11px] text-blue-800 leading-relaxed mt-0.5">
                    Memindahkan saldo antar rekening (misal tarik tunai Bank BCA ke Kas Toko Kasir). Saldo rekening asal terpotong dan rekening tujuan bertambah.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Rekening Asal (Potong Saldo) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Dari Rekening Asal (Potong Saldo) *
                  </label>
                  <select
                    value={selectedKasBankId}
                    onChange={(e) => setSelectedKasBankId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 font-semibold"
                  >
                    {kasBankAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.kode_akun} - {a.nama_akun} (Saldo: Rp {getAccBalance(a.id).toLocaleString('id-ID')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rekening Tujuan (Tambah Saldo) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Ke Rekening Tujuan (Tambah Saldo) *
                  </label>
                  <select
                    value={transferTargetKasBankId}
                    onChange={(e) => setTransferTargetKasBankId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 font-semibold"
                  >
                    {kasBankAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.kode_akun} - {a.nama_akun} (Saldo: Rp {getAccBalance(a.id).toLocaleString('id-ID')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Jumlah Transfer */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">
                    Nominal Transfer (Rp) *
                  </label>
                  {numAmount > 0 && (
                    <span className="text-[10px] font-mono text-blue-800 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {amount.length} digit
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amount ? Number(amount).toLocaleString('id-ID') : ''}
                    onChange={handleAmountChange}
                    placeholder="Contoh: 1.000.000"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 font-mono font-bold text-blue-950"
                  />
                </div>
                {/* Ejaan Terbilang */}
                {numAmount > 0 && (
                  <p className="text-[11px] font-serif italic text-blue-900 mt-1 pl-1">
                    # {angkaKeTerbilang(numAmount)} #
                  </p>
                )}
                {/* Pilihan Cepat Nominal */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 font-semibold mr-0.5">Pilihan Cepat:</span>
                  {QUICK_NOMINALS.map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setAmount(String(preset.val))}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold border border-slate-300 transition active:scale-95"
                    >
                      {preset.label}
                    </button>
                  ))}
                  {amount && (
                    <button
                      type="button"
                      onClick={() => setAmount('')}
                      className="px-2 py-0.5 text-rose-600 hover:bg-rose-50 rounded text-[10px] font-bold transition ml-auto"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Keterangan Transfer *
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Tarik tunai dari Bank BCA ke Kas Toko Kasir"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 font-medium"
                />
              </div>

              {/* Ringkasan Totalan Transfer */}
              {selectedKasAccount && selectedTransferTargetAccount && numAmount > 0 && (
                <div className="bg-blue-950 text-white rounded-xl p-3.5 shadow-xs space-y-2 border border-blue-800/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-blue-300 uppercase tracking-wider block">
                        TOTAL TRANSFER ANTAR REKENING
                      </span>
                      <span className="font-mono text-xl font-black text-white">
                        Rp {numAmount.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="sm:text-right text-xs space-y-0.5">
                      <p className="text-blue-200">
                        Dari: <strong>{selectedKasAccount.nama_akun}</strong> (Sisa: Rp {kasProjectedBalance.toLocaleString('id-ID')})
                      </p>
                      <p className="text-blue-200">
                        Ke: <strong>{selectedTransferTargetAccount.nama_akun}</strong> (Menjadi: Rp {targetKasProjectedBalance.toLocaleString('id-ID')})
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] font-serif italic text-blue-200 border-t border-blue-800/80 pt-1.5">
                    # {angkaKeTerbilang(numAmount)} #
                  </p>
                </div>
              )}
            </div>
          )}

          {/* MODE 4: JURNAL UMUM MANUAL (DOUBLE ENTRY BEBAS) */}
          {activeTab === 'JURNAL_UMUM' && (
            <div className="space-y-3.5 animate-in fade-in duration-100">
              <div className="bg-slate-100/80 border border-slate-300/80 rounded-xl p-3 flex items-start space-x-2.5">
                <div className="w-6 h-6 rounded-md bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-xs text-slate-900">
                  <p className="font-bold">Mode Jurnal Umum Bebas (General Journal)</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                    Entri akuntansi berpasangan multi-baris. Total Debit dan Total Kredit harus bernilai sama (Seimbang) sebelum dapat disimpan.
                  </p>
                </div>
              </div>

              {/* Keterangan Global */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Keterangan Transaksi / Catatan *
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Penyesuaian akhir bulan / Jurnal pembukuan manual"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-medium"
                />
              </div>

              {/* Lines Table */}
              <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                    <tr>
                      <th className="py-2 px-2.5 border-r border-slate-200">Akun Perkiraan</th>
                      <th className="py-2 px-2.5 border-r border-slate-200 w-32">Catatan</th>
                      <th className="py-2 px-2.5 text-right border-r border-slate-200 w-28">Debit (Rp)</th>
                      <th className="py-2 px-2.5 text-right border-r border-slate-200 w-28">Kredit (Rp)</th>
                      <th className="py-2 px-1 text-center w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {journalLines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-1.5 border-r border-slate-200">
                          <select
                            value={line.accountId}
                            onChange={(e) => handleJuLineChange(idx, 'accountId', e.target.value)}
                            className="w-full p-1 text-[11px] bg-white border border-slate-200 rounded font-medium focus:ring-1 focus:ring-emerald-700"
                          >
                            <option value="">-- Pilih Akun --</option>
                            {accounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.kode_akun} - {a.nama_akun}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-1.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={line.note}
                            onChange={(e) => handleJuLineChange(idx, 'note', e.target.value)}
                            placeholder="Catatan..."
                            className="w-full p-1 text-[11px] bg-white border border-slate-200 rounded"
                          />
                        </td>
                        <td className="p-1.5 border-r border-slate-200">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={line.debit ? Number(line.debit).toLocaleString('id-ID') : ''}
                            onChange={(e) => {
                              const clean = e.target.value.replace(/\D/g, '');
                              handleJuLineChange(idx, 'debit', clean);
                              if (Number(clean) > 0) handleJuLineChange(idx, 'kredit', '');
                            }}
                            placeholder="0"
                            className="w-full p-1 text-[11px] font-mono text-right bg-white border border-slate-200 rounded font-bold"
                          />
                        </td>
                        <td className="p-1.5 border-r border-slate-200">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={line.kredit ? Number(line.kredit).toLocaleString('id-ID') : ''}
                            onChange={(e) => {
                              const clean = e.target.value.replace(/\D/g, '');
                              handleJuLineChange(idx, 'kredit', clean);
                              if (Number(clean) > 0) handleJuLineChange(idx, 'debit', '');
                            }}
                            placeholder="0"
                            className="w-full p-1 text-[11px] font-mono text-right bg-white border border-slate-200 rounded font-bold"
                          />
                        </td>
                        <td className="p-1 text-center">
                          {journalLines.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveJuLine(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-300 text-xs">
                    <tr>
                      <td colSpan={2} className="py-2 px-2.5 text-right border-r border-slate-200 text-slate-700">
                        Total Jurnal:
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono border-r border-slate-200 text-slate-900">
                        Rp {totalDebitJu.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono border-r border-slate-200 text-slate-900">
                        Rp {totalKreditJu.toLocaleString('id-ID')}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleAddJuLine}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg flex items-center space-x-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Baris Akun</span>
                </button>

                <div>
                  {isJuBalanced ? (
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>✓ Double-Entry Seimbang</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center space-x-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>
                        Selisih: Rp {Math.abs(totalDebitJu - totalKreditJu).toLocaleString('id-ID')}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2">
              {(activeTab === 'KAS_KELUAR' || activeTab === 'KAS_MASUK') && (
                <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-semibold text-slate-700 hover:text-slate-900 select-none bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    checked={shouldPrintVoucher}
                    onChange={(e) => setShouldPrintVoucher(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Buka Bukti PDF / Slip setelah simpan</span>
                </label>
              )}
            </div>

            <div className="flex items-center space-x-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
              >
                Batal
              </button>

              {(activeTab === 'KAS_KELUAR' || activeTab === 'KAS_MASUK') && (
                <button
                  type="button"
                  disabled={isSubmitting || numAmount <= 0}
                  onClick={(e) => {
                    handleSubmit(e, true);
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-2xs transition active:scale-95 flex items-center space-x-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Simpan &amp; Cetak Bukti PDF</span>
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting || (activeTab === 'JURNAL_UMUM' && !isJuBalanced)}
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition active:scale-98 flex items-center space-x-1.5 ${
                  activeTab === 'KAS_MASUK'
                    ? 'bg-[#0A3828] hover:bg-[#07271c]'
                    : activeTab === 'KAS_KELUAR'
                    ? 'bg-rose-700 hover:bg-rose-800'
                    : activeTab === 'TRANSFER'
                    ? 'bg-blue-700 hover:bg-blue-800'
                    : 'bg-slate-900 hover:bg-black'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Menyimpan...'
                    : activeTab === 'KAS_MASUK'
                    ? 'Simpan Uang Masuk'
                    : activeTab === 'KAS_KELUAR'
                    ? 'Simpan & Potong Saldo'
                    : activeTab === 'TRANSFER'
                    ? 'Simpan Transfer Kas'
                    : 'Posting Jurnal Umum'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
