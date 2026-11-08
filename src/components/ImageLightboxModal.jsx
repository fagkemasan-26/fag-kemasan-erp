'use client';

import React, { useEffect, useState } from 'react';
import { X, ZoomIn, ZoomOut, Download, ExternalLink, Image as ImageIcon } from 'lucide-react';

export default function ImageLightboxModal({ isOpen, imageUrl, title = 'Bukti Transaksi', onClose }) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const isPdf = imageUrl.toLowerCase().endsWith('.pdf') || imageUrl.toLowerCase().includes('application/pdf');

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `bukti-${Date.now()}.${isPdf ? 'pdf' : 'jpg'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div 
        className="w-full max-w-4xl flex items-center justify-between text-white pb-3 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-700/60 border border-emerald-500/40 flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-emerald-200" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm tracking-wide text-white">{title}</h3>
            <p className="text-[11px] text-slate-300">Tersimpan di Cloud Supabase Storage</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {!isPdf && (
            <>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
                title="Perkecil (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-slate-300 w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
                title="Perbesar (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleDownload}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition flex items-center space-x-1"
            title="Unduh File"
          >
            <Download className="w-4 h-4" />
          </button>

          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
            title="Buka Ukuran Asli di Tab Baru"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white transition ml-2"
            title="Tutup (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Image Content */}
      <div 
        className="flex-1 w-full flex items-center justify-center overflow-auto p-2"
        onClick={(e) => e.stopPropagation()}
      >
        {isPdf ? (
          <iframe 
            src={imageUrl} 
            className="w-full max-w-4xl h-full rounded-xl bg-white shadow-2xl border border-slate-700" 
            title="Pratinjau PDF"
          />
        ) : (
          <div className="relative transition-transform duration-150 ease-out flex items-center justify-center max-w-full max-h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={title}
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              className="max-h-[80vh] max-w-[90vw] object-contain rounded-xl shadow-2xl border border-white/20 select-none cursor-grab active:cursor-grabbing transition-transform duration-100"
            />
          </div>
        )}
      </div>

      {/* Bottom Hint */}
      <div className="text-[11px] text-slate-400 pb-1 select-none text-center">
        Klik di luar gambar atau tekan tombol <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono text-[10px]">Esc</kbd> untuk menutup
      </div>
    </div>
  );
}
