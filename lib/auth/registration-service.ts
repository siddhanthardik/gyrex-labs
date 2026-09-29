import crypto from "crypto";
import { prisma } from "../db/prisma";
import { hashPassword } from "./password";
import { UserRole, LabStatus } from "@prisma/client";
import { createSessionToken, setSessionCookie, SessionUser } from "./session";
import { emailService } from "@/services/integrations/email/email-service";
import { checkRateLimit } from "./rate-limiter";

export interface RegisterLaboratoryParams {
  ownerName: string;
  labName: string;
  email: string;
  phone: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RegisterLaboratoryResult {
  success: boolean;
  error?: string;
  statusCode?: number;
  email?: string;
  debugVerificationUrl?: string;
}

/**
 * Generates a collision-resistant unique slug for a new laboratory.
 */
async function generateUniqueLabSlug(labName: string): Promise<string> {
  const base = labName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "lab";

  let slug = base;
  let attempt = 0;

  while (attempt < 10) {
    const existing = await prisma.lab.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }

    attempt++;
    const suffix = crypto.randomBytes(2).toString("hex");
    slug = `${base}-${suffix}`;
  }

  return `${base}-${Date.now().toString(36)}`;
}

/**
 * Generates a unique short code for a new laboratory (e.g. "GYR-4821").
 */
async function generateUniqueLabCode(labName: string): Promise<string> {
  const prefix = labName
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 3)
    .toUpperCase() || "LAB";

  let attempt = 0;
  while (attempt < 10) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const code = `${prefix}-${randomSuffix}`;

    const existing = await prisma.lab.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
    attempt++;
  }

  return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
}

/**
 * Self-service registration service for laboratory owners.
 * Creates owner User, Lab record, LabUser membership, default settings,
 * and issues a single-use SHA-256 verification token.
 */
export async function registerLaboratoryOwner(
  params: RegisterLaboratoryParams
): Promise<RegisterLaboratoryResult> {
  const { ownerName, labName, email, phone, password } = params;

  // 1. Validation
  const trimmedName = ownerName?.trim();
  const trimmedLabName = labName?.trim();
  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedPhone = phone?.trim();

  if (!trimmedName || trimmedName.length < 2) {
    return { success: false, error: "Please enter your full name.", statusCode: 400 };
  }

  if (!trimmedLabName || trimmedLabName.length < 2) {
    return { success: false, error: "Please enter your laboratory or clinic name.", statusCode: 400 };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
    return { success: false, error: "Please provide a valid email address.", statusCode: 400 };
  }

  const phoneDigits = normalizedPhone?.replace(/\D/g, "");
  if (!phoneDigits || phoneDigits.length < 10 || phoneDigits.length > 15) {
    return { success: false, error: "Please provide a valid phone number (at least 10 digits).", statusCode: 400 };
  }

  if (!password || password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters long.", statusCode: 400 };
  }

  // 2. Check for existing user account
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, emailVerifiedAt: true },
  });

  if (existingUser) {
    return {
      success: false,
      error: "An account with this email address already exists. Please sign in or use a different email.",
      statusCode: 409,
    };
  }

  // 3. Generate identifiers and hashes
  const [slug, code, hashedPassword] = await Promise.all([
    generateUniqueLabSlug(trimmedLabName),
    generateUniqueLabCode(trimmedLabName),
    hashPassword(password),
  ]);

  const rawVerificationToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawVerificationToken).digest("hex");
  const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // 4. Atomic Transaction: User + Lab + LabUser + Settings + VerificationToken
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        fullName: trimmedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        passwordHash: hashedPassword,
        role: UserRole.LAB_OWNER,
        isActive: true,
        emailVerifiedAt: null,
      },
    });

    const lab = await tx.lab.create({
      data: {
        slug,
        name: trimmedLabName,
        code,
        email: normalizedEmail,
        phone: normalizedPhone,
        addressLine1: "Pending Address Setup",
        city: "Pending",
        state: "Pending",
        postalCode: "000000",
        country: "IN",
        status: LabStatus.PENDING_VERIFICATION,
        isVerified: false,
      },
    });

    await tx.labUser.create({
      data: {
        labId: lab.id,
        userId: user.id,
        role: UserRole.LAB_OWNER,
        permissions: ["*"],
        isActive: true,
      },
    });

    await tx.labStoreSettings.create({
      data: {
        labId: lab.id,
      },
    });

    await tx.labPaymentSettings.create({
      data: {
        labId: lab.id,
      },
    });

    await tx.emailVerificationToken.create({
      data: {
        userId: user.id,
        email: normalizedEmail,
        tokenHash,
        expiresAt: tokenExpiresAt,
      },
    });
  });

  // 5. Dispatch Verification Email
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const verificationUrl = `${appUrl}/lab/onboarding/verify?token=${rawVerificationToken}`;

  await emailService.send({
    to: normalizedEmail,
    subject: "Verify your email address - Gyrex Labs",
    templateId: "LAB_EMAIL_VERIFICATION",
    templateData: {
      ownerName: trimmedName,
      labName: trimmedLabName,
      verificationUrl,
    },
  });

  return {
    success: true,
    email: normalizedEmail,
    debugVerificationUrl: process.env.NODE_ENV !== "production" ? verificationUrl : undefined,
  };
}

