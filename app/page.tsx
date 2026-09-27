import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// ─── Icon components (inline SVG — no extra dependencies) ────────────────────

function IconBarChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="w-6 h-6">
      <rect x="3" y="12" width="4" height="9" rx="1" /><rect x="10" y="7" width="4" height="14" rx="1" /><rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  );
}
function IconStore() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="w-6 h-6">
      <path d="M3 9l1-5h16l1 5" /><path d="M3 9a2 2 0 0 0 4 0m0 0a2 2 0 0 0 4 0m0 0a2 2 0 0 0 4 0m0 0a2 2 0 0 0 4 0" /><path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="w-6 h-6">
      <path d="M12 3l7 3.5V12c0 4.5-3.5 7.9-7 9-3.5-1.1-7-4.5-7-9V6.5L12 3z" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="w-6 h-6">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="w-6 h-6">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconClipboard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="w-6 h-6">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" />
    </svg>
  );
}
function IconLink() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="w-6 h-6">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="w-4 h-4 shrink-0">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconArrowRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="w-4 h-4">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

// ─── Data ────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: <IconStore />,
    title: "Your Lab. Your Storefront.",
    body: "Each lab gets a dedicated, branded online presence at your own URL — complete with test catalogue, pricing, and direct patient booking.",
  },
  {
    icon: <IconClipboard />,
    title: "Order & Report Management",
    body: "Receive test orders digitally. Attach signed PDF reports securely. Patients download their results directly — no manual coordination required.",
  },
  {
    icon: <IconBell />,
    title: "Automated Patient Notifications",
    body: "Patients are notified when their report is ready. Reduce front-desk call volume and streamline status tracking from day one.",
  },
  {
    icon: <IconBarChart />,
    title: "Real-Time Business Analytics",
    body: "Track test demand, order volume, and patient trends across your laboratory from a single management dashboard.",
  },
  {
    icon: <IconUsers />,
    title: "Multi-Branch Ready",
    body: "Manage multiple collection centres and branches under one account. Centralise operations without losing branch-level visibility.",
  },
  {
    icon: <IconShield />,
    title: "Compliance-Grade Security",
    body: "Encrypted report storage with signed, time-limited download URLs. Patient data is protected with enterprise-grade access controls.",
  },
];

const steps = [
  {
    number: "01",
    title: "Request access & onboard",
    body: "We set up your lab account, configure your storefront URL, and import your existing test catalogue.",
  },
  {
    number: "02",
    title: "Go live — your way",
    body: "Share your dedicated storefront link with patients via SMS, WhatsApp, or local marketing. Accessible on any browser without app installation.",
  },
  {
    number: "03",
    title: "Manage from your dashboard",
    body: "Accept orders, track sample collection, upload diagnostic reports, and manage operations from any modern device.",
  },
  {
    number: "04",
    title: "Grow with data",
    body: "Use built-in analytics to understand your top diagnostic tests, peak ordering times, and operational performance.",
  },
];

const factualLabBenefits = [
  {
    title: "Digital Bookings",
    desc: "Accept patient test bookings online directly through your branded storefront without manual phone intake.",
  },
  {
    title: "Online Test Catalogue",
    desc: "Display tests, health packages, and transparent pricing customized specifically for your laboratory.",
  },
  {
    title: "Home Collection Management",
    desc: "Capture home collection requests with patient address details and coordinate phlebotomist visits seamlessly.",
  },
  {
    title: "Secure Report Delivery",
    desc: "Upload signed diagnostic reports with encrypted storage and secure, time-limited download links for patients.",
  },
  {
    title: "Centralized Laboratory Management",
    desc: "Manage test orders, patient records, and operational workflows from a unified administrative dashboard.",
  },
  {
    title: "Digital Presence",
    desc: "Establish a modern, dedicated digital identity for your lab to serve patients and local healthcare networks.",
  },
];

