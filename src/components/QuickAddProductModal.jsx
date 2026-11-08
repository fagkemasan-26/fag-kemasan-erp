'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Package, Tag, DollarSign, Layers, Save, AlertCircle, RefreshCw, CheckCircle2, Plus } from 'lucide-react';
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
  satuanList = [],
  existingProducts = [],
  onProductCreated,
  onProductUpdated,
  onCategoryCreated,
  onSatuanCreated,
  editingProduct = null,
}) {
  const [localCategories, setLocalCategories] = useState(categories);
  const [localSatuanList, setLocalSatuanList] = useState(satuanList);

  // Quick Inline Add State for Category
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  // Quick Inline Add State for Satuan
  const [isAddingSatuan, setIsAddingSatuan] = useState(false);
  const [newSatuanName, setNewSatuanName] = useState('');
  const [savingSatuan, setSavingSatuan] = useState(false);

  const [formData, setFormData] = useState({
    nama: '',
    kode_sku: '00001',
    kategori_id: categories[0]?.id || '',
    satuan: 'Pcs',
    harga_beli: '',
    harga_jual: '',
    stok: '0',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAutoCode, setIsAutoCode] = useState(true);

  // Sync categories & satuanList with props
  useEffect(() => {
    if (Array.isArray(categories) && categories.length > 0) {
      // Normalize if strings or objects
      const normalized = categories.map((c, i) =>
        typeof c === 'string' ? { id: `cat-${i}`, nama: c } : c
      );
      setLocalCategories(normalized);
    }
  }, [categories]);

  useEffect(() => {
    if (Array.isArray(satuanList) && satuanList.length > 0) {
      setLocalSatuanList(satuanList);
    }
  }, [satuanList]);

  // If localCategories is empty on modal open, fetch from Supabase
  useEffect(() => {
    if (isOpen) {
      if (!localCategories || localCategories.length === 0) {
        supabase
          .from('kategori')
          .select('*')
          .order('nama')
          .then(({ data }) => {
            if (data && data.length > 0) {
              setLocalCategories(data);
              setFormData((prev) => ({
                ...prev,
                kategori_id: prev.kategori_id || data[0]?.id || '',
              }));
            }
          });
      }
      if (!localSatuanList || localSatuanList.length === 0) {
        supabase
          .from('satuan')
          .select('*')
          .order('nama')
          .then(({ data }) => {
            if (data && data.length > 0) {
              setLocalSatuanList(data);
            }
          });
      }
    }
  }, [isOpen]);

  // Combined Satuan List
  const combinedSatuanOptions = useMemo(() => {
    const defaults = ['Pcs', 'Pack', 'Roll', 'Dus', 'Lusin', 'Ikat', 'Lembar', 'Kg', 'Meter', 'Box', 'Pouch', 'Set', 'Rim', 'Bal'];
    const fromDb = (localSatuanList || []).map((s) => (typeof s === 'string' ? s : s.nama));
    return Array.from(new Set([...defaults, ...fromDb].filter(Boolean)));
  }, [localSatuanList]);

  // Save New Category directly inline
  const handleSaveNewCategory = async (e) => {
    if (e) e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    try {
      setSavingCategory(true);
      setErrorMsg('');

      const { data, error } = await supabase
        .from('kategori')
        .insert({
          nama: trimmed,
          keterangan: newCategoryDesc.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setLocalCategories((prev) => [...prev, data].sort((a, b) => a.nama.localeCompare(b.nama)));
        setFormData((prev) => ({ ...prev, kategori_id: data.id }));
        if (onCategoryCreated) onCategoryCreated(data);
        setIsAddingCategory(false);
        setNewCategoryName('');
        setNewCategoryDesc('');
      }
    } catch (err) {
      console.error('Error saving new category:', err);
      setErrorMsg('Gagal menambah kategori: ' + (err.message || 'Error'));
    } finally {
      setSavingCategory(false);
    }
  };

  // Save New Satuan directly inline
  const handleSaveNewSatuan = async (e) => {
    if (e) e.preventDefault();
    const trimmed = newSatuanName.trim();
    if (!trimmed) return;

    try {
      setSavingSatuan(true);
      const { data, error } = await supabase
        .from('satuan')
        .insert({ nama: trimmed })
        .select()
        .single();

      if (!error && data) {
        setLocalSatuanList((prev) => [...prev, data]);
        setFormData((prev) => ({ ...prev, satuan: data.nama }));
        if (onSatuanCreated) onSatuanCreated(data);
      } else {
        setFormData((prev) => ({ ...prev, satuan: trimmed }));
      }
      setIsAddingSatuan(false);
      setNewSatuanName('');
    } catch (err) {
      console.error('Error saving new satuan:', err);
      setFormData((prev) => ({ ...prev, satuan: trimmed }));
      setIsAddingSatuan(false);
    } finally {
      setSavingSatuan(false);
    }
  };

  // Setiap modal dibuka, hitung dan set kode otomatis format 00000 atau isi data yang diedit
  useEffect(() => {
    if (isOpen) {
      if (editingProduct) {
        setFormData({
          nama: editingProduct.nama || '',
          kode_sku: editingProduct.kode_sku || '',
          kategori_id: editingProduct.kategori_id || localCategories[0]?.id || '',
          satuan: editingProduct.satuan || 'Pcs',
          harga_beli: editingProduct.harga_beli != null ? String(editingProduct.harga_beli) : '',
          harga_jual: editingProduct.harga_jual != null ? String(editingProduct.harga_jual) : '',
          stok: editingProduct.stok != null ? String(editingProduct.stok) : '0',
        });
        setIsAutoCode(false);
      } else {
        const autoCode = getNextProductCode(existingProducts);
        setFormData((prev) => ({
          ...prev,
          nama: '',
          kode_sku: autoCode,
          kategori_id: localCategories[0]?.id || '',
          satuan: 'Pcs',
          harga_beli: '',
          harga_jual: '',
          stok: '0',
        }));
        setIsAutoCode(true);
      }
      setErrorMsg('');
      setIsAddingCategory(false);
      setIsAddingSatuan(false);
    }
  }, [isOpen, editingProduct, existingProducts, localCategories]);

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

      if (editingProduct) {
        // Mode Update
        const { data, error } = await supabase
          .from('produk')
          .update({
            nama: formData.nama.trim(),
            kode_sku: finalSku,
            kategori_id: formData.kategori_id || null,
            satuan: formData.satuan || 'Pcs',
            harga_beli: Number(formData.harga_beli || 0),
            harga_jual: Number(formData.harga_jual || 0),
            stok: Number(formData.stok || 0),
          })
          .eq('id', editingProduct.id)
          .select('*, kategori:kategori_id(nama)')
          .single();

        if (error) {
          if (error.code === '23505') {
            throw new Error(`Kode barang "${finalSku}" sudah digunakan oleh barang lain.`);
          }
          throw error;
        }

        if (onProductUpdated) onProductUpdated(data);
        else if (onProductCreated) onProductCreated(data);
      } else {
        // Mode Tambah Baru
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
      }

      onClose();

      // Reset form
      setFormData({
        nama: '',
        kode_sku: getNextProductCode(existingProducts),
        kategori_id: categories[0]?.id || '',
        satuan: 'Pcs',
        harga_beli: '',
        harga_jual: '',
        stok: '0',
      });
    } catch (err) {
      console.error('Error save product:', err);
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
              <h3 className="font-extrabold text-sm tracking-wide">
                {editingProduct ? 'Ubah Data Kemasan (Edit Master)' : 'Tambah Barang Kemasan Baru'}
              </h3>
              <p className="text-[10px] text-emerald-200">
                {editingProduct ? `Edit SKU: ${formData.kode_sku}` : 'FAG Kemasan - Master Produk'}
              </p>
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
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700 text-xs">Satuan</label>
                <button
                  type="button"
                  onClick={() => setIsAddingSatuan((v) => !v)}
                  className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center space-x-0.5 bg-emerald-50 hover:bg-emerald-100/80 px-1.5 py-0.5 rounded transition"
                  title="Tambah Satuan Baru Langsung"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isAddingSatuan ? 'Pilih' : '+ Satuan'}</span>
                </button>
              </div>

              {isAddingSatuan ? (
                <div className="flex items-center space-x-1 animate-in fade-in duration-150">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Satuan baru (contoh: Rim, Bal, Koli)..."
                    value={newSatuanName}
                    onChange={(e) => setNewSatuanName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveNewSatuan();
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-emerald-400 rounded-lg focus:ring-1 focus:ring-emerald-600 font-medium"
                  />
                  <button
                    type="button"
                    disabled={savingSatuan || !newSatuanName.trim()}
                    onClick={handleSaveNewSatuan}
                    className="px-2.5 py-1.5 bg-[#0A3828] text-white rounded-lg text-xs font-bold shadow-xs hover:bg-[#07291D] transition"
                    title="Simpan satuan"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingSatuan(false);
                      setNewSatuanName('');
                    }}
                    className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-600 hover:bg-slate-100 transition"
                    title="Batal"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <select
                  value={formData.satuan}
                  onChange={(e) => {
                    if (e.target.value === '__NEW__') {
                      setIsAddingSatuan(true);
                    } else {
                      setFormData({ ...formData, satuan: e.target.value });
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  {combinedSatuanOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="__NEW__" className="text-emerald-800 font-bold bg-emerald-50">
                    + Tambah Satuan Baru...
                  </option>
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 text-xs">Harga Beli / HPP Modal (Rp)</label>
              <input
                type="number"
                placeholder="2000"
                value={formData.harga_beli}
                onChange={(e) => setFormData({ ...formData, harga_beli: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 text-xs">
                Harga Jual Kasir (Rp) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                placeholder="2800"
                value={formData.harga_jual}
                onChange={(e) => setFormData({ ...formData, harga_jual: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-800 font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700 text-xs">Kategori Kemasan</label>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory((v) => !v)}
                  className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center space-x-0.5 bg-emerald-50 hover:bg-emerald-100/80 px-1.5 py-0.5 rounded transition"
                  title="Tambah Kategori Baru Langsung"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isAddingCategory ? 'Pilih' : '+ Tambah Kategori'}</span>
                </button>
              </div>

              {isAddingCategory ? (
                <div className="p-2.5 bg-emerald-50/70 border border-emerald-300 rounded-xl space-y-2 animate-in fade-in duration-150">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Nama Kategori (Paper Cup, Box Dus)..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg focus:ring-1 focus:ring-emerald-600 font-medium"
                  />
                  <input
                    type="text"
                    placeholder="Keterangan singkat (opsional)..."
                    value={newCategoryDesc}
                    onChange={(e) => setNewCategoryDesc(e.target.value)}
                    className="w-full px-2.5 py-1 text-[11px] bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600"
                  />
                  <div className="flex items-center space-x-1.5 pt-0.5">
                    <button
                      type="button"
                      disabled={savingCategory || !newCategoryName.trim()}
                      onClick={handleSaveNewCategory}
                      className="px-2.5 py-1 bg-[#0A3828] hover:bg-[#07291D] disabled:opacity-50 text-white rounded-lg text-[11px] font-bold flex items-center space-x-1 transition shadow-xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{savingCategory ? 'Menyimpan...' : 'Simpan Kategori'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCategory(false);
                        setNewCategoryName('');
                        setNewCategoryDesc('');
                      }}
                      className="px-2 py-1 border border-slate-300 bg-white hover:bg-slate-100 rounded-lg text-[11px] text-slate-600 font-medium transition"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <select
                  value={formData.kategori_id}
                  onChange={(e) => {
                    if (e.target.value === '__NEW__') {
                      setIsAddingCategory(true);
                    } else {
                      setFormData({ ...formData, kategori_id: e.target.value });
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Pilih Kategori...</option>
                  {(localCategories || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama}
                    </option>
                  ))}
                  <option value="__NEW__" className="text-emerald-800 font-bold bg-emerald-50">
                    + Tambah Kategori Baru...
                  </option>
                </select>
              )}
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 text-xs">Stok Awal Fisik</label>
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
              <span>{submitting ? 'Menyimpan...' : editingProduct ? 'Simpan Perubahan' : 'Simpan Produk'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
