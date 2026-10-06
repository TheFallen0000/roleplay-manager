import { Router } from "express"
import { z } from "zod"

import type { CreateConversationUseCase } from "../../../../application/use-cases/conversation/create-conversation.use-case"
import type { BranchConversationUseCase } from "../../../../application/use-cases/conversation/branch-conversation.use-case"
import type { GetConversationUseCase } from "../../../../application/use-cases/conversation/get-conversation.use-case"
import type { ListConversationsUseCase } from "../../../../application/use-cases/conversation/list-conversations.use-case"
import type { SendMessageUseCase } from "../../../../application/use-cases/conversation/send-message.use-case"
import type { EditMessageUseCase } from "../../../../application/use-cases/conversation/edit-message.use-case"
import type { DeleteMessageUseCase } from "../../../../application/use-cases/conversation/delete-message.use-case"
import type { RegenerateReplyUseCase } from "../../../../application/use-cases/conversation/regenerate-reply.use-case"
import type { RewindConversationUseCase } from "../../../../application/use-cases/conversation/rewind-conversation.use-case"
import type { ContinueConversationUseCase } from "../../../../application/use-cases/conversation/continue-conversation.use-case"
import type { CycleAlternativeUseCase } from "../../../../application/use-cases/conversation/cycle-alternative.use-case"
import type { ConversationRepository } from "../../../../domain/ports/conversation.repository"
import type { GenerateConversationTitleUseCase } from "../../../../application/use-cases/conversation/generate-conversation-title.use-case"
import type { UpdateConversationSettingsUseCase } from "../../../../application/use-cases/conversation/update-conversation-settings.use-case"
import type { UploadConversationCustomImageUseCase } from "../../../../application/use-cases/conversation/upload-conversation-custom-image.use-case"
import type { Logger } from "../../../../domain/ports/logger.port"
import { validate } from "../middlewares/validation"
import { parseMultipartBody } from "../middlewares/multipart"
import { resolveRequestLocale } from "../request-locale"

const CreateConversationSchema = z.object({
  characterId: z.string().min(1, "characterId is required"),
  versionId: z.string().min(1).optional(),
})

const BranchConversationSchema = z.object({
  targetMessageId: z.string().min(1, "targetMessageId is required"),
})

const SendMessageSchema = z.object({
  content: z.string().min(1, "content is required"),
})

const EditMessageSchema = z.object({
  content: z.string().min(1, "content is required"),
})

const CycleAlternativeSchema = z.object({
  direction: z.enum(["prev", "next"]),
})

const UpdateConversationSettingsSchema = z.object({
  provider: z.enum(["ollama", "openai-compatible"]).optional(),
  providerInstanceId: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  recentMessageCount: z.number().int().min(1).optional(),
  summaryFrequency: z.number().int().min(10).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).optional(),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  stopSequences: z.array(z.string()).optional(),
  memoryProposalMode: z.enum(["auto", "manual"]).optional(),
  customProfileImageAssetId: z.string().nullable().optional(),
  backgroundImageAssetId: z.string().nullable().optional(),
  backgroundFit: z.enum(["cover", "contain"]).optional(),
  backgroundScrim: z.number().int().min(0).max(100).optional(),
  playerCharacterId: z.string().nullable().optional(),
  memoryDecayMode: z.enum(["silent", "manual", "off"]).optional(),
  memoryDecayThreshold: z.number().int().min(1).max(10).optional(),
  memoryDecayAgeThreshold: z.number().int().min(1).optional(),
  memoryDecaySpeed: z.number().int().min(1).optional(),
  force: z.boolean().optional(),
})

