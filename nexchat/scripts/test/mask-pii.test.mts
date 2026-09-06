/**
 * AG-06. The browser suite proves the masked field renders masked; these
 * are the input shapes it cannot practically enumerate — the ones where
 * "mask the rest" has to decide what "the rest" is.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { maskPii } from "@/components/dashboard/inboxEngine";

const D = "\u2022";

describe("maskPii", () => {
  it("keeps the email domain and the first two characters", () => {
    assert.equal(maskPii("email", "rahim.uddin@gmail.com"), `ra${D.repeat(6)}@gmail.com`);
  });

  it("does not pad a one-character local part out to two", () => {
    assert.equal(maskPii("email", "r@gmail.com"), `r${D.repeat(6)}@gmail.com`);
  });

  it("hides a malformed address entirely rather than guessing at it", () => {
    // No @ means no domain worth showing, and no safe assumption about what
    // the string is. Eight dots and nothing else.
    assert.equal(maskPii("email", "not-an-address"), D.repeat(8));
  });

  it("keeps the last three digits of a phone number, ignoring formatting", () => {
    assert.equal(maskPii("phone", "+880 1711-234567"), `${D.repeat(9)} 567`);
    assert.equal(maskPii("phone", "01711234567"), `${D.repeat(9)} 567`);
  });

  it("gives back what little there is when a number is shorter than the mask", () => {
    assert.equal(maskPii("phone", "12"), `${D.repeat(9)} 12`);
  });

  it("keeps the city and hides the street", () => {
    assert.equal(maskPii("address", "House 42, Road 3, Dhanmondi, Dhaka"), `${D.repeat(12)}, Dhaka`);
  });

  it("treats a single-part address as the city, since that is all it is", () => {
    assert.equal(maskPii("address", "Dhaka"), `${D.repeat(12)}, Dhaka`);
  });

  it("keeps the last three of a passport or NID", () => {
    assert.equal(maskPii("passportNid", "AB1234567"), `${D.repeat(6)}567`);
  });

  it("masks only the payment reference, leaving amount rail and time legible", () => {
    assert.equal(
      maskPii("paymentSummary", "BDT 8,400 via bKash ref TRX9931A at 14:02"),
      `BDT 8,400 via bKash ref ${D.repeat(6)} at 14:02`,
    );
  });

  it("matches the reference label case-insensitively", () => {
    assert.equal(maskPii("paymentSummary", "BDT 100 Ref ABC123"), `BDT 100 ref ${D.repeat(6)}`);
  });

  /*
   * Documenting a real limit rather than asserting it is fine. A summary with
   * no `ref` token comes back untouched, because the masker keys off that
   * label. Nothing in the app produces such a string today — every
   * `paymentSummary` is built with one — so this is a note for whoever
   * changes that, not a passing test pretending to be coverage.
   */
  it("leaves a summary with no reference label untouched — a known limit", () => {
    assert.equal(maskPii("paymentSummary", "BDT 100 via bKash"), "BDT 100 via bKash");
  });

  it("passes an empty value straight through for every field", () => {
    for (const f of ["email", "phone", "address", "passportNid", "paymentSummary"] as const) {
      assert.equal(maskPii(f, ""), "");
    }
  });
});
