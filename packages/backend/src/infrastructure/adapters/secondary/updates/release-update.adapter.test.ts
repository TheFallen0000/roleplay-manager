import { existsSync } from "node:fs"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, describe, expect, it, vi } from "vitest"

import type { UpdateStatusDTO } from "@workspace/shared/types/update"

import { UpdateFailedError } from "../../../../domain/errors"
import {
  ReleaseUpdateAdapter,
  type CommandResult,
  type CommandRunner,
  type FetchLike,
} from "./release-update.adapter"

const roots: string[] = []

afterAll(async () => {
  await Promise.all(
    roots.map((root) => rm(root, { recursive: true, force: true })),
  )
})

/** Fresh portable root with version 1.0.0 installed and `current` pointing at it. */
const createRoot = async (
  versionJson: Record<string, unknown> = { repository: "owner/repo" },
): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), "rm-release-"))
  roots.push(root)
  await mkdir(join(root, "versions", "1.0.0", "app"), { recursive: true })
  await writeFile(
    join(root, "versions", "1.0.0", "app", "server.mjs"),
    "// app",
    "utf8",
  )
  await writeFile(join(root, "current"), "1.0.0", "utf8")
  await writeFile(
    join(root, "version.json"),
    JSON.stringify({ version: "1.0.0", ...versionJson }),
    "utf8",
  )
  return root
}

interface ReleaseFixture {
  tag: string
  body?: string | null
  assetName?: string | null
}

const releaseFixture = ({
  tag,
  body = "## Notas\n\n- Algo nuevo",
  assetName = "roleplay-manager-2.0.0-win-x64.zip",
}: ReleaseFixture) => ({
  tag_name: tag,
  body,
  assets:
    assetName === null
      ? []
      : [
          {
            name: assetName,
            browser_download_url: "http://fake/asset.zip",
            size: 3,
          },
        ],
})

const makeFetch = (
  release: unknown,
  bytes = new Uint8Array([1, 2, 3]),
  assetStatus = 200,
): FetchLike =>
  vi.fn(async (input: string) => {
    if (input.includes("/releases/latest")) {
      return new Response(JSON.stringify(release), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }
    return new Response(bytes, {
      status: assetStatus,
      headers: { "content-length": String(bytes.length) },
    })
  })

/** Fakes `tar -x` by materialising the staged package. */
const makeTar = (version: string, onExtract?: () => void): CommandRunner =>
  vi.fn(async (_command: string, args: string[]): Promise<CommandResult> => {
    const staging = args[args.indexOf("-C") + 1]
    onExtract?.()
    await mkdir(join(staging, "versions", version, "app"), { recursive: true })
    await writeFile(
      join(staging, "versions", version, "app", "server.mjs"),
      "// new app",
      "utf8",
    )
    await writeFile(join(staging, "start.cmd"), "@echo off", "utf8")
    return { stdout: "", stderr: "" }
  })

const buildAdapter = (
  root: string,
  options: {
    release?: unknown
    fetchImpl?: FetchLike
    run?: CommandRunner
    repository?: string
    backup?: () => Promise<{ path: string; files: number; bytes: number }>
  } = {},
) =>
  new ReleaseUpdateAdapter({
    packagedRoot: root,
    repository: options.repository ?? "owner/repo",
    fetchImpl:
      options.fetchImpl ??
      makeFetch(options.release ?? releaseFixture({ tag: "v2.0.0" })),
    run: options.run ?? makeTar("2.0.0"),
    backup:
      options.backup ??
      (async () => ({ path: "/tmp/backup", files: 1, bytes: 10 })),
  })

const waitForJob = async (
  adapter: ReleaseUpdateAdapter,
): Promise<UpdateStatusDTO> => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const status = await adapter.getStatus()
    if (status.job && !status.job.running) return status
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error("job did not finish")
}

