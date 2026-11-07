'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Check } from 'lucide-react';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

/**
 * ModernDatePicker: Enterprise ERP Custom Date Picker Popover
 * Replaces native browser OS calendar with a clean, branded FAG Emerald calendar.
 */
export default function ModernDatePicker({
  value, // Format: 'YYYY-MM-DD'
  onChange,
  label = '',
  placeholder = 'Pilih tanggal...',
  disabled = false,
  className = '',
  showPresets = true,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse initial date or fallback to today
  const parsedDate = value ? new Date(value + 'T00:00:00') : new Date();
  const validParsed = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  const [currentYear, setCurrentYear] = useState(validParsed.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(validParsed.getMonth());

  // Sync year/month when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setCurrentYear(d.getFullYear());
        setCurrentMonth(d.getMonth());
      }
    }
  }, [value]);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format date for display in input
  const formatDisplayDate = (val) => {
    if (!val) return '';
    try {
      const d = new Date(val + 'T00:00:00');
      if (isNaN(d.getTime())) return val;
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return val;
    }
  };

  // Helper to format ISO YYYY-MM-DD
  const toISODate = (year, month, day) => {
    const m = (month + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  // Quick preset actions
  const applyPreset = (daysOffset) => {
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    const iso = toISODate(target.getFullYear(), target.getMonth(), target.getDate());
    onChange(iso);
    setCurrentYear(target.getFullYear());
    setCurrentMonth(target.getMonth());
    setIsOpen(false);
  };

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  // Generate calendar days matrix
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const calendarDays = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarDays.push({
      day: daysInPrevMonth - i,
      month: currentMonth - 1,
      year: currentMonth === 0 ? currentYear - 1 : currentYear,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({
      day: d,
      month: currentMonth,
      year: currentYear,
      isCurrentMonth: true,
    });
  }

  // Next month leading days to complete grid (42 days = 6 rows)
  const remainingCells = 42 - calendarDays.length;
  for (let d = 1; d <= remainingCells; d++) {
    calendarDays.push({
      day: d,
      month: currentMonth + 1,
      year: currentMonth === 11 ? currentYear + 1 : currentYear,
      isCurrentMonth: false,
    });
  }

  const today = new Date();
  const todayISO = toISODate(today.getFullYear(), today.getMonth(), today.getDate());

  const handleSelectDay = (cell) => {
    let m = cell.month;
    let y = cell.year;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    const iso = toISODate(y, m, cell.day);
    onChange(iso);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 mb-1">
          {label}
        </label>
      )}

      {/* Modern Trigger Input */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg border bg-white transition shadow-2xs ${
          isOpen
            ? 'border-emerald-600 ring-2 ring-emerald-500/20 text-slate-900'
            : 'border-slate-300 hover:border-slate-400 text-slate-800'
        } ${disabled ? 'bg-slate-100 opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center space-x-2 truncate">
          <CalendarIcon className="w-3.5 h-3.5 text-emerald-800 stroke-[2] shrink-0" />
          <span className="font-semibold text-slate-800 font-mono">
            {value ? formatDisplayDate(value) : placeholder}
          </span>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
          {value ? new Date(value + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short' }) : 'Pilih'}
        </span>
      </button>

      {/* Floating Modern ERP Calendar Popover */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-76 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-3.5 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Quick Presets Bar */}
          {showPresets && (
            <div className="flex items-center justify-between gap-1 pb-3 mb-3 border-b border-slate-100 text-[11px] overflow-x-auto">
              <button
                type="button"
                onClick={() => applyPreset(0)}
                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded font-bold transition whitespace-nowrap"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => applyPreset(1)}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold transition whitespace-nowrap"
              >
                Besok
              </button>
              <button
                type="button"
                onClick={() => applyPreset(7)}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold transition whitespace-nowrap"
              >
                +7 Hari
              </button>
              <button
                type="button"
                onClick={() => applyPreset(14)}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold transition whitespace-nowrap"
              >
                +14 Hari
              </button>
              <button
                type="button"
                onClick={() => applyPreset(30)}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold transition whitespace-nowrap"
              >
                +30 Hari
              </button>
            </div>
          )}

          {/* Month & Year Navigation Header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
              title="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-1.5 font-bold text-slate-800 text-xs">
              <span className="text-emerald-950">{MONTH_NAMES[currentMonth]}</span>
              <span className="text-slate-500 font-mono">{currentYear}</span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
              title="Bulan berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {DAY_NAMES.map((dn, i) => (
              <div key={i} className={`py-1 ${i === 0 ? 'text-rose-500' : ''}`}>
                {dn}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {calendarDays.map((cell, idx) => {
              let m = cell.month;
              let y = cell.year;
              if (m < 0) {
                m = 11;
                y -= 1;
              } else if (m > 11) {
                m = 0;
                y += 1;
              }
              const iso = toISODate(y, m, cell.day);
              const isSelected = value === iso;
              const isToday = todayISO === iso;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(cell)}
                  className={`h-7 w-full rounded-lg font-semibold flex items-center justify-center transition text-[11px] ${
                    isSelected
                      ? 'bg-[#0A3828] text-white font-bold shadow-xs'
                      : isToday
                      ? 'border border-emerald-600 text-emerald-900 font-extrabold bg-emerald-50/50'
                      : cell.isCurrentMonth
                      ? 'text-slate-800 hover:bg-slate-100'
                      : 'text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Terpilih: <strong className="font-mono text-emerald-900">{formatDisplayDate(value)}</strong></span>
            <button
              type="button"
              onClick={() => {
                applyPreset(0);
              }}
              className="text-emerald-800 font-bold hover:underline"
            >
              Setel Hari Ini
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
