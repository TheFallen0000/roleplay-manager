import { Router } from "express"
import { z } from "zod"

import {
  IDLE_DISABLE_MINUTES_OPTIONS,
  type PhoneAccessPreferencesUpdateDTO,
} from "@workspace/shared/types/phone-access"

import type { GetPhoneAccessPreferencesUseCase } from "../../../../application/use-cases/phone-access/get-phone-access-preferences.use-case"
import type { UpdatePhoneAccessPreferencesUseCase } from "../../../../application/use-cases/phone-access/update-phone-access-preferences.use-case"
import { validate } from "../middlewares/validation"

const IdleDisableMinutesSchema = z
  .union([z.number(), z.null()])
  .refine(
    (value) =>
      value === null ||
      IDLE_DISABLE_MINUTES_OPTIONS.includes(
        value as (typeof IDLE_DISABLE_MINUTES_OPTIONS)[number],
      ),
    { message: "Unsupported idle timeout" },
  )

const PreferencesBodySchema = z.object({
  mode: z.enum(["tailscale", "lan"]),
  autoEnableOnStart: z.boolean().optional(),
  disableOnClose: z.boolean().optional(),
  idleDisableMinutes: IdleDisableMinutesSchema.optional(),
})

export const buildPhoneAccessRouter = (deps: {
  getPhoneAccessPreferences: GetPhoneAccessPreferencesUseCase
  updatePhoneAccessPreferences: UpdatePhoneAccessPreferencesUseCase
}): Router => {
  const router = Router()

  router.get("/phone-access/preferences", async (_req, res, next) => {
    try {
      res.json(await deps.getPhoneAccessPreferences.execute())
    } catch (error) {
      next(error)
    }
  })

  router.put(
    "/phone-access/preferences",
    validate(PreferencesBodySchema),
    async (req, res, next) => {
      try {
        const { mode, ...patch } = req.body as PhoneAccessPreferencesUpdateDTO
        res.json(await deps.updatePhoneAccessPreferences.execute(mode, patch))
      } catch (error) {
        next(error)
      }
    },
  )

  return router
}
