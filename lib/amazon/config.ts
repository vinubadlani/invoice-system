// Server-only configuration for the Amazon SP-API integration. Never import
// this from a client component — it reads secrets from process.env.

export type AmazonRegion = "na" | "eu" | "fe"
export type AmazonEnvironment = "sandbox" | "production"

// SP-API endpoint per region. Source: developer-docs.amazon.com/sp-api/docs/sp-api-endpoints
// and .../sp-api/docs/sp-api-sandbox (verified Sep 2026). Re-verify against
// the live docs if Amazon adds/changes a region before this ships to prod.
const SP_API_HOSTS: Record<AmazonRegion, { production: string; sandbox: string }> = {
  na: { production: "https://sellingpartnerapi-na.amazon.com", sandbox: "https://sandbox.sellingpartnerapi-na.amazon.com" },
  eu: { production: "https://sellingpartnerapi-eu.amazon.com", sandbox: "https://sandbox.sellingpartnerapi-eu.amazon.com" },
  fe: { production: "https://sellingpartnerapi-fe.amazon.com", sandbox: "https://sandbox.sellingpartnerapi-fe.amazon.com" },
}

const LWA_TOKEN_ENDPOINT = "https://api.amazon.com/auth/o2/token"

// Minimal marketplace metadata needed to build the authorization URL and
// scope Orders API calls. Extend this map as more marketplaces are onboarded
// — nothing else in the integration assumes India specifically.
export const AMAZON_MARKETPLACES: Record<string, { region: AmazonRegion; sellerCentralHost: string; countryCode: string }> = {
  A21TJRUUN4KGV: { region: "eu", sellerCentralHost: "sellercentral.amazon.in", countryCode: "IN" },
}

export const DEFAULT_MARKETPLACE_ID = "A21TJRUUN4KGV" // India

export function getAmazonEnvironment(): AmazonEnvironment {
  const env = (process.env.AMAZON_ENV || "sandbox").toLowerCase()
  return env === "production" ? "production" : "sandbox"
}

// Controls whether the authorize URL includes `version=beta`, required while
// the SP-API app is in Draft state in Seller Central (only accounts added as
// testers there can complete the flow). Flip AMAZON_APP_DRAFT=false, with no
// code change, once the app has been published/approved by Amazon.
export function isDraftApp(): boolean {
  return (process.env.AMAZON_APP_DRAFT ?? "true").toLowerCase() !== "false"
}

export function getSpApiBaseUrl(region: AmazonRegion, environment: AmazonEnvironment): string {
  return environment === "production" ? SP_API_HOSTS[region].production : SP_API_HOSTS[region].sandbox
}

export function getLwaTokenEndpoint(): string {
  return LWA_TOKEN_ENDPOINT
}

export function getAmazonLwaCredentials() {
  const clientId = process.env.AMAZON_LWA_CLIENT_ID
  const clientSecret = process.env.AMAZON_LWA_CLIENT_SECRET
  const appId = process.env.AMAZON_APP_ID
  const redirectUri = process.env.AMAZON_REDIRECT_URI

  if (!clientId || !clientSecret || !appId || !redirectUri) {
    throw new Error(
      "Amazon integration is not configured: AMAZON_LWA_CLIENT_ID, AMAZON_LWA_CLIENT_SECRET, AMAZON_APP_ID and AMAZON_REDIRECT_URI must all be set"
    )
  }

  return { clientId, clientSecret, appId, redirectUri }
}

export function buildAuthorizeUrl(params: { marketplaceId: string; state: string; draft: boolean }): string {
  const marketplace = AMAZON_MARKETPLACES[params.marketplaceId]
  if (!marketplace) {
    throw new Error(`Unsupported/unknown Amazon marketplaceId: ${params.marketplaceId}`)
  }

  const { appId } = getAmazonLwaCredentials()
  const url = new URL(`https://${marketplace.sellerCentralHost}/apps/authorize/consent`)
  url.searchParams.set("application_id", appId)
  url.searchParams.set("state", params.state)
  if (params.draft) {
    url.searchParams.set("version", "beta")
  }
  return url.toString()
}
