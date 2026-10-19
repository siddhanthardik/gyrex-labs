import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const PATIENT_SESSION_COOKIE = "gyrex_patient_token";
export const PATIENT_TOKEN_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export interface PatientSession {
  patientId: string;
  phone: string;
  fullName?: string;
}

function getPatientSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || "gyrex-labs-development-fallback-secret-minimum-32-characters";
  return new TextEncoder().encode(secret);
}

/**
 * Creates and signs a secure JWT for an authenticated patient.
 */
export async function createPatientSessionToken(payload: PatientSession): Promise<string> {
  const secretKey = getPatientSecretKey();

  return new SignJWT({
    sub: payload.patientId,
    phone: payload.phone,
    fullName: payload.fullName || "",
    type: "patient_session",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PATIENT_TOKEN_MAX_AGE}s`)
    .sign(secretKey);
}

/**
 * Verifies a patient token and returns the session if valid.
 */
export async function verifyPatientSessionToken(token: string): Promise<PatientSession | null> {
  if (!token || typeof token !== "string") return null;

  try {
    const secretKey = getPatientSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    if (!payload.sub || typeof payload.sub !== "string") {
      return null;
    }

    if (payload.type !== "patient_session") {
      return null;
    }

    return {
      patientId: payload.sub,
      phone: (payload.phone as string) || "",
      fullName: (payload.fullName as string) || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies patient session from an incoming Next.js request.
 * Checks Authorization header (Bearer token) first, then secure HTTP-only cookie.
 */
export async function getAuthenticatedPatient(request: NextRequest): Promise<PatientSession | null> {
  // 1. Check Authorization: Bearer <token>
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    const session = await verifyPatientSessionToken(token);
    if (session) return session;
  }

  // 2. Check X-Patient-Token header
  const customHeader = request.headers.get("x-patient-token");
  if (customHeader) {
    const session = await verifyPatientSessionToken(customHeader.trim());
    if (session) return session;
  }

  // 3. Check Cookies
  try {
    const cookieToken = request.cookies.get(PATIENT_SESSION_COOKIE)?.value;
    if (cookieToken) {
      const session = await verifyPatientSessionToken(cookieToken);
      if (session) return session;
    }
  } catch {
    // Graceful fallback
  }

  return null;
}

/**
 * Resolves or verifies a patient by phone number and returns a valid session token.
 */
export async function authenticatePatientByPhone(phone: string, fullName?: string): Promise<{
  patient: { id: string; phone: string; fullName: string };
  token: string;
}> {
  const cleanPhone = phone.trim();
  const digits = cleanPhone.replace(/\D/g, "");
  if (digits.length < 10) {
    throw new Error("A valid 10-digit Indian mobile number is required.");
  }

  let patient = await prisma.patient.findFirst({
    where: {
      phone: { contains: digits.slice(-10) },
    },
  });

  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        fullName: fullName?.trim() || "Patient",
        phone: cleanPhone,
      },
    });
  } else if (fullName && fullName.trim() && patient.fullName === "Patient") {
    patient = await prisma.patient.update({
      where: { id: patient.id },
      data: { fullName: fullName.trim() },
    });
  }

  const token = await createPatientSessionToken({
    patientId: patient.id,
    phone: patient.phone,
    fullName: patient.fullName,
  });

  return {
    patient: {
      id: patient.id,
      phone: patient.phone,
      fullName: patient.fullName,
    },
    token,
  };
}
