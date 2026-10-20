import { notFound } from "next/navigation";
import Link from "next/link";
import { getLabStorefront } from "@/services/labs/storefront";
import { PackageCard } from "@/components/patient/package-card";
import { StorefrontCatalogueBrowser } from "@/components/patient/storefront-catalogue-browser";
import { ClinicalGallery } from "@/components/patient/clinical-gallery";
import { LabStatus } from "@prisma/client";
import {
  FileText,
  Package,
  Phone,
  Clock,
  ShieldCheck,
  ChevronRight,
  MessageSquare,
  Stethoscope,
  Activity,
  CheckCircle2,
  Building2,
  Users,
  ClipboardList,
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
  const popularTests = store.popularTests.slice(0, 8);

  return (
    <div className="w-full">
      {/* ── 1. Full-Width Edge-to-Edge Hero ─────────────────────────── */}
      <section
        aria-label="Laboratory Facility Overview"
        className="relative w-full overflow-hidden bg-slate-900 text-white min-h-[220px] max-h-[450px] h-[clamp(240px,34vw,450px)]"
      >
        {store.settings.bannerUrl ? (
          <>
            <img
              src={store.settings.bannerUrl}
              alt={`${store.lab.name} clinical facility`}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
            />
            {/* Restrained dark gradient overlay guaranteeing WCAG AA text contrast */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/45 to-transparent" />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(135deg, ${
                store.settings.primaryColor || "#0284c7"
              } 0%, #0369a1 50%, #0f172a 100%)`,
            }}
          />
        )}

        {/* Inner Content Container for readable text positioning */}
        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-8 pt-6 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            {/* Verified Accreditation Badge (Rendered strictly when verified and valid) */}
            {store.settings.nabl.isCurrentlyValid && (
              <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-semibold text-emerald-300 backdrop-blur-xs">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>
                  NABL Accredited Laboratory ({store.settings.nabl.accreditationNumber})
                </span>
              </div>
            )}

            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
              {store.lab.name}
            </h1>

            {store.settings.heroSubheadline && (
              <p className="mt-2 text-sm text-slate-200 sm:text-base line-clamp-2 max-w-2xl font-medium">
                {store.settings.heroSubheadline}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Main Storefront Content Area ────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
        {/* ── Standalone Search & Interactive Test Catalogue Browser ── */}
        <StorefrontCatalogueBrowser
          labSlug={labSlug}
          popularTests={popularTests}
          categories={store.categories}
          homeCollectionAvailable={store.settings.homeCollectionAvailable}
          city={store.lab.city}
        />

        {/* ── Health Packages Section ─────────────────────────────────── */}
        {displayPackages.length > 0 && (
          <section aria-label="Comprehensive Health Packages" className="pt-2">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-sky-600" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Popular Health & Diagnostic Packages
                </h2>
              </div>
              <Link
                href={`/${labSlug}/packages`}
                className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700"
              >
                <span>View all packages</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                  imageUrl={pkg.imageUrl}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Clinical Facility & Laboratory Gallery (Hidden if empty) ── */}
        {store.galleryImages && store.galleryImages.length > 0 && (
          <ClinicalGallery
            images={store.galleryImages}
            labName={store.lab.name}
          />
        )}

        {/* ── Diagnostic Services ─────────────────────────────────────── */}
        {store.settings.services.length > 0 && (
          <section
            aria-label="Diagnostic Services"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-sky-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Our Clinical Testing Services
                </h2>
              </div>
              <span className="text-xs font-medium text-slate-500">
                {store.settings.services.length} specialized services
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {store.settings.services.map((service, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 transition hover:bg-slate-50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{service}</h3>
                    <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">
                      Standardized clinical protocols with verified calibration and quality controls.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── About the Laboratory & Quality Standards ─────────────────── */}
        <section
          aria-label="About the Laboratory"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
        >
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900">About {store.lab.name}</h2>
          </div>

          <div className="space-y-3">
            {store.settings.about
              .split(/\n+/)
              .map((p) => p.trim())
              .filter(Boolean)
              .map((paragraph, pIdx) => (
                <p key={pIdx} className="text-sm text-slate-600 leading-relaxed">
                  {paragraph}
                </p>
              ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 pt-5 border-t border-slate-100">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Clock className="h-4 w-4 text-sky-600" />
                <span>Operating Hours</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-600 leading-snug">
                {store.settings.schedule}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Quality Standards</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-600 leading-snug">
                {store.settings.nabl.isCurrentlyValid
                  ? `NABL Accredited (${store.settings.nabl.accreditationNumber})`
                  : "Verified clinical calibration & standardized diagnostics"}
              </p>
              {store.settings.nabl.isCurrentlyValid && store.settings.nabl.validUntil && (
                <p className="mt-1 text-[11px] text-slate-400">
                  Accreditation active through{" "}
                  {new Date(store.settings.nabl.validUntil).toLocaleDateString("en-IN", {
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Activity className="h-4 w-4 text-sky-600" />
                <span>Report Delivery</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-600 leading-snug">
                {store.settings.deliveryPromiseNotice || "Digital reports delivered in 12-24 hours"}
              </p>
            </div>
          </div>
        </section>

        {/* ── Clinical & Medical Leadership (Team) ───────────────────── */}
        {store.settings.team.length > 0 && (
          <section
            aria-label="Clinical Leadership"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-sky-600" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Clinical & Medical Leadership
                </h2>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Verified Medical Experts
              </span>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {store.settings.team.map((member, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center text-center rounded-2xl border border-slate-100 bg-slate-50/60 p-6 transition hover:bg-slate-50 hover:border-slate-200 hover:shadow-xs"
                >
                  {member.photoUrl ? (
                    <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-2xl border-2 border-white bg-white shadow-sm mb-4">
                      <img
                        src={member.photoUrl}
                        alt={member.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-24 w-24 sm:h-28 sm:w-28 shrink-0 items-center justify-center rounded-2xl border-2 border-white bg-sky-100 text-xl font-bold text-sky-700 shadow-sm mb-4">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {member.name}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-sky-700">
                    {member.role}
                  </p>
                  {member.qualifications && (
                    <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                      {member.qualifications}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Contact & Visit Laboratory ──────────────────────────────── */}
        <section
          aria-label="Contact Information"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-base font-bold text-slate-900">
            Contact & Visit Laboratory
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <a
              href={`tel:${store.lab.phone}`}
              className="flex items-center gap-3.5 rounded-xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-slate-100 no-tap-highlight"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100">
                <Phone className="h-5 w-5 text-sky-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-500">Phone</p>
                <p className="text-sm font-bold text-slate-900 truncate">
                  {store.lab.phone}
                </p>
              </div>
            </a>

            {(store.lab.emergencyPhone || store.lab.phone) && (
              <a
                href={`https://wa.me/${(
                  store.lab.emergencyPhone || store.lab.phone
                )
                  .replace(/[^0-9]/g, "")
                  .replace(/^0+/, "")}?text=${encodeURIComponent(
                  `Hello ${store.lab.name}, I would like to inquire about booking diagnostic tests.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 transition hover:bg-emerald-50 no-tap-highlight"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                  <MessageSquare className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-emerald-700">
                    WhatsApp Patient Support
                  </p>
                  <p className="text-sm font-bold text-slate-900 truncate">
                    Chat on WhatsApp
                  </p>
                </div>
              </a>
            )}

            <div className="flex items-start gap-3.5 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:col-span-2 lg:col-span-1">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200">
                <ClipboardList className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">Facility Address</p>
                <p className="text-sm text-slate-700">
                  {store.lab.addressLine1}
                  {store.lab.addressLine2 ? `, ${store.lab.addressLine2}` : ""},{" "}
                  {store.lab.city}, {store.lab.state} - {store.lab.postalCode}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
