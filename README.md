# Alora Studio — Interior & Architectural Backoffice Platform

> **Sistem Manajemen Operasional & ERP Khusus Studio Desain Interior, Arsitektur, dan Workshop Custom Furniture.**

![React Native](https://img.shields.io/badge/React_Native-0.86-61DAFB?style=flat-square&logo=react&logoColor=black)
![Expo](https://img.shields.io/badge/Expo_SDK-57-000020?style=flat-square&logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Database_%26_Storage-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/NativeWind-Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![Redux Toolkit](https://img.shields.io/badge/Redux_Toolkit-State_Management-764ABC?style=flat-square&logo=redux&logoColor=white)

---

## 📌 Tentang Produk (Product Overview)

**Alora Studio** adalah platform manajemen operasional terpadu yang dirancang khusus untuk memenuhi kebutuhan dinamis industri **desain interior, studio arsitektur, dan workshop fabrikasi mebel custom**. 

Berbeda dengan tools manajemen umum, Alora Studio dibangun dengan memahami alur kerja spesifik interior studio: mulai dari penerimaan prospek klien, penyusunan Rencana Anggaran Biaya (RAB) dan Surat Penawaran resmi, pembayaran termin (DP), transisi otomatis ke tim workshop & pengerjaan lapangan, monitoring tenggat waktu pengerjaan (*due date deadline*), hingga penerbitan invoice penagihan resmi bertahap.

Aplikasi ini bersifat **Universal / Cross-Platform** (dapat diakses via **Web Browser** di desktop studio, tablet saat presentasi klien, maupun aplikasi mobile **Android & iOS** oleh mandor di workshop dan pengawas instalasi lapangan) serta mengusung prinsip **100% Offline-First Resilience**.

---

## 🚀 Fitur Unggulan (Core Features)

### 1. Executive Operational Dashboard
- **Financial Performance KPIs**: Rekapitulasi real-time nilai total tagihan (*Total Billed*), pembayaran diterima (*Total Paid*), sisa piutang berjalan (*Balance Due*), serta rasio penagihan (*Paid Rate %*).
- **Quotation & Sales Pipeline**: Pemantauan jumlah dan valuasi surat penawaran dari status *Draft*, *Sent*, hingga *Approved*.
- **Deadline Monitoring Order Produksi**: Widget khusus deteksi order yang mendekati batas tenggat ($\le$ 10 hari) atau telah lewat tempo (*overdue*), lengkap dengan durasi hitung mundur hari dan navigasi instan ke Board Produksi.
- **Recent Receipts & Operational Action Strip**: Riwayat transaksi termin pembayaran terbaru dan tombol pintas navigasi operasional studio.

### 2. Multi-Board Kanban & Workflow Automation
- **Board Marketing**: Mengelola pipeline prospek (*Prospek Masuk*, *Survey & Offering*, *DP - Deal Payment*).
- **Otomasi Transisi Order Masuk**: Ketika kartu di Board Marketing dipindahkan ke status *DP (Deal Payment)*, sistem secara otomatis:
  - Menyalin kartu ke **Board Produksi** pada kolom *Order Masuk*.
  - Mengambil durasi pengerjaan dari Surat Penawaran yang terhubung (`work_duration_days`).
  - Menetapkan tanggal batas tenggat (*due date*) otomatis.
- **Board Produksi**: Mengontrol tahapan workshop & lapangan (*Order Masuk*, *Pengukuran & Gambar Kerja*, *Fabrikasi Workshop*, *Finishing*, *Instalasi Lapangan*, *Serah Terima/Handover*). Menampilkan badge sisa hari deadline yang dinamis.
- **Board General**: Manajemen tugas internal studio dan pengadaan operasional.
- **Dukungan Drag & Drop (Web)** dan antarmuka sentuh responsif (Mobile).

### 3. Galeri Foto & Lampiran Dokumen PDF
- **Upload Gambar Otomatis Terkompresi**: Pengunggahan foto pengukuran, render 3D, dan bukti fisik pengerjaan otomatis dikompresi menjadi **di bawah 600 KB** menggunakan `expo-image-manipulator` demi performa optimal dan hemat bandwidth.
- **Dukungan Dokumen PDF**: Menerima file dokumen `.pdf` hingga batas **10 MB** (SPK, gambar kerja arsitektural, denah CAD) dengan kartu thumbnail khusus bertema editorial dokumen arsitektur dan tautan pratinjau instan (`Buka ↗`).

### 4. Mesin Surat Penawaran (Quotation & RAB Engine)
- Pembuatan penawaran harga detail dengan rincian item spesifikasi (ruangan, nama barang/pekerjaan, volume, satuan unit, harga satuan, dan subtotal).
- Perhitungan otomatis subtotal, diskon, PPN, dan grand total.
- Format nominal otomatis dengan terbilang Rupiah resmi.
- Ekspor PDF & cetak langsung (*print-ready*) dengan kop surat resmi studio.

### 5. Penagihan & Manajemen Invoice Bertahap
- Penerbitan invoice dari surat penawaran yang telah disetujui atau order langsung.
- Pencatatan pembayaran bertahap (DP, Termin 1, Termin 2, Pelunasan).
- Status pembayaran dinamis (*Unpaid*, *Partial*, *Paid*, *Overdue*, *Cancelled*).
- Desain cetak invoice PDF mewah dengan penyesuaian identitas studio dan tanda tangan resmi.

### 6. Arsitektur Offline-First (Resilience in Low/No Signal)
- **Instant Rendering (0ms)**: Seluruh data layar pertama dibaca langsung dari penyimpanan cache lokal (*AsyncStorage*).
- **Antrean Mutasi Offline (Offline Queue)**: Segala perubahan (pindah kartu, update deskripsi, hapus item) saat offline disimpan ke dalam antrean lokal dan disinkronkan secara otomatis dan senyap (*background sync*) saat jaringan internet kembali terhubung.
- **Network Status Banner**: Indikator real-time status online/offline di bagian atas layar.

---

## 🛠️ Tech Stack & Teknologi yang Digunakan

Aplikasi ini dibangun menggunakan arsitektur modern berbasis TypeScript dengan ekosistem universal React:

### Frontend & Antarmuka Pengguna
| Teknologi | Versi | Peran & Penggunaan |
| :--- | :--- | :--- |
| **React Native** | `0.86.3` | Core UI library untuk rendering aplikasi native & web. |
| **React** | `19.2.3` | Fondasi UI komponen dan React Hooks. |
| **Expo SDK** | `~57.0.28` | Universal React platform tools, build system, dan modul native. |
| **Expo Router** | `~57.0.26` | Routing berbasis file (*file-based routing*) dengan Typed Routes, Drawer, Stack, dan Search Params. |
| **NativeWind / Tailwind CSS** | `^4.2.7` / `^3.4.19` | Utility-first CSS styling engine yang dioptimasi untuk React Native dan Web. |
| **Lucide Icons** | `^1.57.0` | Set ikon antarmuka modern (`lucide-react-native`). |

### State Management & Data Caching
| Teknologi | Versi | Peran & Penggunaan |
| :--- | :--- | :--- |
| **Redux Toolkit** | `^2.13.0` | Global state management terpusat (Auth, Board, Invoice, Quotation slices). |
| **React Redux** | `^9.3.0` | React bindings untuk Redux store. |
| **AsyncStorage** | `2.2.0` | Local key-value database untuk persistent caching dan antrean mutasi offline. |
| **SWR Caching Pattern** | Custom Service | Pendekatan *Stale-While-Revalidate* untuk rendering 0ms dari cache lokal sebelum diverifikasi ke cloud. |

### Backend, Database & Cloud Storage
| Teknologi | Versi | Peran & Penggunaan |
| :--- | :--- | :--- |
| **Supabase Client** | `^2.117.3` | SDK integrasi backend cloud berbasis PostgreSQL. |
| **PostgreSQL Database** | Managed Supabase | Database relasional untuk tabel `board_cards`, `quotations`, `invoices`, `payments`, dsb. |
| **Supabase Storage** | S3-Compatible | Bucket penyimpanan berkas publik/privat untuk foto lampiran dan dokumen PDF. |
| **Row Level Security (RLS)** | PostgreSQL | Keamanan data tingkat baris berdasarkan hak akses autentikasi user studio. |

### Perangkat Keras & Kemampuan Native
| Modul | Peran & Penggunaan |
| :--- | :--- |
| **`expo-image-manipulator`** | Kompresi cerdas multi-tahap dan *downscaling* foto ke format JPEG di bawah 600 KB. |
| **`expo-document-picker`** | Pemilihan dokumen `.pdf` dari penyimpanan perangkat dengan batas ukuran terverifikasi (10 MB). |
| **`expo-image-picker`** | Akses kamera dan galeri foto perangkat. |
| **`expo-print` & `expo-sharing`** | Render template HTML ke format PDF resmi dan fitur cetak/bagikan. |
| **`expo-linking` & `expo-web-browser`** | Pembuka tautan dokumen lampiran, pratinjau berkas, dan navigasi eksternal. |
| **`@react-native-community/netinfo`** | Deteksi status jaringan internet real-time (online/offline). |

---

## 📂 Struktur Direktori Proyek

```text
AloraStudioApp/
└── AloraStudio/
    ├── src/
    │   ├── app/                          # File-based routing (Expo Router)
    │   │   ├── (auth)/                   # Layar login & autentikasi
    │   │   ├── (backoffice)/             # Layar utama backoffice
    │   │   │   ├── dashboard.tsx         # Executive operational dashboard
    │   │   │   ├── boards.tsx            # Multi-board Kanban (Marketing/Produksi/General)
    │   │   │   ├── quotations/           # Modul Surat Penawaran (Daftar, Buat, Edit, Detail)
    │   │   │   └── invoices/             # Modul Invoice Penagihan & Riwayat Termin
    │   │   └── _layout.tsx               # Root layout & drawer navigator
    │   ├── components/                   # Komponen UI modular
    │   │   ├── board/                    # KanbanCard, KanbanColumn, CardDetailModal, BoardHeader
    │   │   ├── quotation/                # QuotationFormModal, QuotationPreviewModal
    │   │   ├── invoice/                  # InvoiceCard, PaymentFormModal
    │   │   └── ui/                       # Chip, DatePickerField, Button, Input
    │   ├── services/                     # Business logic & Network/Data access layer
    │   │   ├── boardService.ts           # Integrasi database Board & Cards
    │   │   ├── orderWorkflowService.ts   # Otomasi workflow DP -> Produksi & tracking deadline
    │   │   ├── cardAttachmentService.ts  # Upload storage, kompresi foto & validasi PDF
    │   │   ├── quotationService.ts       # Service CRUD dan kalkulasi Surat Penawaran
    │   │   ├── invoiceService.ts         # Service Invoice dan pencatatan pembayaran termin
    │   │   ├── syncService.ts            # Sinkronisasi antrean mutasi saat online
    │   │   ├── offlineQueueService.ts    # Penyimpanan antrean offline di AsyncStorage
    │   │   └── *CacheService.ts          # Cache adapter lokal untuk rendering instan (0ms)
    │   ├── store/                        # Redux Toolkit Store & Slices
    │   │   ├── slices/                   # authSlice, boardSlice, invoiceSlice, quotationSlice
    │   │   └── store.ts                  # Konfigurasi Redux Store
    │   ├── utils/                        # Format mata uang (Rupiah), tanggal, dan teks terbilang
    │   └── lib/                          # Inisialisasi Supabase client, dialog, dan network status
    ├── docs/                             # Dokumentasi & arsip migrasi SQL (local only, di-ignore git)
    ├── package.json
    └── tsconfig.json
```

---

## ⚙️ Panduan Menjalankan Proyek (Getting Started)

### 1. Prasyarat Sistem
- **Node.js**: Versi `v20.x` atau lebih baru (`v26.x` didukung).
- **Package Manager**: `npm` atau `yarn`.
- **Expo Go App** (opsional untuk testing di ponsel fisik Android/iOS).

### 2. Kloning & Instalasi Dependensi
```bash
# Masuk ke direktori aplikasi
cd AloraStudioApp/AloraStudio

# Install seluruh pustaka dependensi
npm install
```

### 3. Konfigurasi Environment Variable (`.env`)
Pastikan file `.env` tersedia di dalam root folder `AloraStudio`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

### 4. Menjalankan Aplikasi
```bash
# Menjalankan Metro Bundler Expo
npx expo start

# Menjalankan langsung di browser Web
npx expo start --web

# Menjalankan di Android Emulator / Device
npx expo start --android

# Menjalankan di iOS Simulator
npx expo start --ios
```

---

## 📋 Standar Rekayasa & Kebijakan Berkas (Engineering Standards)

- **Kompresi Gambar**: Semua foto yang diunggah ke kartu kanban otomatis melalui proses kompresi bertahap (`quality: 0.8` $\rightarrow$ `0.5`, resolusi maks `1600px` $\rightarrow$ `1024px`) agar tersimpan dengan ukuran **$< 600 \text{ KB}$**.
- **Batas Dokumen PDF**: File `.pdf` dibatasi maksimal **$10 \text{ MB}$** dengan pengecekan sisi *client* dan *service layer*.
- **Keamanan Git**: Berkas kredensial `.env` serta arsip spesifikasi internal pada folder `docs/` dikecualikan dari Git melalui `.gitignore` demi menjaga kerahasiaan data internal.
- **Integritas Tipe Data**: Seluruh kode divalidasi dengan TypeScript strict (`npx tsc --noEmit` $0$ error).

---

© 2026 **Alora Studio**. Hak cipta dilindungi undang-undang.
