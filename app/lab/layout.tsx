import React from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireLabAccess } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { LabLayoutShell } from "@/components/lab/LabLayoutShell";

export const metadata = {
  title: "Gyrex Labs — Laboratory Administration",
  description: "Manage diagnostic store, catalogue, orders, reports, and patients.",
};

export default async function LabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  // Public onboarding routes bypass authentication and lab shell entirely
  if (
    pathname === "/lab/onboarding/signup" ||
    pathname.startsWith("/lab/onboarding/signup/") ||
    pathname === "/lab/onboarding/verify" ||
    pathname.startsWith("/lab/onboarding/verify/")
  ) {
    return <>{children}</>;
  }

  let context;
  try {
    context = await requireLabAccess();
  } catch (error: any) {
    if (error?.statusCode === 401) {
      redirect("/login");
    }
    redirect("/login?error=forbidden");
  }

  const { user, labMembership } = context;

  // Retrieve fresh lab metadata
  const lab = await prisma.lab.findUnique({
    where: { id: labMembership.labId },
    select: {
      id: true,
      name: true,
      slug: true,
      code: true,
      status: true,
      isVerified: true,
      nablAccreditationNumber: true,
    },
  });

  if (!lab) {
    redirect("/login?error=no_lab_found");
  }

  return (
    <LabLayoutShell
      lab={{
        id: lab.id,
        name: lab.name,
        slug: lab.slug,
        code: lab.code,
        status: lab.status,
        isVerified: lab.isVerified,
        nablAccreditationNumber: lab.nablAccreditationNumber,
      }}
      user={{
        fullName: user.fullName,
        role: labMembership.role,
      }}
    >
      {children}
    </LabLayoutShell>
  );
}
