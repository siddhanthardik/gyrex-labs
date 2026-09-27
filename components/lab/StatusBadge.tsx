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
        return <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400 border border-amber-500/20">Pending Payment</span>;
      case OrderStatus.CONFIRMED:
        return <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400 border border-blue-500/20">Confirmed</span>;
      case OrderStatus.COLLECTION_SCHEDULED:
        return <span className="inline-flex items-center rounded-md bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-400 border border-purple-500/20">Collection Scheduled</span>;
      case OrderStatus.SAMPLE_COLLECTED:
        return <span className="inline-flex items-center rounded-md bg-indigo-500/10 px-2 py-1 text-xs font-medium text-indigo-400 border border-indigo-500/20">Sample Collected</span>;
      case OrderStatus.PROCESSING:
        return <span className="inline-flex items-center rounded-md bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-400 border border-yellow-500/20">In Processing</span>;
      case OrderStatus.REPORT_READY:
        return <span className="inline-flex items-center rounded-md bg-teal-500/10 px-2 py-1 text-xs font-medium text-teal-400 border border-teal-500/20">Report Ready</span>;
      case OrderStatus.COMPLETED:
        return <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">Completed</span>;
      case OrderStatus.CANCELLED:
        return <span className="inline-flex items-center rounded-md bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-400 border border-rose-500/20">Cancelled</span>;
    }
  }

  // Payment statuses
  if (type === "payment" || Object.values(PaymentStatus).includes(status as PaymentStatus)) {
    switch (status) {
      case PaymentStatus.PAID:
        return <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">Paid</span>;
      case PaymentStatus.AUTHORIZED:
        return <span className="inline-flex items-center rounded-md bg-sky-500/10 px-2 py-1 text-xs font-medium text-sky-400 border border-sky-500/20">Authorized</span>;
      case PaymentStatus.PENDING:
        return <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400 border border-amber-500/20">Pending</span>;
      case PaymentStatus.CASH_ON_COLLECTION:
        return <span className="inline-flex items-center rounded-md bg-cyan-500/10 px-2 py-1 text-xs font-medium text-cyan-400 border border-cyan-500/20">Pay at Collection</span>;
      case PaymentStatus.REFUNDED:
        return <span className="inline-flex items-center rounded-md bg-zinc-500/10 px-2 py-1 text-xs font-medium text-zinc-400 border border-zinc-500/20">Refunded</span>;
      case PaymentStatus.FAILED:
        return <span className="inline-flex items-center rounded-md bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-400 border border-rose-500/20">Failed</span>;
    }
  }

  // Report statuses
  if (type === "report" || Object.values(ReportStatus).includes(status as ReportStatus)) {
    switch (status) {
      case ReportStatus.FINAL:
        return <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">Final Report</span>;
      case ReportStatus.AMENDED:
        return <span className="inline-flex items-center rounded-md bg-sky-500/10 px-2 py-1 text-xs font-medium text-sky-400 border border-sky-500/20">Amended Report</span>;
      case ReportStatus.DRAFT:
        return <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400 border border-amber-500/20">Draft Report</span>;
      case ReportStatus.CANCELLED:
        return <span className="inline-flex items-center rounded-md bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-400 border border-rose-500/20">Cancelled</span>;
    }
  }

  return (
    <span className="inline-flex items-center rounded-md bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-300">
      {status}
    </span>
  );
}
