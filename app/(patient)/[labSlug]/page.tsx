import { notFound } from "next/navigation";
import Link from "next/link";
import { getLabStorefront } from "@/services/labs/storefront";
import { TestCard } from "@/components/patient/test-card";
import { PackageCard } from "@/components/patient/package-card";
import { LabStatus } from "@prisma/client";
import {
  Search,
  FileText,
  Home,
  Package,
  ClipboardList,
  Phone,
  Clock,
  Droplets,
  ShieldCheck,
} from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ labSlug: string }>;
}) {
  const { labSlug } = await params;
  const store = await getLabStorefront(labSlug);
  if (!store) return { title: "Laboratory Not Found" };
  return {
    title: `${store.lab.name} — Book Diagnostic Tests Online`,
    description: `Book diagnostic tests, health packages, and home collection services at ${store.lab.name}, ${store.lab.city}.`,
  };
}

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ labSlug: string }>;
}) {
  const { labSlug } = await params;
  const store = await getLabStorefront(labSlug);

  if (!store) {
    notFound();
  }

  if (store.lab.status !== LabStatus.ACTIVE) {
    return null; // Layout handles inactive state
  }

  const popularPackages = store.packages.filter((p) => p.isPopular).slice(0, 3);
  const displayPackages = popularPackages.length > 0 ? popularPackages : store.packages.slice(0, 3);
  const popularTests = store.popularTests.slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* Hero Section */}
      <section className="py-8 sm:py-12">
        <div className="rounded-2xl bg-gradient-to-br from-sky-600 to-sky-700 px-6 py-8 text-white sm:px-10 sm:py-12">
          {/* Lab name prominent (primary branding) */}
          <h1 className="text-2xl font-extrabold sm:text-4xl">{store.lab.name}</h1>
          <p className="mt-1 text-sm text-sky-100 sm:text-base">
            {store.lab.city}, {store.lab.state}
            {store.lab.nablAccreditationNumber && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold">
                <ShieldCheck className="h-3 w-3" /> NABL Accredited
              </span>
            )}
          </p>
          <p className="mt-3 max-w-lg text-sm text-sky-100 sm:text-base">
            {store.settings.heroSubheadline}
          </p>

          {/* Trust badges */}
          <div className="mt-4 flex flex-wrap gap-3">
            {store.settings.homeCollectionAvailable && (
              <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                <Home className="h-3.5 w-3.5" /> Home Collection Available
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
              <Clock className="h-3.5 w-3.5" /> {store.settings.deliveryPromiseNotice}
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
              <Droplets className="h-3.5 w-3.5" /> {store.popularTests.length}+ Tests Available
            </div>
          </div>

          {/* Search bar CTA */}
          <Link
            href={`/${labSlug}/tests`}
            className="mt-6 flex w-full items-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm text-zinc-500 shadow-md transition hover:shadow-lg sm:max-w-md"
          >
            <Search className="h-4 w-4 text-sky-600" />
            <span>Search tests, packages…</span>
          </Link>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="mb-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link
            href={`/${labSlug}/tests`}
            className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white p-4 text-center transition hover:border-sky-300 hover:bg-sky-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-sky-700 dark:hover:bg-sky-950/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
              <Search className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Search Tests
            </span>
          </Link>

          <Link
            href={`/${labSlug}/prescription`}
            className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white p-4 text-center transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <FileText className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Upload Prescription
            </span>
          </Link>

          <Link
            href={`/${labSlug}/packages`}
            className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white p-4 text-center transition hover:border-violet-300 hover:bg-violet-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-violet-700 dark:hover:bg-violet-950/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
              <Package className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Health Packages
            </span>
          </Link>

          <Link
            href={`/${labSlug}/reports`}
            className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white p-4 text-center transition hover:border-amber-300 hover:bg-amber-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-amber-700 dark:hover:bg-amber-950/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <ClipboardList className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              My Reports
            </span>
          </Link>
        </div>
      </section>

      {/* Categories */}
      {store.categories.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-base font-bold text-zinc-900 dark:text-zinc-100">
            Browse by Category
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Link
              href={`/${labSlug}/tests`}
              className="flex-shrink-0 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-sky-400 hover:text-sky-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              All Tests
            </Link>
            {store.categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/${labSlug}/tests?category=${cat.slug}`}
                className="flex-shrink-0 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-sky-400 hover:text-sky-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              >
                {cat.name}
                <span className="ml-1.5 text-zinc-400">({cat.testCount})</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Popular Tests */}
      {popularTests.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Popular Tests
            </h2>
            <Link
              href={`/${labSlug}/tests`}
              className="text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {popularTests.map((test) => (
              <TestCard
                key={test.id}
                id={test.id}
                name={test.name}
                code={test.code}
                sellingPrice={test.sellingPrice}
                mrpPrice={test.mrpPrice}
                sampleType={test.sampleType}
                tatHours={test.tatHours}
                fastingRequired={test.fastingRequired}
                categoryName={test.categoryName}
              />
            ))}
          </div>
        </section>
      )}

      {/* Health Packages */}
      {displayPackages.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Health Packages
            </h2>
            <Link
              href={`/${labSlug}/packages`}
              className="text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayPackages.map((pkg) => (
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
        </section>
      )}

      {/* Empty State */}
      {popularTests.length === 0 && displayPackages.length === 0 && (
        <section className="mb-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-950">
            <Search className="h-6 w-6 text-sky-600 dark:text-sky-400" />
          </div>
          <h3 className="mt-4 font-semibold text-zinc-900 dark:text-zinc-100">
            Catalogue Coming Soon
          </h3>
          <p className="mt-1 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
            This laboratory is setting up their test catalogue. Contact them directly for bookings.
          </p>
          <a
            href={`tel:${store.lab.phone}`}
            className="mt-4 flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
          >
            <Phone className="h-4 w-4" /> Call {store.lab.name}
          </a>
        </section>
      )}

      {/* Contact Lab */}
      <section className="mb-10 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">Contact Lab</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
          <a
            href={`tel:${store.lab.phone}`}
            className="flex items-center gap-2 text-sm font-semibold text-sky-600 hover:underline dark:text-sky-400"
          >
            <Phone className="h-4 w-4" /> {store.lab.phone}
          </a>
          {store.lab.emergencyPhone && (
            <a
              href={`tel:${store.lab.emergencyPhone}`}
              className="flex items-center gap-2 text-sm text-zinc-600 hover:text-sky-600 dark:text-zinc-400"
            >
              <Phone className="h-4 w-4" /> Emergency: {store.lab.emergencyPhone}
            </a>
          )}
          <span className="text-xs text-zinc-400">
            {store.lab.addressLine1}, {store.lab.city}
          </span>
        </div>
      </section>
    </div>
  );
}
