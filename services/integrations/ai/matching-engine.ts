/**
 * Gyrex Labs - Prescription Test Matching Engine
 *
 * Matches raw extracted test strings against:
 * 1. Gyrex Centralized Test Master (standard code, names, synonyms)
 * 2. Laboratory's Active Catalogue (LabTest)
 *
 * Enforces rule:
 * If no reliable match exists, mark `needsReview = true`.
 * Never automatically add an unverified or unrelated test.
 */

import { prisma } from "@/lib/db/prisma";
import { RawExtractedItem } from "@/lib/integrations/types";

export interface MatchedPrescriptionTest {
  rawText: string;
  confidence: number;
  matchedMasterTestId: string | null;
  matchedTestName: string | null;
  labTestId: string | null;
  sellingPrice: number | null;
  isAvailableInLab: boolean;
  selectedByDefault: boolean;
  needsReview: boolean;
  reviewReason?: string;
}

export interface MatchingResult {
  status: "SUCCESS" | "PARTIAL" | "NO_MATCH";
  totalExtracted: number;
  availableInLabCount: number;
  matchedTests: MatchedPrescriptionTest[];
  message: string;
}

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function matchExtractedTestsToLab(
  labId: string,
  rawItems: RawExtractedItem[]
): Promise<MatchingResult> {
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
    throw new Error(`Laboratory '${labId}' not found.`);
  }

  const masterTests = await prisma.testMaster.findMany({
    where: { isActive: true },
  });

  const matchedTests: MatchedPrescriptionTest[] = [];

  for (const item of rawItems) {
    const rawClean = item.rawText.trim();
    if (!rawClean) continue;

    const norm = normalize(rawClean);

    // Match against TestMaster by code, name, or synonyms
    const matchedMaster = masterTests.find((tm) => {
      if (normalize(tm.code) === norm) return true;
      if (normalize(tm.name) === norm || normalize(tm.name).includes(norm) || norm.includes(normalize(tm.name))) {
        return true;
      }
      return tm.synonyms.some((syn) => normalize(syn) === norm || normalize(syn).includes(norm));
    });

    if (matchedMaster) {
      // Check if this lab offers this test
      const labOffer = lab.labTests.find((lt) => lt.masterTestId === matchedMaster.id);
      const isAvailable = Boolean(labOffer);
      const isConfident = item.confidence >= 0.75;

      matchedTests.push({
        rawText: rawClean,
        confidence: item.confidence,
        matchedMasterTestId: matchedMaster.id,
        matchedTestName: matchedMaster.name,
        labTestId: labOffer?.id || null,
        sellingPrice: labOffer ? Number(labOffer.sellingPrice) : null,
        isAvailableInLab: isAvailable,
        selectedByDefault: isAvailable && isConfident,
        needsReview: !isConfident || !isAvailable,
        reviewReason: !isAvailable
          ? "Test identified, but not offered by this laboratory."
          : !isConfident
          ? "Handwriting match uncertainty. Please confirm."
          : undefined,
      });
    } else {
      // Unrecognized test name
      matchedTests.push({
        rawText: rawClean,
        confidence: item.confidence,
        matchedMasterTestId: null,
        matchedTestName: null,
        labTestId: null,
        sellingPrice: null,
        isAvailableInLab: false,
        selectedByDefault: false,
        needsReview: true,
        reviewReason: "Test name could not be matched with centralized Test Master.",
      });
    }
  }

  const availableCount = matchedTests.filter((t) => t.isAvailableInLab).length;

  let status: MatchingResult["status"] = "SUCCESS";
  let message = `Identified ${matchedTests.length} tests on prescription.`;

  if (matchedTests.length === 0) {
    status = "NO_MATCH";
    message = "No diagnostic tests could be identified on this prescription.";
  } else if (availableCount === 0) {
    status = "NO_MATCH";
    message = "Identified tests are currently not available at this laboratory.";
  } else if (availableCount < matchedTests.length) {
    status = "PARTIAL";
    message = `Matched ${availableCount} of ${matchedTests.length} tests to ${lab.name}'s catalogue. Please review selections.`;
  }

  return {
    status,
    totalExtracted: matchedTests.length,
    availableInLabCount: availableCount,
    matchedTests,
    message,
  };
}
