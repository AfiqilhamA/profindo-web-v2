import { validateImageFile, validateDocumentFile, validateSerialNumber, validateDateRange } from "../utils/validation";
import { generateUniqueWoNumber } from "../utils/woNumber";
import { getCountryFlagCode } from "../utils/countries";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

async function runTests() {
  console.log("Running unit & regression tests...\n");

  // Test 1: Country Flag Lookup
  assert(getCountryFlagCode("Indonesia") === "id", "Country flag for Indonesia should be 'id'");
  assert(getCountryFlagCode("Jepang") === "jp", "Country flag for Jepang should be 'jp'");
  assert(getCountryFlagCode("UnknownCountry") === null, "Unknown country should return null");
  console.log("✓ Country flag lookup tests passed");

  // Test 2: Serial Number Validation
  assert(validateSerialNumber("SN-12345") === true, "Valid serial number should pass");
  assert(validateSerialNumber("   ") === false, "Whitespace serial number should fail");
  assert(validateSerialNumber("AB") === false, "Short serial number (<3 chars) should fail");
  console.log("✓ Serial number validation tests passed");

  // Test 3: Date Range Validation
  assert(validateDateRange("2026-01-01", "2026-01-05") === true, "Valid date range should pass");
  assert(validateDateRange("2026-01-05", "2026-01-01") === false, "Invalid date range should fail");
  console.log("✓ Date range validation tests passed");

  // Test 4: File Validation Mocking
  const mockValidImage = new File(["dummy content"], "photo.jpg", { type: "image/jpeg" });
  assert(validateImageFile(mockValidImage).isValid === true, "JPEG image should be valid");

  const mockInvalidImage = new File(["dummy content"], "script.exe", { type: "application/x-msdownload" });
  assert(validateImageFile(mockInvalidImage).isValid === false, "EXE file as image should be invalid");
  console.log("✓ File type validation tests passed");
  // Test 5: WO Number Generation Format
  const woNum = await generateUniqueWoNumber();
  assert(/^WO-\d{8}-\d{4}$/.test(woNum), `WO number '${woNum}' should match format WO-YYYYMMDD-XXXX`);
  const woNumAttempt = await generateUniqueWoNumber(1);
  assert(/^WO-\d{8}-\d{4}$/.test(woNumAttempt), `WO number attempt '${woNumAttempt}' should match format WO-YYYYMMDD-XXXX`);
  console.log("✓ WO number generation tests passed");

  console.log("\nAll unit & regression tests passed successfully!");
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
