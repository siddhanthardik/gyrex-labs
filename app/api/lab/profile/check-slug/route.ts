import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    const { labMembership } = await requireLabTenant();
    const labId = labMembership.labId;

    const { searchParams } = new URL(request.url);
    const slugParam = searchParams.get("slug");

    if (!slugParam) {
      return NextResponse.json(
        { available: false, error: "Please provide a store URL / slug to check." },
        { status: 400 }
      );
    }

    const normalizedSlug = slugParam.toLowerCase().trim();
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

    if (normalizedSlug.length < 3) {
      return NextResponse.json({
        available: false,
        error: "Store URL must be at least 3 characters long.",
      });
    }

    if (normalizedSlug.length > 60 || !slugRegex.test(normalizedSlug)) {
      return NextResponse.json({
        available: false,
        error: "Store URL can only contain lowercase letters, numbers, and single hyphens.",
      });
    }

    // Check if this lab already owns this slug
    if (normalizedSlug === labMembership.slug) {
      return NextResponse.json({ available: true });
    }

    // Check collision against other labs
    const existing = await prisma.lab.findFirst({
      where: {
        slug: normalizedSlug,
        id: { not: labId },
      },
      select: { id: true },
    });

    if (existing) {
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const suggestedSlug = `${normalizedSlug}-${randomSuffix}`;
      return NextResponse.json({
        available: false,
        error: `Store URL 'labs.gyrex.in/${normalizedSlug}' is already taken.`,
        suggestedSlug,
      });
    }

    return NextResponse.json({ available: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to check slug availability." },
      { status: error.statusCode || 500 }
    );
  }
}
