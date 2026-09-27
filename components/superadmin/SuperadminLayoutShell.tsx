import React from "react";
import { SuperadminSidebar } from "./SuperadminSidebar";
import { SuperadminHeader } from "./SuperadminHeader";
import { UserRole } from "@prisma/client";

interface SuperadminLayoutShellProps {
  children: React.ReactNode;
  userRole: UserRole;
  userEmail: string;
  userName: string;
}

export function SuperadminLayoutShell({
  children,
  userRole,
  userEmail,
  userName,
}: SuperadminLayoutShellProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SuperadminSidebar userRole={userRole} userEmail={userEmail} />

      <div className="pl-64 flex min-h-screen flex-col">
        <SuperadminHeader userEmail={userEmail} userName={userName} />

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
