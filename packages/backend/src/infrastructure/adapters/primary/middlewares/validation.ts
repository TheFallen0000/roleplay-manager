import type { Request, RequestHandler } from "express"
import { ZodSchema } from "zod"

import { ValidationError } from "./error-handler"

/**
 * Express 5 exposes `req.query` as a prototype getter, so a plain assignment
 * throws in strict mode. Defining an own property shadows the getter for the
 * rest of the request and keeps the validated value available to controllers.
 */
const setValidatedData = (
  req: Request,
  source: "body" | "query" | "params",
  data: unknown,
): void => {
  Object.defineProperty(req, source, {
    value: data,
    writable: true,
    configurable: true,
    enumerable: true,
  })
}

export const validate =
  <T>(schema: ZodSchema<T>, source: "body" | "query" | "params" = "body"): RequestHandler =>
  (req, _res, next) => {
    const data = req[source]
    const result = schema.safeParse(data)
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => {
          const path = issue.path.join(".")
          return path ? `${path}: ${issue.message}` : issue.message
        })
        .join("; ")
      next(new ValidationError(message))
      return
    }
    setValidatedData(req, source, result.data)
    next()
  }