export const buildConversationRouter = (deps: {
  logger: Logger
  createConversation: CreateConversationUseCase
  branchConversation: BranchConversationUseCase
  getConversation: GetConversationUseCase
  listConversations: ListConversationsUseCase
  sendMessage: SendMessageUseCase
  editMessage: EditMessageUseCase
  deleteMessage: DeleteMessageUseCase
  regenerateReply: RegenerateReplyUseCase
  rewindConversation: RewindConversationUseCase
  continueConversation: ContinueConversationUseCase
  cycleAlternative: CycleAlternativeUseCase
  updateConversationSettings: UpdateConversationSettingsUseCase
  uploadConversationCustomImage: UploadConversationCustomImageUseCase
  generateConversationTitle: GenerateConversationTitleUseCase
  conversationRepository: ConversationRepository
  maxProfileImageBytes: number
}): Router => {
  const router = Router()

  router.post("/conversations", async (req, res, next) => {
    try {
      const input = CreateConversationSchema.parse(req.body)
      const result = await deps.createConversation.execute(input)
      res.status(201).json(result)
    } catch (error) {
      next(error)
    }
  })

  router.post("/conversations/:id/branches", async (req, res, next) => {
    try {
      const { targetMessageId } = BranchConversationSchema.parse(req.body)
      const result = await deps.branchConversation.execute({
        conversationId: req.params.id,
        targetMessageId,
      })
      res.status(201).json(result)
    } catch (error) {
      next(error)
    }
  })

  router.get("/conversations", async (req, res, next) => {
    try {
      const result = await deps.listConversations.execute()
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.get("/conversations/:id", async (req, res, next) => {
    try {
      const { id } = req.params as { id: string }
      const result = await deps.getConversation.execute(id)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.post("/conversations/:id/messages", async (req, res, next) => {
    let sseStarted = false
    let id: string = ""
    try {
      id = (req.params as { id: string }).id
      const { content } = SendMessageSchema.parse(req.body)

      const generator = deps.sendMessage.execute({
        conversationId: id,
        content,
        locale: resolveRequestLocale(req.header("accept-language")),
      })

      sseStarted = true
      res.setHeader("Content-Type", "text/event-stream")
      res.setHeader("Cache-Control", "no-cache")
      res.setHeader("Connection", "keep-alive")
      res.flushHeaders()

      for await (const event of generator) {
        switch (event.type) {
          case "user-message-saved": {
            res.write(`event: saved\ndata: ${JSON.stringify(event.message)}\n\n`)
            break
          }
          case "chunk": {
            res.write(`event: chunk\ndata: ${JSON.stringify({ content: event.content })}\n\n`)
            break
          }
          case "done": {
            const doneData: Record<string, unknown> = { message: event.message }
            if (event.title) doneData.title = event.title
            if (event.titleSource) doneData.titleSource = event.titleSource
            res.write(`event: done\ndata: ${JSON.stringify(doneData)}\n\n`)
            break
          }
          case "summary-generated": {
            res.write(`event: summary-generated\ndata: ${JSON.stringify(event.summary)}\n\n`)
            break
          }
          case "error": {
            res.write(`event: error\ndata: ${JSON.stringify(event.error)}\n\n`)
            break
          }
        }
      }

      res.end()
    } catch (error) {
      deps.logger.error("Send message SSE error", error as Error, {
        conversationId: id,
      })
      if (sseStarted) {
        res.write(
          `event: error\ndata: ${JSON.stringify({ code: "INTERNAL_ERROR", message: (error as Error).message })}\n\n`,
        )
        res.end()
      } else {
        next(error)
      }
    }
  })

  router.patch(
    "/conversations/:id/messages/:messageId",
    validate(EditMessageSchema),
    async (req, res, next) => {
      try {
        const { id, messageId } = req.params as { id: string; messageId: string }
        const { content } = req.body as z.infer<typeof EditMessageSchema>
        const result = await deps.editMessage.execute({
          conversationId: id,
          messageId,
          content,
        })
        res.json(result)
      } catch (error) {
        next(error)
      }
    },
  )

  router.delete(
    "/conversations/:id/messages/:messageId",
    async (req, res, next) => {
      try {
        const { id, messageId } = req.params as { id: string; messageId: string }
        await deps.deleteMessage.execute({
          conversationId: id,
          messageId,
        })
        res.status(204).end()
      } catch (error) {
        next(error)
      }
    },
  )

  router.post(
    "/conversations/:id/messages/:messageId/regenerate",
    async (req, res, next) => {
      let sseStarted = false
      let id: string = ""
      let messageId: string = ""
      try {
        id = (req.params as { id: string; messageId: string }).id
        messageId = (req.params as { id: string; messageId: string }).messageId
        const generator = deps.regenerateReply.execute({
          conversationId: id,
          messageId,
          locale: resolveRequestLocale(req.header("accept-language")),
        })

        sseStarted = true
        res.setHeader("Content-Type", "text/event-stream")
        res.setHeader("Cache-Control", "no-cache")
        res.setHeader("Connection", "keep-alive")
        res.flushHeaders()

        for await (const event of generator) {
          switch (event.type) {
            case "chunk": {
              res.write(`event: chunk\ndata: ${JSON.stringify({ content: event.content })}\n\n`)
              break
            }
            case "done": {
              res.write(`event: done\ndata: ${JSON.stringify(event.message)}\n\n`)
              break
            }
            case "summary-generated": {
              res.write(`event: summary-generated\ndata: ${JSON.stringify(event.summary)}\n\n`)
              break
            }
            case "error": {
              res.write(`event: error\ndata: ${JSON.stringify(event.error)}\n\n`)
              break
            }
          }
        }

        res.end()
      } catch (error) {
        deps.logger.error("Regenerate SSE error", error as Error, {
          conversationId: id,
          messageId,
        })
        if (sseStarted) {
          res.write(
            `event: error\ndata: ${JSON.stringify({ code: "INTERNAL_ERROR", message: (error as Error).message })}\n\n`,
          )
          res.end()
        } else {
          next(error)
        }
      }
    },
  )

  router.post(
    "/conversations/:id/rewind",
    async (req, res, next) => {
      try {
        const { id } = req.params as { id: string }
        const { targetMessageId } = z
          .object({ targetMessageId: z.string().min(1) })
          .parse(req.body)
        const result = await deps.rewindConversation.execute({
          conversationId: id,
          targetMessageId,
        })
        res.json(result)
      } catch (error) {
        next(error)
      }
    },
  )

  router.post(
    "/conversations/:id/continue",
    async (req, res, next) => {
      let sseStarted = false
      let id: string = ""
      try {
        id = (req.params as { id: string }).id
        const generator = deps.continueConversation.execute({
          conversationId: id,
          locale: resolveRequestLocale(req.header("accept-language")),
        })

        sseStarted = true
        res.setHeader("Content-Type", "text/event-stream")
        res.setHeader("Cache-Control", "no-cache")
        res.setHeader("Connection", "keep-alive")
        res.flushHeaders()

        for await (const event of generator) {
          switch (event.type) {
            case "chunk": {
              res.write(`event: chunk\ndata: ${JSON.stringify({ content: event.content })}\n\n`)
              break
            }
            case "done": {
              res.write(`event: done\ndata: ${JSON.stringify(event.message)}\n\n`)
              break
            }
            case "summary-generated": {
              res.write(`event: summary-generated\ndata: ${JSON.stringify(event.summary)}\n\n`)
              break
            }
            case "error": {
              res.write(`event: error\ndata: ${JSON.stringify(event.error)}\n\n`)
              break
            }
          }
        }

        res.end()
      } catch (error) {
        deps.logger.error("Continue conversation SSE error", error as Error, {
          conversationId: id,
        })
        if (sseStarted) {
          res.write(
            `event: error\ndata: ${JSON.stringify({ code: "INTERNAL_ERROR", message: (error as Error).message })}\n\n`,
          )
          res.end()
        } else {
          next(error)
        }
      }
    },
  )

  router.post(
    "/conversations/:id/messages/:messageId/cycle",
    validate(CycleAlternativeSchema),
    async (req, res, next) => {
      try {
        const { id, messageId } = req.params as { id: string; messageId: string }
        const { direction } = req.body as z.infer<typeof CycleAlternativeSchema>
        const result = await deps.cycleAlternative.execute({
          conversationId: id,
          messageId,
          direction,
        })
        res.json(result)
      } catch (error) {
        next(error)
      }
    },
  )

  router.patch(
    "/conversations/:id/settings",
    validate(UpdateConversationSettingsSchema),
    async (req, res, next) => {
      try {
        const { id } = req.params as { id: string }
        const body = req.body as z.infer<typeof UpdateConversationSettingsSchema>
        const result = await deps.updateConversationSettings.execute(
          id,
          body,
        )
        res.json(result)
      } catch (error) {
        next(error)
      }
    },
  )

  router.post(
    "/conversations/:id/customization/profile-image",
    async (req, res, next) => {
      try {
        const { id } = req.params as { id: string }
        const parsed = await parseMultipartBody(req, deps.maxProfileImageBytes)
        const result = await deps.uploadConversationCustomImage.execute({
          conversationId: id,
          mimeType: parsed.mimeType,
          sizeBytes: parsed.data.length,
          data: parsed.data,
        })
        res.status(201).json(result)
      } catch (error) {
        next(error)
      }
    },
  )

  router.post(
    "/conversations/:id/customization/background",
    async (req, res, next) => {
      try {
        const { id } = req.params as { id: string }
        const parsed = await parseMultipartBody(req, deps.maxProfileImageBytes)
        const result = await deps.uploadConversationCustomImage.execute({
          conversationId: id,
          mimeType: parsed.mimeType,
          sizeBytes: parsed.data.length,
          data: parsed.data,
          usage: "background",
        })
        res.status(201).json(result)
      } catch (error) {
        next(error)
      }
    },
  )

  router.post(
    "/conversations/:id/title",
    async (req, res, next) => {
      try {
        const { id } = req.params as { id: string }
        const { title } = z.object({ title: z.string().optional() }).parse(req.body)

        if (title) {
          const conv = await deps.conversationRepository.findById(id)
          if (!conv) {
            res.status(404).json({ error: "Conversation not found" })
            return
          }
          const updated = conv.withTitle(title, "manual")
          await deps.conversationRepository.update(updated)
          res.json({ title, titleSource: "manual" })
        } else {
          const result = await deps.generateConversationTitle.execute(id)
          res.json({ title: result.title, titleSource: "auto" })
        }
      } catch (error) {
        next(error)
      }
    },
  )

  return router
}
