import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getLabTests, addTestMasterToLab } from "@/services/lab/catalogue-service";

export async function GET(request: NextRequest) {
  try {
    const { labMembership } = await requireLabTenant();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const isActiveParam = searchParams.get("isActive");
    const isActive = isActiveParam !== null ? isActiveParam === "true" : undefined;
    const minPriceParam = searchParams.get("minPrice");
    const minPrice = minPriceParam ? parseFloat(minPriceParam) : undefined;
    const maxPriceParam = searchParams.get("maxPrice");
    const maxPrice = maxPriceParam ? parseFloat(maxPriceParam) : undefined;

    const tests = await getLabTests(labMembership.labId, {
      search,
      categoryId,
      isActive,
      minPrice,
      maxPrice,
    });

    return NextResponse.json({ success: true, tests });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve tests." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, labMembership } = await requireLabTenant(PERMISSIONS.CATALOGUE_WRITE);
    const body = await request.json();

    const { masterTestId, sellingPrice, mrpPrice, isHomeCollectionAvailable, customTatHours, customPreparation } = body;

    if (!masterTestId || sellingPrice === undefined) {
      return NextResponse.json(
        { error: "masterTestId and sellingPrice are required." },
        { status: 400 }
      );
    }

    const test = await addTestMasterToLab(
      labMembership.labId,
      {
        masterTestId,
        sellingPrice: Number(sellingPrice),
        mrpPrice: mrpPrice ? Number(mrpPrice) : undefined,
        isHomeCollectionAvailable,
        customTatHours: customTatHours ? parseInt(customTatHours) : undefined,
        customPreparation,
      },
      user.userId
    );

    return NextResponse.json({ success: true, test });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to add test to catalogue." },
      { status: error.statusCode || 500 }
    );
  }
}
