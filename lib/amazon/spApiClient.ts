// Thin, generic SP-API HTTP client. SP-API dropped AWS IAM/SigV4 signing in
// Oct 2023 — every request here only needs the LWA access token in the
// x-amz-access-token header (verified against Amazon's current docs during
// planning; re-check developer-docs.amazon.com/sp-api if that ever changes
// for a specific operation this integration starts using).

const MAX_RETRIES = 3
const BASE_BACKOFF_MS = 1000

export class SpApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = "SpApiError"
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function callSpApi<T>(params: {
  baseUrl: string
  path: string
  accessToken: string
  query?: Record<string, string | undefined>
}): Promise<T> {
  const url = new URL(params.path, params.baseUrl)
  for (const [key, value] of Object.entries(params.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, value)
  }

  let attempt = 0
  while (true) {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-amz-access-token": params.accessToken,
        Accept: "application/json",
      },
    })

    if (response.ok) {
      return response.json() as Promise<T>
    }

    // Respect Amazon's rate limits: back off and retry on 429/5xx only.
    // Never aggressively poll — capped at MAX_RETRIES with exponential backoff.
    const isRetryable = response.status === 429 || response.status >= 500
    if (isRetryable && attempt < MAX_RETRIES) {
      attempt += 1
      await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1))
      continue
    }

    const bodyText = await response.text().catch(() => "")
    throw new SpApiError(
      response.status,
      `SP-API request to ${params.path} failed with status ${response.status}: ${bodyText.slice(0, 500)}`
    )
  }
}
