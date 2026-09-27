import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/lib/auth/login-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await loginUser({
      email,
      password,
      ipAddress,
      userAgent,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode || 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      redirectUrl: result.redirectUrl,
    });
  } catch (error) {
    console.error("Login route error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during authentication." },
      { status: 500 }
    );
  }
}
