const { PrismaClient, Role, CustomerType, CustomerStatus, MovementType } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const adapter = new PrismaMariaDb({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'fundsroom_erp'
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Clear database
  await prisma.challanProduct.deleteMany();
  await prisma.challan.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Users (Admin, Sales, Warehouse, Accounts)
  const adminPassword = await bcrypt.hash('admin123', 10);
  const salesPassword = await bcrypt.hash('sales123', 10);
  const warehousePassword = await bcrypt.hash('warehouse123', 10);
  const accountsPassword = await bcrypt.hash('accounts123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@fundsroom.com',
      password: adminPassword,
      name: 'Admin User',
      role: Role.ADMIN,
    },
  });

  const sales = await prisma.user.create({
    data: {
      email: 'sales@fundsroom.com',
      password: salesPassword,
      name: 'Sales Executive',
      role: Role.SALES,
    },
  });

  const warehouse = await prisma.user.create({
    data: {
      email: 'warehouse@fundsroom.com',
      password: warehousePassword,
      name: 'Warehouse Keeper',
      role: Role.WAREHOUSE,
    },
  });

  const accounts = await prisma.user.create({
    data: {
      email: 'accounts@fundsroom.com',
      password: accountsPassword,
      name: 'Accounts Manager',
      role: Role.ACCOUNTS,
    },
  });

  console.log('Users seeded successfully!');

  // 3. Create Sample Customers
  const customer1 = await prisma.customer.create({
    data: {
      name: 'John Doe Retail',
      mobile: '9876543210',
      email: 'john@retailer.com',
      businessName: 'JD Retail Stores',
      gstNumber: '29AAAAA1111A1Z1',
      customerType: CustomerType.RETAIL,
      address: '123 Retail Lane, Bangalore, Karnataka',
      status: CustomerStatus.ACTIVE,
      notes: 'Prefers deliveries on Tuesday mornings.',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: 'Acme Distributors',
      mobile: '9876543211',
      email: 'contact@acmedist.com',
      businessName: 'Acme Distribution Pvt Ltd',
      gstNumber: '27BBBBB2222B2Z2',
      customerType: CustomerType.DISTRIBUTOR,
      address: '456 Hub Road, Mumbai, Maharashtra',
      status: CustomerStatus.ACTIVE,
      notes: 'Bulk purchaser of steel pipes.',
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      name: 'Sarah Smith',
      mobile: '9876543212',
      email: 'sarah@wholesale.com',
      businessName: 'Smith Wholesale Hub',
      customerType: CustomerType.WHOLESALE,
      address: '789 Market Street, Chennai, Tamil Nadu',
      status: CustomerStatus.LEAD,
      notes: 'Initial contact made. Interested in electrical switches.',
    },
  });

  console.log('Customers seeded successfully!');

  // 4. Create FollowUp Notes
  await prisma.followUp.create({
    data: {
      customerId: customer1.id,
      note: 'Called customer to check on satisfaction. They are happy with our service.',
      createdById: sales.id,
    },
  });

  await prisma.followUp.create({
    data: {
      customerId: customer3.id,
      note: 'Sent catalogue for switches and wiring.',
      createdById: sales.id,
    },
  });

  console.log('Follow-ups seeded successfully!');

  // 5. Create Sample Products
  const product1 = await prisma.product.create({
    data: {
      name: 'Steel Pipes',
      sku: 'ST-PIPE-001',
      category: 'Hardware',
      unitPrice: 150.0,
      currentStock: 100,
      minStockAlert: 20,
      location: 'Warehouse A - Aisle 3',
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: 'Copper Wiring 10m',
      sku: 'CP-WIRE-010',
      category: 'Electrical',
      unitPrice: 450.0,
      currentStock: 50,
      minStockAlert: 10,
      location: 'Warehouse A - Aisle 7',
    },
  });

  const product3 = await prisma.product.create({
    data: {
      name: 'Heavy Duty Bolts',
      sku: 'HD-BOLT-99',
      category: 'Hardware',
      unitPrice: 15.0,
      currentStock: 15,
      minStockAlert: 30, // Will trigger warning
      location: 'Warehouse B - Bin 12',
    },
  });

  const product4 = await prisma.product.create({
    data: {
      name: 'Electric Switches',
      sku: 'EL-SW-101',
      category: 'Electrical',
      unitPrice: 85.0,
      currentStock: 200,
      minStockAlert: 50,
      location: 'Warehouse A - Aisle 9',
    },
  });

  console.log('Products seeded successfully!');

  // 6. Create Initial Stock Movement Logs
  const products = [product1, product2, product3, product4];
  for (const product of products) {
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        quantityChanged: product.currentStock,
        movementType: MovementType.IN,
        reason: 'Initial stock intake upon setup',
        createdById: warehouse.id,
      },
    });
  }

  console.log('Stock movements logged successfully!');
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
