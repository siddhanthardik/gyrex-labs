"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Lock,
  Settings,
  Link2,
  User,
  Send,
  CheckCheck,
  Zap,
  ArrowRight,
  Clock,
  ShieldAlert,
} from "lucide-react";

interface SafeWhatsAppSettings {
  configured: boolean;
  isEnabled: boolean;
  status: "CONNECTED" | "DISCONNECTED" | "ERROR";
  wabaId: string | null;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
  hasAccessToken: boolean;
  hasAppSecret: boolean;
  webhookUrl: string;
  overrideWebhookUrl?: string;
  platformVerifyToken?: string;
  labVerifyToken?: string;
  webhookVerifyToken: string;
  lastVerifiedAt: string | null;
  errorMessage: string | null;
  welcomeMessageCustom: string | null;
  previewMessage: string;
  notifyOrderConfirmation: boolean;
  notifyPaymentConfirmation: boolean;
  notifySampleCollected: boolean;
  notifyReportReady: boolean;
}

interface LabWhatsAppEntitlement {
  labId: string;
  isEntitled: boolean;
  planId: string | null;
  planCode: string | null;
  planName: string | null;
  subscriptionStatus: string | null;
  canUseSharedWhatsApp: boolean;
  monthlySharedWhatsAppQuota: number;
  canConfigureCustomWaba: boolean;
  rejectionReason?: "NO_ACTIVE_SUBSCRIPTION" | "SUBSCRIPTION_STATUS_INELIGIBLE" | "CAPABILITY_NOT_PERMITTED" | null;
}

interface LabQuotaUsageSummary {
  periodId: string;
  periodStart: string;
  periodEnd: string;
  quotaLimit: number;
  messagesReserved: number;
  messagesConfirmed: number;
  messagesAvailable: number;
  isExhausted: boolean;
}

