import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Prevent instantiation if DATABASE_URL is missing (e.g. during build)
const prismaClientSingleton = () => {
    if (!process.env.DATABASE_URL) {
        return undefined as unknown as PrismaClient;
    }
    return new PrismaClient();
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
