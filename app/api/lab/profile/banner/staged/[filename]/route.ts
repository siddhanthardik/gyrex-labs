import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import fs from "fs/promises";
import path from "path";

const STAGED_DIR = path.join(process.cwd(), "storage", "branding", "staged");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { labMembership } = await requireLabTenant();
    const { filename } = await params;

    const sanitizedLabId = labMembership.labId.replace(/[^a-zA-Z0-9]/g, "");

    // Strict filename check and tenant ownership enforcement
    if (
      !filename ||
      !filename.startsWith(`staged-${sanitizedLabId}-`) ||
      !/^staged-[a-zA-Z0-9]+-[a-zA-Z0-9]+-\d+\.(png|jpg|jpeg|webp)$/.test(filename)
    ) {
      return NextResponse.json({ error: "Access denied or invalid staged banner." }, { status: 403 });
    }

    const fullPath = path.resolve(STAGED_DIR, filename);

    // Defense-in-depth: Ensure resolved path stays strictly within STAGED_DIR
    if (!fullPath.startsWith(STAGED_DIR + path.sep)) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const ext = path.extname(filename).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".png") contentType = "image/png";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".webp") contentType = "image/webp";

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
      return NextResponse.json({ error: "Staged banner not found or expired." }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || "Unable to retrieve staged banner." },
      { status: error.statusCode || 500 }
    );
  }
}
