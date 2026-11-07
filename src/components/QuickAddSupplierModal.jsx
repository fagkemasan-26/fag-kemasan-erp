'use client';

import React, { useState, useEffect } from 'react';
import { X, Truck, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function QuickAddSupplierModal({
  isOpen,
  onClose,
  onSupplierCreated,
  editingSupplier = null,
}) {
  const [formData, setFormData] = useState({
    nama: '',
    telepon: '',
    email: '',
    alamat: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (editingSupplier) {
      setFormData({
        nama: editingSupplier.nama || '',
        telepon: editingSupplier.telepon || '',
        email: editingSupplier.email || '',
        alamat: editingSupplier.alamat || '',
      });
    } else {
      setFormData({
        nama: '',
        telepon: '',
        email: '',
        alamat: '',
      });
    }
    setErrorMsg('');
  }, [editingSupplier, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      setErrorMsg('Nama pemasok / supplier wajib diisi!');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      if (editingSupplier?.id) {
        const { data, error } = await supabase
          .from('kontak')
          .update({
            nama: formData.nama.trim(),
            telepon: formData.telepon.trim() || null,
            email: formData.email.trim() || null,
            alamat: formData.alamat.trim() || null,
          })
          .eq('id', editingSupplier.id)
          .select()
          .single();

        if (error) throw error;
        if (onSupplierCreated) onSupplierCreated(data);
      } else {
        const { data, error } = await supabase
          .from('kontak')
          .insert({
            nama: formData.nama.trim(),
            tipe: 'supplier',
            telepon: formData.telepon.trim() || null,
            email: formData.email.trim() || null,
            alamat: formData.alamat.trim() || null,
          })
          .select()
          .single();

        if (error) throw error;
        if (onSupplierCreated) onSupplierCreated(data);
      }

      onClose();
      setFormData({ nama: '', telepon: '', email: '', alamat: '' });
    } catch (err) {
      console.error('Error save supplier:', err);
      setErrorMsg(err.message || 'Gagal menyimpan supplier ke Supabase');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#0A3828] text-white">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Truck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide">
                {editingSupplier ? 'Edit Data Pemasok / Supplier' : 'Tambah Pemasok / Supplier Baru'}
              </h3>
              <p className="text-[10px] text-emerald-200">FAG Kemasan - Master Pemasok</p>
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

        <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nama Supplier / Pabrik <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: PT Pabrik Kardus Nusantara / CV Surya Pouch"
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">No. WhatsApp / Telp</label>
              <input
                type="text"
                placeholder="08123456789"
                value={formData.telepon}
                onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="sales@pabrikkardus.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Alamat Gudang / Pabrik</label>
            <textarea
              rows={2}
              placeholder="Kawasan Industri Jababeka, Cikarang, Jawa Barat..."
              value={formData.alamat}
              onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
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
              <span>{submitting ? 'Menyimpan...' : editingSupplier ? 'Simpan Perubahan' : 'Simpan Pemasok'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
