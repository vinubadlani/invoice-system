import { getAmazonLwaCredentials, getLwaTokenEndpoint } from "./config"

// Login with Amazon (LWA) token exchange. Source of truth:
// developer-docs.amazon.com/sp-api — "Website Authorization Workflow" /
// "Connecting to the Selling Partner API" (verified Sep 2026):
// POST https://api.amazon.com/auth/o2/token, grant_type=authorization_code
// or grant_type=refresh_token, application/x-www-form-urlencoded body.
//
// SP-API dropped the AWS IAM/SigV4 signing requirement in Oct 2023 — every
// SP-API call in this integration only needs the LWA access token in the
// x-amz-access-token header, no AWS credentials.

type LwaTokenResponse = {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_in: number
}

async function postToLwa(body: Record<string, string>): Promise<LwaTokenResponse> {
  const response = await fetch(getLwaTokenEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams(body).toString(),
  })

  if (!response.ok) {
    // Never include `body` (contains client_secret/refresh_token) in the
    // thrown error — only the HTTP status, which is safe to log/surface.
    throw new Error(`LWA token request failed with status ${response.status}`)
  }

  return response.json()
}

// Exchanges the spapi_oauth_code from the OAuth callback for a refresh
// token. Must be called within 5 minutes of the callback per Amazon's docs
// — the authorization code expires after that.
export async function exchangeAuthorizationCode(authorizationCode: string): Promise<LwaTokenResponse> {
  const { clientId, clientSecret } = getAmazonLwaCredentials()
  return postToLwa({
    grant_type: "authorization_code",
    code: authorizationCode,
    client_id: clientId,
    client_secret: clientSecret,
  })
}

// Exchanges a stored refresh token for a short-lived access token. Access
// tokens are never persisted — fetched on demand per sync run and held in
// memory only for the duration of that request.
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const { clientId, clientSecret } = getAmazonLwaCredentials()
  const response = await postToLwa({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  })
  return response.access_token
}
