import { globalSingleton } from "@/lib/data/global-store";

export type CartItem = {
  productId: string;
  quantity: number;
};

type SessionState = {
  cart: CartItem[];
  couponCode: string | null;
};

// Process-wide store (anchored on globalThis via globalSingleton) so the same
// Map is shared across Next's separate API-route and server-component bundles.
// Writes survive for the lifetime of the running server process and are wiped on
// restart, returning every session to the seed baseline (an empty cart).
const sessions = globalSingleton(
  "session-store/sessions",
  () => new Map<string, SessionState>(),
);

function getOrCreateSession(sessionId: string): SessionState {
  const existing = sessions.get(sessionId);
  if (existing) {
    return existing;
  }
  const created: SessionState = { cart: [], couponCode: null };
  sessions.set(sessionId, created);
  return created;
}

export function getCouponCode(sessionId: string): string | null {
  return getOrCreateSession(sessionId).couponCode;
}

// Stores the applied coupon code for the session (replaces any existing one).
export function setCouponCode(sessionId: string, code: string | null): void {
  getOrCreateSession(sessionId).couponCode = code;
}

export function clearCoupon(sessionId: string): void {
  setCouponCode(sessionId, null);
}

export function getCart(sessionId: string): CartItem[] {
  return getOrCreateSession(sessionId).cart.map((item) => ({ ...item }));
}

export function addToCart(sessionId: string, productId: string, quantity: number): CartItem[] {
  const amount = normalizeQuantity(quantity);
  if (amount <= 0) {
    return getCart(sessionId);
  }
  const session = getOrCreateSession(sessionId);
  const existingItem = session.cart.find((item) => item.productId === productId);
  if (existingItem) {
    existingItem.quantity += amount;
  } else {
    session.cart.push({ productId, quantity: amount });
  }
  return getCart(sessionId);
}

// Sets an item's quantity outright. A quantity of 0 or less removes the item,
// so the same mutation backs both quantity edits and "remove".
export function setCartItemQuantity(
  sessionId: string,
  productId: string,
  quantity: number,
): CartItem[] {
  const amount = normalizeQuantity(quantity);
  const session = getOrCreateSession(sessionId);
  if (amount <= 0) {
    session.cart = session.cart.filter((item) => item.productId !== productId);
    return getCart(sessionId);
  }
  const existingItem = session.cart.find((item) => item.productId === productId);
  if (existingItem) {
    existingItem.quantity = amount;
  } else {
    session.cart.push({ productId, quantity: amount });
  }
  return getCart(sessionId);
}

export function removeFromCart(sessionId: string, productId: string): CartItem[] {
  return setCartItemQuantity(sessionId, productId, 0);
}

// Empties the cart and clears any applied coupon. Used after a successful
// checkout so the session starts a fresh cart.
export function clearCart(sessionId: string): void {
  const session = getOrCreateSession(sessionId);
  session.cart = [];
  session.couponCode = null;
}

function normalizeQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) {
    return 0;
  }
  return Math.floor(quantity);
}

export function resetAllSessions(): void {
  sessions.clear();
}
