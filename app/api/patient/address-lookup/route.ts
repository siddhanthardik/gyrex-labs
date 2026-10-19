import { NextRequest, NextResponse } from "next/server";
import {
  getAddressProviderStatus,
  searchAddress,
  reverseGeocodeCoordinates,
} from "@/services/integrations/geocoding/address-provider";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q");
    const latStr = request.nextUrl.searchParams.get("lat");
    const lngStr = request.nextUrl.searchParams.get("lng");

    const status = getAddressProviderStatus();

    // 1. Coordinates reverse geocoding
    if (latStr && lngStr) {
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (!isNaN(lat) && !isNaN(lng)) {
        const suggestion = await reverseGeocodeCoordinates(lat, lng);
        return NextResponse.json({
          success: true,
          status,
          suggestion,
        });
      }
    }

    // 2. Query text search
    if (query && query.trim().length >= 3) {
      const suggestions = await searchAddress(query.trim());
      return NextResponse.json({
        success: true,
        status,
        suggestions,
      });
    }

    return NextResponse.json({
      success: true,
      status,
      suggestions: [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Address lookup failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
