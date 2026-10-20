import type { GenMeta } from "./png-meta"
import { isQualityTag, parsePrompt, promptSummary, type ParsedPrompt } from "./prompt"

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
  // Hidden images stay in the list but are left out of the sheet.
  hidden?: boolean
}

export type Layout = "grid" | "masonry" | "framed" | "film" | "row"
export type LabelPos = "below" | "above" | "inside-top" | "inside-bottom" | "tag" | "none"
export type LabelField = "name" | "seed" | "steps" | "cfg" | "sampler" | "model" | "size" | "prompt"
export type Align = "left" | "center" | "right"

export type Settings = {
  layout: Layout
  columns: number
  gap: number
  padding: number
  radius: number
  fit: "cover" | "contain"
  aspect: "auto" | "1/1" | "3/4" | "4/3" | "2/3" | "16/9"
  sheetWidth: "fit" | "1200" | "1600" | "2400"
  border: number
  borderColor: string
  shadow: boolean

  background: string
  title: string
  subtitle: string
  footer: string
  titleSize: number
  titleAlign: Align

  colHeaders: string
  rowHeaders: string

  numbers: boolean
  labelPos: LabelPos
  labelFields: LabelField[]
  labelAlign: Align
  labelFont: "sans" | "serif" | "mono"
  labelSize: number
  labelWeight: "400" | "500" | "700"
  labelLines: number
  labelColor: string
  hideQualityTags: boolean

  exportWidth: "2048" | "4096" | "full"
  exportFormat: "png" | "jpeg" | "webp"
  exportQuality: number
  transparent: boolean
}

export const defaultSettings: Settings = {
  layout: "grid",
  columns: 4,
  gap: 12,
  padding: 32,
  radius: 4,
  fit: "cover",
  aspect: "auto",
  sheetWidth: "fit",
  border: 0,
  borderColor: "#000000",
  shadow: false,

  background: "#ffffff",
  title: "",
  subtitle: "",
  footer: "",
  titleSize: 28,
  titleAlign: "left",

  colHeaders: "",
  rowHeaders: "",

  numbers: false,
  labelPos: "below",
  labelFields: ["name"],
  labelAlign: "left",
  labelFont: "sans",
  labelSize: 14,
  labelWeight: "400",
  labelLines: 0,
  labelColor: "",
  hideQualityTags: true,

  exportWidth: "4096",
  exportFormat: "png",
  exportQuality: 92,
  transparent: false,
}

export const fieldNames: Record<LabelField, string> = {
  name: "File name",
  seed: "Seed",
  steps: "Steps",
  cfg: "CFG",
  sampler: "Sampler",
  model: "Model",
  size: "Size",
  prompt: "Prompt",
}

export function autoLabel(img: SheetImage, fields: LabelField[]) {
  return fields
    .map((f) => {
      if (f === "name") return img.name.replace(/\.[^.]+$/, "")
      if (f === "prompt") return img.meta.prompt && promptSummary(img.meta.prompt)
      if (f === "size") return img.meta.size ?? `${img.width}x${img.height}`
      const v = img.meta[f]
      if (!v) return undefined
      return f === "model" ? v : `${fieldNames[f].toLowerCase()} ${v}`
    })
    .filter(Boolean)
    .join(", ")
}

const paramKeys = { seed: "Seed", steps: "Steps", cfg: "CFG", sampler: "Sampler", size: "Size" } as const

// Structured label: text lines (name, model, prompt) plus short key/value settings.
export function labelParts(img: SheetImage, fields: LabelField[], hideQuality = true) {
  const text: string[] = []
  let prompt: ParsedPrompt | undefined
  const params: { key: string; value: string }[] = []
  for (const f of fields) {
    if (f === "name") text.push(img.name.replace(/\.[^.]+$/, ""))
    else if (f === "model" && img.meta.model) text.push(img.meta.model)
    else if (f === "prompt" && img.meta.prompt) {
      prompt = parsePrompt(img.meta.prompt)
      if (hideQuality) prompt.tags = prompt.tags.filter((t) => !isQualityTag(t))
    }
    else if (f in paramKeys) {
      const value =
        f === "size" ? (img.meta.size ?? `${img.width}x${img.height}`).replace("x", "×") : img.meta[f as keyof typeof paramKeys]
      if (value) params.push({ key: paramKeys[f as keyof typeof paramKeys], value })
    }
  }
  return { text, params, prompt }
}

export function labelFor(img: SheetImage, fields: LabelField[]) {
  return img.label ?? autoLabel(img, fields)
}

export function lines(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
}

// Picks readable text for a given background color.
export function inkFor(bg: string) {
  return isLight(bg) ? "#1d1f23" : "#f2f3f5"
}

export function isLight(hex: string) {
  const h = hex.replace("#", "")
  if (h.length !== 6) return true
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55
}

// App preferences, separate from the sheet so presets don't change the workspace.
export type Prefs = {
  accent: string
  canvas: "grey" | "light" | "dark" | "checker"
  sidebarSide: "left" | "right"
  sidebarWidth: number
  sidebarOpen: boolean
  hints: boolean
  sortOnAdd: boolean
  closed: string[]
}

export const defaultPrefs: Prefs = {
  accent: "#b1212e",
  canvas: "grey",
  sidebarSide: "right",
  sidebarWidth: 320,
  sidebarOpen: true,
  hints: true,
  sortOnAdd: true,
  closed: [],
}

export const accents = [
  { name: "Crimson", value: "#b1212e" },
  { name: "Cobalt", value: "#2f5bd3" },
  { name: "Teal", value: "#0f7a72" },
  { name: "Violet", value: "#6d3fc0" },
  { name: "Amber", value: "#b86e0a" },
  { name: "Graphite", value: "#3c3f45" },
]

export type Preset = { name: string; settings: Settings }
