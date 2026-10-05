import { describe, it, expect } from "vitest"

import { CharacterVersion } from "../../../../domain/entities/character-version.entity"
import { CharacterCard } from "../../../../domain/entities/character-card.entity"
import { Message } from "../../../../domain/entities/message.entity"
import { PromptContextBuilderImpl } from "./prompt-context-builder.impl"

const now = new Date()

const baseVersionProps = {
  id: "ver-1",
  characterId: "char-1",
  name: "Test Character",
  subtitle: null as string | null,
  profileImageAssetId: null,
  description: "A mysterious character.",
  instructions: null as string | null,
  greeting: "Hello!",
  versionNumber: 1,
  createdAt: now,
  cards: [] as CharacterCard[],
}

const baseVersion = CharacterVersion.create(baseVersionProps)

const card1 = CharacterCard.create({
  id: "card-1",
  versionId: "ver-1",
  title: "Historia",
  content: "Vivio en las montañas.",
  position: 0,
  active: true,
})

const card2 = CharacterCard.create({
  id: "card-2",
  versionId: "ver-1",
  title: "Personalidad",
  content: "Es reservado pero amable.",
  position: 1,
  active: true,
})

const inactiveCard = CharacterCard.create({
  id: "card-3",
  versionId: "ver-1",
  title: "Secreto",
  content: "No se debe revelar.",
  position: 2,
  active: false,
})

const createMessage = (role: "user" | "assistant", content: string, position: number) =>
  Message.create({
    id: `msg-${position}`,
    conversationId: "conv-1",
    role,
    content,
    position,
    alternatives: [],
    alternativesCursor: 0,
    createdAt: now,
    editedAt: null,
  })

const cloneVersionProps = (overrides: Partial<typeof baseVersionProps>): typeof baseVersionProps =>
  ({ ...baseVersionProps, ...overrides })

