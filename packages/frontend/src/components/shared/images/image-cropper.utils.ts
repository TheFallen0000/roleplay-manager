export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener("load", () => resolve(reader.result as string))
    reader.addEventListener("error", () => reject(new Error("No se pudo leer la imagen")))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener("load", () => resolve(image))
    image.addEventListener("error", () => reject(new Error("No se pudo cargar la imagen")))
    image.src = src
  })
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: CropArea,
): Promise<Blob> {
  const image = await loadImage(imageSrc)

  const canvas = document.createElement("canvas")
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("No se pudo crear el lienzo de recorte")

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  )

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error("No se pudo generar la imagen recortada"))
    }, "image/png")
  })
}

export function blobToFile(blob: Blob, name: string, mime: string): File {
  return new File([blob], name, { type: mime })
}
