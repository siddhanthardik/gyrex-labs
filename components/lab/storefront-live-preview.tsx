"use client";

import React, { useState } from "react";
import {
  Search,
  FileText,
  Home,
  Package,
  ClipboardList,
  ShieldCheck,
  Clock,
  Droplets,
  Building2,
  Smartphone,
  Monitor,
  ExternalLink,
  ChevronRight,
  Info,
  Users,
  Camera,
} from "lucide-react";

export interface PreviewTestData {
  name: string;
  price: number;
  sampleType?: string;
}

export interface PreviewPackageData {
  name: string;
  price: number;
  testCount?: number;
  imageUrl?: string | null;
}

export interface StorefrontLivePreviewProps {
  labName: string;
  labSlug?: string;
  city: string;
  state: string;
  phone: string;
  isVerified?: boolean;
  nablNumber?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  primaryColor: string;
  accentColor: string;
  heroHeadline: string;
  heroSubheadline: string;
  deliveryPromiseNotice?: string;
  homeCollectionAvailable?: boolean;
  homeCollectionFee?: number;
  freeHomeCollectionThreshold?: number | null;
  isNablCurrentlyValid?: boolean;
  about?: string;
  schedule?: string;
  services?: string[];
  team?: Array<{ name: string; role: string; qualifications?: string; photoUrl?: string | null }>;
  galleryImages?: Array<{ id: string; imageUrl: string; caption?: string | null; displayOrder?: number }>;
  activeTestsCount?: number;
  popularTests?: PreviewTestData[];
  activePackagesCount?: number;
  popularPackages?: PreviewPackageData[];
  defaultDeviceMode?: "mobile" | "desktop";
}

