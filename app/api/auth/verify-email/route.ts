import { NextRequest, NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/auth/registration-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Verification token is required.", code: "MISSING_TOKEN" },
        { status: 400 }
      );
    }

    const result = await verifyEmailToken(token);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.statusCode || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email verified successfully.",
      redirectUrl: result.redirectUrl || "/lab/onboarding/profile",
    });
  } catch (error) {
    console.error("Email verification route error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while verifying your email.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/lab/onboarding/verify?error=missing_token", request.url));
  }
  return NextResponse.redirect(new URL(`/lab/onboarding/verify?token=${encodeURIComponent(token)}`, request.url));
}
