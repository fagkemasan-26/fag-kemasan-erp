'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  Download,
  ExternalLink,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { parseLampiranUrls } from '../lib/lampiranHelper';

export default function ImageLightboxModal({
  isOpen,
  imageUrl = '',
  images = null,
  initialIndex = 0,
  title = 'Bukti Transaksi',
  onClose,
}) {
  const [zoom, setZoom] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Parse all images into a clean array
  const imageList = useMemo(() => {
    if (images && Array.isArray(images) && images.length > 0) {
      return images.filter(Boolean);
    }
    return parseLampiranUrls(imageUrl);
  }, [images, imageUrl]);

  // Sync index on open
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      const targetIndex =
        typeof initialIndex === 'number' && initialIndex >= 0 && initialIndex < imageList.length
          ? initialIndex
          : 0;
      setCurrentIndex(targetIndex);
    }
  }, [isOpen, initialIndex, imageList.length]);

  const total = imageList.length;
  const currentUrl = imageList[currentIndex] || '';
  const isPdf =
    currentUrl.toLowerCase().endsWith('.pdf') ||
    currentUrl.toLowerCase().includes('application/pdf');

  const handlePrev = useCallback(() => {
    setZoom(1);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
  }, [total]);

  const handleNext = useCallback(() => {
    setZoom(1);
    setCurrentIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
  }, [total]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      } else if (e.key === 'ArrowLeft' && total > 1) {
        handlePrev();
      } else if (e.key === 'ArrowRight' && total > 1) {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, total, onClose, handlePrev, handleNext]);

  if (!isOpen || total === 0 || !currentUrl) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(currentUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `bukti-${currentIndex + 1}-${Date.now()}.${isPdf ? 'pdf' : 'jpg'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(currentUrl, '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-5 animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div
        className="w-full max-w-5xl flex items-center justify-between text-white pb-2.5 px-2 border-b border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-700/60 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <ImageIcon className="w-4 h-4 text-emerald-200" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-sm tracking-wide text-white truncate max-w-[220px] sm:max-w-md">
                {title}
              </h3>
              {total > 1 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-[11px] font-bold">
                  Foto {currentIndex + 1} dari {total}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">Tersimpan di Cloud Supabase Storage</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {!isPdf && (
            <>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Perkecil (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 font-mono text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                title="Reset Ukuran (100%)"
              >
                <span>{Math.round(zoom * 100)}%</span>
                <RotateCcw className="w-3 h-3 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3.5, Number((z + 0.25).toFixed(2))))}
                className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Perbesar (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleDownload}
            className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition flex items-center space-x-1 cursor-pointer"
            title="Unduh File Ini"
          >
            <Download className="w-4 h-4" />
          </button>

          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            title="Buka Ukuran Asli di Tab Baru"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white transition ml-1.5 cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Image Display with Left/Right Nav */}
      <div
        className="flex-1 w-full max-w-5xl flex items-center justify-between relative overflow-hidden p-2 my-1"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Arrow */}
        {total > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 z-20 p-2.5 sm:p-3 rounded-full bg-slate-900/80 hover:bg-emerald-700 text-white border border-white/20 shadow-xl transition cursor-pointer active:scale-90"
            title="Foto Sebelumnya (Panah Kiri)"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Center Container */}
        <div className="flex-1 h-full flex items-center justify-center overflow-auto p-2">
          {isPdf ? (
            <iframe
              src={currentUrl}
              className="w-full max-w-4xl h-full rounded-xl bg-white shadow-2xl border border-slate-700"
              title="Pratinjau PDF"
            />
          ) : (
            <div className="relative transition-transform duration-150 ease-out flex items-center justify-center max-w-full max-h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentUrl}
                alt={`${title} - ${currentIndex + 1}`}
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                className="max-h-[72vh] max-w-[85vw] object-contain rounded-xl shadow-2xl border border-white/20 select-none cursor-grab active:cursor-grabbing transition-transform duration-100"
              />
            </div>
          )}
        </div>

        {/* Right Arrow */}
        {total > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 sm:right-4 z-20 p-2.5 sm:p-3 rounded-full bg-slate-900/80 hover:bg-emerald-700 text-white border border-white/20 shadow-xl transition cursor-pointer active:scale-90"
            title="Foto Selanjutnya (Panah Kanan)"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip (if multiple photos) */}
      {total > 1 && (
        <div
          className="w-full max-w-3xl flex items-center justify-center space-x-2 py-1.5 px-3 overflow-x-auto bg-black/40 rounded-xl border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {imageList.map((url, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={url + idx}
                type="button"
                onClick={() => {
                  setZoom(1);
                  setCurrentIndex(idx);
                }}
                className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-emerald-400 ring-2 ring-emerald-400/50 scale-105 opacity-100'
                    : 'border-white/20 opacity-60 hover:opacity-100 hover:border-white/40'
                }`}
                title={`Lihat foto ${idx + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[9px] font-mono px-1 rounded-tl">
                  {idx + 1}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Bottom Hint */}
      <div className="text-[11px] text-slate-400 pt-1 select-none text-center flex items-center space-x-2">
        <span>Gunakan panah</span>
        <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono text-[10px]">
          ◀
        </kbd>
        <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono text-[10px]">
          ▶
        </kbd>
        <span>untuk navigasi • Tekan</span>
        <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono text-[10px]">
          Esc
        </kbd>
        <span>untuk menutup</span>
      </div>
    </div>
  );
}
