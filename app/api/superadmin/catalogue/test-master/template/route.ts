import { NextRequest, NextResponse } from "next/server";
import { requireSuperadminApi } from "@/lib/auth/superadmin-auth";
import { generateTestMasterTemplate } from "@/services/superadmin/testmaster-import-service";

export async function GET(req: NextRequest) {
  try {
    // Requires platform superadmin access with catalogue read permission
    await requireSuperadminApi("catalogue.read");

    const searchParams = req.nextUrl.searchParams;
    const formatParam = searchParams.get("format")?.toLowerCase();
    const format = formatParam === "csv" ? "csv" : "xlsx";

    const { data, contentType, filename } = await generateTestMasterTemplate(format);

    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Failed to generate Test Master template." },
      { status: err.statusCode || 500 }
    );
  }
}
