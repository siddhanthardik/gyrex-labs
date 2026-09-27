import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getLabPaymentSettings, updateLabPaymentSettings } from "@/services/lab/payment-settings-service";

export async function GET() {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.PAYMENTS_READ);
    const settings = await getLabPaymentSettings(labMembership.labId);
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve payment settings." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, labMembership } = await requireLabTenant(PERMISSIONS.PAYMENTS_REFUND);
    const body = await request.json();

    const { razorpayKeyId, razorpayKeySecret, cashOnCollectionEnabled, upiDirectQrUrl } = body;

    const settings = await updateLabPaymentSettings(
      labMembership.labId,
      {
        razorpayKeyId,
        razorpayKeySecret,
        cashOnCollectionEnabled,
        upiDirectQrUrl,
      },
      user.userId
    );

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update payment settings." },
      { status: error.statusCode || 500 }
    );
  }
}
