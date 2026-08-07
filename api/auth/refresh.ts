import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Mints a fresh access token from a previously-stored refresh token. Unlike
 * requestAccessToken()'s popup, this is a plain fetch to our own origin —
 * no user gesture required — so the frontend can call it silently on
 * mount/expiry without risking a browser popup blocker.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const { refreshToken } = (req.body ?? {}) as { refreshToken?: string };
  if (!refreshToken) {
    res.status(400).json({ error: "missing_refresh_token" });
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.status(500).json({ error: "server_not_configured" });
    return;
  }

  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

  const googleRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const data = await googleRes.json();

  if (!googleRes.ok) {
    // invalid_grant etc. — the refresh token itself is dead (revoked, or the
    // 7-day cap on an unverified/testing OAuth app). Caller falls back to a
    // fresh interactive sign-in.
    console.error("Token refresh failed:", data);
    res.status(400).json({ error: data.error ?? "refresh_failed" });
    return;
  }

  res.status(200).json({ access_token: data.access_token, expires_in: data.expires_in });
}
