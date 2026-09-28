import React from "react";
import { OrderStatus, PaymentStatus, ReportStatus, LabStatus } from "@prisma/client";

interface StatusBadgeProps {
  status: OrderStatus | PaymentStatus | ReportStatus | LabStatus | string;
  type?: "order" | "payment" | "report" | "lab";
}

export function StatusBadge({ status, type = "order" }: StatusBadgeProps) {
  // Order statuses
  if (type === "order" || Object.values(OrderStatus).includes(status as OrderStatus)) {
    switch (status) {
      case OrderStatus.PENDING_PAYMENT:
        return <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">Pending Payment</span>;
      case OrderStatus.CONFIRMED:
        return <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">Confirmed</span>;
      case OrderStatus.COLLECTION_SCHEDULED:
        return <span className="inline-flex items-center rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700">Collection Scheduled</span>;
      case OrderStatus.SAMPLE_COLLECTED:
        return <span className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">Sample Collected</span>;
      case OrderStatus.PROCESSING:
        return <span className="inline-flex items-center rounded-md border border-yellow-200 bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700">In Processing</span>;
      case OrderStatus.REPORT_READY:
        return <span className="inline-flex items-center rounded-md border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700">Report Ready</span>;
      case OrderStatus.COMPLETED:
        return <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Completed</span>;
      case OrderStatus.CANCELLED:
        return <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">Cancelled</span>;
    }
  }

  // Payment statuses
  if (type === "payment" || Object.values(PaymentStatus).includes(status as PaymentStatus)) {
    switch (status) {
      case PaymentStatus.PAID:
        return <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Paid</span>;
      case PaymentStatus.AUTHORIZED:
        return <span className="inline-flex items-center rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">Authorized</span>;
      case PaymentStatus.PENDING:
        return <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">Pending</span>;
      case PaymentStatus.CASH_ON_COLLECTION:
        return <span className="inline-flex items-center rounded-md border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-700">Pay at Collection</span>;
      case PaymentStatus.REFUNDED:
        return <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">Refunded</span>;
      case PaymentStatus.FAILED:
        return <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">Failed</span>;
    }
  }

  // Report statuses
  if (type === "report" || Object.values(ReportStatus).includes(status as ReportStatus)) {
    switch (status) {
      case ReportStatus.FINAL:
        return <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Final Report</span>;
      case ReportStatus.AMENDED:
        return <span className="inline-flex items-center rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">Amended Report</span>;
      case ReportStatus.DRAFT:
        return <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">Draft Report</span>;
      case ReportStatus.CANCELLED:
        return <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">Cancelled</span>;
    }
  }

  return (
    <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
      {status}
    </span>
  );
}
