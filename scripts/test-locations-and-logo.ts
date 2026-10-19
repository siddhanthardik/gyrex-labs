/**
 * Gyrex Labs - Automated Verification Suite for India Locations & Storefront Logo
 *
 * Verifies:
 * 1. Complete 36 States & UTs master dataset coverage, alias normalization, and city lookups.
 * 2. Cascading city resolution, "Other" custom city fallback, and zero-loss preservation.
 * 3. Storefront logo storage, URL serialization, and fallback contract.
 */

import {
  INDIA_LOCATIONS,
  findIndiaLocation,
  getAllIndianStateNames,
  getCitiesForIndianState,
  isCityInIndianState,
  canonicalizeStateName,
} from "../data/india-locations";
import { detectImageFormat } from "../services/lab/logo-storage-service";

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    if (detail) console.error(`    Detail: ${detail}`);
  }
}

async function runTests() {
  console.log("\n========================================================");
  console.log(" 1. INDIA LOCATIONS MASTER DATA INTEGRITY");
  console.log("========================================================\n");

  // Total count check: 28 States + 8 UTs = 36
  assert(
    INDIA_LOCATIONS.length === 36,
    "Master location list contains exactly 36 States and Union Territories",
    `Found ${INDIA_LOCATIONS.length} entries`
  );

  const states = INDIA_LOCATIONS.filter((l) => l.type === "State");
  const uts = INDIA_LOCATIONS.filter((l) => l.type === "Union Territory");

  assert(
    states.length === 28,
    "Exactly 28 28 States are present",
    `Found ${states.length} States`
  );

  assert(
    uts.length === 8,
    "Exactly 8 Union Territories are present",
    `Found ${uts.length} Union Territories`
  );

  // Check no duplicates and every location has non-empty cities
  const uniqueNames = new Set(INDIA_LOCATIONS.map((l) => l.state.toLowerCase()));
  assert(
    uniqueNames.size === 36,
    "All State and Union Territory names are distinct and unique"
  );

  const emptyCityStates = INDIA_LOCATIONS.filter((l) => !l.cities || l.cities.length === 0);
  assert(
    emptyCityStates.length === 0,
    "Every State/UT provides curated cities",
    emptyCityStates.map((l) => l.state).join(", ")
  );

  console.log("\n========================================================");
  console.log(" 2. LOCATION LOOKUP & ALIAS RESOLUTION");
  console.log("========================================================\n");

  // Exact & Case-Insensitive Lookup
  const del = findIndiaLocation("Delhi");
  assert(del?.state === "Delhi" && del?.type === "Union Territory", "Resolves 'Delhi' as Union Territory");

  const mah = findIndiaLocation("maharashtra");
  assert(mah?.state === "Maharashtra", "Case-insensitive lookup resolves 'maharashtra' to 'Maharashtra'");

  // Common Historical / Abbreviation Aliases
  const orissa = findIndiaLocation("Orissa");
  assert(orissa?.state === "Odisha", "Alias 'Orissa' resolves to canonical 'Odisha'");

  const nct = findIndiaLocation("NCT of Delhi");
  assert(nct?.state === "Delhi", "Alias 'NCT of Delhi' resolves to canonical 'Delhi'");

  const dnh = findIndiaLocation("Dadra and Nagar Haveli");
  assert(
    dnh?.state === "Dadra and Nagar Haveli and Daman and Diu",
    "Alias 'Dadra and Nagar Haveli' resolves to canonical 'Dadra and Nagar Haveli and Daman and Diu'"
  );

  const jk = findIndiaLocation("Jammu & Kashmir");
  assert(
    jk?.state === "Jammu and Kashmir",
    "Alias 'Jammu & Kashmir' resolves to canonical 'Jammu and Kashmir'"
  );

  const py = findIndiaLocation("Pondicherry");
  assert(py?.state === "Puducherry", "Alias 'Pondicherry' resolves to canonical 'Puducherry'");

  const nonExistent = findIndiaLocation("Atlantis");
  assert(nonExistent === undefined, "Non-existent region safely returns undefined");

  // Canonicalize helper
  assert(
    canonicalizeStateName("orissa") === "Odisha",
    "canonicalizeStateName('orissa') returns 'Odisha'"
  );
  assert(
    canonicalizeStateName("Custom Territory") === "Custom Territory",
    "canonicalizeStateName preserves unlisted state string safely without corruption"
  );

  console.log("\n========================================================");
  console.log(" 3. CASCADING CITY LOOKUP & PRESERVATION LOGIC");
  console.log("========================================================\n");

  const mahCities = getCitiesForIndianState("Maharashtra");
  assert(
    mahCities.includes("Mumbai") && mahCities.includes("Pune") && mahCities.includes("Nagpur"),
    "getCitiesForIndianState('Maharashtra') contains Mumbai, Pune, Nagpur"
  );

  const delCities = getCitiesForIndianState("Delhi");
  assert(
    delCities.includes("New Delhi") && delCities.includes("Dwarka") && delCities.includes("Rohini"),
    "getCitiesForIndianState('Delhi') contains New Delhi, Dwarka, Rohini"
  );

  // isCityInIndianState checks
  assert(
    isCityInIndianState("Rajasthan", "Jaipur") === true,
    "Jaipur is recognized as a curated city in Rajasthan"
  );
  assert(
    isCityInIndianState("Rajasthan", "jaipur") === true,
    "City match is case-insensitive ('jaipur' === true)"
  );
  assert(
    isCityInIndianState("Rajasthan", "Tokyo") === false,
    "Tokyo is not in Rajasthan (returns false)"
  );

  // Preservation simulation: existing stored values in database
  function simulateSelectorBehavior(storedState: string, storedCity: string) {
    const loc = findIndiaLocation(storedState);
    const canonicalState = loc ? loc.state : storedState;
    const cities = loc ? getCitiesForIndianState(canonicalState) : [];
    const isCurated = isCityInIndianState(canonicalState, storedCity);

    return {
      selectedState: canonicalState,
      isOtherCity: !isCurated && Boolean(storedCity),
      effectiveCity: storedCity,
    };
  }

  // Case A: Pre-existing curated city
  const simA = simulateSelectorBehavior("Karnataka", "Bengaluru");
  assert(
    simA.selectedState === "Karnataka" && !simA.isOtherCity && simA.effectiveCity === "Bengaluru",
    "Pre-existing curated city 'Bengaluru' in Karnataka is selected directly"
  );

  // Case B: Pre-existing custom/small-town city
  const simB = simulateSelectorBehavior("Haryana", "Bhiwani Extension");
  assert(
    simB.selectedState === "Haryana" && simB.isOtherCity && simB.effectiveCity === "Bhiwani Extension",
    "Pre-existing unlisted city 'Bhiwani Extension' in Haryana triggers 'Other' with exact value preserved"
  );

  // Case C: Pre-existing alias state + unlisted city
  const simC = simulateSelectorBehavior("Orissa", "Talcher Township");
  assert(
    simC.selectedState === "Odisha" && simC.isOtherCity && simC.effectiveCity === "Talcher Township",
    "Pre-existing alias 'Orissa' canonicalizes to 'Odisha' and preserves custom city"
  );

  console.log("\n========================================================");
  console.log(" 4. STOREFRONT LOGO VALIDATION & FALLBACK CONTRACT");
  console.log("========================================================\n");

  // Magic byte checks for secure image upload
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);
  const pngCheck = detectImageFormat(pngHeader);
  assert(pngCheck.valid && pngCheck.ext === "png", "detectImageFormat validates PNG magic bytes");

  const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const jpegCheck = detectImageFormat(jpegHeader);
  assert(jpegCheck.valid && jpegCheck.ext === "jpg", "detectImageFormat validates JPEG magic bytes");

  const badBuffer = Buffer.from("NOT_AN_IMAGE_FILE_BUFFER");
  const badCheck = detectImageFormat(badBuffer);
  assert(!badCheck.valid, "detectImageFormat rejects non-image executable/text buffers");

  // Storefront Header Fallback Invariant
  function getHeaderDisplay(labName: string, logoUrl: string | null | undefined, hasError = false) {
    if (logoUrl && !hasError) {
      return { type: "IMAGE", src: logoUrl };
    }
    return { type: "INITIALS", text: labName.charAt(0).toUpperCase() };
  }

  const headerWithLogo = getHeaderDisplay("Apollo Diagnostics", "/api/files/logo/logo-apollo-123.png");
  assert(
    headerWithLogo.type === "IMAGE" && headerWithLogo.src === "/api/files/logo/logo-apollo-123.png",
    "When logoUrl is present and error-free, logo image is rendered"
  );

  const headerWithoutLogo = getHeaderDisplay("Apollo Diagnostics", null);
  assert(
    headerWithoutLogo.type === "INITIALS" && headerWithoutLogo.text === "A",
    "When logoUrl is null, initials avatar 'A' is rendered as fallback"
  );

  const headerWithBrokenLogo = getHeaderDisplay("City Path Labs", "/api/files/logo/missing.png", true);
  assert(
    headerWithBrokenLogo.type === "INITIALS" && headerWithBrokenLogo.text === "C",
    "When logo image triggers onError, gracefully falls back to initials 'C'"
  );

  console.log("\n========================================================");
  console.log(` RESULTS: ${passedTests}/${totalTests} tests passed`);
  console.log("========================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
