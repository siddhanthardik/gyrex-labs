import { NextRequest, NextResponse } from "next/server";
import { logoutUser } from "@/lib/auth/login-service";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

function getPublicOrigin(request: NextRequest): string {
  // Use forwarded headers if behind reverse proxy, or NEXT_PUBLIC_APP_URL, or request origin
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");

  if (forwardedHost && !forwardedHost.startsWith("127.0.0.1") && !forwardedHost.startsWith("localhost")) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  return "https://labs.gyrex.in";
}

function applyClearCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}

export async function POST(request: NextRequest) {
  try {
    await logoutUser();

    // Check if the request is an explicit programmatic request or an HTML form post
    const acceptHeader = request.headers.get("accept") || "";
    const isHtmlNavigation =
      acceptHeader.includes("text/html") && !acceptHeader.includes("application/json");

    if (isHtmlNavigation) {
      const publicOrigin = getPublicOrigin(request);
      const redirectUrl = new URL("/", publicOrigin);
      const response = NextResponse.redirect(redirectUrl, 303);
      return applyClearCookie(response);
    }

    const response = NextResponse.json({
      success: true,
      message: "Successfully logged out.",
      redirectUrl: "/",
    });
    return applyClearCookie(response);
  } catch (error) {
    console.error("Logout route error:", error);
    const response = NextResponse.json(
      { error: "Failed to logout cleanly." },
      { status: 500 }
    );
    return applyClearCookie(response);
  }
}

export async function GET(request: NextRequest) {
  try {
    await logoutUser();
  } catch {
    // Ignore error on session clear
  }
  const publicOrigin = getPublicOrigin(request);
  const redirectUrl = new URL("/", publicOrigin);
  const response = NextResponse.redirect(redirectUrl, 303);
  return applyClearCookie(response);
}