export function StorefrontLivePreview({
  labName,
  labSlug = "your-lab",
  city,
  state,
  phone,
  isVerified = true,
  nablNumber,
  isNablCurrentlyValid,
  logoUrl,
  bannerUrl,
  primaryColor,
  accentColor,
  heroHeadline,
  heroSubheadline,
  deliveryPromiseNotice = "Reports delivered within 24 hours",
  homeCollectionAvailable = true,
  homeCollectionFee = 100,
  freeHomeCollectionThreshold = 1000,
  about,
  schedule,
  services = [],
  team = [],
  galleryImages = [],
  activeTestsCount = 0,
  popularTests = [],
  activePackagesCount = 0,
  popularPackages = [],
  defaultDeviceMode = "mobile",
}: StorefrontLivePreviewProps) {
  const [deviceMode, setDeviceMode] = useState<"mobile" | "desktop">(defaultDeviceMode);
  const [logoError, setLogoError] = useState(false);

  const displayHeadline = heroHeadline.trim() || "Book Diagnostic Tests Online";
  const displaySubheadline =
    heroSubheadline.trim() || "Accurate reports, timely home sample collection, and professional care.";
  const displayCity = city.trim() || "City";
  const displayState = state.trim() || "State";
  const displayLabName = labName.trim() || "Diagnostic Laboratory";

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-slate-900/5 p-3 sm:p-5">
      {/* Preview Header & Controls */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Live Storefront Preview
          </span>
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
            In-Memory Staging
          </span>
        </div>

        {/* Device Switcher */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => setDeviceMode("mobile")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              deviceMode === "mobile"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Mobile (375px)</span>
          </button>
          <button
            type="button"
            onClick={() => setDeviceMode("desktop")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              deviceMode === "desktop"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            <span>Desktop</span>
          </button>
        </div>
      </div>

      {/* Viewport Frame */}
      <div className="flex justify-center overflow-x-auto">
        <div
          className={`transition-all duration-300 bg-white ${
            deviceMode === "mobile"
              ? "w-[375px] shrink-0 rounded-[38px] border-[8px] border-slate-800 shadow-2xl overflow-hidden ring-1 ring-slate-900/10"
              : "w-full max-w-4xl rounded-xl border border-slate-300 shadow-lg overflow-hidden"
          }`}
          style={
            {
              "--brand-primary": primaryColor,
              "--brand-accent": accentColor,
            } as React.CSSProperties
          }
        >
          {/* Mock Browser URL Bar (Desktop) or Notch (Mobile) */}
          {deviceMode === "desktop" ? (
            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-4 py-2 text-xs text-slate-500">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="mx-auto flex w-1/2 items-center justify-center gap-1.5 rounded-md bg-white px-3 py-1 text-[11px] font-mono text-slate-600 shadow-2xs">
                <span>https://labs.gyrex.in/{labSlug}</span>
              </div>
            </div>
          ) : (
            <div className="relative flex items-center justify-between bg-slate-800 px-6 py-2 text-white">
              <span className="text-[10px] font-semibold">9:41</span>
              {/* Speaker pill */}
              <div className="h-4 w-20 rounded-full bg-slate-900" />
              <div className="flex items-center gap-1 text-[10px]">
                <span>5G</span>
                <span className="h-2 w-3 rounded-2xs border border-white" />
              </div>
            </div>
          )}

          {/* Storefront Content Container */}
          <div className="min-h-[520px] bg-zinc-50 text-slate-900">
            {/* Header */}
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  {logoUrl && !logoError ? (
                    <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs">
                      <img
                        src={logoUrl}
                        alt={displayLabName}
                        className="h-full w-full object-contain"
                        onError={() => setLogoError(true)}
                      />
                    </div>
                  ) : (
                    <div
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-2xs"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {displayLabName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="truncate text-sm font-bold text-slate-900">
                        {displayLabName}
                      </span>
                      {isVerified && (
                        <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-sky-600" />
                      )}
                    </div>
                    <span className="block text-[11px] text-slate-500 truncate">
                      {displayCity}, {displayState}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                    Cart (0)
                  </span>
                </div>
              </div>
            </header>

            {/* Main Content Area */}
            <main className="p-4 space-y-5">
              {/* Dynamic Hero Section - Max 450px style, clean editorial contrast */}
              <section
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 via-sky-700 to-blue-800 p-5 text-white shadow-sm min-h-[160px] max-h-[300px] flex flex-col justify-end"
                style={
                  !bannerUrl
                    ? {
                        backgroundImage: `linear-gradient(135deg, ${primaryColor} 0%, #0369a1 50%, #0f172a 100%)`,
                      }
                    : undefined
                }
              >
                {bannerUrl ? (
                  <>
                    <img
                      src={bannerUrl}
                      alt={`${displayLabName} facility banner`}
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/45 to-transparent" />
                  </>
                ) : (
                  <>
                    <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
                    <div className="pointer-events-none absolute -bottom-10 -left-6 h-40 w-40 rounded-full bg-white/5" />
                  </>
                )}

                <div className="relative">
                  {/* Verified NABL Badge */}
                  {isNablCurrentlyValid && nablNumber && isVerified && (
                    <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 backdrop-blur-xs">
                      <ShieldCheck className="h-3 w-3 text-emerald-300" />
                      <span>NABL Accredited ({nablNumber})</span>
                    </div>
                  )}

                  <h1 className="text-base sm:text-lg font-black leading-tight text-white">
                    {displayLabName}
                  </h1>

                  {displaySubheadline && (
                    <p className="mt-1 text-xs text-slate-200 line-clamp-2 max-w-sm">
                      {displaySubheadline}
                    </p>
                  )}
                </div>
              </section>

              {/* Standalone Search Bar Outside Hero */}
              <section aria-label="Search Bar">
                <div className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-500 shadow-2xs">
                  <Search className="h-3.5 w-3.5 flex-shrink-0" style={{ color: primaryColor }} />
                  <span>Search diagnostic tests, packages...</span>
                </div>
              </section>

              {/* Dedicated Home Collection Preview Card (No Fee or Free Claims) */}
              {homeCollectionAvailable && (
                <section className="rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50/80 via-blue-50/40 to-slate-50 p-3 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white">
                      <Home className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">Doorstep Home Sample Collection</span>
                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-800">
                          Active in {displayCity}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-600 leading-relaxed">
                        Certified phlebotomists collect diagnostic samples safely and hygienically at home with sterile protocols and temperature-controlled sample transport.
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* Real Packages Preview or Neutral Notice */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Health Checkup Packages
                  </h3>
                  <span className="text-[11px] font-semibold" style={{ color: primaryColor }}>
                    View All
                  </span>
                </div>

                {popularPackages.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {popularPackages.slice(0, 2).map((pkg, idx) => (
                      <div
                        key={idx}
                        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col"
                      >
                        {pkg.imageUrl && (
                          <div className="relative aspect-video w-full bg-slate-100 border-b border-slate-100">
                            <img
                              src={pkg.imageUrl}
                              alt={pkg.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                        <div className="p-3 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-slate-900 line-clamp-1">{pkg.name}</div>
                            <div className="text-[10px] text-slate-500">
                              {pkg.testCount ? `${pkg.testCount} Tests Included` : "Full Profile"}
                            </div>
                            <div className="mt-1 text-xs font-extrabold text-slate-900">
                              ₹{pkg.price}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs shrink-0"
                            style={{ backgroundColor: primaryColor }}
                          >
                            Book
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 p-4 text-center">
                    <Info className="h-4 w-4 mx-auto text-slate-400" />
                    <p className="mt-1 text-xs font-medium text-slate-600">
                      No health packages configured yet.
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Configure packages in Health Packages to feature them on your storefront.
                    </p>
                  </div>
                )}
              </section>

              {/* Real Popular Tests Preview or Neutral Notice */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Popular Diagnostic Tests
                  </h3>
                  <span className="text-[11px] font-semibold" style={{ color: primaryColor }}>
                    Browse {activeTestsCount} Tests
                  </span>
                </div>

                {popularTests.length > 0 ? (
                  <div className="space-y-1.5">
                    {popularTests.slice(0, 3).map((test, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-2xs"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-900">{test.name}</div>
                          {test.sampleType && (
                            <div className="text-[10px] text-slate-400">{test.sampleType}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">₹{test.price}</span>
                          <button
                            type="button"
                            className="rounded-md px-2 py-0.5 text-[10px] font-bold text-white"
                            style={{ backgroundColor: primaryColor }}
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 p-4 text-center">
                    <Info className="h-4 w-4 mx-auto text-slate-400" />
                    <p className="mt-1 text-xs font-medium text-slate-600">
                      No active tests in catalogue yet.
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Add diagnostic tests with selling prices in Catalogue to display them here.
                    </p>
                  </div>
                )}
              </section>

              {/* Formatted About Preview */}
              {about && (
                <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Building2 className="h-3.5 w-3.5 text-sky-600" />
                    <span>About {displayLabName}</span>
                  </div>
                  <div className="space-y-1.5">
                    {about
                      .split(/\n+/)
                      .map((p) => p.trim())
                      .filter(Boolean)
                      .map((paragraph, idx) => (
                        <p key={idx} className="text-[11px] text-slate-600 leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                  </div>
                </section>
              )}

              {/* Facility Gallery Preview */}
              {galleryImages && galleryImages.length > 0 && (
                <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5 text-sky-600" />
                      <span>Facility Gallery</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {galleryImages.length} {galleryImages.length === 1 ? "photo" : "photos"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {galleryImages.slice(0, 6).map((img, idx) => (
                      <div
                        key={img.id || idx}
                        className="relative aspect-4/3 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                      >
                        <img
                          src={img.imageUrl}
                          alt={img.caption || `Facility photo ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                        {img.caption && (
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 text-[9px] text-white line-clamp-1">
                            {img.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Clinical Team Preview with Photos */}
              {team.length > 0 && (
                <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-sky-600" />
                      <span>Clinical Team</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal">{team.length} specialists</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {team.map((member, idx) => (
                      <div key={idx} className="flex flex-col items-center text-center rounded-xl bg-slate-50 p-3 border border-slate-100">
                        {member.photoUrl ? (
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white mb-2">
                            <img src={member.photoUrl} alt={member.name} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sm font-bold text-sky-700 mb-2">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="truncate text-xs font-bold text-slate-900 w-full">{member.name}</div>
                        <div className="truncate text-[10px] font-semibold text-sky-700 w-full">{member.role}</div>
                        {member.qualifications && (
                          <div className="truncate text-[9px] text-slate-500 w-full mt-0.5">{member.qualifications}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200 bg-white p-4 text-center text-[10px] text-slate-500">
              <div className="font-bold text-slate-800">{displayLabName}</div>
              <div className="mt-0.5">
                {displayCity}, {displayState} • Tel: {phone || "Contact Laboratory"}
              </div>
              <div className="mt-2 text-slate-400">Powered by Gyrex Labs</div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
