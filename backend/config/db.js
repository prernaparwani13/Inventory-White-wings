import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

let prismaInstance;
if (!global.__prisma) {
  global.__prisma = new PrismaClient();
}
prismaInstance = global.__prisma;

export const prisma = prismaInstance;

export const connectDB = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL environment variable is missing from configuration.');
      process.exit(1);
    }

    await prisma.$connect();
    console.log('Database connected successfully via Prisma.');
  } catch (error) {
    console.error(`Database connection notice/error: ${error.message}`);
  }
};

export const disconnectDB = async () => {
  try {
    await prisma.$disconnect();
    console.log('Database disconnected.');
  } catch (error) {
    console.error(`Database disconnection error: ${error.message}`);
  }
};

export default prisma;
