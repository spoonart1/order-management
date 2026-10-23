/**
 * Mengubah angka nominal rupiah menjadi teks kalimat Terbilang dalam Bahasa Indonesia
 * Contoh: 12688000 -> "Dua Belas Juta Enam Ratus Delapan Puluh Delapan Ribu Rupiah"
 */
export function terbilang(nominal: number): string {
  const angka = Math.floor(Math.abs(nominal || 0));
  if (angka === 0) return 'Nol Rupiah';

  const bilangan = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Delapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas',
  ];

  function konversi(n: number): string {
    if (n < 12) {
      return bilangan[n];
    } else if (n < 20) {
      return konversi(n - 10) + ' Belas';
    } else if (n < 100) {
      const sisa = n % 10;
      return konversi(Math.floor(n / 10)) + ' Puluh' + (sisa ? ' ' + konversi(sisa) : '');
    } else if (n < 200) {
      const sisa = n - 100;
      return 'Seratus' + (sisa ? ' ' + konversi(sisa) : '');
    } else if (n < 1000) {
      const sisa = n % 100;
      return konversi(Math.floor(n / 100)) + ' Ratus' + (sisa ? ' ' + konversi(sisa) : '');
    } else if (n < 2000) {
      const sisa = n - 1000;
      return 'Seribu' + (sisa ? ' ' + konversi(sisa) : '');
    } else if (n < 1000000) {
      const sisa = n % 1000;
      return konversi(Math.floor(n / 1000)) + ' Ribu' + (sisa ? ' ' + konversi(sisa) : '');
    } else if (n < 1000000000) {
      const sisa = n % 1000000;
      return konversi(Math.floor(n / 1000000)) + ' Juta' + (sisa ? ' ' + konversi(sisa) : '');
    } else if (n < 1000000000000) {
      const sisa = n % 1000000000;
      return konversi(Math.floor(n / 1000000000)) + ' Miliar' + (sisa ? ' ' + konversi(sisa) : '');
    } else {
      const sisa = n % 1000000000000;
      return konversi(Math.floor(n / 1000000000000)) + ' Triliun' + (sisa ? ' ' + konversi(sisa) : '');
    }
  }

  const hasil = konversi(angka).trim();
  return hasil + ' Rupiah';
}

/**
 * Format angka ke format Rupiah standar
 * Contoh: 12688000 -> "Rp 12.688.000"
 */
export function formatRupiah(amount: number): string {
  const clean = Number(amount || 0);
  return 'Rp ' + clean.toLocaleString('id-ID');
}

/**
 * Format tanggal ke nama bulan Bahasa Indonesia
 * Contoh: 2026-10-06 -> "06 Oktober 2026"
 */
export function formatIndonesianDate(dateInput?: string | Date | null): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const bulan = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  return `${day} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Mengubah angka bulan (1-12) ke angka romawi (I - XII)
 */
export function getRomanMonth(monthNumber?: number): string {
  const romanMap = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const m = monthNumber !== undefined ? monthNumber : new Date().getMonth() + 1;
  return romanMap[Math.max(0, Math.min(11, m - 1))];
}
