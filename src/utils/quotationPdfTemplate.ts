import { Quotation } from '../services/quotationService';
import { formatIndonesianDate, formatRupiah } from './terbilang';

/**
 * Menghasilkan nama file PDF standar untuk Surat Penawaran:
 * Format: "Surat Penawaran {client_name}_{project_name}_{tanggal}"
 */
export function getQuotationPdfFilename(q: Quotation): string {
  const sanitize = (str?: string | null) =>
    (str || '')
      .replace(/[/\\?%*:|"<>]/g, '')
      .trim();

  const client = sanitize(q.client_name) || 'Klien';
  const project = sanitize(q.project_title) || 'Proyek';

  // Format tanggal: DD-MM-YYYY
  let dateStr = '';
  if (q.issued_date) {
    const parts = q.issued_date.split('-');
    if (parts.length === 3) {
      dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
    } else {
      dateStr = q.issued_date;
    }
  } else {
    const now = new Date();
    dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  }

  return `Surat Penawaran ${client}_${project}_${dateStr}`;
}

/**
 * Menghasilkan markup HTML untuk rendering dan ekspor PDF Surat Penawaran Resmi Alora Studio
 * Mengadopsi format presisi 100% dari dokumen acuan (No. 053b/SP/APK/10/26)
 */
export function generateQuotationHtml(q: Quotation): string {
  const terms = q.terms && q.terms.length > 0 ? q.terms : [
    { title: 'Termin I', pct: 50, desc: 'DP Mulai Pekerjaan' },
    { title: 'Termin II', pct: 25, desc: 'Seting Di Lokasi' },
    { title: 'Termin III', pct: 25, desc: 'Pekerjaan Selesai' },
  ];

  const items = q.quotation_items || [];
  const issuedDateFormatted = formatIndonesianDate(q.issued_date);
  const pdfTitle = getQuotationPdfFilename(q);

  const itemsHtml = items.map((item, index) => {
    const specs = [
      item.material ? `<div><strong>Bahan :</strong> ${item.material}</div>` : '',
      item.accessories ? `<div><strong>Aksesoris :</strong> ${item.accessories}</div>` : '',
      item.finishing ? `<div><strong>Finishing :</strong> ${item.finishing}</div>` : '',
      item.dimensions ? `<div><strong>Dimensi :</strong> ${item.dimensions}</div>` : '',
    ].filter(Boolean).join('');

    return `
      <tr>
        <td style="text-align: center; vertical-align: top; padding: 8px 6px;">${item.item_no || index + 1}</td>
        <td style="vertical-align: top; padding: 8px 10px;">
          <div style="font-weight: bold; margin-bottom: 4px;">${item.description}</div>
          ${specs ? `<div style="font-size: 11px; color: #334155; line-height: 1.4; padding-left: 2px;">${specs}</div>` : ''}
        </td>
        <td style="text-align: center; vertical-align: top; padding: 8px 6px;">${item.quantity}</td>
        <td style="text-align: center; vertical-align: top; padding: 8px 6px;">${item.unit}</td>
        <td style="text-align: right; vertical-align: top; padding: 8px 8px; white-space: nowrap;">${formatRupiah(item.unit_price)}</td>
        <td style="text-align: right; vertical-align: top; padding: 8px 8px; white-space: nowrap; font-weight: 600;">${formatRupiah(item.amount)}</td>
      </tr>
    `;
  }).join('');

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
      page-break-after: always;
      break-after: page;
      position: relative;
      box-sizing: border-box;
      padding: 0 5mm;
      width: 100%;
    }
    .page:last-child {
      page-break-after: avoid;
      break-after: avoid;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 20px;
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
    .doc-title-box {
      margin-top: 18px;
      margin-bottom: 20px;
    }
    .doc-title {
      font-size: 15px;
      font-weight: bold;
      text-decoration: underline;
      margin: 0;
      text-transform: uppercase;
    }
    .doc-no {
      font-size: 12px;
      margin-top: 3px;
      color: #1e293b;
    }
    .client-box {
      margin-bottom: 20px;
      line-height: 1.4;
    }
    .content-p {
      margin-bottom: 14px;
      text-align: justify;
    }
    .terms-list {
      margin: 10px 0 16px 16px;
      padding: 0;
      list-style-type: none;
    }
    .terms-list li {
      margin-bottom: 5px;
    }
    .signature-section {
      margin-top: 40px;
      margin-left: auto;
      margin-right: 0;
      width: 250px;
      text-align: center;
    }
    .sig-date {
      margin-bottom: 60px;
    }
    .sig-name {
      font-weight: bold;
      margin: 0;
    }
    .sig-role {
      color: #475569;
      font-size: 11px;
      margin: 0;
    }
    /* Table styles for Page 2 */
    table.rab-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      margin-bottom: 20px;
    }
    table.rab-table th, table.rab-table td {
      border: 1px solid #cbd5e1;
    }
    table.rab-table th {
      background-color: #f1f5f9;
      font-size: 11px;
      font-weight: bold;
      padding: 8px 6px;
      text-align: center;
      text-transform: uppercase;
      color: #1e293b;
    }
    .total-row {
      font-weight: bold;
      background-color: #f8fafc;
    }
  </style>
</head>
<body>

  <!-- ========================================================================= -->
  <!-- HALAMAN 1: SURAT PENAWARAN                                                -->
  <!-- ========================================================================= -->
  <div class="page">
    <div class="header">
      <div class="brand-title">ALORA STUDIO</div>
      <div class="brand-sub">Interior Design & Home Furniture</div>
      <div class="brand-contact">
        Marketing Office: Jl. Semail, Semail, Bangunharjo, Bantul Yogyakarta 55188<br>
        Telepon: 0812 2977 3110 &nbsp;|&nbsp; Email: alorastd.id@gmail.com
      </div>
    </div>

    <div class="doc-title-box">
      <div class="doc-title">SURAT PENAWARAN</div>
      <div class="doc-no">No. ${q.quotation_no}</div>
    </div>

    <div class="client-box">
      <div>Kepada Yth :</div>
      <div style="font-weight: bold; font-size: 13px;">${q.client_name}</div>
      ${q.client_phone ? `<div style="font-size: 11px; color: #475569;">Telp / WA: ${q.client_phone}</div>` : ''}
      <div>Di ${q.client_city || 'Tempat'}</div>
    </div>

    <div class="content-p">
      Dengan Hormat,<br>
      Dengan ini kami <strong>ALORA STUDIO</strong> yang bergerak dibidang Pengadaan Barang dan Jasa bermaksud untuk mengajukan penawaran <strong>${q.project_title}</strong> dengan harga <strong>${formatRupiah(q.total_amount)} (${q.terbilang})</strong> dengan rincian terlampir, serta ketentuan sebagai berikut :
    </div>

    <ul class="terms-list">
      <li style="font-weight: bold; margin-bottom: 4px;">● Sistem Termin Pembayaran :</li>
      ${terms.map((t) => `
        <li style="padding-left: 14px;">• <strong>${t.title}</strong> : ${t.pct}% (${t.desc})</li>
      `).join('')}
      <li style="margin-top: 8px;">● Waktu pengerjaan <strong>${q.work_duration_days} hari kerja</strong> sesuai dengan Surat Perintah Kerja (SPK).</li>
      <li>● Penawaran ini berlaku serta mengikat secara sah dalam waktu <strong>${q.validity_days} hari kalender</strong> sejak tanggal surat penawaran ini.</li>
    </ul>

    <div class="content-p">
      Demikian surat penawaran ini kami sampaikan, atas perhatian dan persetujuannya kami ucapkan banyak terima kasih.
    </div>

    <div class="signature-section">
      <div class="sig-date">Yogyakarta, ${issuedDateFormatted}</div>
      <div class="sig-name">(${q.marketing_name || 'Marketing Alora'})</div>
      <div class="sig-role">Marketing Alora</div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- HALAMAN 2: RINCIAN PENAWARAN (SPESIFIKASI & BREAKDOWN HARGA)              -->
  <!-- ========================================================================= -->
  <div class="page">
    <div class="header">
      <div class="brand-title">ALORA STUDIO</div>
      <div class="brand-sub">Interior Design & Home Furniture</div>
      <div class="brand-contact">
        Marketing Office: Jl. Semail, Semail, Bangunharjo, Bantul Yogyakarta 55188<br>
        Telepon: 0812 2977 3110 &nbsp;|&nbsp; Email: alorastd.id@gmail.com
      </div>
    </div>

    <div style="margin-bottom: 12px;">
      <div style="font-size: 14px; font-weight: bold; text-transform: uppercase;">Rincian Penawaran & Spesifikasi</div>
      <div style="font-size: 13px; font-weight: 600; color: #1e293b;">Pekerjaan ${q.project_title}</div>
      <div style="font-size: 11px; color: #64748b;">Klien: ${q.client_name} &nbsp;|&nbsp; Lampiran No: ${q.quotation_no}</div>
    </div>

    <table class="rab-table">
      <thead>
        <tr>
          <th style="width: 32px;">No</th>
          <th>Deskripsi Pekerjaan & Spesifikasi</th>
          <th style="width: 45px;">Vol</th>
          <th style="width: 55px;">Satuan</th>
          <th style="width: 110px;">Harga Satuan</th>
          <th style="width: 120px;">Jumlah Harga</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml || '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #94a3b8;">Belum ada item rincian yang ditambahkan</td></tr>'}
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="5" style="text-align: right; padding: 8px 12px; font-size: 11px;">Jumlah Sub Total Pekerjaan</td>
          <td style="text-align: right; padding: 8px; white-space: nowrap;">${formatRupiah(q.total_amount)}</td>
        </tr>
        <tr class="total-row" style="background-color: #e2e8f0; font-size: 12px;">
          <td colspan="5" style="text-align: right; padding: 9px 12px; font-weight: 900;">JUMLAH TOTAL PEKERJAAN</td>
          <td style="text-align: right; padding: 9px 8px; white-space: nowrap; font-weight: 900; color: #0f172a;">${formatRupiah(q.total_amount)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="signature-section" style="margin-top: 30px;">
      <div class="sig-date">Yogyakarta, ${issuedDateFormatted}</div>
      <div class="sig-name">(${q.marketing_name || 'Marketing Alora'})</div>
      <div class="sig-role">Marketing Alora</div>
    </div>
  </div>

</body>
</html>
  `;
}
