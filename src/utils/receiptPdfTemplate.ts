import { Invoice, PaymentReceipt } from '../services/invoiceService';
import { formatIndonesianDate, formatRupiah, terbilang } from './terbilang';

/**
 * Menghasilkan nama file PDF standar untuk Kwitansi / Payment Receipt:
 * Format: "Kwitansi_{receipt_no}_{client_name}_{tanggal}"
 */
export function getReceiptPdfFilename(receipt: PaymentReceipt, inv: Invoice): string {
  const sanitize = (str?: string | null) =>
    (str || '')
      .replace(/[/\\?%*:|"<>]/g, '')
      .trim();

  const client = sanitize(inv.client_name) || 'Klien';
  const no = sanitize(receipt.receipt_no) || 'RCP';

  let dateStr = '';
  if (receipt.payment_date) {
    const parts = receipt.payment_date.split('-');
    if (parts.length === 3) {
      dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
    } else {
      dateStr = receipt.payment_date;
    }
  } else {
    const now = new Date();
    dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  }

  return `Kwitansi_${no}_${client}_${dateStr}`;
}

/**
 * Menghasilkan markup HTML untuk Kwitansi Resmi Alora Studio dengan watermark stempel PAID
 */
export function generateReceiptHtml(receipt: PaymentReceipt, inv: Invoice): string {
  const dateFormatted = formatIndonesianDate(receipt.payment_date);
  const pdfTitle = getReceiptPdfFilename(receipt, inv);
  const words = receipt.amount_words || terbilang(receipt.amount);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${pdfTitle}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 15mm;
    }
    html, body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #0f172a;
      font-size: 12px;
      line-height: 1.5;
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .page {
      position: relative;
      box-sizing: border-box;
      padding: 5mm;
      width: 100%;
      border: 2px solid #0f172a;
      border-radius: 12px;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 1.5px;
      color: #0f172a;
      margin: 0;
      text-transform: uppercase;
    }
    .brand-sub {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      margin: 2px 0 6px 0;
      letter-spacing: 0.5px;
    }
    .brand-contact {
      font-size: 10px;
      color: #64748b;
      margin: 0;
    }
    .receipt-title-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 10px 14px;
      border-radius: 8px;
    }
    .receipt-title {
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 1px;
      margin: 0;
    }
    .receipt-meta {
      font-size: 11px;
      color: #334155;
      text-align: right;
    }
    .receipt-form {
      margin-bottom: 24px;
      position: relative;
    }
    .form-row {
      display: flex;
      margin-bottom: 14px;
      align-items: baseline;
    }
    .form-label {
      width: 180px;
      font-weight: bold;
      color: #475569;
      font-size: 12px;
    }
    .form-colon {
      width: 15px;
      color: #475569;
    }
    .form-value {
      flex: 1;
      font-size: 13px;
      color: #0f172a;
    }
    .amount-highlight-box {
      background-color: #f0fdf4;
      border: 1.5px dashed #22c55e;
      border-radius: 8px;
      padding: 12px 16px;
      margin-top: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .amount-val {
      font-size: 20px;
      font-weight: 900;
      color: #15803d;
      font-family: monospace;
    }
    .amount-words {
      font-size: 12px;
      font-style: italic;
      color: #166534;
      margin-top: 4px;
    }
    /* Stempel Resmi Hijau PAID */
    .stamp-watermark {
      position: absolute;
      right: 40px;
      bottom: 20px;
      border: 3px solid #16a34a;
      border-radius: 12px;
      color: #16a34a;
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 4px;
      padding: 8px 24px;
      text-transform: uppercase;
      transform: rotate(-12deg);
      opacity: 0.85;
      pointer-events: none;
      z-index: 10;
    }
    .status-table-box {
      margin-top: 20px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
    }
    table.status-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    table.status-table td {
      padding: 4px 6px;
    }
    .signature-container {
      margin-top: 30px;
      display: flex;
      justify-content: flex-end;
    }
    .signature-section {
      width: 220px;
      text-align: center;
    }
    .sig-date {
      margin-bottom: 50px;
      font-size: 11px;
      color: #334155;
    }
    .sig-name {
      font-weight: bold;
      font-size: 12px;
      margin: 0;
      text-decoration: underline;
    }
    .sig-role {
      color: #64748b;
      font-size: 11px;
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header / Kop Perusahaan -->
    <div class="header">
      <div class="brand-title">ALORA STUDIO</div>
      <div class="brand-sub">INTERIOR DESIGN &amp; HOME FURNITURE</div>
      <div class="brand-contact">
        Marketing Office : Jl. Semail RT 04 Bangunharjo Sewon Bantul Yogyakarta 55188<br>
        Telp : 0812-3456-7890 | Email : alorastd.id@gmail.com
      </div>
    </div>

    <!-- Title Bar -->
    <div class="receipt-title-bar">
      <div>
        <div class="receipt-title">KWITANSI PEMBAYARAN RESMI</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
          Alora Studio - Payment Receipt
        </div>
      </div>
      <div class="receipt-meta">
        <div><strong>No. Kwitansi :</strong> #${receipt.receipt_no}</div>
        <div><strong>Ref. Tagihan :</strong> Invoice #${receipt.billing_ref}</div>
        <div><strong>Tanggal Bayar :</strong> ${dateFormatted}</div>
      </div>
    </div>

    <!-- Kwitansi Form Content -->
    <div class="receipt-form">
      <!-- Watermark Stempel Hijau PAID -->
      <div class="stamp-watermark">
        LUNAS / PAID
      </div>

      <div class="form-row">
        <div class="form-label">Telah Diterima Dari</div>
        <div class="form-colon">:</div>
        <div class="form-value" style="font-weight: 700; font-size: 14px;">
          ${inv.client_name}
        </div>
      </div>

      <div class="form-row">
        <div class="form-label">Uang Sejumlah</div>
        <div class="form-colon">:</div>
        <div class="form-value">
          <div class="amount-highlight-box">
            <div>
              <div class="amount-val">${formatRupiah(receipt.amount)}</div>
              <div class="amount-words">"${words}"</div>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 10px; background-color: #dcfce7; color: #15803d; font-weight: bold; padding: 2px 8px; border-radius: 4px;">
                ${receipt.payment_method || 'Bank Transfer'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="form-row" style="margin-top: 10px;">
        <div class="form-label">Untuk Pembayaran</div>
        <div class="form-colon">:</div>
        <div class="form-value">
          <strong>${receipt.stage_name}</strong>
          ${receipt.description ? `<div style="font-size: 12px; color: #475569; margin-top: 2px;">${receipt.description}</div>` : ''}
        </div>
      </div>

      <div class="form-row">
        <div class="form-label">Rekening Tujuan</div>
        <div class="form-colon">:</div>
        <div class="form-value" style="font-size: 11px; color: #334155;">
          ${inv.bank_name || 'Bank Mandiri'} • No. ${inv.bank_account_no || '1370026994893'} (a.n. ${inv.bank_account_holder || 'M.LAFRAN PANE'})
        </div>
      </div>
    </div>

    <!-- Ringkasan Saldo Proyek Pasca Bayar -->
    <div class="status-table-box">
      <div style="font-weight: bold; font-size: 10px; color: #475569; text-transform: uppercase; margin-bottom: 4px;">
        Status Saldo Tagihan Invoice (${receipt.billing_ref}):
      </div>
      <table class="status-table">
        <tr>
          <td style="color: #64748b;">Total Nilai Proyek :</td>
          <td style="text-align: right; font-family: monospace; font-weight: 600;">${formatRupiah(inv.total)}</td>
          <td style="width: 30px;"></td>
          <td style="color: #64748b;">Akumulasi Terbayar :</td>
          <td style="text-align: right; font-family: monospace; font-weight: 600; color: #16a34a;">${formatRupiah(inv.paid_amount)}</td>
          <td style="width: 30px;"></td>
          <td style="color: #e11d48; font-weight: bold;">Sisa Tagihan :</td>
          <td style="text-align: right; font-family: monospace; font-weight: bold; color: #e11d48;">${formatRupiah(inv.balance_due)}</td>
        </tr>
      </table>
    </div>

    <!-- Signature Section -->
    <div class="signature-container">
      <div class="signature-section">
        <div class="sig-date">Yogyakarta, ${dateFormatted}<br>Penerima,</div>
        <div class="sig-name">${receipt.received_by || 'M Lafran Pane'}</div>
        <div class="sig-role">Finance Alora Studio</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
