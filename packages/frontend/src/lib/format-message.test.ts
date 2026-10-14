import { describe, it, expect } from "vitest"

import { parseMessage } from "./format-message"

describe("parseMessage", () => {
  it("devuelve un solo segmento dialogue si no hay acciones ni OOC", () => {
    const result = parseMessage("Hola, soy Alice.")
    expect(result).toEqual([{ type: "dialogue", content: "Hola, soy Alice." }])
  })

  it("detecta una accion *foo* en medio del texto", () => {
    const result = parseMessage("Hola *saluda* mundo")
    expect(result).toEqual([
      { type: "dialogue", content: "Hola " },
      { type: "action", content: "saluda" },
      { type: "dialogue", content: " mundo" },
    ])
  })

  it("detecta una OOC //texto// al final", () => {
    const result = parseMessage("Narracion //Crea memorias//")
    expect(result).toEqual([
      { type: "dialogue", content: "Narracion " },
      { type: "ooc", content: "Crea memorias" },
    ])
  })

  it("detecta una OOC en medio del texto preservando el orden", () => {
    const result = parseMessage("A //meta// B")
    expect(result).toEqual([
      { type: "dialogue", content: "A " },
      { type: "ooc", content: "meta" },
      { type: "dialogue", content: " B" },
    ])
  })

  it("combina acciones y OOC en el orden de aparicion", () => {
    const result = parseMessage("*Salgo.* //Crea memorias//")
    expect(result).toEqual([
      { type: "action", content: "Salgo." },
      { type: "dialogue", content: " " },
      { type: "ooc", content: "Crea memorias" },
    ])
  })

  it("detecta multiples OOC en un mensaje", () => {
    const result = parseMessage("//primero// texto //segundo//")
    expect(result).toEqual([
      { type: "ooc", content: "primero" },
      { type: "dialogue", content: " texto " },
      { type: "ooc", content: "segundo" },
    ])
  })

  it("descarta // sin cerrar como texto literal", () => {
    const result = parseMessage("Hola //sin cerrar")
    expect(result).toEqual([{ type: "dialogue", content: "Hola //sin cerrar" }])
  })

  it("descarta OOC vacio ////", () => {
    const result = parseMessage("texto //// mas texto")
    expect(result).toEqual([
      { type: "dialogue", content: "texto " },
      { type: "dialogue", content: " mas texto" },
    ])
  })

  it("hace trim interno del contenido OOC", () => {
    const result = parseMessage("//  hola mundo  //")
    expect(result).toEqual([{ type: "ooc", content: "hola mundo" }])
  })

  it("devuelve array vacio si el contenido esta vacio", () => {
    expect(parseMessage("")).toEqual([])
  })

  it("recorta los bordes para que los saltos no se muestren", () => {
    const result = parseMessage("\n\n  *Camina.*\n\n")
    expect(result).toEqual([{ type: "action", content: "Camina." }])
  })

  it("normaliza CRLF antes de parsear", () => {
    const result = parseMessage("Uno.\r\n\r\nDos.")
    expect(result).toEqual([{ type: "dialogue", content: "Uno.\n\nDos." }])
  })
})
