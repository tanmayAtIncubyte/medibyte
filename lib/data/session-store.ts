export type CartItem = {
  productId: string;
  quantity: number;
};

type SessionState = {
  cart: CartItem[];
};

// Module-level store: writes survive for the lifetime of the running server
// process and are wiped when the process restarts, returning every session to
// the seed baseline (an empty cart). This is the canonical in-memory write
// pattern that cart/order/registration features build on in later phases.
const sessions = new Map<string, SessionState>();

function getOrCreateSession(sessionId: string): SessionState {
  const existing = sessions.get(sessionId);
  if (existing) {
    return existing;
  }
  const created: SessionState = { cart: [] };
  sessions.set(sessionId, created);
  return created;
}

export function getCart(sessionId: string): CartItem[] {
  return getOrCreateSession(sessionId).cart.map((item) => ({ ...item }));
}

export function addToCart(sessionId: string, productId: string, quantity: number): CartItem[] {
  const session = getOrCreateSession(sessionId);
  const existingItem = session.cart.find((item) => item.productId === productId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    session.cart.push({ productId, quantity });
  }
  return getCart(sessionId);
}

export function resetAllSessions(): void {
  sessions.clear();
}
