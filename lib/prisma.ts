import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

let prisma: PrismaClient;

const getConnectionString = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL no está configurada en las variables de entorno.");
  }
  // El driver de MariaDB requiere que la URL empiece con mariadb://
  return url.replace(/^mysql:\/\//, "mariadb://");
};

if (process.env.NODE_ENV === "production") {
  const url = getConnectionString();
  const adapter = new PrismaMariaDb(url);
  prisma = new PrismaClient({ adapter });
} else {
  const globalForPrisma = global as unknown as { prisma?: PrismaClient };
  if (!globalForPrisma.prisma) {
    const url = getConnectionString();
    const adapter = new PrismaMariaDb(url);
    globalForPrisma.prisma = new PrismaClient({
      adapter,
      log: ["query", "error", "warn"],
    });
  }
  prisma = globalForPrisma.prisma;
}

export { prisma };
