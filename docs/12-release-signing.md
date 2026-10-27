# 12 — Release signing

## Purpose

Every release publishes two integrity files next to the portable packages:

- `SHA256SUMS`: SHA-256 of each package.
- `SHA256SUMS.sig`: Ed25519 signature of `SHA256SUMS`.

The updater verifies the signature with a public key embedded in the app,
then verifies the downloaded package against the signed checksum. A compromised
release asset cannot be installed unless it is signed with the private key.

## Keys

| Item | Value |
|---|---|
| Key id | `release-2026-10` |
| Public key | `packages/backend/src/infrastructure/adapters/secondary/updates/release-signature.ts` |
| Private key | GitHub Actions secret `RM_RELEASE_SIGNING_KEY` |
| Signing script | `scripts/release-sign.mjs` |

The private key is PKCS#8 PEM for an Ed25519 key. It is never committed and is
only read by the release workflow. The workflow sets
`RM_RELEASE_SIGNING_KEY_ID=release-2026-10` and invokes
`node scripts/release-sign.mjs release` after generating the checksums.

The signing script refuses to sign if the private key does not derive the
public key embedded in `release-sign.mjs`. This catches a wrong or stale GitHub
secret before publishing an unusable release.

## Signature format

`SHA256SUMS.sig` is JSON:

```json
{
  "keyId": "release-2026-10",
  "signature": "base64-encoded-ed25519-signature"
}
```

The signature covers the exact bytes of `SHA256SUMS`. The updater parses the
JSON, looks up the key id in its embedded public keys and verifies the
signature. Unknown key ids, malformed payloads and invalid signatures are
rejected.

## Rotation

1. Generate a new Ed25519 pair and add the new public key to
   `RELEASE_SIGNING_KEYS` with a new key id.
2. Publish a transition release containing both public keys, signed with the
   **old** key. Installations on that release can then trust the new key.
3. Set `RM_RELEASE_SIGNING_KEY` to the new private key and update
   `RM_RELEASE_SIGNING_KEY_ID`/the script's expected key.
4. Keep the old public key for at least one full release cycle before removing
   it.

Older installations that never received the transition release will not have
the new public key and may need a manual download. A future version can publish
multiple signatures in one `.sig` file to make rotations seamless.

If the private key is lost or compromised, rotate immediately and publish a
manual-download notice. Never try to reuse a compromised key.

## Scope

- Signed: release checksums and, transitively, every package.
- Not signed: individual assets separately, the app binaries at the OS level or
  the git commit itself.
- The app still verifies the SHA-256 of each package after verifying the
  checksum signature.
