// The session cookie NAME lives in its own tiny module so middleware.ts can
// import it without dragging next/headers and the account stores (which
// lib/auth/current-user.ts pulls in) into the middleware bundle.
export const SESSION_COOKIE = "mb_session";
