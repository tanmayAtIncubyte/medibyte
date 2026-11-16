import { currentScope, scopeTtlSeconds } from "@/lib/access/scope";
import { backend } from "@/lib/data/backend";

export type CartItem = {
  productId: string;
  quantity: number;
};

type SessionState = {
  cart: CartItem[];
  couponCode: string | null;
};

// Session state lives in the async KV seam (lib/data/backend.ts) under
// `${scope}:sess:${sessionId}`, namespaced by the current request's scope so a
// candidate's carts are isolated from everyone else's and expire with their
// access window. Locally the backend is in-memory (wiped on restart, returning
// every session to the seed baseline: an empty cart); on the deploy it is Redis,
// so carts survive across lambdas.

function sessionKey(scope: string, sessionId: string): string {
  return `${scope}:sess:${sessionId}`;
}

async function readSession(scope: string, sessionId: string): Promise<SessionState> {
  const state = await backend().get<SessionState>(sessionKey(scope, sessionId));
  return state ?? { cart: [], couponCode: null };
}

async function writeSession(
  scope: string,
  sessionId: string,
  state: SessionState,
): Promise<void> {
  await backend().set(sessionKey(scope, sessionId), state, scopeTtlSeconds(scope));
}

export async function getCouponCode(sessionId: string): Promise<string | null> {
  const scope = await currentScope();
  return (await readSession(scope, sessionId)).couponCode;
}

// Stores the applied coupon code for the session (replaces any existing one).
export async function setCouponCode(sessionId: string, code: string | null): Promise<void> {
  const scope = await currentScope();
  const session = await readSession(scope, sessionId);
  session.couponCode = code;
  await writeSession(scope, sessionId, session);
}

export async function clearCoupon(sessionId: string): Promise<void> {
  await setCouponCode(sessionId, null);
}

export async function getCart(sessionId: string): Promise<CartItem[]> {
  const scope = await currentScope();
  return (await readSession(scope, sessionId)).cart.map((item) => ({ ...item }));
}

export async function addToCart(
  sessionId: string,
  productId: string,
  quantity: number,
): Promise<CartItem[]> {
  const scope = await currentScope();
  const amount = normalizeQuantity(quantity);
  const session = await readSession(scope, sessionId);
  if (amount <= 0) {
    return session.cart.map((item) => ({ ...item }));
  }
  const existingItem = session.cart.find((item) => item.productId === productId);
  if (existingItem) {
    existingItem.quantity += amount;
  } else {
    session.cart.push({ productId, quantity: amount });
  }
  await writeSession(scope, sessionId, session);
  return session.cart.map((item) => ({ ...item }));
}

// Sets an item's quantity outright. A quantity of 0 or less removes the item,
// so the same mutation backs both quantity edits and "remove".
export async function setCartItemQuantity(
  sessionId: string,
  productId: string,
  quantity: number,
): Promise<CartItem[]> {
  const scope = await currentScope();
  const amount = normalizeQuantity(quantity);
  const session = await readSession(scope, sessionId);
  if (amount <= 0) {
    session.cart = session.cart.filter((item) => item.productId !== productId);
    await writeSession(scope, sessionId, session);
    return session.cart.map((item) => ({ ...item }));
  }
  const existingItem = session.cart.find((item) => item.productId === productId);
  if (existingItem) {
    existingItem.quantity = amount;
  } else {
    session.cart.push({ productId, quantity: amount });
  }
  await writeSession(scope, sessionId, session);
  return session.cart.map((item) => ({ ...item }));
}

export async function removeFromCart(
  sessionId: string,
  productId: string,
): Promise<CartItem[]> {
  return setCartItemQuantity(sessionId, productId, 0);
}

// Sets an item's quantity WITHOUT the "<= 0 removes the line" guard, persisting
// a raw (possibly zero/negative) integer quantity. Used only by the gated
// FN_QTY_NONPOSITIVE buggy path so the endpoint "accepts" non-positive
// quantities; the clean setCartItemQuantity remains the default.
export async function setCartItemQuantityRaw(
  sessionId: string,
  productId: string,
  quantity: number,
): Promise<CartItem[]> {
  const scope = await currentScope();
  const amount = Number.isFinite(quantity) ? Math.floor(quantity) : 0;
  const session = await readSession(scope, sessionId);
  const existingItem = session.cart.find((item) => item.productId === productId);
  if (existingItem) {
    existingItem.quantity = amount;
  } else {
    session.cart.push({ productId, quantity: amount });
  }
  await writeSession(scope, sessionId, session);
  return session.cart.map((item) => ({ ...item }));
}

// Empties the cart and clears any applied coupon. Used after a successful
// checkout so the session starts a fresh cart.
export async function clearCart(sessionId: string): Promise<void> {
  const scope = await currentScope();
  await writeSession(scope, sessionId, { cart: [], couponCode: null });
}

function normalizeQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) {
    return 0;
  }
  return Math.floor(quantity);
}

export async function resetAllSessions(): Promise<void> {
  const scope = await currentScope();
  const keys = await backend().listKeys(`${scope}:sess:`);
  for (const key of keys) {
    await backend().del(key);
  }
}
