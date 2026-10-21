"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Globe,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Info,
  Clock,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface DnsRecordInstruction {
  type: string;
  host: string;
  target?: string;
  value?: string;
  recommendedTtl: number;
  note: string;
}

interface DomainData {
  id: string;
  labId: string;
  domain: string;
  isApex: boolean;
  status: "PENDING_VERIFICATION" | "VERIFYING" | "ACTIVE" | "FAILED" | "SUSPENDED" | "REMOVED";
  sslStatus: "INITIALIZING" | "PENDING_VALIDATION" | "ACTIVE" | "EXPIRED" | "FAILED";
  verificationRecordName: string;
  verificationRecordValue: string;
  cnameTarget: string;
  verificationErrors: string | null;
  lastCheckedAt: string | null;
  verifiedAt: string | null;
  activatedAt: string | null;
  createdAt: string;
}

interface DomainApiResponse {
  success: boolean;
  isEntitled: boolean;
  defaultStorefrontUrl: string;
  domain: DomainData | null;
  dnsInstructions: {
    cname: DnsRecordInstruction;
    txt: DnsRecordInstruction;
  } | null;
}

export function BrandedDomainSettings() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [refreshingSsl, setRefreshingSsl] = useState(false);
  const [isEntitled, setIsEntitled] = useState(false);
  const [defaultStorefrontUrl, setDefaultStorefrontUrl] = useState("");
  const [domainData, setDomainData] = useState<DomainData | null>(null);
  const [dnsInstructions, setDnsInstructions] = useState<DomainApiResponse["dnsInstructions"] | null>(null);
  const [inputDomain, setInputDomain] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lab/domains");
      if (res.ok) {
        const data: DomainApiResponse = await res.json();
        setIsEntitled(Boolean(data.isEntitled));
        setDefaultStorefrontUrl(data.defaultStorefrontUrl || "");
        setDomainData(data.domain || null);
        setDnsInstructions(data.dnsInstructions || null);
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load domain configuration.");
      }
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to load domain configuration.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputDomain.trim()) return;

    setActionLoading(true);
    setNotification(null);

    try {
      const res = await fetch("/api/lab/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: inputDomain.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register custom domain.");
      }

      setInputDomain("");
      setDomainData(data.domain);
      setDnsInstructions(data.dnsInstructions);
      setNotification({
        type: "success",
        message: data.message || "Custom domain registered! Please configure the DNS records below.",
      });
      await loadData();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to register custom domain.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setNotification(null);

    try {
      const res = await fetch("/api/lab/domains/verify", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to verify domain.");
      }

      if (data.domain) {
        setDomainData(data.domain);
      }

      setNotification({
        type: data.success ? "success" : "info",
        message: data.message || (data.success ? "Domain verified successfully!" : "Verification pending."),
      });
      await loadData();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Domain verification check failed.",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleRefreshSsl = async () => {
    setRefreshingSsl(true);
    setNotification(null);

    try {
      const res = await fetch("/api/lab/domains", {
        method: "PATCH",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to refresh SSL status.");
      }

      if (data.domain) {
        setDomainData(data.domain);
      }

      setNotification({
        type: data.success ? "success" : "info",
        message: data.message || "SSL certificate status refreshed.",
      });
      await loadData();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to refresh SSL status.",
      });
    } finally {
      setRefreshingSsl(false);
    }
  };

  const handleDisconnect = async () => {
    if (!domainData) return;
    if (
      !confirm(
        `Are you sure you want to disconnect ${domainData.domain}? Your patients will be redirected to your default Gyrex Labs storefront URL.`
      )
    ) {
      return;
    }

    setActionLoading(true);
    setNotification(null);

    try {
      const res = await fetch("/api/lab/domains", {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to disconnect domain.");
      }

      setDomainData(null);
      setDnsInstructions(null);
      setNotification({
        type: "success",
        message: data.message || "Custom domain has been disconnected.",
      });
      await loadData();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to disconnect custom domain.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
        <span className="ml-3 text-xs font-medium">Loading domain settings…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Default Storefront Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Default Laboratory Storefront
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-slate-800">
                {defaultStorefrontUrl || "https://labs.gyrex.in/your-lab"}
              </span>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                Primary
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Your diagnostic storefront is always securely accessible via this platform address.
            </p>
          </div>
          {defaultStorefrontUrl && (
            <a
              href={defaultStorefrontUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              <span>View Storefront</span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </a>
          )}
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`rounded-xl p-4 text-xs font-medium border flex items-center gap-2.5 ${
            notification.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : notification.type === "info"
              ? "bg-sky-50 border-sky-200 text-sky-700"
              : "bg-emerald-50 border-emerald-200 text-emerald-700"
          }`}
        >
          {notification.type === "error" ? (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          ) : notification.type === "info" ? (
            <Info className="h-4 w-4 shrink-0 text-sky-600" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Ineligible Plan Banner */}
      {!isEntitled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-6 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Lock className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-amber-950">
                Custom Branded Domains are a Premium Capability
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
                Point your own domain (e.g. <span className="font-mono font-semibold">sharmadiagnostics.in</span>) directly to your Gyrex Labs diagnostic storefront. Custom domains include automated edge SSL certificates, white-label patient checkout, and direct branding.
              </p>
              <div className="pt-2">
                <Link
                  href="/lab/subscription"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-800 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-900 transition"
                >
                  <span>Upgrade Subscription Plan</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Entitled Main Management Section */}
      {isEntitled && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-sky-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Custom Branded Domain
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Connect your laboratory&apos;s own domain or subdomain to give patients a seamless white-label experience.
            </p>
          </div>

          {/* Registration Form when no domain is connected */}
          {!domainData && (
            <form onSubmit={handleRegister} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Enter Custom Domain or Subdomain
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="e.g. sharmadiagnostics.in or book.sharmalab.com"
                      value={inputDomain}
                      onChange={(e) => setInputDomain(e.target.value)}
                      disabled={actionLoading}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={actionLoading || !inputDomain.trim()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-700 disabled:opacity-50 transition cursor-pointer"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Connecting…</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" />
                        <span>Connect Domain</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Enter a domain you own. Do not include http:// or slashes.
                </p>
              </div>
            </form>
          )}

          {/* Active / Pending Domain Card */}
          {domainData && (
            <div className="space-y-6">
              {/* Domain Header Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-900">
                      {domainData.domain}
                    </span>
                    {domainData.isApex && (
                      <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                        Apex Domain
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {/* Status Badge */}
                    {domainData.status === "ACTIVE" ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Domain Live
                      </span>
                    ) : domainData.status === "VERIFYING" ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-700 border border-sky-200">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Ownership Verified
                      </span>
                    ) : domainData.status === "FAILED" ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Verification Failed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                        <Clock className="h-3.5 w-3.5" />
                        Pending DNS Setup
                      </span>
                    )}

                    {/* SSL Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold border ${
                        domainData.sslStatus === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : domainData.sslStatus === "FAILED"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      <Lock className="h-3 w-3" />
                      SSL: {domainData.sslStatus === "ACTIVE" ? "Secured" : domainData.sslStatus === "FAILED" ? "Failed" : "Provisioning"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={verifying || refreshingSsl || actionLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${verifying ? "animate-spin" : ""}`} />
                    <span>{verifying ? "Checking DNS…" : "Verify DNS"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRefreshSsl}
                    disabled={refreshingSsl || verifying || actionLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${refreshingSsl ? "animate-spin" : ""}`} />
                    <span>{refreshingSsl ? "Refreshing SSL…" : "Refresh SSL"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={verifying || refreshingSsl || actionLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                    <span>Disconnect</span>
                  </button>
                </div>
              </div>

              {/* Lifecycle Progress Bar */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Domain Setup Stages
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
                    <div className="font-bold flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> 1. Domain Registered
                    </div>
                    <p className="mt-1 text-[11px] text-emerald-700">Hostname added to laboratory profile.</p>
                  </div>

                  <div className={`p-3 rounded-lg border ${
                    domainData.verifiedAt || domainData.status === "VERIFYING" || domainData.status === "ACTIVE"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}>
                    <div className="font-bold flex items-center gap-1">
                      {domainData.verifiedAt ? <Check className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                      2. Ownership Verified
                    </div>
                    <p className="mt-1 text-[11px]">
                      {domainData.verifiedAt ? "DNS TXT ownership confirmed." : "Add TXT verification record."}
                    </p>
                  </div>

                  <div className={`p-3 rounded-lg border ${
                    domainData.sslStatus === "ACTIVE"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}>
                    <div className="font-bold flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> 3. SSL &amp; Edge Active
                    </div>
                    <p className="mt-1 text-[11px]">
                      {domainData.sslStatus === "ACTIVE" ? "Edge SSL active." : "Provisioned automatically (Phase C)."}
                    </p>
                  </div>

                  <div className={`p-3 rounded-lg border ${
                    domainData.status === "ACTIVE"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}>
                    <div className="font-bold flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" /> 4. Live Storefront
                    </div>
                    <p className="mt-1 text-[11px]">
                      {domainData.status === "ACTIVE" ? "Serving patient traffic." : "Activated once SSL issues."}
                    </p>
                  </div>
                </div>
              </div>

              {/* DNS Configuration Instructions */}
              {dnsInstructions && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Required DNS Records
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Log into your DNS provider (GoDaddy, Namecheap, Cloudflare, etc.) and add the two records below:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {/* Record 1: CNAME Record */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-sky-100 px-2 py-0.5 font-mono text-[11px] font-bold text-sky-800">
                          Record 1: {dnsInstructions.cname.type || "CNAME"} (Traffic Routing)
                        </span>
                        <span className="text-[11px] text-slate-400">TTL: 300s (Auto)</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Name / Host</span>
                          <div className="mt-1 flex items-center justify-between font-mono font-semibold text-slate-800">
                            <span>{dnsInstructions.cname.host}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(dnsInstructions.cname.host, "cname_host")}
                              className="text-slate-400 hover:text-slate-700 transition"
                              title="Copy Host"
                            >
                              {copiedKey === "cname_host" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Target / Value</span>
                          <div className="mt-1 flex items-center justify-between font-mono font-semibold text-slate-800">
                            <span>{dnsInstructions.cname.target}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(dnsInstructions.cname.target || "", "cname_target")}
                              className="text-slate-400 hover:text-slate-700 transition"
                              title="Copy Target"
                            >
                              {copiedKey === "cname_target" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500">{dnsInstructions.cname.note}</p>
                    </div>

                    {/* Record 2: TXT Record */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-purple-100 px-2 py-0.5 font-mono text-[11px] font-bold text-purple-800">
                          Record 2: TXT (Ownership Verification)
                        </span>
                        <span className="text-[11px] text-slate-400">TTL: 300s (Auto)</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Record Name / Host</span>
                          <div className="mt-1 flex items-center justify-between font-mono font-semibold text-slate-800">
                            <span className="truncate">{dnsInstructions.txt.host}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(dnsInstructions.txt.host, "txt_host")}
                              className="text-slate-400 hover:text-slate-700 transition shrink-0 ml-2"
                              title="Copy Host"
                            >
                              {copiedKey === "txt_host" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Record Value</span>
                          <div className="mt-1 flex items-center justify-between font-mono font-semibold text-slate-800">
                            <span className="truncate">{dnsInstructions.txt.value}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(dnsInstructions.txt.value || "", "txt_value")}
                              className="text-slate-400 hover:text-slate-700 transition shrink-0 ml-2"
                              title="Copy Value"
                            >
                              {copiedKey === "txt_value" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500">{dnsInstructions.txt.note}</p>
                    </div>
                  </div>

                  {domainData.verificationErrors && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-800 flex items-start gap-2.5">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                      <div>
                        <span className="font-semibold">Verification Note:</span>{" "}
                        {domainData.verificationErrors}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
