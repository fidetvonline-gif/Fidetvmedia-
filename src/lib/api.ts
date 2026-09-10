/**
 * Central API helper for safe response parsing.
 * Prevents "Unexpected token 'T', 'The page c'..." syntax errors
 * when a server returns HTML (e.g. 404/500 error page) instead of valid JSON.
 */

export async function parseResponseJson(res: Response): Promise<any> {
  let text = '';
  try {
    text = await res.text();
  } catch (e) {
    if (!res.ok) {
      throw new Error(`Server error (${res.status}).`);
    }
    return {};
  }

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
    const cleanText = text.replace(/<[^>]*>?/gm, '').trim();
    const shortMsg = cleanText.substring(0, 150) || `Server returned status ${res.status}`;

    if (!res.ok) {
      throw new Error(shortMsg);
    }
    return { error: shortMsg, raw: text };
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
