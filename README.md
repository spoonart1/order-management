# Alora Studio

**Open-source operations management and mini-ERP for interior design studios, architects, and custom furniture workshops.**

Alora Studio helps manage the end-to-end workflow of an interior design business, from lead management and quotations to production tracking, invoicing, and payment collection.

Built with React Native and Expo, the application targets web, iOS, and Android, with offline-first capabilities designed for job sites and workshop environments where internet connectivity may be unreliable.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Offline Support](https://img.shields.io/badge/Offline_Mode-Supported-2ea44f?style=flat-square)](#-offline-mode-support)
[![React Native](https://img.shields.io/badge/React_Native-0.86-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo_SDK-57-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database_%26_Storage-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![NativeWind](https://img.shields.io/badge/NativeWind-Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://www.nativewind.dev/)

---

## Overview

Alora Studio is an operational management application for interior design studios and custom furniture workshops. It brings core business workflows into one place:

- **Sales management:** Track prospective clients and manage the sales pipeline.
- **Quotations and RAB:** Prepare itemized project estimates, room specifications, and formal quotations.
- **Production management:** Track project progress, deadlines, and workshop activities.
- **Invoicing and payments:** Manage payment milestones, receipts, and outstanding balances.
- **Offline-first workflows:** Access locally cached data and queue supported changes while offline.

The application is designed for desktop, tablet, and mobile workflows across web, iOS, and Android.

---

## Web App Preview

<p align="center">
  <img src="assets/screenshots/01-dashboard.png" alt="Alora Studio - Executive Operational Dashboard" width="100%"/>
</p>

| Multi-Board Kanban | Quotations & RAB Pipeline |
| :---: | :---: |
| [![Kanban Board](assets/screenshots/02-kanban-board.png)](assets/screenshots/02-kanban-board.png) | [![Quotations](assets/screenshots/03-quotations.png)](assets/screenshots/03-quotations.png) |
| *Track leads and transfer qualifying orders to production* | *Manage itemized room specifications and quotation status* |

| Official Quotation PDF Preview | Milestone Invoicing & Payments |
| :---: | :---: |
| [![Quotation Preview](assets/screenshots/04-quotation-preview.png)](assets/screenshots/04-quotation-preview.png) | [![Invoices](assets/screenshots/05-invoices.png)](assets/screenshots/05-invoices.png) |
| *Print-ready quotation documents with specification tables* | *Track progressive billing from down payment to final settlement* |

---

## Mobile App Preview

| Executive Dashboard | Multi-Board Kanban | Quotations & RAB | Milestone Invoicing |
| :---: | :---: | :---: | :---: |
| [![Mobile Dashboard](assets/screenshots/mobile-01-dashboard.png)](assets/screenshots/mobile-01-dashboard.png) | [![Mobile Kanban](assets/screenshots/mobile-02-kanban.png)](assets/screenshots/mobile-02-kanban.png) | [![Mobile Quotations](assets/screenshots/mobile-03-quotations.png)](assets/screenshots/mobile-03-quotations.png) | [![Mobile Invoices](assets/screenshots/mobile-04-invoices.png)](assets/screenshots/mobile-04-invoices.png) |
| *Studio KPIs* | *Operational workflow boards* | *Quotation management* | *Invoice and payment tracking* |

---

## Offline Mode Support

Alora Studio is designed to support work in environments with intermittent or unavailable internet connectivity.

- **Local data access:** Frequently accessed data is cached locally using AsyncStorage.
- **Queued offline changes:** Supported create, edit, and move operations can be recorded in a local outbox while offline.
- **Deferred synchronization:** Queued mutations can be synchronized with Supabase when connectivity returns.
- **Connectivity awareness:** The interface indicates offline status and pending synchronization activity.

Offline support depends on the specific operation and its implementation. Local persistence, synchronization retries, conflict handling, and server-side validation are important considerations for maintaining data consistency.

---

## Features

### Executive Dashboard

- Financial indicators for billed revenue, payments received, and outstanding balances.
- Sales pipeline visibility.
- Production deadline monitoring, including upcoming deadlines within 10 days.

### Sales and Production Boards

- **Marketing board:** Track prospective clients through the sales pipeline.
- **Production board:** Monitor workshop and on-site project stages.
- **General board:** Organize studio operations and internal tasks.
- **Workflow automation:** Moving a qualifying order to the down-payment stage can transfer it to the production board, with deadlines derived from quotation data.

### Quotations and RAB

- Room-by-room, itemized project specifications.
- Tax and discount calculations.
- Indonesian Rupiah (IDR) formatting.
- Print-ready quotation PDF generation.

### Attachments and Documents

- Image compression for site photos and 3D renders.
- PDF attachments for blueprints, contracts, and related documents.
- Document preview and sharing support.

### Invoicing and Payments

- Milestone-based billing for down payments, intermediate milestones, and final settlement.
- Invoice and payment status tracking.
- Payment receipts and outstanding balance monitoring.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| Application | React Native, React, Expo, Expo Router |
| Language | TypeScript, strict mode |
| Styling | NativeWind, Tailwind CSS |
| State Management | Redux Toolkit |
| Local Persistence | AsyncStorage |
| Backend and Database | Supabase, PostgreSQL |
| Authentication and Authorization | Supabase Auth, Row Level Security |
| File Storage | Supabase Storage |
| Connectivity | `@react-native-community/netinfo` |
| Offline Synchronization | Custom outbox queue |
| Media Processing | `expo-image-manipulator` |
| Document Selection | `expo-document-picker` |
| PDF Generation | `expo-print` |
| Sharing | `expo-sharing` |

---

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm
- A configured Supabase project
- Expo-compatible development tools for the target platform

### 1. Clone the Repository

```bash
git clone https://github.com/spoonart1/order-management.git
cd order-management
```

The commands above assume that `package.json` is located in the repository root. If the application is stored in a subdirectory, change into that directory before installing dependencies.

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the same directory as the application's `package.json`.

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Replace the placeholder values with the credentials from your Supabase project.

**Security:** Expo public environment variables are included in client-side application builds. Use only a Supabase publishable key intended for client use. Never expose a Supabase secret key or service-role key in the application.

### 4. Configure Supabase

The backend must be configured with the database schema, authentication settings, storage buckets, and Row Level Security policies required by the application.

Environment variables alone do not create the database schema or configure authorization policies. Refer to the repository's database setup files and application code for the configuration required by the current implementation.

### 5. Start the Application

Start the Expo development server:

```bash
npx expo start
```

Run the web application:

```bash
npx expo start --web
```

Run on Android:

```bash
npx expo start --android
```

Run on iOS:

```bash
npx expo start --ios
```

Running on a simulator or physical device may require additional platform-specific development tools.

---

## Engineering Considerations

The project addresses several practical concerns in cross-platform product development:

- **Cross-platform delivery:** Shared application logic across web, iOS, and Android.
- **Business workflow modeling:** Connecting sales, production, and finance operations.
- **Offline resilience:** Persisting supported local changes and synchronizing them when connectivity returns.
- **Backend integration:** Using Supabase for data persistence, authentication, and file storage.
- **Maintainability:** Applying TypeScript and centralized state management to support ongoing development.

The behavior of offline synchronization, data consistency, and authorization should be evaluated against the actual implementation and deployment configuration.

---

## License

This project is licensed under the [MIT License](LICENSE).
