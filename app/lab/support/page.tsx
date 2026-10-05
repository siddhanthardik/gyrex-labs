import React from "react";
import Link from "next/link";
import { HelpCircle, Phone, Mail, Clock, ArrowLeft, FileText, ChevronDown } from "lucide-react";

export default function LabSupportPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Help & Laboratory Support
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Operational documentation, FAQs, and Gyrex platform technical support contact channels.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 items-start">
        {/* FAQ Section */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <HelpCircle className="h-5 w-5 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-2.5 text-xs">
            <details className="cursor-pointer rounded-lg bg-slate-50 border border-slate-200 p-3.5 group">
              <summary className="font-semibold text-slate-900 list-none flex items-center justify-between">
                <span>How does Gyrex Labs handle patient payments?</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-open:rotate-180 transition-transform" />
              </summary>
              <p className="mt-2 text-slate-600 leading-relaxed">
                Patients pay your laboratory directly. You can enable Pay at Collection (cash or direct UPI upon arrival) or configure your laboratory&apos;s Razorpay credentials.
              </p>
            </details>

            <details className="cursor-pointer rounded-lg bg-slate-50 border border-slate-200 p-3.5 group">
              <summary className="font-semibold text-slate-900 list-none flex items-center justify-between">
                <span>Does Gyrex Labs replace our laboratory LIS?</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-open:rotate-180 transition-transform" />
              </summary>
              <p className="mt-2 text-slate-600 leading-relaxed">
                No. Gyrex Labs is your digital commerce and patient-facing booking storefront. Your existing LIS remains the operational system for analyzer integration and analyte verification.
              </p>
            </details>

            <details className="cursor-pointer rounded-lg bg-slate-50 border border-slate-200 p-3.5 group">
              <summary className="font-semibold text-slate-900 list-none flex items-center justify-between">
                <span>Can I change my lab&apos;s test prices at any time?</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-open:rotate-180 transition-transform" />
              </summary>
              <p className="mt-2 text-slate-600 leading-relaxed">
                Yes. In Catalogue, you can edit selling prices or toggle active/inactive states instantly. Changes apply immediately to new patient orders.
              </p>
            </details>
          </div>
        </div>

        {/* Contact Support Section */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <Phone className="h-5 w-5 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900">Contact Platform Support</h2>
          </div>
          <p className="text-xs text-slate-600">
            For technical assistance, bulk catalogue onboarding support, or platform subscription inquiries.
          </p>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>Platform Ops Email:</span>
              </span>
              <span className="font-mono font-medium text-sky-700">ops@gyrex.in</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>Dedicated Support Desk:</span>
              </span>
              <span className="font-mono font-medium text-slate-900">+91 (800) 497-3900</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>Support Hours:</span>
              </span>
              <span className="text-slate-700">Mon - Sat (8:00 AM - 8:00 PM IST)</span>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/lab/dashboard"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
              <span>Return to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
