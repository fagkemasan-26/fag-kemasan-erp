'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Phone, MapPin, Building, Plus, Check, Edit2 } from 'lucide-react';

export default function GoogleLiveCustomerSearch({
  contacts = [],
  selectedCustomerId,
  onSelectCustomer,
  placeholder = "Cari calon pelanggan... (Ketik nama toko, nomor WhatsApp, atau alamat)",
  onOpenNewCustomerModal,
  className = ""
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Base customer contacts (exclude suppliers)
  const customerContacts = contacts.filter((c) => !c.tipe || c.tipe.toLowerCase() === 'pelanggan');

  // Find currently selected customer
  const selectedCustomer = contacts.find((c) => c.id === selectedCustomerId);

  // Filter customers by name, phone, email, address
  const filteredCustomers = query.trim() === ''
    ? customerContacts.slice(0, 8)
    : customerContacts.filter((c) => {
        const q = query.toLowerCase();
        const nameMatch = c.nama?.toLowerCase().includes(q);
        const phoneMatch = c.telepon?.toLowerCase().includes(q);
        const addressMatch = c.alamat?.toLowerCase().includes(q);
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
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, filteredCustomers.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredCustomers.length) % Math.max(1, filteredCustomers.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCustomers.length > 0 && filteredCustomers[highlightedIndex]) {
        handleSelect(filteredCustomers[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (customer) => {
    onSelectCustomer(customer.id);
    setQuery('');
    setIsOpen(false);
  };

  const handleClearSelected = () => {
    onSelectCustomer('');
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

  // If a customer is selected and search is not open, show the customer card
  if (selectedCustomer && !isOpen) {
    return (
      <div className={`flex items-center justify-between p-2.5 bg-emerald-50/70 border border-emerald-300 rounded-xl shadow-xs ${className}`}>
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
            {selectedCustomer.nama?.slice(0, 2).toUpperCase() || 'PL'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xs text-slate-900 truncate">
                {selectedCustomer.nama}
              </span>
              <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-semibold">
                Pelanggan
              </span>
            </div>
            <div className="flex items-center space-x-3 text-[11px] text-slate-500 truncate">
              {selectedCustomer.telepon && (
                <span className="flex items-center">
                  <Phone className="w-3 h-3 mr-1 text-emerald-600" />
                  {selectedCustomer.telepon}
                </span>
              )}
              {selectedCustomer.alamat && (
                <span className="flex items-center truncate">
                  <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                  {selectedCustomer.alamat}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClearSelected}
          className="ml-2 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-white hover:bg-emerald-100/60 border border-emerald-200 rounded-lg flex items-center space-x-1 transition flex-shrink-0 shadow-2xs"
          title="Ganti pelanggan"
        >
          <Edit2 className="w-3 h-3" />
          <span>Ganti</span>
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Input Bar */}
      <div className="relative flex items-center bg-white border border-slate-300 hover:border-emerald-500 focus-within:border-emerald-600 focus-within:ring-3 focus-within:ring-emerald-500/15 rounded-xl shadow-2xs transition-all">
        <div className="pl-3 pr-2 flex items-center pointer-events-none text-emerald-700">
          <Search className="w-3.5 h-3.5 stroke-[2.5]" />
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
              {query.trim() === '' ? 'Daftar Calon Pelanggan:' : `Hasil Pencarian (${filteredCustomers.length} pelanggan):`}
            </span>
            <span className="text-[10px] text-slate-400">Pilih dari daftar</span>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
            {filteredCustomers.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">
                <p>Pelanggan "{query}" tidak ditemukan.</p>
              </div>
            ) : (
              filteredCustomers.map((c, index) => {
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={c.id}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelect(c)}
                    className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                      isHighlighted ? 'bg-emerald-50 text-emerald-950 font-semibold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                        {c.nama?.slice(0, 2).toUpperCase() || 'PL'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {highlightMatch(c.nama, query)}
                        </p>
                        <div className="flex items-center space-x-3 text-[10px] text-slate-500">
                          {c.telepon && (
                            <span className="flex items-center">
                              <Phone className="w-2.5 h-2.5 mr-1 text-emerald-600" />
                              {highlightMatch(c.telepon, query)}
                            </span>
                          )}
                          {c.alamat && (
                            <span className="truncate">
                              {highlightMatch(c.alamat, query)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pl-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        isHighlighted ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        Pilih
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {onOpenNewCustomerModal && (
            <div className="p-2 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenNewCustomerModal();
                }}
                className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ Buat Calon Pelanggan Baru</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}