import { verify } from "node:crypto"

/**
 * Public keys embedded in the app. The updater only trusts signatures made by
 * one of these keys; the private key lives in the release workflow secret.
 *
 * Rotation: add the new public key here, keep the old one until a signed
 * release carrying both keys is published, then remove it in a later release.
 */
export const RELEASE_SIGNING_KEYS: Readonly<Record<string, string>> = {
  "release-2026-10": `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAa7NsYrHSJbyOaD3y8vumuMTl5sCtLuUYfoeNc6wu1zQ=
-----END PUBLIC KEY-----`,
}

export interface ReleaseSignature {
  keyId: string
  signature: Buffer
}

export const parseReleaseSignature = (raw: string): ReleaseSignature | null => {
  try {
    const parsed = JSON.parse(raw) as {
      keyId?: unknown
      signature?: unknown
    }
    if (
      typeof parsed.keyId !== "string" ||
      typeof parsed.signature !== "string" ||
      parsed.signature.length === 0
    ) {
      return null
    }
    const signature = Buffer.from(parsed.signature, "base64")
    if (signature.length === 0) return null
    return { keyId: parsed.keyId, signature }
  } catch {
    return null
  }
}

export const verifyReleaseSignature = (
  checksums: string,
  rawSignature: string,
  keys: Readonly<Record<string, string>> = RELEASE_SIGNING_KEYS,
): boolean => {
  const parsed = parseReleaseSignature(rawSignature)
  if (!parsed) return false

  const publicKey = keys[parsed.keyId]
  if (!publicKey) return false

  try {
    return verify(
      null,
      Buffer.from(checksums, "utf8"),
      publicKey,
      parsed.signature,
    )
  } catch {
    return false
  }
}
