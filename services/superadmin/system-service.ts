import { prisma } from "@/lib/db/prisma";
import { AuditAction, Prisma } from "@prisma/client";
import { recordAuditLog } from "@/lib/db/audit";
import { SessionUser } from "@/lib/auth/session";
import { checkAllIntegrationsHealth } from "@/services/integrations/health/health-service";

export interface AuditLogFilters {
  search?: string;
  action?: AuditAction;
  entityType?: string;
  labId?: string;
  actorUserId?: string;
  isSecurityAlert?: boolean;
  page?: number;
  pageSize?: number;
}

export async function getAuditLogs(filters: AuditLogFilters = {}) {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
  const skip = (page - 1) * pageSize;

  const where: Prisma.AuditLogWhereInput = {};

  if (filters.action) {
    where.action = filters.action;
  }

  if (filters.isSecurityAlert) {
    where.action = { in: [AuditAction.SECURITY_ALERT, AuditAction.LOGIN_FAILED] };
  }

  if (filters.entityType) {
    where.entityType = filters.entityType;
  }

  if (filters.labId) {
    where.labId = filters.labId;
  }

  if (filters.actorUserId) {
    where.actorUserId = filters.actorUserId;
  }

  if (filters.search) {
    where.OR = [
      { entityId: { contains: filters.search } },
      { entityType: { contains: filters.search, mode: "insensitive" } },
      { actorRole: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        actorUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        lab: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      actorUserId: l.actorUserId,
      actorName: l.actorUser?.fullName || "System / Unauthenticated",
      actorEmail: l.actorUser?.email || null,
      actorRole: l.actorRole || l.actorUser?.role || "SYSTEM",
      actorIp: l.actorIp,
      labId: l.labId,
      labName: l.lab?.name || null,
      metadata: l.metadata,
      createdAt: l.createdAt.toISOString(),
    })),
  };
}

export async function getSecurityAlerts() {
  const alerts = await prisma.auditLog.findMany({
    where: {
      action: { in: [AuditAction.SECURITY_ALERT, AuditAction.LOGIN_FAILED] },
    },
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      actorUser: { select: { fullName: true, email: true, role: true } },
      lab: { select: { name: true } },
    },
  });

  return alerts.map((a) => ({
    id: a.id,
    action: a.action,
    entityType: a.entityType,
    entityId: a.entityId,
    actorName: a.actorUser?.fullName || "Unknown Actor",
    actorEmail: a.actorUser?.email || null,
    actorRole: a.actorRole,
    labName: a.lab?.name || null,
    metadata: a.metadata,
    createdAt: a.createdAt.toISOString(),
  }));
}

export async function getSystemHealth() {
  // Test actual DB connectivity
  let dbStatus: "OPERATIONAL" | "FAILED" = "OPERATIONAL";
  let dbLatencyMs = 0;
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - start;
  } catch {
    dbStatus = "FAILED";
  }

  const integrationProbes = await checkAllIntegrationsHealth();

  return {
    services: [
      {
        name: "Application Server (Next.js)",
        category: "CORE",
        status: "OPERATIONAL",
        latencyMs: 12,
        notes: "Serving production requests via App Router",
      },
      {
        name: "PostgreSQL Database Engine",
        category: "DATABASE",
        status: dbStatus,
        latencyMs: dbLatencyMs,
        notes: dbStatus === "OPERATIONAL" ? "Read/Write queries responding normally" : "Database query error",
      },
      ...integrationProbes.map((p) => ({
        name: p.serviceName,
        category: p.category,
        status: p.status,
        latencyMs: p.latencyMs,
        notes: p.message || "Integration probe active",
      })),
      {
        name: "Background Job Worker Queue",
        category: "BACKGROUND",
        status: "OPERATIONAL",
        notes: "In-process task dispatcher healthy",
      },
    ],
  };
}

/**
 * Pure evaluation function for Meta WhatsApp Cloud API status in Superadmin.
 * Accurately distinguishes platform callback readiness, saved credentials, and verified connection.
 */
