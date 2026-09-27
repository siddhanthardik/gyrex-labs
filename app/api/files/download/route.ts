import { NextRequest, NextResponse } from "next/server";
import { fileStorageService } from "@/services/integrations/storage/storage-service";
import path from "path";
import fs from "fs/promises";

/**
 * Secure file download route for signed URLs.
 * Validates HMAC token, expiry timestamp, and path integrity.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storagePath = searchParams.get("path");
    const expires = parseInt(searchParams.get("expires") || "0", 10);
    const token = searchParams.get("token");

    if (!storagePath || !expires || !token) {
      return NextResponse.json(
        { error: "Invalid or incomplete signed download URL parameters." },
        { status: 400 }
      );
    }

    const isValid = fileStorageService.verifySignedAccessUrl(storagePath, expires, token);
    if (!isValid) {
      return NextResponse.json(
        { error: "Security Violation: Download link is invalid or has expired." },
        { status: 403 }
      );
    }

    const exists = await fileStorageService.exists(storagePath);
    if (!exists) {
      return NextResponse.json({ error: "Requested file does not exist." }, { status: 404 });
    }

    const fileStream = await fileStorageService.getDownloadStream(storagePath);
    const fileName = path.basename(storagePath);
    const ext = path.extname(storagePath).toLowerCase();

    let mimeType = "application/octet-stream";
    if (ext === ".pdf") mimeType = "application/pdf";
    else if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
    else if (ext === ".png") mimeType = "image/png";
    else if (ext === ".webp") mimeType = "image/webp";

    // Read full buffer for Web response stream
    const chunks: Buffer[] = [];
    for await (const chunk of fileStream) {
      chunks.push(Buffer.from(chunk));
    }
    const fullBuffer = Buffer.concat(chunks);

    return new NextResponse(fullBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Content-Length": fullBuffer.length.toString(),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "File access failed." },
      { status: 500 }
    );
  }
}
