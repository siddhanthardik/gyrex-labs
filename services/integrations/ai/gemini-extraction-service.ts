/**
 * Gyrex Labs - Prescription Extraction Service (Google Gemini Multimodal AI)
 *
 * CRITICAL MEDICAL SAFETY FENCE:
 * Gemini is used ONLY to extract the names of laboratory investigations explicitly
 * written on the prescription.
 *
 * PROHIBITED:
 * - Diagnosing medical conditions
 * - Predicting diseases
 * - Inferring tests not written
 * - Recommending additional tests
 * - Giving clinical advice
 */

import {
  PrescriptionExtractionProvider,
  PrescriptionExtractionOutput,
  RawExtractedItem,
} from "@/lib/integrations/types";
import { z } from "zod";

const RawExtractedItemSchema = z.object({
  rawText: z.string().min(1).max(200),
  confidence: z.number().min(0).max(1),
  categoryHint: z.string().max(100).optional(),
  uncertaintyReason: z.string().max(200).optional(),
});

const GeminiExtractionSchema = z.object({
  investigations: z.array(RawExtractedItemSchema),
  notes: z.string().max(500).optional(),
});

export class GeminiExtractionService implements PrescriptionExtractionProvider {
  private readonly apiKey: string | null;
  private readonly modelName = "gemini-1.5-flash";

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || null;
  }

  /**
   * Strictly extracts investigation names from a prescription image/PDF.
   */
  async extractInvestigationsFromBuffer(
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<PrescriptionExtractionOutput> {
    if (!this.apiKey) {
      // Deterministic Mock mode for test / offline / unconfigured environments
      return this.mockExtractionFallback();
    }

    const systemPrompt = `You are a medical OCR specialist for a diagnostic laboratory platform.
Your ONLY responsibility is to read the provided prescription and extract the names of laboratory tests / diagnostic investigations that are EXPLICITLY handwritten or typed by the doctor.

CRITICAL SAFETY INSTRUCTIONS:
1. Extract ONLY investigations explicitly written (e.g. CBC, Lipid Profile, TSH, Fasting Blood Sugar, Urine Routine, LFT).
2. NEVER diagnose diseases, infer symptoms, or offer medical advice.
3. NEVER suggest or recommend tests that are not written on the prescription.
4. If handwriting is illegible or ambiguous, include the best guess with confidence < 0.5 and specify uncertaintyReason.
5. Return strictly a JSON object with this structure:
{
  "investigations": [
    {
      "rawText": "Exact text read from prescription",
      "confidence": 0.95,
      "categoryHint": "Hematology"
    }
  ],
  "notes": "Optional notes on legibility"
}`;

    try {
      const base64Data = fileBuffer.toString("base64");
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: systemPrompt },
                {
                  inlineData: {
                    mimeType: mimeType || "image/jpeg",
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.0, // Maximum determinism
            responseMimeType: "application/json",
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API responded with status ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        return {
          status: "UNREADABLE",
          rawItems: [],
          modelId: this.modelName,
          notes: "No readable text content returned by model.",
        };
      }

      // Parse and validate strictly with Zod
      const parsedJson = JSON.parse(rawText);
      const validation = GeminiExtractionSchema.safeParse(parsedJson);

      if (!validation.success) {
        console.error("Gemini response schema violation:", validation.error.format());
        return {
          status: "ERROR",
          rawItems: [],
          modelId: this.modelName,
          notes: "Model response failed structural schema validation.",
        };
      }

      const items: RawExtractedItem[] = validation.data.investigations.map((inv) => ({
        rawText: inv.rawText.trim(),
        confidence: inv.confidence,
        categoryHint: inv.categoryHint,
        uncertaintyReason: inv.uncertaintyReason,
      }));

      const status = items.length === 0 ? "NO_MATCH" : "SUCCESS";

      return {
        status,
        rawItems: items,
        modelId: this.modelName,
        notes: validation.data.notes,
        rawJson: validation.data,
      };
    } catch (err: unknown) {
      console.error("Gemini extraction error:", err);
      // In development or test environments, fallback to mock
      if (process.env.NODE_ENV !== "production") {
        return this.mockExtractionFallback();
      }

      return {
        status: "ERROR",
        rawItems: [],
        modelId: this.modelName,
        notes: "Prescription extraction encountered an external service error.",
      };
    }
  }

  private mockExtractionFallback(): PrescriptionExtractionOutput {
    return {
      status: "SUCCESS",
      modelId: "gemini-1.5-flash-mock",
      rawItems: [
        { rawText: "Complete Blood Count (CBC)", confidence: 0.98, categoryHint: "Hematology" },
        { rawText: "Lipid Profile", confidence: 0.94, categoryHint: "Biochemistry" },
        { rawText: "Thyroid Stimulating Hormone (TSH)", confidence: 0.92, categoryHint: "Hormones" },
        { rawText: "Fasting Blood Sugar", confidence: 0.88, categoryHint: "Biochemistry" },
      ],
      notes: "Deterministic mock extraction for test / offline environment.",
    };
  }
}

export const geminiExtractionService = new GeminiExtractionService();
