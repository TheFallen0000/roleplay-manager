import { createPublicKey, generateKeyPairSync, sign } from "node:crypto"

import { describe, expect, it } from "vitest"

import {
  parseReleaseSignature,
  RELEASE_SIGNING_KEYS,
  verifyReleaseSignature,
} from "./release-signature"

const { privateKey, publicKey } = generateKeyPairSync("ed25519")
const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString()
const keys = { "test-key": publicPem }
const checksums = "abc123  package.zip\n"

const signatureFor = (data: string, keyId = "test-key"): string =>
  JSON.stringify({
    keyId,
    signature: sign(null, Buffer.from(data, "utf8"), privateKey).toString(
      "base64",
    ),
  })

describe("release signature", () => {
  it("contains a valid Ed25519 production public key", () => {
    const key = createPublicKey(RELEASE_SIGNING_KEYS["release-2026-10"])
    expect(key.asymmetricKeyType).toBe("ed25519")
  })

  it("accepts a valid signature", () => {
    expect(verifyReleaseSignature(checksums, signatureFor(checksums), keys)).toBe(
      true,
    )
  })

  it("rejects a tampered checksum file", () => {
    expect(
      verifyReleaseSignature(
        `${checksums}extra`,
        signatureFor(checksums),
        keys,
      ),
    ).toBe(false)
  })

  it("rejects an unknown key id", () => {
    expect(
      verifyReleaseSignature(checksums, signatureFor(checksums, "other"), keys),
    ).toBe(false)
  })

  it("rejects malformed signature payloads", () => {
    expect(verifyReleaseSignature(checksums, "not-json", keys)).toBe(false)
    expect(parseReleaseSignature("{}")).toBeNull()
    expect(
      parseReleaseSignature(JSON.stringify({ keyId: "test", signature: "" })),
    ).toBeNull()
  })
})
