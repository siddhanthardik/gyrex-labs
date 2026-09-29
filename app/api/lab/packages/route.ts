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

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Package name is required." },
        { status: 400 }
      );
    }

    if (sellingPrice === undefined || sellingPrice === null || isNaN(Number(sellingPrice))) {
      return NextResponse.json(
        { error: "Package selling price is required." },
        { status: 400 }
      );
    }

    const numericPrice = Number(sellingPrice);
    if (numericPrice <= 0) {
      return NextResponse.json(
        { error: "Package selling price must be greater than zero." },
        { status: 400 }
      );
    }

    if (!Array.isArray(testIds) || testIds.length === 0) {
      return NextResponse.json(
        { error: "At least one diagnostic test must be included in the package." },
        { status: 400 }
      );
    }

    const pkg = await createLabPackage(
      labMembership.labId,
      {
        name: name.trim(),
        slug,
        code: code?.trim(),
        description: description?.trim(),
        sellingPrice: numericPrice,
        mrpPrice: mrpPrice !== undefined && mrpPrice !== null && mrpPrice !== "" ? Number(mrpPrice) : undefined,
        isHomeCollectionAvailable: isHomeCollectionAvailable !== undefined ? Boolean(isHomeCollectionAvailable) : true,
        fastingRequired: fastingRequired !== undefined ? Boolean(fastingRequired) : undefined,
        preparationInstructions: preparationInstructions?.trim(),
        estimatedTatHours: estimatedTatHours ? parseInt(estimatedTatHours) : undefined,
        testIds,
      },
      user.userId
    );

    return NextResponse.json({ success: true, package: pkg }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create health package." },
      { status: error.statusCode || 400 }
    );
  }
}
