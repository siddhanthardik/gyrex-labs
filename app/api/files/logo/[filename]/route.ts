import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const LOGOS_DIR = path.join(process.cwd(), "storage", "branding", "logos");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Strict filename check to prevent directory traversal
    if (!filename || !/^[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/.test(filename)) {
      return NextResponse.json({ error: "Invalid logo filename." }, { status: 400 });
    }

    const fullPath = path.resolve(LOGOS_DIR, filename);

    // Defense-in-depth: Ensure resolved path stays within LOGOS_DIR
    if (!fullPath.startsWith(LOGOS_DIR + path.sep)) {
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
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return NextResponse.json({ error: "Logo not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Unable to retrieve logo." }, { status: 500 });
  }
}
