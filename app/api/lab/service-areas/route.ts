import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  getLabServiceAreas,
  addPincodeCoverage,
  bulkAddPincodes,
} from "@/services/lab/service-area-service";

export async function GET(request: NextRequest) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.LABS_READ);
    const labId = labMembership.labId;

    const branchId = request.nextUrl.searchParams.get("branchId");
    const areas = await getLabServiceAreas(labId, branchId);

    return NextResponse.json({
      success: true,
      serviceAreas: areas,
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json(
      { error: error.message || "Failed to retrieve service areas." },
      { status }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.LABS_UPDATE);
    const labId = labMembership.labId;

    const body = await request.json();

    // Check if bulk import or single item
    if (Array.isArray(body.pincodes)) {
      if (body.pincodes.length === 0) {
        return NextResponse.json(
          { error: "At least one PIN code must be provided." },
          { status: 400 }
        );
      }
      const result = await bulkAddPincodes(labId, {
        pincodes: body.pincodes,
        branchId: body.branchId || null,
      });
      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    if (!body.pincode) {
      return NextResponse.json(
        { error: "PIN code is required." },
        { status: 400 }
      );
    }

    const created = await addPincodeCoverage(labId, {
      pincode: body.pincode,
      localityName: body.localityName || null,
      branchId: body.branchId || null,
    });

    return NextResponse.json({
      success: true,
      serviceArea: {
        id: created.id,
        pincode: created.pincode,
        localityName: created.localityName,
        branchId: created.branchId,
        isActive: created.isActive,
      },
    });
  } catch (error: any) {
    const status = error.statusCode || 400;
    return NextResponse.json(
      { error: error.message || "Failed to save service area." },
      { status }
    );
  }
}
