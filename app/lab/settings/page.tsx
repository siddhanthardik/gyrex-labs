"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Building2,
  Store,
  MapPin,
  Truck,
  CreditCard,
  Bell,
  MessageSquare,
  Users,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Save,
  Clock,
  Phone,
  Mail,
  QrCode,
  Globe,
} from "lucide-react";

type SettingsSection =
  | "profile"
  | "storefront"
  | "contact"
  | "collection"
  | "payment"
  | "notifications"
  | "whatsapp"
  | "team"
  | "publishing";

function LabSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSection = (searchParams.get("section") as SettingsSection) || "profile";

  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lab, setLab] = useState<any>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    emergencyPhone: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    heroHeadline: "",
    heroSubheadline: "",
    homeCollectionAvailable: true,
    homeCollectionFee: 100,
    freeHomeCollectionThreshold: 1000,
    deliveryPromiseNotice: "Reports delivered within 24 hours",
    primaryColor: "#0284c7",
  });

  useEffect(() => {
    const s = searchParams.get("section") as SettingsSection;
    if (s && s !== activeSection) {
      setActiveSection(s);
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/lab/settings");
        if (res.ok) {
          const d = await res.json();
          setLab(d.lab);
          setFormData({
            name: d.lab.name || "",
            phone: d.lab.phone || "",
            emergencyPhone: d.lab.whatsapp || d.lab.phone || "",
            email: d.lab.email || "",
            addressLine1: d.lab.addressLine1 || "",
            addressLine2: d.lab.addressLine2 || "",
            city: d.lab.city || "",
            state: d.lab.state || "",
            postalCode: d.lab.postalCode || "",
            heroHeadline: d.settings?.heroHeadline || "Book Diagnostic Tests Online",
            heroSubheadline: d.settings?.heroSubheadline || "Accurate reports, professional care.",
            homeCollectionAvailable: d.settings?.homeCollectionAvailable ?? true,
            homeCollectionFee: d.settings?.homeCollectionFee ?? 100,
            freeHomeCollectionThreshold: d.settings?.freeHomeCollectionThreshold ?? 1000,
            deliveryPromiseNotice: d.settings?.deliveryPromiseNotice || "Reports delivered within 24 hours",
            primaryColor: d.settings?.primaryColor || "#0284c7",
          });
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleTabChange = (section: SettingsSection) => {
    setActiveSection(section);
    router.replace(`/lab/settings?section=${section}`, { scroll: false });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotification(null);

    try {
      const res = await fetch("/api/lab/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update store settings.");
      }

      setNotification({
        type: "success",
        message: "Settings saved successfully.",
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to update settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  const navItems: Array<{ id: SettingsSection; label: string; icon: React.ReactNode }> = [
    { id: "profile", label: "Laboratory Profile", icon: <Building2 className="h-4 w-4" /> },
    { id: "storefront", label: "Storefront", icon: <Store className="h-4 w-4" /> },
    { id: "contact", label: "Contact & Location", icon: <MapPin className="h-4 w-4" /> },
    { id: "collection", label: "Collection Settings", icon: <Truck className="h-4 w-4" /> },
    { id: "payment", label: "Payment", icon: <CreditCard className="h-4 w-4" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
    { id: "whatsapp", label: "WhatsApp Channel", icon: <MessageSquare className="h-4 w-4" /> },
    { id: "team", label: "Team & Access", icon: <Users className="h-4 w-4" /> },
    { id: "publishing", label: "Publishing", icon: <Globe className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24 text-slate-500">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
        <span className="ml-3 text-sm">Loading laboratory settings...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Laboratory Settings
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Configure your laboratory details, storefront presentation, sample collection, and operational channels.
          </p>
        </div>

        {lab && (
          <Link
            href={`/${lab.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <span>Preview Live Storefront</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </Link>
        )}
      </div>

      {notification && (
        <div
          className={`rounded-xl p-4 text-xs font-medium border flex items-center gap-2.5 ${
            notification.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : "bg-emerald-50 border-emerald-200 text-emerald-700"
          }`}
        >
          {notification.type === "error" ? (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Layout: Left Navigation + Right Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Section Navigation (3 cols) */}
        <div className="lg:col-span-3">
          <nav className="rounded-xl border border-slate-200 bg-white p-2 shadow-xs space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabChange(item.id)}
                className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition text-left cursor-pointer ${
                  activeSection === item.id
                    ? "bg-sky-50 text-sky-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className={activeSection === item.id ? "text-sky-600" : "text-slate-400"}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Right Section Content (9 cols) */}
        <div className="lg:col-span-9">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section: Laboratory Profile */}
            {activeSection === "profile" && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-base font-semibold text-slate-900">Laboratory Profile</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official laboratory identity and regulatory details visible to patients.
                  </p>
                </div>

                {lab && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Platform Verification
                      </span>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        {lab.isVerified ? "Verified Diagnostic Laboratory" : "Pending Gyrex Verification"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                        lab.isVerified
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>{lab.isVerified ? "Verified ✓" : "Pending"}</span>
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700">Laboratory Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700">Official Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700">Store URL Slug</label>
                    <input
                      type="text"
                      disabled
                      value={lab?.slug || ""}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-600 transition disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{saving ? "Saving..." : "Save Profile"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Section: Storefront */}
            {activeSection === "storefront" && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-base font-semibold text-slate-900">Storefront Presentation</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Customize your digital storefront banners, headlines, and turnaround promises.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Hero Headline</label>
                    <input
                      type="text"
                      value={formData.heroHeadline}
                      onChange={(e) => setFormData({ ...formData, heroHeadline: e.target.value })}
                      placeholder="e.g. Book Diagnostic Tests Online"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700">Hero Subheadline</label>
                    <input
                      type="text"
                      value={formData.heroSubheadline}
                      onChange={(e) => setFormData({ ...formData, heroSubheadline: e.target.value })}
                      placeholder="e.g. Accurate reports, NABL accredited standards, home sample collection."
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Report Turnaround Promise Notice
                    </label>
                    <input
                      type="text"
                      value={formData.deliveryPromiseNotice}
                      onChange={(e) => setFormData({ ...formData, deliveryPromiseNotice: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-600 transition disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{saving ? "Saving..." : "Save Storefront"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Section: Contact & Location */}
            {activeSection === "contact" && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-base font-semibold text-slate-900">Contact & Physical Location</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your public contact phone, emergency WhatsApp, and laboratory physical address.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Public Phone *</label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700">WhatsApp Support Phone</label>
                    <input
                      type="text"
                      value={formData.emergencyPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700">Street Address *</label>
                    <input
                      type="text"
                      required
                      value={formData.addressLine1}
                      onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700">City *</label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700">State *</label>
                    <input
                      type="text"
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700">Postal Code / PIN *</label>
                    <input
                      type="text"
                      required
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-600 transition disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{saving ? "Saving..." : "Save Contact & Location"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Section: Collection Settings */}
            {activeSection === "collection" && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-base font-semibold text-slate-900">Home Collection Rules</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure phlebotomist home visit fees and free collection order thresholds.
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.homeCollectionAvailable}
                      onChange={(e) =>
                        setFormData({ ...formData, homeCollectionAvailable: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                    />
                    <span className="text-xs font-medium text-slate-900">
                      Offer Home Sample Collection to patients booking via your store
                    </span>
                  </label>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Home Sample Collection Fee (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.homeCollectionFee}
                        onChange={(e) =>
                          setFormData({ ...formData, homeCollectionFee: Number(e.target.value) })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Free Collection Order Threshold (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.freeHomeCollectionThreshold}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            freeHomeCollectionThreshold: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-600 transition disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{saving ? "Saving..." : "Save Collection Settings"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Section: Payment (Cross-link to /lab/payment-settings) */}
            {activeSection === "payment" && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-base font-semibold text-slate-900">Patient Payment Settings</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure how booking patients pay your diagnostic laboratory.
                  </p>
                </div>

                <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-sky-600" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      Direct Financial Settlement
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600">
                    Patient payments flow directly into your laboratory account through Pay at Sample Collection, direct laboratory UPI / VPA, or your own Razorpay gateway.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/lab/payment-settings"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-600 transition"
                    >
                      <span>Open Patient Payment Settings</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Section: Notifications */}
            {activeSection === "notifications" && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-base font-semibold text-slate-900">Patient Notifications</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Automated patient communication triggers for appointment confirmations and test report delivery.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">Booking Confirmation</p>
                      <p className="text-[11px] text-slate-500">Sent instantly when patient places a new diagnostic order</p>
                    </div>
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                      Active
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">Sample Collected Notification</p>
                      <p className="text-[11px] text-slate-500">Alerts patient when phlebotomist logs sample accession</p>
                    </div>
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                      Active
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">Test Report Dispatch</p>
                      <p className="text-[11px] text-slate-500">Sends secure report download link once pathologist authorizes</p>
                    </div>
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Section: WhatsApp Channel */}
            {activeSection === "whatsapp" && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-base font-semibold text-slate-900">WhatsApp Channel</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Connect your laboratory WhatsApp business number for direct patient inquiries and report delivery.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Official WhatsApp Support Number
                    </label>
                    <input
                      type="text"
                      value={formData.emergencyPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Patients clicking WhatsApp support in your digital store will chat directly with this number.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-600 transition disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{saving ? "Saving..." : "Save WhatsApp Channel"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Section: Team & Access */}
            {activeSection === "team" && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-base font-semibold text-slate-900">Team & Access Management</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage laboratory staff, phlebotomists, and administrative access permissions.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-slate-700" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      Laboratory Operations Team
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600">
                    Invite staff members, assign role permissions (LAB_OWNER, LAB_ADMIN, LAB_STAFF), and manage active user access in the dedicated Staff & Roles console.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/lab/staff"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-600 transition"
                    >
                      <span>Manage Laboratory Staff & Roles</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Section: Publishing */}
            {activeSection === "publishing" && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-base font-semibold text-slate-900">Store Publishing Readiness</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Verify pre-launch requirements before opening your digital store to patients.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-sky-600" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      Launch Checklist & Status
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600">
                    Track catalogue readiness, pricing validation, payment gateway credentials, and publish your store to the live web.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/lab/publish"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-600 transition"
                    >
                      <span>Open Store Publishing Console</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LabSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-24 text-slate-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          <span className="ml-3 text-sm">Loading settings...</span>
        </div>
      }
    >
      <LabSettingsContent />
    </Suspense>
  );
}
