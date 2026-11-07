'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, BookOpen, AlertCircle, Sparkles, Check, Hash, Tag, ArrowRight, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const TIPE_AKUN_OPTIONS = [
  { value: 'Kas & Bank', normal: 'DEBIT', desc: 'Kas Toko Kasir, Rekening Bank BCA/Mandiri' },
  { value: 'Piutang', normal: 'DEBIT', desc: 'Tagihan piutang belum tertagih ke pelanggan' },
  { value: 'Persediaan', normal: 'DEBIT', desc: 'Nilai stok kardus box & bahan kemasan' },
  { value: 'Aktiva Lancar Lainnya', normal: 'DEBIT', desc: 'Uang muka sewa, perlengkapan toko' },
  { value: 'Aktiva Tetap', normal: 'DEBIT', desc: 'Mesin plong kardus, kendaraan, gedung' },
  { value: 'Hutang Lancar', normal: 'KREDIT', desc: 'Hutang ke supplier pabrik box, PPN' },
  { value: 'Hutang Jangka Panjang', normal: 'KREDIT', desc: 'Pinjaman modal usaha jangka panjang' },
  { value: 'Ekuitas', normal: 'KREDIT', desc: 'Modal pemilik (Fauzan Ghani), laba ditahan' },
  { value: 'Pendapatan', normal: 'KREDIT', desc: 'Hasil penjualan produk kardus kemasan' },
  { value: 'HPP', normal: 'DEBIT', desc: 'Harga pokok modal beli kemasan (FIFO)' },
  { value: 'Beban', normal: 'DEBIT', desc: 'Gaji karyawan, listrik, sewa toko, lakban' },
  { value: 'Pendapatan Lainnya', normal: 'KREDIT', desc: 'Bunga bank, pendapatan sampingan' },
  { value: 'Beban Lainnya', normal: 'DEBIT', desc: 'Biaya admin bank, denda, kerugian lain' },
];

