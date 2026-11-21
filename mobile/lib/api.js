import { API_BASE } from '../config';

// Minimal JSON fetch wrapper. Throws an Error whose message is the API's own
// error string, so screens can show it directly instead of "Request failed".
export async function request(path, { method = 'GET', body, token } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`Cannot reach the server at ${API_BASE}. Is the backend running?`);
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    throw Object.assign(new Error(message), { status: res.status });
  }
  return data;
}

export const login = (identifier, password) =>
  request('/auth/login', { method: 'POST', body: { identifier, password } });

export const signup = (payload) =>
  request('/auth/signup', { method: 'POST', body: payload });
