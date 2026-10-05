"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";
import { PackageEditor, PackageTestItem } from "@/components/lab/PackageEditor";

export default function EditPackagePage() {
  const params = useParams();
  const packageId = params?.packageId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<{
    name: string;
    description: string;
    sellingPrice: number;
    mrpPrice: number | null;
    isHomeCollectionAvailable: boolean;
    fastingRequired: boolean;
    estimatedTatHours: number;
    isActive: boolean;
    tests: PackageTestItem[];
  } | null>(null);

  useEffect(() => {
    async function loadPackage() {
      if (!packageId) return;
      try {
        const res = await fetch(`/api/lab/packages/${packageId}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to load package details.");
        }
        const data = await res.json();
        const pkg = data.package;

        const mappedTests: PackageTestItem[] = (pkg.tests || []).map((t: any) => ({
          id: t.labTestId,
          name: t.testName || "Unknown Investigation",
          code: t.testCode || "",
          categoryName: t.categoryName || "Diagnostics",
          sampleType: t.sampleType || "Sample",
          standardTatHours: 24,
          sellingPrice: Number(t.price) || 0,
        }));

        setInitialData({
          name: pkg.name,
          description: pkg.description || "",
          sellingPrice: Number(pkg.sellingPrice),
          mrpPrice: pkg.mrpPrice ? Number(pkg.mrpPrice) : null,
          isHomeCollectionAvailable: pkg.isHomeCollectionAvailable,
          fastingRequired: pkg.fastingRequired,
          estimatedTatHours: pkg.estimatedTatHours || 24,
          isActive: pkg.isActive,
          tests: mappedTests,
        });
      } catch (err: any) {
        setError(err.message || "Failed to load package details.");
      } finally {
        setLoading(false);
      }
    }
    loadPackage();
  }, [packageId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-slate-500">
        <RefreshCw className="h-6 w-6 animate-spin text-sky-500" />
        <span className="mt-3 text-sm">Loading package details...</span>
      </div>
    );
  }

  if (error || !initialData) {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-8 text-center">
        <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Package Not Found</h2>
        <p className="text-xs text-slate-500">{error || "Could not retrieve package."}</p>
        <Link
          href="/lab/packages"
          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-600 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Packages</span>
        </Link>
      </div>
    );
  }

  return <PackageEditor packageId={packageId} initialData={initialData} />;
}