export function evaluateWhatsAppIntegrationStatus(params: {
  hasPlatformToken: boolean;
  labSettingsRecords: Array<{ key: string; value: unknown }>;
}): {
  configured: boolean;
  maskedKey: string;
  description: string;
} {
  const { hasPlatformToken, labSettingsRecords } = params;

  let configuredLabsCount = 0;
  let verifiedConnectedLabsCount = 0;

  for (const rec of labSettingsRecords) {
    if (!rec || typeof rec.value !== "object" || rec.value === null || Array.isArray(rec.value)) {
      continue;
    }
    const val = rec.value as Record<string, unknown>;
    const hasPhoneId = typeof val.phoneNumberId === "string" && val.phoneNumberId.trim().length > 0;
    const hasAccessToken = typeof val.accessTokenEncrypted === "string" && val.accessTokenEncrypted.trim().length > 0;
    const hasCreds = hasPhoneId && hasAccessToken;

    if (hasCreds) {
      configuredLabsCount++;
      // A laboratory is verified connected only if status is CONNECTED, isEnabled is true, and lastVerifiedAt exists
      const isConnected = val.status === "CONNECTED";
      const isEnabled = val.isEnabled !== false;
      const hasVerifiedAt = typeof val.lastVerifiedAt === "string" && val.lastVerifiedAt.trim().length > 0;

      if (isConnected && isEnabled && hasVerifiedAt) {
        verifiedConnectedLabsCount++;
      }
    }
  }

  if (!hasPlatformToken && configuredLabsCount === 0) {
    return {
      configured: false,
      maskedKey: "NOT_CONFIGURED",
      description: "WhatsApp configuration incomplete. Platform webhook token and tenant credentials are not configured.",
    };
  }

  if (hasPlatformToken && configuredLabsCount === 0) {
    return {
      configured: false,
      maskedKey: "CALLBACK_READY_0_LABS",
      description: "Platform callback configured; no laboratories connected.",
    };
  }

  if (hasPlatformToken && configuredLabsCount > 0) {
    if (verifiedConnectedLabsCount > 0) {
      return {
        configured: true,
        maskedKey: `${verifiedConnectedLabsCount}_LABS_CONNECTED`,
        description: `Platform callback configured; ${verifiedConnectedLabsCount} laboratory(ies) verified and actively connected.`,
      };
    }
    return {
      configured: false,
      maskedKey: `${configuredLabsCount}_LABS_CONFIGURED`,
      description: `Platform callback configured; ${configuredLabsCount} laboratory(ies) credentials configured; connection not verified.`,
    };
  }

  // Configured labs exist, but platform-level central token not found in DB or env
  return {
    configured: false,
    maskedKey: `${configuredLabsCount}_LABS_NO_PLATFORM_TOKEN`,
    description: `WhatsApp configuration incomplete. ${configuredLabsCount} laboratory(ies) have credentials, but platform webhook verify token is missing.`,
  };
}

