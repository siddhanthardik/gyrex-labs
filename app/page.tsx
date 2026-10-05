"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart2,
  BarChart3,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  Heart,
  Menu,
  MessageCircle,
  Package,
  Phone,
  Share2,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* ── 1. Navigation Bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo - Official SVG with no duplicate text brand */}
          <Link href="/" className="flex items-center">
            <img
              src="/branding/gyrex-labs.svg"
              alt="Gyrex Labs"
              className="h-8 sm:h-9 w-auto object-contain"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-8 text-[15px] font-medium text-slate-600 lg:flex">
            <Link href="#features" className="transition-colors hover:text-slate-900">
              Features
            </Link>
            <Link href="#how-it-works" className="transition-colors hover:text-slate-900">
              How It Works
            </Link>
            <Link href="#for-labs" className="transition-colors hover:text-slate-900">
              For Laboratories
            </Link>
            <Link href="#pricing" className="transition-colors hover:text-slate-900">
              Pricing
            </Link>
            <Link href="#testimonials" className="transition-colors hover:text-slate-900">
              Testimonials
            </Link>
            <Link href="#faq" className="transition-colors hover:text-slate-900">
              FAQ
            </Link>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-4 lg:flex">
            <Link
              href="/login"
              className="px-3 py-2 text-[15px] font-medium text-slate-700 transition-colors hover:text-[#1a73e8]"
            >
              Sign In
            </Link>
            <Link
              href="/lab/onboarding/signup"
              className="inline-flex items-center justify-center rounded-lg bg-[#1a73e8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1557b0] hover:shadow"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-3 lg:hidden">
            <Link
              href="/lab/onboarding/signup"
              className="inline-flex items-center justify-center rounded-lg bg-[#1a73e8] px-3.5 py-2 text-xs font-semibold text-white"
            >
              Get Started
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
          <div className="border-b border-slate-200 bg-white px-4 py-5 shadow-lg lg:hidden">
            <nav className="flex flex-col space-y-3 text-base font-medium text-slate-700">
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
              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-center font-semibold text-slate-800 border border-slate-200 hover:bg-slate-50"
                >
                  Sign In
                </Link>
                <Link
                  href="/lab/onboarding/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg bg-[#1a73e8] px-3 py-2.5 text-center font-semibold text-white shadow-sm"
                >
                  Get Started
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ── 2. Hero Section ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#f3f7fd]/80 via-white to-white pt-10 pb-16 sm:pt-14 sm:pb-24 lg:pt-16 lg:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
            {/* Left Copy & CTAs */}
            <div className="lg:col-span-6 xl:col-span-5">
              <p className="text-xs sm:text-[13px] font-bold tracking-[0.14em] uppercase text-[#1a73e8]">
                A modern platform for diagnostic laboratories
              </p>

              <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem] lg:leading-[1.12]">
                Turn more test bookings into{" "}
                <span className="text-[#1a73e8]">happy patients</span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                Everything your diagnostic lab needs to manage bookings, payments and report delivery — all in one simple and modern platform.
              </p>

              <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:items-center">
                <Link
                  href="/lab/onboarding/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a73e8] px-7 py-3.5 text-base font-semibold text-white shadow-md transition-all hover:bg-[#1557b0] hover:shadow-lg"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="#features"
                  className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-white px-7 py-3.5 text-base font-semibold text-[#1a73e8] transition-colors hover:bg-blue-50/50"
                >
                  Book a Demo
                </Link>
              </div>

              {/* Trust & Setup Highlights */}
              <div className="mt-10 grid grid-cols-3 gap-3 border-t border-slate-100 pt-6 sm:border-0 sm:pt-0">
                <div className="flex items-start gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900">Quick Setup</p>
                    <p className="text-[11px] sm:text-xs text-slate-500">Get started in days</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <BarChart2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900">More Bookings</p>
                    <p className="text-[11px] sm:text-xs text-slate-500">Grow your revenue</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900">Trusted by Labs</p>
                    <p className="text-[11px] sm:text-xs text-slate-500">Across India</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Hero Composite Visual Matching Reference */}
            <div className="relative lg:col-span-6 xl:col-span-7">
              <div className="relative mx-auto flex w-full max-w-[620px] items-center justify-center">
                {/* Background Lab Scientist in Pathology Environment */}
                <div className="absolute right-0 top-0 w-3/4 h-[380px] sm:h-[430px] rounded-3xl overflow-hidden shadow-md">
                  <img
                    src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80"
                    alt="Pathology specialist working in a modern diagnostic laboratory"
                    className="h-full w-full object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-transparent to-transparent" />
                </div>

                {/* Overlaid Smartphone Mockup (WhatsApp Booking Flow) */}
                <div className="relative z-20 mr-auto w-[250px] sm:w-[280px] rounded-[34px] border-[5px] border-slate-900 bg-slate-900 p-1.5 shadow-[0_25px_60px_rgba(15,23,42,0.22)]">
                  {/* Phone Screen */}
                  <div className="overflow-hidden rounded-[26px] bg-[#eef2f5]">
                    {/* WhatsApp Top Bar */}
                    <div className="flex items-center justify-between bg-[#075e54] px-3 py-2.5 text-white">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                          SD
                        </div>
                        <div>
                          <p className="text-[11px] font-bold leading-tight">Sharma Diagnostics</p>
                          <p className="text-[9px] text-emerald-200">Online</p>
                        </div>
                      </div>
                      <Phone className="h-3.5 w-3.5 text-white/90" />
                    </div>

                    {/* Chat Messages */}
                    <div className="space-y-2 p-3 text-[10.5px]">
                      {/* Bot Welcome Message */}
                      <div className="max-w-[88%] rounded-xl rounded-tl-none bg-white p-2.5 shadow-sm text-slate-800">
                        <p className="font-semibold text-slate-900">Hello!</p>
                        <p className="text-slate-600 mt-0.5">Book your lab test at Sharma Diagnostics</p>
                        <div className="mt-1.5 space-y-0.5 text-slate-700">
                          <p>1. Book a Test</p>
                          <p>2. View Reports</p>
                          <p>3. Locations</p>
                          <p>4. Talk to Support</p>
                        </div>
                        <span className="mt-1 block text-right text-[8px] text-slate-400">10:15 AM</span>
                      </div>

                      {/* User Selection */}
                      <div className="ml-auto max-w-[80%] rounded-xl rounded-tr-none bg-[#dcf8c6] p-2 shadow-sm text-slate-800">
                        <p className="font-medium">1. Book a Test</p>
                        <span className="mt-0.5 block text-right text-[8px] text-slate-500">10:16 AM</span>
                      </div>

                      {/* Bot Options Selection */}
                      <div className="max-w-[92%] rounded-xl rounded-tl-none bg-white p-2.5 shadow-sm text-slate-800">
                        <p className="text-slate-700">Please select a test or package:</p>
                        <div className="mt-2 space-y-1.5">
                          <div className="rounded-lg border border-blue-100 bg-blue-50/60 py-1 text-center font-semibold text-[#1a73e8]">
                            Blood Tests
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white py-1 text-center font-medium text-slate-700">
                            Health Packages
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white py-1 text-center font-medium text-slate-700">
                            Full Body Checkup
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overlaid Tablet/Laptop Dashboard Card (Bottom-Right) */}
                <div className="absolute -bottom-6 right-0 z-30 w-[270px] sm:w-[310px] rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_20px_50px_rgba(15,23,42,0.14)]">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <img
                      src="/branding/gyrex-labs.svg"
                      alt="Gyrex Labs"
                      className="h-5 w-auto"
                    />
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600">
                      Live Portal
                    </span>
                  </div>

                  {/* Booking & Report Deliveries */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-[#f8fafd] p-2.5 border border-slate-100">
                      <p className="text-[10px] font-medium text-slate-500">Today&apos;s Bookings</p>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-lg font-extrabold text-slate-900">24</span>
                        <span className="text-[10px] font-semibold text-emerald-600">+22%</span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-[#f8fafd] p-2.5 border border-slate-100">
                      <p className="text-[10px] font-medium text-slate-500">Reports Delivered</p>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-lg font-extrabold text-slate-900">18</span>
                        <span className="text-[10px] font-semibold text-emerald-600">+12%</span>
                      </div>
                    </div>
                  </div>

                  {/* Weekly Booking Trend Bar Chart */}
                  <div className="mt-3 rounded-xl bg-slate-50/70 p-2.5">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600">
                      <span>Bookings</span>
                      <span className="text-[#1a73e8]">This Week</span>
                    </div>
                    <div className="mt-2.5 flex h-10 items-end gap-1.5">
                      {[35, 50, 45, 65, 80, 70, 95].map((val, idx) => (
                        <div
                          key={idx}
                          className={`w-full rounded-t ${
                            idx === 6 ? "bg-[#1a73e8]" : "bg-blue-300"
                          }`}
                          style={{ height: `${val}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Features Section ("Everything for your Diagnostic Lab") ─── */}
      <section id="features" className="bg-[#f8fafd] py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1a73e8]">
              All the tools you need
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.6rem]">
              Everything for your Diagnostic Lab
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 sm:text-lg">
              A complete platform to manage patient bookings, payments, reports and more.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card 1: Online & WhatsApp Bookings */}
            <div className="rounded-2xl border border-slate-100 bg-white p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-[#1a73e8]">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900">Online &amp; WhatsApp Bookings</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Let patients book tests through your website or WhatsApp with ease.
              </p>
            </div>

            {/* Card 2: Secure Online Payments */}
            <div className="rounded-2xl border border-slate-100 bg-white p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 text-xl font-bold">
                ₹
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900">Secure Online Payments</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Accept payments directly with your own Razorpay account.
              </p>
            </div>

            {/* Card 3: Report Delivery */}
            <div className="rounded-2xl border border-slate-100 bg-white p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-600">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900">Report Delivery</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Share reports digitally on web, WhatsApp and email.
              </p>
            </div>

            {/* Card 4: Test Catalogue & Packages */}
            <div className="rounded-2xl border border-slate-100 bg-white p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-500">
                <Package className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900">Test Catalogue &amp; Packages</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Create and manage tests, profiles and health packages easily.
              </p>
            </div>

            {/* Card 5: Orders & Patient Management */}
            <div className="rounded-2xl border border-slate-100 bg-white p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900">Orders &amp; Patient Management</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Manage all your bookings, patients and reports in one place.
              </p>
            </div>

            {/* Card 6: Multiple Locations */}
            <div className="rounded-2xl border border-slate-100 bg-white p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900">Multiple Locations</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Manage one or more collection centres and home sample collection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. How It Works Section ("Get started in 3 simple steps") ── */}
      <section id="how-it-works" className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1a73e8]">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.6rem]">
              Get started in 3 simple steps
            </h2>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3 relative">
            {/* Step 1 */}
            <div className="relative rounded-2xl border border-slate-100 bg-[#f8fafd] p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-[#1a73e8]">
                <FileText className="h-7 w-7" />
              </div>
              <div className="mx-auto -mt-3.5 mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#1a73e8] text-xs font-bold text-white shadow">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900">Set up your lab</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Add your tests, packages and locations.
              </p>
              {/* Desktop arrow connector */}
              <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                <ChevronRight className="h-8 w-8 text-slate-300" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative rounded-2xl border border-slate-100 bg-[#f8fafd] p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-[#1a73e8]">
                <Share2 className="h-7 w-7" />
              </div>
              <div className="mx-auto -mt-3.5 mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#1a73e8] text-xs font-bold text-white shadow">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900">Start receiving bookings</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Patients book from your website or WhatsApp.
              </p>
              {/* Desktop arrow connector */}
              <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                <ChevronRight className="h-8 w-8 text-slate-300" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative rounded-2xl border border-slate-100 bg-[#f8fafd] p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-[#1a73e8]">
                <TrendingUp className="h-7 w-7" />
              </div>
              <div className="mx-auto -mt-3.5 mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#1a73e8] text-xs font-bold text-white shadow">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900">Deliver reports &amp; grow</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Share reports and keep your patients coming back.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Benefits Section ("Built for modern diagnostic laboratories") ── */}
      <section id="for-labs" className="bg-[#f8fafd] py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
            {/* Left Outcomes Checklist */}
            <div className="lg:col-span-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1a73e8]">
                Why labs choose Gyrex Lab
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Built for modern diagnostic laboratories
              </h2>
              <p className="mt-3 text-base text-slate-600">
                Save time, increase efficiency and give your patients a better experience.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">
                    Higher test bookings through digital channels
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <Clock className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">
                    Less manual work and fewer phone calls
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <Users className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">
                    Better patient experience and trust
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                    <BarChart2 className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">
                    Grow revenue with minimal effort
                  </span>
                </div>
              </div>
            </div>

            {/* Center Patient Visual with Floating Ready Report Notification */}
            <div className="relative lg:col-span-5">
              <div className="relative mx-auto max-w-[420px] overflow-hidden rounded-3xl shadow-lg">
                <img
                  src="https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=700&q=80"
                  alt="Patient happily checking diagnostic test report on smartphone"
                  className="h-[360px] sm:h-[420px] w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />
              </div>

              {/* Floating Report Notification Card */}
              <div className="absolute -bottom-6 inset-x-4 sm:inset-x-8 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Check className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Your Test Report is Ready</p>
                      <p className="text-xs text-slate-500">Your Blood Test report is now available.</p>
                    </div>
                  </div>
                  <Link
                    href="/lab/onboarding/signup"
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#1a73e8] hover:underline"
                  >
                    View Report
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Right 4 Outcome Cards */}
            <div className="mt-8 lg:mt-0 lg:col-span-3 flex flex-col gap-3.5">
              <div className="flex items-center gap-3.5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-[#1a73e8]">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">More Bookings</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 text-lg font-bold">
                  ₹
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Higher Revenue</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Save Time</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-500">
                  <Heart className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Happier Patients</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Testimonials Section ("What our lab partners say") ─────── */}
      <section id="testimonials" className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1a73e8]">
              Trusted by diagnostic laboratories
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.6rem]">
              What our lab partners say
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {/* Testimonial 1 */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-[#f8fafd] p-7 shadow-sm">
              <p className="text-sm leading-relaxed text-slate-700 italic">
                &ldquo;Gyrex Lab has made our online bookings and report sharing very simple. Our patients love the ease of using WhatsApp.&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3.5 border-t border-slate-200/60 pt-4">
                <img
                  src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=120&h=120&q=80"
                  alt="Dr. Amit Sharma"
                  className="h-11 w-11 rounded-full object-cover border border-white shadow-sm"
                />
                <div>
                  <p className="text-sm font-bold text-slate-900">Dr. Amit Sharma</p>
                  <p className="text-xs text-slate-500">Sharma Diagnostics, New Delhi</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-[#f8fafd] p-7 shadow-sm">
              <p className="text-sm leading-relaxed text-slate-700 italic">
                &ldquo;We have seen a clear increase in test bookings since using Gyrex Lab. The platform is easy to manage and very reliable.&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3.5 border-t border-slate-200/60 pt-4">
                <img
                  src="https://images.unsplash.com/photo-1594824813639-4507005476a8?auto=format&fit=crop&w=120&h=120&q=80"
                  alt="Dr. Neha Gupta"
                  className="h-11 w-11 rounded-full object-cover border border-white shadow-sm"
                />
                <div>
                  <p className="text-sm font-bold text-slate-900">Dr. Neha Gupta</p>
                  <p className="text-xs text-slate-500">LifeCare Diagnostic Centre, Noida</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-[#f8fafd] p-7 shadow-sm">
              <p className="text-sm leading-relaxed text-slate-700 italic">
                &ldquo;The support team is responsive and the platform works smoothly. It has helped us save time and serve more patients.&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3.5 border-t border-slate-200/60 pt-4">
                <img
                  src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=120&h=120&q=80"
                  alt="Dr. Rajesh Mehta"
                  className="h-11 w-11 rounded-full object-cover border border-white shadow-sm"
                />
                <div>
                  <p className="text-sm font-bold text-slate-900">Dr. Rajesh Mehta</p>
                  <p className="text-xs text-slate-500">Apex Clinical Laboratory, Gurugram</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. FAQ Section ────────────────────────────────────────────── */}
      <section id="faq" className="bg-[#f8fafd] py-20 md:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1a73e8]">
              Frequently Asked Questions
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Common questions from lab owners
            </h2>
          </div>

          <div className="mt-12 space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">
                What does Gyrex Labs help with?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                It gives your diagnostic laboratory a branded digital booking flow, WhatsApp booking integration, digital report delivery, and direct payment collection without disrupting your daily lab operations.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">
                Does it replace our existing laboratory billing software?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                No. Gyrex Labs complements your existing systems by bringing your patient-facing services online, so your laboratory team can continue testing as usual while serving patients with digital convenience.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">
                Can it support multiple collection centres?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Yes. Gyrex Labs supports multi-centre management and home sample collection dispatch with individual location tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. Bottom CTA Banner ("Start your journey with Gyrex Lab today") */}
      <section id="pricing" className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-r from-[#edf4fe] via-[#edf5ff] to-[#e4efff] p-8 sm:p-12 lg:p-16 shadow-sm">
            <div className="grid items-center gap-8 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1a73e8]">
                  Ready to grow your lab?
                </p>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
                  Start your journey with Gyrex Lab today
                </h2>
                <p className="mt-3 text-base text-slate-600 sm:text-lg">
                  Get your lab online, accept more bookings and deliver reports effortlessly.
                </p>

                <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:items-center">
                  <Link
                    href="/lab/onboarding/signup"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a73e8] px-7 py-3.5 text-base font-semibold text-white shadow-md transition-all hover:bg-[#1557b0] hover:shadow-lg"
                  >
                    Get Started Now
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="#features"
                    className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-white px-7 py-3.5 text-base font-semibold text-[#1a73e8] transition-colors hover:bg-blue-50/50"
                  >
                    Book a Demo
                  </Link>
                </div>

                <div className="mt-8 flex flex-wrap gap-4 text-xs sm:text-sm text-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Check className="h-3 w-3" />
                    </div>
                    <span>Quick onboarding</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Check className="h-3 w-3" />
                    </div>
                    <span>Dedicated support</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Check className="h-3 w-3" />
                    </div>
                    <span>Trusted by leading labs</span>
                  </div>
                </div>
              </div>

              {/* Lab Specialists Image on the Right */}
              <div className="lg:col-span-5 flex justify-center lg:justify-end">
                <img
                  src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=700&q=80"
                  alt="Pathology professionals analyzing lab diagnostic reports"
                  className="h-[250px] sm:h-[300px] w-full max-w-[420px] rounded-2xl object-cover shadow-md border-2 border-white"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 bg-white py-14 text-slate-600">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-2">
              <Link href="/" className="inline-block">
                <img
                  src="/branding/gyrex-labs.svg"
                  alt="Gyrex Labs"
                  className="h-8 w-auto object-contain"
                />
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-500">
                A modern digital platform for diagnostic laboratories to present services, manage bookings, and deliver reports more clearly.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Product
              </h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <Link href="#features" className="hover:text-slate-900 transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#how-it-works" className="hover:text-slate-900 transition-colors">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="#for-labs" className="hover:text-slate-900 transition-colors">
                    For Laboratories
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="hover:text-slate-900 transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#faq" className="hover:text-slate-900 transition-colors">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Access
              </h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <Link href="/login" className="hover:text-slate-900 transition-colors">
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link href="/lab/onboarding/signup" className="hover:text-slate-900 transition-colors">
                    Get Started
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-slate-100 pt-8 text-center text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Gyrex Labs. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
