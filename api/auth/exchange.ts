import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Exchanges a one-time authorization code (from the browser's GIS code-client
 * popup) for a token pair. This is the one call in the whole app that needs
 * the OAuth client secret, which is why it has to happen server-side — the
 * secret must never reach the browser bundle.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const { code, redirectUri } = (req.body ?? {}) as { code?: string; redirectUri?: string };
  if (!code) {
    res.status(400).json({ error: "missing_code" });
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.status(500).json({ error: "server_not_configured" });
    return;
  }

  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri ?? "",
    grant_type: "authorization_code",
  });

  const googleRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const data = await googleRes.json();

  if (!googleRes.ok) {
    console.error("Token exchange failed:", data);
    res.status(400).json({ error: data.error ?? "exchange_failed" });
    return;
  }

  res.status(200).json({
    access_token: data.access_token,
    expires_in: data.expires_in,
    // Google only returns this on the first-ever consent for this client+user+scope;
    // the caller must handle it being absent on subsequent sign-ins.
    refresh_token: data.refresh_token ?? null,
  });
}