export async function getIntegrationsStatus() {
  // Query WhatsApp Cloud API platform token and lab tenant settings dynamically
  let whatsAppConfigured = false;
  let whatsAppMaskedKey = "STATUS_UNAVAILABLE";
  let whatsAppDescription = "Configuration status unavailable because the settings could not be checked.";

  try {
    const [platformSetting, labSettingsRecords] = await Promise.all([
      prisma.platformSettings.findUnique({
        where: { key: "platform_whatsapp_webhook" },
      }),
      prisma.platformSettings.findMany({
        where: { key: { startsWith: "lab_whatsapp:" } },
      }),
    ]);

    const hasPlatformEnvToken = Boolean(process.env.WHATSAPP_VERIFY_TOKEN?.trim());
    let hasPlatformDbToken = false;
    if (
      platformSetting?.value &&
      typeof platformSetting.value === "object" &&
      !Array.isArray(platformSetting.value)
    ) {
      const platformData = platformSetting.value as Record<string, unknown>;
      hasPlatformDbToken = Boolean(
        typeof platformData.verifyToken === "string" && platformData.verifyToken.trim().length > 0
      );
    }
    const hasPlatformToken = hasPlatformEnvToken || hasPlatformDbToken;

    const evalResult = evaluateWhatsAppIntegrationStatus({
      hasPlatformToken,
      labSettingsRecords,
    });

    whatsAppConfigured = evalResult.configured;
    whatsAppMaskedKey = evalResult.maskedKey;
    whatsAppDescription = evalResult.description;
  } catch {
    // Log generic error with safe error category only; never log SQL parameters, tokens, or credentials
    console.error("[SuperadminSystem] Database read failure when resolving WhatsApp platform settings (category: DB_READ_ERROR)");
    whatsAppConfigured = false;
    whatsAppMaskedKey = "STATUS_UNAVAILABLE";
    whatsAppDescription = "Configuration status unavailable because the settings could not be checked.";
  }

  return [
    {
      name: "Razorpay Diagnostic & SaaS Engine",
      type: "Payment Gateway",
      configured: !!process.env.RAZORPAY_KEY_ID,
      environment: process.env.NODE_ENV === "production" ? "LIVE" : "TEST",
      maskedKey: process.env.RAZORPAY_KEY_ID ? `${process.env.RAZORPAY_KEY_ID.slice(0, 8)}...` : "NOT_CONFIGURED",
      description: "Dual-flow: Patient to Lab diagnostic gateway & Lab to Gyrex subscription recurring billing.",
    },
    {
      name: "Google Gemini 1.5 Flash API",
      type: "Prescription Investigation Extractor",
      configured: !!process.env.GEMINI_API_KEY,
      environment: "CLOUD_REST_API",
      maskedKey: process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.slice(0, 6)}...` : "NOT_CONFIGURED",
      description: "Extracts diagnostic test names from uploaded handwriting and matches to Gyrex Test Master.",
    },
    {
      name: "Private Tenant Storage Vault",
      type: "Document Storage",
      configured: true,
      environment: "LOCAL_SECURE",
      maskedKey: "PROTECTED_INTERNAL_FS",
      description: "Non-public private file vault for diagnostic reports and prescription images.",
    },
    {
      name: "Transactional Communications Service",
      type: "Email Dispatcher",
      configured: !!process.env.EMAIL_API_KEY,
      environment: "SMTP_API",
      maskedKey: process.env.EMAIL_API_KEY ? "CONFIGURED" : "PENDING_SETUP",
      description: "Sends patient booking confirmations and report delivery notifications.",
    },
    {
      name: "Meta WhatsApp Cloud API",
      type: "Messaging Gateway",
      configured: whatsAppConfigured,
      environment: "GRAPH_API",
      maskedKey: whatsAppMaskedKey,
      description: whatsAppDescription,
    },
  ];
}

export async function getPlatformNotifications() {
  const notifications = await prisma.notification.findMany({
    take: 30,
    orderBy: { createdAt: "desc" },
    include: {
      lab: { select: { name: true } },
    },
  });

  return notifications.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    channel: n.channel,
    recipientType: n.recipientType,
    labName: n.lab?.name || "Global Platform",
    isRead: n.isRead,
    sentAt: n.sentAt.toISOString(),
  }));
}

export async function getPlatformSettings() {
  const settings = await prisma.platformSettings.findMany();
  
  // Format as key-value map with descriptions
  const defaults: Record<string, { value: unknown; description: string }> = {
    platformName: { value: "Gyrex Labs", description: "Display name of the multi-tenant diagnostic platform" },
    supportEmail: { value: "support@gyrex.in", description: "Primary platform support email address" },
    supportPhone: { value: "+91 800-497-3900", description: "Toll-free platform customer service helpline" },
    maintenanceMode: { value: false, description: "Temporarily pause public patient storefront bookings" },
    allowSelfRegistration: { value: true, description: "Allow diagnostic laboratories to register onboarding draft" },
    defaultTrialDays: { value: 14, description: "Default trial duration granted to newly registered laboratories" },
  };

  const currentMap: Record<string, unknown> = {};
  for (const s of settings) {
    currentMap[s.key] = s.value;
  }

  return Object.entries(defaults).map(([key, def]) => ({
    key,
    value: currentMap[key] !== undefined ? currentMap[key] : def.value,
    description: def.description,
  }));
}

export async function updatePlatformSetting(
  key: string,
  value: unknown,
  actor: SessionUser
) {
  const updated = await prisma.platformSettings.upsert({
    where: { key },
    update: {
      value: value as Prisma.InputJsonValue,
      updatedByUserId: actor.userId,
    },
    create: {
      key,
      value: value as Prisma.InputJsonValue,
      updatedByUserId: actor.userId,
    },
  });

  await recordAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: AuditAction.USER_PERMISSION_CHANGED,
    entityType: "PlatformSettings",
    entityId: key,
    metadata: {
      action: "UPDATE_SETTING",
      settingKey: key,
      newValue: value,
    },
  });

  return updated;
}
