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
} from "lucide-react";
import Link from "next/link";
import { OrderStatus, CollectionType } from "@prisma/client";

function StatusBadge({ status }: { status: OrderStatus }) {
  const config: Record<OrderStatus, { label: string; color: string }> = {
    PENDING_PAYMENT: { label: "Awaiting Payment", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" },
    CONFIRMED: { label: "Confirmed", color: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300" },
    COLLECTION_SCHEDULED: { label: "Collection Scheduled", color: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300" },
    SAMPLE_COLLECTED: { label: "Sample Collected", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" },
    PROCESSING: { label: "Processing", color: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" },
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
  { status: "CONFIRMED", label: "Booking Confirmed", desc: "Your diagnostic booking is confirmed" },
  { status: "COLLECTION_SCHEDULED", label: "Collection Scheduled", desc: "Phlebotomist assigned for your slot" },
  { status: "SAMPLE_COLLECTED", label: "Sample Collected", desc: "Blood/sample has been collected" },
  { status: "PROCESSING", label: "Lab Processing", desc: "Analysis underway in the laboratory" },
  { status: "REPORT_READY", label: "Report Ready", desc: "Your diagnostic report is available" },
  { status: "COMPLETED", label: "Completed", desc: "Order fulfilled successfully" },
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
}: {
  params: Promise<{ labSlug: string; orderNumber: string }>;
}) {
  const { labSlug, orderNumber } = await params;
  const tracking = await getOrderTracking(orderNumber);

  if (!tracking) {
    notFound();
  }

  const currentStatusIndex = STATUS_ORDER[tracking.orderStatus] ?? 1;
  const isLabVisit = tracking.collectionType === CollectionType.LAB_VISIT;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      {/* Confirmation Banner */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-8 w-8 flex-shrink-0" />
          <div>
            <h2 className="text-lg font-extrabold">Booking Confirmed!</h2>
            <p className="text-sm text-emerald-100">
              Your diagnostic tests have been successfully booked with {tracking.lab.name}.
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl bg-white/15 p-3">
            <p className="text-emerald-100">Booking ID</p>
            <p className="mt-0.5 font-bold text-white">{tracking.orderNumber}</p>
          </div>
          <div className="rounded-xl bg-white/15 p-3">
            <p className="text-emerald-100">Patient</p>
            <p className="mt-0.5 font-bold text-white">{tracking.patientName}</p>
          </div>
        </div>
      </div>

      {/* Current Status */}
      <div className="mb-5 flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <p className="text-xs text-zinc-400">Order Status</p>
          <div className="mt-1">
            <StatusBadge status={tracking.orderStatus} />
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-400">Total Amount</p>
          <p className="mt-0.5 text-lg font-extrabold text-zinc-900 dark:text-white">
            ₹{tracking.totalAmount}
          </p>
          <p className="text-xs text-zinc-400">
            {tracking.paymentStatus === "CASH_ON_COLLECTION" ? "Pay on collection" : tracking.paymentStatus}
          </p>
        </div>
      </div>

      {/* Tracking Timeline */}
      <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
          <Clock className="h-4 w-4 text-sky-600" /> Order Timeline
        </h3>
        <div className="space-y-0">
          {TIMELINE_STEPS.map((step, idx) => {
            const isDone = STATUS_ORDER[step.status] <= currentStatusIndex;
            const isCurrent = step.status === tracking.orderStatus;
            const isLast = idx === TIMELINE_STEPS.length - 1;
            return (
              <div key={step.status} className="relative flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 transition ${
                      isDone
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : isCurrent
                        ? "border-sky-500 bg-sky-50 text-sky-500 dark:bg-sky-950"
                        : "border-zinc-200 bg-white text-zinc-300 dark:border-zinc-700 dark:bg-zinc-900"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <span className="text-[10px] font-bold">{idx + 1}</span>
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className={`mt-1 w-0.5 flex-1 ${
                        STATUS_ORDER[step.status] < currentStatusIndex
                          ? "bg-emerald-400"
                          : "bg-zinc-200 dark:bg-zinc-700"
                      }`}
                      style={{ minHeight: "1.5rem" }}
                    />
                  )}
                </div>
                <div className={`pb-4 ${isLast ? "pb-0" : ""}`}>
                  <p
                    className={`text-sm font-semibold ${
                      isDone
                        ? "text-emerald-700 dark:text-emerald-400"
                        : isCurrent
                        ? "text-sky-700 dark:text-sky-300"
                        : "text-zinc-400 dark:text-zinc-500"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ordered Tests */}
      <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">
          Tests Ordered
        </h3>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {tracking.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2.5">
                <FlaskConical className="h-4 w-4 text-sky-500" />
                <span className="text-sm text-zinc-800 dark:text-zinc-200">{item.name}</span>
              </div>
              <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                ₹{item.price}
              </span>
            </div>
          ))}
        </div>

        {/* Price breakdown */}
        <div className="mt-3 space-y-1 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Tests Subtotal</span>
            <span>₹{tracking.subtotal}</span>
          </div>
          {tracking.collectionFee > 0 && (
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Home Collection Fee</span>
              <span>₹{tracking.collectionFee}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-zinc-100 pt-1.5 text-sm font-bold text-zinc-900 dark:border-zinc-800 dark:text-white">
            <span>Total</span>
            <span>₹{tracking.totalAmount}</span>
          </div>
        </div>
      </div>

      {/* Collection Details */}
      {tracking.collection && (
        <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {isLabVisit ? (
              <>
                <MapPin className="h-4 w-4 text-sky-600" /> Lab Visit Details
              </>
            ) : (
              <>
                <Home className="h-4 w-4 text-sky-600" /> Home Collection Details
              </>
            )}
          </h3>
          <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <div className="flex justify-between">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Date</span>
              <span>
                {new Date(tracking.collection.scheduledDate).toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Time Slot</span>
              <span>{tracking.collection.scheduledSlot}</span>
            </div>
            {tracking.collection.address && (
              <div className="flex justify-between">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Address</span>
                <span className="text-right">
                  {tracking.collection.address}
                  {tracking.collection.city && `, ${tracking.collection.city}`}
                </span>
              </div>
            )}
            {tracking.collection.phlebotomistName && (
              <div className="flex justify-between">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Phlebotomist</span>
                <span>
                  {tracking.collection.phlebotomistName}
                  {tracking.collection.phlebotomistPhone && (
                    <a
                      href={`tel:${tracking.collection.phlebotomistPhone}`}
                      className="ml-2 text-sky-600 hover:underline dark:text-sky-400"
                    >
                      {tracking.collection.phlebotomistPhone}
                    </a>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Laboratory Contact */}
      <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">
          {tracking.lab.name}
        </h3>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
          <a
            href={`tel:${tracking.lab.phone}`}
            className="flex items-center gap-2 text-sm font-semibold text-sky-600 hover:underline dark:text-sky-400"
          >
            <Phone className="h-4 w-4" /> {tracking.lab.phone}
          </a>
          {tracking.lab.addressLine1 && (
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <MapPin className="h-3 w-3" /> {tracking.lab.addressLine1}
            </span>
          )}
        </div>
      </div>

      {/* Reports Section */}
      {tracking.reports.length > 0 && (
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800/40 dark:bg-emerald-950/30">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-200">
            <FileText className="h-4 w-4" /> Reports Available
          </h3>
          {tracking.reports.map((report) => (
            <div key={report.reportNumber} className="flex items-center justify-between">
              <span className="text-sm text-emerald-700 dark:text-emerald-300">
                {report.reportNumber}
              </span>
              <Link
                href={`/${labSlug}/reports?orderNumber=${tracking.orderNumber}`}
                className="text-xs font-semibold text-emerald-700 underline dark:text-emerald-300"
              >
                Download →
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/${labSlug}/reports?orderNumber=${orderNumber}`}
          className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <FileText className="h-4 w-4" /> My Reports
        </Link>
        <Link
          href={`/${labSlug}`}
          className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 transition"
        >
          Book Another Test
        </Link>
      </div>

      {/* Important notice */}
      <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        <span>
          Your booking number is <strong className="text-zinc-600 dark:text-zinc-300">{orderNumber}</strong>.
          Save it to track orders and access your reports.
        </span>
      </div>
    </div>
  );
}
