// Turns raw SD prompts into something readable: strips weight syntax and LoRA tags,
// then splits into a natural-language lead and short comma tags.

export type ParsedPrompt = {
  lead: string
  tags: string[]
  loras: { name: string; weight?: string }[]
}

// Boilerplate that's the same on every image and says nothing about the comparison.
const QUALITY = new Set([
  "masterpiece",
  "best quality",
  "high quality",
  "highest quality",
  "top quality",
  "amazing quality",
  "very aesthetic",
  "aesthetic",
  "absurdres",
  "highres",
  "high resolution",
  "ultra detailed",
  "ultra-detailed",
  "extremely detailed",
  "highly detailed",
  "very detailed",
  "detailed",
  "intricate details",
  "8k",
  "4k",
  "uhd",
  "hdr",
  "8k uhd",
  "official art",
  "newest",
  "photorealistic",
  "realistic",
  "sharp focus",
])

export function isQualityTag(tag: string) {
  const t = tag.toLowerCase()
  return QUALITY.has(t) || /^score_\d(_up)?$/.test(t) || /^(rating|source)_\w+$/.test(t)
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length

export function parsePrompt(raw: string): ParsedPrompt {
  const loras: ParsedPrompt["loras"] = []
  let s = raw.replace(/<(?:lora|lyco|locon):([^:>]+)(?::([\d.]+))?[^>]*>/gi, (_, name, weight) => {
    loras.push({ name, weight })
    return ","
  })
  s = s
    .replace(/<[^>]*>/g, ",") // embeddings, hypernetworks and other angle-bracket extras
    .replace(/\bBREAK\b/g, ",")
    // Keep escaped brackets as literal text by parking them on placeholder characters.
    .replace(/\\([()[\]])/g, (_, c: string) => String.fromCharCode(1 + "()[]".indexOf(c)))

  // Unwrap emphasis like ((word)), [word] and (word:1.3), innermost first.
  for (let prev = ""; prev !== s; ) {
    prev = s
    s = s.replace(/\(([^()]*?)(?::\s*-?[\d.]+)?\)/g, "$1").replace(/\[([^[\]]*?)(?::\s*-?[\d.]+)?\]/g, "$1")
  }
  s = s.replace(/[\u0001-\u0004]/g, (c) => "()[]"[c.charCodeAt(0) - 1]).replace(/\s+/g, " ")

  const seen = new Set<string>()
  const parts = s
    .split(/[,\n]/)
    .map((p) => p.trim().replace(/^[.;:]+|[.;:]+$/g, "").trim())
    .filter((p) => {
      const key = p.toLowerCase()
      if (!p || seen.has(key)) return false
      seen.add(key)
      return true
    })
    // Booru-style tags use underscores for spaces.
    .map((p) => (p.includes(" ") || /^(score|rating|source)_/.test(p) ? p : p.replace(/_/g, " ")))

  // Leading long phrases read as a sentence; the short ones after them are tags.
  let i = 0
  while (i < parts.length && words(parts[i]) >= 5) i++
  let lead = parts.slice(0, i).join(", ")
  let tags = parts.slice(i)
  if (tags.some((t) => words(t) > 6)) {
    // Prose: keep the writer's own punctuation.
    lead = s.replace(/\s*,(\s*,)+/g, ",").replace(/^[\s,]+|[\s,]+$/g, "")
    tags = []
  }
  return { lead: lead.charAt(0).toUpperCase() + lead.slice(1), tags, loras }
}

// A short, clean version for places that need plain text, like the subtitle.
export function promptSummary(raw: string) {
  const p = parsePrompt(raw)
  return [p.lead, ...p.tags.filter((t) => !isQualityTag(t))].filter(Boolean).join(", ")
}
