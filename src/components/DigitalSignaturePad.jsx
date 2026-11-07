'use client';

import React, { useRef, useState, useEffect } from 'react';
import { PenTool, Upload, Trash2, Check, RefreshCw, Sparkles, Image as ImageIcon, ShieldCheck } from 'lucide-react';

export default function DigitalSignaturePad({
  currentSignature,
  onSave,
  onRemove,
  signatoryName = 'Fauzan Ghani',
  onChangeSignatoryName,
  signatoryTitle = 'Direktur Utama',
  onChangeSignatoryTitle,
  isCompact = false,
}) {
  const canvasRef = useRef(null);
  const [mode, setMode] = useState('draw'); // 'draw' | 'upload'
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState('#0f172a'); // Dark Navy / Black
  const [previewSignature, setPreviewSignature] = useState(currentSignature || null);

  useEffect(() => {
    setPreviewSignature(currentSignature || null);
  }, [currentSignature]);

  // Set up canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && mode === 'draw') {
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = penColor;
    }
  }, [penColor, mode]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSaveFromCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!hasDrawn) {
      alert('Silakan goreskan tanda tangan terlebih dahulu pada canvas!');
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    setPreviewSignature(dataUrl);
    if (onSave) onSave(dataUrl);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Harap pilih file gambar (PNG, JPG, atau WebP)!');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        setPreviewSignature(dataUrl);
        if (onSave) onSave(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setPreviewSignature(null);
    clearCanvas();
    if (onRemove) onRemove();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-300 p-4 shadow-2xs space-y-3.5">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-slate-200 gap-2">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-[#07291D] text-emerald-300 flex items-center justify-center border border-emerald-600/40">
            <PenTool className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center space-x-1.5">
              <span>Tanda Tangan Digital Resmi (Bebas Bolpoint)</span>
              <span className="bg-emerald-50 text-emerald-900 border border-emerald-200 text-[9px] font-bold px-1.5 py-0.2 rounded font-mono">
                Auto-Signed
              </span>
            </h4>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Tanda tangan otomatis tertera pada seluruh cetakan PDF (PI, PO, Surat Jalan, Invoice, Kuitansi, &amp; Laporan)
            </p>
          </div>
        </div>

        {/* Tab Mode: Gores Langsung vs Upload File */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-300 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode('draw')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition flex items-center space-x-1 ${
              mode === 'draw'
                ? 'bg-[#0A3828] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PenTool className="w-3 h-3" />
            <span>Gores di Layar</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition flex items-center space-x-1 ${
              mode === 'upload'
                ? 'bg-[#0A3828] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3 h-3" />
            <span>Upload Foto / PNG</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
        {/* Left Area (Canvas or Upload Box) */}
        <div className="md:col-span-7 space-y-2">
          {mode === 'draw' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span className="font-semibold flex items-center space-x-1">
                  <span>Goreskan tanda tangan dengan mouse, touchpad, atau jari/layar sentuh:</span>
                </span>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] text-slate-400">Warna Tinta:</span>
                  <button
                    type="button"
                    onClick={() => setPenColor('#0f172a')}
                    className={`w-4 h-4 rounded-full bg-[#0f172a] border ${penColor === '#0f172a' ? 'ring-2 ring-emerald-500 scale-110' : ''}`}
                    title="Hitam Elegan"
                  />
                  <button
                    type="button"
                    onClick={() => setPenColor('#1e3a8a')}
                    className={`w-4 h-4 rounded-full bg-[#1e3a8a] border ${penColor === '#1e3a8a' ? 'ring-2 ring-emerald-500 scale-110' : ''}`}
                    title="Biru Pena Dokumen Resmi"
                  />
                  <button
                    type="button"
                    onClick={() => setPenColor('#1d4ed8')}
                    className={`w-4 h-4 rounded-full bg-[#1d4ed8] border ${penColor === '#1d4ed8' ? 'ring-2 ring-emerald-500 scale-110' : ''}`}
                    title="Biru Royal"
                  />
                </div>
              </div>

              {/* Canvas Pad */}
              <div className="relative border-2 border-dashed border-slate-300 hover:border-emerald-600 rounded-xl overflow-hidden bg-slate-50/50 touch-none cursor-crosshair transition-colors">
                <canvas
                  ref={canvasRef}
                  width={460}
                  height={150}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[150px] block"
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400 text-xs italic select-none">
                    Goreskan tanda tangan Anda di sini...
                  </div>
                )}
              </div>

              {/* Canvas Controls */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="px-2.5 py-1 text-slate-500 hover:text-rose-600 text-[11px] font-bold rounded hover:bg-rose-50 transition flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Bersihkan Canvas</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveFromCanvas}
                  disabled={!hasDrawn}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs ${
                    hasDrawn
                      ? 'bg-[#0A3828] hover:bg-[#07291D] text-white active:scale-95'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Gunakan Tanda Tangan Ini</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-700">
                Pilih File Gambar Tanda Tangan (Format PNG Transparan / JPG):
              </label>
              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-600 rounded-xl p-5 text-center bg-slate-50 hover:bg-emerald-50/30 transition cursor-pointer relative">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex flex-col items-center justify-center space-y-1.5 pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    Klik di sini untuk upload foto atau file tanda tangan
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Sangat disarankan file PNG dengan latar belakang transparan
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form Nama & Jabatan Penandatangan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200">
            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                Nama Resmi Penandatangan:
              </label>
              <input
                type="text"
                value={signatoryName}
                onChange={(e) => onChangeSignatoryName && onChangeSignatoryName(e.target.value)}
                placeholder="Contoh: Fauzan Ghani"
                className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-emerald-600 font-semibold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                Jabatan (Opsional):
              </label>
              <input
                type="text"
                value={signatoryTitle}
                onChange={(e) => onChangeSignatoryTitle && onChangeSignatoryTitle(e.target.value)}
                placeholder="Contoh: Direktur Utama / Owner"
                className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* Right Area (Live Preview on Document Paper) */}
        <div className="md:col-span-5 bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-800" />
              <span>Pratinjau Hasil di PDF</span>
            </span>
            {previewSignature && (
              <button
                type="button"
                onClick={handleRemove}
                className="text-[10px] text-rose-600 hover:text-rose-800 font-bold flex items-center space-x-0.5"
                title="Hapus tanda tangan"
              >
                <Trash2 className="w-3 h-3" />
                <span>Hapus</span>
              </button>
            )}
          </div>

          {/* Paper-like Simulation Box */}
          <div className="bg-white rounded-lg border border-slate-300 p-4 text-center shadow-2xs space-y-1">
            <p className="text-[10px] font-bold text-slate-700">Hormat Kami,</p>

            <div className="h-16 flex items-center justify-center my-1">
              {previewSignature ? (
                <img
                  src={previewSignature}
                  alt="Tanda Tangan Digital"
                  className="max-h-16 max-w-[150px] object-contain mx-auto transition-transform hover:scale-105"
                />
              ) : (
                <div className="h-14 border border-dashed border-slate-300 rounded flex items-center justify-center w-full max-w-[150px] mx-auto text-[10px] text-slate-400 italic">
                  Belum ada tanda tangan
                </div>
              )}
            </div>

            <p className="text-[11px] font-black text-slate-900 border-t border-slate-400 pt-1 inline-block px-4">
              ( {signatoryName || 'Fauzan Ghani'} )
            </p>
            {signatoryTitle && (
              <p className="text-[9px] text-slate-500">{signatoryTitle}</p>
            )}
          </div>

          <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-[10px] text-emerald-950 font-medium leading-relaxed">
            ✓ <strong>Tidak Perlu Pakai Bolpoint:</strong> Saat cetak atau ekspor PDF, tanda tangan ini akan langsung tercetak resmi dan rapi.
          </div>
        </div>
      </div>
    </div>
  );
}
