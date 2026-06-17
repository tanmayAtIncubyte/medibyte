// Account domain types. Profile is read from the session account; addresses
// (PII) and insurance (PHI) are editable, in-memory, per-session state. Safe to
// import on the client (types only).

import type { ShippingAddress } from "@/lib/orders/types";

// A saved address reuses the shipping shape plus a stable id + label.
export type SavedAddress = ShippingAddress & {
  id: string;
  label: string;
};

// Insurance details (PHI).
export type InsuranceInfo = {
  provider: string;
  memberId: string;
  groupNumber: string;
};

// The editable account state held per user. Profile (name/email) comes from the
// auth account and is shown read-only; this is the mutable part.
export type AccountState = {
  addresses: SavedAddress[];
  insurance: InsuranceInfo;
};
