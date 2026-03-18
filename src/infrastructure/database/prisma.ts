import { PrismaClient } from "@prisma/client";
import { env } from "@/config/env";

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
  });

if (env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
