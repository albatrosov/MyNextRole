const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
];

export async function getToken(interactive = false): Promise<string | null> {
  try {
    const result = await chrome.identity.getAuthToken({ interactive, scopes: SCOPES });
    return result?.token ?? null;
  } catch (err) {
    console.error('[VT] auth.getToken failed:', err);
    if (interactive) {
      // Re-throw for interactive requests so caller can show error to user
      throw err;
    }
    return null;
  }
}

export async function removeToken(): Promise<void> {
  const token = await getToken();
  if (token) {
    await chrome.identity.removeCachedAuthToken({ token });
  }
}

/**
 * Force a full re-auth: clear all cached tokens for this extension AND
 * revoke the token on Google's side so a fresh consent flow runs with
 * the current scope set. Use when scopes change in manifest.
 */
export async function clearAllTokens(): Promise<void> {
  // Revoke current token at Google so cached grant is invalidated
  const token = await getToken(false);
  if (token) {
    try {
      await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `token=${encodeURIComponent(token)}`,
      });
    } catch {
      // Ignore network errors — local cache clear below still helps
    }
  }
  // Clear all cached tokens locally
  await new Promise<void>((resolve) => {
    chrome.identity.clearAllCachedAuthTokens(() => resolve());
  });
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken(false);
  return token !== null;
}
