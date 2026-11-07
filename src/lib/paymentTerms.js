/**
 * Payment Terms (Syarat Bayar / Termin) Constants & Helpers
 * Digunakan seragam pada Modul Penjualan dan Modul Pembelian (Accurate Online Standard)
 */

export const DEFAULT_PAYMENT_TERMS = [
  {
    id: 'term-cod',
    nama: 'COD',
    deskripsi: 'Cash on Delivery (Bayar Tunai saat Terima / Kas Langsung)',
    hariJatuhTempo: 0,
    isDefault: false,
  },
  {
    id: 'term-net-14',
    nama: 'Net 14',
    deskripsi: 'Net 14 Hari (Jatuh tempo 14 hari kalender)',
    hariJatuhTempo: 14,
    isDefault: false,
  },
  {
    id: 'term-net-30',
    nama: 'Net 30',
    deskripsi: 'Net 30 Hari (Standar tempo 1 bulan kalender)',
    hariJatuhTempo: 30,
    isDefault: true,
  },
  {
    id: 'term-net-45',
    nama: 'Net 45',
    deskripsi: 'Net 45 Hari (Jatuh tempo 45 hari kalender)',
    hariJatuhTempo: 45,
    isDefault: false,
  },
  {
    id: 'term-net-60',
    nama: 'Net 60',
    deskripsi: 'Net 60 Hari (Jatuh tempo 60 hari kalender)',
    hariJatuhTempo: 60,
    isDefault: false,
  },
  {
    id: 'term-net-90',
    nama: 'Net 90',
    deskripsi: 'Net 90 Hari (Jatuh tempo 3 bulan)',
    hariJatuhTempo: 90,
    isDefault: false,
  },
];

/**
 * Menghitung tanggal jatuh tempo secara akurat berdasarkan nama syarat bayar
 * @param {string} baseDateStr Tanggal dokumen (YYYY-MM-DD)
 * @param {string} termName Nama termin (e.g. 'Net 30', 'COD', 'Net 45')
 * @param {Array} syaratBayarList Daftar syarat bayar dari Pengaturan
 * @returns {string} Tanggal jatuh tempo (YYYY-MM-DD)
 */
export function calculateDueDate(baseDateStr, termName, syaratBayarList = DEFAULT_PAYMENT_TERMS) {
  const d = new Date(baseDateStr || Date.now());
  const list = syaratBayarList && syaratBayarList.length > 0 ? syaratBayarList : DEFAULT_PAYMENT_TERMS;
  const found = list.find((t) => (t.nama || '').trim().toLowerCase() === (termName || '').trim().toLowerCase());

  let days = 30; // default tempo
  if (found) {
    days = Number(found.hariJatuhTempo ?? 0);
  } else {
    // Parser cadangan jika nama tidak cocok persis
    const match = (termName || '').match(/\d+/);
    if (match) {
      days = parseInt(match[0], 10);
    } else if ((termName || '').toUpperCase().includes('COD') || (termName || '').toUpperCase().includes('TUNAI')) {
      days = 0;
    }
  }

  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
