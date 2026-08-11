const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Initialize PDF Document
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  bufferPages: true
});

const pdfPath = path.join(__dirname, '..', 'ERP_CRM_Documentation.pdf');
const writeStream = fs.createWriteStream(pdfPath);
doc.pipe(writeStream);

// Helper colors
const primaryColor = '#0d9488'; // Emerald
const darkColor = '#1f2937'; // Charcoal
const grayColor = '#4b5563'; // Slate gray
const linkColor = '#0284c7'; // Blue link

function addHeader(text) {
  // Check if we need a page break (prevent orphans near the page bottom)
  if (doc.y > 650) {
    doc.addPage();
  } else {
    doc.moveDown(1.5);
  }
  doc.fillColor(primaryColor)
     .fontSize(15)
     .font('Helvetica-Bold')
     .text(text);
  doc.moveDown(0.6);
}

function addSectionTitle(text) {
  if (doc.y > 700) {
    doc.addPage();
  } else {
    doc.moveDown(0.8);
  }
  doc.fillColor(primaryColor)
     .fontSize(12)
     .font('Helvetica-Bold')
     .text(text);
  doc.moveDown(0.4);
}

function addBodyText(text) {
  doc.fillColor(darkColor)
     .fontSize(10)
     .font('Helvetica')
     .text(text, { align: 'justify', lineGap: 3 });
  doc.moveDown(0.6);
}

function addBullet(title, desc) {
  doc.fillColor(darkColor)
     .fontSize(10)
     .font('Helvetica-Bold')
     .text('  • ' + title + ': ', { continued: true })
     .font('Helvetica')
     .text(desc, { lineGap: 2 });
  doc.moveDown(0.3);
}

// ==========================================
// TITLE PAGE (Super Clean & Minimal)
// ==========================================
doc.rect(0, 0, 595, 842).fill('#f8fafc');

// Title Block
doc.fillColor(primaryColor)
   .fontSize(28)
   .font('Helvetica-Bold')
   .text('Fundsroom ERP & CRM', 50, 220, { align: 'center' });

doc.fillColor(darkColor)
   .fontSize(15)
   .font('Helvetica')
   .text('Operations Portal Documentation', { align: 'center' });

doc.moveDown(3);

doc.rect(120, 310, 355, 3).fill(primaryColor);

doc.moveDown(4);

doc.fillColor(primaryColor)
   .fontSize(12)
   .font('Helvetica-Bold')
   .text('Live Deployed Application Link:', { align: 'center' });

doc.fillColor(linkColor)
   .fontSize(11)
   .font('Helvetica-Bold')
   .text('Frontend Client URL', { align: 'center', link: 'https://fundsroom-three-pi.vercel.app/' });

doc.fillColor(grayColor)
   .fontSize(9)
   .font('Helvetica')
   .text('(https://fundsroom-three-pi.vercel.app/)', { align: 'center' });

doc.moveDown(1);

doc.fillColor(primaryColor)
   .fontSize(12)
   .font('Helvetica-Bold')
   .text('Live Backend API Link:', { align: 'center' });

doc.fillColor(linkColor)
   .fontSize(11)
   .font('Helvetica-Bold')
   .text('Backend Server URL', { align: 'center', link: 'https://fundsroombackend-sandy.vercel.app/' });

doc.fillColor(grayColor)
   .fontSize(9)
   .font('Helvetica')
   .text('(https://fundsroombackend-sandy.vercel.app/)', { align: 'center' });

// Add Page Break for Content
doc.addPage();

// ==========================================
// SECTION 1: ARCHITECTURE OVERVIEW
// ==========================================
addHeader('1. Architecture & System Overview');

addBodyText(
  'The Fundsroom Operations Portal is built using a decoupled Monolith Split architecture, separating a JSON REST API and a Single Page Application frontend. This layout maximizes response speeds and guarantees clear division of concerns.'
);

