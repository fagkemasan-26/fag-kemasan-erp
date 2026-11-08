'use client';

import React, { useState, useRef } from 'react';
import { Camera, UploadCloud, Eye, Trash2, Image as ImageIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ImageLightboxModal from './ImageLightboxModal';

/**
 * Kompres gambar di sisi klien sebelum diupload ke Supabase Storage
 */
async function compressImageFile(file) {
  if (!file.type.startsWith('image/')) return file;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1600;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.85
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function FileUploadBukti({
  label = 'Bukti Foto / Lampiran Transaksi',
  value = '',
  onChange,
  docType = 'transaksi',
  helpText = 'Format JPG, PNG, atau WebP (struk transfer, surat jalan, atau foto barang).',
  compact = false,
}) {
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setErrorMsg('');

      // Kompres jika file berupa gambar
      const finalFile = await compressImageFile(file);

      // Generate nama file unik dengan prefix tanggal & jenis dokumen
      const cleanDocType = (docType || 'transaksi').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const timestamp = Date.now();
      const ext = finalFile.name.split('.').pop() || 'jpg';
      const fileName = `${cleanDocType}-${timestamp}.${ext}`;
      const filePath = `${fileName}`;

      // Upload ke Supabase Storage bucket 'bukti-transaksi'
      const { data, error } = await supabase.storage
        .from('bukti-transaksi')
        .upload(filePath, finalFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: finalFile.type || 'image/jpeg',
        });

      if (error) throw error;

      // Ambil Public URL
      const { data: publicUrlData } = supabase.storage
        .from('bukti-transaksi')
        .getPublicUrl(filePath);

      const finalUrl = publicUrlData?.publicUrl || '';
      if (!finalUrl) throw new Error('Gagal mendapatkan URL publik dari storage.');

      if (onChange) onChange(finalUrl);
    } catch (err) {
      console.error('Upload bukti error:', err);
      setErrorMsg(err.message || 'Gagal mengupload bukti foto');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    if (onChange) onChange('');
    setErrorMsg('');
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
          <span className="flex items-center space-x-1">
            <Camera className="w-3.5 h-3.5 text-emerald-800" />
            <span>{label}</span>
          </span>
          {value && (
            <span className="text-[10px] text-emerald-800 font-semibold flex items-center space-x-0.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
              <span>Bukti Terlampir</span>
            </span>
          )}
        </label>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload Zone / Preview Card */}
      {value ? (
        <div className={`p-2 bg-emerald-50/70 border border-emerald-300 rounded-xl flex items-center justify-between gap-3 ${compact ? 'py-1.5' : 'p-2.5'}`}>
          <div className="flex items-center space-x-2.5 min-w-0">
            {/* Thumbnail */}
            <div 
              onClick={() => setIsLightboxOpen(true)}
              className="w-10 h-10 rounded-lg overflow-hidden border border-emerald-300 bg-white shrink-0 cursor-pointer hover:opacity-85 shadow-2xs relative group"
              title="Klik untuk memperbesar"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="Bukti"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <Eye className="w-4 h-4 text-white" />
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-xs font-bold text-emerald-950 truncate max-w-[180px] sm:max-w-xs">
                Foto Bukti Tersimpan
              </p>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                className="text-[10px] text-emerald-800 hover:text-emerald-950 font-bold underline cursor-pointer"
              >
                Lihat Ukuran Penuh
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-white hover:bg-emerald-100/60 rounded-lg border border-emerald-300 shadow-2xs flex items-center space-x-1 transition cursor-pointer"
              title="Lihat Pratinjau Foto"
            >
              <Eye className="w-3 h-3" />
              <span>Lihat</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 shadow-2xs transition cursor-pointer"
              title="Ganti Foto"
            >
              Ganti
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1 text-rose-600 hover:bg-rose-100 rounded-lg transition cursor-pointer"
              title="Hapus Bukti"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed border-slate-300 hover:border-emerald-600 hover:bg-emerald-50/30 rounded-xl transition cursor-pointer text-center group flex flex-col items-center justify-center ${
            compact ? 'py-2 px-3' : 'py-3.5 px-4'
          }`}
        >
          {uploading ? (
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-800 py-1">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
              <span>Mengupload bukti ke Supabase Storage...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-slate-600 group-hover:text-emerald-900">
              <div className="p-1.5 bg-slate-100 group-hover:bg-emerald-100 text-slate-600 group-hover:text-emerald-800 rounded-lg transition">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold">
                  Klik untuk Upload Bukti Foto / Struk
                </p>
                {helpText && <p className="text-[10px] text-slate-400 group-hover:text-slate-500">{helpText}</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <p className="text-[10px] text-rose-600 font-semibold mt-1">
          ⚠️ {errorMsg}
        </p>
      )}

      {/* Lightbox Modal */}
      <ImageLightboxModal
        isOpen={isLightboxOpen}
        imageUrl={value}
        title={label}
        onClose={() => setIsLightboxOpen(false)}
      />
    </div>
  );
}