export default function LabWhatsAppPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<SafeWhatsAppSettings | null>(null);
  const [entitlement, setEntitlement] = useState<LabWhatsAppEntitlement | null>(null);
  const [quota, setQuota] = useState<LabQuotaUsageSummary | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Form states
  const [wabaId, setWabaId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [webhookVerifyToken, setWebhookVerifyToken] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [welcomeMessageCustom, setWelcomeMessageCustom] = useState("");
  const [notifyOrderConfirmation, setNotifyOrderConfirmation] = useState(true);
  const [notifyPaymentConfirmation, setNotifyPaymentConfirmation] = useState(true);
  const [notifySampleCollected, setNotifySampleCollected] = useState(true);
  const [notifyReportReady, setNotifyReportReady] = useState(true);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lab/whatsapp");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.settings) {
            const s: SafeWhatsAppSettings = data.settings;
            setSettings(s);
            setWabaId(s.wabaId || "");
            setPhoneNumberId(s.phoneNumberId || "");
            setDisplayPhoneNumber(s.displayPhoneNumber || "");
            setWebhookVerifyToken(s.webhookVerifyToken || "");
            setIsEnabled(s.isEnabled);
            setWelcomeMessageCustom(s.welcomeMessageCustom || "");
            setNotifyOrderConfirmation(s.notifyOrderConfirmation ?? true);
            setNotifyPaymentConfirmation(s.notifyPaymentConfirmation ?? true);
            setNotifySampleCollected(s.notifySampleCollected ?? true);
            setNotifyReportReady(s.notifyReportReady ?? true);
          }
          if (data.entitlement) {
            setEntitlement(data.entitlement);
          }
          if (data.quota) {
            setQuota(data.quota);
          }
        }
      }
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Failed to load WhatsApp settings." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotification(null);

    try {
      // Build server-safe payload
      const payload: any = {
        welcomeMessageCustom: welcomeMessageCustom.trim() || undefined,
        notifyOrderConfirmation,
        notifyPaymentConfirmation,
        notifySampleCollected,
        notifyReportReady,
      };

      // Only include custom WABA parameters if the laboratory plan explicitly permits custom WABA
      if (entitlement?.canConfigureCustomWaba) {
        payload.wabaId = wabaId.trim();
        payload.phoneNumberId = phoneNumberId.trim();
        payload.displayPhoneNumber = displayPhoneNumber.trim();
        payload.webhookVerifyToken = webhookVerifyToken.trim();
        payload.isEnabled = isEnabled;

        if (accessToken.trim()) {
          payload.accessToken = accessToken.trim();
        }

        if (appSecret.trim()) {
          payload.appSecret = appSecret.trim();
        }
      }

      const res = await fetch("/api/lab/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save settings.");
      }

      setSettings(data.settings);
      setAccessToken(""); // clear plain input after saving
      setAppSecret(""); // clear plain input after saving
      setNotification({
        type: "success",
        message: entitlement?.canConfigureCustomWaba
          ? "WhatsApp Business configuration saved and encrypted. Click 'Test Connection' to verify with Meta."
          : "WhatsApp notification preferences saved successfully.",
      });
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setNotification(null);

    try {
      const res = await fetch("/api/lab/whatsapp/test", { method: "POST" });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Meta WhatsApp verification failed.");
      }

      setNotification({
        type: "success",
        message: data.message || "Connection verified successfully with Meta Graph API.",
      });
      await fetchSettings();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Could not connect to Meta. Check Phone Number ID and Access Token.",
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24 text-slate-500">
        <RefreshCw className="h-6 w-6 animate-spin text-sky-500 mr-3" />
        <span>Loading WhatsApp configuration & subscription status...</span>
      </div>
    );
  }

  const isGrowthPlan = Boolean(entitlement?.canUseSharedWhatsApp && !entitlement?.canConfigureCustomWaba);
  const isDedicatedPlan = Boolean(entitlement?.canConfigureCustomWaba);
  const isIneligible = !isGrowthPlan && !isDedicatedPlan;

  // Real connection status
  const isVerifiedConnected = settings?.status === "CONNECTED" && Boolean(settings?.lastVerifiedAt);
  const isConnectionError = settings?.status === "ERROR";
  const isConfiguredUnverified = Boolean(settings?.configured && !isVerifiedConnected && !isConnectionError);

  // Quota computations
  const messagesUsed = (quota?.messagesConfirmed ?? 0) + (quota?.messagesReserved ?? 0);
  const quotaLimit = quota?.quotaLimit ?? (entitlement?.monthlySharedWhatsAppQuota || 250);
  const messagesAvailable = quota?.messagesAvailable ?? Math.max(0, quotaLimit - messagesUsed);
  const isQuotaExhausted = Boolean(quota?.isExhausted || messagesAvailable <= 0);
  const usagePercent = quotaLimit > 0 ? Math.min(100, Math.round((messagesUsed / quotaLimit) * 100)) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-xs shrink-0">
            <MessageSquare className="h-6 w-6 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                WhatsApp Settings
              </h1>
              {entitlement?.planName && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                  {entitlement.planName} Plan
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {isGrowthPlan
                ? "Outbound patient notifications delivered via verified Gyrex Shared WhatsApp sender."
                : isDedicatedPlan
                ? "Laboratory-owned Meta WhatsApp Business Account (WABA) integration."
                : "Manage patient notifications and WhatsApp integration."}
            </p>
          </div>
        </div>

        {/* Plan Upgrade / Manage Link */}
        <Link
          href="/lab/subscription"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 transition self-start sm:self-auto"
        >
          <span>Manage Plan</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-sm animate-in fade-in duration-200 ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : notification.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-900"
              : "bg-sky-50 border-sky-200 text-sky-900"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">{notification.message}</div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CASE 1: INELIGIBLE, EXPIRED, OR PAST-DUE SUBSCRIPTION PLAN (FAIL CLOSED)    */}
      {/* ========================================================================= */}
      {isIneligible && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-amber-950">
                WhatsApp Messaging Unavailable Under Current Subscription
              </h2>
              <p className="text-sm text-amber-800 leading-relaxed">
                {entitlement?.subscriptionStatus === "PAST_DUE"
                  ? "Your subscription payment is past due. WhatsApp patient notifications have been temporarily suspended until the invoice is settled."
                  : entitlement?.subscriptionStatus === "EXPIRED" || entitlement?.subscriptionStatus === "CANCELLED"
                  ? `Your subscription status is ${entitlement.subscriptionStatus.toLowerCase()}. An active Gyrex subscription is required for WhatsApp notifications.`
                  : entitlement?.rejectionReason === "NO_ACTIVE_SUBSCRIPTION"
                  ? "No active subscription found for this laboratory. Please select a plan to enable WhatsApp patient messaging."
                  : `Your current subscription plan (${entitlement?.planName || "Starter"}) does not include WhatsApp outbound messaging.`}
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link
              href="/lab/subscription"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition shadow-xs"
            >
              <span>View Available Subscription Plans</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CASE 2: GROWTH PLAN — SHARED GYREX WHATSAPP SENDER WITH MONTHLY QUOTA      */}
      {/* ========================================================================= */}
      {isGrowthPlan && (
        <div className="space-y-6">
          {/* Method & Shared Sender Status Card */}
          <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <Zap className="h-5 w-5 fill-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">Active Delivery Method:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Gyrex Shared WhatsApp Sender
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Transactional notifications are dispatched via Gyrex&apos;s verified platform WhatsApp Business number with your laboratory name prominently identified.
                </p>
              </div>
            </div>

            <div className="text-xs text-emerald-800 bg-white/80 border border-emerald-200 px-3.5 py-2 rounded-xl font-medium shrink-0 self-start sm:self-auto">
              Included in Growth Plan
            </div>
          </div>

          {/* Monthly Quota Ledger & Statistics Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 text-slate-900">
                  <Clock className="h-4 w-4 text-sky-500" />
                  <h2 className="text-base font-bold">Monthly Shared WhatsApp Allowance</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monthly message quota for order confirmations, payments, sample collection, and report links.
                </p>
              </div>

              {quota?.periodEnd && (
                <div className="text-xs text-slate-500">
                  Cycle resets: <strong className="text-slate-700">{new Date(quota.periodEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong>
                </div>
              )}
            </div>

            {/* Quota Numbers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70">
                <div className="text-xs text-slate-500 font-medium">Monthly Allowance</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {quotaLimit.toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Messages per billing month</div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70">
                <div className="text-xs text-slate-500 font-medium">Messages Used</div>
                <div className="text-2xl font-bold text-sky-600 mt-1">
                  {messagesUsed.toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {quota?.messagesConfirmed ?? 0} confirmed{Boolean(quota?.messagesReserved) ? ` (+${quota?.messagesReserved} reserved)` : ""}
                </div>
              </div>

              <div className={`rounded-xl p-4 border ${isQuotaExhausted ? "bg-rose-50 border-rose-200" : "bg-emerald-50/60 border-emerald-200"}`}>
                <div className={`text-xs font-medium ${isQuotaExhausted ? "text-rose-700" : "text-emerald-700"}`}>
                  Messages Remaining
                </div>
                <div className={`text-2xl font-bold mt-1 ${isQuotaExhausted ? "text-rose-700" : "text-emerald-700"}`}>
                  {messagesAvailable.toLocaleString("en-IN")}
                </div>
                <div className={`text-[11px] mt-0.5 ${isQuotaExhausted ? "text-rose-600 font-medium" : "text-emerald-600"}`}>
                  {isQuotaExhausted ? "Quota exhausted for this cycle" : "Available to dispatch"}
                </div>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Monthly Usage Progress</span>
                <span className="font-semibold text-slate-900">{usagePercent}% ({messagesUsed} / {quotaLimit})</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    usagePercent >= 100
                      ? "bg-rose-500"
                      : usagePercent >= 80
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>

            {/* Quota Exhausted Alert */}
            {isQuotaExhausted && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-rose-900">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold">Monthly Shared WhatsApp Quota Exhausted</h3>
                    <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                      Your laboratory has utilized all {quotaLimit} messages included for this monthly billing window.
                      Outbound WhatsApp notifications are paused until the quota resets on {quota?.periodEnd ? new Date(quota.periodEnd).toLocaleDateString("en-IN") : "the next billing cycle"}, or upgrade to Professional for a dedicated WABA.
                    </p>
                  </div>
                </div>

                <Link
                  href="/lab/subscription"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition shadow-2xs shrink-0"
                >
                  <span>Upgrade to Pro</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Main 2-Column Grid for Notification Preferences & Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-5">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-2 text-slate-900">
                  <Settings className="h-5 w-5 text-sky-500" />
                  <h2 className="text-base font-bold">Notification Preferences</h2>
                </div>
                <p className="text-xs text-slate-500 mb-5">
                  Choose which transactional clinical events automatically dispatch WhatsApp messages to patients.
                </p>

                <form onSubmit={handleSave} className="space-y-5">
                  {/* Custom Welcome Message */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Custom Welcome Message <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <textarea
                        rows={3}
                        maxLength={500}
                        value={welcomeMessageCustom}
                        onChange={(e) => setWelcomeMessageCustom(e.target.value)}
                        placeholder="Leave blank to use the standard Gyrex Labs branded welcome message."
                        className="w-full px-3 py-2 pb-6 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-slate-50/40 resize-none"
                      />
                      <div className="absolute right-3 bottom-2 text-[10px] text-slate-400 font-mono">
                        {welcomeMessageCustom.length}/500
                      </div>
                    </div>
                  </div>

                  {/* Transactional Checkboxes */}
                  <div className="pt-1">
                    <div className="flex items-center gap-1.5 text-slate-900 mb-1">
                      <Send className="h-3.5 w-3.5 text-sky-500" />
                      <h3 className="text-xs font-bold">Automated Patient Notifications</h3>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Each notification consumes 1 quota reservation from your monthly allowance upon delivery.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                      <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition select-none">
                        <input
                          type="checkbox"
                          checked={notifyOrderConfirmation}
                          onChange={(e) => setNotifyOrderConfirmation(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                        <span>Order Confirmation</span>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition select-none">
                        <input
                          type="checkbox"
                          checked={notifyPaymentConfirmation}
                          onChange={(e) => setNotifyPaymentConfirmation(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                        <span>Payment Confirmation</span>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition select-none">
                        <input
                          type="checkbox"
                          checked={notifySampleCollected}
                          onChange={(e) => setNotifySampleCollected(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                        <span>Sample Collection Status</span>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition select-none">
                        <input
                          type="checkbox"
                          checked={notifyReportReady}
                          onChange={(e) => setNotifyReportReady(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                        <span>Diagnostic Report Ready</span>
                      </label>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50 transition shadow-xs cursor-pointer"
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          Save Notification Preferences
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Informative Note for Growth Plan */}
              <div className="bg-sky-50/60 border border-sky-200/70 rounded-2xl p-4 text-xs text-sky-900 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Zero Meta Developer setup required:</strong> Growth plan laboratories do not need to register a Meta Business Account or configure developer webhooks. Gyrex centrally maintains high-deliverability WhatsApp Cloud API infrastructure for you.
                </div>
              </div>
            </div>

            {/* Right Column: Patient Experience Preview */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-1 text-slate-900">
                  <User className="h-5 w-5 text-sky-500" />
                  <h2 className="text-base font-bold">Patient Experience Preview</h2>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Delivered via Gyrex Shared WhatsApp with your laboratory attribution.
                </p>

                <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="bg-[#0b5345] text-white px-4 py-3 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-white text-[#0b5345] font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                      <MessageSquare className="h-5 w-5 text-[#0b5345]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold truncate">Gyrex Labs (Official Sender)</span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 fill-emerald-400 text-[#0b5345]" />
                      </div>
                      <div className="text-[11px] text-emerald-100/80">Verified Business Account</div>
                    </div>
                  </div>

                  <div className="bg-[#efeae2] p-4 space-y-3 min-h-[400px] text-slate-800">
                    <div className="flex justify-start">
                      <div className="bg-white text-xs p-3.5 rounded-xl rounded-tl-none shadow-xs max-w-[95%] whitespace-pre-line leading-relaxed text-slate-900 border border-slate-200/70">
                        {settings?.previewMessage ||
                          `Hello Patient! 👋\nYour diagnostic order with your laboratory has been confirmed.\n\n📋 Track Your Order:\nhttps://labs.gyrex.in/reports\n\nThank you for choosing quality diagnostic care.`}
                        <div className="text-[10px] text-slate-400 text-right mt-2">10:30 AM</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CASE 3: PROFESSIONAL & ENTERPRISE — DEDICATED LAB-OWNED META INTEGRATION  */}
      {/* ========================================================================= */}
      {isDedicatedPlan && (
        <div className="space-y-6">
          {/* Connection Status & Test Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className={`h-3.5 w-3.5 rounded-full shrink-0 ${
                  isVerifiedConnected
                    ? "bg-emerald-500 ring-4 ring-emerald-100"
                    : isConnectionError
                    ? "bg-rose-500 ring-4 ring-rose-100"
                    : isConfiguredUnverified
                    ? "bg-amber-400 ring-4 ring-amber-100"
                    : "bg-slate-300"
                }`}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">Dedicated WABA Status:</span>
                  {isVerifiedConnected ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Connected & Verified
                    </span>
                  ) : isConnectionError ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                      Connection Error
                    </span>
                  ) : isConfiguredUnverified ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                      Verification Pending
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      Not Configured
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isVerifiedConnected
                    ? `Verified with Meta Graph API. Display number: ${settings?.displayPhoneNumber || "Configured"}`
                    : isConnectionError
                    ? settings?.errorMessage || "Meta Graph API verification failed. Please check Phone ID and Access Token."
                    : isConfiguredUnverified
                    ? "Credentials saved. Click 'Test Connection' below to perform real-time verification with Meta."
                    : "Configure your Meta WhatsApp Cloud API credentials below to connect your dedicated phone number."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !settings?.configured}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-sky-300 text-sky-600 hover:bg-sky-50 disabled:opacity-50 transition shadow-2xs cursor-pointer shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${testing ? "animate-spin" : ""}`} />
              {testing ? "Testing with Meta..." : "Test Connection"}
            </button>
          </div>

          {/* Main 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Webhook Setup & WhatsApp Configuration */}
            <div className="lg:col-span-7 space-y-5">
              {/* Webhook Setup Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-slate-900">
                    <Link2 className="h-5 w-5 text-sky-500" />
                    <h2 className="text-base font-bold">Webhook Setup</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Copy the callback URL and verify token into your Meta Developer Dashboard under{" "}
                    <strong className="text-slate-700">WhatsApp → Configuration → Webhook</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Callback URL */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Callback URL
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        readOnly
                        value={settings?.webhookUrl || "https://labs.gyrex.in/api/webhooks/whatsapp"}
                        className="w-full px-3 py-2 pr-9 rounded-xl border border-slate-200 text-xs text-slate-800 font-mono bg-slate-50/60 select-all"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            settings?.webhookUrl || "https://labs.gyrex.in/api/webhooks/whatsapp",
                            "webhookUrl"
                          )
                        }
                        className="absolute right-2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition"
                        title="Copy Callback URL"
                      >
                        {copiedField === "webhookUrl" ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Verify Token */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Verify Token
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        readOnly
                        value={
                          settings?.platformVerifyToken ||
                          settings?.webhookVerifyToken ||
                          "••••••••••••••••••••"
                        }
                        className="w-full px-3 py-2 pr-9 rounded-xl border border-slate-200 text-xs text-slate-800 font-mono bg-slate-50/60 select-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const token = settings?.platformVerifyToken || settings?.webhookVerifyToken;
                          if (token) handleCopy(token, "verifyToken");
                        }}
                        className="absolute right-2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition"
                        title="Copy Verify Token"
                      >
                        {copiedField === "verifyToken" ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* WhatsApp Configuration Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-4 text-slate-900">
                  <Settings className="h-5 w-5 text-sky-500" />
                  <h2 className="text-base font-bold">WhatsApp Configuration</h2>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                  {/* Grid of 4 Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Meta Business Account ID (WABA ID) */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Meta Business Account ID (WABA ID)
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={wabaId}
                          onChange={(e) => setWabaId(e.target.value)}
                          placeholder="e.g. 71825303c355986..."
                          className="w-full px-3 py-2 pr-9 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono bg-slate-50/40"
                        />
                        {wabaId && (
                          <button
                            type="button"
                            onClick={() => handleCopy(wabaId, "wabaId")}
                            className="absolute right-2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition"
                            title="Copy WABA ID"
                          >
                            {copiedField === "wabaId" ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Phone Number ID */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Phone Number ID
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={phoneNumberId}
                          onChange={(e) => setPhoneNumberId(e.target.value)}
                          placeholder="e.g. 123456789012345"
                          className="w-full px-3 py-2 pr-9 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono bg-slate-50/40"
                        />
                        {phoneNumberId && (
                          <button
                            type="button"
                            onClick={() => handleCopy(phoneNumberId, "phoneNumberId")}
                            className="absolute right-2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition"
                            title="Copy Phone Number ID"
                          >
                            {copiedField === "phoneNumberId" ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Display Phone Number */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Display Phone Number
                      </label>
                      <input
                        type="text"
                        value={displayPhoneNumber}
                        onChange={(e) => setDisplayPhoneNumber(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-slate-50/40"
                      />
                    </div>

                    {/* Webhook Verify Token */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Custom Verify Token <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={webhookVerifyToken}
                        onChange={(e) => setWebhookVerifyToken(e.target.value)}
                        placeholder="Leave blank for platform default"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono bg-slate-50/40"
                      />
                    </div>
                  </div>

                  {/* Access Token */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-700">
                        Permanent System User Access Token
                      </label>
                      {settings?.hasAccessToken && (
                        <span className="text-[10px] text-emerald-700 font-medium">
                          Encrypted (AES-256-GCM)
                        </span>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type="password"
                        value={accessToken}
                        onChange={(e) => setAccessToken(e.target.value)}
                        placeholder={settings?.hasAccessToken ? "••••••••••••••••••••" : "EAAG..."}
                        className="w-full px-3 py-2 pr-9 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono bg-slate-50/40"
                      />
                      {accessToken && (
                        <button
                          type="button"
                          onClick={() => handleCopy(accessToken, "accessToken")}
                          className="absolute right-2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition"
                          title="Copy Access Token"
                        >
                          {copiedField === "accessToken" ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* App Secret */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-700">
                        App Secret (for HMAC-SHA256 verification)
                      </label>
                      {settings?.hasAppSecret && (
                        <span className="text-[10px] text-emerald-700 font-medium">
                          Encrypted
                        </span>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type="password"
                        value={appSecret}
                        onChange={(e) => setAppSecret(e.target.value)}
                        placeholder={settings?.hasAppSecret ? "••••••••••••••••••••" : "Meta App Secret"}
                        className="w-full px-3 py-2 pr-9 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono bg-slate-50/40"
                      />
                      {appSecret && (
                        <button
                          type="button"
                          onClick={() => handleCopy(appSecret, "appSecret")}
                          className="absolute right-2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition"
                          title="Copy App Secret"
                        >
                          {copiedField === "appSecret" ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Enable Channel Toggle */}
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <label
                        className="text-xs font-semibold text-slate-800 block cursor-pointer"
                        onClick={() => setIsEnabled(!isEnabled)}
                      >
                        Enable WhatsApp Automated Inbound
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Receive and respond to patient messages (e.g., booking, tracking, opt-out).
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => setIsEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {/* Custom Welcome Message */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Custom Welcome Message <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <textarea
                        rows={3}
                        maxLength={500}
                        value={welcomeMessageCustom}
                        onChange={(e) => setWelcomeMessageCustom(e.target.value)}
                        placeholder="Leave blank to use the standard Gyrex Labs branded welcome message."
                        className="w-full px-3 py-2 pb-6 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-slate-50/40 resize-none"
                      />
                      <div className="absolute right-3 bottom-2 text-[10px] text-slate-400 font-mono">
                        {welcomeMessageCustom.length}/500
                      </div>
                    </div>
                  </div>

                  {/* Transactional Patient Notifications */}
                  <div className="pt-2">
                    <div className="flex items-center gap-1.5 text-slate-900 mb-0.5">
                      <Send className="h-3.5 w-3.5 text-sky-500" />
                      <h3 className="text-xs font-bold">Transactional Patient Notifications</h3>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Automated clinical notifications sent to patients.
                    </p>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-700">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={notifyOrderConfirmation}
                          onChange={(e) => setNotifyOrderConfirmation(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                        <span>Order Confirmation</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={notifyPaymentConfirmation}
                          onChange={(e) => setNotifyPaymentConfirmation(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                        <span>Payment Confirmation</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={notifySampleCollected}
                          onChange={(e) => setNotifySampleCollected(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                        <span>Sample Collection Status</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={notifyReportReady}
                          onChange={(e) => setNotifyReportReady(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                        <span>Diagnostic Report Ready</span>
                      </label>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50 transition shadow-xs cursor-pointer"
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          Save WhatsApp Settings
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column: Patient Experience Preview */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-1 text-slate-900">
                  <User className="h-5 w-5 text-sky-500" />
                  <h2 className="text-base font-bold">Patient Experience Preview</h2>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Sent from your dedicated laboratory WhatsApp Business number.
                </p>

                <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="bg-[#0b5345] text-white px-4 py-3 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-white text-[#0b5345] font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                      <MessageSquare className="h-5 w-5 text-[#0b5345]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold truncate">
                          {settings?.displayPhoneNumber || "Your Laboratory"}
                        </span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 fill-emerald-400 text-[#0b5345]" />
                      </div>
                      <div className="text-[11px] text-emerald-100/80">Business Account</div>
                    </div>
                  </div>

                  <div className="bg-[#efeae2] p-4 space-y-3 min-h-[460px] text-slate-800">
                    <div className="flex justify-end">
                      <div className="bg-[#d9fdd3] text-slate-900 text-xs p-2.5 rounded-lg rounded-tr-none shadow-xs max-w-[85%] border border-[#c4f3bd]/60">
                        Hi, I would like to book blood tests.
                        <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 text-right mt-1">
                          <span>10:30 AM</span>
                          <CheckCheck className="h-3.5 w-3.5 text-sky-600" />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-start">
                      <div className="bg-white text-xs p-3.5 rounded-xl rounded-tl-none shadow-xs max-w-[95%] whitespace-pre-line leading-relaxed text-slate-900 border border-slate-200/70">
                        {settings?.previewMessage ||
                          `Hello Patient! 👋\nWelcome to your laboratory on Gyrex Labs.\n\nHow can we assist you with your diagnostic tests today?\n\n📋 Book a Test:\nhttps://labs.gyrex.in\n\n❤️ Health Checkup Packages:\nhttps://labs.gyrex.in/packages\n\n📑 Upload Prescription:\nhttps://labs.gyrex.in/prescription\n\n📊 My Orders & Reports:\nhttps://labs.gyrex.in/orders`}
                        <div className="text-[10px] text-slate-400 text-right mt-2">10:30 AM</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