addSectionTitle('Backend API Component');
addBodyText(
  'The backend layer is engineered in Node.js and Express using TypeScript. Incoming requests are managed through controllers, which perform schema-level validation using Zod before engaging the database client. JWT hashing guards endpoints, enforcing role-based permissions.'
);

addSectionTitle('Frontend Web Client');
addBodyText(
  'The frontend is built in React and Vite using TypeScript. Styling is constructed in modular Vanilla CSS using custom design tokens to present a high-contrast corporate light theme. Session context tracks logged-in users, dynamically displaying permitted modules.'
);

addSectionTitle('Database & ORM Model');
addBodyText(
  'Data is housed in a relational MySQL/MariaDB database. The schema is integrated using Prisma ORM. A MariaDB driver adapter handles connection pooling, and transactional statements guarantee atomicity during sales challan fulfillment.'
);

// ==========================================
// SECTION 2: DATABASE SETUP & SEEDING
// ==========================================
addHeader('2. Database Schema & Setup');

addBodyText(
  'The SQL schema represents relational records for internal operations. Database interactions utilize connection adapters for maximum performance.'
);

addSectionTitle('Database Entities (Models)');
addBullet('User', 'Internal employee accounts containing email, role classification, and cryptographically hashed passwords.');
addBullet('Customer', 'CRM directory tracking wholesale distributors, contact information, status, and scheduled follow-ups.');
addBullet('FollowUp', 'CRM notes timeline referencing logs created during customer outreach and sales cycles.');
addBullet('Product', 'Inventory catalog containing SKU codes, current stock counters, alert markers, and warehouse coordinates.');
addBullet('StockMovement', 'Detailed stock ledgers logging manual increments, decrements, and order releases.');
addBullet('Challan', 'Sales records tracking client relations, status state transitions, and total calculations.');
addBullet('ChallanProduct', 'Price-fixed transaction snapshots preserving details of sold items.');

addSectionTitle('Seeding Initial Data');
addBodyText(
  'A seeding script is provided to populate initial database records. This loads four default employees (representing each user role), ten initial catalog products, and five wholesale customer profiles. To execute seeding in any environment, run the database seed utility.'
);

// ==========================================
// SECTION 3: ENVIRONMENT VARIABLES
// ==========================================
addHeader('3. Environment Variables');

addBodyText(
  'Environment variables govern server ports, session security, database connection details, and runtime configurations. Both local dotenv files and cloud hosting providers use these variables.'
);

addSectionTitle('Variable Specifications');
addBullet('PORT', 'The network port the Express API listens on (default: 5000).');
addBullet('DATABASE_URL', 'The MySQL database connection string. Auto-parsed by the Prisma engine.');
addBullet('DB_HOST / DB_USER / DB_PASSWORD', 'Individual DB connection variables used as fallback values by the MariaDB driver.');
addBullet('DB_PORT / DB_NAME / DB_SSL', 'SSL activation config parameters (enable DB_SSL=true for secure cloud databases).');
addBullet('JWT_SECRET', 'Cryptographic secret key used to sign and verify JWT authentication tokens.');
addBullet('NODE_ENV', 'Runtime environment classifier (development or production).');

addSectionTitle('Auto-Parsing Credentials');
addBodyText(
  'To simplify cloud deployments on serverless environments like Vercel, the application includes an auto-parsing connection utility. If DATABASE_URL is defined, the system automatically extracts connection details and enables secure SSL tunnels, eliminating the need to set individual variables.'
);

// ==========================================
// SECTION 4: LOCAL RUN INSTRUCTIONS
// ==========================================
addHeader('4. Local Setup Guide');

addSectionTitle('1. Database Preparation');
addBodyText(
  'Ensure a MySQL or MariaDB instance is running locally on port 3306. Connect and execute:\nCREATE DATABASE fundsroom_erp;'
);

