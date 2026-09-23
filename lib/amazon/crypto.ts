import { randomBytes, createCipheriv, createDecipheriv } from "crypto"

// AES-256-GCM encryption for the Amazon refresh token at rest. Nothing in
// this repo did encryption before this integration — this is intentionally
// small and dependency-free (Node's built-in `crypto`).
//
// AMAZON_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key, e.g.
// generated with: openssl rand -base64 32

const ALGORITHM = "aes-256-gcm"

function getKey(): Buffer {
  const raw = process.env.AMAZON_TOKEN_ENCRYPTION_KEY
  if (!raw) {
    throw new Error("AMAZON_TOKEN_ENCRYPTION_KEY must be set to encrypt/decrypt Amazon refresh tokens")
  }
  const key = Buffer.from(raw, "base64")
  if (key.length !== 32) {
    throw new Error("AMAZON_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded AES-256 key)")
  }
  return key
}

export type EncryptedToken = {
  ciphertext: string // base64
  iv: string // base64
  authTag: string // base64
}

export function encryptRefreshToken(plainText: string): EncryptedToken {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  }
}

export function decryptRefreshToken(token: EncryptedToken): string {
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(token.iv, "base64"))
  decipher.setAuthTag(Buffer.from(token.authTag, "base64"))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(token.ciphertext, "base64")),
    decipher.final(),
  ])
  return decrypted.toString("utf8")
}
