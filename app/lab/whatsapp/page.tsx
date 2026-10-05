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
        <span>Loading WhatsApp configuration...</span>
      </div>
    );
  }

  const isConnected = settings?.status === "CONNECTED";
  const isError = settings?.status === "ERROR";

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Breadcrumb & Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
          <Link href="/lab/dashboard" className="hover:text-slate-800 transition">
            Laboratory Admin
          </Link>
          <span>/</span>
          <span className="text-sky-600">WhatsApp Integration</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                <MessageSquare className="h-6 w-6" />
              </span>
              Meta WhatsApp Business Integration
            </h1>
            <p className="mt-1 text-sm text-slate-600 max-w-3xl">
              Connect your laboratory&apos;s official Meta WhatsApp Business account. Your laboratory owns the Meta Business Account and phone number; Gyrex Labs provides the webhook endpoint, real-time message routing, and automated storefront entry.
            </p>
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

      {/* Card C: Connection Status & Test */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Connection Status:
              </span>
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Active & Connected
                </span>
              ) : isError ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Connection Error
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  Not Connected
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <Smartphone className="h-3.5 w-3.5 text-slate-400" />
                Display Number: <strong className="text-slate-800">{settings?.displayPhoneNumber || "Not configured"}</strong>
              </span>
              <span>•</span>
              <span>
                Phone Number ID: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono text-[11px]">{settings?.phoneNumberId || "None"}</code>
              </span>
              <span>•</span>
              <span className="text-slate-400">
                Last checked: {settings?.lastVerifiedAt ? new Date(settings.lastVerifiedAt).toLocaleString("en-IN") : "Never"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleTestConnection}
              disabled={testing || !settings?.configured}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50 transition shadow-xs cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${testing ? "animate-spin" : ""}`} />
              {testing ? "Testing..." : "Test Connection"}
            </button>
          </div>
        </div>

        {isError && settings?.errorMessage && (
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-rose-600 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{settings.errorMessage}</span>
          </div>
        )}
      </div>

      {/* Card B: Gyrex Webhook Configuration */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-sky-500" />
              Gyrex Webhook Configuration
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter these values into your Meta App Dashboard under <strong>WhatsApp → Configuration → Webhook</strong>.
            </p>
          </div>
          <span className="text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 font-medium">
            HTTP Handshake: GET & POST
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Callback URL */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                Callback URL
              </span>
              <code className="text-xs text-slate-800 font-mono break-all select-all block bg-white p-2 rounded border border-slate-200">
                {settings?.webhookUrl || "Loading..."}
              </code>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => settings?.webhookUrl && handleCopy(settings.webhookUrl, "webhookUrl")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 transition border border-slate-200 cursor-pointer shadow-xs"
              >
                {copiedField === "webhookUrl" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
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
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                Verify Token
              </span>
              <code className="text-xs text-slate-800 font-mono break-all select-all block bg-white p-2 rounded border border-slate-200">
                {settings?.webhookVerifyToken || "Loading..."}
              </code>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => settings?.webhookVerifyToken && handleCopy(settings.webhookVerifyToken, "verifyToken")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 transition border border-slate-200 cursor-pointer shadow-xs"
              >
                {copiedField === "verifyToken" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
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

        {/* Step-by-step setup guide */}
        <div className="pt-2 border-t border-slate-100">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" />
            Meta Webhook Setup Instructions
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-slate-600">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="font-semibold text-slate-800 block mb-0.5">1. Meta Developer App</span>
              Open your business app in{" "}
              <a
                href="https://developers.facebook.com"
                target="_blank"
                rel="noreferrer"
                className="text-sky-600 hover:underline inline-flex items-center gap-0.5"
              >
                Meta Developer Portal <ExternalLink className="h-3 w-3" />
              </a>.
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="font-semibold text-slate-800 block mb-0.5">2. Webhook Settings</span>
              Navigate to WhatsApp → Configuration → Edit Webhook.
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="font-semibold text-slate-800 block mb-0.5">3. Paste Gyrex Values</span>
              Paste the Callback URL and Verify Token from above, then click &ldquo;Verify and Save&rdquo;.
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="font-semibold text-slate-800 block mb-0.5">4. Subscribe Field</span>
              In Webhook fields, click &ldquo;Manage&rdquo; and subscribe to the <code className="bg-slate-200/80 px-1 py-0.5 rounded text-[11px] font-mono">messages</code> field.
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Card A (Form) & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Card A: Meta WhatsApp Business Details */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="border-b border-slate-100 pb-4 mb-5">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="h-4 w-4 text-sky-500" />
              Your Meta WhatsApp Business Details
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Your credentials are encrypted using AES-256-GCM. Plain secret values are never transmitted to the browser after saving.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Enable Channel Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/60">
              <div>
                <label className="text-xs font-semibold text-slate-800 block">
                  Enable WhatsApp Automated Inbound
                </label>
                <p className="text-[11px] text-slate-500">
                  Respond to inbound patient messages with your laboratory&apos;s verified storefront links.
                </p>
              </div>
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500 cursor-pointer"
              />
            </div>

            {/* WABA ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                WhatsApp Business Account ID (WABA ID)
              </label>
              <input
                type="text"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                placeholder="e.g. 102938475610293"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Found in Meta Business Suite → WhatsApp Accounts.
              </span>
            </div>

            {/* Phone Number ID & Display Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Phone Number ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="e.g. 594837261524310"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Display Phone Number
                </label>
                <input
                  type="text"
                  value={displayPhoneNumber}
                  onChange={(e) => setDisplayPhoneNumber(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                />
              </div>
            </div>

            {/* Permanent Access Token */}
            <div>
              <div className="flex items-center justify-between mb-1">
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
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Generate in Meta Business Settings → System Users with <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded">whatsapp_business_messaging</code> permission.
              </span>
            </div>

            {/* Meta App Secret */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Meta App Secret (for HMAC-SHA256 Verification)
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
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Enables timing-safe HMAC-SHA256 signature verification for incoming webhook events.
              </span>
            </div>

            {/* Custom Welcome Message */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Custom Welcome Message (Optional)
              </label>
              <textarea
                rows={3}
                value={welcomeMessageCustom}
                onChange={(e) => setWelcomeMessageCustom(e.target.value)}
                placeholder="Leave blank to use the standard Gyrex Labs branded welcome message."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-slate-500">
                Variables:{" "}
                <code className="bg-slate-100 px-1 py-0.5 rounded">{"{{patient_name}}"}</code>
                <code className="bg-slate-100 px-1 py-0.5 rounded">{"{{lab_name}}"}</code>
                <code className="bg-slate-100 px-1 py-0.5 rounded">{"{{store_url}}"}</code>
                <code className="bg-slate-100 px-1 py-0.5 rounded">{"{{packages_url}}"}</code>
                <code className="bg-slate-100 px-1 py-0.5 rounded">{"{{reports_url}}"}</code>
              </div>
            </div>

            {/* Transactional Notification Preferences */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <Send className="h-3.5 w-3.5 text-sky-500" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Transactional Patient Notifications
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Automated clinical notifications sent to patients. All messages include booking and tracking links with patient opt-out support.
              </p>

              <div className="space-y-2.5 bg-slate-50/70 p-3 rounded-lg border border-slate-200">
                {/* Order Confirmation */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-800 cursor-pointer">
                      Order Confirmation
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Send instant confirmation with schedule details and tracking link when a patient books tests.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyOrderConfirmation}
                    onChange={(e) => setNotifyOrderConfirmation(e.target.checked)}
                    className="h-4 w-4 mt-0.5 rounded border-slate-300 text-sky-500 focus:ring-sky-500 cursor-pointer"
                  />
                </div>

                {/* Payment Confirmation */}
                <div className="flex items-start justify-between gap-3 pt-2 border-t border-slate-200/80">
                  <div>
                    <label className="text-xs font-semibold text-slate-800 cursor-pointer">
                      Payment Confirmation
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Notify patient with receipt details immediately when payment is verified.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyPaymentConfirmation}
                    onChange={(e) => setNotifyPaymentConfirmation(e.target.checked)}
                    className="h-4 w-4 mt-0.5 rounded border-slate-300 text-sky-500 focus:ring-sky-500 cursor-pointer"
                  />
                </div>

                {/* Sample Collected */}
                <div className="flex items-start justify-between gap-3 pt-2 border-t border-slate-200/80">
                  <div>
                    <label className="text-xs font-semibold text-slate-800 cursor-pointer">
                      Sample Collection Status
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Alert patient when sample is collected by phlebotomist and is being processed.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifySampleCollected}
                    onChange={(e) => setNotifySampleCollected(e.target.checked)}
                    className="h-4 w-4 mt-0.5 rounded border-slate-300 text-sky-500 focus:ring-sky-500 cursor-pointer"
                  />
                </div>

                {/* Report Ready */}
                <div className="flex items-start justify-between gap-3 pt-2 border-t border-slate-200/80">
                  <div>
                    <label className="text-xs font-semibold text-slate-800 cursor-pointer">
                      Diagnostic Report Ready
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Alert patient with a secure verification link to view and download their verified clinical report.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyReportReady}
                    onChange={(e) => setNotifyReportReady(e.target.checked)}
                    className="h-4 w-4 mt-0.5 rounded border-slate-300 text-sky-500 focus:ring-sky-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50 transition shadow-xs cursor-pointer"
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

        {/* Live Patient Preview & Architecture Info */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-sky-500" />
              Patient Experience Preview
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              When a patient sends an inbound greeting to your WhatsApp number, this automated welcome response is delivered immediately.
            </p>

            {/* Clean Light-Themed Chat Container */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 shadow-inner">
              {/* WhatsApp Chat Header */}
              <div className="bg-slate-800 text-white p-2.5 rounded-t-lg flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-full bg-sky-500 text-white font-bold flex items-center justify-center text-xs">
                  {settings?.displayPhoneNumber?.slice(-2) || "LB"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">
                    {settings?.displayPhoneNumber || "Your Laboratory"}
                  </div>
                  <div className="text-[10px] text-slate-300">Official Laboratory Account</div>
                </div>
              </div>

              {/* Chat Bubble Area */}
              <div className="bg-slate-100 p-3 rounded-b-lg space-y-3 min-h-[260px] text-slate-800">
                {/* Patient Inbound Message */}
                <div className="flex justify-end">
                  <div className="bg-sky-100 text-slate-900 text-xs p-2.5 rounded-lg rounded-tr-none shadow-xs max-w-[85%] border border-sky-200/60">
                    Hi, I would like to book blood tests.
                    <div className="text-[9px] text-slate-400 text-right mt-1">10:30 AM</div>
                  </div>
                </div>

                {/* Laboratory Automated Reply */}
                <div className="flex justify-start">
                  <div className="bg-white text-xs p-3 rounded-lg rounded-tl-none shadow-xs max-w-[95%] whitespace-pre-line leading-relaxed text-slate-900 border border-slate-200">
                    {settings?.previewMessage}
                    <div className="text-[9px] text-slate-400 text-right mt-2">10:30 AM</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-sky-50/60 border border-sky-100 text-xs text-sky-800 flex items-start gap-2">
              <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
              <span>
                All links lead directly to your laboratory&apos;s digital storefront on Gyrex Labs. Orders and payments flow through your existing single source of truth.
              </span>
            </div>
          </div>

          {/* Architecture Guarantee Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-sky-500" />
              Multi-Tenant Architecture
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Gyrex Labs utilizes strict tenant-isolated webhook routing. Webhooks are verified against your laboratory&apos;s specific phone number ID and encrypted credentials, guaranteeing zero cross-tenant contamination.
            </p>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-sky-500" />
              Tenant isolation verified by automated test suite
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
