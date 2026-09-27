/**
 * Gyrex Labs - Integrations Health Checking Contract
 */

import { IntegrationHealthReport } from "./types";

export interface IntegrationChecker {
  name: string;
  category: IntegrationHealthReport["category"];
  check(): Promise<IntegrationHealthReport>;
}
