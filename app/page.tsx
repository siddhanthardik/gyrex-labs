"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  FileCheck,
  FileText,
  FlaskConical,
  Menu,
  MessageSquare,
  Phone,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "What does Gyrex Labs help with?",
      answer:
        "Gyrex Labs provides an all-in-one digital operating platform for diagnostic laboratories — including patient storefronts, automated WhatsApp booking and notification flows, integrated online payments via Razorpay, and instant digital report delivery.",
    },
    {
      question: "Does it replace our existing laboratory billing software?",
      answer:
        "No. Gyrex Labs seamlessly complements your existing laboratory information management system (LIMS) or offline billing setup. It brings patient-facing bookings, payments, and report downloads online without requiring you to replace your internal analyzers or reporting machines.",
    },
    {
      question: "Can it support multiple collection centres and home collection?",
      answer:
        "Yes. You can configure multiple phlebotomy collection centres, define specific home sample collection pincodes, assign collection staff, and track pickups in real time from your Lab Owner dashboard.",
    },
    {
      question: "How do patients book tests through WhatsApp?",
      answer:
        "Patients receive an interactive menu with quick-reply options to browse your test catalogue, select health packages, schedule home visits or lab appointments, make secure online payments, and download finalized PDF reports.",
    },
  ];

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased selection:bg-sky-100 selection:text-sky-900">
      {/* ── 1. HEADER ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center" title="Gyrex Labs Public Platform">
            <img
              src="/branding/gyrex-labs.svg"
              alt="Gyrex Labs"
              className="h-8 sm:h-9 w-auto object-contain"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 lg:flex">
            <Link href="#features" className="transition hover:text-sky-600">
              Features
            </Link>
            <Link href="#how-it-works" className="transition hover:text-sky-600">
              How It Works
            </Link>
            <Link href="#for-labs" className="transition hover:text-sky-600">
              For Laboratories
            </Link>
            <Link href="#pricing" className="transition hover:text-sky-600">
              Pricing
            </Link>
            <Link href="#testimonials" className="transition hover:text-sky-600">
              Testimonials
            </Link>
            <Link href="#faq" className="transition hover:text-sky-600">
              FAQ
            </Link>
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden items-center gap-4 lg:flex">
            <Link
              href="/login"
              className="px-3 py-2 text-sm font-semibold text-slate-700 transition hover:text-sky-600"
            >
              Sign In
            </Link>
            <Link
              href="/lab/onboarding/signup"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-sky-600 hover:shadow-md"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <Link
              href="/lab/onboarding/signup"
              className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs"
            >
              Get Started
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="border-b border-slate-200 bg-white px-4 py-5 shadow-lg lg:hidden">
            <nav className="flex flex-col space-y-3 text-sm font-medium text-slate-700">
              <Link
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-slate-50"
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-slate-50"
              >
                How It Works
              </Link>
              <Link
                href="#for-labs"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-slate-50"
              >
                For Laboratories
              </Link>
              <Link
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-slate-50"
              >
                Pricing
              </Link>
              <Link
                href="#testimonials"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-slate-50"
              >
                Testimonials
              </Link>
              <Link
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-slate-50"
              >
                FAQ
              </Link>
              <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-3">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Sign In
                </Link>
                <Link
                  href="/lab/onboarding/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg bg-sky-500 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-sky-600"
                >
                  Get Started →
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ── 2. HERO SECTION ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white pt-10 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
            {/* Left Copy & CTAs */}
            <div className="lg:col-span-6 xl:col-span-6">
              {/* Eyebrow Pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-sky-700">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                A MODERN PLATFORM FOR DIAGNOSTIC LABORATORIES
              </div>

              {/* Main Headline */}
              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.5rem] lg:leading-[1.12]">
                Turn More <br className="hidden sm:inline" />
                Test Bookings into <br />
                <span className="text-sky-500">Happy Patients</span>
              </h1>

              {/* Supporting Copy */}
              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                Manage test bookings, payments and report delivery — all in one simple and modern platform. Give your patients a seamless, WhatsApp-like experience while you focus on accurate diagnostics.
              </p>

              {/* CTA Row */}
              <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:items-center">
                <Link
                  href="/lab/onboarding/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-7 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-sky-600 hover:shadow-lg"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="mailto:labs@gyrex.in?subject=Gyrex%20Labs%20Demo%20Request"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-7 py-3.5 text-base font-semibold text-sky-600 transition hover:bg-sky-50/60"
                >
                  <Calendar className="h-4 w-4 text-sky-500" />
                  Book a Demo
                </a>
              </div>

              {/* Checkmarks Row */}
              <div className="mt-8 flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                  <span>Quick Setup</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                  <span>Dedicated Support</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                  <span>No Hidden Charges</span>
                </div>
              </div>
            </div>

            {/* Right Hero Visual Composition */}
            <div className="relative lg:col-span-6 xl:col-span-6">
              <div className="relative mx-auto flex w-full max-w-[560px] items-center justify-center">
                {/* Background Doctor Image Card */}
                <div className="relative w-4/5 sm:w-[82%] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
                  <div className="relative h-[340px] sm:h-[420px] w-full">
                    <Image
                      src="/images/hero-doctor.jpg"
                      alt="Healthcare professional using smartphone in diagnostic laboratory"
                      fill
                      priority
                      className="object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />
                  </div>
                </div>

                {/* Overlaid Smartphone Mockup (WhatsApp Booking Flow) */}
                <div className="absolute -right-1 sm:right-2 -bottom-6 sm:bottom-0 z-20 w-[230px] sm:w-[260px] rounded-[32px] border-[5px] border-slate-900 bg-slate-900 p-1.5 shadow-[0_20px_50px_rgba(15,23,42,0.25)]">
                  {/* Phone Screen */}
                  <div className="overflow-hidden rounded-[24px] bg-[#f0f2f5]">
                    {/* WhatsApp Top Bar */}
                    <div className="flex items-center justify-between bg-[#075E54] px-3 py-2.5 text-white">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
                          SD
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold leading-tight truncate">Sharma Diagnostics</p>
                          <div className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                            <p className="text-[9px] text-emerald-100 leading-none">Online</p>
                          </div>
                        </div>
                      </div>
                      <Phone className="h-3.5 w-3.5 shrink-0 text-white/90" />
                    </div>

                    {/* Chat Messages */}
                    <div className="space-y-2 p-2.5 text-[10px]">
                      {/* Bot Welcome Message */}
                      <div className="max-w-[90%] rounded-xl rounded-tl-none bg-white p-2 shadow-2xs text-slate-800">
                        <p className="font-bold text-slate-900">Hello!</p>
                        <p className="text-slate-600 mt-0.5">Book your lab test at Sharma Diagnostics</p>
                        <div className="mt-1 space-y-0.5 font-medium text-slate-700">
                          <p>1. Book a Test</p>
                          <p>2. View Reports</p>
                          <p>3. Locations</p>
                          <p>4. Talk to Support</p>
                        </div>
                        <span className="mt-1 block text-right text-[8px] text-slate-400">10:15 AM</span>
                      </div>

                      {/* User Selection */}
                      <div className="ml-auto max-w-[80%] rounded-xl rounded-tr-none bg-[#DCF8C6] p-2 shadow-2xs text-slate-800">
                        <p className="font-semibold text-slate-900">1. Book a Test</p>
                        <span className="mt-0.5 block text-right text-[8px] text-slate-500">10:16 AM</span>
                      </div>

                      {/* Bot Options Selection */}
                      <div className="max-w-[92%] rounded-xl rounded-tl-none bg-white p-2 shadow-2xs text-slate-800">
                        <p className="text-slate-700 font-medium">Please select a test or package:</p>
                        <div className="mt-1.5 space-y-1">
                          <div className="rounded-md border border-sky-200 bg-sky-50 py-0.5 text-center font-bold text-sky-700">
                            Blood Tests
                          </div>
                          <div className="rounded-md border border-slate-200 bg-white py-0.5 text-center font-medium text-slate-700">
                            Health Packages
                          </div>
                          <div className="rounded-md border border-slate-200 bg-white py-0.5 text-center font-medium text-slate-700">
                            Full Body Checkup
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Card: Online Booking (Top Right) */}
                <div className="hidden sm:flex absolute -top-3 -right-3 z-30 items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white px-3 py-2 shadow-md">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-tight">Online Booking</p>
                    <p className="text-[10px] text-slate-500">Instant patient slots</p>
                  </div>
                </div>

                {/* Floating Card: Digital Reports (Middle Right) */}
                <div className="hidden sm:flex absolute top-36 -right-6 z-30 items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white px-3 py-2 shadow-md">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-tight">Digital Reports</p>
                    <p className="text-[10px] text-slate-500">WhatsApp & Web delivery</p>
                  </div>
                </div>

                {/* Floating Card: Reports Delivered (Bottom Right Overlay) */}
                <div className="hidden sm:block absolute -bottom-8 right-24 z-30 w-52 rounded-xl border border-slate-200/90 bg-white p-3 shadow-lg">
                  <div className="flex items-center gap-1.5 text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-bold">Reports Delivered</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900 mt-1">Complete Blood Count (CBC)</p>
                  <p className="text-[10px] text-slate-500">Your report is ready</p>
                  <span className="mt-1.5 inline-block text-[10px] font-bold text-sky-600 hover:underline">
                    View Report →
                  </span>
                </div>

                {/* Floating Card: Secure Payments (Left Edge) */}
                <div className="hidden sm:flex absolute bottom-12 -left-4 z-30 items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 shadow-md">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Secure Payments</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. TRUST / METRICS STRIP ──────────────────────────────────── */}
      <section className="border-y border-slate-200 bg-white py-10 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:gap-8">
            {/* Metric 1 */}
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-600">
                <FlaskConical className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900 sm:text-3xl">500+</p>
                <p className="text-xs font-semibold text-slate-500">Tests Catalogued</p>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900 sm:text-3xl">10,000+</p>
                <p className="text-xs font-semibold text-slate-500">Happy Patients</p>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-600">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900 sm:text-3xl">100+</p>
                <p className="text-xs font-semibold text-slate-500">Partner Laboratories</p>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900 sm:text-3xl">99%</p>
                <p className="text-xs font-semibold text-slate-500">Uptime & Reliability</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. KEY FEATURES SECTION ─────────────────────────────────── */}
      <section id="features" className="bg-slate-50 py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sky-700">
              KEY FEATURES
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.6rem]">
              Everything Your Lab Needs <br className="hidden sm:inline" />
              in One Platform
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 sm:text-lg">
              From bookings to payments to report delivery — Gyrex Labs helps you run your laboratory efficiently and delight your patients.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card 1: Test Catalogue */}
            <div className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs transition hover:border-slate-300 hover:shadow-md">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">Test Catalogue</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Add individual tests and packages with flexible pricing, sample types, and fasting instructions.
                </p>
              </div>
            </div>

            {/* Card 2: Online Booking */}
            <div className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs transition hover:border-slate-300 hover:shadow-md">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">Online Booking</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Patients can search and book tests instantly, anytime, with home sample collection slot selection.
                </p>
              </div>
            </div>

            {/* Card 3: Payments & Invoicing */}
            <div className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs transition hover:border-slate-300 hover:shadow-md">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-100 bg-amber-50 text-amber-600">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">Payments &amp; Invoicing</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Accept online payments with secure Razorpay integration and automated digital patient receipts.
                </p>
              </div>
            </div>

            {/* Card 4: Report Delivery */}
            <div className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs transition hover:border-slate-300 hover:shadow-md">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-500">
                    <FileText className="h-5 w-5" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">Report Delivery</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Send digital reports with secure access links and automated WhatsApp dispatch directly to patients.
                </p>
              </div>
            </div>

            {/* Card 5: Patient Management */}
            <div className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs transition hover:border-slate-300 hover:shadow-md">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">Patient Management</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  View patient history, previous orders, and test reports in one centralized, searchable clinical record.
                </p>
              </div>
            </div>

            {/* Card 6: Storefront & Branding */}
            <div className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs transition hover:border-slate-300 hover:shadow-md">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-600">
                    <Store className="h-5 w-5" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">Storefront &amp; Branding</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Custom store URL, logo, contact information and store settings representing your unique laboratory identity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. HOW IT WORKS SECTION ─────────────────────────────────── */}
      <section id="how-it-works" className="border-y border-slate-200 bg-sky-50/50 py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="inline-flex rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-sky-700 shadow-2xs">
              HOW IT WORKS
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.6rem]">
              Get Started in 3 Simple Steps
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 sm:text-lg">
              Launch your lab&apos;s digital experience in minutes.
            </p>
          </div>

          <div className="mt-16 grid items-center gap-8 md:grid-cols-3 relative">
            {/* Step 1 */}
            <div className="relative flex flex-col items-center text-center">
              {/* Step Number Circle */}
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-sm font-bold text-white shadow-xs">
                1
              </div>

              {/* Step Card */}
              <div className="mt-5 w-full rounded-2xl border border-slate-200 bg-white p-7 shadow-xs transition hover:shadow-md">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 text-sky-600">
                  <Store className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">Set Up Your Lab</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Add your lab details, tests, packages and branding in minutes.
                </p>
              </div>

              {/* Connecting Arrow for Desktop */}
              <div className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 text-sky-400">
                <ArrowRight className="h-6 w-6" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative flex flex-col items-center text-center">
              {/* Step Number Circle */}
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white shadow-xs">
                2
              </div>

              {/* Step Card */}
              <div className="mt-5 w-full rounded-2xl border border-slate-200 bg-white p-7 shadow-xs transition hover:shadow-md">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600">
                  <Users className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">Start Receiving Bookings</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Patients can search and book tests online or via WhatsApp.
                </p>
              </div>

              {/* Connecting Arrow for Desktop */}
              <div className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 text-sky-400">
                <ArrowRight className="h-6 w-6" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative flex flex-col items-center text-center">
              {/* Step Number Circle */}
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white shadow-xs">
                3
              </div>

              {/* Step Card */}
              <div className="mt-5 w-full rounded-2xl border border-slate-200 bg-white p-7 shadow-xs transition hover:shadow-md">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50 text-teal-600">
                  <FileText className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">Deliver Reports</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Send digital reports securely and keep your patients informed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. WHY CHOOSE GYREX LABS ─────────────────────────────────── */}
      <section id="for-labs" className="bg-white py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
            {/* Left Image Column with Overlay Card */}
            <div className="relative lg:col-span-6">
              <div className="relative mx-auto max-w-[520px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
                <div className="relative h-[380px] sm:h-[440px] w-full">
                  <Image
                    src="/images/why-choose-lab.jpg"
                    alt="Clinical pathologist conducting diagnostic tests with microscope"
                    fill
                    className="object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />
                </div>

                {/* Floating Overlay Badge in Bottom-Right Corner */}
                <div className="absolute bottom-4 right-4 z-20 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-sm sm:bottom-6 sm:right-6">
                  <p className="text-xs font-bold text-slate-900">Fast. Secure. Reliable.</p>
                  <div className="mt-2 space-y-1.5 text-[11px] font-semibold text-slate-700">
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span className="text-slate-800">Online Bookings</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span className="text-slate-800">Secure Payments</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span className="text-slate-800">Digital Reports</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span className="text-slate-800">Happy Patients</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Benefits Column */}
            <div className="lg:col-span-6">
              <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sky-700">
                WHY CHOOSE GYREX LABS
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Built for Modern <br />
                Diagnostic Laboratories
              </h2>
              <p className="mt-3 text-base text-slate-600 leading-relaxed">
                A complete, easy-to-use platform designed to help laboratories grow, operate efficiently and provide a better patient experience.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* Benefit 1 */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sky-100 bg-sky-50 text-sky-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-900">Increase Bookings</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Reach more patients through online storefronts and WhatsApp channels.
                  </p>
                </div>

                {/* Benefit 2 */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-100 bg-amber-50 text-amber-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-900">Save Time</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Automate bookings, payments and report delivery with zero manual calls.
                  </p>
                </div>

                {/* Benefit 3 */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sky-100 bg-sky-50 text-sky-600">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-900">Build Trust</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Provide a professional, branded experience to your patients and doctors.
                  </p>
                </div>

                {/* Benefit 4 */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-900">Focus on Quality</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Let technology handle operations while you focus on accurate diagnostics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. PARTNER HIGHLIGHTS SECTION ───────────────────────────── */}
      <section id="testimonials" className="border-t border-slate-200 bg-slate-50 py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sky-700">
              PLATFORM HIGHLIGHTS
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.6rem]">
              Built for Diagnostic Excellence
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 sm:text-lg">
              Designed to help modern pathology and diagnostic laboratories streamline operations and elevate the patient journey.
            </p>
          </div>

          {/* Highlights Cards Grid */}
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {/* Card 1 */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-7 shadow-xs transition hover:border-sky-300 hover:shadow-md">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                  <Store className="h-3.5 w-3.5" />
                  <span>Branded Storefront</span>
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">Digital Patient Reach</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Empower patients to discover tests, review preparation requirements, and book appointments 24/7 through your own custom laboratory URL.
                </p>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Key Outcome</p>
                <p className="mt-1 text-sm font-bold text-sky-700">24/7 Self-Service Test Booking</p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-7 shadow-xs transition hover:border-emerald-300 hover:shadow-md">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>WhatsApp Flow</span>
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">Conversational Convenience</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Automate booking confirmations, home collection updates, and instant PDF report dispatch directly on WhatsApp where patients are active.
                </p>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Key Outcome</p>
                <p className="mt-1 text-sm font-bold text-emerald-700">Zero Physical Report Pickup Delays</p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-7 shadow-xs transition hover:border-amber-300 hover:shadow-md">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Direct Settlements</span>
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">Direct Financial Control</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Payments are processed through your laboratory&apos;s Razorpay account.
                </p>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Key Outcome</p>
                <p className="mt-1 text-sm font-bold text-amber-700">Direct Razorpay Processing</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. FAQ SECTION ────────────────────────────────────────────── */}
      <section id="faq" className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sky-700">
              FREQUENTLY ASKED QUESTIONS
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Common Questions from Lab Owners
            </h2>
            <p className="mt-2 text-base text-slate-600">
              Everything you need to know about setting up and running Gyrex Labs.
            </p>
          </div>

          <div className="mt-12 space-y-3.5">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 bg-white shadow-2xs transition hover:border-slate-300"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="flex w-full items-center justify-between p-5 text-left text-sm sm:text-base font-bold text-slate-900"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                        isOpen ? "rotate-180 text-sky-600" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100 px-5 pt-3 pb-5 text-sm leading-relaxed text-slate-600">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 9. FINAL PROMINENT CTA BANNER ─────────────────────────────── */}
      <section id="pricing" className="border-t border-slate-200 bg-slate-50 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-sky-200 bg-sky-50/80 p-8 sm:p-12 lg:p-16 shadow-xs">
            <div className="grid items-center gap-8 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
                  Ready to Grow Your Laboratory?
                </h2>
                <p className="mt-3 text-base text-slate-600 sm:text-lg">
                  Equip your diagnostic laboratory with modern digital bookings, direct Razorpay payments, and automated report delivery.
                </p>

                <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:items-center">
                  <Link
                    href="/lab/onboarding/signup"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-7 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-sky-600 hover:shadow-lg"
                  >
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href="mailto:labs@gyrex.in?subject=Gyrex%20Labs%20Demo%20Request"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-7 py-3.5 text-base font-semibold text-sky-600 transition hover:bg-sky-50/60"
                  >
                    <Calendar className="h-4 w-4 text-sky-500" />
                    Book a Demo
                  </a>
                </div>
              </div>

              {/* Upward Growth Visual Metric Graphic */}
              <div className="lg:col-span-4 flex justify-center lg:justify-end">
                <div className="relative flex h-36 w-48 sm:h-44 sm:w-56 items-end justify-between rounded-2xl border border-sky-200/80 bg-white/90 p-4 shadow-md backdrop-blur-xs">
                  <div className="flex w-6 flex-col items-center gap-1.5">
                    <div className="w-full h-12 rounded-t bg-sky-200" />
                    <span className="text-[10px] font-bold text-slate-500">M1</span>
                  </div>
                  <div className="flex w-6 flex-col items-center gap-1.5">
                    <div className="w-full h-18 rounded-t bg-sky-300" />
                    <span className="text-[10px] font-bold text-slate-500">M2</span>
                  </div>
                  <div className="flex w-6 flex-col items-center gap-1.5">
                    <div className="w-full h-24 rounded-t bg-sky-400" />
                    <span className="text-[10px] font-bold text-slate-500">M3</span>
                  </div>
                  <div className="flex w-6 flex-col items-center gap-1.5">
                    <div className="w-full h-32 rounded-t bg-sky-500 shadow-xs" />
                    <span className="text-[10px] font-bold text-sky-700">Live</span>
                  </div>

                  {/* Growth Arrow Indicator */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <TrendingUp className="h-3 w-3" />
                    <span>+48%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 10. FULL FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-14 text-slate-600">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
            {/* Col 1: Brand & Social */}
            <div className="lg:col-span-4">
              <Link href="/" className="inline-block">
                <img
                  src="/branding/gyrex-labs.svg"
                  alt="Gyrex Labs"
                  className="h-8 w-auto object-contain"
                />
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-500">
                A modern platform for diagnostic laboratories to manage bookings, payments and report delivery.
              </p>

              {/* Social Links */}
              <div className="mt-6 flex items-center gap-3 text-slate-400">
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white hover:text-sky-600 hover:border-sky-200 transition"
                  aria-label="LinkedIn"
                >
                  <span className="text-xs font-bold font-mono">in</span>
                </a>
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white hover:text-sky-600 hover:border-sky-200 transition"
                  aria-label="X (formerly Twitter)"
                >
                  <span className="text-xs font-bold font-mono">𝕏</span>
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white hover:text-sky-600 hover:border-sky-200 transition"
                  aria-label="Instagram"
                >
                  <span className="text-xs font-bold font-mono">ig</span>
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white hover:text-sky-600 hover:border-sky-200 transition"
                  aria-label="YouTube"
                >
                  <span className="text-xs font-bold font-mono">yt</span>
                </a>
              </div>
            </div>

            {/* Col 2: Product */}
            <div className="lg:col-span-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Product
              </h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <Link href="#features" className="hover:text-sky-600 transition">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="hover:text-sky-600 transition">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#how-it-works" className="hover:text-sky-600 transition">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="#for-labs" className="hover:text-sky-600 transition">
                    For Laboratories
                  </Link>
                </li>
                <li>
                  <Link href="#faq" className="hover:text-sky-600 transition">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Company */}
            <div className="lg:col-span-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Company
              </h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <span className="text-slate-500 cursor-default">About Us</span>
                </li>
                <li>
                  <span className="text-slate-500 cursor-default">Blog</span>
                </li>
                <li>
                  <span className="text-slate-500 cursor-default">Careers</span>
                </li>
                <li>
                  <span className="text-slate-500 cursor-default">Contact Us</span>
                </li>
              </ul>
            </div>

            {/* Col 4: Legal */}
            <div className="lg:col-span-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Legal
              </h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <span className="text-slate-500 cursor-default">Privacy Policy</span>
                </li>
                <li>
                  <span className="text-slate-500 cursor-default">Terms of Service</span>
                </li>
                <li>
                  <span className="text-slate-500 cursor-default">Refund Policy</span>
                </li>
              </ul>
            </div>

            {/* Col 5: Stay Updated */}
            <div className="lg:col-span-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Stay Updated
              </h4>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                Follow Gyrex Labs for product updates and laboratory resources.
              </p>
            </div>
          </div>

          {/* Bottom Divider & Copyright */}
          <div className="mt-12 border-t border-slate-100 pt-8 text-center text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Gyrex Labs. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
