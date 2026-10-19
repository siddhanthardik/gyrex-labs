import { NextRequest, NextResponse } from "next/server";
import {
  getPatientSavedAddresses,
  savePatientAddress,
} from "@/services/patient/patient-address-service";
import {
  getAuthenticatedPatient,
  authenticatePatientByPhone,
  PATIENT_SESSION_COOKIE,
  PATIENT_TOKEN_MAX_AGE,
} from "@/lib/auth/patient-auth";

/**
 * GET /api/patient/addresses
 * Retrieves saved addresses strictly for the authenticated patient.
 * An unauthenticated request or a phone number query alone is rejected with 401.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthenticatedPatient(request);

    if (!session) {
      return NextResponse.json(
        {
          error: "Authentication required to access saved addresses.",
          requiresAuth: true,
        },
        { status: 401 }
      );
    }

    const addresses = await getPatientSavedAddresses(session.patientId);
    return NextResponse.json({ success: true, addresses });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load saved addresses.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * POST /api/patient/addresses
 * Creates or updates a saved address for the authenticated patient.
 * If unauthenticated but valid phone is provided, verifies patient and sets secure session token.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid address payload." }, { status: 400 });
    }

    let session = await getAuthenticatedPatient(request);
    let token: string | null = null;

    if (!session) {
      if (!body.phone) {
        return NextResponse.json(
          { error: "Authentication or valid patient contact number is required to save an address." },
          { status: 401 }
        );
      }
      const authResult = await authenticatePatientByPhone(body.phone, body.fullName);
      session = {
        patientId: authResult.patient.id,
        phone: authResult.patient.phone,
        fullName: authResult.patient.fullName,
      };
      token = authResult.token;
    }

    const saved = await savePatientAddress(session.patientId, body);

    const response = NextResponse.json({
      success: true,
      address: saved,
      patientToken: token,
    });

    if (token) {
      response.cookies.set({
        name: PATIENT_SESSION_COOKIE,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: PATIENT_TOKEN_MAX_AGE,
      });
    }

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save address.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
