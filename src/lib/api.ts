/**
 * Central API helper for safe response parsing.
 * Prevents "Unexpected token 'T', 'The page c'..." syntax errors
 * when a server returns HTML (e.g. 404/500 error page) instead of valid JSON.
 */

export async function parseResponseJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text || !text.trim()) {
    if (!res.ok) {
      throw new Error(`Server returned error status (${res.status}).`);
    }
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    console.warn(`[API] Response was not valid JSON (status ${res.status}):`, text.substring(0, 120));
    if (!res.ok) {
      throw new Error(`Server returned error (${res.status}). Please try again.`);
    }
    return { error: 'Received invalid formatting from server.' };
  }
}

export async function safeFetchJson(url: string, options?: RequestInit): Promise<any> {
  const res = await fetch(url, options);
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
  }
  return data;
}
