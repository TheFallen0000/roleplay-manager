#!/usr/bin/env node
/**
 * Signs `release/SHA256SUMS` with the Ed25519 private key stored in the
 * `RM_RELEASE_SIGNING_KEY` GitHub Actions secret. The updater verifies the
 * signature with the public key embedded in the app before trusting checksums.
 */
import {
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
} from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

const directory = resolve(process.argv[2] ?? "release")
const keyId = process.env.RM_RELEASE_SIGNING_KEY_ID ?? "release-2026-10"
const privatePem = process.env.RM_RELEASE_SIGNING_KEY

// Keep in sync with release-signature.ts. If the secret does not belong to the
// public key embedded in the app, every future update would fail verification.
const EXPECTED_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAa7NsYrHSJbyOaD3y8vumuMTl5sCtLuUYfoeNc6wu1zQ=
-----END PUBLIC KEY-----`

if (!privatePem) {
  throw new Error("RM_RELEASE_SIGNING_KEY is not configured.")
}

const privateKey = createPrivateKey(privatePem)
if (privateKey.asymmetricKeyType !== "ed25519") {
  throw new Error("RM_RELEASE_SIGNING_KEY must be an Ed25519 private key.")
}

const derivedPublicKey = createPublicKey(privateKey)
  .export({ type: "spki", format: "pem" })
  .toString()
  .trim()
if (derivedPublicKey !== EXPECTED_PUBLIC_KEY.trim()) {
  throw new Error(
    "RM_RELEASE_SIGNING_KEY does not match the public key embedded in the app.",
  )
}

const data = readFileSync(join(directory, "SHA256SUMS"))
const signature = sign(null, data, privateKey)

if (!verify(null, data, derivedPublicKey, signature)) {
  throw new Error("Could not verify the generated signature.")
}

const output = join(directory, "SHA256SUMS.sig")
writeFileSync(
  output,
  `${JSON.stringify(
    {
      keyId,
      signature: signature.toString("base64"),
    },
    null,
    2,
  )}\n`,
  "utf8",
)

console.log(`Signed ${join(directory, "SHA256SUMS")} with key ${keyId}.`)
