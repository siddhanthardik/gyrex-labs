import { NextRequest, NextResponse } from "next/server";
import { resendVerificationEmail } from "@/lib/auth/registration-service";

export async function POST(request: NextRequest) {
  try {
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email address is required." },
        { status: 400 }
      );
    }

    const result = await resendVerificationEmail(email, ipAddress);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.statusCode || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message || "Verification email sent.",
      debugVerificationUrl: result.debugVerificationUrl,
    });
  } catch (error) {
    console.error("Resend verification route error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while resending verification email." },
      { status: 500 }
    );
  }
}
