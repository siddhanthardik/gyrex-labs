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
  Star,
  ChevronRight,
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

  const popularPackages = store.packages
    .filter((p) => p.isPopular)
    .slice(0, 3);
  const displayPackages =
    popularPackages.length > 0 ? popularPackages : store.packages.slice(0, 3);
  const popularTests = store.popularTests.slice(0, 6);

  return (
    <div className="patient-container py-4">
      {/* ── Hero / Lab Banner ───────────────────────────────────────── */}
      <section className="mb-5">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 via-sky-700 to-blue-800 px-5 py-6 text-white">
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-10 -left-6 h-40 w-40 rounded-full bg-white/5" />

          <div className="relative">
            {/* Lab identity */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-extrabold leading-tight">
                  {store.lab.name}
                </h1>
                <p className="mt-0.5 text-sm text-sky-100">
                  {store.lab.city}, {store.lab.state}
                </p>
              </div>
              {store.lab.nablAccreditationNumber && (
                <div className="flex flex-shrink-0 items-center gap-1 rounded-lg bg-white/15 px-2 py-1 text-[11px] font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  NABL
                </div>
              )}
            </div>

            {/* Subheadline */}
            {store.settings.heroSubheadline && (
              <p className="mt-2 text-sm text-sky-100 leading-relaxed max-w-xs">
                {store.settings.heroSubheadline}
              </p>
            )}

            {/* Trust badges */}
            <div className="mt-4 flex flex-wrap gap-2">
              {store.settings.homeCollectionAvailable && (
                <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium">
                  <Home className="h-3 w-3" />
                  Home Collection
                </div>
              )}
              <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium">
                <Clock className="h-3 w-3" />
                {store.settings.deliveryPromiseNotice || "Fast Reports"}
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium">
                <Droplets className="h-3 w-3" />
                {store.popularTests.length}+ Tests
              </div>
            </div>

            {/* Search CTA */}
            <Link
              href={`/${labSlug}/tests`}
              className="mt-5 flex w-full items-center gap-3 rounded-xl bg-white/95 px-4 py-3 text-sm text-slate-500 shadow-lg transition hover:bg-white"
            >
              <Search className="h-4 w-4 flex-shrink-0 text-sky-600" />
              <span>Search tests, packages…</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Quick Action Grid ────────────────────────────────────────── */}
      <section className="mb-6">
        <div className="grid grid-cols-4 gap-2.5">
          {[
            {
              href: `/${labSlug}/tests`,
              icon: Search,
              label: "Search Tests",
              color: "text-sky-600 bg-sky-50",
            },
            {
              href: `/${labSlug}/prescription`,
              icon: FileText,
              label: "Prescription",
              color: "text-emerald-600 bg-emerald-50",
            },
            {
              href: `/${labSlug}/packages`,
              icon: Package,
              label: "Packages",
              color: "text-violet-600 bg-violet-50",
            },
            {
              href: `/${labSlug}/reports`,
              icon: ClipboardList,
              label: "My Reports",
              color: "text-amber-600 bg-amber-50",
            },
          ].map(({ href, icon: Icon, label, color }) => (
            <Link
              key={href}
              href={href}
              className="no-tap-highlight flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white py-3.5 text-center shadow-sm transition hover:border-slate-200 hover:shadow"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${color}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-semibold leading-tight text-slate-700">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Category Chips ───────────────────────────────────────────── */}
      {store.categories.length > 0 && (
        <section className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide scroll-smooth-x">
            <Link
              href={`/${labSlug}/tests`}
              className="flex-shrink-0 rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
            >
              All Tests
            </Link>
            {store.categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/${labSlug}/tests?category=${cat.slug}`}
                className="flex-shrink-0 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300"
              >
                {cat.name}
                <span className="ml-1.5 text-slate-400">({cat.testCount})</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Popular Tests ────────────────────────────────────────────── */}
      {popularTests.length > 0 && (
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900">Popular Tests</h2>
            </div>
            <Link
              href={`/${labSlug}/tests`}
              className="flex items-center gap-0.5 text-xs font-semibold text-sky-600"
            >
              View all
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                homeCollectionAvailable={test.homeCollectionAvailable}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Health Packages ──────────────────────────────────────────── */}
      {displayPackages.length > 0 && (
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Package className="h-4 w-4 text-violet-500" />
              <h2 className="text-sm font-bold text-slate-900">Health Packages</h2>
            </div>
            <Link
              href={`/${labSlug}/packages`}
              className="flex items-center gap-0.5 text-xs font-semibold text-sky-600"
            >
              View all
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                homeCollectionAvailable={pkg.homeCollectionAvailable}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Empty State ──────────────────────────────────────────────── */}
      {popularTests.length === 0 && displayPackages.length === 0 && (
        <section className="mb-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-50">
            <Search className="h-6 w-6 text-sky-600" />
          </div>
          <h3 className="mt-4 font-semibold text-slate-900">Catalogue Coming Soon</h3>
          <p className="mt-1 max-w-xs text-sm text-slate-500">
            This laboratory is setting up their test catalogue. Contact them directly.
          </p>
          <a
            href={`tel:${store.lab.phone}`}
            className="mt-4 flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-sky-700 transition"
          >
            <Phone className="h-4 w-4" />
            Call {store.lab.name}
          </a>
        </section>
      )}

      {/* ── Contact Section ──────────────────────────────────────────── */}
      <section className="mb-28 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-slate-900">
          Contact Laboratory
        </h2>
        <div className="flex flex-col gap-3">
          <a
            href={`tel:${store.lab.phone}`}
            className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:bg-slate-100 no-tap-highlight"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sky-100">
              <Phone className="h-4 w-4 text-sky-600" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Phone</p>
              <p className="text-sm font-semibold text-slate-900">
                {store.lab.phone}
              </p>
            </div>
          </a>
          {store.lab.emergencyPhone && (
            <a
              href={`tel:${store.lab.emergencyPhone}`}
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:bg-slate-100 no-tap-highlight"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                <Phone className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Emergency</p>
                <p className="text-sm font-semibold text-slate-900">
                  {store.lab.emergencyPhone}
                </p>
              </div>
            </a>
          )}
          <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-200">
              <ClipboardList className="h-4 w-4 text-slate-600" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Address</p>
              <p className="text-sm text-slate-700">
                {store.lab.addressLine1}, {store.lab.city}, {store.lab.state}{" "}
                {store.lab.postalCode}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
