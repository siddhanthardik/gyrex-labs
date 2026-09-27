import { prisma } from "@/lib/db/prisma";

export interface PrescriptionExtractionCandidate {
  rawTestName: string;
  confidence: number;
  matchedMasterTestId: string | null;
  matchedTestName: string | null;
  labTestId: string | null;
  sellingPrice: number | null;
  isAvailableInLab: boolean;
  selectedByDefault: boolean;
}

export interface PrescriptionExtractionResult {
  prescriptionId: string;
  status: "SUCCESS" | "PARTIAL" | "NO_MATCH" | "ERROR";
  message: string;
  totalFound: number;
  candidates: PrescriptionExtractionCandidate[];
}

/**
 * Normalizes test strings for fuzzy matching against TestMaster names and synonyms.
 */
function normalizeQuery(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Extracts explicitly written test names from a prescription and matches them against
 * Gyrex Test Master and the target laboratory's catalogue.
 * 
 * STRICT ARCHITECTURAL PRINCIPLE:
 * Gemini is used ONLY to extract test names written on the prescription.
 * It must NEVER diagnose, infer diseases, or recommend unwritten medical investigations.
 */
export async function extractAndMatchPrescriptionTests(
  labId: string,
  rawTestNames: string[]
): Promise<PrescriptionExtractionResult> {
  const lab = await prisma.lab.findUnique({
    where: { id: labId },
    include: {
      labTests: {
        where: { isActive: true },
        include: { masterTest: true },
      },
    },
  });

  if (!lab) {
    throw new Error(`Laboratory not found: ${labId}`);
  }

  // Fetch all central master tests
  const masterTests = await prisma.testMaster.findMany({
    where: { isActive: true },
  });

  const candidates: PrescriptionExtractionCandidate[] = [];

  for (const rawName of rawTestNames) {
    const cleanRaw = rawName.trim();
    if (!cleanRaw) continue;

    const normRaw = normalizeQuery(cleanRaw);

    // 1. Match against Central Test Master (exact code, name, or synonym)
    const matchedMaster = masterTests.find((tm) => {
      if (normalizeQuery(tm.code) === normRaw) return true;
      if (normalizeQuery(tm.name) === normRaw || normalizeQuery(tm.name).includes(normRaw)) return true;
      return tm.synonyms.some((syn) => normalizeQuery(syn) === normRaw || normalizeQuery(syn).includes(normRaw));
    });

    if (matchedMaster) {
      // 2. Check if this laboratory offers this test
      const labOffer = lab.labTests.find((lt) => lt.masterTestId === matchedMaster.id);

      candidates.push({
        rawTestName: cleanRaw,
        confidence: 0.95,
        matchedMasterTestId: matchedMaster.id,
        matchedTestName: matchedMaster.name,
        labTestId: labOffer?.id || null,
        sellingPrice: labOffer ? Number(labOffer.sellingPrice) : null,
        isAvailableInLab: Boolean(labOffer),
        selectedByDefault: Boolean(labOffer),
      });
    } else {
      // Test not found in master catalogue
      candidates.push({
        rawTestName: cleanRaw,
        confidence: 0.6,
        matchedMasterTestId: null,
        matchedTestName: null,
        labTestId: null,
        sellingPrice: null,
        isAvailableInLab: false,
        selectedByDefault: false,
      });
    }
  }

  const availableCount = candidates.filter((c) => c.isAvailableInLab).length;
  let status: PrescriptionExtractionResult["status"] = "SUCCESS";
  let message = `We found ${candidates.length} tests on your prescription.`;

  if (candidates.length === 0) {
    status = "NO_MATCH";
    message = "No laboratory tests could be identified. Please try uploading a clearer image.";
  } else if (availableCount === 0) {
    status = "NO_MATCH";
    message = "None of the tests on this prescription are currently offered by this laboratory.";
  } else if (availableCount < candidates.length) {
    status = "PARTIAL";
    message = `We matched ${availableCount} of ${candidates.length} tests to this laboratory's catalogue. Please review before proceeding.`;
  }

  return {
    prescriptionId: `rx_${Date.now()}`,
    status,
    message,
    totalFound: candidates.length,
    candidates,
  };
}
