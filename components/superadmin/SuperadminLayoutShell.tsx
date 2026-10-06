"use client";

import React, { useState, useEffect } from "react";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Restore desktop sidebar collapse preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("gyrex_superadmin_sidebar_collapsed");
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
        localStorage.setItem("gyrex_superadmin_sidebar_collapsed", String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  return (
    <div className="gyrex-admin-shell flex min-h-screen bg-slate-50 antialiased font-sans text-slate-900">
      <SuperadminSidebar
        userRole={userRole}
        userEmail={userEmail}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      <div className="flex flex-1 flex-col min-w-0 transition-all duration-200">
        <SuperadminHeader
          userEmail={userEmail}
          userName={userName}
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
