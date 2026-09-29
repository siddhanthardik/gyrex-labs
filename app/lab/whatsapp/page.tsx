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
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Send,
  HelpCircle,
  Building2,
  Lock,
  ArrowRight,
  Info,
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

export default function LabWhatsAppPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<SafeWhatsAppSettings | null>(null);
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
        if (data.success && data.settings) {
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
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotification(null);

    try {
      const payload: any = {
        wabaId: wabaId.trim(),
        phoneNumberId: phoneNumberId.trim(),
        displayPhoneNumber: displayPhoneNumber.trim(),
        webhookVerifyToken: webhookVerifyToken.trim(),
        isEnabled,
        welcomeMessageCustom: welcomeMessageCustom.trim() || undefined,
        notifyOrderConfirmation,
        notifyPaymentConfirmation,
        notifySampleCollected,
        notifyReportReady,
      };

      if (accessToken.trim()) {
        payload.accessToken = accessToken.trim();
      }

      if (appSecret.trim()) {
        payload.appSecret = appSecret.trim();
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
        message: "WhatsApp Business credentials saved and securely encrypted.",
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
        message: data.message || "Connection verified successfully with Meta Graph API!",
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
        <RefreshCw className="h-6 w-6 animate-spin text-sky-600 mr-3" />
        <span>Loading WhatsApp configuration...</span>
      </div>
    );
  }

  const isConnected = settings?.status === "CONNECTED";
  const isError = settings?.status === "ERROR";

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Top Breadcrumb & Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
          <Link href="/lab/dashboard" className="hover:text-slate-800 transition">
            Laboratory Admin
          </Link>
          <span>/</span>
          <span className="text-sky-600">WhatsApp Channel</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <MessageSquare className="h-6 w-6" />
              </span>
              Meta WhatsApp Business Connection
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Connect your laboratory&apos;s official Meta WhatsApp Business account for automated welcome replies and instant patient storefront entry.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTestConnection}
              disabled={testing || !settings?.configured}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-xs cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${testing ? "animate-spin text-sky-600" : "text-slate-500"}`} />
              {testing ? "Testing..." : "Test Connection"}
            </button>
          </div>
        </div>
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
            className="text-slate-400 hover:text-slate-600 transition"
          >
            ✕
          </button>
        </div>
      )}

      {/* Status & Trust Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Status Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Connection Status
            </div>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active & Connected
                </span>
              ) : isError ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Connection Error
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  Disconnected
                </span>
              )}
            </div>
            <p className="mt-3 text-xs text-slate-600">
              {isConnected
                ? "Inbound messages receive immediate branded welcome replies with patient action links."
                : isError
                ? settings?.errorMessage || "Meta Graph API reported an authentication or configuration error."
                : "Configure your Meta credentials below to activate your laboratory WhatsApp channel."}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Last verified: {settings?.lastVerifiedAt ? new Date(settings.lastVerifiedAt).toLocaleString("en-IN") : "Never"}
          </div>
        </div>

        {/* Channel Phone Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              WhatsApp Business Number
            </div>
            <div className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-emerald-600" />
              {settings?.displayPhoneNumber || "Not Configured"}
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Phone Number ID:{" "}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono text-[11px]">
                {settings?.phoneNumberId || "None"}
              </code>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Official Meta Cloud API
          </div>
        </div>

        {/* Architectural Guarantee Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Single Source of Truth
            </div>
            <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-sky-600" />
              Existing Storefront Entry
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              WhatsApp acts as an entry channel. All patient bookings, cart selections, health packages, and payments flow directly through your existing Gyrex laboratory storefront.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-emerald-700 font-medium">
            ✓ Zero duplicate cart or catalogue
          </div>
        </div>
      </div>

      {/* Webhook Endpoint Instructions Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md border border-slate-700 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Lock className="h-4 w-4" />
            Meta Developer Webhook Configuration
          </div>
          <span className="text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
            Method: GET & POST
          </span>
        </div>

        <p className="text-xs text-slate-300">
          In your Meta App Dashboard under <strong>WhatsApp → Configuration → Webhook</strong>, set the Callback URL and Verify Token as shown below. Subscribe to the <code className="bg-slate-700 text-emerald-300 px-1 py-0.5 rounded">messages</code> webhook field.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
          {/* Webhook URL */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-700/60 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">
                Callback URL
              </span>
              <code className="text-xs text-emerald-300 font-mono break-all select-all">
                {settings?.webhookUrl}
              </code>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => settings?.webhookUrl && handleCopy(settings.webhookUrl, "webhookUrl")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-600 cursor-pointer"
              >
                {copiedField === "webhookUrl" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                    Copy URL
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Webhook Verify Token */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-700/60 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">
                Verify Token
              </span>
              <code className="text-xs text-emerald-300 font-mono break-all select-all">
                {settings?.webhookVerifyToken}
              </code>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => settings?.webhookVerifyToken && handleCopy(settings.webhookVerifyToken, "verifyToken")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-600 cursor-pointer"
              >
                {copiedField === "verifyToken" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                    Copy Token
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Lock className="h-4 w-4 text-sky-600" />
            Meta Credentials & Connection Settings
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Credentials are encrypted using AES-256-GCM. Plain secret values are never exposed to the browser after saving.
          </p>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Enable Channel Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <div>
                <label className="text-sm font-semibold text-slate-800">
                  Enable WhatsApp Inbound Channel
                </label>
                <p className="text-xs text-slate-500">
                  Automatically respond to patient messages with laboratory storefront links.
                </p>
              </div>
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
            </div>

            {/* WABA ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                WhatsApp Business Account ID (WABA ID)
              </label>
              <input
                type="text"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                placeholder="e.g. 102938475610293"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Found in Meta Business Suite → WhatsApp Accounts.
              </span>
            </div>

            {/* Phone Number ID & Display Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phone Number ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="e.g. 594837261524310"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Display Phone Number
                </label>
                <input
                  type="text"
                  value={displayPhoneNumber}
                  onChange={(e) => setDisplayPhoneNumber(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                />
              </div>
            </div>

            {/* System User Permanent Access Token */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Permanent Access Token <span className="text-rose-500">*</span>
                </label>
                {settings?.hasAccessToken && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    Encrypted on Server
                  </span>
                )}
              </div>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder={settings?.hasAccessToken ? "•••••••••••••••••••• (Leave blank to keep existing token)" : "EAAG..."}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Generate in Meta Business Settings → System Users with <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded">whatsapp_business_messaging</code> permission.
              </span>
            </div>

            {/* Meta App Secret */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Meta App Secret (for X-Hub-Signature Verification)
                </label>
                {settings?.hasAppSecret && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    Encrypted on Server
                  </span>
                )}
              </div>
              <input
                type="password"
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                placeholder={settings?.hasAppSecret ? "•••••••••••••••••••• (Leave blank to keep existing secret)" : "Meta App Secret from App Settings -> Basic"}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Enables timing-safe HMAC-SHA256 signature verification for incoming webhook events.
              </span>
            </div>

            {/* Custom Welcome Message Override */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Custom Welcome Message (Optional)
              </label>
              <textarea
                rows={4}
                value={welcomeMessageCustom}
                onChange={(e) => setWelcomeMessageCustom(e.target.value)}
                placeholder="Leave blank to use the standard Gyrex Labs branded welcome message."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-slate-500">
                Available tags:{" "}
                <code className="bg-slate-100 px-1 py-0.5 rounded">{"{{patient_name}}"}</code>
                <code className="bg-slate-100 px-1 py-0.5 rounded">{"{{lab_name}}"}</code>
                <code className="bg-slate-100 px-1 py-0.5 rounded">{"{{store_url}}"}</code>
                <code className="bg-slate-100 px-1 py-0.5 rounded">{"{{packages_url}}"}</code>
                <code className="bg-slate-100 px-1 py-0.5 rounded">{"{{prescription_url}}"}</code>
                <code className="bg-slate-100 px-1 py-0.5 rounded">{"{{reports_url}}"}</code>
              </div>
            </div>

            {/* Phase 7B - Transactional Notification Preferences */}
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <Send className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Transactional Patient Notifications
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Automated WhatsApp notifications sent to patients. All messages include booking and tracking links with patient opt-out support.
              </p>

              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                {/* Order Confirmation */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                      Order Confirmation
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Send instant confirmation with schedule details, collection type, and tracking link when a patient places a booking.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyOrderConfirmation}
                    onChange={(e) => setNotifyOrderConfirmation(e.target.checked)}
                    className="h-4 w-4 mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                </div>

                {/* Payment Confirmation */}
                <div className="flex items-start justify-between gap-3 pt-2.5 border-t border-slate-200/80">
                  <div>
                    <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                      Payment Confirmation
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Notify patient with receipt details immediately when digital or online payment is verified.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyPaymentConfirmation}
                    onChange={(e) => setNotifyPaymentConfirmation(e.target.checked)}
                    className="h-4 w-4 mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                </div>

                {/* Sample Collected */}
                <div className="flex items-start justify-between gap-3 pt-2.5 border-t border-slate-200/80">
                  <div>
                    <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                      Sample Collection Status
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Alert patient when sample is collected by phlebotomist and is being processed in the laboratory.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifySampleCollected}
                    onChange={(e) => setNotifySampleCollected(e.target.checked)}
                    className="h-4 w-4 mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                </div>

                {/* Report Ready */}
                <div className="flex items-start justify-between gap-3 pt-2.5 border-t border-slate-200/80">
                  <div>
                    <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                      Diagnostic Report Ready
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Alert patient with a secure verification link to view and download their verified clinical report (never sends raw PDF files).
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyReportReady}
                    onChange={(e) => setNotifyReportReady(e.target.checked)}
                    className="h-4 w-4 mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50 transition shadow-xs cursor-pointer"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Encrypting & Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Save WhatsApp Settings
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live Patient Preview Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-emerald-600" />
              Patient Experience Preview
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              When a patient sends &ldquo;Hi&rdquo; or another message to your WhatsApp number, this automated welcome response is delivered instantly.
            </p>

            {/* Simulated WhatsApp Phone Frame */}
            <div className="rounded-2xl bg-emerald-950 p-3 shadow-inner border border-emerald-900">
              {/* WhatsApp Chat Header */}
              <div className="bg-[#075E54] text-white p-2.5 rounded-t-xl flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-emerald-200 text-emerald-900 font-bold flex items-center justify-center text-xs">
                  {settings?.displayPhoneNumber?.slice(-2) || "LB"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">
                    {settings?.displayPhoneNumber || "Your Laboratory"}
                  </div>
                  <div className="text-[10px] text-emerald-200">Online</div>
                </div>
              </div>

              {/* Chat Bubble Area */}
              <div className="bg-[#E5DDD5] p-3 rounded-b-xl space-y-3 min-h-[300px] text-slate-800 font-sans">
                {/* Patient Inbound Message */}
                <div className="flex justify-end">
                  <div className="bg-[#DCF8C6] text-xs p-2.5 rounded-lg rounded-tr-none shadow-xs max-w-[80%]">
                    Hi, I want to book blood tests.
                    <div className="text-[9px] text-slate-500 text-right mt-1">10:30 AM ✓✓</div>
                  </div>
                </div>

                {/* Laboratory Automated Reply */}
                <div className="flex justify-start">
                  <div className="bg-white text-xs p-3 rounded-lg rounded-tl-none shadow-xs max-w-[95%] whitespace-pre-line leading-relaxed text-slate-900">
                    {settings?.previewMessage}
                    <div className="text-[9px] text-slate-400 text-right mt-2">10:30 AM</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
              <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
              <span>
                All links in the message lead directly to your laboratory&apos;s existing digital storefront on Gyrex Labs.
              </span>
            </div>
          </div>

          {/* 4-Step Setup Guide */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-slate-500" />
              4-Step Meta Setup Guide
            </h3>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-semibold text-slate-800">1. Meta Developer App:</span> Create an app of type &ldquo;Business&rdquo; at{" "}
                <a
                  href="https://developers.facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-600 hover:underline inline-flex items-center gap-0.5"
                >
                  developers.facebook.com <ExternalLink className="h-3 w-3" />
                </a>.
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-semibold text-slate-800">2. Add WhatsApp Product:</span> Under &ldquo;API Setup&rdquo;, note your <strong>Phone Number ID</strong> and <strong>WABA ID</strong>.
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-semibold text-slate-800">3. System User Token:</span> In Meta Business Settings → System Users, create a token with <code className="bg-slate-200 px-1 py-0.5 rounded">whatsapp_business_messaging</code>.
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-semibold text-slate-800">4. Configure Webhook:</span> Paste the <strong>Callback URL</strong> and <strong>Verify Token</strong> above into Meta, and subscribe to <code className="bg-slate-200 px-1 py-0.5 rounded">messages</code>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
