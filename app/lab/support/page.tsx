import React from "react";
import Link from "next/link";

export default function LabSupportPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Help & Laboratory Support</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Operational documentation, FAQs, and Gyrex platform technical support contact channels.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
          <div className="text-2xl">📋</div>
          <h2 className="text-base font-bold text-white">Frequently Asked Questions</h2>
          <div className="space-y-2 text-xs text-zinc-300">
            <details className="cursor-pointer rounded-lg bg-zinc-950 p-3">
              <summary className="font-semibold text-white">How does Gyrex Labs handle patient payments?</summary>
              <p className="mt-2 text-zinc-400">
                Patients pay your laboratory directly. You can enable Pay at Collection (cash or direct UPI upon arrival) or provide your laboratory&apos;s Razorpay credentials.
              </p>
            </details>
            <details className="cursor-pointer rounded-lg bg-zinc-950 p-3">
              <summary className="font-semibold text-white">Does Gyrex Labs replace our laboratory LIS?</summary>
              <p className="mt-2 text-zinc-400">
                No. Gyrex Labs is your digital commerce and patient-facing booking storefront. Your existing LIS remains the operational system for analyzer integration and analyte verification.
              </p>
            </details>
            <details className="cursor-pointer rounded-lg bg-zinc-950 p-3">
              <summary className="font-semibold text-white">Can I change my lab&apos;s test prices at any time?</summary>
              <p className="mt-2 text-zinc-400">
                Yes. In Catalogue, you can edit selling prices or toggle active/inactive states instantly. Changes apply immediately to new patient orders.
              </p>
            </details>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
          <div className="text-2xl">📞</div>
          <h2 className="text-base font-bold text-white">Contact Platform Support</h2>
          <p className="text-xs text-zinc-400">
            For technical assistance, bulk catalogue onboarding support, or platform subscription inquiries.
          </p>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-400">Platform Ops Email:</span>
              <span className="font-mono text-sky-400">ops@gyrex.in</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Dedicated Support Desk:</span>
              <span className="font-mono text-zinc-200">+91 (800) 497-3900</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Standard Support Hours:</span>
              <span className="text-zinc-200">Mon - Sat (8:00 AM - 8:00 PM IST)</span>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/lab/dashboard"
              className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700 transition"
            >
              ← Return to Operational Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
