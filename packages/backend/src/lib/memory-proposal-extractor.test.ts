import { describe, it, expect } from "vitest"
import { extractProposals, createCleanStream } from "./memory-proposal-extractor"

const SIMPLE_BLOCK =
  "```memory_proposals\n" +
  '[\n  { "operation": "CREATE", "actor": "Alice", "title": "test", "description": "desc", "priority": 5 }\n]\n' +
  "```"

const MULTI_BLOCK =
  "```memory_proposals\n" +
  '[\n' +
  '  { "operation": "CREATE", "actor": "Alice", "title": "t1", "description": "d1", "priority": 1 },\n' +
  '  { "operation": "UPDATE", "targetMemoryId": "mem-1", "actor": "Bob", "title": "t2", "description": "d2" },\n' +
  '  { "operation": "DELETE", "targetMemoryId": "mem-2", "actor": "Eve", "title": "t3", "description": "d3" }\n' +
  "]\n" +
  "```"

describe("extractProposals", () => {
  it("devuelve array vacio si no hay bloque", () => {
    const result = extractProposals("Hola mundo, esto es una respuesta normal.")
    expect(result.foundBlock).toBe(false)
    expect(result.proposals).toEqual([])
    expect(result.cleanedContent).toBe("Hola mundo, esto es una respuesta normal.")
  })

  it("extrae una propuesta simple al final del texto", () => {
    const text = "Hola Alice!\n\n" + SIMPLE_BLOCK
    const result = extractProposals(text)
    expect(result.foundBlock).toBe(true)
    expect(result.proposals).toHaveLength(1)
    expect(result.proposals[0].operation).toBe("CREATE")
    expect(result.proposals[0].actor).toBe("Alice")
    expect(result.proposals[0].title).toBe("test")
    expect(result.proposals[0].description).toBe("desc")
    expect(result.proposals[0].priority).toBe(5)
    expect(result.cleanedContent).not.toContain("memory_proposals")
    expect(result.cleanedContent).toBe("Hola Alice!")
  })

  it("extrae propuestas en medio del texto", () => {
    const text = "Texto antes.\n\n" + SIMPLE_BLOCK + "\n\nTexto despues."
    const result = extractProposals(text)
    expect(result.foundBlock).toBe(true)
    expect(result.proposals).toHaveLength(1)
    expect(result.cleanedContent).toBe("Texto antes.\n\n\n\nTexto despues.")
  })

  it("extrae multiples propuestas (CREATE, UPDATE, DELETE)", () => {
    const text = "Resumen:\n\n" + MULTI_BLOCK + "\n\nFin"
    const result = extractProposals(text)
    expect(result.foundBlock).toBe(true)
    expect(result.proposals).toHaveLength(3)

    expect(result.proposals[0].operation).toBe("CREATE")
    expect(result.proposals[0].targetMemoryId).toBeUndefined()

    expect(result.proposals[1].operation).toBe("UPDATE")
    expect(result.proposals[1].targetMemoryId).toBe("mem-1")

    expect(result.proposals[2].operation).toBe("DELETE")
    expect(result.proposals[2].targetMemoryId).toBe("mem-2")
  })

  it("retorna foundBlock=true y proposals=[] si el JSON es malformado", () => {
    const text = "```memory_proposals\n{ esto no es json valido }\n```"
    const result = extractProposals(text)
    expect(result.foundBlock).toBe(true)
    expect(result.proposals).toEqual([])
    expect(result.cleanedContent).not.toContain("memory_proposals")
  })

  it("retorna proposals=[] si el bloque no es un array", () => {
    const text = "```memory_proposals\n{ \"operation\": \"CREATE\" }\n```"
    const result = extractProposals(text)
    expect(result.foundBlock).toBe(true)
    expect(result.proposals).toEqual([])
  })

  it("retorna proposals=[] si el bloque es un array vacio", () => {
    const text = "```memory_proposals\n[]\n```"
    const result = extractProposals(text)
    expect(result.foundBlock).toBe(true)
    expect(result.proposals).toEqual([])
  })

  it("filtra operaciones invalidas y mantiene las validas", () => {
    const text =
      "```memory_proposals\n" +
      '[\n' +
      '  { "operation": "CREATE", "actor": "Alice", "title": "t", "description": "d" },\n' +
      '  { "operation": "INVALID", "actor": "Bob", "title": "t", "description": "d" },\n' +
      '  { "operation": "DELETE", "actor": "Eve", "title": "t", "description": "d", "targetMemoryId": "m1" }\n' +
      "]\n" +
      "```"
    const result = extractProposals(text)
    expect(result.proposals).toHaveLength(2)
    expect(result.proposals[0].operation).toBe("CREATE")
    expect(result.proposals[1].operation).toBe("DELETE")
  })

  it("usa undefined como priority si no se especifica", () => {
    const text =
      "```memory_proposals\n" +
      '[\n  { "operation": "CREATE", "actor": "X", "title": "y", "description": "z" }\n]\n' +
      "```"
    const result = extractProposals(text)
    expect(result.proposals[0].priority).toBeUndefined()
  })

  it("usa undefined como priority si priority no es numero", () => {
    const text =
      "```memory_proposals\n" +
      '[\n  { "operation": "CREATE", "actor": "X", "title": "y", "description": "z", "priority": "alta" }\n]\n' +
      "```"
    const result = extractProposals(text)
    expect(result.proposals[0].priority).toBeUndefined()
  })

  it("tolera espacios extra alrededor del bloque", () => {
    const text = "Hola\n\n  " + SIMPLE_BLOCK + "  \n\nChau"
    const result = extractProposals(text)
    expect(result.foundBlock).toBe(true)
    expect(result.proposals).toHaveLength(1)
    expect(result.cleanedContent).toBe("Hola\n\n    \n\nChau")
  })

  it("tolera texto vacio", () => {
    const result = extractProposals("")
    expect(result.foundBlock).toBe(false)
    expect(result.proposals).toEqual([])
    expect(result.cleanedContent).toBe("")
  })

  it("tolera solo el bloque sin texto alrededor", () => {
    const result = extractProposals(SIMPLE_BLOCK)
    expect(result.foundBlock).toBe(true)
    expect(result.proposals).toHaveLength(1)
    expect(result.cleanedContent).toBe("")
  })

  it("detecta la etiqueta con mayúsculas o separadores distintos", () => {
    const upper = extractProposals(
      "Hola.\n\n```MEMORY_PROPOSALS\n" +
        '[ { "operation": "CREATE", "actor": "A", "title": "t", "description": "d" } ]\n```',
    )
    expect(upper.foundBlock).toBe(true)
    expect(upper.proposals).toHaveLength(1)
    expect(upper.cleanedContent).toBe("Hola.")

    const hyphen = extractProposals("```memory-proposals\n[]\n```")
    expect(hyphen.foundBlock).toBe(true)
    expect(hyphen.proposals).toEqual([])
  })

  it("recupera un bloque sin cerrar (respuesta cortada)", () => {
    const result = extractProposals(
      "Texto.\n\n```memory_proposals\n" +
        '[ { "operation": "CREATE", "actor": "A", "title": "t", "description": "d" } ]',
    )

    expect(result.foundBlock).toBe(true)
    expect(result.proposals).toHaveLength(1)
    expect(result.cleanedContent).toBe("Texto.")
  })

  it("tolera las reparaciones seguras de JSON", () => {
    const trailing = extractProposals(
      "```memory_proposals\n" +
        '[\n  { "operation": "CREATE", "actor": "A", "title": "t", "description": "d" },\n]\n' +
        "```",
    )
    expect(trailing.proposals).toHaveLength(1)

    const prose = extractProposals(
      "```memory_proposals\n" +
        'Aquí van las propuestas:\n[ { "operation": "CREATE", "actor": "A", "title": "t", "description": "d" } ]\nEspero que sirva.\n' +
        "```",
    )
    expect(prose.proposals).toHaveLength(1)

    const wrapped = extractProposals(
      "```memory_proposals\n" +
        '{ "proposals": [ { "operation": "CREATE", "actor": "A", "title": "t", "description": "d" } ] }\n' +
        "```",
    )
    expect(wrapped.proposals).toHaveLength(1)
  })

  it("normaliza operación, prioridad y espacios", () => {
    const result = extractProposals(
      "```memory_proposals\n" +
        '[ { "operation": " create ", "actor": " A ", "title": " t ", "description": " d ", "priority": "7" } ]\n' +
        "```",
    )

    expect(result.proposals).toEqual([
      {
        operation: "CREATE",
        targetMemoryId: undefined,
        actor: "A",
        title: "t",
        description: "d",
        priority: 7,
      },
    ])
  })

  it("limpia y extrae varios bloques", () => {
    const result = extractProposals(
      "Uno.\n\n" + SIMPLE_BLOCK + "\n\nDos.\n\n" + MULTI_BLOCK + "\n\nFin.",
    )

    expect(result.foundBlock).toBe(true)
    expect(result.proposals).toHaveLength(4)
    expect(result.cleanedContent).not.toContain("memory_proposals")
    expect(result.cleanedContent).toContain("Uno.")
    expect(result.cleanedContent).toContain("Dos.")
    expect(result.cleanedContent).toContain("Fin.")
  })
})

