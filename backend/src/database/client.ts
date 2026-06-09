import { PrismaClient } from '@prisma/client';
import { config } from '../config/index.js';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: config.databaseUrl,
      },
    },
    log: config.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (config.nodeEnv !== 'production') {
  globalThis.prisma = prisma;
}
