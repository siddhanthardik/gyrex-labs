import { NextRequest, NextResponse } from "next/server";
import { requireLabAccess } from "@/lib/auth/context";
import { getLabPatients, getLabPatientDetail } from "@/services/lab/patients-service";

export async function GET(request: NextRequest) {
  try {
    const { labMembership } = await requireLabAccess();
    const { searchParams } = new URL(request.url);

    const labPatientId = searchParams.get("labPatientId");
    if (labPatientId) {
      const detail = await getLabPatientDetail(labMembership.labId, labPatientId);
      return NextResponse.json({ success: true, patient: detail });
    }

    const search = searchParams.get("search") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 20;

    const data = await getLabPatients(labMembership.labId, { search, page, limit });
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve patients." },
      { status: error.statusCode || 500 }
    );
  }
}
