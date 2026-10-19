import { NextRequest, NextResponse } from "next/server";
import {
  updatePatientAddress,
  deletePatientAddress,
} from "@/services/patient/patient-address-service";
import { getAuthenticatedPatient } from "@/lib/auth/patient-auth";

/**
 * PATCH /api/patient/addresses/[addressId]
 * Updates a saved address. Strictly checks that the address belongs to the authenticated patient.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ addressId: string }> }
) {
  try {
    const { addressId } = await params;
    const session = await getAuthenticatedPatient(request);

    if (!session) {
      return NextResponse.json(
        { error: "Authentication required to update saved addresses." },
        { status: 401 }
      );
    }

    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const updated = await updatePatientAddress(session.patientId, addressId, body);

    return NextResponse.json({ success: true, address: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update address.";
    const status = message.includes("Access Denied") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/patient/addresses/[addressId]
 * Deletes a saved address. Strictly checks that the address belongs to the authenticated patient.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ addressId: string }> }
) {
  try {
    const { addressId } = await params;
    const session = await getAuthenticatedPatient(request);

    if (!session) {
      return NextResponse.json(
        { error: "Authentication required to delete saved addresses." },
        { status: 401 }
      );
    }

    const result = await deletePatientAddress(session.patientId, addressId);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete address.";
    const status = message.includes("Access Denied") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
