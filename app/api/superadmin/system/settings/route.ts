import { NextRequest, NextResponse } from "next/server";
import { requireSuperadminApi } from "@/lib/auth/superadmin-auth";
import { getPlatformSettings, updatePlatformSetting } from "@/services/superadmin/system-service";

export async function GET() {
  try {
    await requireSuperadminApi("system.manage");
    const settings = await getPlatformSettings();
    return NextResponse.json({ settings });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Unable to fetch platform settings." },
      { status: err.statusCode || 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = await requireSuperadminApi("system.manage");
    const body = await req.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: "key and value are required." }, { status: 400 });
    }

    const updated = await updatePlatformSetting(key, value, actor);
    return NextResponse.json({ success: true, setting: updated });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Failed to update platform setting." },
      { status: err.statusCode || 500 }
    );
  }
}
