import { describe, it, expect } from "vitest"

import { MemoryDecayPolicy, MAX_MEMORIES_DECAYED_PER_SWEEP } from "./memory-decay-policy"

const base = new Date("2026-07-31T12:00:00Z")

describe("MemoryDecayPolicy", () => {
  describe("constructor", () => {
    it("valida el umbral entre 1 y 10", () => {
      expect(() => new MemoryDecayPolicy("silent", 0, 30, 10)).toThrow(
        "threshold must be between 1 and 10",
      )
      expect(() => new MemoryDecayPolicy("silent", 11, 30, 10)).toThrow(
        "threshold must be between 1 and 10",
      )
    })

    it("valida que el umbral de antigüedad sea al menos 1", () => {
      expect(() => new MemoryDecayPolicy("silent", 3, 0, 10)).toThrow(
        "age threshold must be at least 1",
      )
    })

    it("valida que la velocidad de degradación sea al menos 1", () => {
      expect(() => new MemoryDecayPolicy("silent", 3, 30, 0)).toThrow(
        "speed must be at least 1",
      )
    })
  })

  describe("turnsSince", () => {
    const buildMessages = (count: number, role: "user" | "assistant" = "user") =>
      Array.from({ length: count }, (_, i) => ({
        role,
        createdAt: new Date(base.getTime() + (i + 1) * 60_000),
      }))

    it("cuenta solo los mensajes de usuario posteriores al último update de la memoria", () => {
      const policy = new MemoryDecayPolicy("silent", 3, 30, 10)
      const messages = [
        { role: "user", createdAt: new Date(base.getTime() - 60_000) },
        { role: "user", createdAt: new Date(base.getTime() + 60_000) },
        { role: "assistant", createdAt: new Date(base.getTime() + 90_000) },
        { role: "user", createdAt: new Date(base.getTime() + 120_000) },
      ]
      expect(policy.turnsSince(base, messages)).toBe(2)
    })

    it("ignora las respuestas del asistente al contar turnos", () => {
      const policy = new MemoryDecayPolicy("silent", 3, 30, 10)
      expect(policy.turnsSince(base, buildMessages(5, "assistant"))).toBe(0)
    })

    it("devuelve 0 si no hay mensajes de usuario posteriores", () => {
      const policy = new MemoryDecayPolicy("silent", 3, 30, 10)
      expect(policy.turnsSince(base, [])).toBe(0)
      expect(policy.turnsSince(base, buildMessages(1))).toBe(1)
      expect(
        policy.turnsSince(base, [{ role: "user", createdAt: new Date(base.getTime() - 60_000) }]),
      ).toBe(0)
    })
  })

  describe("effectivePriority", () => {
    it("no decae si no han pasado suficientes turnos (decaySpeed 10, 9 turnos)", () => {
      const policy = new MemoryDecayPolicy("silent", 3, 30, 10)
      expect(policy.effectivePriority(5, 9)).toBe(5)
    })

    it("pierde -1 cada `decaySpeed` turnos (decaySpeed 1)", () => {
      const policy = new MemoryDecayPolicy("silent", 3, 30, 1)
      expect(policy.effectivePriority(5, 1)).toBe(4)
      expect(policy.effectivePriority(5, 2)).toBe(3)
    })

    it("usa división entera: 4 turnos con decaySpeed 3 → -1", () => {
      const policy = new MemoryDecayPolicy("silent", 3, 30, 3)
      expect(policy.effectivePriority(5, 3)).toBe(4)
      expect(policy.effectivePriority(5, 4)).toBe(4)
      expect(policy.effectivePriority(5, 6)).toBe(3)
    })

    it("nunca baja de 1", () => {
      const policy = new MemoryDecayPolicy("silent", 3, 30, 1)
      expect(policy.effectivePriority(5, 100)).toBe(1)
      expect(policy.effectivePriority(2, 1)).toBe(1)
    })
  })

  describe("isPromptEligible", () => {
    it("excluye del prompt cuando la prioridad efectiva cae bajo el umbral", () => {
      const policy = new MemoryDecayPolicy("silent", 3, 30, 1)
      expect(policy.isPromptEligible(5, 0)).toBe(true)
      expect(policy.isPromptEligible(5, 1)).toBe(true) // 4 > 3
      expect(policy.isPromptEligible(5, 2)).toBe(false) // 3 <= 3
      expect(policy.isPromptEligible(5, 3)).toBe(false) // 2 <= 3
    })

    it("excluye cuando la prioridad efectiva es igual al umbral", () => {
      const policy = new MemoryDecayPolicy("silent", 3, 30, 1)
      expect(policy.isPromptEligible(3, 0)).toBe(false)
    })
  })

  describe("isDeletionCandidate", () => {
    it("exige prioridad efectiva bajo el umbral Y antigüedad mínima", () => {
      const policy = new MemoryDecayPolicy("silent", 3, 30, 1)
      // Effective priority 1 but only 5 turns → not a candidate.
      expect(policy.isDeletionCandidate(5, 5)).toBe(false)
      // Effective priority 1 and 30 turns → candidate.
      expect(policy.isDeletionCandidate(5, 30)).toBe(true)
      // 30 turns but effective priority 5 → not a candidate.
      const slowPolicy = new MemoryDecayPolicy("silent", 3, 30, 100)
      expect(slowPolicy.isDeletionCandidate(5, 30)).toBe(false)
    })

    it("con ageThreshold 1, una prioridad baja es candidata en el primer turno", () => {
      const policy = new MemoryDecayPolicy("silent", 3, 1, 1)
      expect(policy.isDeletionCandidate(3, 1)).toBe(true)
      expect(policy.isDeletionCandidate(3, 0)).toBe(false)
    })
  })

  it("expone el límite de memorias eliminadas por barrido", () => {
    expect(MAX_MEMORIES_DECAYED_PER_SWEEP).toBe(100)
  })
})
