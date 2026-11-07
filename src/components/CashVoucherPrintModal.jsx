'use client';

import React, { useRef } from 'react';
import { Printer, X, FileText, CheckCircle2, ShieldCheck, Download, Share2 } from 'lucide-react';

function angkaKeTerbilang(nilai) {
  const bilangan = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];

  const n = Math.floor(Math.abs(Number(nilai) || 0));
  if (n === 0) return 'Nol Rupiah';

  function sebut(x) {
    if (x < 12) return ' ' + bilangan[x];
    if (x < 20) return sebut(x - 10) + ' Belas';
    if (x < 100) return sebut(Math.floor(x / 10)) + ' Puluh' + sebut(x % 10);
    if (x < 200) return ' Seratus' + sebut(x - 100);
    if (x < 1000) return sebut(Math.floor(x / 100)) + ' Ratus' + sebut(x % 100);
    if (x < 2000) return ' Seribu' + sebut(x - 1000);
    if (x < 1000000) return sebut(Math.floor(x / 1000)) + ' Ribu' + sebut(x % 1000);
    if (x < 1000000000) return sebut(Math.floor(x / 1000000)) + ' Juta' + sebut(x % 1000000);
    if (x < 1000000000000) return sebut(Math.floor(x / 1000000000)) + ' Miliar' + sebut(x % 1000000000);
    return ' ' + x;
  }

  return (sebut(n).trim() + ' Rupiah').replace(/\s+/g, ' ');
}

