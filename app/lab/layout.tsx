import React from "react";
import { redirect } from "next/navigation";
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
      status: true,
      isVerified: true,
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
        status: lab.status,
        isVerified: lab.isVerified,
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
