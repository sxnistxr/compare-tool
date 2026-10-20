"use client"

import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"
import { isQualityTag, parsePrompt, promptSummary } from "@/lib/prompt"
import type { SheetImage } from "@/lib/sheet"

type Props = {
  images: SheetImage[]
  id: string | null
  onClose: () => void
  onNavigate: (id: string) => void
  onToggleHidden: (id: string) => void
  onUsePrompt: (prompt: string) => void
}

const rows = [
  ["Seed", "seed"],
  ["Steps", "steps"],
  ["CFG", "cfg"],
  ["Sampler", "sampler"],
  ["Model", "model"],
] as const

export function Viewer({ images, id, onClose, onNavigate, onToggleHidden, onUsePrompt }: Props) {
  const index = images.findIndex((i) => i.id === id)
  const img = images[index]

  const step = React.useCallback(
    (d: number) => {
      if (index < 0 || !images.length) return
      onNavigate(images[(index + d + images.length) % images.length].id)
    },
    [index, images, onNavigate],
  )

  React.useEffect(() => {
    if (!img) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1)
      if (e.key === "ArrowLeft") step(-1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [img, step])

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`Copied ${what}`)
    } catch {
      toast.error("Couldn't copy")
    }
  }

  return (
    <Dialog open={!!img} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="grid max-h-[92dvh] w-[min(1280px,96vw)] max-w-none gap-0 overflow-hidden p-0 sm:max-w-none md:grid-cols-[minmax(0,1fr)_320px]">
        {img && (
          <>
            <div className="relative grid min-h-[40dvh] place-items-center bg-canvas">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL */}
              <img src={img.url} alt={img.name} className="max-h-[92dvh] w-full object-contain" />
              {images.length > 1 && (
                <>
                  <NavButton side="left" onClick={() => step(-1)} />
                  <NavButton side="right" onClick={() => step(1)} />
                </>
              )}
            </div>
            <aside className="flex max-h-[92dvh] flex-col gap-5 overflow-y-auto border-l p-5">
              <div className="flex flex-col gap-1 pr-8">
                <DialogTitle className="text-sm font-semibold break-all">{img.name}</DialogTitle>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {index + 1} of {images.length}, {img.width}x{img.height}
                  {img.hidden && ", hidden from sheet"}
                </p>
              </div>

              {img.meta.prompt && (
                <PromptView
                  raw={img.meta.prompt}
                  negative={img.meta.negative}
                  onCopy={() => copy(img.meta.prompt!, "prompt")}
                />
              )}

              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
                {rows.map(([name, key]) =>
                  img.meta[key] ? (
                    <React.Fragment key={key}>
                      <dt className="text-muted-foreground">{name}</dt>
                      <dd className="break-words tabular-nums">{img.meta[key]}</dd>
                    </React.Fragment>
                  ) : null,
                )}
              </dl>
              {!img.meta.seed && !img.meta.prompt && (
                <p className="text-xs text-muted-foreground">No generation settings found in this file.</p>
              )}

              <div className="mt-auto flex flex-col gap-2">
                {img.meta.prompt && (
                  <Button variant="outline" onClick={() => onUsePrompt(promptSummary(img.meta.prompt!))}>
                    <Icon className="icon-[ph--text-t]" />
                    Use prompt as subtitle
                  </Button>
                )}
                <Button variant="outline" onClick={() => onToggleHidden(img.id)}>
                  <Icon className={img.hidden ? "icon-[ph--eye]" : "icon-[ph--eye-slash]"} />
                  {img.hidden ? "Show on sheet" : "Hide from sheet"}
                </Button>
                <Button variant="ghost" render={<a href={img.url} download={img.name} />}>
                  <Icon className="icon-[ph--download-simple]" />
                  Download original
                </Button>
              </div>
            </aside>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function NavButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous image" : "Next image"}
      className="absolute top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-marker"
      style={{ [side]: 12 }}
    >
      <Icon className={side === "left" ? "icon-[ph--caret-left] size-5" : "icon-[ph--caret-right] size-5"} />
    </button>
  )
}

function PromptView({ raw, negative, onCopy }: { raw: string; negative?: string; onCopy: () => void }) {
  const p = React.useMemo(() => parsePrompt(raw), [raw])
  const [showNegative, setShowNegative] = React.useState(false)
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs text-muted-foreground">Prompt</h3>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Icon className="icon-[ph--copy] size-3.5" />
          Copy original
        </button>
      </div>
      {p.lead && <p className="text-[13px] leading-relaxed text-pretty">{p.lead}</p>}
      {p.tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {p.tags.map((t) => (
            <li
              key={t}
              className={cn(
                "rounded-full bg-muted px-2 py-0.5 text-xs",
                isQualityTag(t) && "bg-transparent text-muted-foreground ring-1 ring-border ring-inset",
              )}
            >
              {t}
            </li>
          ))}
        </ul>
      )}
      {p.loras.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {p.loras.map((l) => (
            <li key={l.name} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              <Icon className="icon-[ph--puzzle-piece] size-3" />
              {l.name}
              {l.weight && <span className="tabular-nums opacity-70">{l.weight}</span>}
            </li>
          ))}
        </ul>
      )}
      {negative && (
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            aria-expanded={showNegative}
            onClick={() => setShowNegative((v) => !v)}
            className="inline-flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground"
          >
            <Icon className={cn("icon-[ph--caret-right] size-3 transition-transform", showNegative && "rotate-90")} />
            Negative prompt
          </button>
          {showNegative && <p className="text-xs leading-relaxed text-muted-foreground">{promptSummary(negative)}</p>}
        </div>
      )}
    </section>
  )
}
