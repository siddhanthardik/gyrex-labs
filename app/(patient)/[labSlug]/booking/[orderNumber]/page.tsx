import { notFound } from "next/navigation";
import { getOrderTracking } from "@/services/orders/patient-order-service";
import {
  CheckCircle,
  Clock,
  Home,
  MapPin,
  Phone,
  FileText,
  FlaskConical,
  ShieldCheck,
  Calendar,
  User,
  MessageCircle,
  Share2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { OrderStatus, CollectionType, PaymentStatus } from "@prisma/client";
import PatientPaymentAction from "@/components/patient/patient-payment-action";

function StatusBadge({ status }: { status: OrderStatus }) {
  const config: Record<OrderStatus, { label: string; color: string }> = {
    PENDING_PAYMENT: { label: "Awaiting Payment", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" },
    CONFIRMED: { label: "Confirmed", color: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300" },
    COLLECTION_SCHEDULED: { label: "Collection Scheduled", color: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300" },
    SAMPLE_COLLECTED: { label: "Sample Collected", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" },
    PROCESSING: { label: "Processing in Lab", color: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" },
    REPORT_READY: { label: "Report Ready", color: "bg-emerald-600 text-white" },
    COMPLETED: { label: "Completed", color: "bg-emerald-700 text-white" },
    CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300" },
  };
  const { label, color } = config[status] || { label: status, color: "bg-zinc-100 text-zinc-600" };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${color}`}>{label}</span>
  );
}

const TIMELINE_STEPS: { status: OrderStatus; label: string; desc: string }[] = [
  { status: "CONFIRMED", label: "Booking Confirmed", desc: "Diagnostic booking received & registered" },
  { status: "COLLECTION_SCHEDULED", label: "Phlebotomist Assigned", desc: "Sample pickup slot reserved" },
  { status: "SAMPLE_COLLECTED", label: "Sample Collected", desc: "Sample barcoded & safely transported" },
  { status: "PROCESSING", label: "Lab Processing", desc: "Analyzed on NABL-compliant equipment" },
  { status: "REPORT_READY", label: "Report Ready", desc: "Digital report verified by pathologist" },
  { status: "COMPLETED", label: "Completed", desc: "Report delivered via WhatsApp & Web" },
];

const STATUS_ORDER: Record<string, number> = {
  PENDING_PAYMENT: 0,
  CONFIRMED: 1,
  COLLECTION_SCHEDULED: 2,
  SAMPLE_COLLECTED: 3,
  PROCESSING: 4,
  REPORT_READY: 5,
  COMPLETED: 6,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ labSlug: string; orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  return {
    title: `Booking Confirmed — ${orderNumber}`,
    description: `Track your diagnostic booking ${orderNumber}`,
  };
}

export default async function BookingConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ labSlug: string; orderNumber: string }>;
  searchParams?: Promise<{ payNow?: string; phone?: string }>;
}) {
  const { labSlug, orderNumber } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const autoTrigger = resolvedSearchParams.payNow === "true";
  const phone = resolvedSearchParams.phone;

  const tracking = await getOrderTracking(orderNumber);

  if (!tracking) {
    notFound();
  }

  const currentStatusIndex = STATUS_ORDER[tracking.orderStatus] ?? 1;
  const isLabVisit = tracking.collectionType === CollectionType.LAB_VISIT;
  const isAwaitingPayment =
    tracking.orderStatus === OrderStatus.PENDING_PAYMENT ||
    tracking.paymentStatus === PaymentStatus.PENDING;

  return (
    <div className="mx-auto max-w-xl px-4 py-4 sm:px-6 space-y-4">
      {/* If awaiting payment: render interactive Razorpay Payment Action Card */}
      {isAwaitingPayment ? (
        <PatientPaymentAction
          orderId={tracking.orderId}
          orderNumber={tracking.orderNumber}
          labSlug={labSlug}
          labName={tracking.lab.name}
          totalAmount={tracking.totalAmount}
          patientName={tracking.patientName}
          patientPhone={phone || tracking.patientPhoneMasked}
          orderStatus={tracking.orderStatus}
          paymentStatus={tracking.paymentStatus}
          autoTrigger={autoTrigger}
        />
      ) : (
        /* Reference Screen 2: Success Confirmation Card */
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-sm">
                <CheckCircle className="h-7 w-7" />
              </div>
              <div>
                <span className="inline-block rounded-full bg-emerald-800/60 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-200">
                  Payment &amp; Booking Confirmed
                </span>
                <h1 className="text-xl font-extrabold text-white mt-1">Booking Confirmed!</h1>
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs text-emerald-100 leading-relaxed">
            Your diagnostic test appointment with <strong>{tracking.lab.name}</strong> is confirmed. A copy will be sent to your mobile.
          </p>

          {/* Quick details grid */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
              <p className="text-[11px] text-emerald-200 font-medium">Booking ID</p>
              <p className="mt-0.5 font-mono text-sm font-extrabold text-white">{tracking.orderNumber}</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
              <p className="text-[11px] text-emerald-200 font-medium">Patient</p>
              <p className="mt-0.5 text-sm font-extrabold text-white truncate">{tracking.patientName}</p>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp-Style Lab Interaction Banner (Reference Screen 10) */}
      <div className="flex items-center justify-between rounded-3xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
              Need assistance with your booking?
            </h2>
            <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
              Chat directly with {tracking.lab.name}
            </p>
          </div>
        </div>
        <a
          href={`https://wa.me/91${tracking.lab.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${tracking.lab.name}, I have a query regarding my booking ${tracking.orderNumber} for ${tracking.patientName}.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition"
        >
          WhatsApp
        </a>
      </div>

      {/* Reference Screen 1: Track Your Booking / Live Timeline */}
      <div className="rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              <Clock className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white">
              Track Your Booking
            </h2>
          </div>
          <StatusBadge status={tracking.orderStatus} />
        </div>

        {/* Vertical Timeline */}
        <div className="relative pl-1">
          {TIMELINE_STEPS.map((step, idx) => {
            const isDone = STATUS_ORDER[step.status] <= currentStatusIndex;
            const isCurrent = step.status === tracking.orderStatus;
            const isLast = idx === TIMELINE_STEPS.length - 1;

            return (
              <div key={step.status} className="relative flex gap-3.5 pb-4 last:pb-0">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs transition ${
                      isDone
                        ? "bg-emerald-600 text-white shadow-sm"
                        : isCurrent
                        ? "border-2 border-sky-600 bg-sky-50 text-sky-700 font-bold dark:bg-sky-950"
                        : "border border-zinc-300 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle className="h-3.5 w-3.5" />
                    ) : (
                      <span className="text-[10px] font-bold">{idx + 1}</span>
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className={`w-0.5 flex-1 my-1 ${
                        STATUS_ORDER[step.status] < currentStatusIndex
                          ? "bg-emerald-500"
                          : "bg-zinc-200 dark:bg-zinc-800"
                      }`}
                      style={{ minHeight: "1.25rem" }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p
                    className={`text-xs font-bold leading-tight ${
                      isDone
                        ? "text-zinc-900 dark:text-white"
                        : isCurrent
                        ? "text-sky-700 dark:text-sky-300"
                        : "text-zinc-400 dark:text-zinc-500"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Collection / Slot Details Card */}
      {tracking.collection && (
        <div className="rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              {isLabVisit ? <MapPin className="h-4 w-4" /> : <Home className="h-4 w-4" />}
            </div>
            <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white">
              {isLabVisit ? "Lab Visit Details" : "Home Collection Schedule"}
            </h2>
          </div>

          <div className="space-y-2 text-xs divide-y divide-zinc-100 dark:divide-zinc-800">
            <div className="flex justify-between items-center pt-2 first:pt-0">
              <span className="text-zinc-500 font-medium">Scheduled Date:</span>
              <span className="font-bold text-zinc-900 dark:text-white">
                {new Date(tracking.collection.scheduledDate).toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-zinc-500 font-medium">Time Slot:</span>
              <span className="font-bold text-zinc-900 dark:text-white">
                {tracking.collection.scheduledSlot}
              </span>
            </div>
            {tracking.collection.address && (
              <div className="flex justify-between items-start pt-2">
                <span className="text-zinc-500 font-medium">Address:</span>
                <span className="text-right font-medium text-zinc-900 dark:text-white max-w-[65%]">
                  {tracking.collection.address}
                  {tracking.collection.city && `, ${tracking.collection.city}`}
                </span>
              </div>
            )}
            {tracking.collection.phlebotomistName && (
              <div className="flex justify-between items-center pt-2">
                <span className="text-zinc-500 font-medium">Phlebotomist:</span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {tracking.collection.phlebotomistName}{" "}
                  {tracking.collection.phlebotomistPhone && (
                    <a
                      href={`tel:${tracking.collection.phlebotomistPhone}`}
                      className="text-sky-600 underline ml-1"
                    >
                      ({tracking.collection.phlebotomistPhone})
                    </a>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tests in this order */}
      <div className="rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
          Ordered Diagnostic Tests ({tracking.items.length})
        </h2>

        <div className="space-y-2 divide-y divide-zinc-100 dark:divide-zinc-800">
          {tracking.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between pt-2 first:pt-0">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-sky-600 shrink-0" />
                <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                  {item.name}
                </span>
              </div>
              <span className="text-xs font-bold text-zinc-900 dark:text-white">
                ₹{item.price}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 border-t border-zinc-100 pt-2.5 text-xs space-y-1 dark:border-zinc-800">
          <div className="flex justify-between text-zinc-500">
            <span>Tests Total:</span>
            <span>₹{tracking.subtotal}</span>
          </div>
          {tracking.collectionFee > 0 && (
            <div className="flex justify-between text-zinc-500">
              <span>Collection Fee:</span>
              <span>₹{tracking.collectionFee}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-extrabold text-zinc-900 dark:text-white pt-1 border-t border-zinc-100 dark:border-zinc-800">
            <span>Grand Total:</span>
            <span className="text-sky-700 dark:text-sky-400">₹{tracking.totalAmount}</span>
          </div>
        </div>
      </div>

      {/* Download Reports section if ready */}
      {tracking.reports.length > 0 && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/90 p-5 dark:border-emerald-800 dark:bg-emerald-950/40">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
            <h2 className="text-sm font-extrabold text-emerald-950 dark:text-emerald-100">
              Diagnostic Reports Ready
            </h2>
          </div>
          <p className="text-xs text-emerald-800 dark:text-emerald-300 mb-3">
            Your laboratory report has been verified and is available for download.
          </p>
          <div className="space-y-2">
            {tracking.reports.map((report) => (
              <div
                key={report.reportNumber}
                className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm dark:bg-zinc-900"
              >
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-white">
                    {report.reportNumber}
                  </p>
                  <p className="text-[10px] text-zinc-400">PDF Report</p>
                </div>
                <Link
                  href={`/${labSlug}/reports?orderNumber=${tracking.orderNumber}`}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition"
                >
                  Download PDF
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lab Contact Info */}
      <div className="rounded-3xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-zinc-900 dark:text-white">
              {tracking.lab.name}
            </h2>
            <p className="text-[11px] text-zinc-500">
              {tracking.lab.addressLine1 ? `${tracking.lab.addressLine1}, ${tracking.lab.city}` : tracking.lab.city}
            </p>
          </div>
          <a
            href={`tel:${tracking.lab.phone}`}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200"
          >
            <Phone className="h-3.5 w-3.5 text-sky-600" />
            <span>Call Lab</span>
          </a>
        </div>
      </div>

      {/* Quick Action Navigation */}
      <div className="grid grid-cols-2 gap-2.5 pt-2">
        <Link
          href={`/${labSlug}/reports?orderNumber=${orderNumber}`}
          className="flex items-center justify-center gap-1.5 rounded-2xl border border-zinc-200 bg-white py-3.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 shadow-sm"
        >
          <FileText className="h-4 w-4 text-sky-600" />
          <span>View Reports</span>
        </Link>
        <Link
          href={`/${labSlug}`}
          className="flex items-center justify-center gap-1.5 rounded-2xl bg-sky-700 py-3.5 text-xs font-bold text-white shadow-md hover:bg-sky-600 transition"
        >
          <span>Book Another Test</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="text-center text-[11px] text-zinc-400 dark:text-zinc-500 pb-4">
        Keep your Booking ID <strong className="text-zinc-600 dark:text-zinc-300">{orderNumber}</strong> handy for any inquiries.
      </div>
    </div>
  );
}
