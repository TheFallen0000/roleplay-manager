import { describe, it, expect } from "vitest"

import {
  PROPOSE_MEMORY_CHANGES_TOOL_NAME,
  accumulateToolCallDeltas,
  buildProposeMemoryChangesTool,
  toolCallsToRawProposals,
} from "./propose-memory-changes.tool"

describe("buildProposeMemoryChangesTool", () => {
  it("retorna una tool de tipo function con nombre correcto", () => {
    const tool = buildProposeMemoryChangesTool()
    expect(tool.type).toBe("function")
    expect(tool.function.name).toBe(PROPOSE_MEMORY_CHANGES_TOOL_NAME)
  })

  it("incluye descripcion y solo exige la operacion", () => {
    const tool = buildProposeMemoryChangesTool()
    expect(tool.function.description).toBeTruthy()
    expect(tool.function.parameters.type).toBe("object")
    expect(tool.function.parameters.required).toEqual(["operation"])
    expect(tool.function.parameters.properties.operation).toBeDefined()
    expect(tool.function.parameters.properties.targetMemoryId).toBeDefined()
    expect(tool.function.parameters.properties.priority).toBeDefined()
  })

  it("las operaciones validas son CREATE, UPDATE, DELETE", () => {
    const tool = buildProposeMemoryChangesTool()
    const op = tool.function.parameters.properties.operation as {
      enum: string[]
    }
    expect(op.enum).toEqual(["CREATE", "UPDATE", "DELETE"])
  })
})

describe("accumulateToolCallDeltas", () => {
  it("un solo delta completo se acumula tal cual", () => {
    const result = accumulateToolCallDeltas([
      {
        index: 0,
        id: "call_1",
        functionName: PROPOSE_MEMORY_CHANGES_TOOL_NAME,
        argumentsDelta: '{"operation":"CREATE"}',
      },
    ])
    expect(result).toEqual([
      {
        id: "call_1",
        functionName: PROPOSE_MEMORY_CHANGES_TOOL_NAME,
        arguments: '{"operation":"CREATE"}',
      },
    ])
  })

  it("concatena arguments parciales del mismo index", () => {
    const result = accumulateToolCallDeltas([
      { index: 0, id: "call_1", functionName: PROPOSE_MEMORY_CHANGES_TOOL_NAME, argumentsDelta: '{"operation":' },
      { index: 0, argumentsDelta: '"CREATE"' },
      { index: 0, argumentsDelta: ',"actor":"A"}' },
    ])
    expect(result).toHaveLength(1)
    expect(result[0].arguments).toBe('{"operation":"CREATE","actor":"A"}')
  })

  it("preserva id y functionName del primer delta aunque los siguientes no los traigan", () => {
    const result = accumulateToolCallDeltas([
      { index: 0, id: "call_1", functionName: PROPOSE_MEMORY_CHANGES_TOOL_NAME, argumentsDelta: '{"a":' },
      { index: 0, argumentsDelta: "1}" },
    ])
    expect(result[0].id).toBe("call_1")
    expect(result[0].functionName).toBe(PROPOSE_MEMORY_CHANGES_TOOL_NAME)
  })

  it("multiples tool calls distintos con indices diferentes se acumulan separados", () => {
    const result = accumulateToolCallDeltas([
      { index: 0, id: "c1", functionName: PROPOSE_MEMORY_CHANGES_TOOL_NAME, argumentsDelta: '{"i":0' },
      { index: 1, id: "c2", functionName: PROPOSE_MEMORY_CHANGES_TOOL_NAME, argumentsDelta: '{"i":1' },
      { index: 0, argumentsDelta: "}" },
      { index: 1, argumentsDelta: "}" },
    ])
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe("c1")
    expect(result[0].arguments).toBe('{"i":0}')
    expect(result[1].id).toBe("c2")
    expect(result[1].arguments).toBe('{"i":1}')
  })

  it("preserva el orden de aparicion", () => {
    const result = accumulateToolCallDeltas([
      { index: 1, id: "second", argumentsDelta: "" },
      { index: 0, id: "first", argumentsDelta: "" },
    ])
    expect(result.map((c) => c.id)).toEqual(["second", "first"])
  })
})

