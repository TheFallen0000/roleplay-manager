import { parseOoc } from "@workspace/shared/lib/ooc-parser"

import type { CharacterVersion } from "../../../../domain/entities/character-version.entity"
import type { Message } from "../../../../domain/entities/message.entity"
import type { Memory } from "../../../../domain/entities/memory.entity"
import type { Summary } from "../../../../domain/entities/summary.entity"
import type { PromptContextBuilder } from "../../../../domain/ports/prompt-context-builder"
import type { PromptContext } from "../../../../domain/value-objects/prompt-context"

export class PromptContextBuilderImpl implements PromptContextBuilder {
  async build(params: {
    characterVersion: CharacterVersion
    messages: Message[]
    recentMessageCount: number
    memories?: Memory[]
    summary?: Summary
    playerCharacter?: { name: string; description: string }
    enableMemoryProposalTool?: boolean
    filterOocFromHistory?: boolean
  }): Promise<PromptContext> {
    const {
      characterVersion: cv,
      messages,
      recentMessageCount,
      memories,
      summary,
      playerCharacter,
      enableMemoryProposalTool = false,
      filterOocFromHistory = false,
    } = params

    const systemParts: string[] = [
      `Eres ${cv.name}. ${cv.description}`,
      "",

      `## Personalidad`,
      `Nombre: ${cv.name}`,
    ]

    if (cv.subtitle) {
      systemParts.push(`Subtítulo: ${cv.subtitle}`)
    }

    if (cv.instructions) {
      systemParts.push("")
      systemParts.push(`## Instrucciones`)
      systemParts.push(cv.instructions)
    }

    const activeCards = cv.cards
      .filter((c) => c.active)
      .sort((a, b) => a.position - b.position)

    if (activeCards.length > 0) {
      systemParts.push("")
      systemParts.push("## Conocimiento")
      systemParts.push(
        "Las siguientes fichas están ordenadas por importancia (la primera es la más relevante). Úsalas para guiar tus respuestas según el contexto."
      )
      for (const card of activeCards) {
        systemParts.push(`[${card.title}]: ${card.content}`)
      }
    }

    if (playerCharacter) {
      systemParts.push("")
      systemParts.push("## Personaje del usuario")
      systemParts.push(
        `El usuario interpreta a ${playerCharacter.name}. ${playerCharacter.description}`,
      )
    }

    if (memories && memories.length > 0) {
      systemParts.push("")
      systemParts.push("## Memoria dinámica")
      systemParts.push(
        "Los siguientes hechos sobre la historia o los personajes se han almacenado previamente. Úsalos para mantener coherencia.",
      )
      for (const mem of memories) {
        systemParts.push(`- [${mem.id}] ${mem.actor} → ${mem.title}: ${mem.description} (prioridad ${mem.priority})`)
      }
    }

    if (summary) {
      systemParts.push("")
      systemParts.push("## Resumen de la conversación")
      systemParts.push(summary.content)
    }

    if (!enableMemoryProposalTool) {
      systemParts.push("")
      systemParts.push("## Propuestas de modificación de memoria")
      systemParts.push(
        "Si en tu respuesta introduces hechos nuevos relevantes o modificas algunos existentes, puedes proponer cambios sobre la memoria dinámica al final de tu mensaje. Usa este formato exacto:",
      )
      systemParts.push("")
      systemParts.push('```memory_proposals')
      systemParts.push('[')
      systemParts.push('  { "operation": "CREATE", "actor": "...", "title": "...", "description": "...", "priority": 5 }')
      systemParts.push(']')
      systemParts.push('```')
      systemParts.push("")
      systemParts.push("Operaciones válidas: CREATE, UPDATE, DELETE. Para UPDATE o DELETE debes incluir el id de la memoria existente como \"targetMemoryId\". Si no hay cambios que proponer, no incluyas el bloque.")
    } else {
      systemParts.push("")
      systemParts.push("## Propuestas de memoria (alternativa)")
      systemParts.push(
        "Si no puedes llamar a la herramienta `propose_memory_changes`, también puedes proponer cambios sobre la memoria dinámica al final de tu mensaje usando este formato:",
      )
      systemParts.push("")
      systemParts.push('```memory_proposals')
      systemParts.push('[ { "operation": "CREATE", "actor": "...", "title": "...", "description": "...", "priority": 5 } ]')
      systemParts.push('```')
      systemParts.push("")
      systemParts.push('Operaciones válidas: CREATE, UPDATE, DELETE. Para UPDATE o DELETE debes incluir el id de la memoria existente como "targetMemoryId".')
    }

    systemParts.push("")
    systemParts.push(`## Estilo de respuesta`)
    systemParts.push(
      `Debes responder siempre en el tono y estilo de ${cv.name}, manteniendo la personalidad descrita arriba. Escribe de forma narrativa y detallada, como si estuvieras interpretando al personaje en una historia.`
    )
    systemParts.push("")
    systemParts.push(`Ejemplo del estilo de ${cv.name}:`)
    systemParts.push(`"${cv.greeting}"`)

    if (filterOocFromHistory) {
      systemParts.push("")
      systemParts.push(`## Meta-instrucciones del usuario (OOC)`)
      systemParts.push(
        "El usuario puede incluir meta-instrucciones entre `//...//` (out-of-character) en sus mensajes, normalmente al final. Estas son instrucciones para ti, no parte del roleplay.",
      )
      systemParts.push(
        "- Cuando el último mensaje del usuario contenga una meta-instrucción, ejecútala (por ejemplo, `//crea memorias con lo que sabes//` significa que debes llamar a la herramienta `propose_memory_changes`).",
      )
      systemParts.push(
        "- No respondas a las meta-instrucciones en personaje: no narres que el personaje 'asintió' o 'leyó la nota'. Ejecuta la instrucción silenciosamente y, si tiene sentido narrativo, continúa el roleplay después.",
      )
      systemParts.push(
        "- Las meta-instrucciones de mensajes anteriores ya fueron filtradas; solo verás OOC en el último mensaje del usuario.",
      )
    }

    const systemPrompt = systemParts.join("\n")

    const recentMessages = messages.slice(-recentMessageCount)
    const lastUserIdx = filterOocFromHistory
      ? recentMessages.map((m) => m.role).lastIndexOf("user")
      : -1

    const contextMessages = recentMessages.map((m, idx) => {
      if (filterOocFromHistory && m.role === "user" && idx !== lastUserIdx) {
        return {
          role: "user" as const,
          content: parseOoc(m.content).cleanedContent,
        }
      }
      return {
        role: m.role as "user" | "assistant",
        content: m.content,
      }
    })

    return {
      systemPrompt,
      messages: contextMessages,
    }
  }
}
