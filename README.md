# Alora Studio — Open-Source Interior & Architectural Backoffice Platform

> **An open-source, universal mini-ERP and operational workflow system designed specifically for interior design studios, architectural firms, and bespoke furniture workshops.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Open Source Love](https://img.shields.io/badge/Open_Source-%E2%99%A5-ff69b4?style=flat-square)](https://github.com/spoonart1/order-management)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/spoonart1/order-management/pulls)
[![React Native](https://img.shields.io/badge/React_Native-0.86-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo_SDK-57-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database_%26_Storage-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/NativeWind-Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://www.nativewind.dev/)
[![Redux Toolkit](https://img.shields.io/badge/Redux_Toolkit-State_Management-764ABC?style=flat-square&logo=redux&logoColor=white)](https://redux-toolkit.js.org/)

---

## 📌 Product Overview

**Alora Studio** is a modern, open-source business management and operations suite crafted to address the unique workflow complexities of the **interior architecture and custom manufacturing industries**.

Unlike generic project management software, Alora Studio is designed from the ground up around real-world studio lifecycles: from capturing prospective client leads, drafting itemized Bills of Quantities (RAB / Quotations), securing down payments (DP), automatically routing orders to workshop and field installation teams, monitoring critical completion deadlines, to issuing formal progressive milestone invoices.

Built on a **Universal React Native (Expo)** foundation, the platform delivers a seamless, high-performance experience across **Web Desktops** (studio workstations), **Tablets** (client presentations & on-site surveys), and **Mobile Devices** (Android & iOS for workshop foremen and site supervisors) — reinforced by an uncompromising **100% Offline-First Architecture**.

---

## 🚀 Core Features

### 1. Executive Operational Dashboard
- **Financial Performance KPIs**: Instant real-time tracking of Total Billed, Total Paid, Balance Due, and Collection Rate percentage.
- **Sales & Quotation Pipeline**: Quantitative and monetary pipeline breakdown across *Draft*, *Sent*, and *Approved* quotation stages.
- **Production Deadline Radar**: Automated monitoring widget identifying orders nearing completion deadlines ($\le$ 10 days) or overdue items, complete with day-count badges and direct navigation to the Production Board.
- **Action Strip & Recent Receipts**: One-click operational shortcuts and a live feed of recent client milestone payments.

### 2. Multi-Board Kanban & Automated Workflow Engine
- **Multi-Board Views**: Dedicated boards for **Marketing**, **Production**, and **General** studio operations.
- **Automated Order Transition**: Moving a card to *DP (Deal Payment)* on the Marketing Board automatically:
  - Clones the card to the **Production Board** under *Order Masuk (Incoming Orders)*.
  - Retrieves the agreed working days duration from the linked formal Quotation (`work_duration_days`).
  - Calculates and stamps the precise completion due date (`due_date`).
- **Production Stage Tracking**: Visualizes shop-floor and site phases: *Incoming Orders*, *Site Measurement & CAD Drafting*, *Workshop Fabrication*, *Finishing*, *Field Installation*, and *Handover*.
- **Deadline Indicators**: Dynamic urgency badges (*X Days Left*, *Due Today*, *X Days Overdue*) exclusive to production workflows.
- **Universal Interactions**: Fluid drag-and-drop on desktop browsers and touch-optimized card interactions on mobile/tablet.

### 3. Smart Photo & PDF Attachment System
- **Progressive Image Compression (< 600 KB)**: On-device multi-stage downscaling and JPEG compression powered by `expo-image-manipulator`. High-res camera photos and 3D renders are automatically optimized to under 600 KB before upload to guarantee swift syncing and conserve mobile bandwidth.
- **PDF Document Support (Up to 10 MB)**: Native document picker integration (`expo-document-picker`) for architectural blueprints, CAD layouts, and formal client contracts.
- **Architectural Thumbnail Cards**: Custom warm-toned document cards featuring crimson `[PDF]` indicators, truncated file names, formatted file sizes, and 1-click preview links (`Buka ↗`).

### 4. Quotation & Cost Estimation Engine (RAB)
- Granular specification breakdowns organized by room/area (item name, volume, unit, unit rate, subtotal).
- Automated calculations for subtotals, custom discounts, VAT (PPN), and grand totals.
- Formal Indonesian currency formatting with automatic Rupiah spelling (*Terbilang* text generator).
- Professional, print-ready PDF generation with official studio letterhead and signature blocks.

### 5. Progressive Invoicing & Receipt Management
- One-click invoice generation linked directly to approved quotations.
- Multi-tier progressive milestone receipts (Down Payment, Milestone 1, Milestone 2, Final Settlement).
- Dynamic payment statuses (*Unpaid*, *Partial*, *Paid*, *Overdue*, *Cancelled*).
- Executive-grade PDF invoices styled with architectural minimalism for client billing.

### 6. 100% Offline-First Architecture
- **Instantaneous 0ms Render**: First-paint data is hydrated directly from persistent local storage (*AsyncStorage*).
- **Silent Outbox Queue**: Offline mutations (moving cards, editing details, deleting entries) are captured in an outbox queue and silently replayed in the background upon internet reconnection.
- **Network Status Banner**: Persistent visual indicators notifying users when operating in offline local mode.

---

## 🛠️ Technology Stack

Alora Studio is built on a clean, modern, fully-typed TypeScript architecture:

### Frontend & Universal UI
| Technology | Version | Description / Purpose |
| :--- | :--- | :--- |
| **React Native** | `0.86.3` | Core universal component rendering across Web, iOS, and Android. |
| **React** | `19.2.3` | Foundation UI component and hook primitives. |
| **Expo SDK** | `~57.0.28` | Universal cross-platform toolchain, build system, and native modules. |
| **Expo Router** | `~57.0.26` | File-based typed routing with Drawer, Stack, and Search Parameter support. |
| **NativeWind / Tailwind CSS** | `^4.2.7` / `^3.4.19` | Utility-first CSS styling engine compiled for universal React Native platforms. |
| **Lucide Icons** | `^1.57.0` | Clean, modern UI icon system (`lucide-react-native`). |

### State Management & Caching
| Technology | Version | Description / Purpose |
| :--- | :--- | :--- |
| **Redux Toolkit** | `^2.13.0` | Centralized global state management (Auth, Board, Quotation, Invoice slices). |
| **React Redux** | `^9.3.0` | Official React bindings for Redux state. |
| **AsyncStorage** | `2.2.0` | Persistent asynchronous key-value storage for local caching and offline queues. |
| **SWR Caching** | Custom Service | Stale-While-Revalidate pattern ensuring zero-latency reads with background verification. |

### Backend, Database & Storage
| Technology | Version | Description / Purpose |
| :--- | :--- | :--- |
| **Supabase Client** | `^2.117.3` | Cloud PostgreSQL database client and authentication service. |
| **PostgreSQL Database** | Managed Supabase | Relational data store for cards, columns, quotations, invoices, and payments. |
| **Supabase Storage** | S3-Compatible | Object storage buckets for site photos, blueprints, and PDF attachments. |
| **Row Level Security (RLS)** | PostgreSQL | Fine-grained, role-based database access control policies. |

### Device & Native Integrations
| Module | Purpose |
| :--- | :--- |
| **`expo-image-manipulator`** | Progressive multi-stage compression and resizing of images to under 600 KB. |
| **`expo-document-picker`** | Native file picker for `.pdf` documents with strict 10 MB size limits. |
| **`expo-image-picker`** | Camera and photo gallery access on mobile devices. |
| **`expo-print` & `expo-sharing`** | HTML-to-PDF compilation and native OS share sheet integration. |
| **`expo-linking` & `expo-web-browser`** | In-app document viewing and external deep linking. |
| **`@react-native-community/netinfo`** | Real-time network reachability and connection type monitoring. |

---

## 📂 Project Directory Structure

```text
AloraStudioApp/
└── AloraStudio/
    ├── src/
    │   ├── app/                          # File-based routing (Expo Router)
    │   │   ├── (auth)/                   # Authentication routes (Login, Register)
    │   │   ├── (backoffice)/             # Core operational backoffice routes
    │   │   │   ├── dashboard.tsx         # Executive operational dashboard
    │   │   │   ├── boards.tsx            # Multi-board Kanban (Marketing/Production/General)
    │   │   │   ├── quotations/           # Quotation & RAB management routes
    │   │   │   └── invoices/             # Invoice & progressive payment routes
    │   │   └── _layout.tsx               # Root layout & drawer navigator
    │   ├── components/                   # Modular UI components
    │   │   ├── board/                    # KanbanCard, KanbanColumn, CardDetailModal, BoardHeader
    │   │   ├── quotation/                # QuotationFormModal, QuotationPreviewModal
    │   │   ├── invoice/                  # InvoiceCard, PaymentFormModal
    │   │   └── ui/                       # Reusable UI primitives (Chip, DatePickerField, Buttons)
    │   ├── services/                     # Business logic & Network/Data abstraction layers
    │   │   ├── boardService.ts           # Board & card database transactions
    │   │   ├── orderWorkflowService.ts   # DP-to-Production automation & deadline calculations
    │   │   ├── cardAttachmentService.ts  # File storage, image auto-compression & PDF validation
    │   │   ├── quotationService.ts       # Quotation CRUD & calculation engine
    │   │   ├── invoiceService.ts         # Invoicing and payment receipt tracking
    │   │   ├── syncService.ts            # Offline queue replay & background sync
    │   │   ├── offlineQueueService.ts    # Persistent AsyncStorage mutation queue
    │   │   └── *CacheService.ts          # Instant 0ms SWR cache adapters
    │   ├── store/                        # Redux Toolkit store & feature slices
    │   │   ├── slices/                   # authSlice, boardSlice, invoiceSlice, quotationSlice
    │   │   └── store.ts                  # Root store configuration
    │   ├── utils/                        # Currency formatters, date utilities & text generators
    │   └── lib/                          # Supabase client, confirmation dialogs & network helpers
    ├── package.json
    └── tsconfig.json
```

---

## ⚙️ Quick Start Guide

### 1. Prerequisites
- **Node.js**: Version `v20.x` or later (`v26.x` tested).
- **Package Manager**: `npm` or `yarn`.
- **Expo Go App** (optional, for physical iOS/Android device testing).

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/spoonart1/order-management.git
cd order-management/AloraStudio

# Install project dependencies
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root of `AloraStudio`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
```

### 4. Running the Development Server
```bash
# Start the universal Expo Metro bundler
npx expo start

# Run directly in your default Web Browser
npx expo start --web

# Launch on an Android Emulator or connected device
npx expo start --android

# Launch on an iOS Simulator (macOS required)
npx expo start --ios
```

---

## 🤝 Contributing & Community

Alora Studio is an **open-source project**, and we warmly welcome contributions from developers, interior designers, architects, and product builders worldwide!

### How You Can Contribute:
1. **Report Bugs & Suggest Features**: Open an [Issue](https://github.com/spoonart1/order-management/issues) with detailed reproduction steps or clear feature specs.
2. **Submit Pull Requests**:
   - Fork the repository.
   - Create a feature branch (`git checkout -b feature/amazing-feature`).
   - Ensure all TypeScript checks pass (`npx tsc --noEmit`).
   - Commit your changes with clear, descriptive commit messages.
   - Push to your branch and open a Pull Request.
3. **Enhance Documentation**: Help improve installation guides, architectural diagrams, or multi-language localization.

---

## 📄 License

This project is licensed under the **MIT License** — you are free to use, modify, distribute, and integrate this software in both open-source and commercial studio projects. See the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Crafted with precision for architects, interior creators, and makers.
</p>
