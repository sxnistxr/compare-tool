import type { GenMeta } from "./png-meta"

export type SheetImage = {
  id: string
  name: string
  blob: Blob
  url: string
  width: number
  height: number
  meta: GenMeta
  // Set when the label was typed by hand; overrides the generated text.
  label?: string
}

export type Layout = "grid" | "masonry" | "framed" | "film" | "row"
export type LabelPos = "below" | "above" | "inside-top" | "inside-bottom" | "tag" | "none"
export type LabelField = "name" | "seed" | "steps" | "cfg" | "sampler" | "model" | "prompt"

export type Settings = {
  layout: Layout
  columns: number
  gap: number
  padding: number
  radius: number
  fit: "cover" | "contain"
  aspect: "auto" | "1/1" | "3/4" | "4/3"
  background: string
  title: string
  numbers: boolean
  labelPos: LabelPos
  labelFields: LabelField[]
  labelAlign: "left" | "center" | "right"
  labelFont: "sans" | "serif" | "mono"
  labelSize: number
  exportWidth: "2048" | "4096" | "full"
}

export const defaultSettings: Settings = {
  layout: "grid",
  columns: 4,
  gap: 12,
  padding: 32,
  radius: 4,
  fit: "cover",
  aspect: "auto",
  background: "#ffffff",
  title: "",
  numbers: false,
  labelPos: "below",
  labelFields: ["name"],
  labelAlign: "left",
  labelFont: "sans",
  labelSize: 14,
  exportWidth: "4096",
}

export const fieldNames: Record<LabelField, string> = {
  name: "File name",
  seed: "Seed",
  steps: "Steps",
  cfg: "CFG",
  sampler: "Sampler",
  model: "Model",
  prompt: "Prompt",
}

export function autoLabel(img: SheetImage, fields: LabelField[]) {
  return fields
    .map((f) => {
      if (f === "name") return img.name.replace(/\.[^.]+$/, "")
      if (f === "prompt") return img.meta.prompt
      const v = img.meta[f]
      if (!v) return undefined
      return f === "model" ? v : `${fieldNames[f].toLowerCase()} ${v}`
    })
    .filter(Boolean)
    .join(", ")
}

export function labelFor(img: SheetImage, fields: LabelField[]) {
  return img.label ?? autoLabel(img, fields)
}

// Picks readable text for a given background color.
export function inkFor(bg: string) {
  const hex = bg.replace("#", "")
  if (hex.length !== 6) return "#1d1f23"
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.55 ? "#1d1f23" : "#f2f3f5"
}
