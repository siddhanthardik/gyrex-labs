import React from "react";
import { requireSuperadminAccess } from "@/lib/auth/superadmin-auth";
import { SuperadminLayoutShell } from "@/components/superadmin/SuperadminLayoutShell";

export const metadata = {
  title: "Superadmin | Gyrex Labs Platform",
  description: "Platform management, laboratory governance, and central Test Master administration.",
};

export default async function SuperadminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSuperadminAccess();

  return (
    <SuperadminLayoutShell
      userRole={user.role}
      userEmail={user.email}
      userName={user.fullName}
    >
      {children}
    </SuperadminLayoutShell>
  );
}
