/**
 * Gyrex Labs - Development Seed Script
 * 
 * ENVIRONMENT: DEVELOPMENT / DEMO ONLY
 * DO NOT RUN AGAINST PRODUCTION
 * NO REAL PERSONAL HEALTH INFORMATION (PHI) INCLUDED
 */

import {
  UserRole,
  LabStatus,
  OrderStatus,
  PaymentStatus,
  CollectionType,
  ReportStatus,
  SubscriptionStatus,
  BillingCycle,
  PaymentMethod,
  PaymentGateway,
  FileCategory,
  FileAccessClassification,
  StorageProvider,
  Gender,
  OrderItemType,
  TestMaster,
  LabTest,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { prisma } from "../lib/db/prisma";

async function main() {
  console.log("🌱 Starting Gyrex Labs Development Database Seed...");

  // Password hash for all demo users: "GyrexDemo2026!"
  const demoPasswordHash = await bcrypt.hash("GyrexDemo2026!", 10);

  // ============================================================
  // 1. PLATFORM USERS (SUPERADMIN & PLATFORM ADMIN)
  // ============================================================
  console.log("Creating Platform Administrators...");
  await prisma.user.upsert({
    where: { email: "admin@gyrex.in" },
    update: {},
    create: {
      email: "admin@gyrex.in",
      passwordHash: demoPasswordHash,
      fullName: "Gyrex Superadmin",
      phone: "+919800000001",
      role: UserRole.SUPERADMIN,
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "ops@gyrex.in" },
    update: {},
    create: {
      email: "ops@gyrex.in",
      passwordHash: demoPasswordHash,
      fullName: "Gyrex Platform Operations",
      phone: "+919800000002",
      role: UserRole.OPERATIONS_ADMIN,
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });

  // ============================================================
  // 2. SUBSCRIPTION PLANS (GYREX SAAS)
  // ============================================================
  console.log("Creating SaaS Subscription Plans...");
  await prisma.subscriptionPlan.upsert({
    where: { code: "PLAN_GROWTH" },
    update: {},
    create: {
      code: "PLAN_GROWTH",
      name: "Growth Plan",
      description: "Ideal for growing independent pathology labs looking to expand their digital patient reach.",
      priceMonthly: 4999.00,
      priceYearly: 49990.00,
      maxOrdersPerMonth: 500,
      maxStaffAccounts: 3,
      customBrandingEnabled: true,
      geminiPrescriptionAiEnabled: true,
      isActive: true,
      displayOrder: 1,
    },
  });

  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { code: "PLAN_PRO" },
    update: {},
    create: {
      code: "PLAN_PRO",
      name: "Professional Plan",
      description: "Designed for established diagnostic labs handling high order volumes with advanced analytics.",
      priceMonthly: 9999.00,
      priceYearly: 99990.00,
      maxOrdersPerMonth: 2500,
      maxStaffAccounts: 10,
      customBrandingEnabled: true,
      geminiPrescriptionAiEnabled: true,
      isActive: true,
      displayOrder: 2,
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { code: "PLAN_ENTERPRISE" },
    update: {},
    create: {
      code: "PLAN_ENTERPRISE",
      name: "Enterprise Multi-Branch Plan",
      description: "Unlimited diagnostic order volume, multi-centre capabilities, and dedicated 24/7 priority SLA support.",
      priceMonthly: 19999.00,
      priceYearly: 199990.00,
      maxOrdersPerMonth: null, // unlimited
      maxStaffAccounts: 50,
      customBrandingEnabled: true,
      geminiPrescriptionAiEnabled: true,
      isActive: true,
      displayOrder: 3,
    },
  });

  // ============================================================
  // 3. CENTRALIZED TEST CATEGORIES
  // ============================================================
  console.log("Creating Centralized Test Categories...");
  const catHematology = await prisma.testCategory.upsert({
    where: { slug: "hematology" },
    update: {},
    create: { name: "Hematology", slug: "hematology", description: "Blood and blood-forming tissue investigations", displayOrder: 1 },
  });

  const catBiochemistry = await prisma.testCategory.upsert({
    where: { slug: "biochemistry" },
    update: {},
    create: { name: "Biochemistry", slug: "biochemistry", description: "Metabolic, organ function, and serum chemical analyses", displayOrder: 2 },
  });

  const catEndocrinology = await prisma.testCategory.upsert({
    where: { slug: "endocrinology" },
    update: {},
    create: { name: "Endocrinology", slug: "endocrinology", description: "Hormone assays and endocrine gland functional profiles", displayOrder: 3 },
  });

  const catSerology = await prisma.testCategory.upsert({
    where: { slug: "serology-immunology" },
    update: {},
    create: { name: "Serology & Immunology", slug: "serology-immunology", description: "Antigen-antibody reactions and infectious disease screening", displayOrder: 4 },
  });

  const catPathology = await prisma.testCategory.upsert({
    where: { slug: "clinical-pathology" },
    update: {},
    create: { name: "Clinical Pathology", slug: "clinical-pathology", description: "Routine urine, stool, and bodily fluid microscopic tests", displayOrder: 5 },
  });

  // ============================================================
  // 4. CENTRAL GYREX TEST MASTER (15 Standardized Tests)
  // ============================================================
  console.log("Creating Standardized Gyrex Test Master...");
  const testMasterList = [
    {
      code: "CBC",
      name: "Complete Blood Count (CBC)",
      slug: "complete-blood-count",
      synonyms: ["Hemogram", "Complete Blood Picture", "CBP", "CBC with ESR"],
      categoryId: catHematology.id,
      sampleType: "EDTA Whole Blood (2 ml)",
      standardTatHours: 12,
      fastingRequired: false,
      preparationInstructions: "No special dietary restrictions or fasting required.",
      description: "Evaluates overall health and detects a wide variety of disorders, including anemia, infection, and leukemia.",
      standardizedCode: "58410-2",
    },
    {
      code: "ESR",
      name: "Erythrocyte Sedimentation Rate (ESR)",
      slug: "erythrocyte-sedimentation-rate",
      synonyms: ["Sed Rate", "Westergren ESR"],
      categoryId: catHematology.id,
      sampleType: "EDTA Whole Blood",
      standardTatHours: 12,
      fastingRequired: false,
      preparationInstructions: "No special preparation needed.",
      description: "Non-specific marker for systemic inflammation and autoimmune response.",
      standardizedCode: "4537-7",
    },
    {
      code: "LFT",
      name: "Liver Function Test (LFT)",
      slug: "liver-function-test",
      synonyms: ["Hepatic Function Panel", "Liver Panel", "Bilirubin & Enzymes"],
      categoryId: catBiochemistry.id,
      sampleType: "Serum (3 ml)",
      standardTatHours: 12,
      fastingRequired: true,
      preparationInstructions: "Overnight fasting (8 to 10 hours) is recommended. Water intake allowed.",
      description: "Comprehensive panel measuring Bilirubin, SGOT/AST, SGPT/ALT, Alkaline Phosphatase, and Total Protein/Albumin.",
      standardizedCode: "24325-3",
    },
    {
      code: "KFT",
      name: "Kidney Function Test (KFT / RFT)",
      slug: "kidney-function-test",
      synonyms: ["Renal Function Test", "RFT", "Urea & Creatinine Panel"],
      categoryId: catBiochemistry.id,
      sampleType: "Serum (3 ml)",
      standardTatHours: 12,
      fastingRequired: false,
      preparationInstructions: "Stay well hydrated. Avoid strenuous physical exercise before blood draw.",
      description: "Evaluates renal filtration efficacy via Serum Creatinine, Blood Urea, BUN, and Uric Acid.",
      standardizedCode: "24362-6",
    },
    {
      code: "LIPID",
      name: "Lipid Profile Panel",
      slug: "lipid-profile",
      synonyms: ["Cholesterol Panel", "Coronary Risk Profile", "Cardiovascular Lipid Panel"],
      categoryId: catBiochemistry.id,
      sampleType: "Serum (3 ml)",
      standardTatHours: 12,
      fastingRequired: true,
      preparationInstructions: "Strict 10-12 hours overnight fasting mandatory. Do not consume alcohol for 24 hours prior.",
      description: "Assesses cardiovascular risk by quantifying Total Cholesterol, HDL, LDL, VLDL, and Triglycerides.",
      standardizedCode: "24331-1",
    },
    {
      code: "FBS",
      name: "Fasting Blood Sugar (Glucose Fasting)",
      slug: "fasting-blood-sugar",
      synonyms: ["FBS", "Fasting Plasma Glucose", "Blood Sugar Fasting"],
      categoryId: catBiochemistry.id,
      sampleType: "Fluoride Plasma (2 ml)",
      standardTatHours: 6,
      fastingRequired: true,
      preparationInstructions: "Strict 8-10 hours overnight fasting. Water permitted.",
      description: "Primary diagnostic baseline screen for diabetes mellitus and impaired glucose tolerance.",
      standardizedCode: "1558-6",
    },
    {
      code: "PPBS",
      name: "Post Prandial Blood Sugar (PPBS)",
      slug: "post-prandial-blood-sugar",
      synonyms: ["PPBS", "2-Hour Post Prandial Glucose", "Post Meal Sugar"],
      categoryId: catBiochemistry.id,
      sampleType: "Fluoride Plasma (2 ml)",
      standardTatHours: 6,
      fastingRequired: false,
      preparationInstructions: "Blood sample collected precisely 2 hours after the start of a standard meal.",
      description: "Monitors glycemic spike and insulin efficiency following carbohydrate ingestion.",
      standardizedCode: "1521-4",
    },
    {
      code: "HBA1C",
      name: "Glycated Hemoglobin (HbA1c)",
      slug: "hba1c-glycated-hemoglobin",
      synonyms: ["Hemoglobin A1c", "Glycohemoglobin", "3-Month Average Blood Sugar"],
      categoryId: catBiochemistry.id,
      sampleType: "EDTA Whole Blood (2 ml)",
      standardTatHours: 12,
      fastingRequired: false,
      preparationInstructions: "No fasting necessary. Can be given at any time of the day.",
      description: "Reflects mean blood sugar levels over the preceding 90-120 days.",
      standardizedCode: "4548-4",
    },
    {
      code: "TSH",
      name: "Thyroid Stimulating Hormone (TSH)",
      slug: "thyroid-stimulating-hormone",
      synonyms: ["TSH Ultrasensitive", "Thyrotropin"],
      categoryId: catEndocrinology.id,
      sampleType: "Serum (2 ml)",
      standardTatHours: 12,
      fastingRequired: false,
      preparationInstructions: "Morning sample collection preferred before taking morning thyroid medication.",
      description: "Sensitive first-line test for evaluating hypothyroidism and hyperthyroidism.",
      standardizedCode: "3016-3",
    },
    {
      code: "TFT",
      name: "Thyroid Profile Total (T3, T4, TSH)",
      slug: "thyroid-profile-total",
      synonyms: ["TFT", "Complete Thyroid Panel"],
      categoryId: catEndocrinology.id,
      sampleType: "Serum (3 ml)",
      standardTatHours: 12,
      fastingRequired: false,
      preparationInstructions: "Morning blood draw recommended prior to daily thyroid dosage.",
      description: "Measures Total Triiodothyronine (T3), Total Thyroxine (T4), and TSH.",
      standardizedCode: "24348-5",
    },
    {
      code: "VITD",
      name: "Vitamin D (25-Hydroxy Cholecalciferol)",
      slug: "vitamin-d-25-hydroxy",
      synonyms: ["25-OH Vitamin D", "Calcidiol", "Vitamin D3"],
      categoryId: catBiochemistry.id,
      sampleType: "Serum (2 ml)",
      standardTatHours: 24,
      fastingRequired: false,
      preparationInstructions: "No fasting required.",
      description: "Evaluates bone metabolism, calcium absorption, and deficiency states.",
      standardizedCode: "1989-3",
    },
    {
      code: "VITB12",
      name: "Vitamin B12 (Cyanocobalamin)",
      slug: "vitamin-b12-cyanocobalamin",
      synonyms: ["Cobalamin", "Serum B12"],
      categoryId: catBiochemistry.id,
      sampleType: "Serum (2 ml)",
      standardTatHours: 24,
      fastingRequired: true,
      preparationInstructions: "Overnight fasting (8 hours) is advised. Discontinue multivitamin supplements 48 hours prior.",
      description: "Critical nutrient indicator for neurological health and megaloblastic anemia.",
      standardizedCode: "2132-9",
    },
    {
      code: "URINE_RE",
      name: "Urine Routine and Microscopic Examination",
      slug: "urine-routine-microscopic",
      synonyms: ["Urine R/M", "Urinalysis Complete", "Urine RE"],
      categoryId: catPathology.id,
      sampleType: "Mid-stream Clean Catch Urine (15 ml sterile container)",
      standardTatHours: 6,
      fastingRequired: false,
      preparationInstructions: "Early morning first midstream sample preferred in sterile container provided by lab.",
      description: "Screens for urinary tract infections (UTI), kidney disease, proteinuria, and hematuria.",
      standardizedCode: "24356-8",
    },
    {
      code: "DENGUE_NS1",
      name: "Dengue Virus NS1 Antigen Rapid & Elisa",
      slug: "dengue-ns1-antigen",
      synonyms: ["Dengue Early Antigen", "Dengue NS1"],
      categoryId: catSerology.id,
      sampleType: "Serum (2 ml)",
      standardTatHours: 6,
      fastingRequired: false,
      preparationInstructions: "No preparation required.",
      description: "Early detection biomarker for acute phase Dengue infection within days 1-5 of fever onset.",
      standardizedCode: "68341-7",
    },
    {
      code: "WIDAL",
      name: "Widal Slide & Tube Agglutination Test",
      slug: "widal-test-typhoid",
      synonyms: ["Typhoid Antibody Test", "Enteric Fever Screen"],
      categoryId: catSerology.id,
      sampleType: "Serum (2 ml)",
      standardTatHours: 6,
      fastingRequired: false,
      preparationInstructions: "No fasting required.",
      description: "Agglutination test detecting diagnostic antibodies against Salmonella typhi and paratyphi.",
      standardizedCode: "29560-0",
    },
  ];

  const createdMasterTests: Record<string, TestMaster> = {};
  for (const item of testMasterList) {
    const tm = await prisma.testMaster.upsert({
      where: { code: item.code },
      update: {},
      create: item,
    });
    createdMasterTests[item.code] = tm;
  }

  // ============================================================
  // 5. DEMO LABORATORY 1: SHARMA DIAGNOSTICS (TENANT A)
  // ============================================================
  console.log("Creating Tenant A: Sharma Diagnostics...");
  const labSharma = await prisma.lab.upsert({
    where: { slug: "sharma-diagnostics" },
    update: {},
    create: {
      slug: "sharma-diagnostics",
      name: "Sharma Diagnostics & Path Lab",
      legalName: "Sharma Healthcare Private Limited",
      code: "SDPL",
      email: "info@sharmadiagnostics.com",
      phone: "+919876543210",
      emergencyPhone: "+919876543211",
      addressLine1: "Plot 42, Metro Pillar 118, Janakpuri",
      addressLine2: "Opposite District Centre",
      city: "New Delhi",
      state: "Delhi",
      postalCode: "110058",
      country: "IN",
      latitude: 28.6289,
      longitude: 77.0805,
      gstin: "07AAAAA0000A1Z5",
      pan: "AAAAA0000A",
      licenseNumber: "DL/LAB/2021/8874",
      nablAccreditationNumber: "MC-4412",
      status: LabStatus.ACTIVE,
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  // Storefront & Payment Settings for Sharma Diagnostics
  await prisma.labStoreSettings.upsert({
    where: { labId: labSharma.id },
    update: {},
    create: {
      labId: labSharma.id,
      primaryColor: "#0284c7",
      accentColor: "#0ea5e9",
      heroHeadline: "Trusted Diagnostic Care at Your Doorstep in Janakpuri",
      heroSubheadline: "NABL Accredited accuracy with complimentary home sample collection across West Delhi.",
      homeCollectionAvailable: true,
      homeCollectionFee: 150.00,
      freeHomeCollectionThreshold: 999.00,
      workingHours: {
        monday: { open: "07:00", close: "20:00" },
        tuesday: { open: "07:00", close: "20:00" },
        wednesday: { open: "07:00", close: "20:00" },
        thursday: { open: "07:00", close: "20:00" },
        friday: { open: "07:00", close: "20:00" },
        saturday: { open: "07:00", close: "20:00" },
        sunday: { open: "07:00", close: "14:00" },
      },
      deliveryPromiseNotice: "Same day digital reports delivered via email & WhatsApp",
    },
  });

  await prisma.labPaymentSettings.upsert({
    where: { labId: labSharma.id },
    update: {},
    create: {
      labId: labSharma.id,
      razorpayKeyId: "rzp_test_sharma_diag_key",
      razorpayKeySecretEncrypted: "ENCRYPTED_SECRET_DEMO",
      cashOnCollectionEnabled: true,
      isConfigured: true,
      lastVerifiedAt: new Date(),
    },
  });

  // Lab Users for Sharma Diagnostics (Owner & Staff)
  const sharmaOwnerUser = await prisma.user.upsert({
    where: { email: "dr.sharma@sharmadiagnostics.com" },
    update: {},
    create: {
      email: "dr.sharma@sharmadiagnostics.com",
      passwordHash: demoPasswordHash,
      fullName: "Dr. Rajesh Sharma",
      phone: "+919876543210",
      role: UserRole.LAB_OWNER,
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.labUser.upsert({
    where: { labId_userId: { labId: labSharma.id, userId: sharmaOwnerUser.id } },
    update: {},
    create: {
      labId: labSharma.id,
      userId: sharmaOwnerUser.id,
      role: UserRole.LAB_OWNER,
      permissions: ["*"],
    },
  });

  const sharmaStaffUser = await prisma.user.upsert({
    where: { email: "staff@sharmadiagnostics.com" },
    update: {},
    create: {
      email: "staff@sharmadiagnostics.com",
      passwordHash: demoPasswordHash,
      fullName: "Pooja Verma",
      phone: "+919876543299",
      role: UserRole.LAB_STAFF,
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.labUser.upsert({
    where: { labId_userId: { labId: labSharma.id, userId: sharmaStaffUser.id } },
    update: {},
    create: {
      labId: labSharma.id,
      userId: sharmaStaffUser.id,
      role: UserRole.LAB_STAFF,
      permissions: ["orders.read", "orders.update", "reports.upload", "reports.read"],
    },
  });

  // SaaS Subscription for Sharma Diagnostics (FLOW B)
  await prisma.subscription.upsert({
    where: { labId: labSharma.id },
    update: {},
    create: {
      labId: labSharma.id,
      planId: proPlan.id,
      status: SubscriptionStatus.ACTIVE,
      billingCycle: BillingCycle.MONTHLY,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      providerCustomerId: "cust_demo_sharma",
      providerSubscriptionId: "sub_demo_sharma_pro",
    },
  });

  // ============================================================
  // 6. DEMO LABORATORY 2: APEX CLINICAL LABS (TENANT B)
  // ============================================================
  console.log("Creating Tenant B: Apex Clinical Labs...");
  const labApex = await prisma.lab.upsert({
    where: { slug: "apex-labs" },
    update: {},
    create: {
      slug: "apex-labs",
      name: "Apex Clinical Laboratories",
      legalName: "Apex Medical & Bio Analytics LLP",
      code: "APEX",
      email: "care@apexlabs.in",
      phone: "+919911223344",
      addressLine1: "SCO 14-15, Sector 14",
      addressLine2: "Near HUDA Market",
      city: "Gurugram",
      state: "Haryana",
      postalCode: "122001",
      country: "IN",
      latitude: 28.4721,
      longitude: 77.0512,
      status: LabStatus.ACTIVE,
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  await prisma.labStoreSettings.upsert({
    where: { labId: labApex.id },
    update: {},
    create: {
      labId: labApex.id,
      primaryColor: "#059669",
      accentColor: "#10b981",
      heroHeadline: "Advanced Pathology & Molecular Genetics in Gurugram",
      heroSubheadline: "Accurate automated testing with prompt morning home collection slots.",
      homeCollectionAvailable: true,
      homeCollectionFee: 100.00,
      freeHomeCollectionThreshold: 800.00,
    },
  });

  const apexOwnerUser = await prisma.user.upsert({
    where: { email: "director@apexlabs.in" },
    update: {},
    create: {
      email: "director@apexlabs.in",
      passwordHash: demoPasswordHash,
      fullName: "Dr. Ananya Sen",
      phone: "+919911223344",
      role: UserRole.LAB_OWNER,
      isActive: true,
    },
  });

  await prisma.labUser.upsert({
    where: { labId_userId: { labId: labApex.id, userId: apexOwnerUser.id } },
    update: {},
    create: {
      labId: labApex.id,
      userId: apexOwnerUser.id,
      role: UserRole.LAB_OWNER,
      permissions: ["*"],
    },
  });

  // ============================================================
  // 7. LAB TESTS FOR SHARMA DIAGNOSTICS (TENANT A CATALOGUE)
  // ============================================================
  console.log("Configuring Sharma Diagnostics Test Catalogue...");
  const sharmaTestsMap: Record<string, LabTest> = {};

  const sharmaCatalogueData = [
    { code: "CBC", sellingPrice: 350.00, mrpPrice: 450.00 },
    { code: "LFT", sellingPrice: 750.00, mrpPrice: 950.00 },
    { code: "KFT", sellingPrice: 700.00, mrpPrice: 900.00 },
    { code: "LIPID", sellingPrice: 650.00, mrpPrice: 850.00 },
    { code: "FBS", sellingPrice: 80.00, mrpPrice: 120.00 },
    { code: "HBA1C", sellingPrice: 450.00, mrpPrice: 600.00 },
    { code: "TSH", sellingPrice: 250.00, mrpPrice: 350.00 },
    { code: "VITD", sellingPrice: 1100.00, mrpPrice: 1500.00 },
    { code: "VITB12", sellingPrice: 950.00, mrpPrice: 1300.00 },
    { code: "URINE_RE", sellingPrice: 150.00, mrpPrice: 200.00 },
  ];

  for (const item of sharmaCatalogueData) {
    const master = createdMasterTests[item.code];
    if (master) {
      const lt = await prisma.labTest.upsert({
        where: { labId_masterTestId: { labId: labSharma.id, masterTestId: master.id } },
        update: {},
        create: {
          labId: labSharma.id,
          masterTestId: master.id,
          sellingPrice: item.sellingPrice,
          mrpPrice: item.mrpPrice,
          isActive: true,
          isHomeCollectionAvailable: true,
        },
      });
      sharmaTestsMap[item.code] = lt;
    }
  }

  // ============================================================
  // 8. LAB PACKAGES FOR SHARMA DIAGNOSTICS
  // ============================================================
  console.log("Configuring Health Packages for Sharma Diagnostics...");
  const pkgFullBody = await prisma.package.upsert({
    where: { labId_slug: { labId: labSharma.id, slug: "comprehensive-full-body-health-checkup" } },
    update: {},
    create: {
      labId: labSharma.id,
      name: "Comprehensive Full Body Health Checkup",
      slug: "comprehensive-full-body-health-checkup",
      code: "SDPL-PKG-01",
      description: "Our most popular complete preventive health screen including CBC, Liver, Kidney, Lipid, Sugar, Thyroid, and Vitamin profiles.",
      sellingPrice: 1999.00,
      mrpPrice: 4500.00,
      fastingRequired: true,
      preparationInstructions: "10-12 hours overnight fasting mandatory. Water intake permitted.",
      sampleTypes: ["EDTA Blood", "Serum", "Fluoride Plasma", "Urine"],
      estimatedTatHours: 24,
      isActive: true,
      isHomeCollectionAvailable: true,
      isPopular: true,
    },
  });

  // Attach tests to package
  const pkgTestCodes = ["CBC", "LFT", "KFT", "LIPID", "FBS", "TSH", "URINE_RE"];
  for (let i = 0; i < pkgTestCodes.length; i++) {
    const code = pkgTestCodes[i];
    const labTest = sharmaTestsMap[code];
    if (labTest) {
      await prisma.packageTest.upsert({
        where: { packageId_labTestId: { packageId: pkgFullBody.id, labTestId: labTest.id } },
        update: {},
        create: {
          packageId: pkgFullBody.id,
          labTestId: labTest.id,
          displayOrder: i + 1,
        },
      });
    }
  }

  const pkgDiabetes = await prisma.package.upsert({
    where: { labId_slug: { labId: labSharma.id, slug: "diabetes-care-screen-profile" } },
    update: {},
    create: {
      labId: labSharma.id,
      name: "Diabetes Care & Monitoring Profile",
      slug: "diabetes-care-screen-profile",
      code: "SDPL-PKG-02",
      description: "Essential quarterly screening for diabetic patients including HbA1c, Fasting Sugar, and Kidney health.",
      sellingPrice: 799.00,
      mrpPrice: 1620.00,
      fastingRequired: true,
      preparationInstructions: "8-10 hours fasting required for blood sugar.",
      sampleTypes: ["EDTA Blood", "Fluoride Plasma", "Serum"],
      estimatedTatHours: 12,
      isActive: true,
      isHomeCollectionAvailable: true,
    },
  });

  const diabeticTestCodes = ["FBS", "HBA1C", "KFT"];
  for (let i = 0; i < diabeticTestCodes.length; i++) {
    const code = diabeticTestCodes[i];
    const labTest = sharmaTestsMap[code];
    if (labTest) {
      await prisma.packageTest.upsert({
        where: { packageId_labTestId: { packageId: pkgDiabetes.id, labTestId: labTest.id } },
        update: {},
        create: {
          packageId: pkgDiabetes.id,
          labTestId: labTest.id,
          displayOrder: i + 1,
        },
      });
    }
  }

  // ============================================================
  // 9. DEMO PATIENT & LAB RELATIONSHIP (CROSS-TENANT ISOLATION)
  // ============================================================
  console.log("Creating Demo Patient and Lab Context Association...");
  const demoPatient = await prisma.patient.upsert({
    where: { id: "demo-pat-001" },
    update: {},
    create: {
      id: "demo-pat-001",
      fullName: "Amit Kumar",
      phone: "+919811122233",
      email: "amit.kumar.demo@example.com",
      ageYears: 42,
      gender: Gender.MALE,
      bloodGroup: "B+",
    },
  });

  const demoAddress = await prisma.patientAddress.create({
    data: {
      patientId: demoPatient.id,
      label: "Home",
      addressLine1: "B-2/104, Janakpuri",
      city: "New Delhi",
      state: "Delhi",
      postalCode: "110058",
      isDefault: true,
    },
  });

  // Associated with Sharma Diagnostics
  await prisma.labPatient.upsert({
    where: { labId_patientId: { labId: labSharma.id, patientId: demoPatient.id } },
    update: {},
    create: {
      labId: labSharma.id,
      patientId: demoPatient.id,
      uhid: "SDPL-P-10023",
      notes: "Patient prefers morning 7:30 AM collection slot.",
      totalOrdersCount: 1,
      totalSpent: 1999.00,
    },
  });

  // ============================================================
  // 10. DEMO ORDER & PAYMENT (FLOW A: PATIENT -> LAB)
  // ============================================================
  console.log("Creating Demo Order, Collection, and Diagnostic Payment (Flow A)...");
  const demoOrder = await prisma.order.upsert({
    where: { orderNumber: "GYR-2026-0001" },
    update: {},
    create: {
      orderNumber: "GYR-2026-0001",
      labId: labSharma.id,
      patientId: demoPatient.id,
      collectionType: CollectionType.HOME_COLLECTION,
      orderStatus: OrderStatus.REPORT_READY,
      paymentStatus: PaymentStatus.PAID,
      subtotal: 1999.00,
      collectionFee: 0.00, // free above 999 threshold
      discountAmount: 0.00,
      totalAmount: 1999.00,
      confirmedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  });

  // Order item: Comprehensive package
  await prisma.orderItem.create({
    data: {
      orderId: demoOrder.id,
      itemType: OrderItemType.PACKAGE,
      packageId: pkgFullBody.id,
      itemName: "Comprehensive Full Body Health Checkup",
      itemCode: "SDPL-PKG-01",
      quantity: 1,
      unitPrice: 1999.00,
      totalPrice: 1999.00,
    },
  });

  // Collection details
  await prisma.collection.upsert({
    where: { orderId: demoOrder.id },
    update: {},
    create: {
      orderId: demoOrder.id,
      labId: labSharma.id,
      collectionType: CollectionType.HOME_COLLECTION,
      scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      scheduledSlot: "07:30 AM - 08:30 AM",
      collectionAddressLine1: demoAddress.addressLine1,
      city: demoAddress.city,
      state: demoAddress.state,
      postalCode: demoAddress.postalCode,
      phlebotomistName: "Sanjay Rawat",
      phlebotomistPhone: "+919876500011",
      sampleCollectedAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
      specialInstructions: "Ring bell twice, 1st floor",
    },
  });

  // Diagnostic Payment to Sharma Diagnostics (FLOW A)
  await prisma.patientPayment.upsert({
    where: { paymentNumber: "PAY-PAT-2026-0001" },
    update: {},
    create: {
      paymentNumber: "PAY-PAT-2026-0001",
      orderId: demoOrder.id,
      labId: labSharma.id,
      amount: 1999.00,
      currency: "INR",
      method: PaymentMethod.RAZORPAY,
      status: PaymentStatus.PAID,
      gateway: PaymentGateway.RAZORPAY,
      gatewayOrderId: "order_demo_rzp_001",
      gatewayPaymentId: "pay_demo_rzp_999888",
      paidAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  });

  // ============================================================
  // 11. SECURE REPORT & FILE ASSET
  // ============================================================
  console.log("Creating Demo Secure Report and File Asset...");
  const reportAsset = await prisma.fileAsset.create({
    data: {
      labId: labSharma.id,
      category: FileCategory.REPORT,
      storageProvider: StorageProvider.LOCAL_SECURE,
      storagePath: "reports/sharma-diagnostics/2026/09/RPT-2026-0001.pdf",
      originalFileName: "Amit_Kumar_FullBody_Report.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: BigInt(245760), // 240 KB
      accessClassification: FileAccessClassification.RESTRICTED_PATIENT_LAB,
      createdByUserId: sharmaStaffUser.id,
    },
  });

  await prisma.report.upsert({
    where: { reportNumber: "RPT-2026-0001" },
    update: {},
    create: {
      reportNumber: "RPT-2026-0001",
      orderId: demoOrder.id,
      labId: labSharma.id,
      patientId: demoPatient.id,
      fileAssetId: reportAsset.id,
      status: ReportStatus.FINAL,
      uploadedByUserId: sharmaStaffUser.id,
      uploadedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      releasedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      deliveredViaEmailAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      accessPasscode: "4210", // demo PIN
      viewCount: 1,
      lastAccessedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
  });

  console.log("✅ Gyrex Labs Development Seed Complete!");
  console.log("Summary:");
  console.log("- Superadmin: admin@gyrex.in");
  console.log("- Labs: Sharma Diagnostics (slug: sharma-diagnostics), Apex Clinical Labs (slug: apex-labs)");
  console.log("- Lab Owner: dr.sharma@sharmadiagnostics.com");
  console.log("- Lab Staff: staff@sharmadiagnostics.com");
  console.log("- Tests in TestMaster: 15");
  console.log("- Demo Order: GYR-2026-0001 (Paid, Report Ready)");
  console.log("- Demo Credentials for all accounts: GyrexDemo2026!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
