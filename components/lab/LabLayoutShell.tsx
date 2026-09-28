"use client";

import React, { useState } from "react";
import { LabSidebar } from "./LabSidebar";
import { LabHeader } from "./LabHeader";
import { UserRole } from "@prisma/client";

interface LabLayoutShellProps {
  lab: {
    id: string;
    name: string;
    slug: string;
    status: string;
    isVerified: boolean;
  };
  user: {
    fullName: string;
    role: UserRole;
  };
  children: React.ReactNode;
}

export function LabLayoutShell({ lab, user, children }: LabLayoutShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="gyrex-admin-shell flex min-h-screen antialiased font-sans">
      <LabSidebar
        lab={lab}
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <LabHeader
          lab={lab}
          user={user}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