describe("toolCallsToRawProposals", () => {
  it("convierte CREATE valido", () => {
    const proposals = toolCallsToRawProposals([
      {
        id: "c1",
        functionName: PROPOSE_MEMORY_CHANGES_TOOL_NAME,
        arguments: JSON.stringify({
          operation: "CREATE",
          actor: "Alice",
          title: "Estado",
          description: "Feliz",
          priority: 3,
        }),
      },
    ])
    expect(proposals).toEqual([
      {
        operation: "CREATE",
        targetMemoryId: undefined,
        actor: "Alice",
        title: "Estado",
        description: "Feliz",
        priority: 3,
      },
    ])
  })

  it("convierte UPDATE con targetMemoryId", () => {
    const proposals = toolCallsToRawProposals([
      {
        id: "c1",
        functionName: PROPOSE_MEMORY_CHANGES_TOOL_NAME,
        arguments: JSON.stringify({
          operation: "UPDATE",
          targetMemoryId: "mem-1",
          actor: "Bob",
          title: "T",
          description: "D",
          priority: 7,
        }),
      },
    ])
    expect(proposals).toHaveLength(1)
    expect(proposals[0].operation).toBe("UPDATE")
    expect(proposals[0].targetMemoryId).toBe("mem-1")
  })

  it("convierte DELETE sin priority", () => {
    const proposals = toolCallsToRawProposals([
      {
        id: "c1",
        functionName: PROPOSE_MEMORY_CHANGES_TOOL_NAME,
        arguments: JSON.stringify({
          operation: "DELETE",
          targetMemoryId: "mem-1",
          actor: "X",
          title: "T",
          description: "D",
        }),
      },
    ])
    expect(proposals).toHaveLength(1)
    expect(proposals[0].operation).toBe("DELETE")
    expect(proposals[0].priority).toBeUndefined()
  })

  it("descarta arguments con JSON malformado", () => {
    const proposals = toolCallsToRawProposals([
      {
        id: "c1",
        functionName: PROPOSE_MEMORY_CHANGES_TOOL_NAME,
        arguments: "{ not json",
      },
    ])
    expect(proposals).toEqual([])
  })

  it("descarta operation invalida", () => {
    const proposals = toolCallsToRawProposals([
      {
        id: "c1",
        functionName: PROPOSE_MEMORY_CHANGES_TOOL_NAME,
        arguments: JSON.stringify({
          operation: "BLOW_UP",
          actor: "A",
          title: "T",
          description: "D",
        }),
      },
    ])
    expect(proposals).toEqual([])
  })

  it("descarta si falta actor o title", () => {
    expect(
      toolCallsToRawProposals([
        {
          id: "c1",
          functionName: PROPOSE_MEMORY_CHANGES_TOOL_NAME,
          arguments: JSON.stringify({
            operation: "CREATE",
            title: "T",
            description: "D",
          }),
        },
      ]),
    ).toEqual([])
    expect(
      toolCallsToRawProposals([
        {
          id: "c1",
          functionName: PROPOSE_MEMORY_CHANGES_TOOL_NAME,
          arguments: JSON.stringify({
            operation: "CREATE",
            actor: "A",
            description: "D",
          }),
        },
      ]),
    ).toEqual([])
  })

  it("acepta DELETE sin actor ni title para hidratarlo después", () => {
    const proposals = toolCallsToRawProposals([
      {
        id: "c1",
        functionName: PROPOSE_MEMORY_CHANGES_TOOL_NAME,
        arguments: JSON.stringify({
          operation: "DELETE",
          targetMemoryId: "mem-1",
        }),
      },
    ])
    expect(proposals).toHaveLength(1)
    expect(proposals[0].operation).toBe("DELETE")
    expect(proposals[0].actor).toBe("")
    expect(proposals[0].title).toBe("")
  })

  it("acepta UPDATE parcial sin description ni priority", () => {
    const proposals = toolCallsToRawProposals([
      {
        id: "c1",
        functionName: PROPOSE_MEMORY_CHANGES_TOOL_NAME,
        arguments: JSON.stringify({
          operation: "UPDATE",
          targetMemoryId: "mem-1",
          title: "Nuevo título",
        }),
      },
    ])
    expect(proposals).toHaveLength(1)
    expect(proposals[0].description).toBe("")
    expect(proposals[0].priority).toBeUndefined()
  })

  it("acepta prioridad numérica en texto", () => {
    const proposals = toolCallsToRawProposals([
      {
        id: "c1",
        functionName: PROPOSE_MEMORY_CHANGES_TOOL_NAME,
        arguments: JSON.stringify({
          operation: "CREATE",
          actor: "A",
          title: "T",
          description: "D",
          priority: "8",
        }),
      },
    ])
    expect(proposals[0].priority).toBe(8)
  })

  it("ignora tool calls de otras funciones", () => {
    const proposals = toolCallsToRawProposals([
      {
        id: "c1",
        functionName: "search_web",
        arguments: JSON.stringify({ query: "hola" }),
      },
    ])
    expect(proposals).toEqual([])
  })

  it("mezcla validos e invalidos y solo retorna los validos", () => {
    const proposals = toolCallsToRawProposals([
      {
        id: "c1",
        functionName: PROPOSE_MEMORY_CHANGES_TOOL_NAME,
        arguments: JSON.stringify({
          operation: "CREATE",
          actor: "A",
          title: "T",
          description: "D",
        }),
      },
      {
        id: "c2",
        functionName: PROPOSE_MEMORY_CHANGES_TOOL_NAME,
        arguments: "{ bad",
      },
      {
        id: "c3",
        functionName: PROPOSE_MEMORY_CHANGES_TOOL_NAME,
        arguments: JSON.stringify({
          operation: "DELETE",
          targetMemoryId: "m1",
          actor: "B",
          title: "T2",
          description: "D2",
        }),
      },
    ])
    expect(proposals).toHaveLength(2)
    expect(proposals[0].operation).toBe("CREATE")
    expect(proposals[1].operation).toBe("DELETE")
  })

  it("devuelve array vacio si no hay llamadas", () => {
    expect(toolCallsToRawProposals([])).toEqual([])
  })
})
