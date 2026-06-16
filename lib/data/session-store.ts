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

function normalizeQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) {
    return 0;
  }
  return Math.floor(quantity);
}

export function resetAllSessions(): void {
  sessions.clear();
}
