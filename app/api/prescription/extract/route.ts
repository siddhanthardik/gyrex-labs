import { NextRequest, NextResponse } from "next/server";
import { extractAndMatchPrescriptionTests } from "@/services/prescription/extraction-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { labId, testNames } = body;

    if (!labId) {
      return NextResponse.json({ error: "labId is required" }, { status: 400 });
    }

    const rawNames = Array.isArray(testNames) && testNames.length > 0
      ? testNames
      : ["Complete Blood Count (CBC)", "Liver Function Test", "Lipid Profile", "TSH"];

    const result = await extractAndMatchPrescriptionTests(labId, rawNames);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Prescription extraction route error:", error);
    return NextResponse.json(
      { error: "Failed to extract prescription tests." },
      { status: 500 }
    );
  }
}
