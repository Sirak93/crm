// Reads only the `exp` claim to decide when to refresh - never a security check, the
// server verifies every token. null when the token can't be read.
export const tokenExpiresAtMs = (token: string): number | null => {
  try {
    const payload = token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload));
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
};
