export type AuthSession = {
  token: string;
  user: { id: string; email: string; fullName?: string; full_name?: string };
  shop: { id: string; name: string; slug: string };
  role?: string;
};

const SESSION_KEY = "garmentos_session";

export function saveSession(session: AuthSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function readSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    return session.token ? session : null;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  // Remove the old demo flag so it cannot accidentally grant access.
  localStorage.removeItem("apparelsync_auth");
  localStorage.removeItem("apparelsync_user");
}
