"use client";

import React, { useState, useEffect } from "react";
import { LabSidebar } from "./LabSidebar";
import { LabHeader } from "./LabHeader";
import { UserRole } from "@prisma/client";

interface LabLayoutShellProps {
  lab: {
    id: string;
    name: string;
    slug: string;
    code?: string;
    status: string;
    isVerified: boolean;
    nablAccreditationNumber?: string | null;
  };
  user: {
    fullName: string;
    role: UserRole;
  };
  children: React.ReactNode;
}

export function LabLayoutShell({ lab, user, children }: LabLayoutShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Restore desktop sidebar collapse preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("gyrex_lab_sidebar_collapsed");
      if (saved === "true") {
        setIsCollapsed(true);
      }
    } catch {
      // Ignore localStorage errors in SSR or restricted environments
    }
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("gyrex_lab_sidebar_collapsed", String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  return (
    <div className="gyrex-admin-shell flex min-h-screen bg-slate-50 antialiased font-sans">
      <LabSidebar
        lab={lab}
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      <div className="flex flex-1 flex-col min-w-0 transition-all duration-200">
        <LabHeader
          lab={lab}
          user={user}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
