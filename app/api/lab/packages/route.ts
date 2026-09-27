import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getLabPackages, createLabPackage } from "@/services/lab/packages-service";

export async function GET(request: NextRequest) {
  try {
    const { labMembership } = await requireLabTenant();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") || undefined;
    const isActiveParam = searchParams.get("isActive");
    const isActive = isActiveParam !== null ? isActiveParam === "true" : undefined;

    const packages = await getLabPackages(labMembership.labId, { search, isActive });
    return NextResponse.json({ success: true, packages });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve packages." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, labMembership } = await requireLabTenant(PERMISSIONS.CATALOGUE_WRITE);
    const body = await request.json();

    const {
      name,
      slug,
      code,
      description,
      sellingPrice,
      mrpPrice,
      isHomeCollectionAvailable,
      fastingRequired,
      preparationInstructions,
      estimatedTatHours,
      testIds,
    } = body;

    if (!name || sellingPrice === undefined || !Array.isArray(testIds) || testIds.length === 0) {
      return NextResponse.json(
        { error: "name, sellingPrice, and at least one testId are required." },
        { status: 400 }
      );
    }

    const pkg = await createLabPackage(
      labMembership.labId,
      {
        name,
        slug,
        code,
        description,
        sellingPrice: Number(sellingPrice),
        mrpPrice: mrpPrice ? Number(mrpPrice) : undefined,
        isHomeCollectionAvailable,
        fastingRequired,
        preparationInstructions,
        estimatedTatHours: estimatedTatHours ? parseInt(estimatedTatHours) : undefined,
        testIds,
      },
      user.userId
    );

    return NextResponse.json({ success: true, package: pkg });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create health package." },
      { status: error.statusCode || 500 }
    );
  }
}
