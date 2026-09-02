/**
 * The session cookie name, isolated from the session module.
 *
 * Proxy runs on the Edge runtime and cannot pull in the SQLite layer, so it
 * takes the name from here rather than from session.ts.
 */
export const SESSION_COOKIE = "eights_session";
