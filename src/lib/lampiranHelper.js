/**
 * Helper untuk parsing dan formatting lampiran URL bukti transaksi (Foto / Dokumen)
 * Mendukung backward-compatibility penuh untuk single URL string, JSON array string, dan comma-separated string.
 */

export function parseLampiranUrls(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter((u) => typeof u === 'string' && u.trim().length > 0);
  
  const str = String(val).trim();
  if (!str) return [];

  // Jika tersimpan sebagai JSON array (format baru multi-foto)
  if (str.startsWith('[') && str.endsWith(']')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parsed.filter((u) => typeof u === 'string' && u.trim().length > 0);
      }
    } catch {
      // jika gagal parse, fallback ke split koma
    }
  }

  // Jika dipisahkan koma
  if (str.includes(',')) {
    return str
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  // Format single URL string (legacy / 1 foto)
  return [str];
}

export function formatLampiranUrls(urls) {
  if (!urls || !Array.isArray(urls)) return '';
  const clean = urls.filter((u) => typeof u === 'string' && u.trim().length > 0);
  if (clean.length === 0) return '';
  if (clean.length === 1) return clean[0]; // simpan sebagai single URL jika hanya 1 foto (hemat & kompatibel)
  return JSON.stringify(clean); // simpan sebagai JSON array jika > 1 foto
}