function makeStream(chunks: string[]): AsyncIterable<{ content: string }> {
  return {
    [Symbol.asyncIterator]: () => {
      let i = 0
      return {
        next: async () => {
          if (i < chunks.length) {
            return { value: { content: chunks[i++] }, done: false } as const
          }
          return { value: undefined, done: true } as const
        },
      }
    },
  }
}

async function collectFromStream(
  chunks: string[],
): Promise<{ yielded: string[]; fullContent: string }> {
  const state = { fullContent: "" }
  const yielded: string[] = []
  const stream = createCleanStream(makeStream(chunks), state)
  for await (const chunk of stream) {
    yielded.push(chunk.content)
  }
  return { yielded, fullContent: state.fullContent }
}

describe("createCleanStream", () => {
  it("pasa los chunks sin modificacion si no hay bloque", async () => {
    const { yielded, fullContent } = await collectFromStream([
      "Hola ",
      "mundo ",
      "esto es un test",
    ])
    expect(yielded).toEqual(["Hola ", "mundo ", "esto es un test"])
    expect(fullContent).toBe("Hola mundo esto es un test")
  })

  it("filtra un bloque completo en un solo chunk", async () => {
    const { yielded, fullContent } = await collectFromStream([
      "Texto antes.\n\n",
      SIMPLE_BLOCK,
      "\n\nTexto despues.",
    ])
    expect(yielded).toEqual(["Texto antes.\n\n", "\n\nTexto despues."])
    expect(fullContent).toContain("memory_proposals")
  })

  it("filtra un bloque partido en chunks", async () => {
    const { yielded, fullContent } = await collectFromStream([
      "Antes.\n\n",
      "```memory_proposals\n",
      '[\n  { "operation": "CREATE", "actor": "A", "title": "t", "description": "d" }\n]\n',
      "```\n\n",
      "Despues.",
    ])
    expect(yielded).toEqual(["Antes.\n\n", "\n\n", "Despues."])
    expect(fullContent).toContain("memory_proposals")
  })

  it("filtra bloque que empieza en medio de un chunk", async () => {
    const { yielded, fullContent } = await collectFromStream([
      "Hola. ",
      "Chau. ```memory_proposals\n",
      "[]\n```\n\n",
      "Fin.",
    ])
    expect(yielded).toEqual(["Hola. ", "Chau. ", "\n\n", "Fin."])
    expect(fullContent).toContain("memory_proposals")
  })

  it("no yield nada si el bloque ocupa todo el stream", async () => {
    const { yielded, fullContent } = await collectFromStream([SIMPLE_BLOCK])
    expect(yielded).toEqual([])
    expect(fullContent).toContain("memory_proposals")
  })

  it("solo yield texto antes del bloque si este nunca se cierra", async () => {
    const { yielded, fullContent } = await collectFromStream([
      "Antes.\n\n",
      "```memory_proposals\n",
      '{"incompleto": true}\n',
    ])
    expect(yielded).toEqual(["Antes.\n\n"])
    expect(fullContent).toContain("memory_proposals")
    expect(fullContent).toContain("incompleto")
  })

  it("oculta un bloque con la etiqueta en mayúsculas", async () => {
    const { yielded } = await collectFromStream([
      "Antes.\n\n",
      "```MEMORY_PROPOSALS\n[]\n```",
      "\n\nDespues.",
    ])

    expect(yielded.join("")).toBe("Antes.\n\n\n\nDespues.")
  })

  it("oculta dos bloques en el mismo stream", async () => {
    const { yielded } = await collectFromStream([
      "Uno.\n",
      SIMPLE_BLOCK,
      "\nDos.\n",
      SIMPLE_BLOCK,
      "\nFin.",
    ])

    const text = yielded.join("")
    expect(text).not.toContain("memory_proposals")
    expect(text).toContain("Uno.")
    expect(text).toContain("Dos.")
    expect(text).toContain("Fin.")
  })

  it("maneja stream con bloque al inicio", async () => {
    const { yielded, fullContent } = await collectFromStream([
      SIMPLE_BLOCK,
      "\n\nSolo esto queda.",
    ])
    expect(yielded).toEqual(["Solo esto queda."])
    expect(fullContent).toContain("memory_proposals")
  })

  it("oculta los blancos iniciales hasta que empieza el texto", async () => {
    const { yielded, fullContent } = await collectFromStream([
      "\n\n",
      "  ",
      "*Mira.* ",
      "Hola.",
    ])
    expect(yielded).toEqual(["*Mira.* ", "Hola."])
    expect(fullContent).toBe("\n\n  *Mira.* Hola.")
  })

  it("fullContent contiene el texto completo incluso con partes filtradas", async () => {
    const { yielded, fullContent } = await collectFromStream([
      "Inicio.\n\n",
      SIMPLE_BLOCK,
      "\n\nFin.",
    ])
    expect(yielded.join("")).toBe("Inicio.\n\n\n\nFin.")
    expect(fullContent).toBe("Inicio.\n\n" + SIMPLE_BLOCK + "\n\nFin.")
  })
})
