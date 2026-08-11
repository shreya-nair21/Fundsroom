# Fundsroom ERP & CRM Operations Portal
## System Architecture & Deployment Documentation

---

### 🌐 Live Production Links
- **Frontend Client (UI)**: [https://fundsroom-three-pi.vercel.app/](https://fundsroom-three-pi.vercel.app/)
- **Backend API Server**: [https://fundsroombackend-sandy.vercel.app/](https://fundsroombackend-sandy.vercel.app/)
- **GitHub Repository**: [https://github.com/shreya-nair21/Fundsroom](https://github.com/shreya-nair21/Fundsroom)

---

### 🔐 Test Login Credentials

| Role | Username / Email | Password | Allowed Modules |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@fundsroom.com` | `admin123` | Full Access (CRM, Inventory, Challans, Logs, Analytics) |
| **Sales Executive** | `sales@fundsroom.com` | `sales123` | CRM (Create/Read), Challans (Create/Update Drafts) |
| **Warehouse Keeper** | `warehouse@fundsroom.com` | `warehouse123` | Inventory Catalog (CRUD), Stock Adjustments, Movements Log, View Invoices |
| **Accounts Manager** | `accounts@fundsroom.com` | `accounts123` | CRM (Read), Inventory (Read), Challans (View/Confirm/Cancel) |

---

## 1. Architecture & System Overview
The Fundsroom Operations Portal is built using a decoupled **Monolith Split** architecture, separating a JSON REST API and a Single Page Application frontend.

### Backend API Component
- **Engine**: Node.js & Express.js written in TypeScript.
- **Validation**: Schema-level inputs are checked using **Zod** before hitting database queries.
- **Security**: Endpoint access is guarded by JWT hash validators checking cookie or Bearer tokens.
- **ORM**: Database commands utilize Prisma.

### Frontend Web Client
- **Engine**: React & Vite in TypeScript.
- **Styling**: Vanilla CSS using customizable variables to implement a **Fintech Emerald & Deep Charcoal** theme.
- **State**: React context (`AuthContext`) coordinates session caching, role verification, and dynamic routing permissions.

### Database & ORM Model
- **Engine**: Relational MySQL/MariaDB database.
- **Driver Adapter**: Built utilizing the Prisma MariaDB adapter (`PrismaMariaDb`) to manage connection pooling and SSL tunnels.

---

## 2. Database Schema & Setup

### Database Entities (Models)
- **`User`**: Internal employee accounts with cryptographically hashed passwords and role fields.
- **`Customer`**: CRM directory tracking wholesale distributors, contact information, status, and scheduled follow-ups.
- **`FollowUp`**: CRM logs detailing customer outreach, sales cycles, and contact history.
- **`Product`**: Inventory catalog tracking SKU codes, current stock levels, safety thresholds, and warehouse location coordinates.
- **`StockMovement`**: Detailed stock ledgers logging manual intake adjustments and order releases.
- **`Challan`**: Billing records containing client profiles, status states, and final calculations.
- **`ChallanProduct`**: Price-fixed snapshots preserving transaction metadata for sold items.

### Seeding Initial Data
- A seeding script compiles initial values into your DB, loading:
  - **4 default employees** (representing each user role).
  - **10 default catalog products** with variable stock parameters.
  - **5 active customer profiles**.

---

## 3. Environment Variables

- **`PORT`**: Port number for the Express server (default: `5000`).
- **`DATABASE_URL`**: Fully-qualified connection string (e.g. `mysql://avnadmin:...`).
- **`DB_HOST` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` / `DB_PORT`**: Parameterized variables for connection fallback.
- **`DB_SSL`**: Set to `true` on production for cloud databases.
- **`JWT_SECRET`**: Cryptographic secret key used to sign and verify JWT authentication tokens.
- **`NODE_ENV`**: Mode switch (`development` / `production`).

> [!NOTE]
> **Auto-Parsing Configuration**: To simplify cloud deployments, the server parses the `DATABASE_URL` variable at runtime to extract host credentials and automatically activate secure SSL mode, meaning you only need to configure one variable in the cloud dashboard.

---

## 4. Local Setup Guide

### 1. Database Preparation
Create a database in your local MySQL instance:
```sql
CREATE DATABASE fundsroom_erp;
```

### 2. Backend Setup
```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```
*Server runs on: [http://localhost:5000](http://localhost:5000)*

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```
*App runs on: [http://localhost:5173](http://localhost:5173)*

---

## 5. Features & Assumptions

### Feature Checklist
- [x] **Role-Based Auth**: Locks operations and paths according to user roles.
- [x] **CRM Customers Directory**: Text searches, status filters, and notes timeline.
- [x] **Inventory Catalog**: Stock counters, warning levels, manual logs.
- [x] **Sales Challan Builder**: Save drafts, confirm items, deduct stock atomically.
- [x] **Print Layout Invoice**: Cleans layout elements to export invoices as PDF/Paper.
- [x] **Docker Deployment**: Configurations for both frontend and backend.
- [x] **Postman API Collection**: Exported routing collection.

### Key Design Assumptions
1. **Pricing Integrity**: When a Challan shifts to `CONFIRMED`, current product names, SKUs, and pricing details are copied to a snapshot record. This guarantees that future inventory adjustments or price hikes do not retroactively alter historic bills.
2. **Stock Atomicity**: Stock decrements are validated and run within single SQL transactions to prevent negative stock quantities.
3. **Single-Page Routing**: Uses modular states in the React shell to coordinate pages, optimizing load speeds.
