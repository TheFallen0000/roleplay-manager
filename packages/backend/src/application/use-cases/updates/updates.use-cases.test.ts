import { describe, expect, it, vi } from "vitest"

import type { UpdateStatusDTO } from "@workspace/shared/types/update"

import type { UpdateController } from "../../../domain/ports/update-controller"
import { ApplyUpdateUseCase } from "./apply-update.use-case"
import { CheckUpdatesUseCase } from "./check-updates.use-case"
import { CreateBackupUseCase } from "./create-backup.use-case"
import { GetUpdateStatusUseCase } from "./get-update-status.use-case"

const status: UpdateStatusDTO = {
  currentVersion: "1.0.0",
  latestVersion: "2.0.0",
  behind: true,
  commits: ["bbbbbbb feat: something"],
  canApply: true,
  blockedReason: null,
  checkError: null,
  checkedAt: null,
  job: null,
}

const buildController = (): UpdateController => ({
  getStatus: vi.fn(async () => status),
  check: vi.fn(async () => status),
  apply: vi.fn(async () => ({
    ...status,
    job: { running: true, step: "pull" as const, message: null },
  })),
  createBackup: vi.fn(async () => ({ path: "/tmp/backup", files: 2, bytes: 20 })),
})

describe("GetUpdateStatusUseCase", () => {
  it("returns the controller status", async () => {
    const controller = buildController()

    expect(await new GetUpdateStatusUseCase(controller).execute()).toEqual(status)
  })
})

describe("CheckUpdatesUseCase", () => {
  it("refreshes the status", async () => {
    const controller = buildController()

    expect(await new CheckUpdatesUseCase(controller).execute()).toEqual(status)
    expect(controller.check).toHaveBeenCalledTimes(1)
  })
})

describe("ApplyUpdateUseCase", () => {
  it("starts the apply job forwarding the backup flag", async () => {
    const controller = buildController()

    const result = await new ApplyUpdateUseCase(controller).execute({
      withBackup: false,
    })

    expect(controller.apply).toHaveBeenCalledWith({ withBackup: false })
    expect(result.job?.running).toBe(true)
  })
})

describe("CreateBackupUseCase", () => {
  it("creates a backup", async () => {
    const controller = buildController()

    expect(await new CreateBackupUseCase(controller).execute()).toEqual({
      path: "/tmp/backup",
      files: 2,
      bytes: 20,
    })
  })
})
