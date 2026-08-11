import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

let dbConfig: any = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'fundsroom_erp',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
};

// Auto-parse DATABASE_URL connection string if present (simplifies cloud hosting like Vercel)
if (process.env.DATABASE_URL) {
  try {
    const urlStr = process.env.DATABASE_URL;
    // Basic parsing to avoid URL object protocol issues for mysql:
    const regex = /mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/;
    const matches = urlStr.match(regex);
    if (matches) {
      dbConfig = {
        user: matches[1],
        password: decodeURIComponent(matches[2]),
        host: matches[3],
        port: Number(matches[4]),
        database: matches[5],
        // Automatically enable SSL for cloud mysql databases (like Aiven/PlanetScale)
        ssl: urlStr.includes('ssl-mode=') || urlStr.includes('ssl=') || process.env.DB_SSL === 'true' 
          ? { rejectUnauthorized: false } 
          : undefined
      };
    }
  } catch (e) {
    console.error('Error auto-parsing DATABASE_URL:', e);
  }
}

const adapter = new PrismaMariaDb(dbConfig);
const prisma = new PrismaClient({ adapter });

export default prisma;
