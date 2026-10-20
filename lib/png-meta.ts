// Reads generation info that SDXL front-ends write into PNG text chunks.
// A1111 / Forge / Fooocus-style: a "parameters" tEXt chunk.
// ComfyUI: a "prompt" chunk holding the node graph as JSON.

export type GenMeta = {
  prompt?: string
  negative?: string
  seed?: string
  steps?: string
  cfg?: string
  sampler?: string
  model?: string
  size?: string
}

export async function readPngMeta(file: Blob): Promise<GenMeta> {
  const buf = new Uint8Array(await file.arrayBuffer())
  const sig = [137, 80, 78, 71, 13, 10, 26, 10]
  if (buf.length < 8 || sig.some((b, i) => buf[i] !== b)) return {}

  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const latin = new TextDecoder("latin1")
  const utf8 = new TextDecoder("utf-8")
  const chunks: Record<string, string> = {}

  let pos = 8
  while (pos + 8 <= buf.length) {
    const len = view.getUint32(pos)
    const type = latin.decode(buf.subarray(pos + 4, pos + 8))
    const data = buf.subarray(pos + 8, pos + 8 + len)
    if (type === "tEXt") {
      const nul = data.indexOf(0)
      if (nul > 0) chunks[latin.decode(data.subarray(0, nul))] = utf8.decode(data.subarray(nul + 1))
    } else if (type === "iTXt") {
      const parsed = await readITxt(data, latin, utf8)
      if (parsed) chunks[parsed[0]] = parsed[1]
    } else if (type === "IDAT" || type === "IEND") {
      // Text chunks after image data are rare; stop early to skip the pixels.
      if (Object.keys(chunks).length) break
    }
    pos += 12 + len
  }

  if (chunks.parameters) return parseA1111(chunks.parameters)
  if (chunks.prompt) return parseComfy(chunks.prompt)
  return {}
}

async function readITxt(data: Uint8Array, latin: TextDecoder, utf8: TextDecoder) {
  const nul = data.indexOf(0)
  if (nul <= 0) return null
  const key = latin.decode(data.subarray(0, nul))
  const compressed = data[nul + 1] === 1
  let p = nul + 3
  p = data.indexOf(0, p) + 1 // language tag
  p = data.indexOf(0, p) + 1 // translated keyword
  let text: Uint8Array<ArrayBuffer> = data.slice(p)
  if (compressed) {
    const stream = new Blob([text]).stream().pipeThrough(new DecompressionStream("deflate"))
    text = new Uint8Array(await new Response(stream).arrayBuffer())
  }
  return [key, utf8.decode(text)] as const
}

function parseA1111(text: string): GenMeta {
  const lines = text.trim().split("\n")
  const paramLine = lines.findLast((l) => /Steps:\s*\d+/.test(l)) ?? ""
  const promptEnd = lines.findIndex((l) => l.startsWith("Negative prompt:") || l === paramLine)
  const prompt = lines.slice(0, promptEnd < 0 ? lines.length : promptEnd).join(" ").trim()
  const negStart = lines.findIndex((l) => l.startsWith("Negative prompt:"))
  const negEnd = lines.indexOf(paramLine)
  const negative =
    negStart < 0
      ? ""
      : lines
          .slice(negStart, negEnd > negStart ? negEnd : undefined)
          .join(" ")
          .replace(/^Negative prompt:\s*/, "")
          .trim()

  const get = (key: string) => paramLine.match(new RegExp(`${key}:\\s*([^,]+)`))?.[1]?.trim()
  return {
    prompt: prompt || undefined,
    negative: negative || undefined,
    seed: get("Seed"),
    steps: get("Steps"),
    cfg: get("CFG scale"),
    sampler: [get("Sampler"), get("Schedule type")].filter(Boolean).join(" "),
    model: get("Model"),
    size: get("Size"),
  }
}

type ComfyNode = { class_type?: string; inputs?: Record<string, unknown> }

function parseComfy(json: string): GenMeta {
  let graph: Record<string, ComfyNode>
  try {
    graph = JSON.parse(json)
  } catch {
    return {}
  }
  const nodes = Object.values(graph)
  const prim = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : undefined)

  const sampler = nodes.find((n) => n.class_type?.startsWith("KSampler"))?.inputs ?? {}
  const ckpt = nodes.find((n) => n.inputs && "ckpt_name" in n.inputs)?.inputs
  const linked = (v: unknown) => (Array.isArray(v) ? graph[String(v[0])]?.inputs : undefined)
  const positive = linked(sampler.positive)

  return {
    prompt: prim(positive?.text),
    negative: prim(linked(sampler.negative)?.text),
    seed: prim(sampler.seed ?? sampler.noise_seed),
    steps: prim(sampler.steps),
    cfg: prim(sampler.cfg),
    sampler: [prettySampler(prim(sampler.sampler_name)), prim(sampler.scheduler)?.replace(/^\w/, (c) => c.toUpperCase())].filter(Boolean).join(" ") || undefined,
    model: prim(ckpt?.ckpt_name)?.replace(/\.(safetensors|ckpt)$/, ""),
  }
}

// "dpmpp_2m_sde" -> "DPM++ 2M SDE", to match how A1111 names them.
function prettySampler(name?: string) {
  return name
    ?.replace(/^dpmpp/, "DPM++")
    .split("_")
    .map((w) => (/^(\d\w|sde|gpu|lcm|ddim|ddpm)$/.test(w) ? w.toUpperCase() : w))
    .join(" ")
}
