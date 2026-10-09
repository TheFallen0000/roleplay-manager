import type { RequestHandler } from "express"
import { ZodSchema } from "zod"

import { ValidationError } from "./error-handler"

export const validate =
  <T>(schema: ZodSchema<T>, source: "body" | "query" | "params" = "body"): RequestHandler =>
  (req, _res, next) => {
    const data = req[source]
    const result = schema.safeParse(data)
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")
      next(new ValidationError(message))
      return
    }
    // Replace the data in req[source] with the validated result so the
    // controller receives sanitized versions.
    ;(req as unknown as Record<string, unknown>)[source] = result.data
    next()
  }
