'use client';

import React, { useState } from 'react';
import { Trash2, Boxes, Edit2, Plus, Calculator, ChevronRight } from 'lucide-react';
import GoogleLiveProductSearch from './GoogleLiveProductSearch';
import ItemDetailModal from './ItemDetailModal';

/**
 * ItemSpreadsheetGrid: Accurate Online style spreadsheet table for packaging items.
 * Selecting an item or clicking any row opens the ItemDetailModal with the built-in calculator!
 */
export default function ItemSpreadsheetGrid({
  formType = 'PO', // 'QUOTE' | 'PO' | 'DO' | 'SI'
  items = [],
  setItems,
  products = [],
  customerId = null,
  customerName = '',
  salesOrders = [],
  quotations = [],
  salesInvoices = [],
  satuanList = [],
  onAddSatuan = null,
}) {
  // Modal State for Line Item & Built-in Calculator
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState(null);
  const [modalItemIndex, setModalItemIndex] = useState(-1); // -1 means adding new item

  // When a product is selected from search bar:
  const handleSelectFromSearch = (product) => {
    const fullProduct = products.find((p) => p.id === product.id) || product;
    const masterJual = Number(fullProduct.harga_jual || 0);
    const masterBeli = Number(fullProduct.harga_beli || 0);

    // Initial new addition: USER REQUEST -> Start with Qty = 0 and Harga = 0!
    setModalItem({
      id: fullProduct.id,
      kode_sku: fullProduct.kode_sku,
      nama: fullProduct.nama,
      satuan: fullProduct.satuan || 'Pcs',
      stok: fullProduct.stok,
      qty: 0, // <--- Starts at 0!
      harga_jual: 0, // <--- Starts at 0!
      master_harga_jual: masterJual,
      master_harga_beli: masterBeli,
      harga_beli: masterBeli,
      diskonPersen: 0,
      diskonRp: 0,
      catatan: '',
      total: 0,
      isNew: true,
    });
    setModalItemIndex(-1); // New addition
    setModalOpen(true);
  };

  // When user clicks an existing row to edit:
  const handleEditRow = (it, idx) => {
    const fullProduct = products.find((p) => p.id === it.id);
    setModalItem({
      ...it,
      master_harga_jual: Number(fullProduct?.harga_jual || it.master_harga_jual || it.harga_jual || 0),
      master_harga_beli: Number(fullProduct?.harga_beli || it.master_harga_beli || it.harga_beli || 0),
      isNew: false,
    });
    setModalItemIndex(idx);
    setModalOpen(true);
  };

  // Delete item directly from modal
  const handleDeleteModalItem = () => {
    if (modalItemIndex >= 0) {
      setItems(items.filter((_, i) => i !== modalItemIndex));
    }
  };

  // Save changes from modal back to items array (Guaranteed Single Add)
  const handleSaveModalItem = (updated) => {
    if (modalItemIndex >= 0) {
      // Update existing item in place
      const copy = [...items];
      copy[modalItemIndex] = {
        ...updated,
        rowId: copy[modalItemIndex]?.rowId || `${updated.id}_${Date.now()}`,
      };
      setItems(copy);
    } else {
      // Append EXACTLY ONE new item (Never duplicate)
      const uniqueRowId = `${updated.id || 'item'}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      setItems([...items, { ...updated, rowId: uniqueRowId }]);
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Google-Style Live Product Search Bar */}
      <div>
        <GoogleLiveProductSearch
          products={products}
          onSelectProduct={handleSelectFromSearch}
          placeholder="+ Cari & Tambah Produk Kemasan (Ketik nama Kardus, Pouch, Bubble Wrap, atau SKU)..."
        />
      </div>

      {/* Enterprise Full-Width Grid Table */}
      <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-300">
            <tr>
              <th className="py-2.5 px-3 w-10 text-center border-r border-slate-200">No.</th>
              <th className="py-2.5 px-3 w-32 border-r border-slate-200">Kode SKU</th>
              <th className="py-2.5 px-3 border-r border-slate-200">Deskripsi Barang Kemasan</th>
              <th className="py-2.5 px-3 w-28 text-center border-r border-slate-200">Kuantitas</th>
              <th className="py-2.5 px-3 w-20 text-center border-r border-slate-200">Satuan</th>
              {formType !== 'DO' && (
                <th className="py-2.5 px-3 w-36 text-right border-r border-slate-200">Harga Satuan (Rp)</th>
              )}
              {formType !== 'DO' && (
                <th className="py-2.5 px-3 w-28 text-center border-r border-slate-200">Diskon</th>
              )}
              {formType !== 'DO' && (
                <th className="py-2.5 px-3 w-36 text-right border-r border-slate-200">Total (Rp)</th>
              )}
              <th className="py-2.5 px-3 w-14 text-center text-slate-500 font-bold">Hapus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.length === 0 ? (
              <tr>
                <td colSpan={formType === 'DO' ? 6 : 9} className="py-10 text-center text-slate-400 bg-slate-50/50">
                  <Boxes className="w-7 h-7 mx-auto mb-1.5 text-slate-300 stroke-[1.5]" />
                  <p className="font-semibold text-xs text-slate-600">Belum ada rincian barang dalam pesanan</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Pilih barang dari pencarian di atas untuk memasukkan kuantitas, harga, dan hitung diskon.
                  </p>
                </td>
              </tr>
            ) : (
              items.map((it, idx) => {
                const sub = (it.qty || 1) * (it.harga_jual || 0);
                const discVal = it.diskonRp
                  ? Number(it.diskonRp)
                  : (sub * (Number(it.diskonPersen) || 0)) / 100;
                const rowTotal = it.total !== undefined ? it.total : Math.max(0, sub - discVal);

                return (
                  <tr
                    key={it.rowId || `${it.id}_${idx}`}
                    onClick={() => handleEditRow(it, idx)}
                    className="hover:bg-emerald-50/40 cursor-pointer transition-colors group"
                    title="Klik baris untuk edit kuantitas, harga, dan kalkulator"
                  >
                    <td className="py-2 px-3 text-center text-slate-500 font-medium border-r border-slate-100">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-emerald-900 border-r border-slate-100">
                      {it.kode_sku}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-100">
                      <div className="font-bold text-slate-900 group-hover:text-emerald-950">
                        {it.nama}
                      </div>
                      {it.catatan && (
                        <div className="text-[10px] text-slate-500 italic truncate max-w-sm">
                          Catatan: {it.catatan}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center border-r border-slate-100 font-bold text-slate-900">
                      <span className="bg-slate-100 group-hover:bg-white px-2 py-0.5 rounded border border-slate-200 font-mono">
                        {Number(it.qty || 0).toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center text-slate-600 font-medium border-r border-slate-100">
                      {it.satuan || 'Pcs'}
                    </td>
                    {formType !== 'DO' && (
                      <td className="py-2 px-3 text-right font-semibold text-slate-800 border-r border-slate-100">
                        Rp {Number(it.harga_jual || 0).toLocaleString('id-ID')}
                      </td>
                    )}
                    {formType !== 'DO' && (
                      <td className="py-2 px-3 text-center text-slate-700 border-r border-slate-100">
                        {it.diskonRp > 0 ? (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            -Rp {Number(it.diskonRp).toLocaleString('id-ID')}
                          </span>
                        ) : it.diskonPersen > 0 ? (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            {it.diskonPersen}%
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">0%</span>
                        )}
                      </td>
                    )}
                    {formType !== 'DO' && (
                      <td className="py-2 px-3 text-right font-black text-slate-900 border-r border-slate-100 font-mono">
                        Rp {Number(rowTotal).toLocaleString('id-ID')}
                      </td>
                    )}
                    <td
                      className="py-2 px-3 text-center"
                      onClick={(e) => e.stopPropagation()} // Prevent opening edit modal when clicking delete
                    >
                      <button
                        type="button"
                        onClick={() => setItems(items.filter((_, i) => i !== idx))}
                        className="text-slate-300 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50 transition"
                        title="Hapus Baris"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Accurate Online Item Detail Modal & Built-in Calculator */}
      <ItemDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        item={modalItem}
        onSave={handleSaveModalItem}
        onDelete={modalItemIndex >= 0 ? handleDeleteModalItem : null}
        formType={formType}
        customerId={customerId}
        customerName={customerName}
        salesOrders={salesOrders}
        quotations={quotations}
        salesInvoices={salesInvoices}
        satuanList={satuanList}
        onAddSatuan={onAddSatuan}
      />
    </div>
  );
}
