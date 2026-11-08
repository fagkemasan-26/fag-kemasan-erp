'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Check,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  ShoppingCart,
  FileText,
  Save,
  X,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * CustomerInlineTable: Click-to-Edit Enterprise Customer Spreadsheet Table
 * Every cell (Nama, Telepon, Alamat) is directly clickable and editable in place,
 * saving immediately to Supabase with real-time feedback.
 */
export default function CustomerInlineTable({
  contacts = [],
  setContacts,
  onAddNew,
  onCreatePOForCustomer,
  onCreateQuoteForCustomer,
  onToast,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCell, setEditingCell] = useState(null); // { id: string, field: 'nama'|'telepon'|'alamat' }
  const [tempValue, setTempValue] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [savedFieldNotice, setSavedFieldNotice] = useState(null); // { id, field }
  const [contactToDelete, setContactToDelete] = useState(null); // Contact currently pending deletion confirmation

  // Filter contacts by search & type (pelanggan only)
  const customerContacts = contacts.filter((c) => !c.tipe || c.tipe.toLowerCase() === 'pelanggan');
  const filteredContacts = customerContacts.filter((c) => {
    const q = searchTerm.toLowerCase();
    const nama = (c.nama || '').toLowerCase();
    const tel = (c.telepon || '').toLowerCase();
    const alm = (c.alamat || '').toLowerCase();
    return nama.includes(q) || tel.includes(q) || alm.includes(q);
  });

  // Start editing a cell
  const startEditing = (c, field) => {
    setEditingCell({ id: c.id, field });
    setTempValue(c[field] || '');
  };

  // Save the edited cell directly to Supabase
  const saveCell = async (contact) => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    const trimmed = tempValue.trim();

    // If unchanged, simply exit edit mode
    if (contact[field] === trimmed) {
      setEditingCell(null);
      return;
    }

    try {
      setSavingId(id);
      const updatedFields = { [field]: trimmed };
      const { error } = await supabase
        .from('kontak')
        .update(updatedFields)
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setContacts((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [field]: trimmed } : c))
      );

      // Show temporary saved indicator
      setSavedFieldNotice({ id, field });
      setTimeout(() => setSavedFieldNotice(null), 2500);
      if (onToast) onToast(`Perubahan ${field} berhasil disimpan ke database.`, 'success');
    } catch (err) {
      console.error('Gagal menyimpan perubahan kontak:', err);
      if (onToast) {
        onToast('Gagal menyimpan perubahan ke database: ' + err.message, 'error');
      }
    } finally {
      setSavingId(null);
      setEditingCell(null);
    }
  };

  // Confirm and delete a contact
  const confirmDeleteContact = async () => {
    if (!contactToDelete) return;
    const contact = contactToDelete;
    try {
      const { error } = await supabase.from('kontak').delete().eq('id', contact.id);
      if (error) throw error;
      setContacts((prev) => prev.filter((c) => c.id !== contact.id));
      if (onToast) onToast(`Pelanggan "${contact.nama}" berhasil dihapus.`, 'success');
    } catch (err) {
      if (onToast) {
        onToast('Tidak dapat menghapus kontak karena memiliki riwayat transaksi: ' + err.message, 'error');
      }
    } finally {
      setContactToDelete(null);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 space-y-1.5">
      {/* Table Header Bar - Tight Enterprise Density */}
      <div className="bg-white px-3.5 py-2 rounded-lg border border-slate-300 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide">
            Daftar Pelanggan FAG Kemasan
          </h2>
          <span className="bg-emerald-50 text-emerald-900 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
            {customerContacts.length} Pelanggan
          </span>
          <span className="hidden md:inline text-[11px] text-slate-500">
            • Klik langsung pada sel untuk edit instan (Live Sync Supabase)
          </span>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {/* Quick Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari pelanggan, no. WA, kota..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-emerald-700 bg-white"
            />
          </div>

          <button
            type="button"
            onClick={onAddNew}
            className="px-3.5 py-1.5 bg-[#0A3828] hover:bg-[#07291D] text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-xs whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Tambah Pelanggan</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Editable Table - Full Viewport Height */}
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-lg border border-slate-300 overflow-hidden shadow-2xs">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center border-r border-slate-200">No.</th>
                <th className="py-2.5 px-3 w-64 border-r border-slate-200">
                  Nama Pelanggan / Perusahaan
                </th>
                <th className="py-2.5 px-3 w-48 border-r border-slate-200">
                  WhatsApp / Telepon
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200">
                  Alamat Lengkap Pengiriman
                </th>
                <th className="py-2.5 px-3 w-44 text-center">Tindakan Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
            {filteredContacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400 bg-slate-50/50">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                  <p className="font-bold text-xs text-slate-600">Tidak ada data pelanggan yang cocok</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Klik tombol &quot;+ Tambah Pelanggan&quot; di atas untuk mendaftarkan kontak baru.
                  </p>
                </td>
              </tr>
            ) : (
              filteredContacts.map((c, idx) => {
                const isEditingNama =
                  editingCell?.id === c.id && editingCell?.field === 'nama';
                const isEditingTel =
                  editingCell?.id === c.id && editingCell?.field === 'telepon';
                const isEditingAlamat =
                  editingCell?.id === c.id && editingCell?.field === 'alamat';
                const isSaving = savingId === c.id;

                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono border-r border-slate-100">
                      {idx + 1}
                    </td>

                    {/* 1. Nama Pelanggan (Clickable / Editable) */}
                    <td
                      className="py-2.5 px-3 border-r border-slate-100 relative cursor-pointer"
                      onClick={() => !isEditingNama && startEditing(c, 'nama')}
                      title="Klik untuk ubah nama pelanggan"
                    >
                      {isEditingNama ? (
                        <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            autoFocus
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCell(c);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            onBlur={() => saveCell(c)}
                            className="w-full px-2 py-1 text-xs font-bold text-slate-900 border-2 border-emerald-600 rounded bg-white outline-none shadow-xs"
                          />
                          <button
                            type="button"
                            onClick={() => saveCell(c)}
                            className="p-1 bg-emerald-700 text-white rounded hover:bg-emerald-800"
                            title="Simpan (Enter)"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between group/cell">
                          <span className="font-bold text-slate-900 group-hover:text-emerald-950">
                            {c.nama}
                          </span>
                          <div className="flex items-center space-x-1">
                            {savedFieldNotice?.id === c.id && savedFieldNotice?.field === 'nama' && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded animate-fade-in">
                                Tersimpan ✓
                              </span>
                            )}
                            <Edit2 className="w-3 h-3 text-slate-300 group-hover/cell:text-emerald-700 opacity-0 group-hover/cell:opacity-100 transition" />
                          </div>
                        </div>
                      )}
                    </td>

                    {/* 2. WhatsApp / Telepon (Clickable / Editable) */}
                    <td
                      className="py-2.5 px-3 border-r border-slate-100 relative cursor-pointer"
                      onClick={() => !isEditingTel && startEditing(c, 'telepon')}
                      title="Klik untuk ubah no. telepon / WA"
                    >
                      {isEditingTel ? (
                        <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            autoFocus
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCell(c);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            onBlur={() => saveCell(c)}
                            placeholder="08xxxxxxxxxx"
                            className="w-full px-2 py-1 text-xs font-semibold text-emerald-900 border-2 border-emerald-600 rounded bg-white outline-none shadow-xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => saveCell(c)}
                            className="p-1 bg-emerald-700 text-white rounded hover:bg-emerald-800"
                            title="Simpan (Enter)"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between group/cell">
                          <span className="font-semibold text-emerald-900 font-mono">
                            {c.telepon || <span className="text-slate-300 italic font-sans">Belum ada telepon</span>}
                          </span>
                          <div className="flex items-center space-x-1">
                            {savedFieldNotice?.id === c.id && savedFieldNotice?.field === 'telepon' && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded animate-fade-in">
                                Tersimpan ✓
                              </span>
                            )}
                            <Edit2 className="w-3 h-3 text-slate-300 group-hover/cell:text-emerald-700 opacity-0 group-hover/cell:opacity-100 transition" />
                          </div>
                        </div>
                      )}
                    </td>

                    {/* 3. Alamat Lengkap (Clickable / Editable) */}
                    <td
                      className="py-2.5 px-3 border-r border-slate-100 relative cursor-pointer"
                      onClick={() => !isEditingAlamat && startEditing(c, 'alamat')}
                      title="Klik untuk ubah alamat pengiriman"
                    >
                      {isEditingAlamat ? (
                        <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            autoFocus
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCell(c);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            onBlur={() => saveCell(c)}
                            placeholder="Alamat jalan, gedung, kota..."
                            className="w-full px-2 py-1 text-xs text-slate-800 border-2 border-emerald-600 rounded bg-white outline-none shadow-xs"
                          />
                          <button
                            type="button"
                            onClick={() => saveCell(c)}
                            className="p-1 bg-emerald-700 text-white rounded hover:bg-emerald-800"
                            title="Simpan (Enter)"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between group/cell">
                          <span className="text-slate-600 truncate max-w-md">
                            {c.alamat || <span className="text-slate-300 italic">Belum ada alamat</span>}
                          </span>
                          <div className="flex items-center space-x-1">
                            {savedFieldNotice?.id === c.id && savedFieldNotice?.field === 'alamat' && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded animate-fade-in">
                                Tersimpan ✓
                              </span>
                            )}
                            <Edit2 className="w-3 h-3 text-slate-300 group-hover/cell:text-emerald-700 opacity-0 group-hover/cell:opacity-100 transition" />
                          </div>
                        </div>
                      )}
                    </td>

                    {/* 4. Tindakan Cepat */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => onCreatePOForCustomer && onCreatePOForCustomer(c)}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded text-[11px] font-bold transition flex items-center space-x-1"
                          title="Buat Order Masuk (PO) untuk pelanggan ini"
                        >
                          <ShoppingCart className="w-3 h-3" />
                          <span>+ PO</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onCreateQuoteForCustomer && onCreateQuoteForCustomer(c)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded text-[11px] font-semibold transition flex items-center space-x-1"
                          title="Buat Penawaran Harga (SQ)"
                        >
                          <FileText className="w-3 h-3" />
                          <span>+ SQ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setContactToDelete(c)}
                          className="p-1 text-slate-300 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                          title="Hapus Kontak"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>

        {/* Bottom Status Bar - Edge to Edge Anchored */}
        <div className="h-8 bg-slate-50 border-t border-slate-200 px-3 flex items-center justify-between text-[11px] text-slate-500 font-medium select-none">
          <div className="flex items-center space-x-2">
            <span>Total Pelanggan: <strong>{customerContacts.length}</strong></span>
            <span>•</span>
            <span>Ditampilkan: <strong>{filteredContacts.length}</strong></span>
          </div>
          <div className="flex items-center space-x-2 text-emerald-800 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
            <span>Live Sync Supabase PostgreSQL</span>
          </div>
        </div>
      </div>

      {/* Sleek Delete Confirmation Modal (No Native Browser Dialog) */}
      {contactToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-rose-100 text-rose-700 rounded-lg shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Hapus Pelanggan?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Yakin ingin menghapus data kontak <strong className="text-slate-800">&quot;{contactToDelete.nama}&quot;</strong>? Data yang dihapus tidak dapat dipulihkan.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setContactToDelete(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteContact}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition shadow-xs"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
