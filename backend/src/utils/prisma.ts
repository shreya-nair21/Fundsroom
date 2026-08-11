import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const adapter = new PrismaMariaDb({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'fundsroom_erp',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

const prisma = new PrismaClient({ adapter });

export default prisma;
