'use client';

import React, { useState, useRef, useMemo } from 'react';
import {
  Camera,
  UploadCloud,
  Eye,
  Trash2,
  Plus,
  Loader2,
  CheckCircle2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import ImageLightboxModal from './ImageLightboxModal';
import { parseLampiranUrls, formatLampiranUrls } from '../lib/lampiranHelper';

/**
 * Kompres file gambar di browser sebelum dikirim ke Supabase Storage
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
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, '') + '.jpg',
                {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                }
              );
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.85
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export default function FileUploadBukti({
  label = 'Bukti Foto / Lampiran Transaksi',
  value = '',
  onChange,
  docType = 'transaksi',
  helpText = 'Bisa pilih lebih dari 1 foto (JPG, PNG, WebP, PDF). Maksimal 10 file.',
  compact = false,
  maxFiles = 10,
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Parse existing value into array of URLs
  const fileList = useMemo(() => parseLampiranUrls(value), [value]);

  const uploadFileList = async (files) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxFiles - fileList.length;
    if (remainingSlots <= 0) {
      setErrorMsg(`Maksimal ${maxFiles} foto lampiran yang dapat diunggah.`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    try {
      setUploading(true);
      setErrorMsg('');
      const uploadedUrls = [];

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        setUploadProgress(`Mengunggah foto ${i + 1} dari ${filesToUpload.length}...`);

        // Kompres jika image
        const finalFile = await compressImageFile(file);

        // Buat nama file unik
        const cleanDocType = (docType || 'transaksi').toLowerCase().replace(/[^a-z0-9]/g, '-');
        const timestamp = Date.now() + '-' + Math.floor(Math.random() * 1000);
        const ext = finalFile.name.split('.').pop() || 'jpg';
        const filePath = `${cleanDocType}-${timestamp}.${ext}`;

        // Upload ke bucket 'bukti-transaksi'
        const { error: uploadErr } = await supabase.storage
          .from('bukti-transaksi')
          .upload(filePath, finalFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: finalFile.type || 'image/jpeg',
          });

        if (uploadErr) throw uploadErr;

        // Ambil Public URL
        const { data: publicUrlData } = supabase.storage
          .from('bukti-transaksi')
          .getPublicUrl(filePath);

        if (!publicUrlData?.publicUrl) {
          throw new Error('Gagal mendapatkan URL publik dari storage.');
        }

        uploadedUrls.push(publicUrlData.publicUrl);
      }

      // Gabungkan dengan file yang sudah ada sebelumnya
      const newUrls = [...fileList, ...uploadedUrls];
      onChange?.(formatLampiranUrls(newUrls));
    } catch (err) {
      console.error('Upload bukti error:', err);
      setErrorMsg(err.message || 'Gagal mengunggah bukti foto.');
    } finally {
      setUploading(false);
      setUploadProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e) => {
    uploadFileList(e.target.files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files) {
      uploadFileList(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemoveSingle = (idxToRemove, e) => {
    e?.stopPropagation();
    const updated = fileList.filter((_, idx) => idx !== idxToRemove);
    onChange?.(formatLampiranUrls(updated));
    setErrorMsg('');
  };

  const handleRemoveAll = (e) => {
    e?.stopPropagation();
    onChange?.('');
    setErrorMsg('');
  };

  const openLightboxAt = (idx, e) => {
    e?.stopPropagation();
    setActivePhotoIndex(idx);
    setIsLightboxOpen(true);
  };

  return (
    <div className="w-full">
      {/* Label Header */}
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
            <Camera className="w-3.5 h-3.5 text-emerald-800" />
            <span>{label}</span>
          </label>

          {fileList.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-emerald-800 font-bold flex items-center space-x-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>{fileList.length} Bukti Terlampir</span>
              </span>
              <button
                type="button"
                onClick={handleRemoveAll}
                className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold hover:underline cursor-pointer"
                title="Hapus semua foto"
              >
                Hapus Semua
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hidden File Input with Multiple Enabled */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload Zone / Multi-Photo Gallery */}
      {fileList.length > 0 ? (
        <div className="p-2.5 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-2">
          {/* Photos Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {fileList.map((url, idx) => {
              const isPdf =
                url.toLowerCase().endsWith('.pdf') ||
                url.toLowerCase().includes('application/pdf');

              return (
                <div
                  key={url + idx}
                  className="group relative bg-white rounded-lg border border-slate-200 hover:border-emerald-500 overflow-hidden shadow-2xs transition aspect-square flex items-center justify-center cursor-pointer"
                  onClick={(e) => openLightboxAt(idx, e)}
                  title="Klik untuk memperbesar"
                >
                  {isPdf ? (
                    <div className="flex flex-col items-center justify-center p-2 text-rose-600">
                      <FileText className="w-8 h-8" />
                      <span className="text-[10px] font-mono font-bold mt-1">PDF #{idx + 1}</span>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={`Bukti ${idx + 1}`}
                      className="w-full h-full object-cover transition duration-150 group-hover:scale-105"
                    />
                  )}

                  {/* Badge Index */}
                  <span className="absolute top-1 left-1 bg-black/60 backdrop-blur-xs text-white text-[9px] font-mono font-bold px-1.5 py-0.2 rounded">
                    #{idx + 1}
                  </span>

                  {/* Hover Action Overlay */}
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-1.5 p-1">
                    <button
                      type="button"
                      onClick={(e) => openLightboxAt(idx, e)}
                      className="p-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-md transition shadow cursor-pointer"
                      title="Lihat Foto"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveSingle(idx, e)}
                      className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md transition shadow cursor-pointer"
                      title="Hapus Foto Ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* "+ Tambah Foto" Mini Tile if slots available */}
            {fileList.length < maxFiles && (
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={`rounded-lg border-2 border-dashed border-emerald-300 hover:border-emerald-600 bg-white/80 hover:bg-emerald-50/50 transition cursor-pointer flex flex-col items-center justify-center aspect-square text-emerald-800 ${
                  uploading ? 'opacity-50 cursor-wait' : ''
                }`}
                title="Tambah Foto Bukti Lagi"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-700" />
                ) : (
                  <>
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                    <span className="text-[10px] font-bold mt-1 text-center px-1">
                      + Tambah Foto
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Upload Status / Action Bar */}
          <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60 text-[11px]">
            <div className="text-slate-500 flex items-center space-x-1">
              {uploading ? (
                <span className="text-emerald-800 font-bold flex items-center space-x-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{uploadProgress || 'Mengupload...'}</span>
                </span>
              ) : (
                <span>
                  {fileList.length} dari maks {maxFiles} foto terunggah.
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => !uploading && fileInputRef.current?.click()}
              disabled={uploading || fileList.length >= maxFiles}
              className="px-2.5 py-1 text-xs font-bold text-emerald-900 bg-white hover:bg-emerald-100/70 border border-emerald-300 rounded-lg shadow-2xs flex items-center space-x-1 transition cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Tambah Foto</span>
            </button>
          </div>
        </div>
      ) : (
        /* Empty Upload Zone */
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl transition cursor-pointer text-center group flex flex-col items-center justify-center ${
            isDragging
              ? 'border-emerald-600 bg-emerald-50/80 scale-[0.99]'
              : 'border-slate-300 hover:border-emerald-600 hover:bg-emerald-50/40'
          } ${compact ? 'py-2 px-3' : 'py-4 px-4'}`}
        >
          {uploading ? (
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-800 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
              <span>{uploadProgress || 'Mengunggah bukti ke Supabase Storage...'}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-3 text-slate-600 group-hover:text-emerald-950">
              <div className="p-2 bg-slate-100 group-hover:bg-emerald-100 text-slate-600 group-hover:text-emerald-800 rounded-xl transition shadow-2xs">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold flex items-center space-x-1">
                  <span>Klik atau Seret Foto Bukti / Struk</span>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                    Bisa Banyak Foto
                  </span>
                </p>
                {helpText && (
                  <p className="text-[10px] text-slate-400 group-hover:text-slate-500 mt-0.5">
                    {helpText}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center space-x-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Multi-Photo Lightbox Modal */}
      <ImageLightboxModal
        isOpen={isLightboxOpen}
        images={fileList}
        initialIndex={activePhotoIndex}
        title={label}
        onClose={() => setIsLightboxOpen(false)}
      />
    </div>
  );
}
