'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Package, Plus, Check, ArrowRight, Boxes } from 'lucide-react';

export default function GoogleLiveProductSearch({
  products = [],
  onSelectProduct,
  placeholder = "Cari produk kemasan... (Ketik kardus, standing pouch, bubble wrap, atau kode SKU)",
  className = ""
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const isSelectingRef = useRef(false);

  // Filter products based on search term (name, sku, category)
  const filteredProducts = query.trim() === ''
    ? products.slice(0, 8) // show popular/first 8 when empty query focused
    : products.filter((p) => {
        const q = query.toLowerCase();
        const nameMatch = p.nama?.toLowerCase().includes(q);
        const skuMatch = p.kode_sku?.toLowerCase().includes(q);
        const catMatch = (p.kategori?.nama || '').toLowerCase().includes(q);
        return nameMatch || skuMatch || catMatch;
      }).slice(0, 15);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, filteredProducts.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredProducts.length) % Math.max(1, filteredProducts.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts.length > 0 && filteredProducts[highlightedIndex]) {
        handleSelect(filteredProducts[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (product) => {
    if (!product || isSelectingRef.current) return;
    isSelectingRef.current = true;
    setTimeout(() => {
      isSelectingRef.current = false;
    }, 350);

    onSelectProduct(product);
    setQuery('');
    setIsOpen(false);
    setHighlightedIndex(0);
    // Keep input focused for rapid multi-item entry
    inputRef.current?.focus();
  };

  // Helper to highlight matching text
  const highlightMatch = (text, q) => {
    if (!q || !text) return text;
    const parts = text.split(new RegExp(`(${q})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <span key={i} className="bg-emerald-100 text-emerald-950 font-black rounded px-0.5">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Google-Style Search Input Bar */}
      <div className="relative flex items-center bg-white border-2 border-emerald-500/40 hover:border-emerald-500 focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-500/15 rounded-xl shadow-sm transition-all duration-200">
        <div className="pl-3.5 pr-2 flex items-center pointer-events-none text-emerald-700">
          <Search className="w-4 h-4 stroke-[2.5]" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full py-2.5 pr-9 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 bg-transparent outline-none"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="p-1.5 mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
            title="Hapus pencarian"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Floating Google Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-500">
            <span>
              {query.trim() === '' ? 'Rekomendasi Barang Kemasan Populer:' : `Hasil Pencarian (${filteredProducts.length} item):`}
            </span>
            <span className="text-[10px] text-slate-400">Tekan Enter atau klik untuk langsung tambah</span>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {filteredProducts.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                <Boxes className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                <p className="text-xs font-semibold text-slate-600">Tidak ada produk kemasan yang cocok</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Coba kata kunci lain atau periksa ejaan nama/SKU kemasan.
                </p>
              </div>
            ) : (
              filteredProducts.map((p, index) => {
                const isHighlighted = index === highlightedIndex;
                const isLowStock = Number(p.stok || 0) <= 20;

                return (
                  <div
                    key={p.id}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelect(p)}
                    className={`px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                      isHighlighted ? 'bg-emerald-50/80 text-emerald-950' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                        <Package className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            {highlightMatch(p.kode_sku, query)}
                          </span>
                          <span className="font-bold text-xs text-slate-800 truncate">
                            {highlightMatch(p.nama, query)}
                          </span>
                          {p.kategori?.nama && (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                              {p.kategori.nama}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-3 mt-0.5 text-[11px] text-slate-500">
                          <span>
                            Harga: <strong className="text-slate-800">{Number(p.harga_jual || 0) > 0 ? `Rp ${Number(p.harga_jual).toLocaleString('id-ID')}` : 'Fleksibel'}</strong> / {p.satuan || 'Pcs'}
                          </span>
                          <span>•</span>
                          <span className={`font-semibold ${isLowStock ? 'text-amber-600 font-bold' : 'text-emerald-700'}`}>
                            Stok: {p.stok || 0} {p.satuan || 'Pcs'} {isLowStock ? '(Menipis)' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pl-3 flex items-center space-x-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(p);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition ${
                          isHighlighted
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-700 hover:bg-emerald-600 hover:text-white'
                        }`}
                      >
                        <Plus className="w-3 h-3 stroke-[2.5]" />
                        <span>Tambah</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}