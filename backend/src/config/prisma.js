const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prismaGlobal = global;

const prisma = prismaGlobal.prisma || new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
  ],
});

if (process.env.NODE_ENV !== 'production') {
  prismaGlobal.prisma = prisma;
}

prisma.$on('error', (e) => logger.error(`Prisma Error: ${e.message}`));
prisma.$on('warn', (e) => logger.warn(`Prisma Warn: ${e.message}`));
prisma.$on('info', (e) => logger.info(`Prisma Info: ${e.message}`));

module.exports = prisma;
