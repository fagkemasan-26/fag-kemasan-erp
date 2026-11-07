import { supabase } from './supabase';

/**
 * Peek nomor dokumen berikutnya (hanya pratinjau tanpa menaikkan counter sequence di DB)
 * Format: [PREFIX].[YYYY].[MM].[DD].[0001]
 */
export async function peekNextDocNumber(prefix, customDate) {
  try {
    const today = customDate || new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.rpc('peek_next_doc_number', {
      p_prefix: prefix,
      p_date: today,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error peek nomor dokumen:', err);
    const d = new Date();
    const yr = d.getFullYear();
    const mo = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${prefix}.${yr}.${mo}.${day}.0001`;
  }
}

/**
 * Generate nomor dokumen berurutan dan persisten di database Supabase (atomik menaikkan counter)
 * Format: [PREFIX].[YYYY].[MM].[DD].[0001]
 * Contoh: SQ.2026.11.05.0001, PO.2026.11.05.0001, DO.2026.11.05.0001, SI.2026.11.05.0001
 */
export async function getNextDocNumber(prefix, customDate) {
  try {
    const today = customDate || new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.rpc('get_next_doc_number', {
      p_prefix: prefix,
      p_date: today,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error generate nomor dokumen:', err);
    // Fallback format jika RPC gagal
    const d = new Date();
    const yr = d.getFullYear();
    const mo = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${prefix}.${yr}.${mo}.${day}.0001`;
  }
}

/**
 * Helper untuk mencatat Jurnal Umum Berpasangan (Double-Entry Debit & Kredit)
 * sesuai standar Akuntansi Accurate Online.
 */
export async function createJournalEntry({
  noJurnal,
  tanggal = new Date().toISOString().split('T')[0],
  tipeTransaksi,
  noReferensi,
  keterangan,
  details, // Array of { kodeAkun, debit, kredit, catatan }
}) {
  try {
    const { data: accounts } = await supabase.from('akun').select('id, kode_akun, nama_akun');
    const accountMap = {};
    accounts?.forEach((a) => {
      accountMap[a.kode_akun] = a.id;
    });

    const jNo =
      noJurnal ||
      `JU.${new Date().getFullYear()}.${(new Date().getMonth() + 1).toString().padStart(2, '0')}.${Date.now().toString().slice(-4)}`;

    const { data: journalHeader, error: jError } = await supabase
      .from('jurnal')
      .insert({
        no_jurnal: jNo,
        tanggal,
        tipe_transaksi: tipeTransaksi,
        no_referensi: noReferensi,
        keterangan,
      })
      .select()
      .single();

    if (jError) throw jError;

    const journalDetails = details.map((d) => ({
      jurnal_id: journalHeader.id,
      akun_id: d.akun_id || d.akunId || accountMap[d.kodeAkun],
      debit: Number(d.debit || 0),
      kredit: Number(d.kredit || 0),
      catatan: d.catatan || keterangan,
    }));

    const { error: dError } = await supabase.from('jurnal_detail').insert(journalDetails);
    if (dError) throw dError;

    return journalHeader;
  } catch (error) {
    console.error('Error saat membuat jurnal akuntansi:', error);
    throw error;
  }
}

/**
 * Hapus Jurnal Manual beserta seluruh rincian debit/kreditnya
 */
export async function deleteJournalEntry(journalId) {
  try {
    await supabase.from('jurnal_detail').delete().eq('jurnal_id', journalId);
    const { error } = await supabase.from('jurnal').delete().eq('id', journalId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error hapus jurnal manual:', err);
    throw err;
  }
}

/**
 * Reset Seluruh Transaksi Demo (Siap Pakai untuk Rilis Toko Asli)
 */
export async function resetAllTransactions() {
  try {
    await supabase.from('penawaran_penjualan_detail').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('penawaran_penjualan').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    await supabase.from('penerimaan_penjualan').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('pengiriman_pesanan_detail').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('pengiriman_pesanan').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('pesanan_penjualan_detail').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('pesanan_penjualan').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    await supabase.from('penjualan_detail').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('penjualan').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('pembelian_detail').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('pembelian').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    await supabase.from('jurnal_detail').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('jurnal').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('riwayat_stok').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('kas_transaksi').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Reset sequence counter dokumen
    await supabase.from('nomor_dokumen_counter').delete().neq('prefix', 'DUMMY');

    return { success: true };
  } catch (err) {
    console.error('Gagal reset transaksi:', err);
    throw err;
  }
}
