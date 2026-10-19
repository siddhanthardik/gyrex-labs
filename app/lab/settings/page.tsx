"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Building2,
  Store,
  MapPin,
  CreditCard,
  MessageSquare,
  Users,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Save,
  Globe,
  Upload,
  Trash2,
  Plus,
  Stethoscope,
  Clock,
  Sparkles,
  ArrowUpRight,
  Undo2,
  Check,
  Eye,
  EyeOff,
  Palette,
  Image as ImageIcon,
  Smartphone,
  Monitor,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IndiaLocationSelector } from "@/components/common/IndiaLocationSelector";
import {
  CLINICAL_COLOR_PRESETS,
  evaluateStorefrontContrast,
  ClinicalColorPreset,
} from "@/lib/utils/contrast";
import {
  StorefrontLivePreview,
  PreviewTestData,
  PreviewPackageData,
} from "@/components/lab/storefront-live-preview";
import { ServiceAreasSettings } from "@/components/lab/service-areas-settings";
import { BranchManagementSettings } from "@/components/lab/branch-management-settings";

type SettingsSection =
  | "profile"
  | "storefront"
  | "about_services"
  | "team"
  | "contact"
  | "service_areas"
  | "branches"
  | "whatsapp"
  | "payment"
  | "publishing";

interface TeamMember {
  name: string;
  role: string;
  qualifications: string;
  photoUrl?: string | null;
}

interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

/**
 * Robust wrapper around fetch to safely handle JSON and non-JSON (HTML 401/403/500/502) error responses
 * without throwing "SyntaxError: Unexpected token < in JSON at position 0".
 */
async function safeApiRequest<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(input, init);
    const contentType = res.headers.get("content-type") || "";
    let data: any = null;
    let error: string | null = null;

    if (contentType.includes("application/json")) {
      try {
        data = await res.json();
      } catch {
        error = "Received invalid JSON payload from server.";
      }
    } else {
      const text = await res.text();
      if (!res.ok) {
        if (res.status === 401) {
          error = "Your session has expired. Please log in again to continue.";
        } else if (res.status === 403) {
          error = "You do not have permission to perform this action.";
        } else if (res.status === 502 || res.status === 504) {
          error = "Gateway timeout / service temporarily unavailable. Please retry in a few moments.";
        } else if (res.status >= 500) {
          error = `Server error (${res.status}). Please try again later.`;
        } else {
          error = `Request failed (${res.status}): ${text.slice(0, 100)}`;
        }
      }
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: data?.error || error || `Request failed with status ${res.status}`,
      };
    }

    return { ok: true, status: res.status, data };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      error: err.message || "Network error. Please check your connection.",
    };
  }
}

/**
 * Computes whether NABL accreditation is currently valid based on active toggle,
 * valid number, and whether today's date falls within [validFrom, validUntil].
 */
export function computeIsNablValid(
  isAccredited: boolean,
  accreditationNumber: string | null | undefined,
  validFrom: string | null | undefined,
  validUntil: string | null | undefined
): boolean {
  if (!isAccredited || !accreditationNumber?.trim()) return false;
  if (!validFrom || !validUntil) return false;
  const now = new Date();
  const from = new Date(validFrom);
  const until = new Date(validUntil);
  if (isNaN(from.getTime()) || isNaN(until.getTime())) return false;
  until.setHours(23, 59, 59, 999);
  return now >= from && now <= until;
}

const DEFAULT_SERVICES = [
  "Clinical Pathology & Hematology",
  "Biochemistry & Metabolic Panels",
  "Preventive Full Body Checkups",
  "Home Sample Collection at Doorstep",
  "Endocrinology & Thyroid Assays",
  "Infectious Disease & Serology",
  "Clinical Urine & Stool Analysis",
];

function LabSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawSection =
    (searchParams.get("section") as SettingsSection) ||
    (searchParams.get("tab") as SettingsSection) ||
    "profile";

  const initialSection: SettingsSection = [
    "profile",
    "storefront",
    "about_services",
    "team",
    "contact",
    "service_areas",
    "branches",
    "whatsapp",
    "payment",
    "publishing",
  ].includes(rawSection)
    ? rawSection
    : "profile";

  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [lab, setLab] = useState<any>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bannerUploading, setBannerUploading] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [stagedBannerFilename, setStagedBannerFilename] = useState<string | null>(null);

  const [certificateUploading, setCertificateUploading] = useState(false);
  const certInputRef = useRef<HTMLInputElement>(null);

  const [initialFormData, setInitialFormData] = useState<any>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [catalogueStats, setCatalogueStats] = useState<{
    activeTestsCount: number;
    popularTests: PreviewTestData[];
    activePackagesCount: number;
    popularPackages: PreviewPackageData[];
  }>({
    activeTestsCount: 0,
    popularTests: [],
    activePackagesCount: 0,
    popularPackages: [],
  });

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
    logoUrl: null as string | null,
    bannerUrl: null as string | null,
    homeCollectionAvailable: true,
    homeCollectionFee: 100,
    freeHomeCollectionThreshold: 1000,
    deliveryPromiseNotice: "Reports delivered within 24 hours",
    primaryColor: "#0369a1",
    accentColor: "#0ea5e9",
    licenseNumber: "",
    isNablAccredited: false,
    nablAccreditationNumber: "",
    nablValidFrom: "",
    nablValidUntil: "",
    nablCertificateUrl: null as string | null,
    about: "",
    operatingHoursSchedule: "Monday - Saturday: 7:00 AM - 8:00 PM | Sunday: 7:00 AM - 2:00 PM",
    services: DEFAULT_SERVICES as string[],
    customServiceInput: "",
    team: [] as TeamMember[],
  });

  useEffect(() => {
    const s = (searchParams.get("section") || searchParams.get("tab")) as SettingsSection;
    if (s && s !== activeSection) {
      setActiveSection(s);
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await safeApiRequest("/api/lab/settings");
        if (res.ok && res.data) {
          const d = res.data;
          setLab(d.lab);
          const rawWorkingHours = (d.settings?.workingHours as Record<string, any>) || {};
          const nablMeta = rawWorkingHours.nabl || {};

          const hasNabl =
            d.lab.isNablAccredited !== undefined
              ? Boolean(d.lab.isNablAccredited)
              : nablMeta.isAccredited !== undefined
              ? Boolean(nablMeta.isAccredited)
              : Boolean(
                  d.lab.nablAccreditationNumber && d.lab.nablAccreditationNumber.trim().length > 0
                );

          // Resolve About
          const about =
            (typeof rawWorkingHours.about === "string" && rawWorkingHours.about.trim()) ||
            d.settings?.metaDescription ||
            `${d.lab.name || "Our diagnostic center"} is committed to providing accurate and timely laboratory investigations with professional clinical standards.`;

          // Resolve Schedule
          let schedule = "";
          if (typeof rawWorkingHours.schedule === "string" && rawWorkingHours.schedule.trim()) {
            schedule = rawWorkingHours.schedule.trim();
          } else if (rawWorkingHours.monday) {
            schedule = "Mon - Sat: 07:00 AM - 08:00 PM | Sun: 07:00 AM - 02:00 PM";
          } else {
            schedule = "Monday - Saturday: 7:00 AM - 8:00 PM | Sunday: 7:00 AM - 2:00 PM";
          }

          // Resolve Services
          let services: string[] = DEFAULT_SERVICES;
          if (Array.isArray(rawWorkingHours.services) && rawWorkingHours.services.length > 0) {
            services = rawWorkingHours.services.map((s: any) => String(s).trim()).filter(Boolean);
          }

          // Resolve Team
          let team: TeamMember[] = [];
          if (Array.isArray(rawWorkingHours.team) && rawWorkingHours.team.length > 0) {
            team = rawWorkingHours.team.map((m: any) => ({
              name: String(m.name || "").trim(),
              role: String(m.role || "").trim(),
              qualifications: String(m.qualifications || "").trim(),
              photoUrl: m.photoUrl ? String(m.photoUrl).trim() : null,
            }));
          } else {
            team = [
              {
                name: "Dr. Medical Director",
                role: "Chief Pathologist & Laboratory Director",
                qualifications: "MBBS, MD (Pathology)",
                photoUrl: null,
              },
            ];
          }

          const loadedData = {
            name: d.lab.name || "",
            phone: d.lab.phone || "",
            emergencyPhone: d.lab.whatsapp || d.lab.phone || "",
            email: d.lab.email || "",
            addressLine1: d.lab.addressLine1 || "",
            addressLine2: d.lab.addressLine2 || "",
            city: d.lab.city || "",
            state: d.lab.state || "",
            postalCode: d.lab.postalCode || "",
            licenseNumber: d.lab.licenseNumber || "",
            isNablAccredited: hasNabl,
            nablAccreditationNumber: d.lab.nablAccreditationNumber || nablMeta.accreditationNumber || "",
            nablValidFrom: d.lab.nablValidFrom || nablMeta.validFrom || "",
            nablValidUntil: d.lab.nablValidUntil || nablMeta.validUntil || "",
            nablCertificateUrl: d.lab.nablCertificateUrl || nablMeta.certificateUrl || null,
            heroHeadline: d.settings?.heroHeadline || "Book Diagnostic Tests Online",
            heroSubheadline: d.settings?.heroSubheadline || "Accurate reports, professional care.",
            logoUrl: d.settings?.logoUrl || null,
            bannerUrl: d.settings?.bannerUrl || null,
            homeCollectionAvailable: d.settings?.homeCollectionAvailable ?? true,
            homeCollectionFee: d.settings?.homeCollectionFee ?? 100,
            freeHomeCollectionThreshold: d.settings?.freeHomeCollectionThreshold ?? 1000,
            deliveryPromiseNotice: d.settings?.deliveryPromiseNotice || "Reports delivered within 24 hours",
            primaryColor: d.settings?.primaryColor || "#0369a1",
            accentColor: d.settings?.accentColor || "#0ea5e9",
            about,
            operatingHoursSchedule: schedule,
            services,
            customServiceInput: "",
            team,
          };

          setFormData(loadedData);
          setInitialFormData(loadedData);
        } else if (!res.ok) {
          setNotification({
            type: "error",
            message: res.error || "Failed to load laboratory settings.",
          });
        }

        // Fetch real catalogue and packages statistics
        try {
          const [catRes, pkgRes] = await Promise.all([
            safeApiRequest("/api/lab/catalogue"),
            safeApiRequest("/api/lab/packages"),
          ]);
          let activeTests: PreviewTestData[] = [];
          let testCount = 0;
          if (catRes.ok && catRes.data) {
            const catData = catRes.data;
            const tests = catData.tests || [];
            testCount = tests.length;
            activeTests = tests.slice(0, 3).map((t: any) => ({
              name: t.name || t.testMaster?.name || "Diagnostic Test",
              price: t.sellingPrice || t.price || 0,
              sampleType: t.sampleType || t.testMaster?.sampleType,
            }));
          }
          let activePkgs: PreviewPackageData[] = [];
          let pkgCount = 0;
          if (pkgRes.ok && pkgRes.data) {
            const pkgData = pkgRes.data;
            const pkgs = pkgData.packages || [];
            pkgCount = pkgs.length;
            activePkgs = pkgs.slice(0, 2).map((p: any) => ({
              name: p.name || "Health Package",
              price: p.price || 0,
              testCount: p.packageTests?.length || p.tests?.length,
            }));
          }
          setCatalogueStats({
            activeTestsCount: testCount,
            popularTests: activeTests,
            activePackagesCount: pkgCount,
            popularPackages: activePkgs,
          });
        } catch {
          // Non-blocking for settings display
        }
      } catch (err: any) {
        console.error("Failed to load settings:", err);
        setNotification({
          type: "error",
          message: err.message || "Failed to load laboratory settings.",
        });
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setNotification({
        type: "error",
        message: "Logo file exceeds the 5MB size limit.",
      });
      return;
    }

    setLogoUploading(true);
    setNotification(null);
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await safeApiRequest<{ logoUrl: string }>("/api/lab/profile/logo", {
        method: "POST",
        body: data,
      });
      if (!res.ok || !res.data?.logoUrl) {
        throw new Error(res.error || "Failed to upload logo.");
      }
      setFormData((prev) => ({ ...prev, logoUrl: res.data!.logoUrl }));
      setNotification({
        type: "success",
        message: "Laboratory logo uploaded successfully.",
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to upload logo.",
      });
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLogoRemove = async () => {
    setLogoUploading(true);
    setNotification(null);
    try {
      const res = await safeApiRequest("/api/lab/profile/logo", {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(res.error || "Failed to delete logo.");
      }
      setFormData((prev) => ({ ...prev, logoUrl: null }));
      setNotification({
        type: "success",
        message: "Laboratory logo removed successfully.",
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to remove logo.",
      });
    } finally {
      setLogoUploading(false);
    }
  };

  const handleBannerStage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setNotification({
        type: "error",
        message: "Banner file exceeds the 5MB size limit.",
      });
      return;
    }

    setBannerUploading(true);
    setNotification(null);
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await safeApiRequest<{ stagedBannerUrl: string; filename: string }>(
        "/api/lab/profile/banner?stage=true",
        {
          method: "POST",
          body: data,
        }
      );
      if (!res.ok || !res.data?.stagedBannerUrl) {
        throw new Error(res.error || "Failed to stage banner.");
      }
      setFormData((prev) => ({ ...prev, bannerUrl: res.data!.stagedBannerUrl }));
      setStagedBannerFilename(res.data.filename || null);
      setNotification({
        type: "success",
        message: "Facility banner staged for preview. Click 'Save Storefront Settings' to commit to live storefront.",
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to stage banner.",
      });
    } finally {
      setBannerUploading(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  };

  const handleBannerRemove = async () => {
    if (stagedBannerFilename) {
      try {
        await safeApiRequest("/api/lab/profile/banner?stage=true", { method: "DELETE" });
      } catch {}
      setStagedBannerFilename(null);
    }
    setFormData((prev) => ({ ...prev, bannerUrl: null }));
    setNotification({
      type: "success",
      message: "Facility banner removed. Live preview is now using text-led clinical hero.",
    });
  };

  const handleCertificateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setNotification({
        type: "error",
        message: "Certificate file exceeds 10MB size limit.",
      });
      return;
    }

    setCertificateUploading(true);
    setNotification(null);
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await safeApiRequest<{ certificateUrl: string }>(
        "/api/lab/profile/nabl-certificate",
        {
          method: "POST",
          body: data,
        }
      );
      if (!res.ok || !res.data?.certificateUrl) {
        throw new Error(res.error || "Failed to upload certificate.");
      }
      setFormData((prev) => ({ ...prev, nablCertificateUrl: res.data!.certificateUrl }));
      setNotification({
        type: "success",
        message: "NABL accreditation certificate uploaded successfully.",
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to upload certificate.",
      });
    } finally {
      setCertificateUploading(false);
      if (certInputRef.current) certInputRef.current.value = "";
    }
  };

  const handleCertificateRemove = async () => {
    setCertificateUploading(true);
    setNotification(null);
    try {
      const res = await safeApiRequest("/api/lab/profile/nabl-certificate", {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(res.error || "Failed to delete certificate.");
      }
      setFormData((prev) => ({ ...prev, nablCertificateUrl: null }));
      setNotification({
        type: "success",
        message: "NABL certificate removed.",
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to remove certificate.",
      });
    } finally {
      setCertificateUploading(false);
    }
  };

  const handleTeamPhotoUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setNotification({
        type: "error",
        message: "Team member photo exceeds 5MB limit.",
      });
      return;
    }

    setNotification(null);
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await safeApiRequest<{ photoUrl: string }>("/api/lab/profile/team-photo", {
        method: "POST",
        body: data,
      });
      if (!res.ok || !res.data?.photoUrl) {
        throw new Error(res.error || "Failed to upload team photo.");
      }
      handleUpdateTeamMember(index, "photoUrl", res.data.photoUrl);
      setNotification({
        type: "success",
        message: "Team expert photo uploaded successfully.",
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to upload team photo.",
      });
    }
  };

  const handleTeamPhotoRemove = async (index: number) => {
    const photoUrl = formData.team[index]?.photoUrl;
    if (photoUrl) {
      try {
        await safeApiRequest(`/api/lab/profile/team-photo?photoUrl=${encodeURIComponent(photoUrl)}`, {
          method: "DELETE",
        });
      } catch {}
    }
    handleUpdateTeamMember(index, "photoUrl", null as any);
    setNotification({
      type: "success",
      message: "Team expert photo removed.",
    });
  };

  const handleDiscardChanges = async () => {
    if (stagedBannerFilename) {
      try {
        await safeApiRequest("/api/lab/profile/banner?stage=true", { method: "DELETE" });
      } catch (e) {
        console.error("Failed to cleanup staged banner on discard", e);
      }
    }
    if (initialFormData) {
      setFormData(initialFormData);
    }
    setStagedBannerFilename(null);
    setSaveStatus("idle");
    setNotification({
      type: "success",
      message: "Unsaved changes discarded. Restored saved storefront settings.",
    });
  };

  const handlePresetSelect = (preset: ClinicalColorPreset) => {
    setFormData((prev) => ({
      ...prev,
      primaryColor: preset.primaryColor,
      accentColor: preset.accentColor,
    }));
  };

  const handleAddCustomService = () => {
    const s = formData.customServiceInput.trim();
    if (!s) return;
    if (!formData.services.includes(s)) {
      setFormData((prev) => ({
        ...prev,
        services: [...prev.services, s],
        customServiceInput: "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, customServiceInput: "" }));
    }
  };

  const handleToggleService = (service: string) => {
    setFormData((prev) => {
      const exists = prev.services.includes(service);
      return {
        ...prev,
        services: exists
          ? prev.services.filter((item) => item !== service)
          : [...prev.services, service],
      };
    });
  };

  const handleAddTeamMember = () => {
    setFormData((prev) => ({
      ...prev,
      team: [...prev.team, { name: "", role: "", qualifications: "", photoUrl: null }],
    }));
  };

  const handleUpdateTeamMember = (index: number, field: keyof TeamMember, val: string | null) => {
    setFormData((prev) => {
      const nextTeam = [...prev.team];
      nextTeam[index] = { ...nextTeam[index], [field]: val };
      return { ...prev, team: nextTeam };
    });
  };

  const handleRemoveTeamMember = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      team: prev.team.filter((_, i) => i !== index),
    }));
  };

  const isDirty =
    initialFormData !== null &&
    (JSON.stringify(formData) !== JSON.stringify(initialFormData) ||
      stagedBannerFilename !== null);

  const contrastEval = evaluateStorefrontContrast(formData.primaryColor || "#0369a1");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.isNablAccredited && !formData.nablAccreditationNumber.trim()) {
      setNotification({
        type: "error",
        message: "NABL Accreditation Number is required when NABL Accreditation is enabled.",
      });
      return;
    }

    if (formData.isNablAccredited && formData.nablValidFrom && formData.nablValidUntil) {
      const fromDate = new Date(formData.nablValidFrom);
      const untilDate = new Date(formData.nablValidUntil);
      if (!isNaN(fromDate.getTime()) && !isNaN(untilDate.getTime()) && untilDate < fromDate) {
        setNotification({
          type: "error",
          message: "NABL Accreditation Valid Until date must be on or after the Valid From date.",
        });
        return;
      }
    }

    setSaving(true);
    setNotification(null);

    const workingHours = {
      about: formData.about.trim(),
      schedule: formData.operatingHoursSchedule.trim(),
      services: formData.services.filter((s) => s.trim().length > 0),
      team: formData.team
        .filter((m) => m.name.trim().length > 0 && m.role.trim().length > 0)
        .map((m) => ({
          name: m.name.trim(),
          role: m.role.trim(),
          qualifications: m.qualifications.trim(),
          photoUrl: m.photoUrl || null,
        })),
    };

    const payload = {
      ...formData,
      stagedBannerFilename: stagedBannerFilename || undefined,
      removeBanner: formData.bannerUrl === null,
      metaDescription: formData.about.trim(),
      workingHours,
      isNablAccredited: formData.isNablAccredited,
      nablAccreditationNumber: formData.isNablAccredited
        ? formData.nablAccreditationNumber.trim().toUpperCase()
        : null,
      nablValidFrom: formData.isNablAccredited ? formData.nablValidFrom || null : null,
      nablValidUntil: formData.isNablAccredited ? formData.nablValidUntil || null : null,
      nablCertificateUrl: formData.isNablAccredited ? formData.nablCertificateUrl || null : null,
    };

    try {
      const res = await safeApiRequest("/api/lab/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok || !res.data) {
        throw new Error(res.error || "Failed to update store settings.");
      }

      const updated = res.data;
      const updatedBannerUrl = updated.settings?.bannerUrl ?? formData.bannerUrl;

      const nextSavedState = {
        ...formData,
        bannerUrl: updatedBannerUrl,
      };
      setFormData(nextSavedState);
      setInitialFormData(nextSavedState);
      setStagedBannerFilename(null);
      setSaveStatus("saved");

      setNotification({
        type: "success",
        message: "Storefront and laboratory settings saved successfully.",
      });
    } catch (err: any) {
      setSaveStatus("error");
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
    { id: "storefront", label: "Storefront Presentation", icon: <Store className="h-4 w-4" /> },
    { id: "about_services", label: "About & Services", icon: <Stethoscope className="h-4 w-4" /> },
    { id: "team", label: "Clinical & Lab Team", icon: <Users className="h-4 w-4" /> },
    { id: "contact", label: "Contact & Location", icon: <MapPin className="h-4 w-4" /> },
    { id: "service_areas", label: "Service Areas (PINs)", icon: <MapPin className="h-4 w-4" /> },
    { id: "branches", label: "Branches & Hubs (Enterprise)", icon: <Building2 className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24 text-slate-500">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
        <span className="ml-3 text-sm font-medium">Loading laboratory settings...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Store & Laboratory Settings
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage your branded digital storefront, clinical profile, operating hours, and customer touchpoints.
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
        {/* Left Sub-navigation (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <nav className="rounded-xl border border-slate-200 bg-white p-2 shadow-xs space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Store Configuration
            </div>
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

          {/* Quick Access to Dedicated Consoles */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2 shadow-2xs">
            <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Related Consoles
            </p>
            <Link
              href="/lab/whatsapp"
              className="flex items-center justify-between rounded-lg bg-white p-2 text-xs font-medium text-slate-700 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                <span>WhatsApp Channel</span>
              </div>
              <ArrowUpRight className="h-3 w-3 text-slate-400" />
            </Link>

            <Link
              href="/lab/payment-settings"
              className="flex items-center justify-between rounded-lg bg-white p-2 text-xs font-medium text-slate-700 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5 text-sky-600" />
                <span>Payment Settlement</span>
              </div>
              <ArrowUpRight className="h-3 w-3 text-slate-400" />
            </Link>

            <Link
              href="/lab/publish"
              className="flex items-center justify-between rounded-lg bg-white p-2 text-xs font-medium text-slate-700 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-amber-600" />
                <span>Publish Checklist</span>
              </div>
              <ArrowUpRight className="h-3 w-3 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Right Content Area (9 cols) */}
        <div className="lg:col-span-9">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section: Profile & Identity */}
            {activeSection === "profile" && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-base font-semibold text-slate-900">Laboratory Profile & Branding</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official laboratory identity, regulatory approvals, and brand assets.
                  </p>
                </div>

                {lab && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Gyrex Platform Verification
                      </span>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        {lab.isVerified ? "Verified Diagnostic Laboratory" : "Pending Verification"}
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

                {/* Logo Upload & Replacement */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Laboratory Logo</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Presented on your public storefront header, test reports, and patient receipts.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-5 pt-2 border-t border-slate-200/60">
                    <div className="h-20 w-20 rounded-2xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-xs relative">
                      {formData.logoUrl ? (
                        <img
                          src={formData.logoUrl}
                          alt="Laboratory Logo"
                          className="h-full w-full object-contain p-1.5"
                        />
                      ) : (
                        <div className="text-center p-2 text-slate-400">
                          <Building2 className="h-7 w-7 mx-auto stroke-[1.5]" />
                          <span className="text-[10px] block mt-0.5">No Logo</span>
                        </div>
                      )}
                      {logoUploading && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2 text-center sm:text-left">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />

                      <div className="flex flex-wrap items-center gap-2.5 justify-center sm:justify-start">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={logoUploading}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-xs disabled:opacity-60 cursor-pointer"
                        >
                          <Upload className="h-3.5 w-3.5 text-sky-600" />
                          {formData.logoUrl ? "Replace Logo" : "Upload Logo"}
                        </button>

                        {formData.logoUrl && (
                          <button
                            type="button"
                            onClick={handleLogoRemove}
                            disabled={logoUploading}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 bg-white text-xs font-semibold text-rose-600 hover:bg-rose-50 transition shadow-xs disabled:opacity-60 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove Logo
                          </button>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500">
                        PNG, JPG, or WebP up to 5MB. Stored securely and served at optimized dimensions.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Profile Fields */}
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
                    <label className="block text-xs font-medium text-slate-700">Brand Accent Color</label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.primaryColor || "#0284c7"}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                        className="h-9 w-10 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                      />
                      <input
                        type="text"
                        value={formData.primaryColor || "#0284c7"}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none uppercase"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700">
                      Clinical Establishment / License Number
                    </label>
                    <input
                      type="text"
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                      placeholder="e.g. DL/LAB/2021/8874"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* NABL Accreditation */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        NABL Quality Accreditation
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Compliance with ISO 15189 standards for diagnostic testing facilities.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isNablAccredited}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData((prev) => ({
                            ...prev,
                            isNablAccredited: checked,
                          }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                  </div>

                  {formData.isNablAccredited && (
                    <div className="pt-3 border-t border-slate-200/60 space-y-4">
                      {/* Legacy unverified warning banner */}
                      {Boolean(formData.nablAccreditationNumber?.trim()) &&
                        (!formData.nablValidFrom || !formData.nablValidUntil) && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 flex items-start gap-2.5">
                            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                            <div>
                              <p className="font-semibold text-amber-900">
                                Accreditation Dates Required for Public Trust Badge
                              </p>
                              <p className="mt-0.5 leading-relaxed text-amber-700">
                                In accordance with clinical compliance guidelines, the NABL trust badge is withheld from your public storefront until active validity dates (&quot;Valid From&quot; and &quot;Valid Until&quot;) are entered and saved.
                              </p>
                            </div>
                          </div>
                        )}

                      {/* NABL Validity Status indicator */}
                      {formData.nablValidFrom && formData.nablValidUntil && (
                        <div
                          className={`rounded-lg border p-3 text-xs flex items-center justify-between ${
                            computeIsNablValid(
                              formData.isNablAccredited,
                              formData.nablAccreditationNumber,
                              formData.nablValidFrom,
                              formData.nablValidUntil
                            )
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-rose-200 bg-rose-50 text-rose-800"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <ShieldCheck
                              className={`h-4 w-4 ${
                                computeIsNablValid(
                                  formData.isNablAccredited,
                                  formData.nablAccreditationNumber,
                                  formData.nablValidFrom,
                                  formData.nablValidUntil
                                )
                                  ? "text-emerald-600"
                                  : "text-rose-600"
                              }`}
                            />
                            <span className="font-semibold">
                              {computeIsNablValid(
                                formData.isNablAccredited,
                                formData.nablAccreditationNumber,
                                formData.nablValidFrom,
                                formData.nablValidUntil
                              )
                                ? "Accreditation is currently active (Trust badge displayed on storefront)"
                                : "Accreditation date window is inactive or expired (Trust badge withheld from storefront)"}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700">
                            Accreditation Number *
                          </label>
                          <input
                            type="text"
                            required={formData.isNablAccredited}
                            value={formData.nablAccreditationNumber}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                nablAccreditationNumber: e.target.value,
                              })
                            }
                            placeholder="e.g. MC-4589"
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 uppercase font-mono placeholder:normal-case placeholder:font-sans focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700">
                            Valid From
                          </label>
                          <input
                            type="date"
                            value={formData.nablValidFrom}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                nablValidFrom: e.target.value,
                              })
                            }
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700">
                            Valid Until
                          </label>
                          <input
                            type="date"
                            value={formData.nablValidUntil}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                nablValidUntil: e.target.value,
                              })
                            }
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Certificate Upload & Private Access */}
                      <div className="pt-2 border-t border-slate-200/60">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          NABL Accreditation Certificate
                        </label>
                        <p className="text-[11px] text-slate-500 mb-3">
                          Upload certificate copy (PDF, PNG, JPG up to 10MB). Stored securely with private lab owner access.
                        </p>

                        <input
                          ref={certInputRef}
                          type="file"
                          accept=".pdf,application/pdf,image/png,image/jpeg,image/jpg"
                          onChange={handleCertificateUpload}
                          className="hidden"
                        />

                        {formData.nablCertificateUrl ? (
                          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-lg border border-slate-200">
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-800">
                              <FileText className="h-4 w-4 text-sky-600" />
                              <span>Certificate Attached</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({formData.nablCertificateUrl.split("/").pop()})
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <a
                                href={formData.nablCertificateUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                              >
                                <ExternalLink className="h-3 w-3 text-slate-400" />
                                <span>View Certificate</span>
                              </a>
                              <button
                                type="button"
                                onClick={handleCertificateRemove}
                                disabled={certificateUploading}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-rose-200 bg-rose-50 text-xs font-medium text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Remove</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => certInputRef.current?.click()}
                            disabled={certificateUploading}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-xs disabled:opacity-60 cursor-pointer"
                          >
                            <Upload className="h-3.5 w-3.5 text-sky-600" />
                            <span>
                              {certificateUploading
                                ? "Uploading Certificate..."
                                : "Upload Certificate (PDF / Image)"}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" variant="primary" size="md" icon={Save} isLoading={saving}>
                    {saving ? "Saving..." : "Save Profile"}
                  </Button>
                </div>
              </div>
            )}

            {/* Section: Storefront Presentation & Branding Customiser */}
            {activeSection === "storefront" && (
              <div className="space-y-6">
                <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
                  <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        Storefront Presentation & Branding Customiser
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Customize your digital storefront palette, hero copy, facility banner, and turnaround promises.
                      </p>
                    </div>

                    {isDirty && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        <span>Unsaved Changes in Preview</span>
                      </span>
                    )}
                  </div>

                  {/* ── 1. Brand Palette & Clinical Color Presets ── */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                          <Palette className="h-4 w-4 text-sky-600" />
                          <span>Clinical Brand Palette</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Choose a clinically validated color preset or specify custom hex codes.
                        </p>
                      </div>
                    </div>

                    {/* 6 Clinical Presets Swatches */}
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                      {CLINICAL_COLOR_PRESETS.map((preset) => {
                        const isSelected =
                          formData.primaryColor?.toLowerCase() === preset.primaryColor.toLowerCase();
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handlePresetSelect(preset)}
                            className={`flex flex-col items-start rounded-xl border p-3 text-left transition cursor-pointer ${
                              isSelected
                                ? "border-sky-600 bg-sky-50/40 ring-2 ring-sky-500/20 shadow-xs"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                            }`}
                          >
                            <div className="flex w-full items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-4 w-4 rounded-full shadow-xs shrink-0 border border-black/10"
                                  style={{ backgroundColor: preset.primaryColor }}
                                />
                                <span
                                  className="h-3 w-3 rounded-full shrink-0 border border-black/10"
                                  style={{ backgroundColor: preset.accentColor }}
                                />
                              </div>
                              {isSelected ? (
                                <Check className="h-3.5 w-3.5 text-sky-600" />
                              ) : (
                                <span className="text-[10px] font-mono text-slate-400">
                                  {preset.contrastWithWhite}:1
                                </span>
                              )}
                            </div>
                            <span className="mt-2 text-xs font-bold text-slate-900">
                              {preset.name}
                            </span>
                            <span className="text-[10px] text-slate-500 leading-tight mt-0.5">
                              {preset.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Color Pickers */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-xs font-medium text-slate-700">
                          Primary Brand Color
                        </label>
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="color"
                            value={formData.primaryColor || "#0369a1"}
                            onChange={(e) =>
                              setFormData({ ...formData, primaryColor: e.target.value })
                            }
                            className="h-9 w-10 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                          />
                          <input
                            type="text"
                            value={formData.primaryColor || "#0369a1"}
                            onChange={(e) =>
                              setFormData({ ...formData, primaryColor: e.target.value })
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none uppercase"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700">
                          Accent / Secondary Color
                        </label>
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="color"
                            value={formData.accentColor || "#0ea5e9"}
                            onChange={(e) =>
                              setFormData({ ...formData, accentColor: e.target.value })
                            }
                            className="h-9 w-10 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                          />
                          <input
                            type="text"
                            value={formData.accentColor || "#0ea5e9"}
                            onChange={(e) =>
                              setFormData({ ...formData, accentColor: e.target.value })
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none uppercase"
                          />
                        </div>
                      </div>
                    </div>

                    {/* WCAG AA Accessibility Contrast Evaluation Alert */}
                    <div
                      className={`rounded-xl border p-3.5 text-xs transition ${
                        contrastEval.isCompliant
                          ? "border-emerald-200 bg-emerald-50/60 text-emerald-800"
                          : "border-amber-200 bg-amber-50/80 text-amber-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-semibold">
                          {contrastEval.isCompliant ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                          )}
                          <span>
                            WCAG 2.1 Contrast: {contrastEval.whiteOnPrimary.ratio}:1 vs White
                            (#FFFFFF)
                          </span>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            contrastEval.isCompliant
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {contrastEval.isCompliant ? "AA Compliant (≥ 4.5:1)" : "Review Legibility"}
                        </span>
                      </div>
                      {contrastEval.alertMessage && (
                        <p className="mt-1.5 text-[11px] leading-relaxed text-amber-700">
                          {contrastEval.alertMessage}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ── 2. Hero Content Copy & Character Limits ── */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-medium text-slate-700">
                          Hero Headline (Main Greeting)
                        </label>
                        <span
                          className={`text-[11px] font-mono ${
                            formData.heroHeadline.length > 70
                              ? "text-rose-600 font-bold"
                              : "text-slate-400"
                          }`}
                        >
                          {formData.heroHeadline.length}/70
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={90}
                        value={formData.heroHeadline}
                        onChange={(e) =>
                          setFormData({ ...formData, heroHeadline: e.target.value })
                        }
                        placeholder="e.g. Book Diagnostic Tests Online"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-medium text-slate-700">
                          Hero Subheadline (Clinical Value Proposition)
                        </label>
                        <span
                          className={`text-[11px] font-mono ${
                            formData.heroSubheadline.length > 140
                              ? "text-rose-600 font-bold"
                              : "text-slate-400"
                          }`}
                        >
                          {formData.heroSubheadline.length}/140
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        maxLength={180}
                        value={formData.heroSubheadline}
                        onChange={(e) =>
                          setFormData({ ...formData, heroSubheadline: e.target.value })
                        }
                        placeholder="e.g. Accurate reports, timely home sample collection, and professional care."
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
                        onChange={(e) =>
                          setFormData({ ...formData, deliveryPromiseNotice: e.target.value })
                        }
                        placeholder="e.g. Reports delivered within 24 hours"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* ── 3. Facility Banner Management (Reversible Staging) ── */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                          <ImageIcon className="h-4 w-4 text-sky-600" />
                          <span>Facility Banner Image</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Upload an authentic photograph of your laboratory, equipment, or building entrance.
                        </p>
                      </div>
                    </div>

                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleBannerStage}
                      className="hidden"
                    />

                    {formData.bannerUrl ? (
                      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900 p-4 text-white shadow-xs">
                        <img
                          src={formData.bannerUrl}
                          alt="Staged banner"
                          className="absolute inset-0 h-full w-full object-cover opacity-60"
                        />
                        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">
                                Facility Banner Active
                              </span>
                              {stagedBannerFilename && (
                                <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
                                  Staged (Unsaved)
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-200 mt-0.5">
                              Overlaid with a clinical dark gradient in preview and live storefront to protect text readability.
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => bannerInputRef.current?.click()}
                              disabled={bannerUploading}
                              className="rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-xs px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50 cursor-pointer"
                            >
                              {bannerUploading ? "Uploading..." : "Replace Banner"}
                            </button>
                            <button
                              type="button"
                              onClick={handleBannerRemove}
                              disabled={bannerUploading}
                              className="rounded-lg bg-rose-500/80 hover:bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50 cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-xs font-semibold text-slate-800">
                            Text-Led Clinical Hero Fallback Active
                          </span>
                          <p className="text-[11px] text-slate-500 mt-0.5 max-w-md">
                            When no banner is uploaded, your storefront displays an accessible clinical gradient styled with your primary brand color.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => bannerInputRef.current?.click()}
                          disabled={bannerUploading}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-60 cursor-pointer shrink-0"
                        >
                          <Upload className="h-3.5 w-3.5 text-sky-600" />
                          <span>{bannerUploading ? "Uploading..." : "Upload Facility Banner"}</span>
                        </button>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-400">
                      PNG, JPG, or WebP up to 5MB. Staged banners remain local to preview until you click &quot;Save Storefront&quot;.
                    </p>
                  </div>

                  {/* ── 4. Home Sample Collection Service ── */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Home Sample Collection
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Enable phlebotomist home visits for tests and health packages.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.homeCollectionAvailable}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              homeCollectionAvailable: e.target.checked,
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                      </label>
                    </div>

                    {formData.homeCollectionAvailable && (
                      <div className="pt-2 border-t border-slate-200/60 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium text-slate-700">
                            Base Home Collection Fee (₹)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.homeCollectionFee}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                homeCollectionFee: Number(e.target.value),
                              })
                            }
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700">
                            Free Home Collection Threshold (₹)
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
                    )}
                  </div>

                  {/* ── Action Buttons & Dirty-State Management ── */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-700">Storefront Status:</span>
                        {saving ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
                            <span className="h-2 w-2 rounded-full bg-sky-500 animate-spin" />
                            <span>Saving...</span>
                          </span>
                        ) : saveStatus === "error" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>Save failed</span>
                          </span>
                        ) : isDirty ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                            <span>Unsaved changes</span>
                          </span>
                        ) : saveStatus === "saved" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Saved</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                            <Check className="h-3.5 w-3.5 text-slate-400" />
                            <span>Live storefront matches settings</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Changes are shown in the preview below, but are not live on your public storefront until you click &quot;Save Storefront Settings&quot;.
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                      {isDirty && (
                        <button
                          type="button"
                          onClick={handleDiscardChanges}
                          disabled={saving}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs disabled:opacity-50 cursor-pointer"
                        >
                          <Undo2 className="h-3.5 w-3.5 text-slate-500" />
                          <span>Discard Changes</span>
                        </button>
                      )}

                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        icon={Save}
                        isLoading={saving}
                      >
                        {saving ? "Saving Storefront..." : "Save Storefront Settings"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* ── 5. Integrated Live Storefront Preview Dock ── */}
                <StorefrontLivePreview
                  labName={formData.name || lab?.name || "Diagnostic Center"}
                  labSlug={lab?.slug || "your-lab"}
                  city={formData.city || lab?.city || "City"}
                  state={formData.state || lab?.state || "State"}
                  phone={formData.phone || lab?.phone || ""}
                  isVerified={lab?.isVerified}
                  nablNumber={
                    formData.isNablAccredited ? formData.nablAccreditationNumber : null
                  }
                  logoUrl={formData.logoUrl}
                  bannerUrl={formData.bannerUrl}
                  primaryColor={formData.primaryColor || "#0369a1"}
                  accentColor={formData.accentColor || "#0ea5e9"}
                  heroHeadline={formData.heroHeadline}
                  heroSubheadline={formData.heroSubheadline}
                  deliveryPromiseNotice={formData.deliveryPromiseNotice}
                  homeCollectionAvailable={formData.homeCollectionAvailable}
                  homeCollectionFee={formData.homeCollectionFee}
                  freeHomeCollectionThreshold={formData.freeHomeCollectionThreshold}
                  isNablCurrentlyValid={computeIsNablValid(
                    formData.isNablAccredited,
                    formData.nablAccreditationNumber,
                    formData.nablValidFrom,
                    formData.nablValidUntil
                  )}
                  about={formData.about}
                  schedule={formData.operatingHoursSchedule}
                  services={formData.services}
                  team={formData.team}
                  activeTestsCount={catalogueStats.activeTestsCount}
                  popularTests={catalogueStats.popularTests}
                  activePackagesCount={catalogueStats.activePackagesCount}
                  popularPackages={catalogueStats.popularPackages}
                />
              </div>
            )}

            {/* Section: About & Available Services */}
            {activeSection === "about_services" && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-base font-semibold text-slate-900">About & Available Services</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Describe your clinical facility, operating hours, and highlighted services for patients.
                  </p>
                </div>

                {/* About the Lab narrative */}
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Public Description / "About the Lab" *
                  </label>
                  <textarea
                    rows={4}
                    value={formData.about}
                    onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                    placeholder="Describe your laboratory history, clinical expertise, medical equipment, and patient care commitment..."
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Featured in the "About {formData.name || "the Lab"}" section on your live storefront.
                  </p>
                </div>

                {/* Operating Hours */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-sky-600" />
                    <h3 className="text-sm font-semibold text-slate-900">Operating & Sample Collection Hours</h3>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={formData.operatingHoursSchedule}
                      onChange={(e) =>
                        setFormData({ ...formData, operatingHoursSchedule: e.target.value })
                      }
                      placeholder="e.g. Monday - Saturday: 7:00 AM - 8:00 PM | Sunday: 7:00 AM - 2:00 PM"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          operatingHoursSchedule:
                            "Monday - Saturday: 7:00 AM - 8:00 PM | Sunday: 7:00 AM - 2:00 PM",
                        })
                      }
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Preset: Standard Mon-Sat & Sunday Half-day
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          operatingHoursSchedule: "Open 24 Hours / 7 Days a Week (Emergency Diagnostics)",
                        })
                      }
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Preset: 24x7 Diagnostic Centre
                    </button>
                  </div>
                </div>

                {/* Available Services */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Available Clinical Services
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Check services offered by your laboratory or add custom offerings.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {DEFAULT_SERVICES.map((service) => {
                      const active = formData.services.includes(service);
                      return (
                        <button
                          key={service}
                          type="button"
                          onClick={() => handleToggleService(service)}
                          className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-xs text-left transition ${
                            active
                              ? "border-sky-300 bg-sky-50/80 text-sky-900 font-medium"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <CheckCircle2
                            className={`h-4 w-4 shrink-0 ${
                              active ? "text-sky-600" : "text-slate-300"
                            }`}
                          />
                          <span>{service}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Add Custom Service */}
                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      value={formData.customServiceInput}
                      onChange={(e) =>
                        setFormData({ ...formData, customServiceInput: e.target.value })
                      }
                      placeholder="Add another clinical service..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomService();
                        }
                      }}
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomService}
                      className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700 transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" variant="primary" size="md" icon={Save} isLoading={saving}>
                    {saving ? "Saving..." : "Save About & Services"}
                  </Button>
                </div>
              </div>
            )}

            {/* Section: Clinical & Lab Team */}
            {activeSection === "team" && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Clinical & Laboratory Experts</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Highlight your medical director, consulting pathologists, and clinical leadership.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddTeamMember}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition shadow-2xs cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Expert Profile</span>
                  </button>
                </div>

                <div className="rounded-lg border border-sky-100 bg-sky-50/60 p-3.5 text-xs text-sky-800 flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-sky-600 mt-0.5" />
                  <span>
                    Privacy Protected: Only public names, clinical roles, and qualifications are published on your digital storefront. Personal email addresses and mobile numbers are never disclosed.
                  </span>
                </div>

                {formData.team.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500 space-y-2">
                    <Users className="h-8 w-8 mx-auto text-slate-400 stroke-[1.5]" />
                    <p className="text-xs font-semibold text-slate-800">No Clinical Experts Listed</p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Add consulting pathologists or laboratory directors to build patient trust.
                    </p>
                    <button
                      type="button"
                      onClick={handleAddTeamMember}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add First Member
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.team.map((member, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3 relative"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">
                            Expert #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTeamMember(index)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition"
                            title="Remove expert"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 items-start pt-1">
                          {/* Photo avatar / upload */}
                          <div className="flex flex-row sm:flex-col items-center gap-2.5 shrink-0">
                            <div className="h-16 w-16 rounded-full border border-slate-200 bg-white flex items-center justify-center overflow-hidden shadow-2xs relative">
                              {member.photoUrl ? (
                                <img
                                  src={member.photoUrl}
                                  alt={member.name || "Team member"}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="text-center text-slate-400">
                                  <Users className="h-6 w-6 mx-auto stroke-[1.5]" />
                                </div>
                              )}
                            </div>

                            <input
                              id={`team-photo-input-${index}`}
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp"
                              onChange={(e) => handleTeamPhotoUpload(index, e)}
                              className="hidden"
                            />

                            <div className="flex flex-col gap-1 items-start sm:items-center">
                              <button
                                type="button"
                                onClick={() => {
                                  const el = document.getElementById(
                                    `team-photo-input-${index}`
                                  ) as HTMLInputElement | null;
                                  el?.click();
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
                              >
                                <Upload className="h-3 w-3 text-sky-600" />
                                <span>{member.photoUrl ? "Change Photo" : "Upload Photo"}</span>
                              </button>

                              {member.photoUrl && (
                                <button
                                  type="button"
                                  onClick={() => handleTeamPhotoRemove(index)}
                                  className="text-[10px] text-rose-600 hover:underline cursor-pointer"
                                >
                                  Remove photo
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Member details inputs */}
                          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-medium text-slate-700">Full Name *</label>
                              <input
                                type="text"
                                required
                                value={member.name}
                                onChange={(e) => handleUpdateTeamMember(index, "name", e.target.value)}
                                placeholder="e.g. Dr. Ramesh Sharma"
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-medium text-slate-700">Role / Designation *</label>
                              <input
                                type="text"
                                required
                                value={member.role}
                                onChange={(e) => handleUpdateTeamMember(index, "role", e.target.value)}
                                placeholder="e.g. Chief Pathologist"
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-medium text-slate-700">Qualifications</label>
                              <input
                                type="text"
                                value={member.qualifications}
                                onChange={(e) =>
                                  handleUpdateTeamMember(index, "qualifications", e.target.value)
                                }
                                placeholder="e.g. MBBS, MD (Pathology)"
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button type="submit" variant="primary" size="md" icon={Save} isLoading={saving}>
                    {saving ? "Saving..." : "Save Clinical Team"}
                  </Button>
                </div>
              </div>
            )}

            {/* Section: Contact & Physical Location */}
            {activeSection === "contact" && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-base font-semibold text-slate-900">Contact & Physical Location</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your public contact phone, patient WhatsApp support, and physical laboratory address.
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
                      placeholder="+91 98765 43210"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Patients clicking WhatsApp in your digital store will chat directly with this number.
                    </p>
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

                  <div className="sm:col-span-2">
                    <IndiaLocationSelector
                      selectedState={formData.state}
                      selectedCity={formData.city}
                      onStateChange={(state) => setFormData((prev) => ({ ...prev, state }))}
                      onCityChange={(city) => setFormData((prev) => ({ ...prev, city }))}
                      idPrefix="settings"
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
                  <Button type="submit" variant="primary" size="md" icon={Save} isLoading={saving}>
                    {saving ? "Saving..." : "Save Contact & Location"}
                  </Button>
                </div>
              </div>
            )}

            {/* Section: Service Areas */}
            {activeSection === "service_areas" && <ServiceAreasSettings />}

            {/* Section: Enterprise Branches */}
            {activeSection === "branches" && <BranchManagementSettings />}

            {/* Cross-Link Section: WhatsApp */}
            {activeSection === "whatsapp" && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-base font-semibold text-slate-900">WhatsApp Integration</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Automated outbound message dispatches and plan quota management.
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-emerald-600" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      Dedicated WhatsApp Channel Console
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Automated WhatsApp notifications for booking confirmations, sample collections, and digital reports are managed in the dedicated WhatsApp console. Plan quotas, shared Gyrex sender credentials, and custom Meta WABA settings are verified and configured there.
                  </p>
                  <div className="pt-2 flex flex-wrap gap-2">
                    <Link
                      href="/lab/whatsapp"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
                    >
                      <span>Open WhatsApp Channel Console</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleTabChange("contact")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <span>Edit Customer Support Phone</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Cross-Link Section: Payment */}
            {activeSection === "payment" && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-base font-semibold text-slate-900">Patient Payment Settings</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure direct patient settlement, Razorpay keys, and Pay at Collection.
                  </p>
                </div>

                <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-sky-600" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      Direct Financial Settlement
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Patient payments flow directly into your laboratory account through Pay at Sample Collection, direct laboratory UPI QR, or your own Razorpay payment gateway.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/lab/payment-settings"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-700 transition"
                    >
                      <span>Open Payment Settings Console</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Cross-Link Section: Publishing */}
            {activeSection === "publishing" && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-base font-semibold text-slate-900">Store Publishing Readiness</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Launch checklist and readiness audit before accepting online patient orders.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-sky-600" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      Launch Checklist & Status
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Track catalogue readiness, pricing validation, payment gateway credentials, and publish your digital store to the live web.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/lab/publish"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-700 transition"
                    >
                      <span>Open Publishing Console</span>
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
          <span className="ml-3 text-sm font-medium">Loading settings...</span>
        </div>
      }
    >
      <LabSettingsContent />
    </Suspense>
  );
}