export default function AccountFormModal({
  isOpen,
  onClose,
  account = null, // null for create, object for edit
  onSaved,
  onDeleted,
}) {
  const isEditing = Boolean(account && account.id);

  const [kodeAkun, setKodeAkun] = useState('');
  const [namaAkun, setNamaAkun] = useState('');
  const [tipeAkun, setTipeAkun] = useState('Beban');
  const [saldoNormal, setSaldoNormal] = useState('DEBIT');
  const [saldoAwal, setSaldoAwal] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (account) {
        setKodeAkun(account.kode_akun || '');
        setNamaAkun(account.nama_akun || '');
        setTipeAkun(account.tipe_akun || 'Beban');
        setSaldoNormal(account.saldo_normal || 'DEBIT');
        setSaldoAwal(String(account.saldo_awal || 0));
      } else {
        setKodeAkun('');
        setNamaAkun('');
        setTipeAkun('Beban');
        setSaldoNormal('DEBIT');
        setSaldoAwal('0');
      }
    }
  }, [isOpen, account]);

  // When Tipe Akun changes, auto-suggest default normal balance
  const handleTipeAkunChange = (newTipe) => {
    setTipeAkun(newTipe);
    const opt = TIPE_AKUN_OPTIONS.find((o) => o.value === newTipe);
    if (opt) {
      setSaldoNormal(opt.normal);
    }
  };

  const handleSaldoAwalChange = (e) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    setSaldoAwal(rawDigits);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!kodeAkun.trim()) {
      setErrorMsg('Kode Akun wajib diisi!');
      return;
    }
    if (!namaAkun.trim()) {
      setErrorMsg('Nama Akun Perkiraan wajib diisi!');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        kode_akun: kodeAkun.trim(),
        nama_akun: namaAkun.trim(),
        tipe_akun: tipeAkun,
        saldo_normal: saldoNormal,
        saldo_awal: Number(saldoAwal || 0),
      };

      if (isEditing) {
        const { data, error } = await supabase
          .from('akun')
          .update(payload)
          .eq('id', account.id)
          .select()
          .single();
        if (error) throw error;
        if (onSaved) onSaved(data || { ...account, ...payload });
      } else {
        const { data, error } = await supabase
          .from('akun')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        if (onSaved) onSaved(data || payload);
      }

      onClose();
    } catch (err) {
      console.error('Error saving account:', err);
      setErrorMsg(err.message || 'Gagal menyimpan akun perkiraan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!account || !account.id) return;

    setErrorMsg('');
    setIsDeleting(true);

    try {
      // 1. Check if this account is already used in journal transactions
      const { data: usageData, error: usageErr } = await supabase
        .from('jurnal_detail')
        .select('id')
        .eq('akun_id', account.id)
        .limit(10);

      if (usageErr) throw usageErr;

      if (usageData && usageData.length > 0) {
        setErrorMsg(
          `Akun ${account.kode_akun} - ${account.nama_akun} sudah digunakan dalam ${usageData.length}+ transaksi jurnal. Untuk menjaga keutuhan laporan keuangan, akun yang sudah memiliki riwayat transaksi tidak dapat dihapus. Anda dapat mengedit nama atau kodenya.`
        );
        setIsDeleting(false);
        return;
      }

      // 2. Prompt user confirmation
      const confirmDelete = window.confirm(
        `Apakah Anda yakin ingin menghapus akun perkiraan ini?\n\nKode: ${account.kode_akun}\nNama: ${account.nama_akun}\n\nAkun ini akan dihapus permanen dari daftar Buku Besar.`
      );
      if (!confirmDelete) {
        setIsDeleting(false);
        return;
      }

      // 3. Delete from Supabase
      const { error: delErr } = await supabase
        .from('akun')
        .delete()
        .eq('id', account.id);

      if (delErr) throw delErr;

      if (onDeleted) {
        onDeleted(account);
      }
      onClose();
    } catch (err) {
      console.error('Error deleting account:', err);
      setErrorMsg(err.message || 'Gagal menghapus akun.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#07291D] text-white flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-900/80 border border-emerald-700 flex items-center justify-center text-emerald-300">
              <BookOpen className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-wide uppercase">
                {isEditing ? 'Pengaturan Akun Perkiraan (COA)' : 'Tambah Akun Perkiraan Baru'}
              </h3>
              <p className="text-[11px] text-emerald-300/80">
                {isEditing
                  ? `Edit tipe akun, nama, saldo normal & saldo awal untuk ${account?.kode_akun}`
                  : 'Daftarkan akun perkiraan baru untuk pembukuan FAG Kemasan'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-300/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {/* Row 1: Kode Akun & Tipe Akun */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center space-x-1">
                <Hash className="w-3 h-3 text-slate-400" />
                <span>Kode Akun *</span>
              </label>
              <input
                type="text"
                value={kodeAkun}
                onChange={(e) => setKodeAkun(e.target.value)}
                placeholder="Contoh: 6101-02"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Format: 4 digit nomor akun</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center space-x-1">
                <Tag className="w-3 h-3 text-slate-400" />
                <span>Tipe Akun *</span>
              </label>
              <select
                value={tipeAkun}
                onChange={(e) => handleTipeAkunChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
              >
                {TIPE_AKUN_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.value}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 mt-0.5 block italic truncate">
                {TIPE_AKUN_OPTIONS.find((o) => o.value === tipeAkun)?.desc}
              </span>
            </div>
          </div>

          {/* Row 2: Nama Akun Perkiraan */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Nama Akun Perkiraan *
            </label>
            <input
              type="text"
              value={namaAkun}
              onChange={(e) => setNamaAkun(e.target.value)}
              placeholder="Contoh: Beban Gaji &amp; Upah Karyawan"
              required
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
            />
          </div>

          {/* Row 3: Posisi Normal (Debit vs Kredit) */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black text-slate-800 uppercase tracking-wide">
                Posisi Saldo Normal (Debit / Kredit) *
              </label>
              <span className="text-[10px] text-slate-500">
                Pilih sisi di mana saldo akun ini bertambah
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSaldoNormal('DEBIT')}
                className={`py-2 px-3 rounded-lg font-bold text-xs transition border flex items-center justify-center space-x-1.5 ${
                  saldoNormal === 'DEBIT'
                    ? 'bg-[#0A3828] text-white border-[#07291D] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {saldoNormal === 'DEBIT' && <Check className="w-3.5 h-3.5 text-emerald-300" />}
                <span>DEBIT</span>
                <span className="text-[10px] opacity-80">(Kas, Beban, HPP, Piutang)</span>
              </button>

              <button
                type="button"
                onClick={() => setSaldoNormal('KREDIT')}
                className={`py-2 px-3 rounded-lg font-bold text-xs transition border flex items-center justify-center space-x-1.5 ${
                  saldoNormal === 'KREDIT'
                    ? 'bg-[#0A3828] text-white border-[#07291D] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {saldoNormal === 'KREDIT' && <Check className="w-3.5 h-3.5 text-emerald-300" />}
                <span>KREDIT</span>
                <span className="text-[10px] opacity-80">(Pendapatan, Modal, Hutang)</span>
              </button>
            </div>
          </div>

          {/* Row 4: Saldo Awal (Rp) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">
                Saldo Awal Buku (Rp)
              </label>
              {Number(saldoAwal) > 0 && (
                <span className="text-[10px] text-slate-500 font-mono">
                  {saldoAwal.length} digit
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={saldoAwal ? Number(saldoAwal).toLocaleString('id-ID') : '0'}
                onChange={handleSaldoAwalChange}
                placeholder="0"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Saldo awal saat pertama kali pembukuan dimulai (kosongkan atau isi 0 jika tidak ada saldo awal).
            </p>
          </div>

          {/* Modal Footer Controls */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <div>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting || isDeleting}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 border border-rose-200 rounded-lg font-bold transition flex items-center space-x-1.5 active:scale-95 disabled:opacity-50 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>{isDeleting ? 'Menghapus...' : 'Hapus Akun'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting || isDeleting}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-100 transition active:scale-95"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isDeleting}
                className="px-5 py-2 bg-[#0A3828] hover:bg-[#07291D] text-white rounded-lg font-bold transition flex items-center space-x-1.5 shadow-xs active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan Akun' : 'Daftarkan Akun Baru'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
