import { Invoice } from '../services/invoiceService';
import { formatIndonesianDate, formatRupiah, terbilang } from './terbilang';

/**
 * Menghasilkan nama file PDF standar untuk Invoice:
 * Format: "Invoice {client_name}_{invoice_no}_{tanggal}"
 */
export function getInvoicePdfFilename(inv: Invoice): string {
  const sanitize = (str?: string | null) =>
    (str || '')
      .replace(/[/\\?%*:|"<>]/g, '')
      .trim();

  const client = sanitize(inv.client_name) || 'Klien';
  const no = sanitize(inv.invoice_no) || 'INV';

  let dateStr = '';
  if (inv.issue_date) {
    const parts = inv.issue_date.split('-');
    if (parts.length === 3) {
      dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
    } else {
      dateStr = inv.issue_date;
    }
  } else {
    const now = new Date();
    dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  }

  return `Invoice ${client}_${no}_${dateStr}`;
}

/**
 * Menghasilkan markup HTML untuk rendering dan cetak PDF Invoice Resmi Alora Studio
 * Mengadopsi format presisi acuan resmi (INV-015)
 */
export function generateInvoiceHtml(inv: Invoice): string {
  const items = inv.invoice_items || [];
  const issuedDateFormatted = formatIndonesianDate(inv.issue_date);
  const dueDateFormatted = inv.due_date ? formatIndonesianDate(inv.due_date) : '-';
  const pdfTitle = getInvoicePdfFilename(inv);
  const terbilangText = terbilang(inv.total);

  const statusLabel =
    inv.status === 'paid'
      ? 'LUNAS (PAID)'
      : inv.status === 'partial'
      ? 'DIBAYAR SEBAGIAN (PARTIAL)'
      : 'BELUM DIBAYAR (UNPAID)';

  const statusColor =
    inv.status === 'paid'
      ? '#059669'
      : inv.status === 'partial'
      ? '#0284c7'
      : '#e11d48';

  const statusBg =
    inv.status === 'paid'
      ? '#ecfdf5'
      : inv.status === 'partial'
      ? '#f0f9ff'
      : '#fff1f2';

  const itemsHtml = items
    .map(
      (item, index) => `
      <tr>
        <td style="text-align: center; vertical-align: top; padding: 10px 8px;">${item.item_no || index + 1}</td>
        <td style="vertical-align: top; padding: 10px 12px;">
          <div style="font-weight: 600; color: #0f172a;">${item.description}</div>
        </td>
        <td style="text-align: center; vertical-align: top; padding: 10px 8px;">${item.quantity}</td>
        <td style="text-align: center; vertical-align: top; padding: 10px 8px;">${item.unit}</td>
        <td style="text-align: right; vertical-align: top; padding: 10px 10px; white-space: nowrap; font-family: monospace;">${formatRupiah(item.unit_price)}</td>
        <td style="text-align: right; vertical-align: top; padding: 10px 10px; white-space: nowrap; font-weight: bold; font-family: monospace;">${formatRupiah(item.amount)}</td>
      </tr>
    `
    )
    .join('');

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
      padding: 0 5mm;
      width: 100%;
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
    .invoice-title-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 15px;
      margin-bottom: 20px;
    }
    .invoice-title {
      font-size: 20px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 1px;
      margin: 0;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: 1px solid ${statusColor};
      color: ${statusColor};
      background-color: ${statusBg};
    }
    .info-grid {
      display: flex;
      justify-content: space-between;
      margin-bottom: 24px;
      gap: 20px;
    }
    .info-col {
      flex: 1;
    }
    .info-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
    }
    .info-label {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 4px;
    }
    .info-val-strong {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .info-val {
      font-size: 12px;
      color: #334155;
      margin-top: 2px;
    }
    table.inv-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      margin-bottom: 20px;
    }
    table.inv-table th, table.inv-table td {
      border: 1px solid #cbd5e1;
    }
    table.inv-table th {
      background-color: #f1f5f9;
      font-size: 11px;
      font-weight: bold;
      padding: 9px 8px;
      text-align: center;
      text-transform: uppercase;
      color: #1e293b;
    }
    .summary-container {
      display: flex;
      justify-content: space-between;
      margin-top: 15px;
      gap: 20px;
    }
    .bank-box {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 14px;
      background-color: #f8fafc;
    }
    .totals-box {
      width: 320px;
    }
    table.totals-table {
      width: 100%;
      border-collapse: collapse;
    }
    table.totals-table td {
      padding: 6px 8px;
      border: none;
    }
    table.totals-table tr.border-top td {
      border-top: 1px solid #cbd5e1;
    }
    table.totals-table tr.highlight td {
      background-color: #f1f5f9;
      font-weight: bold;
      font-size: 13px;
    }
    table.totals-table tr.due td {
      background-color: #fff1f2;
      color: #be123c;
      font-weight: 900;
      font-size: 14px;
    }
    .signature-container {
      margin-top: 36px;
      display: flex;
      justify-content: flex-end;
    }
    .signature-section {
      width: 240px;
      text-align: center;
    }
    .sig-date {
      margin-bottom: 60px;
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
    <div class="invoice-title-bar">
      <div>
        <div class="invoice-title">INVOICE PENAGIHAN</div>
        <div style="font-size: 13px; font-weight: bold; color: #3b82f6; font-family: monospace; margin-top: 3px;">
          NO: ${inv.invoice_no}
        </div>
      </div>
      <div>
        <span class="status-badge">${statusLabel}</span>
      </div>
    </div>

    <!-- Info Grid: Bill To & Invoice Dates -->
    <div class="info-grid">
      <div class="info-col">
        <div class="info-box">
          <div class="info-label">DITUJUKAN KEPADA (BILL TO):</div>
          <div class="info-val-strong">${inv.client_name}</div>
          ${inv.client_phone ? `<div class="info-val">WhatsApp / HP: ${inv.client_phone}</div>` : ''}
          ${inv.client_address ? `<div class="info-val">Alamat: ${inv.client_address}</div>` : ''}
        </div>
      </div>

      <div class="info-col">
        <div class="info-box">
          <div class="info-label">METADATA INVOICE:</div>
          <div class="info-val"><strong>Tanggal Terbit:</strong> ${issuedDateFormatted}</div>
          <div class="info-val"><strong>Jatuh Tempo:</strong> ${dueDateFormatted}</div>
          ${inv.quotation_id ? `<div class="info-val" style="color: #64748b;">Ref: Surat Penawaran Resmi</div>` : ''}
        </div>
      </div>
    </div>

    <!-- Table of Items -->
    <table class="inv-table">
      <thead>
        <tr>
          <th style="width: 35px;">NO</th>
          <th>DESKRIPSI PEKERJAAN</th>
          <th style="width: 50px;">QTY</th>
          <th style="width: 60px;">SAT</th>
          <th style="width: 120px;">HARGA SATUAN</th>
          <th style="width: 130px;">JUMLAH (RP)</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <!-- Summary & Payment Info Container -->
    <div class="summary-container">
      <!-- Info Rekening Bank -->
      <div class="bank-box">
        <div style="font-weight: bold; font-size: 11px; color: #0f172a; margin-bottom: 6px; text-transform: uppercase;">
          Instruksi Pembayaran:
        </div>
        <div style="font-size: 11px; color: #334155; line-height: 1.5;">
          Pembayaran mohon ditransfer ke rekening resmi:<br>
          <strong>${inv.bank_name || 'Bank Mandiri'}</strong><br>
          No. Rekening : <strong style="font-family: monospace; font-size: 12px; color: #0284c7;">${inv.bank_account_no || '1370026994893'}</strong><br>
          Atas Nama : <strong>${inv.bank_account_holder || 'M.LAFRAN PANE'}</strong>
        </div>
        ${inv.notes ? `<div style="font-size: 10px; color: #64748b; margin-top: 8px; font-style: italic;">* ${inv.notes}</div>` : ''}
      </div>

      <!-- Totals & Balance Due -->
      <div class="totals-box">
        <table class="totals-table">
          <tr>
            <td style="color: #475569;">Subtotal :</td>
            <td style="text-align: right; font-family: monospace; font-weight: 600;">${formatRupiah(inv.subtotal)}</td>
          </tr>
          <tr class="highlight border-top">
            <td style="color: #0f172a;">TOTAL TAGIHAN :</td>
            <td style="text-align: right; font-family: monospace; color: #0f172a;">${formatRupiah(inv.total)}</td>
          </tr>
          <tr>
            <td style="color: #059669;">Sudah Dibayar (Paid) :</td>
            <td style="text-align: right; font-family: monospace; font-weight: bold; color: #059669;">${formatRupiah(inv.paid_amount)}</td>
          </tr>
          <tr class="due border-top">
            <td>SISA TAGIHAN :</td>
            <td style="text-align: right; font-family: monospace;">${formatRupiah(inv.balance_due)}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Terbilang Total Tagihan -->
    <div style="margin-top: 10px; font-size: 11px; color: #475569; font-style: italic;">
      Terbilang: <strong>"${terbilangText}"</strong>
    </div>

    <!-- Signature Section -->
    <div class="signature-container">
      <div class="signature-section">
        <div class="sig-date">Yogyakarta, ${issuedDateFormatted}<br>Hormat Kami,</div>
        <div class="sig-name">${inv.authorized_by || 'M Lafran Pane'}</div>
        <div class="sig-role">Finance &amp; Operasional</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
