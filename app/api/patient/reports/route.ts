import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedPatientReports } from "@/services/reports/patient-report-service";

export async function GET(request: NextRequest) {
  try {
    const orderNumber = request.nextUrl.searchParams.get("orderNumber");
    const phone = request.nextUrl.searchParams.get("phone");

    if (!orderNumber || !phone) {
      return NextResponse.json(
        { error: "Booking order number and registered phone number are required." },
        { status: 400 }
      );
    }

    const reports = await getAuthorizedPatientReports(orderNumber, phone);

    return NextResponse.json({
      success: true,
      reports,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to retrieve reports.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