export default function CashVoucherPrintModal({
  isOpen,
  onClose,
  voucherData = null, // { docNo, date, type: 'KAS_KELUAR'|'KAS_MASUK', amount, description, sourceAccountName, targetAccountName, recipientName }
  companySettings = {},
}) {
  const printAreaRef = useRef(null);

  if (!isOpen || !voucherData) return null;

  const isKeluar = voucherData.type === 'KAS_KELUAR';
  const isGaji = (voucherData.description || '').toLowerCase().includes('gaji') ||
                 (voucherData.targetAccountName || '').toLowerCase().includes('gaji');

  const title = isGaji
    ? 'SLIP PEMBAYARAN GAJI & BUKTI KAS KELUAR'
    : isKeluar
    ? 'BUKTI PENGELUARAN KAS (VOUCHER KAS KELUAR)'
    : 'BUKTI PENERIMAAN KAS (KUITANSI KAS MASUK)';

  const companyName = companySettings.namaPerusahaan || 'PT ETERNAL PACKAGING INDONESIA';
  const tradeBrand = companySettings.merkDagang || 'FAG KEMASAN';
  const address = companySettings.alamatKop || 'Jl. Raya Industri Kemasan No. 88, Kawasan Pergudangan, Yogyakarta / Jakarta';
  const phone = companySettings.telepon || '0812-3456-7890';
  const email = companySettings.email || 'finance@fagkemasan.com';
  const signatureImg = companySettings.tandaTanganDigital || null;
  const signatoryName = companySettings.namaPenandatanganDefault || 'Fauzan Ghani';
  const signatoryTitle = companySettings.jabatanPenandatanganDefault || 'Direktur Utama';

  const amount = Number(voucherData.amount || 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Floating Header Toolbar (Hidden in Print) */}
        <div className="px-5 py-3.5 bg-[#07291D] text-white flex items-center justify-between border-b border-emerald-800 print:hidden">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-900/80 border border-emerald-700 flex items-center justify-center text-emerald-300">
              <FileText className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black tracking-wide uppercase flex items-center space-x-2">
                <span>Pratinjau Bukti Kas Resmi &bull; {voucherData.docNo}</span>
                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700 rounded text-[10px] font-mono">
                  {isGaji ? 'Slip Gaji' : isKeluar ? 'Kas Keluar' : 'Kas Masuk'}
                </span>
              </h3>
              <p className="text-[10px] sm:text-[11px] text-emerald-300/80">
                Dokumen bukti sah pembukuan FAG Kemasan dengan tanda tangan digital resmi
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-[#0A3828] hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-xs border border-emerald-600/50 active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-emerald-300/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Sheet View */}
        <div className="p-6 sm:p-10 overflow-y-auto bg-slate-100/70 flex justify-center">
          <div
            id="print-area"
            ref={printAreaRef}
            className="bg-white w-full max-w-[210mm] p-8 sm:p-10 shadow-sm border border-slate-200 text-slate-800 text-xs font-sans leading-relaxed flex flex-col justify-between"
          >
            <div>
              {/* Kop Surat Resmi */}
              <div className="flex justify-between items-start pb-4 border-b-2 border-emerald-900 mb-5">
                <div className="flex items-center space-x-3.5">
                  <img
                    src="/logo-fag.png"
                    alt="Logo FAG Kemasan"
                    className="w-14 h-14 object-contain rounded-full border border-emerald-900/20 flex-shrink-0"
                  />
                  <div>
                    <h1 className="text-base sm:text-lg font-black text-emerald-950 tracking-tight uppercase">
                      {tradeBrand}
                    </h1>
                    <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider">
                      {companyName}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      {address}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      WhatsApp/Telp: <strong>{phone}</strong> &bull; Email: {email}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-[#07291D] text-white rounded font-black text-xs uppercase tracking-wider mb-1">
                    {isGaji ? 'SLIP GAJI RESMI' : isKeluar ? 'KAS KELUAR' : 'KAS MASUK'}
                  </div>
                  <p className="font-mono font-bold text-slate-800 text-xs">{voucherData.docNo}</p>
                  <p className="text-[10px] text-slate-500">Tanggal: {voucherData.date || new Date().toLocaleDateString('id-ID')}</p>
                </div>
              </div>

              {/* Judul Dokumen */}
              <div className="text-center py-2 mb-4 border-b border-slate-200">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  {title}
                </h2>
              </div>

              {/* Rincian Transaksi */}
              <div className="space-y-3 mb-6 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      {isKeluar ? 'Dibayarkan Kepada / Penerima:' : 'Diterima Dari / Penyetor:'}
                    </span>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">
                      {voucherData.recipientName || (isGaji ? 'Karyawan FAG Kemasan' : signatoryName)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      Rekening Kas / Bank:
                    </span>
                    <p className="font-bold text-emerald-950 text-sm mt-0.5">
                      {voucherData.sourceAccountName || 'Bank Transfer (BCA / Mandiri)'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Keperluan / Keterangan Pembayaran:
                  </span>
                  <p className="font-semibold text-slate-800 text-xs mt-0.5">
                    {voucherData.description || 'Pembayaran Operasional Toko & Kemasan'}
                  </p>
                  {voucherData.targetAccountName && (
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Alokasi Akun Beban / Lawan: <strong>{voucherData.targetAccountName}</strong>
                    </p>
                  )}
                </div>
              </div>

              {/* Kotak Nominal Jumlah Uang (Mewah & Jelas) */}
              <div className="p-4 bg-emerald-950 text-white rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <span className="text-[10px] font-mono text-emerald-300 uppercase tracking-wider block">
                    TOTAL NOMINAL TRANSAKSI
                  </span>
                  <span className="font-mono text-2xl font-black text-white">
                    Rp {amount.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-emerald-800/80 pt-2 sm:pt-0 sm:pl-4">
                  <span className="text-[10px] text-emerald-300 uppercase block">Terbilang:</span>
                  <p className="font-serif italic font-bold text-xs text-emerald-100 max-w-sm">
                    # {angkaKeTerbilang(amount)} #
                  </p>
                </div>
              </div>

              {/* Status Otorisasi Transaksi */}
              <div className="flex items-center space-x-2 text-[10px] text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 mb-8">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  Transaksi ini telah sah dibukukan dalam Buku Besar FAG Kemasan dengan nomor referensi <strong>{voucherData.docNo}</strong>.
                </span>
              </div>
            </div>

            {/* Kolom Tanda Tangan Sah (Bebas Bolpoint) */}
            <div className="pt-4 border-t border-slate-300 grid grid-cols-2 text-center text-xs">
              <div>
                <p className="font-bold text-slate-700 uppercase mb-2">
                  {isKeluar ? 'Yang Menyetujui / Mengeluarkan:' : 'Yang Menerima Uang:'}
                </p>
                <div className="h-16 flex items-center justify-center my-1">
                  {signatureImg ? (
                    <img
                      src={signatureImg}
                      alt="Tanda Tangan Digital Resmi"
                      className="max-h-16 max-w-[140px] object-contain mx-auto"
                    />
                  ) : (
                    <div className="h-14 flex items-center justify-center text-slate-300 text-[10px] italic">
                      (Tanda Tangan Digital)
                    </div>
                  )}
                </div>
                <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block px-8">
                  ( {signatoryName} )
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">{signatoryTitle}</p>
              </div>

              <div>
                <p className="font-bold text-slate-700 uppercase mb-2">
                  {isKeluar ? 'Penerima Uang / Karyawan:' : 'Penyetor Uang:'}
                </p>
                <div className="h-16 flex items-center justify-center my-1">
                  <div className="h-14"></div>
                </div>
                <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block px-8">
                  ( {voucherData.recipientName || (isGaji ? 'Karyawan Penerima' : 'Pihak Terkait')} )
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">{isGaji ? 'Penerima Gaji' : 'Penerima'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
