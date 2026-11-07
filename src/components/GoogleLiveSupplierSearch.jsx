'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Building2, Phone, MapPin, Plus, Check, Edit2 } from 'lucide-react';

export default function GoogleLiveSupplierSearch({
  suppliers = [],
  selectedSupplierId,
  onSelectSupplier,
  placeholder = "Cari pemasok / supplier kemasan... (Nama pabrik, nomor WA, atau alamat)",
  onOpenNewSupplierModal,
  className = ""
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Find currently selected supplier
  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  // Filter suppliers by name, phone, email, address
  const filteredSuppliers = query.trim() === ''
    ? suppliers.slice(0, 8)
    : suppliers.filter((s) => {
        const q = query.toLowerCase();
        const nameMatch = s.nama?.toLowerCase().includes(q);
        const phoneMatch = s.telepon?.toLowerCase().includes(q);
        const addressMatch = s.alamat?.toLowerCase().includes(q);
        return nameMatch || phoneMatch || addressMatch;
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

  const handleKeyDown = (e) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, filteredSuppliers.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredSuppliers.length) % Math.max(1, filteredSuppliers.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSuppliers.length > 0 && filteredSuppliers[highlightedIndex]) {
        handleSelect(filteredSuppliers[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (supplier) => {
    onSelectSupplier(supplier.id);
    setQuery('');
    setIsOpen(false);
  };

  const handleClearSelected = () => {
    onSelectSupplier('');
    setQuery('');
    setTimeout(() => {
      inputRef.current?.focus();
      setIsOpen(true);
    }, 50);
  };

  // Helper to highlight match
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

  // If a supplier is selected and search is not open, show the supplier card
  if (selectedSupplier && !isOpen) {
    return (
      <div className={`flex items-center justify-between p-2.5 bg-emerald-50/70 border border-emerald-300 rounded-xl shadow-2xs ${className}`}>
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs">
            {selectedSupplier.nama?.slice(0, 2).toUpperCase() || 'SP'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xs text-slate-900 truncate">
                {selectedSupplier.nama}
              </span>
              <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-semibold">
                Pemasok
              </span>
            </div>
            <div className="flex items-center space-x-3 text-[11px] text-slate-500 truncate">
              {selectedSupplier.telepon && (
                <span className="flex items-center">
                  <Phone className="w-3 h-3 mr-1 text-emerald-600" />
                  {selectedSupplier.telepon}
                </span>
              )}
              {selectedSupplier.alamat && (
                <span className="flex items-center truncate">
                  <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                  {selectedSupplier.alamat}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClearSelected}
          className="apple-btn-secondary px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-emerald-900 flex items-center space-x-1 flex-shrink-0 ml-2"
        >
          <Edit2 className="w-3 h-3 text-slate-500" />
          <span>Ganti</span>
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input Box */}
      <div className="relative flex items-center border border-slate-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-emerald-700/20 focus-within:border-emerald-700 transition shadow-2xs">
        <div className="pl-3 pr-2 text-slate-400">
          <Search className="w-4 h-4" />
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
          className="w-full py-2 pr-8 text-xs font-medium text-slate-800 placeholder-slate-400 bg-transparent outline-none"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="p-1 mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
            title="Hapus pencarian"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Floating Dropdown List */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-semibold text-slate-500">
            <span>
              {query.trim() === '' ? 'Daftar Pemasok Kemasan:' : `Hasil Pencarian (${filteredSuppliers.length} pemasok):`}
            </span>
            <span className="text-[10px] text-slate-400">Pilih dari daftar</span>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
            {filteredSuppliers.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">
                <p>Pemasok &quot;{query}&quot; tidak ditemukan.</p>
              </div>
            ) : (
              filteredSuppliers.map((s, index) => {
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={s.id}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelect(s)}
                    className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                      isHighlighted ? 'bg-emerald-50 text-emerald-950 font-semibold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                        {s.nama?.slice(0, 2).toUpperCase() || 'SP'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {highlightMatch(s.nama, query)}
                        </p>
                        <div className="flex items-center space-x-3 text-[10px] text-slate-500">
                          {s.telepon && (
                            <span className="flex items-center">
                              <Phone className="w-2.5 h-2.5 mr-1 text-emerald-600" />
                              {highlightMatch(s.telepon, query)}
                            </span>
                          )}
                          {s.alamat && (
                            <span className="truncate">
                              {highlightMatch(s.alamat, query)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pl-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        isHighlighted ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        Pilih
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {onOpenNewSupplierModal && (
            <div className="p-2 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenNewSupplierModal();
                }}
                className="w-full py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ Tambah Pemasok Baru</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
