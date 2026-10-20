"use client"

import { useTheme } from "next-themes"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Icon } from "@/components/ui/icon"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import { accents, type Prefs } from "@/lib/sheet"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  prefs: Prefs
  onChange: (patch: Partial<Prefs>) => void
}

const canvases: { value: Prefs["canvas"]; name: string; className: string }[] = [
  { value: "grey", name: "Grey", className: "bg-[oklch(0.855_0.003_250)]" },
  { value: "light", name: "Light", className: "bg-[oklch(0.95_0.002_250)]" },
  { value: "dark", name: "Dark", className: "bg-[oklch(0.2_0.004_255)]" },
  {
    value: "checker",
    name: "Checkered",
    className:
      "bg-white bg-[conic-gradient(rgb(0_0_0/0.12)_25%,transparent_0_50%,rgb(0_0_0/0.12)_0_75%,transparent_0)] bg-[length:10px_10px]",
  },
]

const shortcuts = [
  ["Add images", "O"],
  ["Export", "S"],
  ["Show or hide sidebar", "B"],
  ["Preferences", ","],
]

export function Preferences({ open, onOpenChange, prefs, onChange }: Props) {
  const { theme, setTheme } = useTheme()
  const preset = accents.some((a) => a.value === prefs.accent)
  const mod = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Preferences</DialogTitle>
        </DialogHeader>

        <Row label="Theme">
          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={0}
            value={[theme ?? "system"]}
            onValueChange={(v) => v[0] && setTheme(v[0] as string)}
            aria-label="Theme"
          >
            <ToggleGroupItem value="system" aria-label="System">
              <Icon className="icon-[ph--monitor]" />
            </ToggleGroupItem>
            <ToggleGroupItem value="light" aria-label="Light">
              <Icon className="icon-[ph--sun]" />
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" aria-label="Dark">
              <Icon className="icon-[ph--moon]" />
            </ToggleGroupItem>
          </ToggleGroup>
        </Row>

        <div className="flex flex-col gap-2.5">
          <Label className="font-normal">Accent color</Label>
          <div className="flex flex-wrap items-center gap-2">
            {accents.map((a) => (
              <button
                key={a.value}
                type="button"
                aria-label={a.name}
                title={a.name}
                aria-pressed={prefs.accent === a.value}
                onClick={() => onChange({ accent: a.value })}
                className={cn(
                  "grid size-8 place-items-center rounded-full text-white outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring",
                  prefs.accent === a.value && "outline-2 outline-foreground",
                )}
                style={{ background: a.value }}
              >
                {prefs.accent === a.value && <Icon className="icon-[ph--check-bold] size-3.5" />}
              </button>
            ))}
            <label
              title="Custom color"
              className={cn(
                "relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-full border outline-offset-2 focus-within:outline-2 focus-within:outline-ring",
                !preset && "outline-2 outline-foreground",
              )}
              style={{ background: preset ? undefined : prefs.accent }}
            >
              {preset && <Icon className="icon-[ph--eyedropper] text-muted-foreground" />}
              <span className="sr-only">Custom accent color</span>
              <input
                type="color"
                value={prefs.accent}
                onChange={(e) => onChange({ accent: e.target.value })}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <Label className="font-normal">Workspace background</Label>
          <div className="grid grid-cols-4 gap-2">
            {canvases.map((c) => (
              <button
                key={c.value}
                type="button"
                aria-pressed={prefs.canvas === c.value}
                onClick={() => onChange({ canvas: c.value })}
                className="group flex flex-col items-center gap-1.5 text-xs text-muted-foreground outline-none"
              >
                <span
                  className={cn(
                    "h-10 w-full rounded-md border outline-offset-2 group-focus-visible:outline-2 group-focus-visible:outline-ring",
                    c.className,
                    prefs.canvas === c.value && "outline-2 outline-primary",
                  )}
                />
                <span className={cn(prefs.canvas === c.value && "text-foreground")}>{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        <Row label="Sidebar position">
          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={0}
            value={[prefs.sidebarSide]}
            onValueChange={(v) => v[0] && onChange({ sidebarSide: v[0] as Prefs["sidebarSide"] })}
            aria-label="Sidebar position"
          >
            <ToggleGroupItem value="left" className="px-3">
              Left
            </ToggleGroupItem>
            <ToggleGroupItem value="right" className="px-3">
              Right
            </ToggleGroupItem>
          </ToggleGroup>
        </Row>

        <div className="flex flex-col gap-3.5">
          <SwitchRow id="pref-sort" label="Sort new images by file name" checked={prefs.sortOnAdd} onChange={(sortOnAdd) => onChange({ sortOnAdd })} />
          <SwitchRow id="pref-hints" label="Show hints" checked={prefs.hints} onChange={(hints) => onChange({ hints })} />
        </div>

        <div className="flex flex-col gap-2 border-t pt-4">
          <span className="text-xs text-muted-foreground">Shortcuts</span>
          <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 text-[13px]">
            {shortcuts.map(([name, key]) => (
              <div key={name} className="contents">
                <dt>{name}</dt>
                <dd>
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 font-sans text-[11px] text-muted-foreground">
                    {mod} {key}
                  </kbd>
                </dd>
              </div>
            ))}
            <dt>Previous or next image in viewer</dt>
            <dd>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-sans text-[11px] text-muted-foreground">← →</kbd>
            </dd>
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label className="font-normal">{label}</Label>
      {children}
    </div>
  )
}

function SwitchRow({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
