/**
 * Accurate & Robust Indonesian Currency & Decimal Formatting Utilities for FAG Kemasan ERP
 * Standard:
 * - Thousands separator: dot (.) e.g. 1.000, 1.200.000
 * - Decimal separator: comma (,) e.g. 1.171,17 or 18,75%
 */

/**
 * Format numeric value to Indonesian currency or decimal string
 * @param {number|string} val
 * @param {number} maxDecimals - Maximum fraction digits (default 2)
 * @param {boolean} forceDecimals - If true, always outputs 2 decimal places e.g. 1.000,00
 */
export function formatDisplayDecimal(val, maxDecimals = 2, forceDecimals = false) {
  if (val === null || val === undefined || val === '') return '0';
  const n = Number(val);
  if (isNaN(n)) return '0';

  if (!forceDecimals && n % 1 === 0) {
    return n.toLocaleString('id-ID');
  }

  return n.toLocaleString('id-ID', {
    minimumFractionDigits: forceDecimals ? 2 : (n % 1 === 0 ? 0 : 2),
    maximumFractionDigits: maxDecimals,
  });
}

/**
 * Format Rupiah with "Rp " prefix and thousand dots
 * e.g. 1171.17 -> "Rp 1.171,17"
 * 1000 -> "Rp 1.000"
 */
export function formatRupiah(val, maxDecimals = 2, forceDecimals = false) {
  return `Rp ${formatDisplayDecimal(val, maxDecimals, forceDecimals)}`;
}

/**
 * Parse a string with Indonesian number formatting into a float
 * e.g. "1.171,17" -> 1171.17
 * "18,75" -> 18.75
 * "1.000" -> 1000
 */
export function parseNumberId(str) {
  if (typeof str === 'number') return isNaN(str) ? 0 : str;
  if (!str) return 0;
  let s = String(str).trim();
  if (!s) return 0;

  // If contains comma, comma is decimal separator
  if (s.includes(',')) {
    const parts = s.split(',');
    const intPart = parts[0].replace(/\D/g, '') || '0';
    const decPart = parts.slice(1).join('').replace(/\D/g, '') || '0';
    return parseFloat(`${intPart}.${decPart}`) || 0;
  }

  // If contains dot
  if (s.includes('.')) {
    const parts = s.split('.');
    // If e.g. "18.75" or "1171.17" (single dot with 1 or 2 digits at end)
    if (parts.length === 2 && parts[1].length <= 2 && s.length <= 8) {
      const intPart = parts[0].replace(/\D/g, '') || '0';
      const decPart = parts[1].slice(0, 4);
      return parseFloat(`${intPart}.${decPart}`) || 0;
    }
    // If multiple dots or standard thousand format e.g. "1.000" or "1.176.249"
    const intPart = s.replace(/\D/g, '') || '0';
    return parseFloat(intPart) || 0;
  }

  const clean = s.replace(/\D/g, '') || '0';
  return parseFloat(clean) || 0;
}

/**
 * Format user input in real-time as they type, preserving decimal comma or dot
 * @param {string} rawStr
 * @param {number} maxDecimals
 * @returns {{ display: string, num: number }}
 */
export function formatLiveInput(rawStr, maxDecimals = 2) {
  if (rawStr === null || rawStr === undefined) return { display: '', num: 0 };
  let s = String(rawStr).trim();
  if (!s) return { display: '', num: 0 };

  // If user typed dot at the end after thousand formatted number (e.g. "1.171."), treat last dot as decimal comma
  if (s.endsWith('.') && !s.includes(',')) {
    s = s.slice(0, -1) + ',';
  }

  s = s.replace(/[^0-9.,]/g, '');
  if (!s) return { display: '', num: 0 };

  let intPart = '';
  let decPart = null;

  if (s.includes(',')) {
    const parts = s.split(',');
    intPart = parts[0].replace(/\D/g, '');
    decPart = parts.slice(1).join('').replace(/\D/g, '').slice(0, maxDecimals);
  } else if (s.includes('.')) {
    const parts = s.split('.');
    // If user input single dot with decimal intent (e.g. 1171.17 or 18.75)
    if (parts.length === 2 && parts[1].length <= 2 && s.length <= 8) {
      intPart = parts[0].replace(/\D/g, '');
      decPart = parts[1].slice(0, maxDecimals);
    } else {
      intPart = s.replace(/\D/g, '');
    }
  } else {
    intPart = s.replace(/\D/g, '');
  }

  const intNum = intPart ? parseInt(intPart, 10) : 0;
  const formattedInt = intPart ? intNum.toLocaleString('id-ID') : '0';

  let display = formattedInt;
  let num = intNum;

  if (decPart !== null) {
    display = formattedInt + ',' + decPart;
    num = parseFloat(`${intNum}.${decPart || '0'}`);
  }

  return { display, num };
}
