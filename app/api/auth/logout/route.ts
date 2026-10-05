import { NextRequest, NextResponse } from "next/server";
import { logoutUser } from "@/lib/auth/login-service";

export async function POST(request: NextRequest) {
  try {
    await logoutUser();

    // If browser navigates directly or submits a form expecting HTML, redirect to /login
    const acceptHeader = request.headers.get("accept") || "";
    if (acceptHeader.includes("text/html") || !acceptHeader.includes("application/json")) {
      return NextResponse.redirect(new URL("/login", request.url), 303);
    }

    return NextResponse.json({
      success: true,
      message: "Successfully logged out.",
      redirectUrl: "/login",
    });
  } catch (error) {
    console.error("Logout route error:", error);
    return NextResponse.json(
      { error: "Failed to logout cleanly." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await logoutUser();
  } catch {
    // Ignore error on session clear
  }
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