const securityPoints = [
  "All reports stored in encrypted, access-controlled private storage",
  "Signed, time-limited download links — no public file URLs ever",
  "Full audit trail on every file access and report download",
  "HTTPS everywhere with strict CORS and CSP headers",
];

const faqItems = [
  {
    q: "Do I need to replace my existing LIS or billing software?",
    a: "No. Gyrex Labs is the patient-engagement and digital commerce layer for your lab. You keep running your existing LIS, LIMS, or accounting tools. We sit alongside them, not on top.",
  },
  {
    q: "How does onboarding work for a new laboratory?",
    a: "Our team assists with your account configuration, test catalogue import, and storefront URL activation so your team can begin accepting digital orders smoothly.",
  },
  {
    q: "Is there a long-term contract or lock-in?",
    a: "No long-term lock-ins. We offer flexible terms. Your laboratory data remains fully exportable at all times.",
  },
  {
    q: "Can I manage multiple branches or collection centres?",
    a: "Yes. Gyrex Labs supports multi-branch operations. Each branch can have its own operational view while you retain consolidated management oversight.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  // Route admin-labs.gyrex.in directly to superadmin login
  const headersList = await headers();
  const host = headersList.get("host") || "";
  if (host.includes("admin-labs")) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased">
      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-blue-700">Gyrex Labs</span>
            <span className="hidden rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 sm:inline">B2B Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors sm:block">
              Lab Login
            </Link>
            <a
              href="mailto:labs@gyrex.in?subject=Gyrex Labs — Onboarding enquiry"
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition-colors"
            >
              Request Access
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 py-24 lg:py-36">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                </span>
                B2B Platform for Diagnostic Laboratories
              </div>
              <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl lg:text-6xl">
                The digital storefront for your diagnostic lab.
              </h1>
              <p className="mb-10 text-lg text-blue-100 leading-relaxed md:text-xl">
                Give patients a modern online experience — from digital bookings to secure report delivery — without disrupting the systems you already rely on. Built for diagnostic laboratory owners, management, and laboratory chains.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <a
                  href="mailto:labs@gyrex.in?subject=Gyrex Labs — Onboarding enquiry"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-blue-700 shadow-lg hover:bg-blue-50 transition-colors"
                >
                  Get your lab online
                  <IconArrowRight />
                </a>
                <a
                  href="#storefront-demo"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-8 py-4 text-base font-semibold text-white hover:bg-white/20 transition-colors backdrop-blur-sm"
                >
                  View demo storefront
                </a>
              </div>
            </div>
            {/* Storefront preview card */}
            <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md shadow-2xl">
              <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/5 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-red-400/80" />
                <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
                <span className="h-3 w-3 rounded-full bg-green-400/80" />
                <span className="ml-4 rounded-md bg-white/10 px-3 py-1 text-xs text-white/70 font-mono tracking-wide">
                  labs.gyrex.in/sharma-diagnostics
                </span>
              </div>
              <div className="p-5 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-white text-base">Sharma Diagnostics</p>
                  <span className="rounded bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white">Storefront Preview</span>
                </div>
                <p className="text-blue-100 text-xs mb-4">Diagnostic Pathology &amp; Imaging · Connaught Place, New Delhi</p>
                <div className="space-y-2">
                  {[
                    ["Complete Blood Count (CBC)", "₹ 350"],
                    ["HbA1c (Glycated Haemoglobin)", "₹ 550"],
                    ["Lipid Profile Panel", "₹ 700"],
                    ["Thyroid Stimulating Hormone (TSH)", "₹ 400"],
                  ].map(([test, price]) => (
                    <div key={test} className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2">
                      <span className="text-white/90 text-xs">{test}</span>
                      <span className="text-green-300 font-semibold text-xs">{price}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/sharma-diagnostics"
                  className="mt-4 block rounded-lg bg-white/20 py-2.5 text-center text-xs font-bold text-white hover:bg-white/30 transition-colors"
                >
                  View full laboratory storefront →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── POSITIONING BANNER ── */}
      <section className="border-y border-slate-100 bg-slate-50 py-12">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600">Our positioning</p>
          <h2 className="mx-auto max-w-3xl text-2xl font-bold text-slate-900 leading-snug md:text-3xl">
            We are the digital storefront and patient engagement layer — not a replacement for your LIS or billing software.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-500 text-base leading-relaxed">
            Your existing Lab Information System (LIS), LIMS, and accounting tools keep running exactly as before. Gyrex Labs adds the branded online presence, digital report delivery, and patient ordering layer on top — without disrupting your internal laboratory workflow.
          </p>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600">Platform capabilities</p>
            <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">Everything your lab needs to go digital</h2>
            <p className="mt-3 text-slate-500 mx-auto max-w-xl">One centralized platform for online storefronts, orders, and secure report distribution.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-100 transition-all"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                  {f.icon}
                </div>
                <h3 className="mb-2 text-base font-semibold text-slate-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="bg-slate-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600">Onboarding</p>
            <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">A structured path to going digital</h2>
            <p className="mt-3 text-slate-500 mx-auto max-w-xl">We assist with configuration and catalogue onboarding so your team can focus on lab operations.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-4">
            {steps.map((s) => (
              <div key={s.number} className="flex flex-col gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-700 text-xl font-extrabold text-white shadow-md">
                  {s.number}
                </div>
                <h3 className="text-base font-semibold text-slate-900">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LAB OWNER BENEFITS ── */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-3xl bg-gradient-to-br from-blue-700 to-indigo-800 px-8 py-14 md:px-14 lg:px-20">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 lg:items-center">
              <div className="text-white">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-300">Built for lab owners &amp; management</p>
                <h2 className="mb-5 text-3xl font-bold leading-snug md:text-4xl">
                  Your lab. Your brand. Your operations.
                </h2>
                <p className="text-blue-100 leading-relaxed text-base mb-8">
                  Every storefront is branded specifically to your laboratory. Patients see your lab name, contact information, and customized test catalogue. Gyrex Labs provides the digital infrastructure while your brand remains front and center.
                </p>
                <a
                  href="mailto:labs@gyrex.in?subject=Gyrex Labs — Onboarding enquiry"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-bold text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  Start the conversation
                  <IconArrowRight />
                </a>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {factualLabBenefits.map((item) => (
                  <div key={item.title} className="rounded-xl bg-white/10 p-4 backdrop-blur-sm border border-white/10">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/30 text-blue-200">
                        <IconCheck />
                      </span>
                      <h3 className="font-semibold text-white text-sm">{item.title}</h3>
                    </div>
                    <p className="text-xs text-blue-100/90 leading-relaxed pl-7">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DASHBOARD SHOWCASE ── */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-600">Lab Dashboard</p>
              <h2 className="mb-5 text-3xl font-bold text-slate-900 leading-snug md:text-4xl">
                Manage your entire lab from one place
              </h2>
              <p className="mb-8 text-slate-500 leading-relaxed">
                The Gyrex Lab dashboard gives your administrative and lab staff control over incoming orders, report distribution, test catalogue management, and branch operations.
              </p>
              <ul className="space-y-3">
                {[
                  "View and manage all incoming test bookings in real time",
                  "Upload signed reports directly with automatic patient notification",
                  "Configure your test catalogue, packages, and pricing",
                  "Operational metrics: order volume, test categories, status breakdown",
                  "Multi-branch order routing and centralized administrative oversight",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <IconCheck />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* Dashboard mockup */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-slate-200" />
                  <span className="h-3 w-3 rounded-full bg-slate-200" />
                  <span className="h-3 w-3 rounded-full bg-slate-200" />
                </div>
                <span className="ml-2 text-xs font-mono text-slate-400">Gyrex Lab Dashboard</span>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Orders today", value: "24" },
                    { label: "Pending reports", value: "6" },
                    { label: "Active catalogue", value: "148 tests" },
                  ].map((m) => (
                    <div key={m.label} className="rounded-xl bg-slate-50 p-3 text-center">
                      <p className="text-lg font-bold text-blue-700">{m.value}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{m.label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Recent orders</p>
                <div className="space-y-2">
                  {[
                    { name: "Order #GL-2026-081", test: "Complete Blood Count (CBC)", status: "Report ready", color: "bg-green-100 text-green-700" },
                    { name: "Order #GL-2026-082", test: "Lipid Profile Panel", status: "Processing", color: "bg-yellow-100 text-yellow-700" },
                    { name: "Order #GL-2026-083", test: "HbA1c", status: "Sample collected", color: "bg-blue-100 text-blue-700" },
                  ].map((order) => (
                    <div key={order.name} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-2.5 text-sm">
                      <div>
                        <p className="font-medium text-slate-800">{order.name}</p>
                        <p className="text-xs text-slate-400">{order.test}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${order.color}`}>
                        {order.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STOREFRONT DEMONSTRATION ── */}
      <section id="storefront-demo" className="py-24 border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-600">Product Demonstration</p>
              <h2 className="mb-5 text-3xl font-bold text-slate-900 leading-snug md:text-4xl">
                Give Your Laboratory Its Own Digital Storefront
              </h2>
              <p className="mb-6 text-slate-600 leading-relaxed">
                Each laboratory on Gyrex Labs gets its own branded digital storefront. Patients can explore your complete test catalogue, book diagnostic tests online, and securely download verified PDF reports under your lab&apos;s identity.
              </p>
              <ul className="mb-8 space-y-3">
                {[
                  "Dedicated URL for your lab (e.g., labs.gyrex.in/sharma-diagnostics)",
                  "Branded with your laboratory name, address, and credentials",
                  "Complete online test catalogue with prices and turnaround details",
                  "Direct test booking and home collection request workflows",
                  "Secure digital report delivery for patient convenience",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <IconCheck />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Link
                  href="/sharma-diagnostics"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-6 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-blue-800 transition-colors"
                >
                  <span>Explore Demo Storefront</span>
                  <IconArrowRight />
                </Link>
                <span className="text-xs text-slate-500 font-mono">
                  labs.gyrex.in/sharma-diagnostics
                </span>
              </div>
            </div>
            {/* Storefront preview card */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-red-400" />
                    <span className="h-3 w-3 rounded-full bg-yellow-400" />
                    <span className="h-3 w-3 rounded-full bg-green-400" />
                  </div>
                  <span className="ml-3 text-xs font-mono text-slate-500">
                    labs.gyrex.in/sharma-diagnostics
                  </span>
                </div>
                <Link
                  href="/sharma-diagnostics"
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  Open Storefront ↗
                </Link>
              </div>
              <div className="p-6">
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 mb-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 text-base">Sharma Diagnostics</p>
                      <p className="text-xs text-slate-500 mt-0.5">Connaught Place, New Delhi · Dedicated Storefront</p>
                    </div>
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                      Live Storefront Demo
                    </span>
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Sample Test Catalogue</p>
                <div className="space-y-2.5">
                  {[
                    { name: "Complete Blood Count (CBC)", price: "₹ 350", turnaround: "Same day report" },
                    { name: "HbA1c (Glycated Haemoglobin)", price: "₹ 550", turnaround: "Within 24 hours" },
                    { name: "Lipid Profile Panel", price: "₹ 700", turnaround: "Same day report" },
                    { name: "Thyroid Stimulating Hormone (TSH)", price: "₹ 400", turnaround: "Same day report" },
                  ].map((test) => (
                    <div key={test.name} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:border-slate-200 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{test.name}</p>
                        <p className="text-xs text-slate-400">{test.turnaround}</p>
                      </div>
                      <span className="text-sm font-bold text-blue-700">{test.price}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Each lab receives its own digital storefront</span>
                  <Link
                    href="/sharma-diagnostics"
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    View /sharma-diagnostics →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECURITY ── */}
      <section id="security" className="bg-slate-900 py-24 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-400">Security &amp; compliance</p>
              <h2 className="mb-5 text-3xl font-bold leading-snug md:text-4xl">
                Diagnostic data protected. Your lab reputation secured.
              </h2>
              <p className="mb-8 text-slate-300 leading-relaxed">
                Medical reports are sensitive health data. Gyrex Labs is engineered with secure storage and strict access controls as core foundational requirements.
              </p>
              <ul className="space-y-4">
                {securityPoints.map((pt) => (
                  <li key={pt} className="flex items-start gap-3 text-slate-200 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-900 text-blue-300">
                      <IconCheck />
                    </span>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: <IconShield />, label: "Encrypted diagnostic report storage" },
                { icon: <IconLink />, label: "Time-limited signed download links" },
                { icon: <IconClipboard />, label: "Access audit logs for compliance" },
                { icon: <IconBarChart />, label: "HTTPS + strict transport security" },
              ].map((item) => (
                <div key={item.label} className="flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-800 p-5">
                  <span className="text-blue-400">{item.icon}</span>
                  <p className="text-sm font-medium text-slate-200 leading-snug">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 bg-white">
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600">Common questions</p>
            <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">Frequently asked questions</h2>
          </div>
          <div className="space-y-6">
            {faqItems.map((item) => (
              <div key={item.q} className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
                <h3 className="mb-2 font-semibold text-slate-900">{item.q}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-gradient-to-br from-blue-700 to-indigo-700 py-24 text-white">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-extrabold md:text-4xl">
            Ready to give your lab its own digital storefront?
          </h2>
          <p className="mb-10 text-blue-100 text-lg leading-relaxed">
            Partner with Gyrex Labs to provide your patients with seamless online bookings and secure report delivery under your laboratory&apos;s own brand.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="mailto:labs@gyrex.in?subject=Gyrex Labs — Onboarding enquiry"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-blue-700 shadow-lg hover:bg-blue-50 transition-colors"
            >
              Get your lab online today
              <IconArrowRight />
            </a>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-white/30 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Lab login →
            </Link>
          </div>
          <p className="mt-8 text-sm text-blue-200">
            Dedicated digital presence · Customized test catalogue · Secure report distribution
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-100 bg-white py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xs">
              <span className="text-lg font-bold text-blue-700">Gyrex Labs</span>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                The B2B digital platform for diagnostic laboratories. Powering branded storefronts, online test bookings, and secure report distribution.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 text-sm">
              <div>
                <p className="font-semibold text-slate-900 mb-3">Platform</p>
                <ul className="space-y-2 text-slate-500">
                  <li><a href="#features" className="hover:text-blue-600 transition-colors">Features</a></li>
                  <li><a href="#how-it-works" className="hover:text-blue-600 transition-colors">Onboarding</a></li>
                  <li><a href="#storefront-demo" className="hover:text-blue-600 transition-colors">Demo Storefront</a></li>
                  <li><a href="#security" className="hover:text-blue-600 transition-colors">Security</a></li>
                  <li><a href="#faq" className="hover:text-blue-600 transition-colors">FAQ</a></li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-900 mb-3">Lab access</p>
                <ul className="space-y-2 text-slate-500">
                  <li><Link href="/login" className="hover:text-blue-600 transition-colors">Lab login</Link></li>
                  <li>
                    <a
                      href="mailto:labs@gyrex.in?subject=Gyrex Labs — Onboarding enquiry"
                      className="hover:text-blue-600 transition-colors"
                    >
                      Request access
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-900 mb-3">Contact</p>
                <ul className="space-y-2 text-slate-500">
                  <li>
                    <a href="mailto:labs@gyrex.in" className="hover:text-blue-600 transition-colors">
                      labs@gyrex.in
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-slate-100 pt-6 flex flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Gyrex Labs. All rights reserved.</p>
            <p>A product by <a href="https://gyrex.in" className="hover:text-blue-600 transition-colors">Gyrex</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
