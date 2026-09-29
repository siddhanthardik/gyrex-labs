import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const { user, labMembership } = await requireLabTenant();
    const labId = labMembership.labId;

    const lab = await prisma.lab.findUnique({
      where: { id: labId },
      include: {
        storeSettings: true,
      },
    });

    if (!lab) {
      return NextResponse.json({ error: "Laboratory not found." }, { status: 404 });
    }

    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { fullName: true, email: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: lab.id,
        name: lab.name,
        slug: lab.slug,
        code: lab.code,
        email: lab.email,
        phone: lab.phone,
        ownerName: userData?.fullName || user.fullName,
        addressLine1: lab.addressLine1 === "Pending Address Setup" ? "" : lab.addressLine1,
        addressLine2: lab.addressLine2 || "",
        city: lab.city === "Pending" ? "" : lab.city,
        state: lab.state === "Pending" ? "" : lab.state,
        postalCode: lab.postalCode === "000000" ? "" : lab.postalCode,
        description: lab.storeSettings?.heroSubheadline || "",
        logoUrl: lab.storeSettings?.logoUrl || null,
        isVerified: lab.isVerified,
        status: lab.status,
      },
    });
  } catch (error: any) {
    console.error("GET /api/lab/profile error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve laboratory profile." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, labMembership } = await requireLabTenant(PERMISSIONS.LABS_UPDATE);
    const labId = labMembership.labId;

    const body = await request.json();
    const {
      labName,
      ownerName,
      email,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      slug,
      description,
      logoUrl,
    } = body;

    // 1. Validations
    if (labName !== undefined) {
      const trimmed = labName.trim();
      if (!trimmed || trimmed.length < 2) {
        return NextResponse.json(
          { error: "Laboratory name must be at least 2 characters long." },
          { status: 400 }
        );
      }
    }

    if (ownerName !== undefined) {
      const trimmed = ownerName.trim();
      if (!trimmed || trimmed.length < 2) {
        return NextResponse.json(
          { error: "Owner name must be at least 2 characters long." },
          { status: 400 }
        );
      }
    }

    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return NextResponse.json(
          { error: "Please provide a valid email address." },
          { status: 400 }
        );
      }
    }

    if (phone !== undefined) {
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 15) {
        return NextResponse.json(
          { error: "Please provide a valid 10-digit phone number." },
          { status: 400 }
        );
      }
    }

    if (addressLine1 !== undefined) {
      const trimmed = addressLine1.trim();
      if (!trimmed || trimmed.length < 3) {
        return NextResponse.json(
          { error: "Please provide a valid primary address (at least 3 characters)." },
          { status: 400 }
        );
      }
    }

    if (city !== undefined) {
      const trimmed = city.trim();
      if (!trimmed || trimmed.length < 2) {
        return NextResponse.json(
          { error: "City is required." },
          { status: 400 }
        );
      }
    }

    if (state !== undefined) {
      const trimmed = state.trim();
      if (!trimmed || trimmed.length < 2) {
        return NextResponse.json(
          { error: "State is required." },
          { status: 400 }
        );
      }
    }

    if (postalCode !== undefined) {
      const trimmedPin = postalCode.trim();
      // Valid Indian PIN code (6 digits, does not start with 0)
      if (!/^[1-9][0-9]{5}$/.test(trimmedPin)) {
        return NextResponse.json(
          { error: "Please enter a valid 6-digit PIN code (e.g. 110001)." },
          { status: 400 }
        );
      }
    }

    // 2. Slug Validation and Collision Check
    let sanitizedSlug: string | undefined = undefined;
    if (slug !== undefined) {
      const trimmedSlug = slug.toLowerCase().trim();
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

      if (!trimmedSlug || trimmedSlug.length < 3 || trimmedSlug.length > 60 || !slugRegex.test(trimmedSlug)) {
        return NextResponse.json(
          {
            error:
              "Store URL can only contain lowercase letters, numbers, and single hyphens (no spaces or special characters).",
          },
          { status: 400 }
        );
      }

      // Check uniqueness against other labs
      const conflict = await prisma.lab.findFirst({
        where: {
          slug: trimmedSlug,
          id: { not: labId },
        },
        select: { id: true },
      });

      if (conflict) {
        const randomSuffix = Math.floor(100 + Math.random() * 900);
        const suggested = `${trimmedSlug}-${randomSuffix}`;
        return NextResponse.json(
          {
            error: `The store URL 'labs.gyrex.in/${trimmedSlug}' is already taken. Try '${suggested}' or choose another.`,
            suggestedSlug: suggested,
          },
          { status: 409 }
        );
      }

      sanitizedSlug = trimmedSlug;
    }

    // 3. Description Length Check
    if (description !== undefined && description.length > 300) {
      return NextResponse.json(
        { error: "Description must be within 300 characters." },
        { status: 400 }
      );
    }

    // 4. Atomic Database Updates
    await prisma.$transaction(
      async (tx) => {
        // Update User if ownerName was modified
        if (ownerName !== undefined) {
          await tx.user.update({
            where: { id: user.userId },
            data: { fullName: ownerName.trim() },
          });
        }

        // Update Lab details
        await tx.lab.update({
          where: { id: labId },
          data: {
            name: labName !== undefined ? labName.trim() : undefined,
            email: email !== undefined ? email.trim().toLowerCase() : undefined,
            phone: phone !== undefined ? phone.trim() : undefined,
            addressLine1: addressLine1 !== undefined ? addressLine1.trim() : undefined,
            addressLine2: addressLine2 !== undefined ? addressLine2?.trim() || null : undefined,
            city: city !== undefined ? city.trim() : undefined,
            state: state !== undefined ? state.trim() : undefined,
            postalCode: postalCode !== undefined ? postalCode.trim() : undefined,
            slug: sanitizedSlug,
          },
        });

        // Update Store Settings (heroSubheadline as public short description, and logoUrl if supplied)
        if (description !== undefined || logoUrl !== undefined) {
          await tx.labStoreSettings.upsert({
            where: { labId },
            create: {
              labId,
              heroSubheadline: description !== undefined ? description.trim() : "Accurate reports, professional care.",
              logoUrl: logoUrl !== undefined ? logoUrl : undefined,
            },
            update: {
              heroSubheadline: description !== undefined ? description.trim() : undefined,
              logoUrl: logoUrl !== undefined ? logoUrl : undefined,
            },
          });
        }
      },
      {
        maxWait: 10000,
        timeout: 15000,
      }
    );

    // Retrieve fresh updated state
    const updatedLab = await prisma.lab.findUnique({
      where: { id: labId },
      include: { storeSettings: true },
    });

    return NextResponse.json({
      success: true,
      message: "Laboratory profile saved successfully.",
      data: {
        name: updatedLab?.name,
        slug: updatedLab?.slug,
        city: updatedLab?.city,
        state: updatedLab?.state,
        postalCode: updatedLab?.postalCode,
        description: updatedLab?.storeSettings?.heroSubheadline,
        logoUrl: updatedLab?.storeSettings?.logoUrl,
      },
    });
  } catch (error: any) {
    console.error("PATCH /api/lab/profile error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update laboratory profile." },
      { status: error.statusCode || 500 }
    );
  }
}
