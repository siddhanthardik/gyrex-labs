import { NextRequest, NextResponse } from "next/server";
import {
  authenticatePatientByPhone,
  getAuthenticatedPatient,
  PATIENT_SESSION_COOKIE,
  PATIENT_TOKEN_MAX_AGE,
} from "@/lib/auth/patient-auth";

/**
 * POST /api/patient/auth/session
 * Verifies or initializes a patient session by mobile number.
 * Sets secure HTTP-only cookie and returns patient profile and session token.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || !body.phone) {
      return NextResponse.json(
        { error: "Valid 10-digit mobile number is required." },
        { status: 400 }
      );
    }

    const { patient, token } = await authenticatePatientByPhone(body.phone, body.fullName);

    const response = NextResponse.json({
      success: true,
      patient,
      token,
    });

    response.cookies.set({
      name: PATIENT_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: PATIENT_TOKEN_MAX_AGE,
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Authentication failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * GET /api/patient/auth/session
 * Returns the currently active patient session, or null if unauthenticated.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthenticatedPatient(request);
    if (!session) {
      return NextResponse.json({ authenticated: false, session: null });
    }

    return NextResponse.json({
      authenticated: true,
      session,
    });
  } catch {
    return NextResponse.json({ authenticated: false, session: null });
  }
}
