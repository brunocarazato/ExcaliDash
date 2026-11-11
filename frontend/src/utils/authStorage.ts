export const USER_KEY = "excalidash-user";

const isStoredUser = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const safeRemove = (): void => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(USER_KEY);
    }
  } catch {
    // localStorage can be unavailable in restricted browser contexts.
  }
};

/**
 * Reads the persisted auth user.
 *
 * Returns null (and clears the key) when the stored value is missing, the
 * literal strings "undefined"/"null", invalid JSON, or not a JSON object.
 * This prevents `JSON.parse` from throwing on corrupted entries such as the
 * `"undefined"` value produced by an earlier `JSON.stringify(undefined)`.
 */
export const readStoredUser = <T>(): T | null => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    if (raw === "undefined" || raw === "null") {
      safeRemove();
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredUser(parsed)) {
      safeRemove();
      return null;
    }
    return parsed as T;
  } catch {
    safeRemove();
    return null;
  }
};

/**
 * Persists the auth user, but never writes `"undefined"`/`"null"`.
 * If the provided value is not a plain object, the stored key is removed.
 */
export const writeStoredUser = (user: unknown): void => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    if (!isStoredUser(user)) {
      safeRemove();
      return;
    }
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // Ignore unavailable storage (quota exceeded/private mode).
  }
};

export const clearStoredUser = (): void => {
  safeRemove();
};
