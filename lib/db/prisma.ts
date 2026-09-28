import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

try {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(".env");
  }
} catch {
  // Ignore error if already loaded
}

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

let connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/gyrex_labs?schema=public";

if (connectionString.includes("sslmode=require") && !connectionString.includes("uselibpqcompat")) {
  connectionString += (connectionString.includes("?") ? "&" : "?") + "uselibpqcompat=true";
}

const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
  });

// Handle idle connection drops gracefully so broken sockets are pruned
pool.on("error", (err) => {
  if (process.env.NODE_ENV === "development") {
    console.warn("Prisma pg pool connection notice (auto-recovering):", err.message);
  }
});

const adapter = new PrismaPg(pool, { schema: "public" });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}

export default prisma;
