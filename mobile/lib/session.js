// Session storage.
//
// Deliberately in-memory for now: closing the app logs you out, and a token can
// never outlive the process, so a stale-token 401 cannot happen. Everything goes
// through these three functions, so switching to expo-secure-store later only
// changes this file (plus making App.js await the read during startup).
let current = null;

export function getSession() {
  return current;
}

export function saveSession(session) {
  current = session;
}

export function clearSession() {
  current = null;
}
