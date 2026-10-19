import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import fs from "fs/promises";
import path from "path";

const NABL_CERT_DIR = path.join(process.cwd(), "storage", "compliance", "nabl");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { labMembership } = await requireLabTenant();
    const { filename } = await params;

    const sanitizedLabId = labMembership.labId.replace(/[^a-zA-Z0-9]/g, "");

    // Strict filename format and tenant isolation
    if (
      !filename ||
      !filename.startsWith(`cert-${sanitizedLabId}-`) ||
      !/^cert-[a-zA-Z0-9_-]+\.(pdf|png|jpg|jpeg)$/.test(filename)
    ) {
      return NextResponse.json({ error: "Access denied or invalid certificate." }, { status: 403 });
    }

    const fullPath = path.resolve(NABL_CERT_DIR, filename);

    // Defense-in-depth: Ensure path is within NABL_CERT_DIR
    if (!fullPath.startsWith(NABL_CERT_DIR + path.sep)) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const ext = path.extname(filename).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".pdf") contentType = "application/pdf";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";

    const fileBuffer = await fs.readFile(fullPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return NextResponse.json({ error: "Certificate file not found." }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || "Unable to retrieve certificate." },
      { status: error.statusCode || 500 }
    );
  }
}
