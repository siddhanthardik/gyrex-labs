import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { validateEnvironment } from "@/lib/config/env-validation";

/**
 * Public Health Check Endpoint: /api/health
 *
 * Verifies:
 * 1. Application runtime process is alive.
 * 2. PostgreSQL database connection is operational.
 * 3. Environment configuration status.
 *
 * SAFETY INVARIANT:
 * NEVER exposes database connection strings, credentials, or secret values.
 */
export async function GET() {
  const startTime = Date.now();
  let dbStatus = "unknown";
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    // Simple lightweight query to verify DB connection
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = "healthy";
  } catch (error: any) {
    dbStatus = "unhealthy";
    console.error("Health check database query failed:", error?.message || "Unknown error");
  }

  const envCheck = validateEnvironment();

  const isHealthy = dbStatus === "healthy" && envCheck.valid;
  const statusCode = isHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      service: "gyrex-labs",
      version: "0.1.0",
      uptimeSeconds: Math.floor(process.uptime()),
      checks: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
        environment: {
          status: envCheck.valid ? "valid" : "invalid",
          warningCount: envCheck.warnings.length,
          errorCount: envCheck.errors.length,
        },
      },
      responseTimeMs: Date.now() - startTime,
    },
    {
      status: statusCode,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    }
  );
}