describe("ReleaseUpdateAdapter", () => {
  it("detects a newer release with its notes", async () => {
    const status = await buildAdapter(await createRoot()).check()

    expect(status.currentVersion).toBe("1.0.0")
    expect(status.latestVersion).toBe("2.0.0")
    expect(status.behind).toBe(true)
    expect(status.notes).toContain("Algo nuevo")
    expect(status.canApply).toBe(true)
    expect(status.blockedReason).toBeNull()
    expect(status.checkError).toBeNull()
    expect(status.checkedAt).not.toBeNull()
  })

  it("reports up to date with the same version", async () => {
    const status = await buildAdapter(await createRoot(), {
      release: releaseFixture({ tag: "v1.0.0" }),
    }).check()

    expect(status.behind).toBe(false)
    expect(status.canApply).toBe(false)
  })

  it("never offers an older release as an update", async () => {
    const status = await buildAdapter(await createRoot(), {
      release: releaseFixture({ tag: "v0.9.0" }),
    }).check()

    expect(status.latestVersion).toBe("0.9.0")
    expect(status.behind).toBe(false)
  })

  it("blocks when the release has no asset for the platform", async () => {
    const status = await buildAdapter(await createRoot(), {
      release: releaseFixture({
        tag: "v2.0.0",
        assetName: "roleplay-manager-2.0.0-linux-x64.zip",
      }),
    }).check()

    expect(status.behind).toBe(true)
    expect(status.canApply).toBe(false)
    expect(status.blockedReason).toBe("no-asset")
  })

  it("surfaces an API failure as checkError", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => new Response("", { status: 403 }))
    const status = await buildAdapter(await createRoot(), { fetchImpl }).check()

    expect(status.checkError).toContain("403")
    expect(status.canApply).toBe(false)
  })

  it("applies the update: backup, download, install and current pointer", async () => {
    const root = await createRoot()
    const backup = vi.fn(async () => ({ path: "/tmp/b", files: 1, bytes: 1 }))
    const adapter = buildAdapter(root, { backup })

    const started = await adapter.apply({ withBackup: true })
    expect(started.job).toMatchObject({ running: true, step: "backup" })

    const finished = await waitForJob(adapter)

    expect(finished.job).toMatchObject({ running: false, step: "done" })
    expect(backup).toHaveBeenCalledTimes(1)
    expect(
      existsSync(join(root, "versions", "2.0.0", "app", "server.mjs")),
    ).toBe(true)
    // The running version stays on disk (rollback) and the pointer moved.
    expect(existsSync(join(root, "versions", "1.0.0", "app"))).toBe(true)
    expect((await readFile(join(root, "current"), "utf8")).trim()).toBe("2.0.0")
    expect(existsSync(join(root, "versions", ".download-2.0.0.zip"))).toBe(false)
    // The status was refreshed after installing.
    expect(finished.behind).toBe(false)
  })

  it("marks the job as failed when the download fails", async () => {
    const root = await createRoot()
    const adapter = buildAdapter(root, {
      fetchImpl: makeFetch(releaseFixture({ tag: "v2.0.0" }), new Uint8Array(), 500),
    })

    await adapter.apply({ withBackup: false })
    const finished = await waitForJob(adapter)

    expect(finished.job).toMatchObject({ running: false, step: "failed" })
    expect(finished.job?.message).toContain("500")
  })

  it("resolves the repository from version.json when not configured", async () => {
    const adapter = new ReleaseUpdateAdapter({
      packagedRoot: await createRoot({ repository: "other/repo" }),
      fetchImpl: makeFetch(releaseFixture({ tag: "v2.0.0" })),
      run: makeTar("2.0.0"),
    })

    const status = await adapter.check()
    expect(status.behind).toBe(true)
    expect(status.checkError).toBeNull()
  })

  it("reports a check error when no repository can be resolved", async () => {
    const adapter = new ReleaseUpdateAdapter({
      packagedRoot: await createRoot({}),
      fetchImpl: makeFetch(releaseFixture({ tag: "v2.0.0" })),
      run: makeTar("2.0.0"),
    })

    const status = await adapter.check()
    expect(status.checkError).toContain("repository")
  })

  it("refuses to apply without updates or without an asset", async () => {
    const upToDate = buildAdapter(await createRoot(), {
      release: releaseFixture({ tag: "v1.0.0" }),
    })
    await upToDate.check()
    await expect(upToDate.apply({ withBackup: true })).rejects.toThrow(
      UpdateFailedError,
    )

    const noAsset = buildAdapter(await createRoot(), {
      release: releaseFixture({ tag: "v2.0.0", assetName: null }),
    })
    await noAsset.check()
    await expect(noAsset.apply({ withBackup: true })).rejects.toThrow(
      UpdateFailedError,
    )
  })

  it("delegates backups and fails when none is configured", async () => {
    const adapter = buildAdapter(await createRoot())
    await expect(adapter.createBackup()).resolves.toEqual({
      path: "/tmp/backup",
      files: 1,
      bytes: 10,
    })

    const withoutBackup = new ReleaseUpdateAdapter({
      packagedRoot: await createRoot(),
      repository: "owner/repo",
      fetchImpl: makeFetch(releaseFixture({ tag: "v2.0.0" })),
      run: makeTar("2.0.0"),
    })
    await expect(withoutBackup.createBackup()).rejects.toThrow(UpdateFailedError)
  })
})
