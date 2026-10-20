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
import { toCanvas } from "html-to-image"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { loadImages, saveImages } from "@/lib/db"
import { readPngMeta } from "@/lib/png-meta"
import {
  defaultPrefs,
  defaultSettings,
  isLight,
  labelFor,
  type Preset,
  type Prefs,
  type Settings,
  type SheetImage,
} from "@/lib/sheet"
import { Board } from "./board"
import { Logo } from "./logo"
import { Preferences } from "./preferences"
import { SettingsPanel } from "./settings-panel"
import { Viewer } from "./viewer"

const SETTINGS_KEY = "compare:settings"
const PREFS_KEY = "compare:prefs"
const PRESETS_KEY = "compare:presets"
const MAX_CANVAS_SIDE = 16384
const SIDEBAR_MIN = 280
const SIDEBAR_MAX = 560

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, undefined, { numeric: true })

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const v = JSON.parse(raw)
    return Array.isArray(fallback) ? v : { ...fallback, ...v }
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

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
  const [prefs, setPrefs] = React.useState<Prefs>(defaultPrefs)
  const [presets, setPresets] = React.useState<Preset[]>([])
  const [ready, setReady] = React.useState(false)
  const [dragging, setDragging] = React.useState(false)
  const [exporting, setExporting] = React.useState(false)
  const [viewing, setViewing] = React.useState<string | null>(null)
  const [prefsOpen, setPrefsOpen] = React.useState(false)
  const [naming, setNaming] = React.useState(false)
  const boardRef = React.useRef<HTMLDivElement>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)

  // Restore the last session.
  React.useEffect(() => {
    loadImages().then((imgs) => {
      setSettings(read(SETTINGS_KEY, defaultSettings))
      setPrefs(read(PREFS_KEY, defaultPrefs))
      setPresets(read<Preset[]>(PRESETS_KEY, []))
      setImages(imgs)
      setReady(true)
    })
  }, [])

  React.useEffect(() => {
    if (ready) write(SETTINGS_KEY, settings)
  }, [settings, ready])

  React.useEffect(() => {
    if (ready) write(PREFS_KEY, prefs)
  }, [prefs, ready])

  React.useEffect(() => {
    if (ready) write(PRESETS_KEY, presets)
  }, [presets, ready])

  React.useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => saveImages(images), 400)
    return () => clearTimeout(t)
  }, [images, ready])

  // The accent drives --brand, which primary, ring and marker colors derive from.
  React.useEffect(() => {
    const root = document.documentElement.style
    root.setProperty("--brand", prefs.accent)
    root.setProperty("--brand-foreground", isLight(prefs.accent) ? "#1d1f23" : "#ffffff")
  }, [prefs.accent])

  const addFiles = React.useCallback(
    async (files: Iterable<File>) => {
      let list = [...files].filter((f) => f.type.startsWith("image/"))
      if (!list.length) return
      if (prefs.sortOnAdd) list = list.sort(byName)
      const added = (await Promise.all(list.map(toSheetImage))).filter((x): x is SheetImage => !!x)
      setImages((prev) => [...prev, ...added])
      const skipped = list.length - added.length
      if (skipped) toast.error(`${skipped} file${skipped > 1 ? "s" : ""} couldn't be opened`)
    },
    [prefs.sortOnAdd],
  )

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

  const visible = images.filter((i) => !i.hidden)
  const hiddenCount = images.length - visible.length

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    setImages((prev) => {
      const from = prev.findIndex((i) => i.id === active.id)
      const to = prev.findIndex((i) => i.id === over.id)
      return arrayMove(prev, from, to)
    })
  }

  const patch = (p: Partial<Settings>) => setSettings((s) => ({ ...s, ...p }))
  const patchPrefs = (p: Partial<Prefs>) => setPrefs((s) => ({ ...s, ...p }))

  const update = (id: string, p: Partial<SheetImage>) =>
    setImages((prev) => prev.map((i) => (i.id === id ? { ...i, ...p } : i)))

  const restore = (snapshot: SheetImage[]) => () => setImages(snapshot)

  const remove = (id: string) => {
    const gone = images.find((i) => i.id === id)
    if (!gone) return
    const snapshot = images
    setImages((prev) => prev.filter((i) => i.id !== id))
    toast(`Removed ${gone.name}`, { action: { label: "Undo", onClick: restore(snapshot) } })
  }

  const clearAll = () => {
    const snapshot = images
    setImages([])
    toast(`Removed ${snapshot.length} images`, { action: { label: "Undo", onClick: restore(snapshot) } })
  }

  const sortBy = (key: "name" | "seed" | "reverse") =>
    setImages((prev) => {
      if (key === "reverse") return [...prev].reverse()
      return [...prev].sort(
        key === "name" ? byName : (a, b) => Number(a.meta.seed ?? Infinity) - Number(b.meta.seed ?? Infinity),
      )
    })

  const fillHeaders = (which: "cols" | "rows") => {
    const cols = settings.layout === "row" ? visible.length : Math.min(settings.columns, visible.length)
    const pick = which === "cols" ? visible.slice(0, cols) : visible.filter((_, i) => i % cols === 0)
    const fields = settings.labelFields.length ? settings.labelFields : (["name"] as const)
    const text = pick.map((img) => labelFor(img, [...fields])).join("\n")
    patch(which === "cols" ? { colHeaders: text } : { rowHeaders: text })
  }

  const savePreset = (name: string) => {
    setPresets((prev) => [...prev.filter((p) => p.name !== name), { name, settings }])
    toast.success(`Saved preset “${name}”`)
  }

  const render = async (format: Settings["exportFormat"]) => {
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
    const clear = settings.transparent && format !== "jpeg" && settings.layout !== "film"
    const canvas = await toCanvas(node, {
      pixelRatio: ratio,
      filter: (el) => !(el instanceof HTMLElement && el.dataset.noExport !== undefined),
      style: clear ? { background: "transparent" } : undefined,
    })
    return new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, `image/${format}`, settings.exportQuality / 100),
    )
  }

  const fileName = () => {
    const base = settings.title.trim().replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-").toLowerCase()
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")
    const ext = settings.exportFormat === "jpeg" ? "jpg" : settings.exportFormat
    return `${base || "compare"}-${stamp}.${ext}`
  }

  const exportImage = async () => {
    if (!visible.length || exporting) return
    setExporting(true)
    try {
      const blob = await render(settings.exportFormat)
      if (!blob) throw new Error()
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = fileName()
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
      toast.success(`Saved ${a.download}`)
    } catch {
      toast.error("Export failed. Try a smaller width.")
    } finally {
      setExporting(false)
    }
  }

  const copyImage = async () => {
    setExporting(true)
    try {
      // Safari wants the promise handed straight to ClipboardItem.
      const blob = render("png").then((b) => {
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

  const toggleSidebar = () => setPrefs((p) => ({ ...p, sidebarOpen: !p.sidebarOpen }))

  // Shortcuts. The ref keeps the listener pointed at the latest export function.
  const exportRef = React.useRef(exportImage)
  React.useEffect(() => {
    exportRef.current = exportImage
  })
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return
      const k = e.key.toLowerCase()
      if (k === "o") fileRef.current?.click()
      else if (k === "s") exportRef.current()
      else if (k === "b") setPrefs((p) => ({ ...p, sidebarOpen: !p.sidebarOpen }))
      else if (k === ",") setPrefsOpen(true)
      else return
      e.preventDefault()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Drag the sidebar edge to resize it.
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = prefs.sidebarWidth
    const dir = prefs.sidebarSide === "right" ? -1 : 1
    const move = (ev: PointerEvent) => {
      const w = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startW + (ev.clientX - startX) * dir))
      patchPrefs({ sidebarWidth: w })
    }
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      document.body.style.cursor = ""
    }
    document.body.style.cursor = "col-resize"
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  const editedLabels = images.filter((i) => i.label !== undefined).length
  const panel = (
    <SettingsPanel
      settings={settings}
      onChange={patch}
      editedLabels={editedLabels}
      onResetLabels={() => setImages((prev) => prev.map((i) => ({ ...i, label: undefined })))}
      onFillHeaders={fillHeaders}
      closed={prefs.closed}
      onToggleSection={(name, open) =>
        patchPrefs({ closed: open ? prefs.closed.filter((n) => n !== name) : [...prefs.closed, name] })
      }
      presets={presets}
      onSavePreset={() => setNaming(true)}
      onApplyPreset={(i) => {
        setSettings({ ...defaultSettings, ...presets[i].settings })
        toast(`Applied “${presets[i].name}”`)
      }}
      onDeletePreset={(i) => setPresets((prev) => prev.filter((_, j) => j !== i))}
      onResetSettings={() => {
        const before = settings
        setSettings(defaultSettings)
        toast("Settings reset", { action: { label: "Undo", onClick: () => setSettings(before) } })
      }}
    />
  )
  const empty = ready && images.length === 0
  const left = prefs.sidebarSide === "left"

  const sidebar = prefs.sidebarOpen && (
    <aside
      className={cn("relative hidden shrink-0 bg-background lg:block", left ? "border-r" : "border-l")}
      style={{ width: prefs.sidebarWidth }}
      aria-label="Settings"
    >
      <div className="h-full overflow-y-auto">{panel}</div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        aria-valuenow={prefs.sidebarWidth}
        aria-valuemin={SIDEBAR_MIN}
        aria-valuemax={SIDEBAR_MAX}
        tabIndex={0}
        onPointerDown={startResize}
        onDoubleClick={() => patchPrefs({ sidebarWidth: defaultPrefs.sidebarWidth })}
        onKeyDown={(e) => {
          const d = e.key === "ArrowLeft" ? -16 : e.key === "ArrowRight" ? 16 : 0
          if (!d) return
          e.preventDefault()
          const w = prefs.sidebarWidth + (left ? d : -d)
          patchPrefs({ sidebarWidth: Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, w)) })
        }}
        className={cn(
          "absolute inset-y-0 z-20 w-1.5 cursor-col-resize transition-colors outline-none hover:bg-primary/40 focus-visible:bg-primary/60",
          left ? "-right-[3px]" : "-left-[3px]",
        )}
      />
    </aside>
  )

  return (
    <div className="flex h-dvh flex-col">
      <header suppressHydrationWarning className="flex h-14 shrink-0 items-center gap-1.5 border-b bg-background px-3 sm:px-4">
        <div className="mr-auto flex items-center gap-2.5">
          <Logo className="size-7" />
          <h1 className="text-[15px] font-semibold tracking-tight">Compare</h1>
          {images.length > 0 && (
            <span className="text-sm text-muted-foreground tabular-nums max-sm:hidden">
              {visible.length} {visible.length === 1 ? "image" : "images"}
              {hiddenCount > 0 && `, ${hiddenCount} hidden`}
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
          <Icon className="icon-[ph--image-square]" />
          <span className="max-sm:sr-only">Add images</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="More" />}>
            <Icon className="icon-[ph--dots-three-bold]" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem disabled={!images.length} onClick={() => sortBy("name")}>
              <Icon className="icon-[ph--sort-ascending]" />
              Sort by file name
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!images.length} onClick={() => sortBy("seed")}>
              <Icon className="icon-[ph--hash]" />
              Sort by seed
            </DropdownMenuItem>
            <DropdownMenuItem disabled={images.length < 2} onClick={() => sortBy("reverse")}>
              <Icon className="icon-[ph--arrows-down-up]" />
              Reverse order
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={!hiddenCount}
              onClick={() => setImages((prev) => prev.map((i) => ({ ...i, hidden: false })))}
            >
              <Icon className="icon-[ph--eye]" />
              Show hidden images
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" disabled={!images.length} onClick={clearAll}>
              <Icon className="icon-[ph--trash]" />
              Remove all images
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <IconButton label="Preferences" icon="icon-[ph--gear-six]" onClick={() => setPrefsOpen(true)} />

        <IconButton
          label={prefs.sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          icon={left ? "icon-[ph--sidebar-simple]" : "icon-[ph--sidebar-simple] -scale-x-100"}
          onClick={toggleSidebar}
          className="max-lg:hidden"
        />

        <Sheet>
          <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Settings" />}>
            <Icon className="icon-[ph--sliders-horizontal]" />
          </SheetTrigger>
          <SheetContent side={left ? "left" : "right"} className="w-[340px] gap-0 overflow-y-auto p-0">
            <SheetHeader className="border-b">
              <SheetTitle>Settings</SheetTitle>
            </SheetHeader>
            {panel}
          </SheetContent>
        </Sheet>

        <IconButton label="Copy image" icon="icon-[ph--copy]" disabled={!visible.length || exporting} onClick={copyImage} />
        <Button disabled={!visible.length || exporting} onClick={exportImage} aria-busy={exporting}>
          <Icon className={exporting ? "icon-[ph--circle-notch] animate-spin" : "icon-[ph--download-simple]"} />
          <span className="max-sm:sr-only">
            Export {settings.exportFormat === "jpeg" ? "JPG" : settings.exportFormat.toUpperCase()}
          </span>
        </Button>
      </header>

      <div className={cn("flex min-h-0 flex-1", left && "flex-row-reverse")}>
        <main data-canvas={prefs.canvas} className="relative min-w-0 flex-1 overflow-auto bg-canvas">
          {empty ? (
            <EmptyState onPick={() => fileRef.current?.click()} />
          ) : (
            <div className={cn("mx-auto p-4 sm:p-8 lg:p-12", settings.sheetWidth === "fit" ? "max-w-[1600px]" : "w-fit")}>
              <div className="shadow-[0_1px_2px_rgb(0_0_0/0.08),0_12px_32px_-12px_rgb(0_0_0/0.25)]">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={visible.map((i) => i.id)} strategy={rectSortingStrategy}>
                    <Board
                      ref={boardRef}
                      images={visible}
                      settings={settings}
                      onLabel={(id, label) => update(id, { label })}
                      onRemove={remove}
                      onView={setViewing}
                    />
                  </SortableContext>
                </DndContext>
              </div>
              {prefs.hints && visible.length > 0 && (
                <p className="mt-4 text-center text-xs text-canvas-foreground">
                  Drag to reorder. Click a label to edit it. Double-click an image to view it.
                </p>
              )}
            </div>
          )}
        </main>
        {sidebar}
      </div>

      <div
        aria-hidden={!dragging}
        className={cn(
          "pointer-events-none fixed inset-3 top-17 z-30 grid place-items-center rounded-xl border-2 border-dashed border-marker bg-marker/8 transition-opacity duration-150",
          dragging ? "opacity-100" : "opacity-0",
        )}
      >
        <p className="flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground">
          <Icon className="icon-[ph--download-simple]" />
          Drop to add
        </p>
      </div>

      <Viewer
        images={images}
        id={viewing}
        onClose={() => setViewing(null)}
        onNavigate={setViewing}
        onToggleHidden={(id) => update(id, { hidden: !images.find((i) => i.id === id)?.hidden })}
        onUsePrompt={(subtitle) => {
          patch({ subtitle })
          toast.success("Prompt added as subtitle")
        }}
      />
      <Preferences open={prefsOpen} onOpenChange={setPrefsOpen} prefs={prefs} onChange={patchPrefs} />
      <PresetDialog open={naming} onOpenChange={setNaming} onSave={savePreset} />
    </div>
  )
}

