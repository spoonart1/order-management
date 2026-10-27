
# Alora Studio

**An open-source operations management app for interior design studios, architects, and custom furniture workshops.**

Alora Studio helps teams manage their day-to-day operations in one place, from client acquisition and quotations to production tracking, invoicing, and payment collection.

Built with React Native and Expo, the application supports web, iOS, and Android. Its offline-first approach is designed for teams working on job sites and workshop floors where internet connectivity may be unreliable.

## Overview

Alora Studio brings key business workflows together:

- **Sales management:** Track leads and manage the sales pipeline.
- **Quotations and RAB:** Prepare itemized project estimates, room specifications, and quotations.
- **Production management:** Track project progress, deadlines, and operational tasks.
- **Invoicing and payments:** Manage payment milestones, outstanding balances, and receipts.
- **Offline-first workflows:** Continue working with locally cached data when connectivity is unavailable, with queued changes synchronized when connectivity returns.

The project is built around real operational workflows in the interior design and custom furniture industry.

---

## Web App Preview

Multi-Board Kanban  | Quotations & RAB Pipeline
--- | ---
 | 
Track leads and auto-transfer DP orders to production  | Itemized room specifications & status tracking

Official Quotation PDF Preview  | Milestone Invoicing & Payments
--- | ---
 | 
Print-ready PDF layout with specification tables  | Progressive term billing (DP to Final Settlement)

---

## Mobile App Preview

Executive Dashboard  | Multi-Board Kanban  | Quotations & RAB  | Milestone Invoicing
--- | --- | --- | ---
 |  |  |
Real-time studio KPIs  | Operational card board  | Drafting & proposal list  | Payment & invoice tracking

---

## Offline Mode

The application is designed to support work in environments with intermittent or unavailable internet access.

- **Local data access:** Frequently accessed operational data is cached locally using AsyncStorage.
- **Queued offline changes:** Supported create, edit, and move operations can be queued locally while offline.
- **Automatic synchronization:** Queued mutations are synchronized with Supabase when connectivity is restored.
- **Connectivity awareness:** The interface displays offline status and pending synchronization counts.

Offline behavior depends on the operation and synchronization state. Data consistency and error recovery are important considerations when working with locally queued changes.

## Features

### Sales and Operations

- Executive dashboard with billed revenue, payments received, outstanding balances, sales pipeline value, and production deadlines.
- Multiple Kanban boards for marketing, production, and general studio operations.
- Workflow automation that transfers qualifying orders from the sales pipeline to production.
- Production tracking for workshop and on-site activities.

### Quotations and Project Estimates

- Room-by-room itemized specifications.
- Automated tax and discount calculations.
- Indonesian Rupiah (IDR) formatting.
- Print-ready quotation PDF generation.

### Documents and Attachments

- Image compression for site photos and project renders.
- PDF attachments for blueprints, contracts, and related documents.
- Document preview and sharing support.

### Invoicing and Payments

- Milestone-based billing for down payments (DP), intermediate milestones, and final settlement.
- Invoice and payment status tracking.
- Payment receipts and outstanding balance monitoring.

---

## Tech Stack

| Area | Technology |
| --- | --- |
| Mobile and Web | React Native, Expo |
| Language | TypeScript (strict mode) |
| Routing | Expo Router |
| Styling | NativeWind, Tailwind CSS |
| State Management | Redux Toolkit |
| Local Storage | AsyncStorage |
| Backend | Supabase |
| Database | PostgreSQL |
| Authentication and Authorization | Supabase Auth, Row Level Security |
| File Storage | Supabase Storage |
| Connectivity | NetInfo |
| Image Processing | expo-image-manipulator |
| Document Handling | expo-document-picker |
| PDF Generation | expo-print |
| Sharing | expo-sharing |
| Offline Synchronization | Custom outbox queue |

---

## Getting Started

### Prerequisites

Before running the application, make sure you have:

- Node.js 20 or later
- npm
- A Supabase project
- Expo-compatible development tools for your target platform

### 1. Clone the Repository

```bash
git clone https://github.com/spoonart1/order-management.git
cd order-management
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the repository root, alongside `package.json`.

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Replace the placeholder values with the corresponding credentials from your Supabase project.

**Security note:** Only use a Supabase publishable key intended for client-side use. Never expose a Supabase secret key or service-role key in a mobile or web application.

### 4. Start the Development Server

```bash
npx expo start
```

Run the application on the web:

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

### 5. Supabase Configuration

Configure your Supabase project to match the application's database schema, authentication requirements, storage configuration, and Row Level Security policies.

Environment variables alone do not initialize the database schema or configure authorization policies.

---

## Project Structure

The application source code is organized under `src/`, with application assets and public resources maintained in their respective directories.

```text
order-management/
├── assets/
├── public/
├── src/
├── app.json
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
└── README.md
```

The exact module organization and application entry points can be explored in the source code.

## Design Considerations

The project focuses on several practical engineering concerns:

- **Cross-platform delivery:** Sharing application logic across web, iOS, and Android.
- **Operational workflows:** Modeling business processes that span sales, production, and finance.
- **Offline resilience:** Supporting local changes and deferred synchronization.
- **Backend integration:** Using Supabase for data persistence, authentication, and file storage.
- **Maintainability:** Using TypeScript and centralized state management to support ongoing development.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.
