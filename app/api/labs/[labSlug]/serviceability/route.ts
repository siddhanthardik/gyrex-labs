import { NextRequest, NextResponse } from "next/server";
import { checkHomeCollectionServiceability } from "@/services/orders/serviceability-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ labSlug: string }> }
) {
  try {
    const { labSlug } = await params;
    const pincode = request.nextUrl.searchParams.get("pincode");

    if (!pincode || !pincode.trim()) {
      return NextResponse.json(
        {
          serviceable: false,
          error: "Query parameter 'pincode' is required.",
        },
        { status: 400 }
      );
    }

    const subtotalParam = request.nextUrl.searchParams.get("subtotal");
    const subtotal = subtotalParam ? parseFloat(subtotalParam) : undefined;

    const result = await checkHomeCollectionServiceability(labSlug, pincode.trim(), subtotal);

    return NextResponse.json({
      success: true,
      isServiceable: result.serviceable,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        serviceable: false,
        error: error.message || "Failed to evaluate serviceability.",
      },
      { status: 500 }
    );
  }
}
