import { notFound } from "next/navigation";
import { getLabStorefront } from "@/services/labs/storefront";
import { PackageCard } from "@/components/patient/package-card";
import { Package, Sparkles, ShieldCheck } from "lucide-react";
import Link from "next/link";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ labSlug: string }>;
}) {
  const { labSlug } = await params;
  const store = await getLabStorefront(labSlug);
  if (!store) return { title: "Packages Not Found" };
  return {
    title: `Health Packages — ${store.lab.name}`,
    description: `Affordable health check-up packages at ${store.lab.name}, ${store.lab.city}. Save more with bundled diagnostic tests.`,
  };
}

export default async function PackagesPage({
  params,
}: {
  params: Promise<{ labSlug: string }>;
}) {
  const { labSlug } = await params;
  const store = await getLabStorefront(labSlug);
  if (!store) notFound();

  const { packages } = store;

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 space-y-4">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-violet-900 to-indigo-800 p-5 text-white shadow-md">
        <div className="flex items-center gap-2 text-xs font-bold text-violet-200">
          <Sparkles className="h-4 w-4" />
          <span>Full Body &amp; Preventive Health</span>
        </div>
        <h1 className="mt-1 text-xl font-extrabold text-white">Health Check-Up Packages</h1>
        <p className="mt-1 text-xs text-violet-100 leading-relaxed">
          Comprehensive bundled diagnostic packages at discounted rates with {store.lab.name}.
        </p>
      </div>

      {packages.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              id={pkg.id}
              name={pkg.name}
              description={pkg.description}
              sellingPrice={pkg.sellingPrice}
              mrpPrice={pkg.mrpPrice}
              testCount={pkg.testCount}
              tests={pkg.tests}
              estimatedTatHours={pkg.estimatedTatHours}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-white py-16 px-4 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
            <Package className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-sm font-bold text-zinc-900 dark:text-zinc-100">
            No Packages Available Currently
          </h3>
          <p className="mt-1 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
            This laboratory currently offers individual diagnostic tests. Browse the full test catalogue below.
          </p>
          <Link
            href={`/${labSlug}/tests`}
            className="mt-5 rounded-2xl bg-sky-700 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-sky-600 transition"
          >
            Browse All Diagnostic Tests
          </Link>
        </div>
      )}
    </div>
  );
}
