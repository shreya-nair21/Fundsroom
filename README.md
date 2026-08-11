# Mini ERP + CRM Operations Portal

A modern, responsive, role-based Full Stack ERP & CRM application built for a wholesale/distribution company. It features Customer Management (CRM), Product & Inventory Cataloging (with automated low stock thresholds and full ledger logs), and a Sales Challan billing pipeline with transaction-safe stock allocation and printable invoice pages.

---

## 🚀 Live Demo & Repository
- **Frontend Client (UI)**: [https://fundsroom-three-pi.vercel.app/](https://fundsroom-three-pi.vercel.app/)
- **Backend API Server**: [https://fundsroombackend-sandy.vercel.app/](https://fundsroombackend-sandy.vercel.app/)
- **GitHub Repository**: [https://github.com/shreya-nair21/Fundsroom](https://github.com/shreya-nair21/Fundsroom)

---

## 🔐 Test Login Credentials

| Role | Username / Email | Password | Allowed Modules |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@fundsroom.com` | `admin123` | Full Access (CRM, Inventory, Challans, Logs, Analytics) |
| **Sales Executive** | `sales@fundsroom.com` | `sales123` | CRM (Create/Read), Challans (Create/Update Drafts) |
| **Warehouse Keeper** | `warehouse@fundsroom.com` | `warehouse123` | Inventory Catalog (CRUD), Stock Adjustments, Movements Log, View Invoices |
| **Accounts Manager** | `accounts@fundsroom.com` | `accounts123` | CRM (Read), Inventory (Read), Challans (View/Confirm/Cancel) |

---

## 🛠️ Technology Stack
- **Backend API**: Node.js, Express.js, TypeScript, Prisma ORM, Zod, JWT Hashing, MySQL/MariaDB database.
- **Frontend Client**: React.js, Vite, TypeScript, Lucide Icons, Vanilla CSS (Modern premium glassmorphic dark mode).
- **Tooling**: Git, Postman API Collection.

---

## 🏛️ Architecture Overview
This application follows a **Monolithic Split** architecture:
1. **Database Layer**: Relational MySQL schema with tables representing core entities (`User`, `Customer`, `FollowUp`, `Product`, `StockMovement`, `Challan`, and `ChallanProduct` snapshots).
2. **Backend API Layer**: Express controllers handling routing, authentication guards (`jwt`), input validation schemas (`zod`), and transactional database commands utilizing Prisma.
3. **Frontend Client Layer**: A single-page application router structured with modular page views. It uses React context (`AuthContext`) to manage session credentials and dynamically toggles navigation options and actions depending on user roles.

---

## 💻 Local Setup & Run Guide

### Prerequisites
- Node.js (v18+)
- MySQL or MariaDB running locally

### 1. Database Setup
Ensure you have a MySQL server running on port `3306`. Connect to it and run:
```sql
CREATE DATABASE IF NOT EXISTS fundsroom_erp;
```

### 2. Backend Configuration & Run
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create a `.env` file inside `backend/` and configure:
   ```env
   PORT=5000
   DATABASE_URL="mysql://root:root@127.0.0.1:3306/fundsroom_erp"
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=root
   DB_NAME=fundsroom_erp
   JWT_SECRET="fundsroom_erp_secret_jwt_key_123"
   NODE_ENV=development
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run migrations to setup tables:
   ```bash
   npx prisma migrate dev --name init
   ```
5. Seed initial mock database records (Admin, Sales, Products, Customers):
   ```bash
   npm run seed
   ```
6. Start the API server in development mode:
   ```bash
   npm run dev
   ```
   *The backend will boot up on [http://localhost:5000](http://localhost:5000).*

### 3. Frontend Client Setup & Run
1. Navigate to the `frontend` directory:
   ```bash
   cd ../frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Boot the Vite hot-reloading dev server:
   ```bash
   npm run dev
   ```
   *Open [http://localhost:5173](http://localhost:5173) in your web browser.*

---

## 🚀 Deployment Instructions

### Database (e.g., Aiven MySQL, Neon, Supabase, or Render)
1. Provision a managed MySQL database instance.
2. Retrieve the connection string URL.
3. Update the `DATABASE_URL` parameter in your backend production settings to point to your hosted instance.
4. Run the migration to initialize schemas:
   ```bash
   DATABASE_URL="your-production-url" npx prisma migrate deploy
   ```

### Backend API (e.g., Render, Railway, or Heroku)
1. Create a new Web Service pointing to your repository, setting the root directory to `backend`.
2. Configure environment variables in the host dashboard:
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`.
3. Set the build command:
   ```bash
   npm install && npx prisma generate && npm run build
   ```
4. Set the start command:
   ```bash
   npm start
   ```

### Frontend Client (e.g., Vercel or Netlify)
1. Connect your GitHub repository to Vercel.
2. Select `frontend` as the root directory of the project.
3. Add the following build configurations:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the environment variable:
   - `VITE_API_URL`: Your hosted backend production API URL (e.g., `https://fundsroom-api.onrender.com/api`).
5. Click **Deploy**. Vercel will build the React application and host it statically.

---

## 📦 API Documentation & Testing
A Postman API testing collection is exported at [backend/postman_collection.json](file:///c:/Users/shrey/Fundsroom/backend/postman_collection.json).
You can import it into Postman to review parameters and run automated requests.

---

## 📝 Key Design Assumptions
1. **Single-Page Routing**: Used a toggle state in the main React application shell rather than a heavy library like React Router, keeping the footprint light and optimizing load speeds.
2. **Product Price Snapshots**: Instead of linking the challan products directly to the inventory product price, we copy details (Name, SKU, Price) into a `ChallanProduct` record. If a product price shifts next month, past invoice entries remain historically correct.
3. **Transaction Safety**: Confirming a draft invoice or cancelling an issued invoice are handled inside database-level SQL transactions. If any individual product stock check fails, the entire request rolls back to prevent negative inventory levels.
