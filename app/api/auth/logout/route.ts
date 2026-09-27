import { NextResponse } from "next/server";
import { logoutUser } from "@/lib/auth/login-service";

export async function POST() {
  try {
    await logoutUser();
    return NextResponse.json({
      success: true,
      message: "Successfully logged out.",
    });
  } catch (error) {
    console.error("Logout route error:", error);
    return NextResponse.json(
      { error: "Failed to logout cleanly." },
      { status: 500 }
    );
  }
}
