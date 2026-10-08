// Admin session helpers. The JWT from /api/admin/login is kept in
// sessionStorage, so closing the browser ends the admin session and the
// login page is shown again on the next visit.

const TOKEN_KEY = "admin_token";
const USER_KEY = "admin_user";
const store = window.sessionStorage;

// Logins used to be kept in localStorage for days; drop any left over
try {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
} catch {}

// Fired when the session ends (logout or a 401 from the API) so the
// admin route guard can redirect to the login page.
export const AUTH_EVENT = "admin-auth-changed";

const decodePayload = (token) => {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
};

export const getAdminToken = () => {
  try {
    const token = store.getItem(TOKEN_KEY);
    if (!token) return null;
    const payload = decodePayload(token);
    // Treat malformed or expired tokens as no token
    if (!payload || (payload.exp && payload.exp * 1000 <= Date.now())) {
      clearAdminSession();
      return null;
    }
    return token;
  } catch {
    return null;
  }
};

export const getAdminUser = () => {
  try {
    return JSON.parse(store.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
};

export const saveAdminSession = (token, admin) => {
  store.setItem(TOKEN_KEY, token);
  store.setItem(USER_KEY, JSON.stringify(admin || {}));
  window.dispatchEvent(new Event(AUTH_EVENT));
};

export const clearAdminSession = () => {
  const hadToken = store.getItem(TOKEN_KEY);
  store.removeItem(TOKEN_KEY);
  store.removeItem(USER_KEY);
  if (hadToken) window.dispatchEvent(new Event(AUTH_EVENT));
};