describe("PromptContextBuilderImpl", () => {
  it("construye systemPrompt con nombre y descripcion", async () => {
    const builder = new PromptContextBuilderImpl()
    const result = await builder.build({
      characterVersion: baseVersion,
      messages: [],
      recentMessageCount: 10,
    })

    expect(result.systemPrompt).toContain("Eres Test Character.")
    expect(result.systemPrompt).toContain("A mysterious character.")
    expect(result.messages).toHaveLength(0)
  })

  it("incluye instrucciones cuando existen", async () => {
    const version = CharacterVersion.create(
      cloneVersionProps({ id: "ver-2", instructions: "Responde en español." }),
    )

    const builder = new PromptContextBuilderImpl()
    const result = await builder.build({
      characterVersion: version,
      messages: [],
      recentMessageCount: 10,
    })

    expect(result.systemPrompt).toContain("Responde en español.")
  })

  it("incluye tarjetas activas en systemPrompt", async () => {
    const version = CharacterVersion.create(
      cloneVersionProps({ id: "ver-3", cards: [card1, card2, inactiveCard] }),
    )

    const builder = new PromptContextBuilderImpl()
    const result = await builder.build({
      characterVersion: version,
      messages: [],
      recentMessageCount: 10,
    })

    expect(result.systemPrompt).toContain("[Historia]")
    expect(result.systemPrompt).toContain("[Personalidad]")
    expect(result.systemPrompt).not.toContain("[Secreto]")
  })

  it("incluye solo los ultimos recentMessageCount mensajes", async () => {
    const messages = [
      createMessage("user", "Mensaje 1", 0),
      createMessage("assistant", "Respuesta 1", 1),
      createMessage("user", "Mensaje 2", 2),
      createMessage("assistant", "Respuesta 2", 3),
      createMessage("user", "Mensaje 3", 4),
    ]

    const builder = new PromptContextBuilderImpl()
    const result = await builder.build({
      characterVersion: baseVersion,
      messages,
      recentMessageCount: 2,
    })

    expect(result.messages).toHaveLength(2)
    expect(result.messages[0].content).toBe("Respuesta 2")
    expect(result.messages[1].content).toBe("Mensaje 3")
  })

  it("incluye subtitle cuando existe", async () => {
    const version = CharacterVersion.create(
      cloneVersionProps({ id: "ver-4", subtitle: "El guardián del bosque" }),
    )

    const builder = new PromptContextBuilderImpl()
    const result = await builder.build({
      characterVersion: version,
      messages: [],
      recentMessageCount: 10,
    })

    expect(result.systemPrompt).toContain("El guardián del bosque")
  })

  it("incluye greeting como ejemplo de estilo", async () => {
    const version = CharacterVersion.create(
      cloneVersionProps({ id: "ver-5", greeting: "¡Bienvenido, forastero!" }),
    )

    const builder = new PromptContextBuilderImpl()
    const result = await builder.build({
      characterVersion: version,
      messages: [],
      recentMessageCount: 10,
    })

    expect(result.systemPrompt).toContain("¡Bienvenido, forastero!")
    expect(result.systemPrompt).toContain("Ejemplo del estilo")
  })

  it("incluye seccion de Estilo de respuesta", async () => {
    const builder = new PromptContextBuilderImpl()
    const result = await builder.build({
      characterVersion: baseVersion,
      messages: [],
      recentMessageCount: 10,
    })

    expect(result.systemPrompt).toContain("## Estilo de respuesta")
    expect(result.systemPrompt).toContain("tono y estilo de Test Character")
  })

  it("asigna roles correctamente a los mensajes", async () => {
    const messages = [
      createMessage("user", "Hola", 0),
      createMessage("assistant", "Adios", 1),
    ]

    const builder = new PromptContextBuilderImpl()
    const result = await builder.build({
      characterVersion: baseVersion,
      messages,
      recentMessageCount: 10,
    })

    expect(result.messages[0].role).toBe("user")
    expect(result.messages[0].content).toBe("Hola")
    expect(result.messages[1].role).toBe("assistant")
    expect(result.messages[1].content).toBe("Adios")
  })

  it("incluye seccion de propuestas de memoria por default (enableMemoryProposalTool=false)", async () => {
    const builder = new PromptContextBuilderImpl()
    const result = await builder.build({
      characterVersion: baseVersion,
      messages: [],
      recentMessageCount: 10,
    })

    expect(result.systemPrompt).toContain("Propuestas de modificación de memoria")
    expect(result.systemPrompt).toContain("```memory_proposals")
  })

  it("omite las instrucciones completas cuando enableMemoryProposalTool=true pero incluye hint compacto", async () => {
    const builder = new PromptContextBuilderImpl()
    const result = await builder.build({
      characterVersion: baseVersion,
      messages: [],
      recentMessageCount: 10,
      enableMemoryProposalTool: true,
    })

    expect(result.systemPrompt).not.toContain("Propuestas de modificación de memoria")
    expect(result.systemPrompt).toContain("Propuestas de memoria (alternativa)")
    expect(result.systemPrompt).toContain("propose_memory_changes")
    expect(result.systemPrompt).toContain("```memory_proposals")
  })

  it("filtra OOC de mensajes del usuario previos al ultimo cuando filterOocFromHistory=true", async () => {
    const builder = new PromptContextBuilderImpl()
    const result = await builder.build({
      characterVersion: baseVersion,
      messages: [
        createMessage("user", "Hola //primera instruccion//", 0),
        createMessage("assistant", "Respuesta", 1),
        createMessage("user", "*Salgo.* //Crea memorias//", 2),
      ],
      recentMessageCount: 10,
      filterOocFromHistory: true,
    })

    expect(result.messages[0].content).toBe("Hola")
    expect(result.messages[0].content).not.toContain("primera instruccion")
    expect(result.messages[1].content).toBe("Respuesta")
    expect(result.messages[2].content).toBe("*Salgo.* //Crea memorias//")
    expect(result.messages[2].content).toContain("Crea memorias")
  })

  it("preserva el OOC del ultimo mensaje del usuario intacto", async () => {
    const builder = new PromptContextBuilderImpl()
    const result = await builder.build({
      characterVersion: baseVersion,
      messages: [
        createMessage("user", "Mensaje viejo //instruccion vieja//", 0),
        createMessage("assistant", "OK", 1),
        createMessage("user", "Mensaje nuevo //instruccion nueva//", 2),
      ],
      recentMessageCount: 10,
      filterOocFromHistory: true,
    })

    const lastUser = result.messages[result.messages.length - 1]
    expect(lastUser.content).toBe("Mensaje nuevo //instruccion nueva//")
  })

  it("incluye salvaguarda OOC en el systemPrompt cuando filterOocFromHistory=true", async () => {
    const builder = new PromptContextBuilderImpl()
    const result = await builder.build({
      characterVersion: baseVersion,
      messages: [],
      recentMessageCount: 10,
      filterOocFromHistory: true,
    })

    expect(result.systemPrompt).toContain("Meta-instrucciones del usuario (OOC)")
    expect(result.systemPrompt).toContain("//...//")
  })

  it("no incluye salvaguarda OOC por default", async () => {
    const builder = new PromptContextBuilderImpl()
    const result = await builder.build({
      characterVersion: baseVersion,
      messages: [],
      recentMessageCount: 10,
    })

    expect(result.systemPrompt).not.toContain("Meta-instrucciones del usuario (OOC)")
  })

  it("no filtra OOC de mensajes del assistant", async () => {
    const builder = new PromptContextBuilderImpl()
    const result = await builder.build({
      characterVersion: baseVersion,
      messages: [
        createMessage("user", "Hola //meta//", 0),
        createMessage("assistant", "Respuesta //mi propia nota//", 1),
      ],
      recentMessageCount: 10,
      filterOocFromHistory: true,
    })

    expect(result.messages[1].content).toBe("Respuesta //mi propia nota//")
  })

  it("incluye el personaje del usuario cuando se pasa", async () => {
    const builder = new PromptContextBuilderImpl()
    const result = await builder.build({
      characterVersion: baseVersion,
      messages: [],
      recentMessageCount: 10,
      playerCharacter: {
        name: "Alice",
        description: "Una exploradora curiosa.",
      },
    })

    expect(result.systemPrompt).toContain("## Personaje del usuario")
    expect(result.systemPrompt).toContain(
      "El usuario interpreta a Alice. Una exploradora curiosa.",
    )
  })

  it("omite la sección de personaje del usuario cuando no se pasa", async () => {
    const builder = new PromptContextBuilderImpl()
    const result = await builder.build({
      characterVersion: baseVersion,
      messages: [],
      recentMessageCount: 10,
    })

    expect(result.systemPrompt).not.toContain("## Personaje del usuario")
  })
})
