"use client";

import { useState, useEffect, useRef } from "react";
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  Shield,
  Lock,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export type PaymentState =
  | "INITIAL"
  | "PAYMENT_CREATING"
  | "RAZORPAY_OPEN"
  | "PAYMENT_VERIFYING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "ALREADY_PAID";

interface PatientPaymentActionProps {
  orderId: string;
  orderNumber: string;
  labSlug: string;
  labName: string;
  totalAmount: number;
  patientName?: string;
  patientPhone?: string;
  orderStatus: string;
  paymentStatus: string;
  autoTrigger?: boolean;
  onPaymentSuccess?: (paymentNumber: string) => void;
}

/**
 * Loads the Razorpay Checkout script dynamically and safely.
 */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PatientPaymentAction({
  orderId,
  orderNumber,
  labSlug,
  labName,
  totalAmount,
  patientName,
  patientPhone,
  orderStatus,
  paymentStatus,
  autoTrigger = false,
  onPaymentSuccess,
}: PatientPaymentActionProps) {
  const [paymentState, setPaymentState] = useState<PaymentState>(() => {
    if (paymentStatus === "PAID" || orderStatus === "CONFIRMED") {
      return "ALREADY_PAID";
    }
    return "INITIAL";
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verifiedPaymentData, setVerifiedPaymentData] = useState<{
    orderNumber: string;
    paymentNumber: string;
    amount: number;
    labName: string;
  } | null>(null);

  const isTriggering = useRef(false);

  // Double-click & duplicate protection
  const isBusy =
    paymentState === "PAYMENT_CREATING" ||
    paymentState === "RAZORPAY_OPEN" ||
    paymentState === "PAYMENT_VERIFYING";

  const handlePayNow = async () => {
    if (isBusy || paymentState === "SUCCESS" || paymentState === "ALREADY_PAID") {
      return;
    }

    setErrorMessage(null);
    setPaymentState("PAYMENT_CREATING");

    try {
      // 1. Ensure Razorpay Checkout script is loaded
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        setPaymentState("FAILED");
        setErrorMessage("Unable to initialize secure payment gateway. Please check your connection and try again.");
        return;
      }

      // 2. Call server create-order API (authoritative amount & tenant credentials)
      const res = await fetch("/api/patient/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          verificationPhone: patientPhone,
        }),
      });

      const orderData = await res.json();

      if (!res.ok || !orderData.success) {
        setPaymentState("FAILED");
        setErrorMessage(orderData.error || "Payment order could not be created. Please try again.");
        return;
      }

      // 3. Configure Razorpay modal with public Key ID (never secrets)
      setPaymentState("RAZORPAY_OPEN");

      const options = {
        key: orderData.razorpayKeyId,
        amount: orderData.amountInPaise,
        currency: orderData.currency || "INR",
        name: orderData.labName || labName,
        description: `Diagnostic Booking: ${orderNumber}`,
        order_id: orderData.gatewayOrderId,
        prefill: {
          name: patientName || orderData.patientName,
          contact: patientPhone || orderData.patientPhone,
        },
        theme: {
          color: "#0369a1", // sky-700
        },
        modal: {
          ondismiss: () => {
            setPaymentState("CANCELLED");
            setErrorMessage("Payment was not completed. You can try again.");
          },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          // CRITICAL: Never show success merely because client callback fired.
          // The final success state must come from the server verification API.
          setPaymentState("PAYMENT_VERIFYING");

          try {
            const verifyRes = await fetch("/api/patient/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: orderData.orderId || orderId,
                gatewayOrderId: response.razorpay_order_id,
                gatewayPaymentId: response.razorpay_payment_id,
                gatewaySignature: response.razorpay_signature,
                verificationPhone: patientPhone,
              }),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData.success) {
              setPaymentState("FAILED");
              setErrorMessage(verifyData.error || "Payment could not be verified. Please try again.");
              return;
            }

            // Server-verified success
            setPaymentState("SUCCESS");
            setVerifiedPaymentData({
              orderNumber: verifyData.orderNumber || orderNumber,
              paymentNumber: verifyData.paymentNumber,
              amount: orderData.amountInPaise / 100,
              labName: orderData.labName || labName,
            });

            if (onPaymentSuccess) {
              onPaymentSuccess(verifyData.paymentNumber);
            }
          } catch (err: unknown) {
            setPaymentState("FAILED");
            setErrorMessage("Payment could not be verified. Please try again.");
          }
        },
      };

      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.on("payment.failed", (response: any) => {
        setPaymentState("FAILED");
        const failureDesc = response.error?.description || "Payment failed. Please try again.";
        setErrorMessage(failureDesc);
      });

      razorpayInstance.open();
    } catch (err: unknown) {
      setPaymentState("FAILED");
      setErrorMessage(err instanceof Error ? err.message : "Payment initialization failed.");
    }
  };

  // Optional auto-trigger when redirected with payNow=true
  useEffect(() => {
    if (autoTrigger && !isTriggering.current && paymentState === "INITIAL") {
      isTriggering.current = true;
      handlePayNow();
    }
  }, [autoTrigger]);

  // SUCCESS / ALREADY PAID VIEW
  if (paymentState === "SUCCESS" || paymentState === "ALREADY_PAID") {
    return (
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-sm">
            <CheckCircle className="h-7 w-7" />
          </div>
          <div>
            <span className="inline-block rounded-full bg-emerald-800/60 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-200">
              Payment Confirmed
            </span>
            <h2 className="text-xl font-extrabold text-white mt-0.5">
              Payment Successful!
            </h2>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-white/15 p-3.5 backdrop-blur-sm text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-emerald-200 font-medium">Order:</span>
            <span className="font-mono font-bold text-white">{orderNumber}</span>
          </div>
          {verifiedPaymentData?.paymentNumber && (
            <div className="flex justify-between">
              <span className="text-emerald-200 font-medium">Payment ID:</span>
              <span className="font-mono font-bold text-white">{verifiedPaymentData.paymentNumber}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-emerald-200 font-medium">Amount:</span>
            <span className="font-bold text-white">₹{totalAmount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-emerald-200 font-medium">Laboratory:</span>
            <span className="font-bold text-white truncate max-w-[65%] text-right">{labName}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] text-emerald-100">
          <span>Paid directly to {labName}</span>
          <span className="font-semibold text-emerald-200">Powered by Gyrex Labs</span>
        </div>
      </div>
    );
  }

  // PAYMENT REQUIRED VIEW
  return (
    <div className="rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white">
              Online Payment
            </h3>
            <p className="text-[11px] text-zinc-500">
              UPI, Debit/Credit Card, NetBanking
            </p>
          </div>
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
          Payment Due
        </span>
      </div>

      {/* Checkout Display Items */}
      <div className="rounded-2xl bg-zinc-50 p-3.5 text-xs space-y-1.5 dark:bg-zinc-800/60">
        <div className="flex justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">Laboratory:</span>
          <span className="font-bold text-zinc-900 dark:text-white truncate max-w-[65%] text-right">
            {labName}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">Order:</span>
          <span className="font-mono font-bold text-zinc-900 dark:text-white">
            {orderNumber}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">Payment Method:</span>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Online payment (Razorpay)
          </span>
        </div>
        <div className="flex justify-between border-t border-zinc-200/80 pt-1.5 dark:border-zinc-700">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">Payable Amount:</span>
          <span className="text-sm font-extrabold text-sky-700 dark:text-sky-400">
            ₹{totalAmount}
          </span>
        </div>
      </div>

      {/* Trust Notice */}
      <div className="flex items-start gap-2.5 rounded-2xl bg-sky-50/70 p-3 text-[11px] text-sky-900 border border-sky-100 dark:bg-sky-950/30 dark:text-sky-200 dark:border-sky-900/50">
        <Shield className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">
            Pay {labName} directly.
          </p>
          <p className="text-sky-700 dark:text-sky-300 text-[10px] mt-0.5">
            Diagnostic payment is for the laboratory. Powered by Gyrex Labs.
          </p>
        </div>
      </div>

      {/* Error or cancellation feedback */}
      {errorMessage && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Primary CTA */}
      <button
        type="button"
        onClick={handlePayNow}
        disabled={isBusy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-700 py-3.5 text-sm font-bold text-white shadow-md hover:bg-sky-600 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {paymentState === "PAYMENT_CREATING" ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span>Connecting to Secure Gateway…</span>
          </>
        ) : paymentState === "PAYMENT_VERIFYING" ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span>Verifying Payment…</span>
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            <span>Pay ₹{totalAmount}</span>
          </>
        )}
      </button>
    </div>
  );
}
