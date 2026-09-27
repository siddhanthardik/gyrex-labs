import { notFound } from "next/navigation";
import { getLabStorefront } from "@/services/labs/storefront";
import { PackageCard } from "@/components/patient/package-card";
import { Package } from "lucide-react";

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
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Health Packages</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Comprehensive health check-up bundles at {store.lab.name}
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950">
            <Package className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            No Packages Available
          </h3>
          <p className="mt-1 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
            This laboratory hasn&apos;t set up any health packages yet. Browse individual tests instead.
          </p>
          <a
            href={`/${labSlug}/tests`}
            className="mt-4 text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400"
          >
            Browse diagnostic tests →
          </a>
        </div>
      )}
    </div>
  );
}