function IconButton({
  label,
  icon,
  className,
  ...props
}: { label: string; icon: string } & Omit<React.ComponentProps<typeof Button>, "children">) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon" aria-label={label} className={className} {...props} />}>
        <Icon className={icon} />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function PresetDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string) => void
}) {
  const [name, setName] = React.useState("")
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setName("")
      }}
    >
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return
            onSave(name.trim())
            onOpenChange(false)
            setName("")
          }}
        >
          <DialogHeader>
            <DialogTitle>Save preset</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            aria-label="Preset name"
            placeholder="e.g. XY grid, dark"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <DialogFooter>
            <Button type="submit" disabled={!name.trim()}>
              Save preset
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EmptyState({ onPick }: { onPick: () => void }) {
  return (
    <div className="grid h-full place-items-center p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-xl border-2 border-dashed border-canvas-foreground/35 px-8 py-14 text-center">
        <Icon className="icon-[ph--images-duotone] size-12 text-primary" />
        <div className="flex flex-col gap-1.5">
          <p className="text-lg font-semibold tracking-tight">Drop images here</p>
          <p className="text-sm text-canvas-foreground">Seed, steps and CFG are read from A1111 and ComfyUI PNGs.</p>
        </div>
        <Button onClick={onPick}>
          <Icon className="icon-[ph--image-square]" />
          Choose files
        </Button>
      </div>
    </div>
  )
}
