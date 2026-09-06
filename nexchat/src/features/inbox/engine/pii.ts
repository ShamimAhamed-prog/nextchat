// Extracted from `inboxEngine.ts`. See `inbox/README.md` for the split.

/**
 * AG-06: passport/NID, phone, email and payment references are masked by
 * default and only ever readable through `REVEAL_PII`, which records who
 * looked and why. Masking happens at render time from the full record —
 * this is a prototype, so the value is present client-side either way; the
 * point being modelled is the reveal *gate* and its audit trail, which is
 * where the real requirement lives.
 */
export type PiiField = "email" | "phone" | "address" | "passportNid" | "paymentSummary";

export const PII_LABEL: Record<PiiField, string> = {
  email: "Email",
  phone: "Phone",
  address: "Address",
  passportNid: "Passport / NID",
  paymentSummary: "Payment reference",
};

const DOT = "•";

/**
 * Each field keeps just enough to stay useful for the task — the last digits
 * to read a number back to a caller, the domain to see which provider an
 * address is on — and hides the rest. "By role and task", not all-or-nothing.
 */
export function maskPii(field: PiiField, value: string): string {
  if (!value) return value;
  switch (field) {
    case "email": {
      const [user, domain] = value.split("@");
      if (!domain) return DOT.repeat(8);
      return `${user.slice(0, 2)}${DOT.repeat(6)}@${domain}`;
    }
    case "phone": {
      const tail = value.replace(/\D/g, "").slice(-3);
      return `${DOT.repeat(9)} ${tail}`;
    }
    case "address": {
      // Keep the city — the last comma-separated part — and hide the street.
      const parts = value.split(",");
      const city = parts[parts.length - 1].trim();
      return `${DOT.repeat(12)}, ${city}`;
    }
    case "passportNid":
      return `${DOT.repeat(6)}${value.slice(-3)}`;
    case "paymentSummary":
      // Amount, rail and time stay legible; only the reference is protected,
      // since that is the part that can be replayed against the gateway.
      return value.replace(/ref\s+\S+/i, `ref ${DOT.repeat(6)}`);
  }
}
