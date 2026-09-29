import { NextRequest, NextResponse } from "next/server";
import { registerLaboratoryOwner } from "@/lib/auth/registration-service";
import { checkRateLimit } from "@/lib/auth/rate-limiter";

export async function POST(request: NextRequest) {
  try {
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || undefined;

    // Rate limit: maximum 5 registration attempts per 15 minutes per IP
    const rateLimit = checkRateLimit(`register:${ipAddress}`, {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: `Too many registration attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { ownerName, labName, email, phone, password, termsAccepted } = body;

    if (!termsAccepted) {
      return NextResponse.json(
        { error: "You must accept the Terms of Service and Privacy Policy to register." },
        { status: 400 }
      );
    }

    const result = await registerLaboratoryOwner({
      ownerName,
      labName,
      email,
      phone,
      password,
      ipAddress,
      userAgent,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      email: result.email,
      message: "Laboratory account created successfully. Please check your email to verify your account.",
      debugVerificationUrl: result.debugVerificationUrl,
    });
  } catch (error) {
    console.error("Registration route error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while creating your account." },
      { status: 500 }
    );
  }
}
