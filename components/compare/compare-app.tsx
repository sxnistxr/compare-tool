"use client"

import * as React from "react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { toBlob } from "html-to-image"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import {
  CopyIcon,
  DownloadIcon,
  EllipsisIcon,
  ImagePlusIcon,
  Loader2Icon,
  SlidersHorizontalIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { loadImages, saveImages } from "@/lib/db"
import { readPngMeta } from "@/lib/png-meta"
import { defaultSettings, type Settings, type SheetImage } from "@/lib/sheet"
import { Board } from "./board"
import { SettingsPanel } from "./settings-panel"

const SETTINGS_KEY = "compare:settings"
const MAX_CANVAS_SIDE = 16384

async function toSheetImage(file: File): Promise<SheetImage | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap
    bitmap.close()
    const meta = file.type === "image/png" ? await readPngMeta(file).catch(() => ({})) : {}
    return {
      id: crypto.randomUUID(),
      name: file.name || "pasted.png",
      blob: file,
      url: URL.createObjectURL(file),
      width,
      height,
      meta,
    }
  } catch {
    return null
  }
}

export function CompareApp() {
  const [images, setImages] = React.useState<SheetImage[]>([])
  const [settings, setSettings] = React.useState<Settings>(defaultSettings)
  const [ready, setReady] = React.useState(false)
  const [dragging, setDragging] = React.useState(false)
  const [exporting, setExporting] = React.useState(false)
  const boardRef = React.useRef<HTMLDivElement>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)
  const { resolvedTheme, setTheme } = useTheme()

  // Restore the last session.
  React.useEffect(() => {
    loadImages().then((imgs) => {
      try {
        const saved = localStorage.getItem(SETTINGS_KEY)
        if (saved) setSettings({ ...defaultSettings, ...JSON.parse(saved) })
      } catch {}
      setImages(imgs)
      setReady(true)
    })
  }, [])

  React.useEffect(() => {
    if (!ready) return
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {}
  }, [settings, ready])

  React.useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => saveImages(images), 400)
    return () => clearTimeout(t)
  }, [images, ready])

  const addFiles = React.useCallback(async (files: Iterable<File>) => {
    const list = [...files]
      .filter((f) => f.type.startsWith("image/"))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    if (!list.length) return
    const added = (await Promise.all(list.map(toSheetImage))).filter((x): x is SheetImage => !!x)
    setImages((prev) => [...prev, ...added])
    const skipped = list.length - added.length
    if (skipped) toast.error(`${skipped} file${skipped > 1 ? "s" : ""} couldn't be opened`)
  }, [])

  // Drop anywhere on the window, or paste.
  React.useEffect(() => {
    let depth = 0
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes("Files")
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth++
      setDragging(true)
    }
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (!depth) setDragging(false)
    }
    const over = (e: DragEvent) => hasFiles(e) && e.preventDefault()
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      addFiles(e.dataTransfer!.files)
    }
    const paste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea")) return
      if (e.clipboardData?.files.length) addFiles(e.clipboardData.files)
    }
    window.addEventListener("dragenter", enter)
    window.addEventListener("dragleave", leave)
    window.addEventListener("dragover", over)
    window.addEventListener("drop", drop)
    window.addEventListener("paste", paste)
    return () => {
      window.removeEventListener("dragenter", enter)
      window.removeEventListener("dragleave", leave)
      window.removeEventListener("dragover", over)
      window.removeEventListener("drop", drop)
      window.removeEventListener("paste", paste)
    }
  }, [addFiles])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    setImages((prev) => {
      const from = prev.findIndex((i) => i.id === active.id)
      const to = prev.findIndex((i) => i.id === over.id)
      return arrayMove(prev, from, to)
    })
  }

  const patch = (p: Partial<Settings>) => setSettings((s) => ({ ...s, ...p }))

  const setLabel = (id: string, label: string | undefined) =>
    setImages((prev) => prev.map((i) => (i.id === id ? { ...i, label } : i)))

  const remove = (id: string) =>
    setImages((prev) => {
      const gone = prev.find((i) => i.id === id)
      if (gone) URL.revokeObjectURL(gone.url)
      return prev.filter((i) => i.id !== id)
    })

  const clearAll = () => {
    images.forEach((i) => URL.revokeObjectURL(i.url))
    setImages([])
  }

  const sortBy = (key: "name" | "seed") =>
    setImages((prev) =>
      [...prev].sort((a, b) =>
        key === "name"
          ? a.name.localeCompare(b.name, undefined, { numeric: true })
          : Number(a.meta.seed ?? Infinity) - Number(b.meta.seed ?? Infinity),
      ),
    )

  const render = async () => {
    const node = boardRef.current
    if (!node) return null
    const w = node.offsetWidth
    const h = node.offsetHeight
    let target = Number(settings.exportWidth)
    if (settings.exportWidth === "full") {
      const img = node.querySelector("img")
      target = img ? (w * img.naturalWidth) / img.getBoundingClientRect().width : w * 2
    }
    const ratio = Math.min(target / w, MAX_CANVAS_SIDE / w, MAX_CANVAS_SIDE / h)
    return toBlob(node, {
      pixelRatio: ratio,
      filter: (el) => !(el instanceof HTMLElement && el.dataset.noExport !== undefined),
    })
  }

  const fileName = () => {
    const base = settings.title.trim().replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-").toLowerCase()
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")
    return `${base || "compare"}-${stamp}.png`
  }

  const exportPng = async () => {
    setExporting(true)
    try {
      const blob = await render()
      if (!blob) throw new Error()
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = fileName()
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
      toast.success("Saved PNG")
    } catch {
      toast.error("Export failed. Try a smaller width.")
    } finally {
      setExporting(false)
    }
  }

  const copyPng = async () => {
    setExporting(true)
    try {
      // Safari wants the promise handed straight to ClipboardItem.
      const blob = render().then((b) => {
        if (!b) throw new Error()
        return b
      })
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
      toast.success("Copied to clipboard")
    } catch {
      toast.error("Couldn't copy. Use Export instead.")
    } finally {
      setExporting(false)
    }
  }

  const editedLabels = images.filter((i) => i.label !== undefined).length
  const panel = (
    <SettingsPanel
      settings={settings}
      onChange={patch}
      editedLabels={editedLabels}
      onResetLabels={() => setImages((prev) => prev.map((i) => ({ ...i, label: undefined })))}
    />
  )
  const empty = ready && images.length === 0

  return (
    <div className="flex h-dvh flex-col">
      <header suppressHydrationWarning className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 sm:px-4">
        <div className="mr-auto flex items-baseline gap-2.5">
          <h1 className="text-[15px] font-semibold tracking-tight">Compare</h1>
          {images.length > 0 && (
            <span className="text-sm text-muted-foreground tabular-nums">
              {images.length} {images.length === 1 ? "image" : "images"}
            </span>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files)
            e.target.value = ""
          }}
        />
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <ImagePlusIcon />
          <span className="max-sm:sr-only">Add images</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="More" />}>
            <EllipsisIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem disabled={!images.length} onClick={() => sortBy("name")}>
              Sort by file name
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!images.length} onClick={() => sortBy("seed")}>
              Sort by seed
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
              {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" disabled={!images.length} onClick={clearAll}>
              Remove all images
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Sheet>
          <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Settings" />}>
            <SlidersHorizontalIcon />
          </SheetTrigger>
          <SheetContent side="right" className="w-[320px] gap-0 overflow-y-auto p-0">
            <SheetHeader className="border-b">
              <SheetTitle>Settings</SheetTitle>
            </SheetHeader>
            {panel}
          </SheetContent>
        </Sheet>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Copy image"
                disabled={!images.length || exporting}
                onClick={copyPng}
              />
            }
          >
            <CopyIcon />
          </TooltipTrigger>
          <TooltipContent>Copy image</TooltipContent>
        </Tooltip>
        <Button disabled={!images.length || exporting} onClick={exportPng} aria-busy={exporting}>
          {exporting ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
          <span className="max-sm:sr-only">Export PNG</span>
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1 overflow-auto bg-canvas">
          {empty ? (
            <EmptyState onPick={() => fileRef.current?.click()} />
          ) : (
            <div className="mx-auto max-w-[1600px] p-4 sm:p-8 lg:p-12">
              <div className="shadow-[0_1px_2px_rgb(0_0_0/0.08),0_12px_32px_-12px_rgb(0_0_0/0.25)]">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={images.map((i) => i.id)} strategy={rectSortingStrategy}>
                    <Board
                      ref={boardRef}
                      images={images}
                      settings={settings}
                      onLabel={setLabel}
                      onRemove={remove}
                    />
                  </SortableContext>
                </DndContext>
              </div>
              {images.length > 1 && (
                <p className="mt-4 text-center text-xs text-canvas-foreground">
                  Drag to reorder. Click a label to edit it.
                </p>
              )}
            </div>
          )}
          <div
            aria-hidden={!dragging}
            className={cn(
              "pointer-events-none absolute inset-3 grid place-items-center rounded-xl border-2 border-dashed border-marker bg-marker/8 transition-opacity duration-150",
              dragging ? "opacity-100" : "opacity-0",
            )}
          >
            <p className="rounded-full bg-marker px-4 py-1.5 text-sm font-medium text-white">Drop to add</p>
          </div>
        </main>

        <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-l bg-background lg:block" aria-label="Settings">
          {panel}
        </aside>
      </div>
    </div>
  )
}

function EmptyState({ onPick }: { onPick: () => void }) {
  return (
    <div className="grid h-full place-items-center p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-xl border-2 border-dashed border-canvas-foreground/35 px-8 py-14 text-center">
        <ContactSheetMark />
        <div className="flex flex-col gap-1.5">
          <p className="text-lg font-semibold tracking-tight">Drop images here</p>
          <p className="text-sm text-canvas-foreground">
            Seed, steps and CFG are read from A1111 and ComfyUI PNGs.
          </p>
        </div>
        <Button variant="outline" onClick={onPick} className="bg-background">
          Choose files
        </Button>
      </div>
    </div>
  )
}

function ContactSheetMark() {
  return (
    <svg viewBox="0 0 64 44" className="h-11 w-16 text-canvas-foreground" aria-hidden>
      {[0, 1, 2].map((c) =>
        [0, 1].map((r) => (
          <rect
            key={`${c}${r}`}
            x={c * 21 + 1}
            y={r * 22 + 1}
            width={19}
            height={20}
            rx={2}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          />
        )),
      )}
      <circle cx={31} cy={33} r={8.5} fill="none" stroke="var(--marker)" strokeWidth={2} />
    </svg>
  )
}
