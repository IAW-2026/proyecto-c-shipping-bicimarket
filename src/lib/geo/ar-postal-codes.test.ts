import assert from "node:assert/strict";
import test from "node:test";

import { AR_POSTAL_CODES, geocodePostalCode } from "./ar-postal-codes";

const MULTI_APP_SEED_POSTAL_CODES = [
  "B1629",
  "B1642",
  "B1878",
  "B1900",
  "B2800",
  "B7600",
  "C1006",
  "C1042",
  "C1043",
  "C1406",
  "C1425",
  "C1426",
  "M5500",
  "S2000",
  "X5000",
] as const;

test("all Buyer and Seller seed postal codes have an exact geocode", () => {
  for (const postalCode of MULTI_APP_SEED_POSTAL_CODES) {
    assert.ok(
      AR_POSTAL_CODES[postalCode],
      `${postalCode} must not depend on prefix fallback`,
    );
    assert.equal(geocodePostalCode(postalCode)?.cp, postalCode);
  }
});

test("postal code lookup normalizes case and whitespace", () => {
  assert.equal(geocodePostalCode(" c1042 ")?.cp, "C1042");
  assert.equal(geocodePostalCode(" b2800 ")?.cp, "B2800");
});