export interface VerifyEmailResult {
  success: boolean;
  error?: string;
  code?: string;
  statusCode?: number;
  redirectUrl?: string;
}

/**
 * Validates a single-use verification token, marks user email verified,
 * and issues an authenticated session cookie.
 */
export async function verifyEmailToken(rawToken: string): Promise<VerifyEmailResult> {
  const token = rawToken?.trim();
  if (!token || token.length < 32) {
    return {
      success: false,
      error: "Invalid or malformed verification link.",
      code: "INVALID_TOKEN",
      statusCode: 400,
    };
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const tokenRecord = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          labUsers: {
            where: { isActive: true },
            include: {
              lab: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                  status: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!tokenRecord) {
    return {
      success: false,
      error: "Invalid verification link. Please check your email or request a new one.",
      code: "INVALID_TOKEN",
      statusCode: 400,
    };
  }

  if (tokenRecord.usedAt) {
    return {
      success: false,
      error: "This verification link has already been used. Please sign in to your account.",
      code: "ALREADY_USED",
      statusCode: 400,
    };
  }

  if (tokenRecord.expiresAt < new Date()) {
    return {
      success: false,
      error: "This verification link has expired. Please request a new verification email.",
      code: "EXPIRED",
      statusCode: 400,
    };
  }

  // Atomic update: mark token used and user verified
  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() },
    });

    await tx.user.update({
      where: { id: tokenRecord.userId },
      data: {
        emailVerifiedAt: new Date(),
      },
    });
  });

  // Issue authenticated session for the verified laboratory owner
  const user = tokenRecord.user;
  const primaryLab = user.labUsers[0]?.lab;

  const sessionUser: SessionUser = {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    labMemberships: user.labUsers.map((lu) => ({
      labId: lu.labId,
      slug: lu.lab.slug,
      name: lu.lab.name,
      role: lu.role,
      permissions: lu.permissions,
    })),
    activeLabId: primaryLab?.id || null,
  };

  const sessionToken = await createSessionToken(sessionUser);
  await setSessionCookie(sessionToken);

  return {
    success: true,
    redirectUrl: "/lab/onboarding/profile",
  };
}

export interface ResendVerificationResult {
  success: boolean;
  error?: string;
  code?: string;
  statusCode?: number;
  message?: string;
  debugVerificationUrl?: string;
}

/**
 * Resends a verification email with rate-limiting and 60-second cooldown protection.
 */
export async function resendVerificationEmail(
  email: string,
  ipAddress = "127.0.0.1"
): Promise<ResendVerificationResult> {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) {
    return { success: false, error: "Email address is required.", statusCode: 400 };
  }

  // 1. Sliding window rate limit
  const rateLimitKey = `resend:${ipAddress}:${normalizedEmail}`;
  const rateLimitStatus = checkRateLimit(rateLimitKey, { maxAttempts: 3, windowMs: 15 * 60 * 1000 });
  if (!rateLimitStatus.success) {
    return {
      success: false,
      error: `Too many requests. Please wait ${rateLimitStatus.retryAfterSeconds} seconds before trying again.`,
      statusCode: 429,
    };
  }

  // 2. 60-second cooldown check from database
  const recentToken = await prisma.emailVerificationToken.findFirst({
    where: {
      email: normalizedEmail,
      createdAt: { gt: new Date(Date.now() - 60 * 1000) },
    },
    select: { id: true, createdAt: true },
  });

  if (recentToken) {
    const elapsedSeconds = Math.floor((Date.now() - recentToken.createdAt.getTime()) / 1000);
    const waitSeconds = Math.max(1, 60 - elapsedSeconds);
    return {
      success: false,
      error: `Please wait ${waitSeconds} seconds before requesting another verification email.`,
      statusCode: 429,
    };
  }

  // 3. User lookup
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      labUsers: {
        where: { isActive: true },
        include: {
          lab: {
            select: { name: true },
          },
        },
      },
    },
  });

  // Generic success to prevent user enumeration
  if (!user) {
    return {
      success: true,
      message: "If an account exists with this email, a verification link has been sent.",
    };
  }

  if (user.emailVerifiedAt) {
    return {
      success: false,
      error: "This email address is already verified. Please sign in.",
      code: "ALREADY_VERIFIED",
      statusCode: 400,
    };
  }

  // 4. Invalidate older unused tokens and create a fresh 24h token
  const rawVerificationToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawVerificationToken).digest("hex");
  const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    await tx.emailVerificationToken.create({
      data: {
        userId: user.id,
        email: normalizedEmail,
        tokenHash,
        expiresAt: tokenExpiresAt,
      },
    });
  });

  // 5. Send Email
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const verificationUrl = `${appUrl}/lab/onboarding/verify?token=${rawVerificationToken}`;
  const labName = user.labUsers[0]?.lab.name || "your laboratory";

  await emailService.send({
    to: normalizedEmail,
    subject: "Verify your email address - Gyrex Labs",
    templateId: "LAB_EMAIL_VERIFICATION",
    templateData: {
      ownerName: user.fullName,
      labName,
      verificationUrl,
    },
  });

  return {
    success: true,
    message: "A new verification email has been sent.",
    debugVerificationUrl: process.env.NODE_ENV !== "production" ? verificationUrl : undefined,
  };
}