addSectionTitle('2. Backend Setup');
addBodyText(
  'Navigate to /backend, install dependencies, configure your .env file, apply migrations, seed the database, and start the development server:\n\n' +
  '  cd backend\n' +
  '  npm install\n' +
  '  npx prisma migrate dev --name init\n' +
  '  npm run seed\n' +
  '  npm run dev'
);

addSectionTitle('3. Frontend Setup');
addBodyText(
  'Navigate to /frontend, install dependencies, and launch the Vite development server:\n\n' +
  '  cd frontend\n' +
  '  npm install\n' +
  '  npm run dev'
);

// ==========================================
// SECTION 5: FEATURES & ASSUMPTIONS
// ==========================================
addHeader('5. Features, Status & Assumptions');

addSectionTitle('Feature Progress Checklist');
addBullet('Role-Based Auth (100% Complete)', 'Allows secure token authentication and restricts page navigation according to user roles.');
addBullet('CRM Customer Directory (100% Complete)', 'Supports text searches, status categorization filters, detail logs, and follow-up updates.');
addBullet('Inventory Catalog (100% Complete)', 'Supports item CRUD, manual stock adjustments, reorder alerts, and global ledgers.');
addBullet('Sales Challan Billing (100% Complete)', 'Features draft saving, transactional stock allocation, and printable invoices.');
addBullet('Docker Deployment (100% Complete)', 'Includes Dockerfile configurations for backend and frontend.');
addBullet('API Collection (100% Complete)', 'Includes a pre-configured Postman JSON collection for route testing.');

addSectionTitle('Key Design Assumptions');
addBullet('Pricing Integrity', 'Product names, SKUs, and pricing details are copied to snapshot records when confirmed. This ensures that future catalog changes do not alter historical invoices.');
addBullet('Stock Atomicity', 'Stock decrements are validated and run within single SQL transactions to prevent negative stock quantities.');
addBullet('Single-Page Routing', 'Uses modular states in the React shell to coordinate pages, optimizing load speeds.');

// ==========================================
// SECTION 6: TESTING CREDENTIALS
// ==========================================
addHeader('6. Testing Credentials & Endpoints');

addSectionTitle('Employee Login Profiles');
addBodyText(
  'Use these accounts to test the system\'s role-based permissions and interface modules:'
);

addBullet('System Admin', 'Email: admin@fundsroom.com | Password: admin123 (Full Access)');
addBullet('Sales Executive', 'Email: sales@fundsroom.com | Password: sales123 (CRM, Challan Drafts)');
addBullet('Warehouse Keeper', 'Email: warehouse@fundsroom.com | Password: warehouse123 (Inventory CRUD, Logs)');
addBullet('Accounts Manager', 'Email: accounts@fundsroom.com | Password: accounts123 (Invoices, Read-only CRM/Inventory)');

addSectionTitle('API Core Endpoints (Postman)');
addBullet('POST /api/auth/login', 'Authenticates user and returns JWT token.');
addBullet('GET /api/customers', 'Lists clients with search and filter parameters.');
addBullet('POST /api/customers/:id/followups', 'Adds a timeline note to a customer\'s profile.');
addBullet('POST /api/products/:id/adjust-stock', 'Logs a manual stock adjustment (IN/OUT).');
addBullet('POST /api/challans', 'Saves a challan (decrements stock if status is CONFIRMED).');
addBullet('PUT /api/challans/:id/status', 'Updates status (transfers stock on CONFIRM/CANCEL transitions).');

// ==========================================
// PAGE NUMBER FOOTER LOGIC
// ==========================================
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(i);
  
  // Footer text
  doc.fillColor(grayColor)
     .fontSize(8)
     .font('Helvetica')
     .text(
       `Fundsroom ERP & CRM Portal  |  Page ${i + 1} of ${range.count}`,
       50,
       790,
       { align: 'center', width: 495 }
     );
}

// Finalize Document
doc.end();

writeStream.on('finish', () => {
  console.log('PDF documentation successfully created at ERP_CRM_Documentation.pdf');
});
