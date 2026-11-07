'use client';

import React, { useState, useEffect } from 'react';
import { X, Package, Tag, DollarSign, Layers, Save, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * Helper untuk menghitung nomor urut kode barang berikutnya format 00000
 * Contoh: Jika belum ada barang, mulai dari 00001. Jika ada 3 barang, berikutnya 00004.
 */
export function getNextProductCode(products = []) {
  let maxSeq = 0;
  if (Array.isArray(products) && products.length > 0) {
    products.forEach((p) => {
      const sku = String(p.kode_sku || '').trim();
      // Cocokkan pola angka 5 digit atau digit berurutan
      if (/^\d{5}$/.test(sku)) {
        const val = parseInt(sku, 10);
        if (val > maxSeq) maxSeq = val;
      } else {
        const digits = sku.match(/\d+/g);
        if (digits) {
          digits.forEach((d) => {
            const val = parseInt(d, 10);
            if (val > maxSeq && val < 99999) maxSeq = val;
          });
        }
      }
    });

    if (maxSeq === 0) {
      maxSeq = products.length;
    }
  }

  const nextVal = maxSeq + 1;
  return String(nextVal).padStart(5, '0');
}

export default function QuickAddProductModal({
  isOpen,
  onClose,
  categories = [],
  existingProducts = [],
  onProductCreated,
}) {
  const [formData, setFormData] = useState({
    nama: '',
    kode_sku: '00001',
    kategori_id: categories[0]?.id || '',
    satuan: 'Pcs',
    harga_beli: '',
    harga_jual: '',
    stok: '100',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAutoCode, setIsAutoCode] = useState(true);

  // Setiap modal dibuka, hitung dan set kode otomatis format 00000
  useEffect(() => {
    if (isOpen) {
      const autoCode = getNextProductCode(existingProducts);
      setFormData((prev) => ({
        ...prev,
        kode_sku: autoCode,
        kategori_id: prev.kategori_id || categories[0]?.id || '',
      }));
      setIsAutoCode(true);
      setErrorMsg('');
    }
  }, [isOpen, existingProducts, categories]);

  if (!isOpen) return null;

  const handleRegenerateCode = () => {
    const autoCode = getNextProductCode(existingProducts);
    setFormData((prev) => ({ ...prev, kode_sku: autoCode }));
    setIsAutoCode(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama.trim() || !formData.harga_jual) {
      setErrorMsg('Nama kemasan dan harga jual satuan wajib diisi!');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      // Jika kosong, gunakan auto 5-digit code format 00000
      let finalSku = formData.kode_sku.trim();
      if (!finalSku) {
        finalSku = getNextProductCode(existingProducts);
      }

      const { data, error } = await supabase
        .from('produk')
        .insert({
          nama: formData.nama.trim(),
          kode_sku: finalSku,
          kategori_id: formData.kategori_id || null,
          satuan: formData.satuan || 'Pcs',
          harga_beli: Number(formData.harga_beli || 0),
          harga_jual: Number(formData.harga_jual || 0),
          stok: Number(formData.stok || 0),
        })
        .select('*, kategori:kategori_id(nama)')
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error(`Kode barang "${finalSku}" sudah digunakan. Gunakan kode lain.`);
        }
        throw error;
      }

      if (onProductCreated) {
        onProductCreated(data);
      }
      onClose();

      // Reset form
      setFormData({
        nama: '',
        kode_sku: getNextProductCode([...existingProducts, data]),
        kategori_id: categories[0]?.id || '',
        satuan: 'Pcs',
        harga_beli: '',
        harga_jual: '',
        stok: '100',
      });
    } catch (err) {
      console.error('Error create product:', err);
      setErrorMsg(err.message || 'Gagal menyimpan barang kemasan ke Supabase.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#0A3828] text-white">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide">Tambah Barang Kemasan Baru</h3>
              <p className="text-[10px] text-emerald-200">FAG Kemasan - Master Produk</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-emerald-900/40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nama Kemasan <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Kardus Die Cut 25x25x8 cm / Pouch 20x30 Klip"
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">Kode Barang</label>
                <span className="text-[9px] text-emerald-800 bg-emerald-100 font-bold px-1.5 py-0.2 rounded font-mono border border-emerald-300">
                  Format 00000
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="00001"
                  value={formData.kode_sku}
                  onChange={(e) => {
                    setFormData({ ...formData, kode_sku: e.target.value.toUpperCase() });
                    setIsAutoCode(false);
                  }}
                  className="w-full pl-3 pr-7 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-emerald-900 bg-slate-50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={handleRegenerateCode}
                  title="Generate ulang kode urut 00000 otomatis"
                  className="absolute right-2 top-2.5 text-slate-400 hover:text-emerald-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isAutoCode ? '✓ Otomatis terisi 5 digit berurutan' : 'Telah diubah manual'}
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Satuan</label>
              <select
                value={formData.satuan}
                onChange={(e) => setFormData({ ...formData, satuan: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Pcs">Pcs</option>
                <option value="Pack">Pack</option>
                <option value="Roll">Roll</option>
                <option value="Dus">Dus</option>
                <option value="Lusin">Lusin</option>
                <option value="Ikat">Ikat</option>
                <option value="Lembar">Lembar</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Harga Beli / HPP Modal (Rp)</label>
              <input
                type="number"
                placeholder="2000"
                value={formData.harga_beli}
                onChange={(e) => setFormData({ ...formData, harga_beli: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Harga Jual Kasir (Rp) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                placeholder="2800"
                value={formData.harga_jual}
                onChange={(e) => setFormData({ ...formData, harga_jual: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-800 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Kategori Kemasan</label>
              <select
                value={formData.kategori_id}
                onChange={(e) => setFormData({ ...formData, kategori_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Pilih Kategori...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nama}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Stok Awal Fisik</label>
              <input
                type="number"
                value={formData.stok}
                onChange={(e) => setFormData({ ...formData, stok: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-[11px] text-emerald-950 flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
            <span>
              Barang langsung tersimpan permanen di database Supabase dan otomatis tampil di live search transaksi penjualan (PO, SQ, DO, SI).
            </span>
          </div>

          <div className="flex space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 bg-[#0A3828] hover:bg-[#07291D] text-white rounded-xl font-bold flex items-center justify-center space-x-1.5 shadow transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{submitting ? 'Menyimpan...' : 'Simpan Produk'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
